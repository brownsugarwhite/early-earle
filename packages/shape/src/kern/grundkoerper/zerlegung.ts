// Teil G, G4 neu: automatische Zerlegung einer Silhouette in Rumpf und Äste (Florian 16.10.: „Sobald ein Vektorshape aus
// einer Ansicht einen Bauch bekommt, muss die Wirbelsäule in diese Richtung automatisch entstehen“). Grundlage ist die
// Mittelachse (`skelett.ts`):
// - Äste sind die Gabeln des Skeletts (Rückenflosse, Schwanzlappen; in Front und Top die seitlichen Teile) und dort, wo die
//   Rumpfachse scharf abknickt und dabei deutlich dünner wird (Hals auf der Ente: Der Hals fließt ohne Gabel in den
//   Körper, eine einzige Wirbelsäule durch das Z fächert im Körper).
// - Geschnitten wird an der Sehne zwischen den beiden Berührpunkten des Mittelachsen-Kreises dort, wo der Ast den Kreis
//   des Rumpfs verlässt; der Rumpf behält die Sehne als geraden Rand, der Ast beginnt an ihr.
// DOM-frei.
import type { V2 } from '../../bezier';
import { type Skelett, type SkelettWeg, skelett } from './skelett';

export type ZerlegterAst = {
  /** Achse des Asts (Welt) ab dem Ansatz bis zur Spitze, mit Radius je Punkt */
  achse: SkelettWeg;
  /** Schnittsehne am Ansatz (zwei Randpunkte) */
  schnitt: [V2, V2];
  /** Umriss des Asts (geschlossen): Randstück außerhalb des Rumpfs + Sehne */
  umriss: V2[];
  /** woher: Gabel des Skeletts oder Knick der Rumpfachse */
  art: 'gabel' | 'knick';
  /** Winkel (Grad) zwischen Rumpfachse und Ast am Ansatz, Dicke Ast/Rumpf */
  winkel: number;
  dicke: number;
};

export type Zerlegung = { skelett: Skelett; rumpf: { achse: SkelettWeg; umriss: V2[] }; aeste: ZerlegterAst[] };

/** Weicht die dünne Fortsetzung um mindestens so viel (Grad) von der Geradeausrichtung des Rumpfs ab … */
const KNICK_GRAD = 50;
/** … und ist sie dünner als dieser Anteil des Rumpfradius, wird sie ein Ast (Hals auf einem Körper) */
const KNICK_DICKE = 0.55;

const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const laenge = (a: V2) => Math.hypot(a.x, a.y);
const winkelZwischen = (a: V2, b: V2) => (Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (laenge(a) * laenge(b) || 1)))) * 180) / Math.PI;

/** Richtung eines Wegs ab Index i über die Länge l (vorwärts, s = +1, oder rückwärts, s = −1). */
function richtung(w: SkelettWeg, i: number, l: number, s: 1 | -1): V2 {
  const p0 = w.punkte[i]!;
  let j = i;
  while (j + s >= 0 && j + s < w.punkte.length && laenge(sub(w.punkte[j]!, p0)) < l) j += s;
  return sub(w.punkte[j]!, p0);
}

