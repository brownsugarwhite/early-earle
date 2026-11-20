// ReglerPlan (Plan 4.3, 4.4): je Regler Bereich, Ruhestelle, Kreis, Ausgleich (f = 1/dauer, ζ = 1 − federung), Höchsttempo, Nachlauf,
// Fangraster, Spiegelregel und Mitspiegeln, dazu die Rechenfolge nach Drähten. Gemeinsame Datei, in M0 fertig.
//
// Rechenfolge (`folge`): Ein Regler kommt nach jedem Regler, von dem er abhängt: nach der Quelle seines Drahts (Quelle ein Regler; ein
// Messwert eines Bausteins stammt aus dem vorigen Takt und ordnet nichts) und nach dem Regler, dessen Spiegelregel ihn mitspiegelt
// (Befund 8). Sonst gilt die Nummer aus dem OrdnungPlan: Ohne Abhängigkeiten ist die Folge 0, 1, 2 … Hängen Regler im Kreis
// voneinander ab, rechnen sie dort in der Folge ihrer Nummern, und ein Hinweis nennt sie (Prüfregel 3.6 Nr. 5 meldet es ebenso).
//
// Neu gebaut wird der Plan nur, wenn sich die Ordnung oder ein Regler oder Draht ändert; sonst bleibt er dasselbe Objekt.
import type { Diff, Dokument } from '@ee/studio-format/typen/dokument';
import type { Draht } from '@ee/studio-format/typen/logik';
import type { Regler } from '@ee/studio-format/typen/form';
import type { Bauplan, OrdnungPlan, ReglerPlan } from '../vertrag/bauplan';
import { indexVon, typVon } from './ordnung';

/** ändert der Diff einen Regler oder Draht? */
function reglerGeaendert(diff: Diff): boolean {
  const betrifft = (id: string): boolean => {
    const typ = typVon(id);
    return typ === 'rg' || typ === 'dr';
  };
  return diff.neu.some((d) => betrifft(d.id)) || diff.weg.some((d) => betrifft(d.id)) ||
    diff.geaendert.some(([v, n]) => betrifft(v.id) || betrifft(n.id));
}

/** Ausgleichsfrequenz aus der Dauer: f = 1/dauer, eine Dauer ≤ 0 (oder keine Zahl) heißt sofort (+∞) */
export function federFrequenz(dauer: number): number {
  return dauer > 0 ? 1 / dauer : Infinity;
}

/**
 * Liegt w in der gespiegelten Hälfte der Spiegelregel von Regler i? Kreisregler ab < w < um, Linienregler ab ≤ w < um (3.2); ohne
 * Spiegelregel nie.
 */
export function inSpiegelHaelfte(p: ReglerPlan, i: number, w: number): boolean {
  const ab = p.spiegelAb[i]!, um = p.spiegelUm[i]!;
  if (Number.isNaN(ab)) return false;
  return (p.kreis[i] === 1 ? w > ab : w >= ab) && w < um;
}

/**
 * ReglerPlan eines Dokuments zur Ordnung `ordnung`. Mit `alt` (dem vorigen Bauplan) und `diff` gibt es `alt.regler` zurück, wenn die
 * Ordnung dieselbe ist und der Diff keinen Regler und keinen Draht berührt.
 */
export function reglerPlanBauen(dok: Dokument, ordnung: OrdnungPlan, alt?: Pick<Bauplan, 'ordnung' | 'regler'>, diff?: Diff): ReglerPlan {
  if (alt !== undefined && diff !== undefined && alt.ordnung === ordnung && !reglerGeaendert(diff)) return alt.regler;
  const ids = ordnung.regler, n = ids.length;
  const bereich = new Float64Array(2 * n), standard = new Float64Array(n), kreis = new Uint8Array(n), federF = new Float64Array(n);
  const federZeta = new Float64Array(n), hoechsttempo = new Float64Array(n), nachlauf = new Float64Array(n), raster = new Float64Array(n);
  const spiegelAb = new Float64Array(n).fill(NaN), spiegelUm = new Float64Array(n).fill(NaN);
  const mitSpiegel = new Int32Array(n).fill(-1), mitUm = new Float64Array(n).fill(NaN);
  const hinweise: string[] = [];
  const regler: Regler[] = [];
  for (let i = 0; i < n; i++) {
    const r = dok.datensaetze.get(ids[i]!) as Regler;
    regler.push(r);
    bereich[2 * i] = r.bereich[0];
    bereich[2 * i + 1] = r.bereich[1];
    standard[i] = r.standard;
    kreis[i] = r.art === 'kreis' ? 1 : 0;
    federF[i] = federFrequenz(r.ausgleich.dauer);
    federZeta[i] = 1 - r.ausgleich.federung;
    hoechsttempo[i] = r.hoechsttempo ?? Infinity;
    nachlauf[i] = r.nachlauf ?? 0;
    raster[i] = r.raster;
    if (r.spiegel !== undefined) {
      spiegelAb[i] = r.spiegel.ab;
      spiegelUm[i] = r.spiegel.um;
    }
  }
  // Abhängigkeiten: Quelle → Ziel eines Drahts, spiegelnder → mitgespiegelter Regler
  const nachfolger: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (const m of regler[i]!.spiegel?.regler ?? []) {
      const j = indexVon(ordnung, m.regler);
      if (j < 0) continue;   // fehlender Regler: das meldet die Prüfung (3.6 Nr. 8)
      if (mitSpiegel[j] !== -1) {
        hinweise.push(`Regler ${ids[j]} wird von zwei Spiegelregeln mitgespiegelt (${ids[mitSpiegel[j]!]}, ${ids[i]}); es gilt die von ${ids[mitSpiegel[j]!]}`);
        continue;
      }
      mitSpiegel[j] = i;
      mitUm[j] = m.um;
      nachfolger[i]!.push(j);
    }
  }
  const draehte: Draht[] = [];
  for (const d of dok.datensaetze.values()) if (typVon(d.id) === 'dr') draehte.push(d as Draht);
  draehte.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const d of draehte) {
    if (typVon(d.quelle) !== 'rg') continue;   // Messwert eines Bausteins: aus dem vorigen Takt
    const q = indexVon(ordnung, d.quelle), z = indexVon(ordnung, d.ziel);
    if (q >= 0 && z >= 0) nachfolger[q]!.push(z);
  }
  const folge = rechenfolge(n, nachfolger, (kreisGlieder) => {
    const namen = kreisGlieder.map((i) => ids[i]).join(', ');
    hinweise.push(kreisGlieder.length === 1
      ? `Regler ${namen} hängt über einen Draht oder seine Spiegelregel von sich selbst ab; er rechnet an seiner Stelle`
      : `Regler hängen im Kreis voneinander ab (Drähte, Spiegelregel): ${namen}; sie rechnen dort in der Folge ihrer Nummern`);
  });
  return { anzahl: n, bereich, standard, kreis, federF, federZeta, hoechsttempo, nachlauf, folge, raster, spiegelAb, spiegelUm, mitSpiegel, mitUm, hinweise };
}

