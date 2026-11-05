// Form zuerst (05.11.2026), das Netz verdichtet sich selbst (Florian: „Sollte das Mesh nicht dynamisch verdichten, dass immer
// genug Polygone für eine runde Form da sind?“). Das Netz entsteht einmal aus der Startkugel und wird danach nur verformt; zieht man
// einen Kopf heraus, werden seine Dreiecke vielfach so lang (Umriss eckig, Flächen flach). Deshalb nach einem Zug, wie in Sculptris:
// jede Kante, die länger als `maxKante` geworden ist, wird geteilt (die längsten zuerst, je mit ihrem Spiegelbild), danach werden
// Kanten gedreht, wo das die Zahl der Nachbarn näher an 6 bringt, und die neuen Punkte in der Fläche entspannt.
//
// Neue Punkte liegen nicht auf der Sehne, sondern auf der runden Fläche durch die Enden: auf einem Loop nach der Kurve längs des
// Loops (Catmull–Rom nach Sehnenlänge), sonst auf der kubischen Kurve, die die Normalen der Enden vorgeben (wie PN-Dreiecke; an einer
// Kugel genau der Bogen bis auf die vierte Ordnung); an einem harten Loop zählt die Normale der Seite, auf der die Kante liegt.
// Loops bleiben Ketten von Kanten (eine geteilte Kante eines Loops bekommt den neuen Punkt in die Kette), ihre Punkte bleiben.

import { type Haut, type V3, hautAus } from './kurven';
import { type Loop, type Probe, haerteBei } from './loops';

const KEY = 2 ** 22;
const schluessel = (a: number, b: number): number => (a < b ? a * KEY + b : b * KEY + a);
const punktProbe = (w: number): Probe => ({ ecken: [w, w, w], b: [1, 0, 0] });

export type Verdichtet = { haut: Haut; loops: Loop[]; neu: number; gedreht: number };

/**
 * Teilt alle Kanten länger als `maxKante` (spiegelgleich, höchstens `runden` Durchgänge), dreht danach Kanten zur Wertigkeit 6 und
 * entspannt die neuen Punkte. Ergebnis: neue Haut und Loops (Reihenfolge wie vorher), null, wenn keine Kante zu lang war.
 */
