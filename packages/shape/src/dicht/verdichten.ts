// Form zuerst (05.11.2026), das Netz verdichtet sich selbst (Florian: „Sollte das Mesh nicht dynamisch verdichten, dass immer
// genug Polygone für eine runde Form da sind?“). Das Netz entsteht einmal aus der Startkugel und wird danach nur verformt; zieht man
// einen Kopf heraus, werden seine Dreiecke vielfach so lang (Umriss eckig, Flächen flach). Deshalb nach einem Zug, wie in Sculptris:
// jede Kante, die länger als `maxKante` geworden ist, wird geteilt (die längsten zuerst, je mit ihrem Spiegelbild), danach werden
// Kanten gedreht, wo das die Zahl der Nachbarn näher an 6 bringt, und die neuen Punkte in der Fläche entspannt.
//
// Neue Punkte liegen nicht auf der Sehne, sondern auf der runden Fläche durch die Enden: auf einem Loop nach der Kurve längs des
// Loops auf ihrem Bézier-Pfad (ohne Griffe Catmull–Rom nach der Stelle s), sonst auf der kubischen Kurve, die die Normalen der Enden vorgeben (wie PN-Dreiecke; an einer
// Kugel genau der Bogen bis auf die vierte Ordnung); an einem harten Loop zählt die Normale der Seite, auf der die Kante liegt.
// Loops bleiben Ketten von Kanten (eine geteilte Kante eines Loops bekommt den neuen Punkt in die Kette), ihre Punkte bleiben.
//
// Genauigkeit (08.11.2026, Florian mit Bild: „warum es ungenau und eckig wird, wenn ich kleine Details rausziehe … Die Linie wird ganz
// kantig“): Mit `genau` löst das Netz die Linien auf eine feste Abweichung auf, wie beim adaptiven Neuvernetzen (Dunyach u. a. 2013):
// Eine Kante einer Linie wird geteilt, wo die Linie zwischen ihren Proben weiter als `genau` von der Sehne abweicht (enthält die Kante
// einen Punkt der Linie, an ihm, sonst in der Mitte); zusammengelegt wird nur, wo die neue Kante höchstens halb so weit abweicht (oder
// nicht weiter als die zwei, die sie ersetzt). Gemessen an einem Ohr aus dem senkrechten Ring (Bild): Die Proben lagen bis 13,6
// auseinander, die Linie schnitt ihre Kurve um 1,02 ab. Mit `genauHaut` (Versuch) ebenso die Haut, wo die Fläche zwischen den Enden einer
// Kante weiter abweicht (Länge × Drehung der Normale / 8; die unberührte Startkugel höchstens 0,16), nicht in Falten: am Ohr rund,
// aber weite Züge wurden schlechter (siehe `kurven.html`, `GENAU_HAUT`).
//
// Flache Dreiecke (10.11.2026, G5): Gemessen blieben an den Linien Dreiecke ohne Fläche stehen (drei aufeinanderfolgende Punkte einer
// Linie als Dreieck, kleinster Winkel 0,01 bis 1°, der mittlere Punkt mit nur drei Nachbarn; 14 bis 28 je Probeform). Sie entstehen beim
// Zusammenlegen (im Kern nachgestellt, `netz/m8-ohren.ts`: nur dort, nicht beim Teilen oder Drehen): Schneidet eine Linie eine Ecke knapp
// ab, hat der abgeschnittene Punkt kurze Kanten zu drei aufeinanderfolgenden Punkten der Linie; fällt er in den ersten oder letzten, spannt
// sein Dreieck danach die drei Punkte der Linie auf. Der Test „kippt um mehr als 60°“ sieht das nicht (ein Dreieck ohne Fläche hat keine
// verlässliche Normale). Deshalb: (1) Zusammenlegen und Drehen lassen kein Dreieck flach werden (kleinster Winkel unter `FLACH` und dabei
// mehr als halbiert), (2) vorhandene flache Dreiecke werden aufgelöst, indem ihre lange Kante gedreht wird (beides Option `flachSchutz`), (3) gleich nach dem
// Einsetzen eines Loops fallen Punkte der Linie, die fast aufeinander liegen, zusammen (`nadelnZusammenlegen`).

import { type Haut, type V3, hautAus } from './kurven';
import { type Loop, type Probe, hatPfad, kanteBei, pfadBei } from './loops';

const KEY = 2 ** 22;
const schluessel = (a: number, b: number): number => (a < b ? a * KEY + b : b * KEY + a);
const punktProbe = (w: number): Probe => ({ ecken: [w, w, w], b: [1, 0, 0] });

/**
 * `alt`: je Punkt der neuen Haut seine Nummer in der alten (−1: neu). Die alten Punkte, die bleiben, stehen vorn in ihrer
 * Reihenfolge, die neuen dahinter: Werte je Punkt (Blendshape, Knochenwinkel) lassen sich so übertragen und für die neuen ergänzen.
 */
export type Verdichtet = {
  haut: Haut;
  loops: Loop[];
  neu: number;
  gelegt: number;
  gedreht: number;
  /** flache Dreiecke, die durch Drehen ihrer langen Kante aufgelöst wurden */
  geloest: number;
  verborgen: Uint8Array | null;
  alt: Int32Array;
};

/** unter diesem kleinsten Winkel (Grad) gilt ein Dreieck als flach */
const FLACH = 10;

