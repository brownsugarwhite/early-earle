// C3 im Plan „Ozzy stabil und schnell“ (18.11.2026), der Beweis im Kern: Lässt sich eine Linie auf der Haut verschieben („gleiten“),
// ohne dass die Form sich ändert? Kriterium, vorher festgelegt: An Florians drei Formen je weiche Linien um 10 und um 30 Einheiten
// gleiten lassen, dann über die ganze Haut bis zur Ruhe rechnen; die Haut darf sich dadurch um höchstens 0,5 Einheiten bewegen.
// Ablauf je Form:
//   0  Die gesicherte Form bis zur Ruhe rechnen (sie steht nicht genau). Von diesem Stand aus wird geglitten, gegen ihn gemessen.
// Je Linie und Weite, in Schritten von höchstens 0,3 Kantenlängen:
//   1  Die Linie rückt als Ganzes längs der Haut (ein Ring längs des Körpers: das Mittel aus Normale × Richtung; ein geschlossener
//      Loop auf einer Seite: längs x in seiner Fläche): Die Punkte des Netzes, durch die sie läuft, und ihre eigenen Punkte rücken
//      um den Schritt und werden auf die Haut gelegt, wie sie vor dem Gleiten war (`einbetten`: der nächste Ort auf dem Netz); ihre
//      Griffe drehen sich mit der Haut mit. Das Netz bleibt sonst, wie es ist.
//   2  Eine Kreuzung wandert mit: Der gemeinsame Punkt des Netzes rückt auf der anderen Linie weiter, bis er so weit geglitten ist
//      wie die Linie. Die andere Linie bleibt genau, wie sie ist (zum Schluss bekommt sie an der neuen Stelle einen Punkt, ihr Stück
//      wird dafür genau geteilt; der alte Punkt bleibt als gewöhnlicher Punkt).
//   3  Braucht es mehr als einen Schritt, räumt `verdichten` nach jedem das Netz auf, wie das Fenster es tut (zusammengeschobene
//      Kanten fallen zusammen, gedehnte werden geteilt, umgeschlagene Dreiecke aufgerichtet).
//   4  Mit „angepasst“: Die Griffe der geglittenen Linie werden an die Haut angepasst (je Stück beide Griffe nach kleinsten Quadraten,
//      die Punkte bleiben). Das ist der beste Fall mit denselben Punkten.
//   5  Über die ganze Haut bis zur Ruhe (höchstens RUNDEN Runden); die Linien gehen dabei auf ihre Pfade.
// Gemessen: wie weit die Haut danach neben der Haut von 0 liegt (jeder Punkt gegen die Fläche; größter Abstand, 95 %, Mittel).
// Zum Vergleich je Linie: „Linie gelöscht“ (was die Linie an Form trägt: so viel verliert die alte Stelle höchstens), Weite 0 (zeigt,
// was der Aufbau der Probe selbst bewegt: nichts) und „hin und zurück“ (um die Weite und wieder zurück: was Netz und Griffe auf dem
// Weg an Unschärfe sammeln).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-gleiten.ts [ordner für Bilder]
//   NAME="strange bird,teat firefish,maul handgemacht test"   WEITEN="0,1,2,10,30"   ZURUECK=10   JE=2 (Linien je Form)   RUNDEN=60
// Mit Ordner je Fall ein Bild (SVG, Seite): jeder Punkt der Haut gefärbt nach seinem Weg (hell unter 0,5, orange bis 2, rot darüber),
// die Linie vorher (blau) und nachher (schwarz).
import fs from 'node:fs';
import { einbetten } from '../../../../packages/shape/src/dicht/einbettung';
import { type Haut, hautNormalen } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, festlegen, hatPfad, hautLagen, istSichtbar, kanteBei, mittlereKante, pfadAbweichung, pfadParameter, pfadVersatz, punktEinfuegen, punkteLoeschen } from '../../../../packages/shape/src/dicht/loops';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import { formLaden } from './form-direkt-faelle';

const NAMEN = (process.env.NAME ?? 'strange bird,teat firefish,maul handgemacht test').split(',');
const WEITEN = (process.env.WEITEN ?? '0,1,2,10,30').split(',').map(Number);
const ZURUECK = Number(process.env.ZURUECK ?? 10);
const JE = Number(process.env.JE ?? 2);
const RUNDEN = Number(process.env.RUNDEN ?? 60);
// MEHR=4: Vor dem Gleiten bekommt die Linie Punkte dazu (jedes Stück genau in so viele geteilt; die Linie bleibt dabei, wie sie ist).
// So zeigt sich, was bleibt, wenn die Linie der Haut an der neuen Stelle genauer folgen kann.
const MEHR = Number(process.env.MEHR ?? 1);
const ordner = process.argv[2] ?? '';
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const kopie = (l: Loop): Loop => ({ ...l, proben: l.proben.map((p) => ({ ecken: [...p.ecken] as [number, number, number], b: [...p.b] as [number, number, number] })), s: Float64Array.from(l.s), ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur }, ...(p.ein ? { ein: { ...p.ein } } : {}), ...(p.aus ? { aus: { ...p.aus } } : {}) })) });
const zu = (l: Loop): boolean => l.art !== 'ring';

type Stand = { h: Haut; loops: Loop[] };

