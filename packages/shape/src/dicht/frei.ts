// Freie Form (18.11.2026). Florian: „dass ich mirror modifier applien kann, dann ist es nicht mehr gespiegelt, sondern ein ganzes
// Mesh, und ich kann asymmetrische Dinge gestalten. Ohne mirror kann ich ein Objekt frei bewegen.“
//
// Eine gespiegelte Form ist eine ganze Haut aus Spiegelpaaren; ihre Linien sind die Hälfte z ≥ 0 (Ring, Paar) oder liegen in der
// Mittelebene (Mitte). Eine freie Form hat keine Paare (`hautFrei`): Jede Linie ist ein geschlossener Loop für sich (Art `paar`, nur
// ohne Zwilling), und nichts hält etwas auf einer Ebene. Der Kern rechnet sie, wie er jede Haut ohne Paare rechnet (über die ganze
// Haut); was aus ihr entsteht, bleibt frei (`hautAus` mit `ohnePaare`).
//
// Erster Versuch (verworfen, gemessen mit `form-frei.ts`): die Haut weit von z = 0 weg rechnen, damit `hautAus` keine Paare findet.
// Die Rechnung hängt am Abstand vom Ursprung (bei 1 000 ruhig, bei 3 000 wandert die Kugel in 400 Runden um 13, bei 20 000 läuft
// sie davon): Eine freie Form bleibt deshalb, wo sie ist.
import { type Haut, type V3, hautAus, hautFrei } from './kurven';
import { type Loop, type LoopPunkt, eckenAuto, endeAufMitte, pfadParameter } from './loops';

const gespiegelt = (v: V3): V3 => ({ x: v.x, y: v.y, z: -v.z });
const hoch = (v: V3, dz: number): V3 => ({ x: v.x, y: v.y, z: v.z + dz });

export type Frei = {
  haut: Haut;
  loops: Loop[];
  naechsteId: number;
  naechsteKreuzung: number;
};

/**
 * Den Spiegel anwenden: aus einer gespiegelten Form eine freie machen. Die Haut bleibt Punkt für Punkt dieselbe (`dz` verschiebt
 * sie quer zur Ebene, Standard 0); jede Linie wird ausgeschrieben:
 *   Mitte  bleibt ein geschlossener Loop (er darf danach aus seiner Ebene)
 *   Ring   wird mit seinem Spiegelbild ein geschlossener Loop (seine Enden auf der Ebene sind gewöhnliche Punkte)
 *   Paar   wird zwei Loops, der zweite das Spiegelbild
 * Kreuzungen neben der Ebene bekommen für die Spiegelseite eine eigene Kennung. Abzweigungen (hängende Enden) sind noch nicht
 * ausgeschrieben: `fehler`.
 */
