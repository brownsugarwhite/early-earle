// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 Rest (Florian: „Die Einordnung passt. Weiter mit dem Rest von S4“): ein
// verdecktes Stück eines Teils als eigene Kurve. Die Zeichnungen zeigen nur den äußeren Umriss; wo ein Teil hinter einem
// anderen liegt (der Bauch unter dem Kopf im Top), rät die Hülle (`teilAnsicht.ts`, gestrichelt). Ein Klick übernimmt das
// geratene Stück als Kurve mit Knoten, die Florian formt; „Automatisch“ nimmt sie zurück.
// - Gespeichert im Rahmen der Stoßstellen mit der schwarzen Linie (Kurvenparameter des Profils der Ansicht, wie die Enden
//   der Wirbelsäule): Ändert sich die schwarze Linie, wandert die Kurve mit (Ähnlichkeit über die Strecke a → b).
// - Front und Top sind gespiegelt: Die Kurve liegt auf der gezeichneten Hälfte; ein Stück, das die Mitte kreuzt (das U der
//   Bauchlinien unter der Nase), endet auf der Spiegelachse und wird mit seiner Stoßstelle mitgeführt.
// - Noch ohne Wirkung auf den Körper (S5 baut Teile damit). DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument, EndenAnker, TeilKurve } from '../../dokument';
import { fitkubik } from '../../fit';
import { type Knoten, type Profil, pfadAbtasten, vollerPfad } from '../../profil';
import { profilAnker, profilPunkt } from './enden';

const PX = 461;
/** Ein Ende gilt als Stoßstelle, wenn es so nah (px) an der schwarzen Linie liegt (Raster der Hülle ≈ 2 px, Glättung) */
const STOSS_PX = 8;
/** … als Ende auf der Spiegelachse, wenn es so nah (px) an ihr liegt */
const ACHSE_PX = 3;

type Ansicht = TeilKurve['ansicht'];

const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });

/** Querkoordinate zur Spiegelachse (Front: x = z, Top: y = z); die Seite hat keine. */
function quer(ansicht: Ansicht, p: V2): number | null {
  return ansicht === 'front' ? p.x : ansicht === 'top' ? p.y : null;
}

function aufAchse(ansicht: Ansicht, p: V2): V2 {
  return ansicht === 'front' ? { x: 0, y: p.y } : ansicht === 'top' ? { x: p.x, y: 0 } : p;
}

/** Abstand eines Punkts zum Umriss (Polygon). */
function abstandZu(poly: readonly V2[], q: V2): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ab = sub(b, a);
    const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    d = Math.min(d, Math.hypot(a.x + ab.x * f - q.x, a.y + ab.y * f - q.y));
  }
  return d;
}

/** Rahmen der Stoßstellen: mit b Ähnlichkeit über die Strecke a → b, ohne b Verschiebung zu a, ohne a das Blatt selbst. */
type Rahmen = { A: V2; u: V2; n: V2; L: number; sehne: boolean };

function rahmen(A: V2 | null, B: V2 | null): Rahmen {
  if (!A) return { A: { x: 0, y: 0 }, u: { x: 1, y: 0 }, n: { x: 0, y: 1 }, L: 1, sehne: false };
  if (!B) return { A, u: { x: 1, y: 0 }, n: { x: 0, y: 1 }, L: 1, sehne: false };
  const d = sub(B, A);
  const L = Math.hypot(d.x, d.y) || 1e-9;
  const u = mul(d, 1 / L);
  return { A, u, n: { x: -u.y, y: u.x }, L, sehne: true };
}
const nachLokal = (r: Rahmen, p: V2): V2 => {
  const q = sub(p, r.A);
  return { x: (q.x * r.u.x + q.y * r.u.y) / r.L, y: (q.x * r.n.x + q.y * r.n.y) / r.L };
};
const vonLokal = (r: Rahmen, l: V2): V2 => add(r.A, mul(add(mul(r.u, l.x), mul(r.n, l.y)), r.L));
const vekLokal = (r: Rahmen, v: V2): V2 => ({ x: (v.x * r.u.x + v.y * r.u.y) / r.L, y: (v.x * r.n.x + v.y * r.n.y) / r.L });
const vekVon = (r: Rahmen, l: V2): V2 => mul(add(mul(r.u, l.x), mul(r.n, l.y)), r.L);

/** Lage einer Stoßstelle auf der Kurve von heute (bei anderer Knotenzahl über ihre gemerkte Lage neu gefunden). */
function stossLage(pr: Profil, a: EndenAnker, knotenzahl: number): V2 {
  if (pr.knoten.length === knotenzahl) return profilPunkt(pr, a.k, a.t);
  return profilAnker(pr, a.p).p;
}