/** über die ganze Haut bis zur Ruhe (oder genau `genau` Runden); die Linien gehen auf ihre Pfade */
function ruhen(a: Stand, genau = 0): (Stand & { runden: number; steht: boolean }) | { fehler: string } {
  const h: Haut = { ...a.h, pos: Float64Array.from(a.h.pos) };
  const loops = a.loops.map(kopie);
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const ziele = loops.map((o, oi) => (hatPfad(o) ? pfadVersatz(o, z.start[oi]!) : null));
  const vor = new Float64Array(h.pos.length);
  let runden = 0;
  let steht = false;
  for (; runden < (genau || RUNDEN); ) {
    vor.set(h.pos);
    const N = hautNormalen(h);
    z.schritt(ziele, 1);
    runden++;
    let weg = 0;
    for (let i = 0; i < vor.length; i += 3) {
      const d = Math.abs((h.pos[i]! - vor[i]!) * N[i]! + (h.pos[i + 1]! - vor[i + 1]!) * N[i + 1]! + (h.pos[i + 2]! - vor[i + 2]!) * N[i + 2]!);
      if (d > weg || d !== d) weg = d;
    }
    if (!Number.isFinite(weg)) return { fehler: 'die Haut lief davon' };
    if (weg < 0.05) {
      steht = true;
      if (!genau) break;
    }
  }
  loops.forEach((o) => festlegen(h, o, !hatPfad(o)));
  return { h, loops, runden, steht };
}

/** die Linie `li` löschen (die Punkte der anderen Linien bleiben, wo sie sind) */
function loeschen(a: Stand, li: number): Stand {
  const loops = a.loops.map(kopie).filter((_, i) => i !== li);
  for (const o of loops) for (const p of o.punkte) if (p.kreuzung !== undefined && !loops.some((x) => x !== o && x.punkte.some((q) => q.kreuzung === p.kreuzung))) delete p.kreuzung;
  return { h: { ...a.h, pos: Float64Array.from(a.h.pos) }, loops };
}

type Geglitten = Stand & { neben: number; gewandert: number; fest: number; umgeschlagen: number; schritte: number };
type V = { x: number; y: number; z: number };

