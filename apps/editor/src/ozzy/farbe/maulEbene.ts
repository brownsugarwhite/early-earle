// Ozzy, die Ebene „Maul“ (Plan „Maul, Zähne, Zunge“, Etappe 4, 20.11.2026).
// Florian: „Ein Maul bildet eine saubere innen Tasche und erscheint als separate Ebene im Paintmode. Das Innere ist dunkelrot und
// es wird ein automatischer innerer Ring für das Zahnfleisch gezogen, der etwas heller ist.“
//
// Die Ebene ist eine Ebene wie jede andere (`bemalung.ts`): eine Farblinie und zwei Füllungen, bearbeitbar mit allem, was der
// Paint-Modus kann. Angelegt wird sie aus der Tasche des Mauls (sie ist Haut der Form):
//   - Je Punkt der Tasche sein Abstand von der Lippe. Eine Höhenlinie dieses Abstands läuft längs der Lippe durch die Tasche, vom
//     Gaumen über die Rachenlinie zum Boden; auf der Hälfte z ≥ 0 von der Mitte zur Mitte, ihr Spiegelbild schließt sie.
//   - Die Zahnfleischlinie ist die Höhenlinie ein Zehntel der Lippenlänge hinter der Lippe.
//   - Zwischen ihr und der Lippe liegt das Zahnfleisch (heller), dahinter das Innere (dunkelrot).
// Eines ist an dieser Ebene besonders: Was auf ihr gefüllt ist, bleibt in der Tasche (`flaechenRechnen` mit `gebiet`, das Farbwerk
// gibt es für die Ebene dieses Namens mit). Die Grenze der Farben nach außen ist die Lippe selbst. Eine Farblinie knapp hinter der
// Lippe als Grenze (die erste Fassung) hielt den Netzwechseln nicht stand: Nach den Zügen an der Lippe lief die Füllung über die
// ganze Form (vermutlich landete beim Netzwechsel ein neu gesuchter Ort der Linie auf der Haut außen; nicht nachgesehen).
// Ohne DOM. Das Werk sagt, was zur Tasche gehört (`werk.maulTasche`).
import { type Bemalung, EBENEN_HOECHSTENS, type Ebene, type Farbe, type Farblinie, linienAusTreffern } from './bemalung';
import { type Karte, type Ort, ortIn } from './ort';

/** der Name der Ebene: Daran erkennt Ozzy sie (Ebenen lassen sich nicht umbenennen) */
export const MAUL_EBENE = 'Maul';
const hex = (h: string): Farbe => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
/** die Farben, mit denen das Maul beginnt (Plan, Abschnitt 6: innen dunkelrot, das Zahnfleisch heller) */
export const MAUL_FARBEN = { innen: hex('#6b1425'), zahnfleisch: hex('#cf5a72') } as const;
/** so breit ist das Zahnfleisch am Anfang, als Anteil der Lippenlänge */
export const ZAHNFLEISCH_BREIT = 0.1;
/** das Zahnfleisch ist mindestens so breit (Einheiten der Lagen) */
const BREIT_MIN = 2;

/** die Tasche eines Mauls, wie das Werk sie nennt: je Punkt des Netzes, ob er zu Tasche oder Lippe gehört; die Kette der Lippe; ihre Länge in der Seite */
export type MaulTasche = {
  innen: ArrayLike<number>;
  lippe: readonly number[];
  lang: number;
  /** je Punkt: +1 Unterkiefer, −1 Oberkiefer, 0 keiner allein (Rachenlinie, Mundwinkel, außen); für die Zähne */
  kiefer?: ArrayLike<number>;
};

export const istMaulEbene = (e: Ebene): boolean => e.name === MAUL_EBENE;

/** Abstand eines Orts von einer Strecke im Raum */
function zurStrecke(px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const ex = bx - ax;
  const ey = by - ay;
  const ez = bz - az;
  const l2 = ex * ex + ey * ey + ez * ez;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey + (pz - az) * ez) / l2)) : 0;
  const dx = px - ax - u * ex;
  const dy = py - ay - u * ey;
  const dz = pz - az - u * ez;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Die Höhenlinie „Abstand von der Lippe = `hoehe`“ durch die Tasche, auf der Hälfte z ≥ 0: eine Folge von Orten, der erste und der
 * letzte genau in der Mittelebene, dazwischen einer je Dreieck, das sie quert. Null: Sie ließ sich nicht von der Mitte zur Mitte
 * verfolgen.
 */