/**
 * Teilt alle Kanten länger als `maxKante` (spiegelgleich, höchstens `runden` Durchgänge), dreht danach Kanten zur Wertigkeit 6 und
 * entspannt die neuen Punkte. Ergebnis: neue Haut und Loops (Reihenfolge wie vorher), null, wenn keine Kante zu lang war.
 *
 * Mit `winkel` (Grad) wird auch geteilt, wo sich die Fläche über eine Kante stärker dreht (Winkel zwischen den Normalen ihrer
 * Enden, an harten Loops die Normale der Seite), solange die Kante länger als `minKante` ist: Ein schmaler Lappen oder eine
 * Spitze hat kurze, aber stark gedrehte Kanten, der Umriss dort war eckig (Florian: „das mit dem Verdichten klappt bei Details
 * noch nicht“). Ein Kreis bekommt so mindestens 360°/`winkel` Kanten.
 *
 * `verborgen` (je Dreieck 1: wird nicht gezeigt, etwa die Öffnung des Mauls): Kanten, an denen nur verborgene Dreiecke liegen,
 * werden nicht geteilt, und was aus einem verborgenen Dreieck entsteht, bleibt verborgen (Ergebnis `verborgen`). Sonst verdichtete
 * sich in der Fressen-Pose die Fläche, die das offene Maul überspannt (gemessen 2 300 neue Punkte nach einem Zug an der Lippe).
 *
 * Mit `kurz` werden nach dem Teilen Kanten kürzer als `kurz` zusammengelegt (Florian: „Ja, Kanten zusammenlegen“): Wo die Haut
 * gestaucht wurde, liegen die Punkte quer zur Stauchung dicht, die Dreiecke werden schmal, und ihr Ring um einen Punkt sieht nur
 * noch eine Richtung. Ein Punkt der Kante fällt weg, der andere bleibt, wo er ist (die Form ändert sich nur um die Sehne); spiegel-
 * gleich mit seinem Spiegelbild. Kreuzungen, Punkte der Loops, die Enden der Ringe und Ecken verborgener Dreiecke bleiben; auf einer
 * Kette fällt ein Punkt nur längs der Kette weg (in seinen Nachbarn auf derselben Kette) und nur, wo das Stück kürzer als
 * `kurzKette` ist (Standard ½ `kurz`): Die Proben einer Kette sind die Linie, an ihnen werden die Griffe abgelesen (mit allen
 * Ketten unter `kurz` blieben einer Augenform 30 von 57 Proben, der Griff am Punkt las 23° Knick statt 2°; ohne Ketten blieben
 * schmale Dreiecke an den Linien, Schnabel 8 statt 0 Knicke über 60°). Nicht, wo das Netz dabei nicht mehr geschlossen wäre
 * (Verbindungsbedingung), Dreiecke um mehr als 60° kippten oder Kanten länger als `maxKante` würden.
 *
 * Mit `genau` (Abweichung in Welteinheiten) wird auch geteilt, wo das Netz eine Linie ungenauer wiedergibt, mit `genauHaut` auch die
 * runde Fläche (siehe Kopf der Datei), bis hinunter zu `minKante` (Standard 1/16 `maxKante`); zusammengelegt wird dann nur, was danach
 * höchstens `genau`/2 abweicht.
 */