/**
 * Eigene Kurve aus einem geratenen verdeckten Stück (Polygonzug in Blattkoordinaten, Profil-Einheiten). In Front/Top wird
 * der Zug auf die gezeichnete Hälfte beschnitten (längstes Stück dort, an der Achse genau auf ihr endend). Mindestens ein
 * Ende muss an der schwarzen Linie liegen. Knoten aus einem kubischen Fit (Fehler ≤ 1,5 px).
 */
export function teilKurveAus(dok: Dokument, teil: string, ansicht: Ansicht, zug: readonly V2[]): TeilKurve | null {
  let pts = zug.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 3) return null;
  const pr = dok.profile[ansicht];
  const sk = dok.skalierung;
  // ganz auf der gespiegelten Hälfte: auf die gezeichnete spiegeln (die Kurve gilt für beide Seiten)
  if (ansicht !== 'seite' && pts.every((p) => quer(ansicht, p)! <= 0)) pts = pts.map((p) => (ansicht === 'front' ? { x: -p.x, y: p.y } : { x: p.x, y: -p.y }));
  // ganz verdeckt (geschlossene Schleife, berührt die schwarze Linie nicht): an ihrer Stelle, ohne Stoßstelle
  const erste = pts[0]!;
  const letzte = pts[pts.length - 1]!;
  if (Math.hypot(erste.x - letzte.x, erste.y - letzte.y) * sk * PX <= 4 && pts.length >= 6) {
    const ring = pts.slice(0, -1);
    const kn = fitKnoten([...ring, ring[0]!]);
    if (!kn) return null;
    kn.pop();
    kn[0]!.art = 'glatt';
    return { teil, ansicht, knotenzahl: pr.knoten.length, knoten: kn, zu: true };
  }
  // gezeichnete Hälfte (z ≥ 0): längstes zusammenhängendes Stück, Übergänge über die Achse genau auf ihr
  if (ansicht !== 'seite') {
    const laeufe: V2[][] = [];
    let lauf: V2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const z = quer(ansicht, p)!;
      if (z >= 0) {
        if (!lauf.length && i > 0) {
          const v = pts[i - 1]!;
          const zv = quer(ansicht, v)!;
          if (zv < 0) lauf.push(aufAchse(ansicht, add(v, mul(sub(p, v), -zv / (z - zv)))));
        }
        lauf.push(p);
      } else {
        if (lauf.length) {
          const v = pts[i - 1]!;
          const zv = quer(ansicht, v)!;
          lauf.push(aufAchse(ansicht, add(v, mul(sub(p, v), zv / (zv - z)))));
          laeufe.push(lauf);
        }
        lauf = [];
      }
    }
    if (lauf.length) laeufe.push(lauf);
    laeufe.sort((a, b) => b.length - a.length);
    pts = laeufe[0] ?? [];
    if (pts.length < 3) return null;
  }
  const umriss = pfadAbtasten(vollerPfad(pr), 32);
  const ende = (p: V2): 'stoss' | 'achse' | 'frei' => (abstandZu(umriss, p) * sk * PX <= STOSS_PX ? 'stoss' : ansicht !== 'seite' && Math.abs(quer(ansicht, p)!) * sk * PX <= ACHSE_PX ? 'achse' : 'frei');
  let e0 = ende(pts[0]!);
  let e1 = ende(pts[pts.length - 1]!);
  // die Stoßstelle zuerst
  if (e0 !== 'stoss' && e1 === 'stoss') {
    pts = pts.slice().reverse();
    [e0, e1] = [e1, e0];
  }
  const a = e0 === 'stoss' ? profilAnker(pr, pts[0]!) : null;
  const b = a && e1 === 'stoss' ? profilAnker(pr, pts[pts.length - 1]!) : null;
  // Enden genau auf Stoßstelle bzw. Achse
  const z = pts[pts.length - 1]!;
  pts = [a ? a.p : pts[0]!, ...pts.slice(1, -1), b ? b.p : e1 === 'achse' ? aufAchse(ansicht, z) : z];
  const knoten = fitKnoten(pts);
  if (!knoten) return null;
  const r = rahmen(a ? a.p : null, b ? b.p : null);
  const anker = (x: { k: number; t: number; p: V2 }): EndenAnker => ({ k: x.k, t: x.t, p: { x: x.p.x, y: x.p.y } });
  return {
    teil,
    ansicht,
    ...(a ? { a: anker(a) } : {}),
    ...(b ? { b: anker(b) } : {}),
    knotenzahl: pr.knoten.length,
    knoten: knoten.map((kn) => ({ p: nachLokal(r, kn.p), ein: vekLokal(r, kn.ein), aus: vekLokal(r, kn.aus), art: kn.art })),
  };
}