export function hoehenlinie(k: Karte, d: Float64Array, wand: Uint8Array, hoehe: number): Ort[] | null {
  const netz = k.netz;
  const tri = netz.tri;
  const pos = netz.pos;
  const f = (v: number): number => {
    const x = d[v]! - hoehe;
    return x === 0 ? 1e-9 : x;
  };
  const inMitte = (v: number): boolean => Math.abs(pos[3 * v + 2]!) < 1e-9;
  const ecke = (t: number, e: number): number => tri[3 * t + (e % 3)]!;
  /** der Schnittpunkt auf der Kante e des Dreiecks t, als Gewichte zu seinen drei Ecken */
  const aufKante = (t: number, e: number): [number, number, number] => {
    const fa = f(ecke(t, e));
    const fb = f(ecke(t, e + 1));
    const lam = fa / (fa - fb);
    const w: [number, number, number] = [0, 0, 0];
    w[e] = 1 - lam;
    w[(e + 1) % 3] = lam;
    return w;
  };
  const quert = (t: number, e: number): boolean => f(ecke(t, e)) * f(ecke(t, e + 1)) < 0;
  // der Anfang: eine Kante in der Mittelebene, die die Höhe quert
  let start: { t: number; e: number } | null = null;
  for (let t = 0; t < k.T && !start; t++) {
    if (!wand[t]) continue;
    for (let e = 0; e < 3; e++)
      if (inMitte(ecke(t, e)) && inMitte(ecke(t, e + 1)) && quert(t, e)) {
        start = { t, e };
        break;
      }
  }
  if (!start) return null;
  const orte: Ort[] = [];
  const ortGenau = (t: number, w: [number, number, number]): Ort => ({ t, e: [ecke(t, 0), ecke(t, 1), ecke(t, 2)], w });
  let { t, e: ein } = start;
  orte.push(ortGenau(t, aufKante(t, ein)));
  for (let schritt = 0; schritt < 20000; schritt++) {
    let aus = -1;
    for (const x of [(ein + 1) % 3, (ein + 2) % 3])
      if (quert(t, x)) {
        aus = x;
        break;
      }
    if (aus < 0) return null;
    const p = aufKante(t, ein);
    const q = aufKante(t, aus);
    orte.push(ortIn(netz, t, 0.5 * (p[0] + q[0]), 0.5 * (p[1] + q[1]), 0.5 * (p[2] + q[2])));
    if (inMitte(ecke(t, aus)) && inMitte(ecke(t, aus + 1))) {
      orte.push(ortGenau(t, q));
      return orte;
    }
    const nb = k.nachbar[3 * t + aus]!;
    if (nb < 0) return null;
    const t2 = Math.floor(nb / 3);
    // (an der Lippe ist der Abstand null: Die Höhenlinie bleibt in der Tasche)
    if (!wand[t2]) return null;
    t = t2;
    ein = nb % 3;
  }
  return null;
}

/**
 * Was aus der Tasche gelesen wird: ihre Wand auf der Hälfte z ≥ 0 (je Dreieck 1, wenn seine drei Ecken zu Tasche oder Lippe
 * gehören) und je Punkt der Tasche sein Abstand von der Lippe (ihre Kette und deren Spiegelbild, im Raum). `dMax`, `tief`: der
 * größte Abstand und sein Punkt. Null: Die Tasche ist zu klein.
 */