/** kleinste Drehung, die die Einheitsrichtung a auf b legt, angewandt auf v */
function gedreht(a: number[], b: number[], v: V): V {
  const k = [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
  const sin = Math.hypot(k[0]!, k[1]!, k[2]!);
  const cos = a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  if (sin < 1e-9) return { ...v };
  const u = [k[0]! / sin, k[1]! / sin, k[2]! / sin];
  const w = [v.x, v.y, v.z];
  const kv = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
  const uw = u[0]! * w[0]! + u[1]! * w[1]! + u[2]! * w[2]!;
  const r = [0, 1, 2].map((x) => w[x]! * cos + kv[x]! * sin + u[x]! * uw * (1 - cos));
  return { x: r[0]!, y: r[1]!, z: r[2]! };
}

/** umgeschlagene Dreiecke (Normale gegen die Normalen der Ecken) */
function umgeschlageneZahl(h: Haut): number {
  const N = hautNormalen(h);
  let zahl = 0;
  for (let f = 0; f < h.tri.length; f += 3) {
    const [i0, i1, i2] = [h.tri[f]!, h.tri[f + 1]!, h.tri[f + 2]!];
    const e1 = [0, 1, 2].map((x) => h.pos[3 * i1 + x]! - h.pos[3 * i0 + x]!);
    const e2 = [0, 1, 2].map((x) => h.pos[3 * i2 + x]! - h.pos[3 * i0 + x]!);
    const fn = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
    let d = 0;
    for (const v of [i0, i1, i2]) d += fn[0]! * N[3 * v]! + fn[1]! * N[3 * v + 1]! + fn[2]! * N[3 * v + 2]!;
    if (d < 0) zahl++;
  }
  return zahl;
}

/**
 * Die Linie `li` um `weite` auf der Haut verschieben (Schritte 1 bis 4), mit `zurueck` danach um dieselbe Weite zurück. Bei Weite 0
 * ändert sich nichts.
 */
function gleiten(a: Stand, li: number, weite: number, anpassen = false, zurueck = false): Geglitten | { fehler: string } {
  let h: Haut = { ...a.h, pos: Float64Array.from(a.h.pos) };
  let loops = a.loops.map(kopie);
  const mk = mittlereKante(a.h);
  const N = hautNormalen(a.h);
  // die Richtung: das Mittel aus Normale × Richtung der Linie (ein Ring längs des Körpers); hebt es sich auf (ein geschlossener
  // Loop), x in der mittleren Fläche des Loops
  const G = [0, 0, 0];
  {
    const l = loops[li]!;
    const n = l.proben.length;
    if (!l.proben.every((p) => p.b[0] === 1)) return { fehler: 'die Linie läuft nicht durch Punkte des Netzes' };
    const nm = [0, 0, 0];
    for (let j = 0; j < n; j++) {
      const ja = zu(l) ? (j - 1 + n) % n : Math.max(0, j - 1);
      const jb = zu(l) ? (j + 1) % n : Math.min(n - 1, j + 1);
      const t = [l.ruhe[3 * jb]! - l.ruhe[3 * ja]!, l.ruhe[3 * jb + 1]! - l.ruhe[3 * ja + 1]!, l.ruhe[3 * jb + 2]! - l.ruhe[3 * ja + 2]!];
      const v = l.proben[j]!.ecken[0];
      const nn = [N[3 * v]!, N[3 * v + 1]!, N[3 * v + 2]!];
      const q = [nn[1]! * t[2]! - nn[2]! * t[1]!, nn[2]! * t[0]! - nn[0]! * t[2]!, nn[0]! * t[1]! - nn[1]! * t[0]!];
      const L = Math.hypot(q[0]!, q[1]!, q[2]!) || 1;
      for (let x = 0; x < 3; x++) {
        G[x] = G[x]! + q[x]! / L / n;
        nm[x] = nm[x]! + nn[x]! / n;
      }
    }
    if (Math.hypot(G[0]!, G[1]!, G[2]!) < 0.5) {
      const ln = Math.hypot(nm[0]!, nm[1]!, nm[2]!) || 1;
      const k = nm[0]! / ln;
      G[0] = 1 - (k * nm[0]!) / ln;
      G[1] = (-k * nm[1]!) / ln;
      G[2] = (-k * nm[2]!) / ln;
    }
    if (!zu(l)) G[2] = 0;
    const lg = Math.hypot(G[0]!, G[1]!, G[2]!) || 1;
    for (let x = 0; x < 3; x++) G[x] = G[x]! / lg;
  }
  if (MEHR > 1 && weite !== 0) {
    const l = loops[li]!;
    const P = [...l.punkte];
    const m = P.length;
    for (let i = 0; i < (zu(l) ? m : m - 1); i++) {
      const s0 = P[i]!.s;
      const s1 = i + 1 < m ? P[i + 1]!.s : P[0]!.s + l.laenge;
      // (von hinten: Jede Teilung nimmt den Anteil am Stück, das dann noch übrig ist)
      for (let k = MEHR - 1; k >= 1; k--) punktEinfuegen(l, (s0 + ((s1 - s0) * k) / MEHR) % l.laenge, undefined, true);
    }
  }
  /** Orte um `w` längs G verschoben und auf die Haut (wie sie vor dem Gleiten war) gelegt: Lage und Normale dort */
  const aufHaut = (orte: readonly V[], aufMitte: (i: number) => boolean, w: number): { p: V; nor: number[] }[] => {
    const ziel = new Float64Array(3 * orte.length);
    orte.forEach((o, i) => {
      ziel[3 * i] = o.x + w * G[0]!;
      ziel[3 * i + 1] = o.y + w * G[1]!;
      ziel[3 * i + 2] = aufMitte(i) ? 0 : o.z + w * G[2]!;
    });
    const E = einbetten(a.h, ziel);
    return orte.map((_, i) => {
      const e = [a.h.tri[3 * E.tri[i]!]!, a.h.tri[3 * E.tri[i]! + 1]!, a.h.tri[3 * E.tri[i]! + 2]!];
      const p = [0, 0, 0];
      const nor = [0, 0, 0];
      for (let c = 0; c < 3; c++)
        for (let x = 0; x < 3; x++) {
          p[x] = p[x]! + E.b[3 * i + c]! * a.h.pos[3 * e[c]! + x]!;
          nor[x] = nor[x]! + E.b[3 * i + c]! * N[3 * e[c]! + x]!;
        }
      const ln = Math.hypot(nor[0]!, nor[1]!, nor[2]!) || 1;
      return { p: { x: p[0]!, y: p[1]!, z: aufMitte(i) ? 0 : p[2]! }, nor: nor.map((x) => x / ln) };
    });
  };
  const setzen = (v: number, p: V): void => {
    h.pos[3 * v] = p.x;
    h.pos[3 * v + 1] = p.y;
    h.pos[3 * v + 2] = p.z;
    const sv = h.spiegel[v]!;
    if (sv >= 0 && sv !== v) {
      h.pos[3 * sv] = p.x;
      h.pos[3 * sv + 1] = p.y;
      h.pos[3 * sv + 2] = -p.z;
    }
  };
  const lageVon = (v: number): V => ({ x: h.pos[3 * v]!, y: h.pos[3 * v + 1]!, z: h.pos[3 * v + 2]! });
  /** die Probe der Linie an ihrem Punkt p (an einer Kreuzung ein gemeinsamer Punkt des Netzes) */
  const probeBei = (l: Loop, p: { s: number }): number => {
    let j = 0;
    for (let x = 1; x < l.proben.length; x++) if (Math.abs(l.s[x]! - p.s) < Math.abs(l.s[j]! - p.s)) j = x;
    return j;
  };
  let gewandert = 0;
  let fest = 0;
  /** ein Schritt um `w` */
  const schritt = (w: number): string | null => {
    const l = loops[li]!;
    const n = l.proben.length;
    if (!l.proben.every((p) => p.b[0] === 1)) return 'die Linie läuft nicht mehr durch Punkte des Netzes';
    const ringEnde = (s: number): boolean => l.art === 'ring' && !l.haengt && (s <= 1e-6 || s >= l.laenge - 1e-6);
    // die Kreuzungen: Punkt des Netzes, die andere Linie und deren Probe dort (vor dem Rücken gelesen)
    const kreuz = l.punkte.flatMap((p, i) => {
      if (p.kreuzung === undefined) return [];
      const v = l.proben[probeBei(l, p)]!.ecken[0];
      const an = loops.flatMap((o, oi) => (oi === li ? [] : [{ o, jo: o.proben.findIndex((pb) => pb.b[0] === 1 && pb.ecken[0] === v) }])).filter((x) => x.jo >= 0);
      // (zuerst die Linie, die diese Kreuzung mit ihr teilt)
      an.sort((x, y) => Number(y.o.punkte.some((q) => q.kreuzung === p.kreuzung)) - Number(x.o.punkte.some((q) => q.kreuzung === p.kreuzung)));
      return [{ i, v, an: an[0] ?? null, X: lageVon(v) }];
    });
    const anKreuzung = new Set(kreuz.map((k) => k.v));
    // die Punkte des Netzes unter der Linie
    const alt = Array.from({ length: n }, (_, j) => lageVon(l.proben[j]!.ecken[0]));
    const neuP = aufHaut(alt, (j) => !zu(l) && !l.haengt && (j === 0 || j === n - 1), w);
    for (let j = 0; j < n; j++) if (!anKreuzung.has(l.proben[j]!.ecken[0])) setzen(l.proben[j]!.ecken[0], neuP[j]!.p);
    // eine Kreuzung wandert auf der anderen Linie mit
    const ortK = new Map<number, V>();
    for (const k of kreuz) {
      let ort = k.X;
      let gerueckt = false;
      if (k.an) {
        const { o, jo } = k.an;
        const m = o.proben.length;
        // längs der anderen Linie bis dorthin, wo der Weg längs G den Schritt erreicht (höchstens 0,9 des Stücks zur nächsten Probe)
        for (const r of [1, -1]) {
          let jn = jo + r;
          let sn = 0;
          if (jn < 0 || jn >= m) {
            if (!zu(o)) continue;
            jn = (jn + m) % m;
            sn = r > 0 ? o.laenge : -o.laenge;
          }
          const Y = lageVon(o.proben[jn]!.ecken[0]);
          const f = (Y.x - k.X.x) * G[0]! + (Y.y - k.X.y) * G[1]! + (Y.z - k.X.z) * G[2]!;
          if (f * w <= 0) continue;
          const u = Math.min(0.9, w / f);
          o.s[jo] = o.s[jo]! + u * (o.s[jn]! + sn - o.s[jo]!);
          ort = { x: k.X.x + u * (Y.x - k.X.x), y: k.X.y + u * (Y.y - k.X.y), z: k.X.z + u * (Y.z - k.X.z) };
          if (o.art === 'mitte') ort.z = 0;
          gerueckt = true;
          break;
        }
      }
      if (gerueckt) gewandert++;
      else fest++;
      setzen(k.v, ort);
      ortK.set(k.i, ort);
    }
    // die Punkte der Linie und ihre Griffe
    const refAlt = l.punkte.map((p) => ({ ...p.ref }));
    const norAlt = aufHaut(refAlt, () => false, 0).map((x) => x.nor);
    const refNeu = aufHaut(refAlt, (i) => ringEnde(l.punkte[i]!.s), w);
    const norK = aufHaut(
      l.punkte.map((_, i) => ortK.get(i) ?? refNeu[i]!.p),
      () => false,
      0,
    ).map((x) => x.nor);
    l.punkte.forEach((p, i) => {
      let ort = ortK.get(i) ?? refNeu[i]!.p;
      if (p.ein) p.ein = gedreht(norAlt[i]!, norK[i]!, p.ein);
      if (p.aus) p.aus = gedreht(norAlt[i]!, norK[i]!, p.aus);
      if (ringEnde(p.s)) ort = { ...ort, z: 0 };
      p.ref = { ...ort };
      p.cur = { ...ort };
    });
    for (const o of loops) o.ruhe = hautLagen(h, o);
    return null;
  };
  // in Schritten; dazwischen räumt `verdichten` das Netz auf wie im Fenster
  const zahl = Math.max(1, Math.ceil(Math.abs(weite) / (0.3 * mk)));
  const folge = [...Array.from({ length: zahl }, () => weite / zahl), ...(zurueck ? Array.from({ length: zahl }, () => -weite / zahl) : [])];
  for (let k = 0; weite !== 0 && k < folge.length; k++) {
    const f = schritt(folge[k]!);
    if (f) return { fehler: f };
    // (nach einem einzelnen kleinen Schritt bleibt das Netz, wie es ist: So ändert sich bei kleinen Weiten nichts außer dem Gleiten)
    if (folge.length > 1) {
      const v = verdichten(h, loops, 1.75 * mk, { kurz: 0.5 * mk, flachSchutz: true });
      if (v) {
        h = v.haut;
        loops = v.loops;
      }
    }
  }
  // die andere Linie an jeder gewanderten Kreuzung: ein Punkt an der neuen Stelle (ihr Stück genau geteilt), der alte bleibt
  let kn = 1 + Math.max(0, ...loops.flatMap((o) => o.punkte.map((p) => p.kreuzung ?? 0)));
  {
    const l = loops[li]!;
    for (const p of l.punkte) {
      const k = p.kreuzung;
      if (k === undefined || weite === 0) continue;
      const v = l.proben[probeBei(l, p)]!.ecken[0];
      const teil = loops.flatMap((o, oi) => (oi === li ? [] : o.punkte.filter((q) => q.kreuzung === k).map((q) => ({ o, q, jo: o.proben.findIndex((pb) => pb.b[0] === 1 && pb.ecken[0] === v) }))));
      const erste = teil.find((x) => x.jo >= 0);
      if (!erste || Math.abs(erste.o.s[erste.jo]! - erste.q.s) < 1e-6) continue;
      if (teil.length === 1) delete erste.q.kreuzung;
      const q2 = punktEinfuegen(erste.o, erste.o.s[erste.jo]!, kn, true);
      p.kreuzung = kn++;
      p.ref = { ...q2.ref };
      p.cur = { ...q2.ref };
      setzen(v, q2.ref);
    }
    for (const o of loops) {
      o.punkte.sort((x, y) => x.s - y.s);
      o.ruhe = hautLagen(h, o);
    }
  }
  // die Griffe der geglittenen Linie an die Haut anpassen: je Stück zwischen zwei Punkten beide Griffe nach kleinsten Quadraten so,
  // dass der Pfad durch die Proben läuft, wie sie jetzt auf der Haut liegen (die Punkte bleiben; die Enden eines Rings behalten ihren
  // Griff); danach jede Probe an die Stelle des nächsten Punkts auf dem Pfad, zwei Runden
  if (anpassen && weite !== 0) {
    const g = loops[li]!;
    const n = g.proben.length;
    for (let runde = 0; runde < 2; runde++) {
      const P = g.punkte;
      const m = P.length;
      for (let i = 0; i < (zu(g) ? m : m - 1); i++) {
        const A = P[i]!;
        const B = P[(i + 1) % m]!;
        if (!A.aus || !B.ein) continue;
        const s0 = A.s;
        const s1 = i + 1 < m ? B.s : B.s + g.laenge;
        const festA = !zu(g) && !g.haengt && i === 0;
        const festB = !zu(g) && !g.haengt && i + 1 === m - 1;
        let s11 = 0;
        let s12 = 0;
        let s22 = 0;
        const r1 = [0, 0, 0];
        const r2 = [0, 0, 0];
        let stuetzen = 0;
        for (let j = 0; j < n; j++) {
          const sj = g.s[j]! > s0 + 1e-9 ? g.s[j]! : g.s[j]! + (i + 1 < m ? 0 : g.laenge);
          if (sj <= s0 + 1e-9 || sj >= s1 - 1e-9) continue;
          const t = (sj - s0) / (s1 - s0);
          const c1 = 3 * (1 - t) * (1 - t) * t;
          const c2 = 3 * (1 - t) * t * t;
          const wa = (1 - t) ** 3 + c1;
          const wb = t ** 3 + c2;
          const rest = [g.ruhe[3 * j]! - wa * A.ref.x - wb * B.ref.x, g.ruhe[3 * j + 1]! - wa * A.ref.y - wb * B.ref.y, g.ruhe[3 * j + 2]! - wa * A.ref.z - wb * B.ref.z];
          // (ein fester Griff zählt zum Bekannten)
          if (festA) for (let x = 0; x < 3; x++) rest[x] = rest[x]! - c1 * [A.aus.x, A.aus.y, A.aus.z][x]!;
          if (festB) for (let x = 0; x < 3; x++) rest[x] = rest[x]! - c2 * [B.ein.x, B.ein.y, B.ein.z][x]!;
          const k1 = festA ? 0 : c1;
          const k2 = festB ? 0 : c2;
          s11 += k1 * k1;
          s12 += k1 * k2;
          s22 += k2 * k2;
          for (let x = 0; x < 3; x++) {
            r1[x] = r1[x]! + k1 * rest[x]!;
            r2[x] = r2[x]! + k2 * rest[x]!;
          }
          stuetzen++;
        }
        if (stuetzen < 2) continue;
        const det = s11 * s22 - s12 * s12;
        const al = [0, 0, 0];
        const be = [0, 0, 0];
        for (let x = 0; x < 3; x++) {
          if (!festA && !festB && Math.abs(det) > 1e-9 * s11 * s22) {
            al[x] = (s22 * r1[x]! - s12 * r2[x]!) / det;
            be[x] = (s11 * r2[x]! - s12 * r1[x]!) / det;
          } else if (!festA && festB && s11 > 1e-12) al[x] = r1[x]! / s11;
          else if (festA && !festB && s22 > 1e-12) be[x] = r2[x]! / s22;
          else {
            al[x] = Number.NaN;
            be[x] = Number.NaN;
          }
        }
        if (!festA && al.every(Number.isFinite)) A.aus = { x: al[0]!, y: al[1]!, z: al[2]! };
        if (!festB && be.every(Number.isFinite)) B.ein = { x: be[0]!, y: be[1]!, z: be[2]! };
      }
      pfadParameter(g, g.ruhe);
    }
  }
  return { h, loops, neben: pfadAbweichung(loops[li]!), gewandert, fest, umgeschlagen: umgeschlageneZahl(h), schritte: weite === 0 ? 0 : folge.length };
}

/** Bild (Seite): die Punkte der Haut B nach ihrem Abstand zur Haut A gefärbt, die Linie vorher und nachher */
function bild(datei: string, titel: string, A: Haut, B: Haut, vorher: Float64Array, nachher: Float64Array | null): void {
  const E = einbetten(A, B.pos);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let v = 0; v < B.n; v++) {
    x0 = Math.min(x0, B.pos[3 * v]!);
    x1 = Math.max(x1, B.pos[3 * v]!);
    y0 = Math.min(y0, B.pos[3 * v + 1]!);
    y1 = Math.max(y1, B.pos[3 * v + 1]!);
  }
  const W = 900;
  const m = (W - 40) / (x1 - x0);
  const H = Math.ceil((y1 - y0) * m + 70);
  const X = (x: number): string => (20 + (x - x0) * m).toFixed(1);
  const Y = (y: number): string => (50 + (y1 - y) * m).toFixed(1);
  const gruppen: [string, string[]][] = [
    ['#d9d3c9', []],
    ['#f0a12c', []],
    ['#e2452c', []],
  ];
  for (let v = 0; v < B.n; v++) {
    if (B.pos[3 * v + 2]! < 0) continue;
    const w = Math.hypot(E.o[3 * v]!, E.o[3 * v + 1]!, E.o[3 * v + 2]!);
    gruppen[w <= 0.5 ? 0 : w <= 2 ? 1 : 2]![1].push(`<circle cx="${X(B.pos[3 * v]!)}" cy="${Y(B.pos[3 * v + 1]!)}" r="${w <= 0.5 ? 1.1 : 1.9}"/>`);
  }
  const pfad = (L: Float64Array): string => {
    let d = '';
    for (let j = 0; j + 2 < L.length; j += 3) d += `${j ? 'L' : 'M'}${X(L[j]!)} ${Y(L[j + 1]!)}`;
    return d;
  };
  fs.writeFileSync(
    datei,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="24" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#1f1a17">${titel}</text>${gruppen.map(([f, k]) => `<g fill="${f}">${k.join('')}</g>`).join('')}<path d="${pfad(vorher)}" fill="none" stroke="#3b6fd6" stroke-width="1.6"/>${nachher ? `<path d="${pfad(nachher)}" fill="none" stroke="#1f1a17" stroke-width="1.6"/>` : ''}</svg>`,
  );
}