export function spiegelAnwenden(h: Haut, loops: readonly Loop[], opt: { naechsteId: number; naechsteKreuzung: number; dz?: number }): Frei | { fehler: string } {
  const dz = opt.dz ?? 0;
  for (let v = 0; v < h.n; v++) if (h.spiegel[v]! < 0) return { fehler: 'die Haut ist nicht spiegelgleich' };
  if (loops.some((l) => l.haengt)) return { fehler: 'eine Abzweigung lässt sich noch nicht ausschreiben' };
  if (loops.some((l) => !l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]))) return { fehler: 'ein Loop liegt nur auf der Haut (nicht ins Netz eingesetzt)' };
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) pos[3 * v + 2] = pos[3 * v + 2]! + dz;
  const haut = hautAus(pos, h.tri, true);
  if (!hautFrei(haut)) return { fehler: 'die Haut hat noch Spiegelpaare' };

  let id = opt.naechsteId;
  let kreuzung = opt.naechsteKreuzung;
  /** Kennung einer Kreuzung auf der Spiegelseite (auf der Ebene dieselbe) */
  const drueben = new Map<number, number>();
  const kreuzungDrueben = (k: number | undefined, aufEbene: boolean): number | undefined => {
    if (k === undefined || aufEbene) return k;
    let n = drueben.get(k);
    if (n === undefined) {
      n = kreuzung++;
      drueben.set(k, n);
    }
    return n;
  };
  const kopie = (p: LoopPunkt, s: number, spiegel: boolean, tauschen: boolean): LoopPunkt => {
    const ref = spiegel ? gespiegelt(p.ref) : p.ref;
    const q: LoopPunkt = { ...p, s, ref: hoch(ref, dz), cur: hoch(ref, dz) };
    delete q.vonSelbst;
    const ein = tauschen ? p.aus : p.ein;
    const aus = tauschen ? p.ein : p.aus;
    if (ein) q.ein = spiegel ? gespiegelt(ein) : { ...ein };
    else delete q.ein;
    if (aus) q.aus = spiegel ? gespiegelt(aus) : { ...aus };
    else delete q.aus;
    if (spiegel) {
      const k = kreuzungDrueben(p.kreuzung, Math.abs(p.ref.z) < 1e-6);
      if (k === undefined) delete q.kreuzung;
      else q.kreuzung = k;
    }
    return q;
  };
  const ausKette = (kette: readonly number[]): Pick<Loop, 'proben' | 's' | 'laenge' | 'ruhe'> => {
    const ruhe = new Float64Array(3 * kette.length);
    const s = new Float64Array(kette.length);
    kette.forEach((v, i) => {
      ruhe[3 * i] = haut.pos[3 * v]!;
      ruhe[3 * i + 1] = haut.pos[3 * v + 1]!;
      ruhe[3 * i + 2] = haut.pos[3 * v + 2]!;
      if (i > 0) s[i] = s[i - 1]! + Math.hypot(ruhe[3 * i]! - ruhe[3 * i - 3]!, ruhe[3 * i + 1]! - ruhe[3 * i - 2]!, ruhe[3 * i + 2]! - ruhe[3 * i - 1]!);
    });
    const m = kette.length;
    const laenge = s[m - 1]! + Math.hypot(ruhe[0]! - ruhe[3 * m - 3]!, ruhe[1]! - ruhe[3 * m - 2]!, ruhe[2]! - ruhe[3 * m - 1]!);
    return { proben: kette.map((v) => ({ ecken: [v, v, v], b: [1, 0, 0] })), s, laenge, ruhe };
  };
  /** die Stelle eines Punkts auf der neuen Kette: an seiner Probe (die Bogenlängen der alten Linie stammen vom Anlegen und stimmen nach Zügen nicht mehr) */
  const stelleAuf = (alt: Loop, neu: Pick<Loop, 's' | 'laenge'>, s: number, probeVon: (j: number) => number): number => {
    const n = alt.proben.length;
    let j = 0;
    while (j + 1 < n && alt.s[j + 1]! <= s) j++;
    const s0 = alt.s[j]!;
    const s1 = j + 1 < n ? alt.s[j + 1]! : alt.laenge;
    const t = s1 > s0 ? Math.min(1, Math.max(0, (s - s0) / (s1 - s0))) : 0;
    const a = probeVon(j);
    const b = probeVon(Math.min(n - 1, j + 1));
    const sa = neu.s[a]!;
    // (das Schlussstück eines geschlossenen Loops läuft zur Länge, nicht zurück zu 0)
    const sb = b === 0 && a !== 0 ? neu.laenge : neu.s[b]!;
    return sa + t * (sb - sa);
  };
  const aus: Loop[] = [];
  for (const l of loops) {
    const kette = l.proben.map((p) => p.ecken[0]);
    const basis: Partial<Loop> = {};
    if (l.kante !== undefined) basis.kante = l.kante;
    if (l.pfad !== undefined) basis.pfad = l.pfad;
    if (l.art === 'mitte') {
      const teil = ausKette(kette);
      const punkte = l.punkte.map((p) => kopie(p, stelleAuf(l, teil, p.s, (j) => j), false, false));
      aus.push({ id: l.id, art: 'paar', ...teil, punkte, ...basis });
      continue;
    }
    if (l.art === 'paar') {
      const teil = ausKette(kette);
      aus.push({ id: l.id, art: 'paar', ...teil, punkte: l.punkte.map((p) => kopie(p, stelleAuf(l, teil, p.s, (j) => j), false, false)), ...basis });
      const zwilling = ausKette(kette.map((v) => h.spiegel[v]!));
      aus.push({ id: id++, art: 'paar', ...zwilling, punkte: l.punkte.map((p) => kopie(p, stelleAuf(l, zwilling, p.s, (j) => j), true, false)), ...basis });
      continue;
    }
    // Ring: v0 … vn und zurück über die Spiegelbilder v(n−1)′ … v1′
    if (!endeAufMitte(l, 0) || !endeAufMitte(l, 1)) return { fehler: 'ein Ring endet nicht auf der Mittelebene' };
    const n = kette.length;
    const rund = [...kette];
    for (let j = n - 2; j >= 1; j--) rund.push(h.spiegel[kette[j]!]!);
    const teil = ausKette(rund);
    const hin = l.punkte.map((p) => kopie(p, stelleAuf(l, teil, p.s, (j) => j), false, false));
    // die Spiegelseite läuft rückwärts: dieselbe Stelle, von hinten gezählt (die Kette ist spiegelgleich), die Griffe tauschen ihre Rollen
    const her = l.punkte.filter((p) => p.s > 1e-6 && p.s < l.laenge - 1e-6).map((p) => kopie(p, teil.laenge - stelleAuf(l, teil, p.s, (j) => j), true, true));
    const punkte = [...hin, ...her].sort((a, b) => a.s - b.s);
    aus.push({ id: l.id, art: 'paar', ...teil, punkte, ...basis });
  }
  for (const l of aus) if (l.pfad) pfadParameter(l, l.ruhe);
  eckenAuto(aus);
  return { haut, loops: aus, naechsteId: id, naechsteKreuzung: kreuzung };
}