export function taschenFeld(k: Karte, tasche: MaulTasche): { d: Float64Array; wand: Uint8Array; dMax: number; tief: number } | null {
  const netz = k.netz;
  const pos = netz.pos;
  const tri = netz.tri;
  // die Wand der Tasche auf der Hälfte z ≥ 0: Dreiecke, deren drei Ecken zu Tasche oder Lippe gehören
  const wand = new Uint8Array(k.T);
  let wandZahl = 0;
  for (let t = 0; t < k.T; t++) {
    const [a, b2, c] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
    if (!tasche.innen[a] || !tasche.innen[b2] || !tasche.innen[c]) continue;
    if (pos[3 * a + 2]! < -1e-9 || pos[3 * b2 + 2]! < -1e-9 || pos[3 * c + 2]! < -1e-9) continue;
    wand[t] = 1;
    wandZahl++;
  }
  if (wandZahl < 4) return null;
  // je Punkt der Tasche sein Abstand von der Lippe (ihre Kette und deren Spiegelbild, im Raum)
  const d = new Float64Array(netz.n).fill(Infinity);
  const L = tasche.lippe;
  const aufLippe = new Uint8Array(netz.n);
  for (const v of L) aufLippe[v] = 1;
  let dMax = 0;
  let tief = -1;
  for (let v = 0; v < netz.n; v++) {
    if (!tasche.innen[v] || pos[3 * v + 2]! < -1e-9) continue;
    if (aufLippe[v]) {
      d[v] = 0;
      continue;
    }
    let best = Infinity;
    const [px, py, pz] = [pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!];
    for (let j = 0; j + 1 < L.length; j++) {
      const a = 3 * L[j]!;
      const c = 3 * L[j + 1]!;
      best = Math.min(best, zurStrecke(px, py, pz, pos[a]!, pos[a + 1]!, pos[a + 2]!, pos[c]!, pos[c + 1]!, pos[c + 2]!), zurStrecke(px, py, pz, pos[a]!, pos[a + 1]!, -pos[a + 2]!, pos[c]!, pos[c + 1]!, -pos[c + 2]!));
    }
    d[v] = best;
    if (best > dMax) {
      dMax = best;
      tief = v;
    }
  }
  return { d, wand, dMax, tief };
}
/** so breit ist das Zahnfleisch: ein Zehntel der Lippenlänge, in einer flachen Tasche höchstens ein Drittel ihrer Tiefe */
export const zahnfleischBreit = (tasche: MaulTasche, dMax: number): number => Math.max(BREIT_MIN, Math.min(ZAHNFLEISCH_BREIT * tasche.lang, dMax / 3));

/**
 * Die Ebene „Maul“ für diese Tasche bauen und oben auf die Bemalung legen (die aktive Ebene bleibt, wie sie ist). Zurück: die
 * Ebene, oder warum es nicht geht.
 */
export function maulEbeneBauen(b: Bemalung, k: Karte, tasche: MaulTasche): Ebene | { fehler: string } {
  if (b.ebenen.length >= EBENEN_HOECHSTENS) return { fehler: 'es gibt schon zu viele Ebenen' };
  const netz = k.netz;
  const tri = netz.tri;
  if (!k.spiegel) return { fehler: 'das Maul braucht die gespiegelte Form' };
  const feld = taschenFeld(k, tasche);
  if (!feld) return { fehler: 'die Tasche ist zu klein' };
  const { d, wand, dMax, tief } = feld;
  if (tief < 0 || !(dMax > 3 * BREIT_MIN)) return { fehler: 'die Tasche ist zu flach' };
  const breit = zahnfleischBreit(tasche, dMax);
  let naechste = b.naechste;
  const linieBei = (hoehe: number): Farblinie[] | null => {
    const orte = hoehenlinie(k, d, wand, hoehe);
    if (!orte || orte.length < 3) return null;
    const linien = linienAusTreffern(k, orte, false, true, () => naechste++);
    return linien.length ? linien : null;
  };
  const zahnfleisch = linieBei(breit);
  if (!zahnfleisch) return { fehler: 'die Zahnfleischlinie ließ sich in der Tasche nicht ziehen' };
  // die Saaten: mitten im Zahnfleisch (auf seiner halben Höhe, in der Mitte der Höhenlinie) und an der tiefsten Stelle der Tasche
  const mitte = hoehenlinie(k, d, wand, 0.5 * breit);
  if (!mitte || mitte.length < 3) return { fehler: 'das Zahnfleisch ließ sich nicht füllen' };
  const saatZahnfleisch = mitte[mitte.length >> 1]!;
  let saatInnen: Ort | null = null;
  let bestTief = -Infinity;
  for (let t = 0; t < k.T; t++) {
    if (!wand[t]) continue;
    const m = Math.min(d[tri[3 * t]!]!, d[tri[3 * t + 1]!]!, d[tri[3 * t + 2]!]!);
    if (m > bestTief) {
      bestTief = m;
      saatInnen = ortIn(netz, t, 1 / 3, 1 / 3, 1 / 3);
    }
  }
  if (!saatInnen || !(bestTief > breit)) return { fehler: 'das Innere ließ sich nicht füllen (die Tasche ist kaum tiefer als das Zahnfleisch breit)' };
  const ebene: Ebene = {
    id: naechste++,
    name: MAUL_EBENE,
    linien: zahnfleisch,
    fuellungen: [
      { id: naechste++, saat: saatZahnfleisch, farbe: [...MAUL_FARBEN.zahnfleisch] },
      { id: naechste++, saat: saatInnen, farbe: [...MAUL_FARBEN.innen] },
    ],
  };
  b.naechste = naechste;
  b.ebenen.push(ebene);
  return ebene;
}