/** wie weit die Punkte von B neben der Fläche A liegen */
function abstand(A: Haut, B: Haut): { max: number; q95: number; mittel: number; wo: string } {
  const E = einbetten(A, B.pos);
  const d: number[] = [];
  let max = 0;
  let wo = '';
  for (let v = 0; v < B.n; v++) {
    const w = Math.hypot(E.o[3 * v]!, E.o[3 * v + 1]!, E.o[3 * v + 2]!);
    d.push(w);
    if (w > max) {
      max = w;
      wo = `${B.pos[3 * v]!.toFixed(0)}/${B.pos[3 * v + 1]!.toFixed(0)}/${B.pos[3 * v + 2]!.toFixed(0)}`;
    }
  }
  d.sort((a, b) => a - b);
  return { max, q95: d[Math.floor(0.95 * d.length)]!, mittel: d.reduce((a, b) => a + b, 0) / d.length, wo };
}

let schlecht = 0;
let faelle = 0;
for (const name of NAMEN) {
  const geladen = formLaden(name);
  // 0 die gesicherte Form bis zur Ruhe
  const R = ruhen({ h: geladen.h, loops: geladen.loops });
  if ('fehler' in R) {
    console.log(`${name}: ${R.fehler}`);
    continue;
  }
  const still = abstand(geladen.h, R.h);
  // weiche Linien mit Pfad (keine Kante an einem ihrer Punkte), nicht die Linie der Mitte; die längsten zuerst
  const wahl = R.loops
    .map((l, li) => ({ l, li }))
    .filter(({ l }) => l.art !== 'mitte' && hatPfad(l) && !l.haengt && !l.kante && !kanteBei(l, R.loops).some((k) => k) && l.punkte.filter(istSichtbar).length >= 2)
    .sort((a, b) => b.l.laenge - a.l.laenge)
    .slice(0, JE);
  console.log(`${name}: ${R.h.n} Punkte, mittlere Kante ${z2(mittlereKante(R.h))}, ${R.loops.length} Linien; bis zur Ruhe gerechnet (${R.runden} Runden${R.steht ? '' : ', steht nicht'}) liegt die Haut bis ${z2(still.max)} neben der gesicherten (95 % ${z2(still.q95)}); ${umgeschlageneZahl(R.h)} Dreiecke umgeschlagen. Weiche Linien: ${wahl.length ? wahl.map((w) => `${w.l.id} (${w.l.art}, ${w.l.punkte.filter(istSichtbar).length} Punkte, Länge ${w.l.laenge.toFixed(0)})`).join(', ') : 'keine'}`);
  for (const { l, li } of wahl) {
    // was die Linie an Form trägt: gelöscht und bis zur Ruhe
    const ohne = ruhen(loeschen(R, li));
    if ('fehler' in ohne) console.log(`   Linie ${l.id} gelöscht: ${ohne.fehler}`);
    else {
      const a = abstand(R.h, ohne.h);
      if (ordner) bild(`${ordner}/gleiten-${name.replace(/ /g, '_')}-${l.id}-geloescht.svg`, `${name}, Linie ${l.id} gelöscht: die Haut bewegt sich um bis zu ${z2(a.max)}`, R.h, ohne.h, l.ruhe, null);
      console.log(`   Linie ${l.id} gelöscht (${ohne.runden} Runden${ohne.steht ? '' : ', steht nicht'}): die Haut bewegt sich um höchstens ${z2(a.max)}, 95 % ${z2(a.q95)}, Mittel ${z2(a.mittel)}`);
    }
    const liste: { weite: number; anpassen: boolean; zurueck: boolean }[] = [];
    for (const weite of WEITEN) for (const anpassen of weite === 0 ? [false] : weite <= 2 ? [false, true] : [true]) liste.push({ weite, anpassen, zurueck: false });
    if (ZURUECK > 0) liste.push({ weite: ZURUECK, anpassen: true, zurueck: true });
    for (const { weite, anpassen, zurueck } of liste) {
      const kontrolle = weite === 0 || zurueck;
      if (!kontrolle) faelle++;
      const wort = `Linie ${l.id}, ${weite} Einheiten ${zurueck ? 'hin und zurück' : 'geglitten'}${weite === 0 ? '' : anpassen ? ', Griffe angepasst' : ', Griffe mitgedreht'}`;
      const g = gleiten(R, li, weite, anpassen, zurueck);
      const mit = 'fehler' in g ? g : ruhen(g);
      if ('fehler' in g || 'fehler' in mit) {
        if (!kontrolle) schlecht++;
        console.log(`   FEHL ${wort}: ${'fehler' in mit ? mit.fehler : ''}`);
        continue;
      }
      // gegen den Stand von 0, ebenso viele Runden weiter gerechnet
      const bezug = ruhen(R, mit.runden);
      const a = abstand('fehler' in bezug ? R.h : bezug.h, mit.h);
      const gut = a.max <= 0.5;
      if (!gut && !kontrolle) schlecht++;
      if (ordner) bild(`${ordner}/gleiten-${name.replace(/ /g, '_')}-${l.id}-${weite}${zurueck ? '-zurueck' : anpassen ? '-angepasst' : ''}.svg`, `${name}, ${wort}: die Haut bewegt sich um bis zu ${z2(a.max)}`, R.h, mit.h, l.ruhe, mit.loops[li]!.ruhe);
      console.log(`   ${kontrolle ? 'Kontrolle' : gut ? 'gut ' : 'FEHL'} ${wort} (${g.schritte} Schritte, ${mit.runden} Runden${mit.steht ? '' : ', steht nicht'}; Kreuzungen ${g.gewandert} gewandert, ${g.fest} geblieben; Pfad bis ${z2(g.neben)} neben der Haut; ${g.umgeschlagen} umgeschlagen): die Haut bewegt sich um höchstens ${z2(a.max)} (bei ${a.wo}), 95 % ${z2(a.q95)}, Mittel ${z2(a.mittel)}`);
    }
  }
}
console.log(schlecht ? `${schlecht} von ${faelle} Fällen über 0,5 Einheiten` : `alle ${faelle} Fälle halten`);