export function verdichten(
  h: Haut,
  loops: readonly Loop[],
  maxKante: number,
  opt: { runden?: number; drehen?: boolean; entspannen?: boolean } = {},
): Verdichtet | null {
  const runden = opt.runden ?? 8;
  const pos: number[] = Array.from(h.pos);
  const tri: number[] = Array.from(h.tri);
  const spiegel: number[] = Array.from(h.spiegel);
  const lage = (v: number): V3 => ({ x: pos[3 * v]!, y: pos[3 * v + 1]!, z: pos[3 * v + 2]! });
  const laengeVon = (a: number, b: number) => Math.hypot(pos[3 * a]! - pos[3 * b]!, pos[3 * a + 1]! - pos[3 * b + 1]!, pos[3 * a + 2]! - pos[3 * b + 2]!);

  // Kanten → Dreiecke
  const kanten = new Map<number, number[]>();
  const dazu = (a: number, b: number, t: number) => {
    const k = schluessel(a, b);
    const l = kanten.get(k);
    if (l) l.push(t);
    else kanten.set(k, [t]);
  };
  const weg = (a: number, b: number, t: number) => {
    const k = schluessel(a, b);
    const l = kanten.get(k);
    if (!l) return;
    const i = l.indexOf(t);
    if (i >= 0) l.splice(i, 1);
    if (l.length === 0) kanten.delete(k);
  };
  for (let t = 0; t < tri.length / 3; t++) for (let e = 0; e < 3; e++) dazu(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, t);
  const dritter = (t: number, a: number, b: number): number => {
    for (let e = 0; e < 3; e++) {
      const v = tri[3 * t + e]!;
      if (v !== a && v !== b) return v;
    }
    return -1;
  };
  const flaechenNormale = (t: number): V3 => {
    const a = lage(tri[3 * t]!);
    const b = lage(tri[3 * t + 1]!);
    const c = lage(tri[3 * t + 2]!);
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    return { x: ab.y * ac.z - ab.z * ac.y, y: ab.z * ac.x - ab.x * ac.z, z: ab.x * ac.y - ab.y * ac.x };
  };
  const norm = (v: V3): V3 => {
    const l = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  };

  // Ketten der eingesetzten Loops (die gespeicherte Hälfte; die andere ist ihr Spiegelbild im Netz), harte Punkte
  const ketten = loops.map((l) => (l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]) ? l.proben.map((p) => p.ecken[0]) : null));
  const sWerte = loops.map((l) => Array.from(l.s));
  const hart = new Set<number>();
  loops.forEach((l, li) => {
    const k = ketten[li];
    if (!k) return;
    const hd = haerteBei(l);
    k.forEach((v, j) => {
      if (hd[j]! <= 0.05) return;
      hart.add(v);
      if (spiegel[v]! >= 0) hart.add(spiegel[v]!);
    });
  });
  /** Loop und Stelle j, wenn (a, b) die Kante kette[j] – kette[j + 1] eines Loops ist (oder die schließende Kante) */
  const kettenKante = (a: number, b: number): { li: number; j: number } | null => {
    for (let li = 0; li < ketten.length; li++) {
      const k = ketten[li];
      if (!k) continue;
      const zu = loops[li]!.art !== 'ring';
      for (let j = 0; j < k.length; j++) {
        if (k[j] !== a && k[j] !== b) continue;
        const n = j + 1 < k.length ? j + 1 : zu ? 0 : -1;
        if (n >= 0 && ((k[j] === a && k[n] === b) || (k[j] === b && k[n] === a))) return { li, j };
      }
    }
    return null;
  };

  /** neuer Punkt auf der Kante (a, b) eines Loops: Catmull–Rom nach Sehnenlänge mit den Nachbarn in der Kette */
  const aufLoop = (li: number, j: number): V3 => {
    const k = ketten[li]!;
    const l = loops[li]!;
    const m = k.length;
    const zu = l.art !== 'ring';
    const a = lage(k[j]!);
    const jb = (j + 1) % m;
    const b = lage(k[jb]!);
    const spiegelLage = (v: number) => ({ ...lage(v), z: -pos[3 * v + 2]! });
    const p = j > 0 ? lage(k[j - 1]!) : zu ? lage(k[m - 1]!) : spiegelLage(k[1]!);
    const q = jb + 1 < m ? lage(k[jb + 1]!) : zu ? lage(k[(jb + 1) % m]!) : spiegelLage(k[m - 2]!);
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const lp = Math.hypot(a.x - p.x, a.y - p.y, a.z - p.z);
    const lq = Math.hypot(q.x - b.x, q.y - b.y, q.z - b.z);
    const ta = { x: (b.x - p.x) / (L + lp || 1), y: (b.y - p.y) / (L + lp || 1), z: (b.z - p.z) / (L + lp || 1) };
    const tb = { x: (q.x - a.x) / (L + lq || 1), y: (q.y - a.y) / (L + lq || 1), z: (q.z - a.z) / (L + lq || 1) };
    return begrenzt(a, b, { x: (L * (ta.x - tb.x)) / 8, y: (L * (ta.y - tb.y)) / 8, z: (L * (ta.z - tb.z)) / 8 });
  };
  /** Mitte der Sehne plus Versatz, der Versatz höchstens ¼ der Sehne */
  const begrenzt = (a: V3, b: V3, d: V3): V3 => {
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const ld = Math.hypot(d.x, d.y, d.z);
    const f = ld > 0.25 * L ? (0.25 * L) / ld : 1;
    return { x: (a.x + b.x) / 2 + f * d.x, y: (a.y + b.y) / 2 + f * d.y, z: (a.z + b.z) / 2 + f * d.z };
  };
  /** neuer Punkt auf einer Kante in der Fläche: Mitte der kubischen Kurve nach den Normalen der Enden (wie PN-Dreiecke) */
  const inFlaeche = (a: number, b: number, nor: Float64Array): V3 => {
    const pa = lage(a);
    const pb = lage(b);
    const seite = norm(
      (kanten.get(schluessel(a, b)) ?? []).reduce(
        (s, t) => {
          const n = norm(flaechenNormale(t));
          return { x: s.x + n.x, y: s.y + n.y, z: s.z + n.z };
        },
        { x: 0, y: 0, z: 0 },
      ),
    );
    const nv = (v: number): V3 => (hart.has(v) ? seite : { x: nor[3 * v]!, y: nor[3 * v + 1]!, z: nor[3 * v + 2]! });
    const na = nv(a);
    const nb = nv(b);
    const wa = (pb.x - pa.x) * na.x + (pb.y - pa.y) * na.y + (pb.z - pa.z) * na.z;
    const wb = (pa.x - pb.x) * nb.x + (pa.y - pb.y) * nb.y + (pa.z - pb.z) * nb.z;
    return begrenzt(pa, pb, { x: -(wa * na.x + wb * nb.x) / 8, y: -(wa * na.y + wb * nb.y) / 8, z: -(wa * na.z + wb * nb.z) / 8 });
  };
  const punktNormalen = (): Float64Array => {
    const nor = new Float64Array(pos.length);
    for (let t = 0; t < tri.length / 3; t++) {
      const n = flaechenNormale(t);
      for (let e = 0; e < 3; e++) {
        const v = tri[3 * t + e]!;
        nor[3 * v] = nor[3 * v]! + n.x;
        nor[3 * v + 1] = nor[3 * v + 1]! + n.y;
        nor[3 * v + 2] = nor[3 * v + 2]! + n.z;
      }
    }
    for (let v = 0; v < nor.length / 3; v++) {
      const l = Math.hypot(nor[3 * v]!, nor[3 * v + 1]!, nor[3 * v + 2]!) || 1;
      nor[3 * v] = nor[3 * v]! / l;
      nor[3 * v + 1] = nor[3 * v + 1]! / l;
      nor[3 * v + 2] = nor[3 * v + 2]! / l;
    }
    return nor;
  };

  /** Kante (a, b) am Punkt m teilen: jedes ihrer Dreiecke (x, y, w) wird (x, m, w) und (m, y, w) */
  const teilen = (a: number, b: number, m: V3): number => {
    const v = pos.length / 3;
    pos.push(m.x, m.y, m.z);
    spiegel.push(-1);
    const ts = [...(kanten.get(schluessel(a, b)) ?? [])];
    kanten.delete(schluessel(a, b));
    for (const t of ts) {
      const e0 = tri[3 * t]!;
      const e1 = tri[3 * t + 1]!;
      const e2 = tri[3 * t + 2]!;
      const paar = (p: number, q: number) => (p === a && q === b) || (p === b && q === a);
      const [x, y, w] = paar(e0, e1) ? [e0, e1, e2] : paar(e1, e2) ? [e1, e2, e0] : [e2, e0, e1];
      tri[3 * t] = x;
      tri[3 * t + 1] = v;
      tri[3 * t + 2] = w;
      const t2 = tri.length / 3;
      tri.push(v, y, w);
      dazu(x, v, t);
      dazu(v, w, t);
      weg(y, w, t);
      dazu(v, y, t2);
      dazu(y, w, t2);
      dazu(w, v, t2);
    }
    return v;
  };
  /**
   * Liegen die beiden neuen Punkte v, v2 (Spiegelbilder) in einem Dreieck über der Mittelebene (eine Ecke auf der Mitte, zwei
   * Spiegelpartner), sind sie danach verbunden, und das Viereck daneben (p, v, v2, Spiegel von p) zerfällt schief in zwei
   * Dreiecke: Es bekommt einen Mittelpunkt auf der Mittelebene (wie beim Einsetzen der Loops), sonst fehlte einer Kante ihr
   * Spiegelbild und sie bliebe zu lang.
   */
  const mitteFuellen = (v: number, v2: number) => {
    const ts = kanten.get(schluessel(v, v2));
    if (!ts) return;
    for (const tq of [...ts]) {
      const q = dritter(tq, v, v2);
      if (q < 0 || spiegel[q] === q) continue;
      // Gegenstück: das Dreieck mit v (bzw. v2), q und dem Spiegel von q
      const sq = spiegel[q]!;
      const tp = (kanten.get(schluessel(q, sq)) ?? []).find((t) => t !== tq && [0, 1, 2].some((e) => tri[3 * t + e] === v || tri[3 * t + e] === v2));
      if (tp === undefined) continue;
      // Viereck in der Richtung von tq: Rand tq = (r0, r1, r2) mit der Kante (v, v2) bzw. (v2, v)
      const rand = (t: number) => [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
      const eq = rand(tq);
      const ep = rand(tp);
      // die gemeinsame Kante von tq und tp ist (q, x) mit x ∈ {v, v2}; der Viereck-Umlauf folgt den Dreiecken
      const x = ep.includes(v) ? v : v2;
      const iq = eq.indexOf(q);
      const umlauf: number[] = [];
      // Umlauf von tq ab q: q → eq[iq+1] → eq[iq+2]; tp schließt mit sq
      const n1 = eq[(iq + 1) % 3]!;
      const n2 = eq[(iq + 2) % 3]!;
      if (n2 === x) umlauf.push(q, n1, x, sq);
      else umlauf.push(q, sq, x, n2);
      const P = umlauf.map(lage);
      const c = pos.length / 3;
      pos.push((P[0]!.x + P[1]!.x + P[2]!.x + P[3]!.x) / 4, (P[0]!.y + P[1]!.y + P[2]!.y + P[3]!.y) / 4, 0);
      spiegel.push(c);
      for (const t of [tq, tp]) for (let e = 0; e < 3; e++) weg(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, t);
      const neueT = [tq, tp, tri.length / 3, tri.length / 3 + 1];
      tri.push(0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const t = neueT[k]!;
        tri[3 * t] = umlauf[k]!;
        tri[3 * t + 1] = umlauf[(k + 1) % 4]!;
        tri[3 * t + 2] = c;
        for (let e = 0; e < 3; e++) dazu(tri[3 * t + e]!, tri[3 * t + ((e + 1) % 3)]!, t);
      }
      return;
    }
  };
  /** einen neuen Punkt in die Kette eines Loops nach Stelle j setzen (s in der Mitte) */
  const inKette = (li: number, j: number, v: number) => {
    const k = ketten[li]!;
    const s = sWerte[li]!;
    const l = loops[li]!;
    const s1 = j + 1 < s.length ? s[j + 1]! : l.laenge;
    k.splice(j + 1, 0, v);
    s.splice(j + 1, 0, (s[j]! + s1) / 2);
  };

  const neu0 = pos.length / 3;
  for (let runde = 0; runde < runden; runde++) {
    const lang: { a: number; b: number; l: number }[] = [];
    for (const k of kanten.keys()) {
      const a = Math.floor(k / KEY);
      const b = k % KEY;
      const l = laengeVon(a, b);
      if (l > maxKante) lang.push({ a, b, l });
    }
    if (lang.length === 0) break;
    lang.sort((p, q) => q.l - p.l);
    const nor = punktNormalen();
    for (const { a, b } of lang) {
      if (!kanten.has(schluessel(a, b))) continue;
      const sa = spiegel[a]!;
      const sb = spiegel[b]!;
      if (sa < 0 || sb < 0 || !kanten.has(schluessel(sa, sb))) continue;
      const selbst = schluessel(sa, sb) === schluessel(a, b);
      // auf einem Loop (die gespeicherte Hälfte oder ihr Spiegelbild) nach der Kurve des Loops, sonst nach den Normalen
      const hier = kettenKante(a, b);
      const dort = selbst ? null : kettenKante(sa, sb);
      let m: V3;
      if (hier) m = aufLoop(hier.li, hier.j);
      else if (dort) {
        const q = aufLoop(dort.li, dort.j);
        m = { ...q, z: -q.z };
      } else m = inFlaeche(a, b, nor);
      if (selbst) m.z = 0;
      const v = teilen(a, b, m);
      if (hier) inKette(hier.li, hier.j, v);
      if (selbst) {
        spiegel[v] = v;
        continue;
      }
      const v2 = teilen(sa, sb, { x: m.x, y: m.y, z: -m.z });
      spiegel[v] = v2;
      spiegel[v2] = v;
      if (dort) inKette(dort.li, dort.j, v2);
      mitteFuellen(v, v2);
    }
  }
  const neu = pos.length / 3 - neu0;
  if (neu === 0) return null;

  // Kanten drehen: Wertigkeit näher an 6, nie Kanten eines Loops (samt Spiegelbild), nie über eine Falte
  const gesperrt = new Set<number>();
  ketten.forEach((k, li) => {
    if (!k) return;
    const zu = loops[li]!.art !== 'ring';
    for (let j = 0; j < (zu ? k.length : k.length - 1); j++) {
      const a = k[j]!;
      const b = k[(j + 1) % k.length]!;
      gesperrt.add(schluessel(a, b));
      if (spiegel[a]! >= 0 && spiegel[b]! >= 0) gesperrt.add(schluessel(spiegel[a]!, spiegel[b]!));
    }
  });
  const wertigkeit = new Int32Array(pos.length / 3);
  for (const k of kanten.keys()) {
    wertigkeit[Math.floor(k / KEY)]!++;
    wertigkeit[k % KEY]!++;
  }
  const drehbar = (a: number, b: number): { t1: number; t2: number; c: number; d: number } | null => {
    const k = schluessel(a, b);
    if (gesperrt.has(k)) return null;
    const ts = kanten.get(k);
    if (!ts || ts.length !== 2) return null;
    const c = dritter(ts[0]!, a, b);
    const d = dritter(ts[1]!, a, b);
    if (c < 0 || d < 0 || c === d || kanten.has(schluessel(c, d))) return null;
    return { t1: ts[0]!, t2: ts[1]! , c, d };
  };
  const besser = (a: number, b: number, c: number, d: number): boolean => {
    const ab = (v: number, dv: number) => Math.abs(wertigkeit[v]! + dv - 6);
    return ab(a, -1) + ab(b, -1) + ab(c, 1) + ab(d, 1) < ab(a, 0) + ab(b, 0) + ab(c, 0) + ab(d, 0);
  };
  /**
   * Dreiecke t1 = (x, y, c), t2 = (y, x, d) werden (x, d, c) und (y, c, d); nur wenn die neue Kante kürzer ist und die Falte
   * zwischen den beiden Dreiecken nicht tiefer wird (sonst schaffte das Drehen lange Kanten und Knicke bis 63°)
   */
  const drehen = (a: number, b: number, f: { t1: number; t2: number; c: number; d: number }, pruefen: boolean): boolean => {
    const { t1, t2, c, d } = f;
    const e = [tri[3 * t1]!, tri[3 * t1 + 1]!, tri[3 * t1 + 2]!];
    const ic = e.indexOf(c);
    const x = e[(ic + 1) % 3]!;
    const y = e[(ic + 2) % 3]!;
    if (pruefen) {
      if (laengeVon(c, d) >= laengeVon(a, b)) return false;
      const alt1 = norm(flaechenNormale(t1));
      const alt2 = norm(flaechenNormale(t2));
      const nn = (p: number, q: number, r: number) => {
        const P = lage(p);
        const Q = lage(q);
        const R = lage(r);
        const pq = { x: Q.x - P.x, y: Q.y - P.y, z: Q.z - P.z };
        const pr = { x: R.x - P.x, y: R.y - P.y, z: R.z - P.z };
        return norm({ x: pq.y * pr.z - pq.z * pr.y, y: pq.z * pr.x - pq.x * pr.z, z: pq.x * pr.y - pq.y * pr.x });
      };
      const n1 = nn(x, d, c);
      const n2 = nn(y, c, d);
      const dot = (u: V3, w: V3) => u.x * w.x + u.y * w.y + u.z * w.z;
      if (dot(n1, n2) < dot(alt1, alt2) - 1e-3 || dot(n1, alt1) < 0.5 || dot(n2, alt2) < 0.5) return false;
    }
    weg(a, b, t1);
    weg(a, b, t2);
    weg(y, c, t1);
    weg(x, d, t2);
    tri[3 * t1] = x;
    tri[3 * t1 + 1] = d;
    tri[3 * t1 + 2] = c;
    tri[3 * t2] = y;
    tri[3 * t2 + 1] = c;
    tri[3 * t2 + 2] = d;
    dazu(x, d, t1);
    dazu(c, d, t1);
    dazu(y, c, t2);
    dazu(c, d, t2);
    wertigkeit[a]!--;
    wertigkeit[b]!--;
    wertigkeit[c]!++;
    wertigkeit[d]!++;
    return true;
  };
  let gedreht = 0;
  for (let runde = 0; runde < (opt.drehen === false ? 0 : 3); runde++) {
    let diesmal = 0;
    for (const k of [...kanten.keys()]) {
      const a = Math.floor(k / KEY);
      const b = k % KEY;
      const f = drehbar(a, b);
      if (!f || !besser(a, b, f.c, f.d)) continue;
      const sa = spiegel[a]!;
      const sb = spiegel[b]!;
      if (sa < 0 || sb < 0) continue;
      const selbst = schluessel(sa, sb) === k;
      if (selbst) {
        // die Gegenpunkte sind dann Spiegelbilder, die neue Kante liegt wieder spiegelgleich
        if (spiegel[f.c] !== f.d) continue;
        if (drehen(a, b, f, true)) diesmal++;
        continue;
      }
      const g = drehbar(sa, sb);
      // das Spiegelbild muss dieselben (gespiegelten) Gegenpunkte haben und darf kein Dreieck mit dieser Kante teilen
      const gegen = g && ((g.c === spiegel[f.c] && g.d === spiegel[f.d]) || (g.c === spiegel[f.d] && g.d === spiegel[f.c]));
      if (!g || !gegen || g.t1 === f.t1 || g.t1 === f.t2 || g.t2 === f.t1 || g.t2 === f.t2) continue;
      if (schluessel(g.c, g.d) === schluessel(f.c, f.d)) continue;
      if (!drehen(a, b, f, true)) continue;
      if (!drehen(sa, sb, g, false)) continue;
      diesmal += 2;
    }
    gedreht += diesmal;
    if (diesmal === 0) break;
  }

  // neue Punkte (nicht auf Loops) in der Fläche entspannen: halber Weg zur Mitte ihrer Nachbarn, nur längs der Fläche
  const aufKette = new Set<number>();
  ketten.forEach((k) => k?.forEach((v) => {
    aufKette.add(v);
    if (spiegel[v]! >= 0) aufKette.add(spiegel[v]!);
  }));
  const nachbarn: number[][] = Array.from({ length: pos.length / 3 }, () => []);
  for (const k of kanten.keys()) {
    const a = Math.floor(k / KEY);
    const b = k % KEY;
    nachbarn[a]!.push(b);
    nachbarn[b]!.push(a);
  }
  for (let it = 0; it < (opt.entspannen === false ? 0 : 2); it++) {
    const nor = punktNormalen();
    const neuPos = pos.slice();
    for (let v = neu0; v < pos.length / 3; v++) {
      if (aufKette.has(v) || spiegel[v]! < v) continue;
      const nb = nachbarn[v]!;
      const c = { x: 0, y: 0, z: 0 };
      for (const w of nb) {
        c.x += pos[3 * w]! / nb.length;
        c.y += pos[3 * w + 1]! / nb.length;
        c.z += pos[3 * w + 2]! / nb.length;
      }
      const d = { x: 0.5 * (c.x - pos[3 * v]!), y: 0.5 * (c.y - pos[3 * v + 1]!), z: 0.5 * (c.z - pos[3 * v + 2]!) };
      const dn = d.x * nor[3 * v]! + d.y * nor[3 * v + 1]! + d.z * nor[3 * v + 2]!;
      neuPos[3 * v] = pos[3 * v]! + d.x - dn * nor[3 * v]!;
      neuPos[3 * v + 1] = pos[3 * v + 1]! + d.y - dn * nor[3 * v + 1]!;
      neuPos[3 * v + 2] = spiegel[v] === v ? 0 : pos[3 * v + 2]! + d.z - dn * nor[3 * v + 2]!;
      const sv = spiegel[v]!;
      if (sv !== v) {
        neuPos[3 * sv] = neuPos[3 * v]!;
        neuPos[3 * sv + 1] = neuPos[3 * v + 1]!;
        neuPos[3 * sv + 2] = -neuPos[3 * v + 2]!;
      }
    }
    for (let i = 0; i < pos.length; i++) pos[i] = neuPos[i]!;
  }

  const haut = hautAus(pos, tri);
  const neueLoops = loops.map((l, li) => {
    const k = ketten[li];
    if (!k) return { ...l, punkte: l.punkte.map((p) => ({ ...p })) };
    const ruhe = new Float64Array(3 * k.length);
    k.forEach((v, j) => {
      ruhe[3 * j] = pos[3 * v]!;
      ruhe[3 * j + 1] = pos[3 * v + 1]!;
      ruhe[3 * j + 2] = l.art === 'mitte' ? 0 : pos[3 * v + 2]!;
    });
    if (l.art === 'ring') {
      ruhe[2] = 0;
      ruhe[3 * k.length - 1] = 0;
    }
    return { ...l, proben: k.map(punktProbe), s: Float64Array.from(sWerte[li]!), ruhe, punkte: l.punkte.map((p) => ({ ...p })) };
  });
  return { haut, loops: neueLoops, neu, gedreht };
}