/** Kubischer Fit eines Zugs (Profil-Einheiten) in Pixeln, Fehler ≤ 1,5 px; Enden als Ecken. */
function fitKnoten(pts: readonly V2[]): Knoten[] | null {
  if (pts.length < 2) return null;
  const px = pts.map((p) => [p.x * PX, p.y * PX] as [number, number]);
  const t = (i: number, j: number): [number, number] => {
    const d = [px[j]![0] - px[i]![0], px[j]![1] - px[i]![1]];
    const l = Math.hypot(d[0]!, d[1]!) || 1;
    return [d[0]! / l, d[1]! / l];
  };
  const k = Math.min(3, px.length - 1);
  const kurven = fitkubik(px, t(0, k), t(px.length - 1, px.length - 1 - k), 1.5 * 1.5);
  // mindestens ein innerer Knoten zum Formen: das längste Stück in der Mitte teilen (de Casteljau, formgleich)
  while (kurven.length < 2) {
    const [a, b, c, d] = kurven.shift()!;
    const m = (p: [number, number], q: [number, number]): [number, number] => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const ab = m(a, b);
    const bc = m(b, c);
    const cd = m(c, d);
    const abc = m(ab, bc);
    const bcd = m(bc, cd);
    const mitte = m(abc, bcd);
    kurven.unshift([a, ab, abc, mitte], [mitte, bcd, cd, d]);
  }
  const knoten: Knoten[] = [];
  kurven.forEach((c, i) => {
    const p0 = { x: c[0][0] / PX, y: c[0][1] / PX };
    const p3 = { x: c[3][0] / PX, y: c[3][1] / PX };
    if (i === 0) knoten.push({ p: p0, ein: { x: 0, y: 0 }, aus: { x: (c[1][0] - c[0][0]) / PX, y: (c[1][1] - c[0][1]) / PX }, art: 'ecke' });
    else knoten[knoten.length - 1]!.aus = { x: (c[1][0] - c[0][0]) / PX, y: (c[1][1] - c[0][1]) / PX };
    knoten.push({ p: p3, ein: { x: (c[2][0] - c[3][0]) / PX, y: (c[2][1] - c[3][1]) / PX }, aus: { x: 0, y: 0 }, art: i === kurven.length - 1 ? 'ecke' : 'glatt' });
  });
  return knoten;
}

/** Die Knoten einer eigenen Kurve heute (Blattkoordinaten, Profil-Einheiten): Stoßstellen auf der schwarzen Linie. */
export function teilKurveKnoten(dok: Dokument, kurve: TeilKurve): Knoten[] {
  const pr = dok.profile[kurve.ansicht];
  const A = kurve.a ? stossLage(pr, kurve.a, kurve.knotenzahl) : null;
  const B = kurve.a && kurve.b ? stossLage(pr, kurve.b, kurve.knotenzahl) : null;
  const r = rahmen(A, B);
  const kn = kurve.knoten.map((k) => ({ ...k, p: vonLokal(r, k.p), ein: vekVon(r, k.ein), aus: vekVon(r, k.aus) }));
  if (kurve.zu || !A) return kn;
  // Enden genau: die erste auf der Stoßstelle, die letzte auf der zweiten Stoßstelle bzw. auf der Spiegelachse
  kn[0] = { ...kn[0]!, p: A };
  const l = kn.length - 1;
  const achse = !B && kurve.ansicht !== 'seite' && Math.abs(quer(kurve.ansicht, kn[l]!.p)!) * dok.skalierung * PX <= ACHSE_PX * 2;
  kn[l] = { ...kn[l]!, p: B ?? (achse ? aufAchse(kurve.ansicht, kn[l]!.p) : kn[l]!.p) };
  return kn;
}

/** Gezogene Knoten zurück in den Rahmen der Stoßstellen (die Enden bleiben auf ihren Stoßstellen bzw. der Achse). */
export function teilKurveMitKnoten(dok: Dokument, kurve: TeilKurve, knoten: readonly Knoten[]): TeilKurve {
  const pr = dok.profile[kurve.ansicht];
  const A = kurve.a ? stossLage(pr, kurve.a, kurve.knotenzahl) : null;
  const B = kurve.a && kurve.b ? stossLage(pr, kurve.b, kurve.knotenzahl) : null;
  const r = rahmen(A, B);
  return { ...kurve, knoten: knoten.map((k) => ({ ...k, p: nachLokal(r, k.p), ein: vekLokal(r, k.ein), aus: vekLokal(r, k.aus) })) };
}

/** Kubische Stücke einer Kurve (für Pfade und Abtastung); geschlossen mit dem Stück zurück zum ersten Knoten. */
export function teilKurveStuecke(kn: readonly Knoten[], zu = false): [V2, V2, V2, V2][] {
  const out: [V2, V2, V2, V2][] = [];
  const n = kn.length;
  for (let i = 0; i + 1 < n + (zu ? 1 : 0); i++) {
    const a = kn[i]!;
    const b = kn[(i + 1) % n]!;
    out.push([a.p, add(a.p, a.aus), add(b.p, b.ein), b.p]);
  }
  return out;
}