/**
 * Topologische Folge von n Knoten: jeder nach allen seinen Vorgängern, sonst nach Nummer. Starke Zusammenhangskomponenten (Kreise)
 * rechnen als ein Block in der Folge ihrer Nummern; `kreis` bekommt jeden Kreis (auch eine Schleife auf sich selbst) aufsteigend.
 */
export function rechenfolge(n: number, nachfolger: readonly (readonly number[])[], kreis: (glieder: number[]) => void): Int32Array {
  // starke Komponenten nach Tarjan, ohne Rekursion
  const nummer = new Int32Array(n).fill(-1), tief = new Int32Array(n), komp = new Int32Array(n).fill(-1);
  const kante = new Int32Array(n), aufStapel = new Uint8Array(n), stapel: number[] = [], weg: number[] = [];
  let zaehler = 0, komps = 0;
  for (let s = 0; s < n; s++) {
    if (nummer[s] !== -1) continue;
    nummer[s] = tief[s] = zaehler++;
    stapel.push(s);
    aufStapel[s] = 1;
    weg.push(s);
    while (weg.length > 0) {
      const v = weg[weg.length - 1]!, nach = nachfolger[v]!;
      if (kante[v]! < nach.length) {
        const w = nach[kante[v]!]!;
        kante[v] = kante[v]! + 1;
        if (nummer[w] === -1) {
          nummer[w] = tief[w] = zaehler++;
          stapel.push(w);
          aufStapel[w] = 1;
          weg.push(w);
        } else if (aufStapel[w] === 1) {
          tief[v] = Math.min(tief[v]!, nummer[w]!);
        }
        continue;
      }
      weg.pop();
      if (weg.length > 0) {
        const u = weg[weg.length - 1]!;
        tief[u] = Math.min(tief[u]!, tief[v]!);
      }
      if (tief[v] === nummer[v]) {
        let w: number;
        do {
          w = stapel.pop()!;
          aufStapel[w] = 0;
          komp[w] = komps;
        } while (w !== v);
        komps++;
      }
    }
  }
  // Glieder je Komponente aufsteigend, Kanten zwischen Komponenten
  const glieder: number[][] = Array.from({ length: komps }, () => []);
  for (let i = 0; i < n; i++) glieder[komp[i]!]!.push(i);
  const eingang = new Int32Array(komps), aus: number[][] = Array.from({ length: komps }, () => []);
  for (let v = 0; v < n; v++) {
    for (const w of nachfolger[v]!) {
      const a = komp[v]!, b = komp[w]!;
      if (a === b) continue;
      aus[a]!.push(b);
      eingang[b] = eingang[b]! + 1;
    }
  }
  for (let k = 0; k < komps; k++) {
    const g = glieder[k]!;
    const schleife = g.length === 1 && nachfolger[g[0]!]!.includes(g[0]!);
    if (g.length > 1 || schleife) kreis(g);
  }
  // Kahn: von den bereiten Komponenten zuerst die mit der kleinsten Nummer (Halde nach dem kleinsten Glied)
  const halde: number[] = [];
  const kleiner = (a: number, b: number): boolean => glieder[a]![0]! < glieder[b]![0]!;
  const hinein = (k: number): void => {
    halde.push(k);
    let i = halde.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!kleiner(halde[i]!, halde[p]!)) break;
      [halde[i], halde[p]] = [halde[p]!, halde[i]!];
      i = p;
    }
  };
  const heraus = (): number => {
    const oben = halde[0]!, letzte = halde.pop()!;
    if (halde.length > 0) {
      halde[0] = letzte;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < halde.length && kleiner(halde[l]!, halde[m]!)) m = l;
        if (r < halde.length && kleiner(halde[r]!, halde[m]!)) m = r;
        if (m === i) break;
        [halde[i], halde[m]] = [halde[m]!, halde[i]!];
        i = m;
      }
    }
    return oben;
  };
  for (let k = 0; k < komps; k++) if (eingang[k] === 0) hinein(k);
  const folge = new Int32Array(n);
  let f = 0;
  while (halde.length > 0) {
    const k = heraus();
    for (const i of glieder[k]!) folge[f++] = i;
    for (const b of aus[k]!) {
      eingang[b] = eingang[b]! - 1;
      if (eingang[b] === 0) hinein(b);
    }
  }
  return folge;
}