/** Berührpunkte des Kreises um m (Radius r) mit dem Rand, je einer links und rechts der Richtung d (nächster Randpunkt je Seite). */
function beruehrpunkte(poly: readonly V2[], m: V2, r: number, d: V2): [V2, V2] | null {
  let links: V2 | null = null;
  let rechts: V2 | null = null;
  let dl = Infinity;
  let dr = Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    // nächster Punkt des Randstücks zu m
    const ab = sub(b, a);
    const t = Math.max(0, Math.min(1, ((m.x - a.x) * ab.x + (m.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    const q = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    const abst = Math.abs(laenge(sub(q, m)) - r);
    const seite = d.x * (q.y - m.y) - d.y * (q.x - m.x);
    if (seite > 0 && abst < dl) {
      dl = abst;
      links = q;
    } else if (seite <= 0 && abst < dr) {
      dr = abst;
      rechts = q;
    }
  }
  return links && rechts ? [links, rechts] : null;
}

/** Index des Randpunkts, der q am nächsten liegt. */
function naechsterRand(poly: readonly V2[], q: V2): number {
  let best = 0;
  for (let i = 1; i < poly.length; i++) if (laenge(sub(poly[i]!, q)) < laenge(sub(poly[best]!, q))) best = i;
  return best;
}

/** Randstück von i nach j (zyklisch, vorwärts). */
function randStueck(poly: readonly V2[], i: number, j: number): V2[] {
  const out: V2[] = [];
  const n = poly.length;
  for (let k = i; ; k = (k + 1) % n) {
    out.push(poly[k]!);
    if (k === j) break;
  }
  return out;
}

/**
 * Schnitt eines Asts: entlang der Ast-Achse der erste Punkt, dessen Kreis den Rumpfkreis am Ansatz verlassen hat (Abstand
 * zum Ansatz ≥ Radius dort); dort die Berührpunkte als Sehne. Der Ast-Umriss ist das Randstück zwischen den beiden
 * Berührpunkten, das die Ast-Spitze enthält, plus die Sehne; der Rumpf behält das andere Randstück plus die Sehne.
 */
function schneiden(poly: readonly V2[], achse: SkelettWeg, rAnsatz: number): { schnitt: [V2, V2]; ast: V2[]; rest: V2[]; k: number } | null {
  const p0 = achse.punkte[0]!;
  let k = 1;
  while (k < achse.punkte.length - 1 && laenge(sub(achse.punkte[k]!, p0)) < rAnsatz) k++;
  const d = richtung(achse, k, 2 * achse.radius[k]!, 1);
  const bp = beruehrpunkte(poly, achse.punkte[k]!, achse.radius[k]!, d.x || d.y ? d : sub(achse.punkte[k]!, p0));
  if (!bp) return null;
  const i = naechsterRand(poly, bp[0]);
  const j = naechsterRand(poly, bp[1]);
  if (i === j) return null;
  const a = randStueck(poly, i, j);
  const b = randStueck(poly, j, i);
  // das Stück mit der Ast-Spitze gehört zum Ast
  const spitze = achse.punkte[achse.punkte.length - 1]!;
  const naheA = Math.min(...a.map((q) => laenge(sub(q, spitze))));
  const naheB = Math.min(...b.map((q) => laenge(sub(q, spitze))));
  const ast = naheA <= naheB ? a : b;
  const rest = naheA <= naheB ? b : a;
  return { schnitt: [poly[i]!, poly[j]!], ast, rest, k };
}

/**
 * Seite (oder jede nicht gespiegelte Ansicht) zerlegen. Ohne Gabel und ohne scharfen Knick bleibt alles Rumpf (bisherige
 * Körper unverändert).
 */
export function seiteZerlegen(poly: readonly V2[], zellen = 240): Zerlegung {
  const sk = skelett(poly, zellen);
  const haupt = sk.aeste[0];
  const leer: Zerlegung = { skelett: sk, rumpf: { achse: haupt ?? { punkte: [], radius: [] }, umriss: poly.slice() }, aeste: [] };
  if (!haupt || haupt.punkte.length < 3) return leer;
  const rMax = Math.max(...haupt.radius);
  const iMax = haupt.radius.indexOf(rMax);
  // Knicke der Rumpfachse: von der dicksten Stelle nach außen bis zur ersten Stelle, die dünner als KNICK_DICKE · rMax ist;
  // weicht der dünne Teil um mindestens KNICK_GRAD von der Geradeausrichtung des Rumpfs ab (Hals auf dem Körper, nicht
  // der Schwanz in Verlängerung), endet der Rumpf beim halben Dickensprung und der Rest wird ein Ast
  let von = 0;
  let bis = haupt.punkte.length - 1;
  const knicke: { ab: number; s: 1 | -1; abweichung: number }[] = [];
  for (const s of [1, -1] as const) {
    let duenn = -1;
    for (let i = iMax; s > 0 ? i < haupt.punkte.length : i >= 0; i += s)
      if (haupt.radius[i]! < KNICK_DICKE * rMax) {
        duenn = i;
        break;
      }
    if (duenn < 0) continue;
    const rDuenn = haupt.radius[duenn]!;
    // Schnitt beim halben Dickensprung (erste Stelle unter (rMax + rDünn) / 2)
    let ab = iMax;
    while (ab !== duenn && haupt.radius[ab]! >= 0.5 * (rMax + rDuenn)) ab += s;
    // Richtungen: in den Rumpf (vom Schnitt zum anderen Ende der Rumpfachse — die Längsrichtung des Körpers, nicht zur
    // dicksten Stelle: bei der Ente liegt die genau unter dem Halsansatz) und in den dünnen Teil (ab dem dünnen Punkt,
    // 3 Radien weit). Ein Ast ist außerdem lang (mindestens 2,5 Radien hinter dem dünnen Punkt) — die Ecken eines Kastens
    // (Mittelachse in die Ecke, Radius läuft auf 0) sind keiner.
    const anderesEnde = s > 0 ? 0 : haupt.punkte.length - 1;
    const inRumpf = sub(haupt.punkte[anderesEnde]!, haupt.punkte[ab]!);
    const inAst = richtung(haupt, duenn, 3 * rDuenn, s);
    if (laenge(inRumpf) < 1e-9 || laenge(inAst) < 1e-9) continue;
    let astLaenge = 0;
    for (let i = duenn; s > 0 ? i + 1 < haupt.punkte.length : i - 1 >= 0; i += s) astLaenge += laenge(sub(haupt.punkte[i + s]!, haupt.punkte[i]!));
    if (astLaenge < 2.5 * rDuenn) continue;
    const abweichung = 180 - winkelZwischen(inRumpf, inAst);
    if (abweichung < KNICK_GRAD) continue;
    knicke.push({ ab, s, abweichung });
    if (s > 0) bis = ab;
    else von = ab;
  }
  const aeste: ZerlegterAst[] = [];
  let rumpfUmriss = poly.slice();
  const rumpfAchse: SkelettWeg = { punkte: haupt.punkte.slice(von, bis + 1), radius: haupt.radius.slice(von, bis + 1) };
  // Knick-Äste: die Fortsetzung der Rumpfachse hinter dem Knick
  for (const kn of knicke) {
    const idx = kn.s > 0 ? haupt.punkte.map((_, t) => kn.ab + t).filter((t) => t < haupt.punkte.length) : haupt.punkte.map((_, t) => kn.ab - t).filter((t) => t >= 0);
    const achse: SkelettWeg = { punkte: idx.map((t) => haupt.punkte[t]!), radius: idx.map((t) => haupt.radius[t]!) };
    // geschnitten wird an der Schnittstelle selbst (Kreis der Schnittstelle, nicht des Rumpfs)
    const sch = schneiden(rumpfUmriss, achse, 0);
    if (!sch) continue;
    aeste.push({ achse: { punkte: achse.punkte.slice(sch.k), radius: achse.radius.slice(sch.k) }, schnitt: sch.schnitt, umriss: sch.ast, art: 'knick', winkel: kn.abweichung, dicke: achse.radius[Math.min(achse.radius.length - 1, sch.k)]! / rMax });
    rumpfUmriss = sch.rest;
  }
  // Gabel-Äste des Skeletts, die am Rumpf ansetzen (Abzweig auf dem Rumpfstück der Achse)
  for (const a of sk.aeste.slice(1)) {
    if (a.eltern !== 0 || a.abzweig < von || a.abzweig > bis) continue;
    const sch = schneiden(rumpfUmriss, a, haupt.radius[a.abzweig]!);
    if (!sch) continue;
    const d0 = richtung(haupt, a.abzweig, rMax * 0.5, 1);
    aeste.push({ achse: { punkte: a.punkte.slice(sch.k), radius: a.radius.slice(sch.k) }, schnitt: sch.schnitt, umriss: sch.ast, art: 'gabel', winkel: winkelZwischen(d0, sub(a.punkte[a.punkte.length - 1]!, a.punkte[0]!)), dicke: a.radius[sch.k]! / rMax });
    rumpfUmriss = sch.rest;
  }
  return { skelett: sk, rumpf: { achse: rumpfAchse, umriss: rumpfUmriss }, aeste };
}