// Teil 2: Ein Punkt gleitet auf seiner eigenen Linie. Die Linie soll bleiben, wie sie ist; ein Bézier-Stück lässt sich aber nur an
// einer Stelle genau teilen, nicht zwei Stücke genau zu einem verbinden. Je glattem Punkt ohne Kreuzung (nicht am Ende eines Rings)
// und Weg (10 und 30 Einheiten zum nächsten Punkt hin, solange der Weg höchstens 0,9 des Stücks ist): an der neuen Stelle ein Punkt
// (das Stück genau geteilt), der alte fällt weg. Gemessen: wie weit der neue Pfad neben dem alten liegt (größter Abstand, in beide
// Richtungen), einmal mit dem Löschen des Kerns (`punkteLoeschen`: die Nachbarn behalten die Richtung ihrer Griffe) und einmal mit
// frei angepassten Griffen des verbundenen Stücks (das Beste, was ein einzelnes Stück hergibt).
const bez = (A: V, a: V, b: V, B: V, t: number): V => {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return { x: (w0 + w1) * A.x + w1 * a.x + (w2 + w3) * B.x + w2 * b.x, y: (w0 + w1) * A.y + w1 * a.y + (w2 + w3) * B.y + w2 * b.y, z: (w0 + w1) * A.z + w1 * a.z + (w2 + w3) * B.z + w2 * b.z };
};
const pfadDicht = (l: Loop, je = 40): V[] => {
  const P = l.punkte;
  const m = P.length;
  const aus: V[] = [];
  for (let i = 0; i < (zu(l) ? m : m - 1); i++) {
    const A = P[i]!;
    const B = P[(i + 1) % m]!;
    if (!A.aus || !B.ein) continue;
    for (let k = 0; k <= je; k++) aus.push(bez(A.ref, A.aus, B.ein, B.ref, k / je));
  }
  return aus;
};
/** größter Abstand der Orte A zum Streckenzug B */
const neben = (A: readonly V[], B: readonly V[]): number => {
  let max = 0;
  for (const p of A) {
    let min = Infinity;
    for (let i = 0; i + 1 < B.length; i++) {
      const a = B[i]!;
      const b = B[i + 1]!;
      const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const L = d.x * d.x + d.y * d.y + d.z * d.z;
      // (zwei Stücke stoßen aneinander: die Strecke zwischen ihren Enden ist null)
      const t = L > 1e-18 ? Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y + (p.z - a.z) * d.z) / L)) : 0;
      const e = Math.hypot(p.x - a.x - t * d.x, p.y - a.y - t * d.y, p.z - a.z - t * d.z);
      if (e < min) min = e;
    }
    if (min > max) max = min;
  }
  return max;
};
/** beide Griffe eines Stücks A → B frei nach kleinsten Quadraten an die Orte X (in ihrer Reihenfolge), vier Runden mit neuen Stellen */
const freiAnpassen = (A: V, B: V, X: readonly V[]): { a: V; b: V } | null => {
  let t = [0];
  for (let k = 1; k < X.length; k++) t.push(t[k - 1]! + Math.hypot(X[k]!.x - X[k - 1]!.x, X[k]!.y - X[k - 1]!.y, X[k]!.z - X[k - 1]!.z));
  const ganz = t[t.length - 1]! || 1;
  t = t.map((x) => x / ganz);
  let g: { a: V; b: V } | null = null;
  for (let runde = 0; runde < 5; runde++) {
    let s11 = 0;
    let s12 = 0;
    let s22 = 0;
    const r1 = [0, 0, 0];
    const r2 = [0, 0, 0];
    X.forEach((q, k) => {
      const u = 1 - t[k]!;
      const c1 = 3 * u * u * t[k]!;
      const c2 = 3 * u * t[k]! * t[k]!;
      const wa = u * u * u + c1;
      const wb = t[k]! ** 3 + c2;
      const rest = [q.x - wa * A.x - wb * B.x, q.y - wa * A.y - wb * B.y, q.z - wa * A.z - wb * B.z];
      s11 += c1 * c1;
      s12 += c1 * c2;
      s22 += c2 * c2;
      for (let x = 0; x < 3; x++) {
        r1[x] = r1[x]! + c1 * rest[x]!;
        r2[x] = r2[x]! + c2 * rest[x]!;
      }
    });
    const det = s11 * s22 - s12 * s12;
    if (Math.abs(det) < 1e-12 * s11 * s22) return g;
    const al = [0, 1, 2].map((x) => (s22 * r1[x]! - s12 * r2[x]!) / det);
    const be = [0, 1, 2].map((x) => (s11 * r2[x]! - s12 * r1[x]!) / det);
    g = { a: { x: al[0]!, y: al[1]!, z: al[2]! }, b: { x: be[0]!, y: be[1]!, z: be[2]! } };
    // jede Stütze an die Stelle des nächsten Punkts auf dem neuen Stück
    const D = Array.from({ length: 401 }, (_, i) => bez(A, g!.a, g!.b, B, i / 400));
    let ab = 0;
    t = X.map((q) => {
      let best = ab;
      let min = Infinity;
      for (let i = ab; i <= 400; i++) {
        const e = Math.hypot(q.x - D[i]!.x, q.y - D[i]!.y, q.z - D[i]!.z);
        if (e < min) {
          min = e;
          best = i;
        }
      }
      ab = best;
      return best / 400;
    });
  }
  return g;
};
if (process.env.PUNKT !== '0')
  for (const name of NAMEN) {
    const { loops } = formLaden(name);
    for (const weg of [10, 30]) {
      const kern: number[] = [];
      const frei: number[] = [];
      let ohnePlatz = 0;
      loops.forEach((l0) => {
        if (!hatPfad(l0)) return;
        l0.punkte.forEach((p0, pi) => {
          const m = l0.punkte.length;
          const ende = l0.art === 'ring' && (pi === 0 || pi === m - 1);
          if (!istSichtbar(p0) || p0.kreuzung !== undefined || ende || p0.ecke || p0.autoEcke || !p0.ein || !p0.aus || m < 3) return;
          const nach = l0.punkte[(pi + 1) % m]!;
          const stueck = (pi + 1 < m ? nach.s : nach.s + l0.laenge) - p0.s;
          if (weg > 0.9 * stueck) {
            ohnePlatz++;
            return;
          }
          const alt = pfadDicht(l0);
          // der Kern: neuer Punkt genau, der alte gelöscht (Richtungen der Nachbarn bleiben)
          const l1 = kopie(l0);
          const p1 = l1.punkte[pi]!;
          punktEinfuegen(l1, (p1.s + weg) % l1.laenge, undefined, true);
          punkteLoeschen(l1, new Set([p1]));
          const neu1 = pfadDicht(l1);
          kern.push(Math.max(neben(neu1, alt), neben(alt, neu1)));
          // frei: das verbundene Stück (voriger Punkt → neuer Punkt) mit beiden Griffen frei
          const l2 = kopie(l0);
          const p2 = l2.punkte[pi]!;
          const q2 = punktEinfuegen(l2, (p2.s + weg) % l2.laenge, undefined, true);
          const i2 = l2.punkte.indexOf(p2);
          const vor = l2.punkte[(i2 - 1 + l2.punkte.length) % l2.punkte.length]!;
          if (!vor.aus || !p2.ein || !p2.aus || !q2.ein) return;
          const X: V[] = [];
          for (let k = 1; k <= 40; k++) X.push(bez(vor.ref, vor.aus, p2.ein, p2.ref, k / 40));
          for (let k = 1; k < 40; k++) X.push(bez(p2.ref, p2.aus, q2.ein, q2.ref, k / 40));
          const g = freiAnpassen(vor.ref, q2.ref, X);
          if (!g) return;
          vor.aus = g.a;
          q2.ein = g.b;
          l2.punkte.splice(i2, 1);
          const neu2 = pfadDicht(l2);
          frei.push(Math.max(neben(neu2, alt), neben(alt, neu2)));
        });
      });
      const wort = (d: number[]): string => {
        if (d.length === 0) return 'keine';
        const o = [...d].sort((a, b) => a - b);
        return `größter ${z2(o[o.length - 1]!)}, mittlerer ${z2(o[Math.floor(o.length / 2)]!)}, ${o.filter((x) => x <= 0.5).length} von ${o.length} bis 0,5`;
      };
      console.log(`${name}: ein Punkt gleitet ${weg} Einheiten auf seiner Linie (${kern.length} glatte Punkte, ${ohnePlatz} ohne so viel Platz bis zum nächsten): die Linie liegt danach neben ihrer alten Lage · Löschen des Kerns: ${wort(kern)} · Griffe frei angepasst: ${wort(frei)}`);
    }
  }