export function verdichten(
  h: Haut,
  loops: readonly Loop[],
  maxKante: number,
  opt: {
    runden?: number;
    drehen?: boolean;
    entspannen?: boolean;
    winkel?: number;
    minKante?: number;
    verborgen?: Uint8Array | null;
    kurz?: number;
    kurzKette?: number;
    genau?: number;
    genauHaut?: boolean;
    /** kein Dreieck flach werden lassen und vorhandene flache auflösen (Standard an; `false`: wie bis zum 10.11.) */
    flachSchutz?: boolean;
    /** zusammengelegt werden nur Kanten mit einem Ende auf einer Linie (nach dem Einsetzen eines Loops) */
    nurKetten?: boolean;
  } = {},
): Verdichtet | null {
  const runden = opt.runden ?? 8;
  const pos: number[] = Array.from(h.pos);
  const tri: number[] = Array.from(h.tri);
  const spiegel: number[] = Array.from(h.spiegel);
  const verborgen: number[] | null = opt.verborgen ? Array.from(opt.verborgen) : null;
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
  /** kleinster Winkel des Dreiecks in Grad (er liegt der kürzesten Seite gegenüber) */
  const kleinsterWinkel = (A: V3, B: V3, C: V3): number => {
    const a = Math.hypot(B.x - C.x, B.y - C.y, B.z - C.z);
    const b = Math.hypot(C.x - A.x, C.y - A.y, C.z - A.z);
    const c = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z);
    const [k, m1, m2] = a <= b && a <= c ? [a, b, c] : b <= c ? [b, c, a] : [c, a, b];
    if (!(m1 > 0 && m2 > 0)) return 0;
    return (Math.acos(Math.max(-1, Math.min(1, (m1 * m1 + m2 * m2 - k * k) / (2 * m1 * m2)))) * 180) / Math.PI;
  };
  const winkelVon = (t: number): number => kleinsterWinkel(lage(tri[3 * t]!), lage(tri[3 * t + 1]!), lage(tri[3 * t + 2]!));
  const flachSchutz = opt.flachSchutz !== false;

  // Ketten der eingesetzten Loops (die gespeicherte Hälfte; die andere ist ihr Spiegelbild im Netz), harte Punkte
  const ketten = loops.map((l) => (l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]) ? l.proben.map((p) => p.ecken[0]) : null));
  const sWerte = loops.map((l) => Array.from(l.s));
  const hart = new Set<number>();
  loops.forEach((l, li) => {
    const k = ketten[li];
    if (!k) return;
    const hd = kanteBei(l, loops);
    k.forEach((v, j) => {
      if (!hd[j]) return;
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

  /**
   * Stelle i der Kette eines Loops mit ihrem s: geschlossen ringsum (über das Ende hinaus um die Länge weiter), hinter den Enden eines
   * Rings das Spiegelbild des inneren Nachbarn
   */
  const kettenStelle = (li: number, i: number): { p: V3; s: number } => {
    const k = ketten[li]!;
    const s = sWerte[li]!;
    const l = loops[li]!;
    const m = k.length;
    const L = l.laenge;
    const spiegelLage = (v: number) => ({ ...lage(v), z: -pos[3 * v + 2]! });
    if (l.art !== 'ring') {
      const w = ((i % m) + m) % m;
      return { p: lage(k[w]!), s: s[w]! + Math.floor(i / m) * L };
    }
    if (i < 0) return { p: spiegelLage(k[-i]!), s: -s[-i]! };
    if (i >= m) return { p: spiegelLage(k[2 * (m - 1) - i]!), s: 2 * L - s[2 * (m - 1) - i]! };
    return { p: lage(k[i]!), s: s[i]! };
  };
  /** Pfad an der Stelle s (geschlossen über das Ende hinaus gezählt) */
  const pfadAn = (l: Loop, s: number): V3 | null => pfadBei(l, l.art !== 'ring' && s >= l.laenge ? s - l.laenge : s);
  /**
   * Lage der Linie zwischen den Stellen A und B ihrer Kette beim Anteil f der Stelle s: ihr Bézier-Pfad dort, dazu der Abstand der
   * Linie von ihrem Pfad (beim Anlegen klein und gleichmäßig, ein Zug ändert ihn nicht), zwischen den Enden linear; null ohne Pfad
   */
  const linieBei = (l: Loop, A: { p: V3; s: number }, B: { p: V3; s: number }, f: number): V3 | null => {
    const pa = pfadAn(l, A.s);
    const pb = pfadAn(l, B.s);
    const pm = pfadAn(l, A.s + f * (B.s - A.s));
    if (!pa || !pb || !pm) return null;
    return {
      x: pm.x + (1 - f) * (A.p.x - pa.x) + f * (B.p.x - pb.x),
      y: pm.y + (1 - f) * (A.p.y - pa.y) + f * (B.p.y - pb.y),
      z: pm.z + (1 - f) * (A.p.z - pa.z) + f * (B.p.z - pb.z),
    };
  };
  /** Abstand von q zur Strecke a–b */
  const zurStrecke = (q: V3, a: V3, b: V3): number => {
    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const dd = d.x * d.x + d.y * d.y + d.z * d.z || 1;
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * d.x + (q.y - a.y) * d.y + (q.z - a.z) * d.z) / dd));
    return Math.hypot(q.x - a.x - t * d.x, q.y - a.y - t * d.y, q.z - a.z - t * d.z);
  };
  /** wie weit die Linie zwischen den Stellen i0 < i1 ihrer Kette von der Sehne abweicht (an sieben Stellen); 0 ohne Pfad */
  const sehnenAbweichung = (li: number, i0: number, i1: number): number => {
    const l = loops[li]!;
    if (!hatPfad(l)) return 0;
    const A = kettenStelle(li, i0);
    const B = kettenStelle(li, i1);
    let m = 0;
    for (let i = 1; i < 8; i++) {
      const q = linieBei(l, A, B, i / 8);
      if (!q) return 0;
      m = Math.max(m, zurStrecke(q, A.p, B.p));
    }
    return m;
  };
  /**
   * Wo eine Kante j der Kette geteilt wird: an einem Punkt des Loops in ihrem Inneren (eine Ecke liegt dann genau auf dem Netz; der der
   * Mitte nächste, nicht im äußeren Zehntel), sonst in der Mitte von s
   */
  const teilStelle = (li: number, j: number): number => {
    const l = loops[li]!;
    const A = kettenStelle(li, j);
    const B = kettenStelle(li, j + 1);
    const h = B.s - A.s;
    const mitte = (A.s + B.s) / 2;
    let best: number | null = null;
    for (const p of l.punkte)
      for (const s of l.art !== 'ring' ? [p.s, p.s + l.laenge] : [p.s]) {
        if (s <= A.s + 0.1 * h || s >= B.s - 0.1 * h) continue;
        if (best === null || Math.abs(s - mitte) < Math.abs(best - mitte)) best = s;
      }
    return best ?? mitte;
  };
  /**
   * neuer Punkt auf der Kante j der Kette eines Loops an der Stelle s (Standard: Mitte). Mit gespeicherten Griffen genau auf dem
   * Bézier-Stück samt dem Abstand der Linie von ihrem Pfad (`linieBei`); sonst Catmull–Rom nach s (in der Mitte). Florian, 06.11.:
   * „rausziehen und wieder zurücksetzen ist nicht gleich“ — nach Sehnenlänge lag ein neuer Punkt nach einem weiten Zug neben seiner
   * Stelle (Welle 0,38 nach 220 hinaus und zurück, ohne Verdichten 0,07); Catmull–Rom nach s trifft dort, wo der Zug im Stück
   * quadratisch anwächst (neben dem festen Nachbarpunkt), um 0,67 daneben (nachgerechnet und gemessen 0,65).
   */
  const aufLoop = (li: number, j: number, s?: number): V3 => {
    const l = loops[li]!;
    const A = kettenStelle(li, j);
    const B = kettenStelle(li, j + 1);
    const f = s === undefined || !(B.s > A.s) ? 0.5 : (s - A.s) / (B.s - A.s);
    const q = linieBei(l, A, B, f);
    if (q) {
      // Liegt die Linie an beiden Enden (fast) auf ihrem Pfad, kommt der neue Punkt genau auf den Pfad: Begrenzt auf ¼ der Sehne lag er an
      // einer Ecke neben ihr, die Linie wurde danach neu vermessen, zwei Proben fielen auf die Ecke (doppelter Punkt, Stift-Probe: 3
      // umgeklappte Dreiecke); sonst (in der Pose) wie bisher höchstens ¼ der Sehne neben ihr
      const sehne = Math.hypot(B.p.x - A.p.x, B.p.y - A.p.y, B.p.z - A.p.z);
      const pa = pfadAn(l, A.s)!;
      const pb = pfadAn(l, B.s)!;
      if (Math.max(Math.hypot(A.p.x - pa.x, A.p.y - pa.y, A.p.z - pa.z), Math.hypot(B.p.x - pb.x, B.p.y - pb.y, B.p.z - pb.z)) <= 0.1 * sehne) return q;
      const c = { x: A.p.x + f * (B.p.x - A.p.x), y: A.p.y + f * (B.p.y - A.p.y), z: A.p.z + f * (B.p.z - A.p.z) };
      return begrenzt(A.p, B.p, f, { x: q.x - c.x, y: q.y - c.y, z: q.z - c.z });
    }
    const P = kettenStelle(li, j - 1);
    const Q = kettenStelle(li, j + 2);
    const dp = B.s - P.s || 1;
    const dq = Q.s - A.s || 1;
    const h = B.s - A.s;
    const ma = { x: (B.p.x - P.p.x) / dp, y: (B.p.y - P.p.y) / dp, z: (B.p.z - P.p.z) / dp };
    const mb = { x: (Q.p.x - A.p.x) / dq, y: (Q.p.y - A.p.y) / dq, z: (Q.p.z - A.p.z) / dq };
    return begrenzt(A.p, B.p, 0.5, { x: (h * (ma.x - mb.x)) / 8, y: (h * (ma.y - mb.y)) / 8, z: (h * (ma.z - mb.z)) / 8 });
  };
  /** Punkt der Sehne beim Anteil f plus Versatz, der Versatz höchstens ¼ der Sehne */
  const begrenzt = (a: V3, b: V3, f: number, d: V3): V3 => {
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const ld = Math.hypot(d.x, d.y, d.z);
    const g = ld > 0.25 * L ? (0.25 * L) / ld : 1;
    return { x: a.x + f * (b.x - a.x) + g * d.x, y: a.y + f * (b.y - a.y) + g * d.y, z: a.z + f * (b.z - a.z) + g * d.z };
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
    return begrenzt(pa, pb, 0.5, { x: -(wa * na.x + wb * nb.x) / 8, y: -(wa * na.y + wb * nb.y) / 8, z: -(wa * na.z + wb * nb.z) / 8 });
  };
  /** weggefallene Dreiecke (beim Zusammenlegen; ihre Ecken stehen noch in `tri`) */
  let totT: Uint8Array | null = null;
  const punktNormalen = (): Float64Array => {
    const nor = new Float64Array(pos.length);
    for (let t = 0; t < tri.length / 3; t++) {
      if (totT && totT[t]) continue;
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
      if (verborgen) verborgen.push(verborgen[t]!);
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
      if (verborgen) verborgen.push(verborgen[tq]!, verborgen[tp]!);
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
  /**
   * einen neuen Punkt in die Kette eines Loops nach Stelle j setzen, an der Stelle `stelle` (Standard: Mitte); liegt sie auf dem
   * Schlussstück eines geschlossenen Loops hinter seinem Ende, kommt er an den Anfang (s − Länge)
   */
  const inKette = (li: number, j: number, v: number, stelle?: number) => {
    const k = ketten[li]!;
    const s = sWerte[li]!;
    const l = loops[li]!;
    const x = stelle ?? (kettenStelle(li, j).s + kettenStelle(li, j + 1).s) / 2;
    if (l.art !== 'ring' && x >= l.laenge) {
      k.unshift(v);
      s.unshift(x - l.laenge);
      return;
    }
    k.splice(j + 1, 0, v);
    s.splice(j + 1, 0, x);
  };

  /** Winkel zwischen den Normalen der Enden einer Kante (cos), an harten Loops die Normale der Seite der Kante */
  const drehungCos = (a: number, b: number, nor: Float64Array): number => {
    const ha = hart.has(a);
    const hb = hart.has(b);
    let seite: V3 | null = null;
    if (ha || hb)
      seite = norm(
        (kanten.get(schluessel(a, b)) ?? []).reduce(
          (s, t) => {
            const n = norm(flaechenNormale(t));
            return { x: s.x + n.x, y: s.y + n.y, z: s.z + n.z };
          },
          { x: 0, y: 0, z: 0 },
        ),
      );
    const na = ha ? seite! : { x: nor[3 * a]!, y: nor[3 * a + 1]!, z: nor[3 * a + 2]! };
    const nb = hb ? seite! : { x: nor[3 * b]!, y: nor[3 * b + 1]!, z: nor[3 * b + 2]! };
    return na.x * nb.x + na.y * nb.y + na.z * nb.z;
  };
  const cosMax = opt.winkel !== undefined ? Math.cos((opt.winkel * Math.PI) / 180) : 2;
  const genau = opt.genau;
  const minKante = opt.minKante ?? (genau !== undefined ? maxKante / 16 : 0);
  /** wie weit die Fläche zwischen den Enden einer Kante von ihr abweicht (Bogen: Länge × Drehung der Normale / 8) */
  const bogen = (a: number, b: number, nor: Float64Array): number =>
    (laengeVon(a, b) * Math.acos(Math.max(-1, Math.min(1, drehungCos(a, b, nor))))) / 8;
  /**
   * Punkte in einer Falte: Ein Dreieck an ihnen zeigt gegen ihre Normale (umgeklappt). Dort sagt die Drehung der Normale nichts über eine
   * runde Fläche, feiner wird es dort nicht, und das Zusammenlegen bleibt, wie es war. Gemessen am Überhang (Fall a der Explosionsprobe):
   * Die Falte an der Schnabelspitze (34 Knicke über 60°, 8 umgeklappt) wurde sonst immer feiner geteilt und beim Setzen größer (1 724 /
   * 784, 9 629 statt 6 717 Punkte).
   */
  const gefaltet = (nor: Float64Array): Uint8Array => {
    const g = new Uint8Array(pos.length / 3);
    for (let t = 0; t < tri.length / 3; t++) {
      if (totT && totT[t]) continue;
      const n = flaechenNormale(t);
      for (let e = 0; e < 3; e++) {
        const v = tri[3 * t + e]!;
        if (n.x * nor[3 * v]! + n.y * nor[3 * v + 1]! + n.z * nor[3 * v + 2]! < 0) g[v] = 1;
      }
    }
    return g;
  };

  const neu0 = pos.length / 3;
  for (let runde = 0; runde < runden; runde++) {
    // `stelle`: wo eine Kante einer Linie geteilt wird (s der Linie)
    const lang: { a: number; b: number; l: number; stelle?: number }[] = [];
    const nor = punktNormalen();
    const falte = genau !== undefined && opt.genauHaut === true ? gefaltet(nor) : null;
    // mit Genauigkeit: die Kanten der Linien (samt Spiegelbild) nach der Linie
    const kettenKanten = new Set<number>();
    if (genau !== undefined)
      ketten.forEach((k, li) => {
        if (!k || !hatPfad(loops[li]!)) return;
        const zu = loops[li]!.art !== 'ring';
        for (let j = 0; j < (zu ? k.length : k.length - 1); j++) {
          const a = k[j]!;
          const b = k[(j + 1) % k.length]!;
          const sl = schluessel(a, b);
          kettenKanten.add(sl);
          if (spiegel[a]! >= 0 && spiegel[b]! >= 0) kettenKanten.add(schluessel(spiegel[a]!, spiegel[b]!));
          if (verborgen && (kanten.get(sl) ?? []).every((t) => verborgen[t] === 1)) continue;
          const l = laengeVon(a, b);
          if (l > maxKante || (l > minKante && sehnenAbweichung(li, j, j + 1) > genau)) lang.push({ a, b, l, stelle: teilStelle(li, j) });
        }
      });
    for (const k of kanten.keys()) {
      if (kettenKanten.has(k)) continue;
      const a = Math.floor(k / KEY);
      const b = k % KEY;
      if (verborgen && kanten.get(k)!.every((t) => verborgen[t] === 1)) continue;
      const l = laengeVon(a, b);
      if (
        l > maxKante ||
        (cosMax <= 1 && l > minKante && drehungCos(a, b, nor) < cosMax) ||
        (falte !== null && l > minKante && !falte[a] && !falte[b] && drehungCos(a, b, nor) > 0 && bogen(a, b, nor) > genau!)
      )
        lang.push({ a, b, l });
    }
    if (lang.length === 0) break;
    lang.sort((p, q) => q.l - p.l);
    for (const { a, b, stelle } of lang) {
      if (!kanten.has(schluessel(a, b))) continue;
      const sa = spiegel[a]!;
      const sb = spiegel[b]!;
      if (sa < 0 || sb < 0 || !kanten.has(schluessel(sa, sb))) continue;
      const selbst = schluessel(sa, sb) === schluessel(a, b);
      // auf einem Loop (die gespeicherte Hälfte oder ihr Spiegelbild) nach der Kurve des Loops, sonst nach den Normalen
      const hier = kettenKante(a, b);
      const dort = selbst ? null : kettenKante(sa, sb);
      let m: V3;
      if (hier) m = aufLoop(hier.li, hier.j, stelle);
      else if (dort) {
        const q = aufLoop(dort.li, dort.j, stelle);
        m = { ...q, z: -q.z };
      } else m = inFlaeche(a, b, nor);
      if (selbst) m.z = 0;
      const v = teilen(a, b, m);
      if (hier) inKette(hier.li, hier.j, v, stelle);
      if (selbst) {
        spiegel[v] = v;
        continue;
      }
      const v2 = teilen(sa, sb, { x: m.x, y: m.y, z: -m.z });
      spiegel[v] = v2;
      spiegel[v2] = v;
      if (dort) inKette(dort.li, dort.j, v2, stelle);
      mitteFuellen(v, v2);
    }
  }
  const neu = pos.length / 3 - neu0;

  // Zusammenlegen: Kanten kürzer als `kurz`, die kürzesten zuerst; ein Punkt fällt weg (`tot`, in `ersatz` gelegt)
  const nGesamt = pos.length / 3;
  const tot = new Uint8Array(nGesamt);
  const ersatz = new Int32Array(nGesamt).fill(-1);
  /** Punkte, in die gelegt wurde (werden mit den neuen entspannt) */
  const gelegtIn = new Set<number>();
  let gelegt = 0;
  const kurz = opt.kurz ?? 0;
  const kurzKette = Math.min(kurz, opt.kurzKette ?? kurz / 2);
  if (kurz > 0) {
    totT = new Uint8Array(tri.length / 3);
    const tT = totT;
    // mit Genauigkeit: Normalen vor dem Zusammenlegen (die Lagen ändern sich dabei nicht), Punkte in Falten
    const norK = genau !== undefined && opt.genauHaut === true ? punktNormalen() : null;
    const falteK = norK ? gefaltet(norK) : null;
    const umT: number[][] = Array.from({ length: nGesamt }, () => []);
    for (let t = 0; t < tri.length / 3; t++) for (let e = 0; e < 3; e++) umT[tri[3 * t + e]!]!.push(t);
    // je Punkt die Ketten, auf denen er liegt: li (gespeicherte Hälfte) oder −1 − li (ihr Spiegelbild)
    const aufKetten = new Map<number, number[]>();
    const eintragen = (v: number, code: number) => {
      const l = aufKetten.get(v);
      if (l) l.push(code);
      else aufKetten.set(v, [code]);
    };
    ketten.forEach((k, li) =>
      k?.forEach((v) => {
        eintragen(v, li);
        if (spiegel[v]! >= 0 && spiegel[v] !== v) eintragen(spiegel[v]!, -1 - li);
      }),
    );
    // was bleiben muss: Kreuzungen, je Punkt eines Loops die nächste Probe, Enden der Ringe, Ecken der Proben nicht eingesetzter
    // Loops, Ecken verborgener Dreiecke, Punkte ohne Spiegelbild
    const fest = new Uint8Array(nGesamt);
    const festMitSpiegel = (v: number) => {
      fest[v] = 1;
      if (spiegel[v]! >= 0) fest[spiegel[v]!] = 1;
    };
    for (const [v, l] of aufKetten) if (l.length > 1) fest[v] = 1;
    loops.forEach((l, li) => {
      const k = ketten[li];
      if (!k) {
        for (const p of l.proben) for (const v of p.ecken) festMitSpiegel(v);
        return;
      }
      const s = sWerte[li]!;
      const zu = l.art !== 'ring';
      if (!zu) {
        festMitSpiegel(k[0]!);
        festMitSpiegel(k[k.length - 1]!);
      }
      for (const p of l.punkte) {
        const ab = (j: number) => {
          const d = Math.abs(s[j]! - p.s);
          return zu ? Math.min(d, l.laenge - d) : d;
        };
        let best = 0;
        for (let j = 1; j < s.length; j++) if (ab(j) < ab(best)) best = j;
        festMitSpiegel(k[best]!);
      }
    });
    if (verborgen) for (let t = 0; t < tri.length / 3; t++) if (verborgen[t]) for (let e = 0; e < 3; e++) fest[tri[3 * t + e]!] = 1;
    for (let v = 0; v < nGesamt; v++) if (spiegel[v]! < 0) fest[v] = 1;

    const ecken3 = (t: number): [number, number, number] => [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
    const nachbarnVon = (v: number): Set<number> => {
      const s = new Set<number>();
      for (const t of umT[v]!) for (let e = 0; e < 3; e++) if (tri[3 * t + e] !== v) s.add(tri[3 * t + e]!);
      return s;
    };
    const austragen = (t: number) => {
      const [a, b, c] = ecken3(t);
      weg(a, b, t);
      weg(b, c, t);
      weg(c, a, t);
      for (const v of [a, b, c]) {
        const l = umT[v]!;
        const i = l.indexOf(t);
        if (i >= 0) l.splice(i, 1);
      }
    };
    const eintragenT = (t: number) => {
      const [a, b, c] = ecken3(t);
      dazu(a, b, t);
      dazu(b, c, t);
      dazu(c, a, t);
      for (const v of [a, b, c]) umT[v]!.push(t);
    };
    // Journal, damit das Spiegelbild eines Zusammenlegens zurückgenommen werden kann, wenn es selbst nicht geht
    const journal: { t: number; alt: [number, number, number]; lebte: boolean }[] = [];
    const setzen = (t: number, neuE: [number, number, number] | null) => {
      journal.push({ t, alt: ecken3(t), lebte: !tT[t] });
      if (!tT[t]) austragen(t);
      if (!neuE) {
        tT[t] = 1;
        return;
      }
      tri[3 * t] = neuE[0];
      tri[3 * t + 1] = neuE[1];
      tri[3 * t + 2] = neuE[2];
      tT[t] = 0;
      eintragenT(t);
    };
    const zuruecknehmen = () => {
      while (journal.length) {
        const j = journal.pop()!;
        if (!tT[j.t]) austragen(j.t);
        tri[3 * j.t] = j.alt[0];
        tri[3 * j.t + 1] = j.alt[1];
        tri[3 * j.t + 2] = j.alt[2];
        tT[j.t] = j.lebte ? 0 : 1;
        if (j.lebte) eintragenT(j.t);
      }
    };
    /** v in q legen (v fällt weg, q bleibt, wo er ist); false (nichts geändert), wenn das Netz nicht geschlossen bliebe, Dreiecke kippten oder Kanten zu lang würden */
    const legen = (v: number, q: number): boolean => {
      const ts = kanten.get(schluessel(v, q));
      if (!ts || ts.length !== 2) return false;
      const c = dritter(ts[0]!, v, q);
      const d = dritter(ts[1]!, v, q);
      if (c < 0 || d < 0 || c === d) return false;
      const nq = nachbarnVon(q);
      let gemeinsam = 0;
      for (const w of nachbarnVon(v)) {
        if (!nq.has(w)) continue;
        if (w !== c && w !== d) return false;
        gemeinsam++;
      }
      if (gemeinsam !== 2 || nachbarnVon(c).size <= 3 || nachbarnVon(d).size <= 3) return false;
      const Q = lage(q);
      for (const t of umT[v]!) {
        if (t === ts[0] || t === ts[1]) continue;
        const e = ecken3(t);
        const n0 = norm(flaechenNormale(t));
        const [A, B, C] = e.map((w) => (w === v ? Q : lage(w))) as [V3, V3, V3];
        const ab = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
        const ac = { x: C.x - A.x, y: C.y - A.y, z: C.z - A.z };
        const n1 = { x: ab.y * ac.z - ab.z * ac.y, y: ab.z * ac.x - ab.x * ac.z, z: ab.x * ac.y - ab.y * ac.x };
        const l1 = Math.hypot(n1.x, n1.y, n1.z);
        if (!(l1 > 1e-12) || (n0.x * n1.x + n0.y * n1.y + n0.z * n1.z) / l1 < 0.5) return false;
        // kein Dreieck flach werden lassen (siehe Kopf der Datei): Ein Punkt neben einer Linie, der in einen ihrer Punkte fiele, spannte
        // sonst drei aufeinanderfolgende Punkte der Linie als Dreieck auf. Was schon flach ist, darf bleiben, wie es ist (Nadeln fallen
        // weiter zusammen).
        if (flachSchutz) {
          const wNeu = kleinsterWinkel(A, B, C);
          if (wNeu < FLACH && wNeu < 0.5 * winkelVon(t)) return false;
        }
        for (const w of e) if (w !== v && laengeVon(q, w) > maxKante) return false;
        if (norK && !falteK![q]) {
          // die neuen Kanten (q, w) weichen höchstens halb so weit von der runden Fläche ab, wie `genau` erlaubt (an harten Punkten die
          // Normale dieses Dreiecks; in einer Falte wie ohne Genauigkeit)
          const nf = { x: n1.x / l1, y: n1.y / l1, z: n1.z / l1 };
          const nAn = (u: number): V3 => (hart.has(u) ? nf : { x: norK[3 * u]!, y: norK[3 * u + 1]!, z: norK[3 * u + 2]! });
          const na = nAn(q);
          for (const w of e) {
            if (w === v || falteK![w]) continue;
            const nb = nAn(w);
            const c = Math.max(-1, Math.min(1, na.x * nb.x + na.y * nb.y + na.z * nb.z));
            if ((laengeVon(q, w) * Math.acos(c)) / 8 > genau! / 2) return false;
          }
        }
      }
      for (const t of [...umT[v]!]) {
        const e = ecken3(t);
        setzen(t, e.includes(q) ? null : (e.map((w) => (w === v ? q : w)) as [number, number, number]));
      }
      return true;
    };
    /** auf einer Kette nur längs der Kette: v und q Nachbarn auf derselben Kette (v auf keiner: in jeden Punkt) */
    const laengsKette = (v: number, q: number): { li: number; j: number } | null | false => {
      const kv = aufKetten.get(v);
      if (!kv) return null;
      if (kv.length !== 1 || laengeVon(v, q) >= kurzKette) return false;
      const code = kv[0]!;
      if (!aufKetten.get(q)?.includes(code)) return false;
      const li = code >= 0 ? code : -1 - code;
      const k = ketten[li]!;
      const j = k.indexOf(code >= 0 ? v : spiegel[v]!);
      const i = k.indexOf(code >= 0 ? q : spiegel[q]!);
      const zu = loops[li]!.art !== 'ring';
      if (!(j >= 0 && i >= 0 && (Math.abs(i - j) === 1 || (zu && Math.abs(i - j) === k.length - 1)))) return false;
      // mit Genauigkeit: die neue Kante (vom anderen Nachbarn von v zu q) weicht höchstens halb so weit von der Linie ab, oder nicht weiter als
      // die zwei, die sie ersetzt (zwei Proben fast an einem Ort, etwa an einer Ecke, fallen so weiter zusammen; sonst blieb dort ein
      // Dreieck ohne Fläche, Stift-Probe)
      if (genau !== undefined) {
        const neu = sehnenAbweichung(li, j - 1, j + 1);
        if (neu > genau / 2 && neu > Math.max(sehnenAbweichung(li, j - 1, j), sehnenAbweichung(li, j, j + 1)) + genau / 10) return false;
      }
      return { li, j };
    };
    /** v in q legen samt Spiegelbild: v auf der Mitte nur in einen Punkt auf der Mitte, nie über die Mitte in sein Spiegelbild */
    const versuchen = (v: number, q: number): boolean => {
      const sv = spiegel[v]!;
      const sq = spiegel[q]!;
      if (sv === v) return sq === q && legen(v, q);
      if (q === sv) return false;
      if (!legen(v, q)) return false;
      if (!legen(sv, sq === q ? q : sq)) {
        zuruecknehmen();
        return false;
      }
      return true;
    };
    const rang = (v: number) => (fest[v] ? 3 : aufKetten.has(v) ? 2 : spiegel[v] === v ? 1 : 0);
    for (let runde = 0; runde < 3; runde++) {
      const kand: { a: number; b: number; l: number }[] = [];
      for (const k of kanten.keys()) {
        const a = Math.floor(k / KEY);
        const b = k % KEY;
        const l = laengeVon(a, b);
        if (l < kurz && (!opt.nurKetten || aufKetten.has(a) || aufKetten.has(b))) kand.push({ a, b, l });
      }
      kand.sort((p, q) => p.l - q.l);
      let diesmal = 0;
      for (const { a, b } of kand) {
        if (tot[a] || tot[b] || !kanten.has(schluessel(a, b)) || laengeVon(a, b) >= kurz) continue;
        // zuerst fällt der unwichtigere weg, bei gleichem Rang der neuere (a < b): der ältere hat in der Pose die genaue Grundform
        const [x, y] = rang(a) < rang(b) ? [a, b] : [b, a];
        for (const [v, q] of [
          [x, y],
          [y, x],
        ] as const) {
          if (fest[v]) continue;
          const k = laengsKette(v, q);
          if (k === false) continue;
          journal.length = 0;
          if (!versuchen(v, q)) continue;
          journal.length = 0;
          const sv = spiegel[v]!;
          const ziel = sv === v || spiegel[q] === q ? q : spiegel[q]!;
          tot[v] = 1;
          ersatz[v] = q;
          if (!fest[q] && !aufKetten.has(q)) gelegtIn.add(q);
          if (sv !== v) {
            tot[sv] = 1;
            ersatz[sv] = ziel;
            if (!fest[ziel] && !aufKetten.has(ziel)) gelegtIn.add(ziel);
          }
          if (k) {
            ketten[k.li]!.splice(k.j, 1);
            sWerte[k.li]!.splice(k.j, 1);
          }
          aufKetten.delete(v);
          aufKetten.delete(sv);
          diesmal++;
          break;
        }
      }
      gelegt += diesmal;
      if (diesmal === 0) break;
    }
  }
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
    if (verborgen && verborgen[ts[0]!] !== verborgen[ts[1]!]) return null;
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
      // kein Dreieck flach werden lassen (wie beim Zusammenlegen): Die neue Kante (c, d) verbände sonst zwei Punkte einer Linie über
      // ihren Nachbarn hinweg
      if (flachSchutz) {
        const wNeu = Math.min(kleinsterWinkel(lage(x), lage(d), lage(c)), kleinsterWinkel(lage(y), lage(c), lage(d)));
        if (wNeu < FLACH && wNeu < 0.5 * Math.min(winkelVon(t1), winkelVon(t2))) return false;
      }
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
  /**
   * Flache Dreiecke auflösen (siehe Kopf der Datei): Ein Dreieck, dessen Ecken fast auf einer Geraden liegen (kleinster Winkel unter
   * `FLACH`/2, ein Winkel über 150°), verliert seine lange Kante; sie wird gedreht, die mittlere Ecke bekommt die Kante zum Gegenpunkt.
   * (Stumpfe Dreiecke, die nicht flach sind, bleiben: Gemessen drehte das sonst beim Verfeinern im Zug jedes Mal 10 bis 14 Kanten.) Nur, wenn die lange Kante nicht
   * zu einer Linie gehört, die zwei neuen Dreiecke besser sind als die alten und auf derselben Seite liegen wie der Nachbar (das
   * flache Dreieck selbst hat keine verlässliche Normale); spiegelgleich mit seinem Spiegelbild.
   */
  let geloest = 0;
  if (flachSchutz) {
    const lebt = (t: number): boolean => !(totT && totT[t]);
    /** die lange Kante (a, b) eines flachen Dreiecks t, sonst null */
    const langeKante = (t: number): [number, number] | null => {
      if (winkelVon(t) >= FLACH / 2) return null;
      const e = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
      for (let k = 0; k < 3; k++) {
        const m = lage(e[k]!);
        const p = lage(e[(k + 1) % 3]!);
        const q = lage(e[(k + 2) % 3]!);
        const u = { x: p.x - m.x, y: p.y - m.y, z: p.z - m.z };
        const w = { x: q.x - m.x, y: q.y - m.y, z: q.z - m.z };
        const lu = Math.hypot(u.x, u.y, u.z);
        const lw = Math.hypot(w.x, w.y, w.z);
        // Winkel an der Ecke k über 150°: Dann liegt sie fast auf der Kante gegenüber
        if (lu > 0 && lw > 0 && (u.x * w.x + u.y * w.y + u.z * w.z) / (lu * lw) < -0.866) return [e[(k + 1) % 3]!, e[(k + 2) % 3]!];
      }
      return null;
    };
    /** Darf die Kante (a, b) gedreht werden, um ein flaches Dreieck aufzulösen? Dann die Angaben zum Drehen */
    const loesbar = (a: number, b: number): { t1: number; t2: number; c: number; d: number } | null => {
      const f = drehbar(a, b);
      if (!f) return null;
      const e = [tri[3 * f.t1]!, tri[3 * f.t1 + 1]!, tri[3 * f.t1 + 2]!];
      const ic = e.indexOf(f.c);
      const x = e[(ic + 1) % 3]!;
      const y = e[(ic + 2) % 3]!;
      const N1 = [lage(x), lage(f.d), lage(f.c)] as const;
      const N2 = [lage(y), lage(f.c), lage(f.d)] as const;
      const wAlt = Math.min(winkelVon(f.t1), winkelVon(f.t2));
      const wNeu = Math.min(kleinsterWinkel(...N1), kleinsterWinkel(...N2));
      if (!(wNeu > 2 * wAlt) && !(wNeu >= FLACH)) return null;
      // die Seite des größeren der beiden alten Dreiecke gilt (das flache hat keine verlässliche Normale)
      const f1 = flaechenNormale(f.t1);
      const f2 = flaechenNormale(f.t2);
      const bezug = norm(Math.hypot(f1.x, f1.y, f1.z) >= Math.hypot(f2.x, f2.y, f2.z) ? f1 : f2);
      for (const [P, Q, R] of [N1, N2]) {
        const pq = { x: Q.x - P.x, y: Q.y - P.y, z: Q.z - P.z };
        const pr = { x: R.x - P.x, y: R.y - P.y, z: R.z - P.z };
        const n = norm({ x: pq.y * pr.z - pq.z * pr.y, y: pq.z * pr.x - pq.x * pr.z, z: pq.x * pr.y - pq.y * pr.x });
        if (n.x * bezug.x + n.y * bezug.y + n.z * bezug.z < 0.5) return null;
      }
      return f;
    };
    for (let runde = 0; runde < 3; runde++) {
      let diesmal = 0;
      for (let t = 0; t < tri.length / 3; t++) {
        if (!lebt(t)) continue;
        const ab = langeKante(t);
        if (!ab) continue;
        const [a, b] = ab;
        const f = loesbar(a, b);
        if (!f) continue;
        const sa = spiegel[a]!;
        const sb = spiegel[b]!;
        if (sa < 0 || sb < 0) continue;
        if (schluessel(sa, sb) === schluessel(a, b)) {
          // die Kante ist ihr eigenes Spiegelbild: Die neue Kante liegt dann in der Mitte (beide Gegenpunkte dort) oder quer über ihr
          // (die Gegenpunkte sind Spiegelbilder)
          const mitte = spiegel[f.c] === f.c && spiegel[f.d] === f.d;
          if (!mitte && spiegel[f.c] !== f.d) continue;
          if (drehen(a, b, f, false)) diesmal++;
          continue;
        }
        const g = loesbar(sa, sb);
        const gegen = g && ((g.c === spiegel[f.c] && g.d === spiegel[f.d]) || (g.c === spiegel[f.d] && g.d === spiegel[f.c]));
        if (!g || !gegen || g.t1 === f.t1 || g.t1 === f.t2 || g.t2 === f.t1 || g.t2 === f.t2) continue;
        if (schluessel(g.c, g.d) === schluessel(f.c, f.d)) continue;
        if (!drehen(a, b, f, false)) continue;
        if (!drehen(sa, sb, g, false)) continue;
        diesmal += 2;
      }
      geloest += diesmal;
      if (diesmal === 0) break;
    }
  }
  if (neu === 0 && gelegt === 0 && geloest === 0) return null;

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

  // neue Punkte und die, in die gelegt wurde (nicht auf Loops), in der Fläche entspannen: halber Weg zur Mitte ihrer Nachbarn,
  // nur längs der Fläche
  const entspannen: number[] = [];
  for (let v = 0; v < pos.length / 3; v++) if (!tot[v] && (v >= neu0 || gelegtIn.has(v))) entspannen.push(v);
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
    for (const v of entspannen) {
      if (aufKette.has(v) || spiegel[v]! < v) continue;
      const nb = nachbarn[v]!;
      if (nb.length === 0) continue;
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

  // neu nummerieren: die gebliebenen Punkte in ihrer Reihenfolge (die alten vorn), weggefallene Dreiecke heraus
  const nAlt = h.n;
  const neuNr = new Int32Array(nGesamt).fill(-1);
  let m = 0;
  for (let v = 0; v < nGesamt; v++) if (!tot[v]) neuNr[v] = m++;
  const alt = new Int32Array(m);
  const pos2 = new Float64Array(3 * m);
  for (let v = 0; v < nGesamt; v++) {
    const w = neuNr[v]!;
    if (w < 0) continue;
    alt[w] = v < nAlt ? v : -1;
    pos2[3 * w] = pos[3 * v]!;
    pos2[3 * w + 1] = pos[3 * v + 1]!;
    pos2[3 * w + 2] = pos[3 * v + 2]!;
  }
  const tri2: number[] = [];
  const verborgen2: number[] | null = verborgen ? [] : null;
  for (let t = 0; t < tri.length / 3; t++) {
    if (totT && totT[t]) continue;
    tri2.push(neuNr[tri[3 * t]!]!, neuNr[tri[3 * t + 1]!]!, neuNr[tri[3 * t + 2]!]!);
    verborgen2?.push(verborgen![t]!);
  }
  /** ein weggefallener Punkt: der, in den er (über Stufen) gelegt wurde */
  const wohin = (v: number): number => {
    let w = v;
    while (tot[w]) w = ersatz[w]!;
    return neuNr[w]!;
  };
  const haut = hautAus(pos2, tri2);
  const neueLoops = loops.map((l, li) => {
    const k = ketten[li];
    if (!k) {
      const proben = l.proben.map((p): Probe => ({ ecken: p.ecken.map(wohin) as [number, number, number], b: [...p.b] }));
      return { ...l, proben, punkte: l.punkte.map((p) => ({ ...p })) };
    }
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
    return {
      ...l,
      proben: k.map((v) => punktProbe(neuNr[v]!)),
      s: Float64Array.from(sWerte[li]!),
      ruhe,
      punkte: l.punkte.map((p) => ({ ...p })),
    };
  });
  return { haut, loops: neueLoops, neu, gelegt, gedreht, geloest, verborgen: verborgen2 ? Uint8Array.from(verborgen2) : null, alt };
}

/**
 * Gleich nach dem Einsetzen eines Loops (10.11.2026, G5): Kreuzt die Linie eine Kante dicht neben einem Punkt, liegt der neue Punkt
 * der Linie fast auf ihm, und wo sie eine Ecke knapp abschneidet, liegen zwei ihrer Punkte fast aufeinander (gemessen bis 0,002
 * Startkanten; Dreiecke mit 0,02°). Bis zum ersten Aufräumen nach einem Zug rechnete der Löser mit diesen Nadeln. Hier fallen sie
 * zusammen: nur Kanten an den Linien, kürzer als 0,22 Startkanten (auf einer Linie 0,11: so fein löst das Netz eine Linie höchstens
 * auf), ohne Teilen, Drehen und Entspannen; die Form ändert sich nur um diese kurzen Stücke. Null, wenn nichts zu tun ist.
 */
export function nadelnZusammenlegen(h: Haut, loops: readonly Loop[], mk: number, verborgen: Uint8Array | null = null): Verdichtet | null {
  return verdichten(h, loops, Infinity, { kurz: 0.22 * mk, nurKetten: true, drehen: false, entspannen: false, verborgen });
}
