// Ozzy, ein Zahn als kleine Form (Plan „Maul, Zähne, Zunge“, Etappe 7, 21.11.2026; `docs/plans/2026-11-21-ozzy-maul-etappe-7-zahn-als-form.md`).
//
// Ein Zahn trägt drei Linien, wie jede Form in Ozzy am Anfang (Silhouette, Loop längs, Loop quer), im Maß des Zahns (`zahn.ts`:
// +y vom Zahnfleisch zur Spitze, x längs des Zahnfleischs nach hinten, +z zur Lippe; Breite 1 = ein Platz in der Reihe):
// - `vorn`: seine Linie von vorn (x, y), offen: Zahnfleisch links, …, Spitze, …, Zahnfleisch rechts;
// - `seite`: seine Linie von der Seite (z, y), offen: Zahnfleisch hinten (im Maul), …, Spitze, …, Zahnfleisch vorn (zur Lippe);
// - `quer`: die Linie, an der er aus dem Zahnfleisch tritt (x, z), geschlossen, durch die vier Punkte am Zahnfleisch.
// Sie teilen sich sechs Punkte: die Spitze (vorn und Seite: dieselbe Höhe) und die vier am Zahnfleisch (mit quer: dasselbe x
// beziehungsweise z). Die Haut dazwischen: Die vier Hälften (links, rechts, hinten, vorn) laufen vom Zahnfleisch zur Spitze; ein
// Ring geht durch die vier Stellen gleichen Fortschritts und ist das Bild der Linie quer. So liegen alle drei Linien genau auf der
// Haut, und Haken, Überhänge und Zacken einer Linie gehen (ein Stapel waagerechter Scheiben könnte das nicht).
//
// Ohne DOM und ohne three: Die Linse, das Maul und die Tests rechnen mit denselben Zahlen.
import { type Anker, type Pfad, anpassen, punktAufStueck, stueckZwischen } from '@ee/shape/zeichnen';
import type { Linie, Netz } from '../linien/netz';
import { type Wurzel, type ZahnForm, kronenProfil } from '../maulstudie/zahn';

export type { Anker };

/**
 * Die eigene Form eines Zahns. `spitzeV`, `spitzeS`: die Nummer der Spitze in `vorn` und `seite`. `ecken`: die Nummern der vier
 * geteilten Anker in `quer`, in ihrem Umlauf: rechts (+x), vorn (+z), links, hinten. Was die Linien nicht tragen, bleibt von der
 * Vorlage: Höcker (0 oder 4) und die Wurzel. Wird nie am Ort geändert (die Schritte für ⌘Z teilen sie sich).
 */
export type ZahnGestalt = {
  vorn: Anker[];
  spitzeV: number;
  seite: Anker[];
  spitzeS: number;
  quer: Anker[];
  ecken: [number, number, number, number];
  hoecker: number;
  wurzel: Wurzel;
  wurzelLaenge: number;
};
export type GestaltLinie = 'vorn' | 'seite' | 'quer';

/** `form` einer Reihe oder eines Zahns, wenn seine eigene Form gilt (keine Nummer einer Vorlage) */
export const EIGENE = -1;

/** wie die Vorlagen (`zahn.ts`): so viele Ringe und Punkte je Ring hat das Netz eines Zahns im Maul */
const RINGE = 16;
const SEG = 20;
/** das Netz in der Linse: feiner (dort steht der Zahn groß, und seine Linie liegt auf dem Rand) */
const RINGE_FEIN = 46;
const SEG_FEIN = 40;
/** so viele Proben je Stück einer Linie */
const FEIN = 40;
/** der Fortschritt längs einer Hälfte: gestiegene (oder gefallene) Höhe plus dieser Anteil des Wegs zur Seite */
const QUER_ANTEIL = 0.25;
/** Grenzen: kleinste Breite und Tiefe am Zahnfleisch, kleinste Höhe der Spitze, das Feld, in dem Anker liegen dürfen */
const WEIT_MIN = 0.08;
const HOCH_MIN = 0.1;
const FELD = 2.4;
const HOCH_MAX = 6;

// ---------- die Hälften ----------

/** eine Hälfte einer Linie, dicht abgetastet vom Zahnfleisch zur Spitze: Lagen, Fortschritt (0 … 1) und der Fortschritt ihrer Anker */
type Lauf = { x: Float64Array; y: Float64Array; p: Float64Array; anker: number[] };

function lauf(anker: readonly Anker[], von: number, bis: number): Lauf {
  const xs: number[] = [];
  const ys: number[] = [];
  const bei: number[] = [0];
  const d = bis >= von ? 1 : -1;
  for (let i = von; i !== bis; i += d) {
    const a = anker[i]!;
    const b = anker[i + d]!;
    // (rückwärts: dasselbe Stück, von hinten durchlaufen)
    const s = d > 0 ? stueckZwischen(a, b) : stueckZwischen(b, a);
    for (let k = i === von ? 0 : 1; k <= FEIN; k++) {
      const q = punktAufStueck(s, d > 0 ? k / FEIN : 1 - k / FEIN);
      xs.push(q.x);
      ys.push(q.y);
    }
    bei.push(xs.length - 1);
  }
  if (!xs.length) {
    const a = anker[von] ?? { x: 0, y: 0 };
    xs.push(a.x);
    ys.push(a.y);
  }
  const n = xs.length;
  const p = new Float64Array(n);
  for (let i = 1; i < n; i++) p[i] = p[i - 1]! + Math.abs(ys[i]! - ys[i - 1]!) + QUER_ANTEIL * Math.abs(xs[i]! - xs[i - 1]!);
  const ganz = p[n - 1]!;
  for (let i = 0; i < n; i++) p[i] = ganz > 1e-12 ? p[i]! / ganz : n > 1 ? i / (n - 1) : 0;
  return { x: Float64Array.from(xs), y: Float64Array.from(ys), p, anker: bei.map((i) => p[Math.min(i, n - 1)]!) };
}

/** die Stelle einer Hälfte beim Fortschritt `lam` */
function bei(L: Lauf, lam: number): [number, number] {
  const n = L.p.length;
  if (n < 2 || lam <= 0) return [L.x[0]!, L.y[0]!];
  if (lam >= 1) return [L.x[n - 1]!, L.y[n - 1]!];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L.p[m]! <= lam) lo = m;
    else hi = m;
  }
  const a = L.p[lo]!;
  const b = L.p[hi]!;
  const t = b > a ? (lam - a) / (b - a) : 0;
  return [L.x[lo]! + t * (L.x[hi]! - L.x[lo]!), L.y[lo]! + t * (L.y[hi]! - L.y[lo]!)];
}

/** die vier Hälften: links und rechts aus `vorn` (x, y), hinten und vorn aus `seite` (z, y) */
function haelften(g: ZahnGestalt): { L: Lauf; R: Lauf; H: Lauf; V: Lauf } {
  return {
    L: lauf(g.vorn, 0, g.spitzeV),
    R: lauf(g.vorn, g.vorn.length - 1, g.spitzeV),
    H: lauf(g.seite, 0, g.spitzeS),
    V: lauf(g.seite, g.seite.length - 1, g.spitzeS),
  };
}

// ---------- die Linie quer ----------

/**
 * Die Linie quer, `seg` Stellen rundum (ein Viertel je Viertel des Umlaufs, die geteilten Anker genau getroffen: Stelle 0 rechts,
 * `seg`/4 vorn, `seg`/2 links, 3 · `seg`/4 hinten). Je Stelle: ihre Lage zwischen den geteilten Ankern (`qx`: −1 am linken, +1 am
 * rechten; `qz`: −1 am hinteren, +1 am vorderen) und der Winkel im Umlauf (`c`, `s`: Kosinus und Sinus), nach dem die Höhe gemischt wird.
 */
function querStellen(g: ZahnGestalt, seg: number): { qx: number; qz: number; c: number; s: number }[] {
  const n = g.quer.length;
  const [r, v, l, h] = g.ecken;
  const mx = 0.5 * (g.quer[r]!.x + g.quer[l]!.x);
  const hx = 0.5 * (g.quer[r]!.x - g.quer[l]!.x) || 1e-9;
  const mz = 0.5 * (g.quer[v]!.y + g.quer[h]!.y);
  const hz = 0.5 * (g.quer[v]!.y - g.quer[h]!.y) || 1e-9;
  const je = seg / 4;
  const aus: { qx: number; qz: number; c: number; s: number }[] = [];
  const folge = [r, v, l, h, r];
  for (let q = 0; q < 4; q++) {
    // dieses Viertel dicht, mit seiner Länge
    const xs: number[] = [];
    const ys: number[] = [];
    let i = folge[q]!;
    const ende = folge[q + 1]!;
    let runden = 0;
    do {
      const j = (i + 1) % n;
      const st = stueckZwischen(g.quer[i]!, g.quer[j]!);
      for (let k = xs.length ? 1 : 0; k <= FEIN; k++) {
        const p = punktAufStueck(st, k / FEIN);
        xs.push(p.x);
        ys.push(p.y);
      }
      i = j;
    } while (i !== ende && ++runden < n);
    const m = xs.length;
    const L = new Float64Array(m);
    for (let k = 1; k < m; k++) L[k] = L[k - 1]! + Math.hypot(xs[k]! - xs[k - 1]!, ys[k]! - ys[k - 1]!);
    let k = 1;
    for (let j = 0; j < je; j++) {
      const ziel = (L[m - 1]! * j) / je;
      while (k < m - 1 && L[k]! < ziel) k++;
      const t = L[k]! > L[k - 1]! ? (ziel - L[k - 1]!) / (L[k]! - L[k - 1]!) : 0;
      const x = xs[k - 1]! + t * (xs[k]! - xs[k - 1]!);
      const z = ys[k - 1]! + t * (ys[k]! - ys[k - 1]!);
      const w = ((q + j / je) * Math.PI) / 2;
      aus.push({ qx: (x - mx) / hx, qz: (z - mz) / hz, c: Math.cos(w), s: Math.sin(w) });
    }
  }
  return aus;
}

// ---------- die Haut ----------

/** die Fortschritte der Ringe: oben dichter (wie die Vorlagen), und durch jeden Anker einer Hälfte geht ein Ring */
function ringStellen(H: { L: Lauf; R: Lauf; H: Lauf; V: Lauf }, ringe: number): number[] {
  const lam = Array.from({ length: ringe }, (_, i) => 1 - Math.pow(1 - i / (ringe - 1), 1.6));
  const schluessel = [...new Set([H.L, H.R, H.H, H.V].flatMap((l) => l.anker.slice(1, -1)).map((p) => Math.round(p * 1e4) / 1e4))].filter((p) => p > 0.02 && p < 0.98).sort((a, b) => a - b);
  const frei = new Set(Array.from({ length: ringe - 2 }, (_, i) => i + 1));
  for (const s of schluessel) {
    let best = -1;
    for (const i of frei) if (best < 0 || Math.abs(lam[i]! - s) < Math.abs(lam[best]! - s)) best = i;
    if (best < 0) break;
    lam[best] = s;
    frei.delete(best);
  }
  lam.sort((a, b) => a - b);
  // (zwei Ringe nie auf derselben Stelle)
  for (let i = 1; i < ringe - 1; i++) if (lam[i]! <= lam[i - 1]! + 1e-4) lam[i] = Math.min(lam[i - 1]! + 1e-4, 1 - 1e-4 * (ringe - i));
  lam[0] = 0;
  lam[ringe - 1] = 1;
  return lam;
}

/**
 * Das Netz der Krone: `ringe` Ringe zu `seg` Punkten vom Zahnfleisch (Ring 0, in der Ebene y = 0) zur Spitze (der letzte Ring
 * liegt in ihr), dann die Mitte des Bodens und die Spitze als Mitten der zwei Deckel. Punkte und Dreiecke in derselben Folge wie
 * bei den Vorlagen (`stapel` in `zahn.ts`). `lam`: der Fortschritt jedes Rings.
 */
export function gestaltBau(g: ZahnGestalt, ringe = RINGE, seg = SEG): { pos: Float32Array; idx: Uint32Array; lam: number[]; ringe: number; seg: number } {
  const H = haelften(g);
  const Q = querStellen(g, seg);
  const lam = ringStellen(H, ringe);
  const pos = new Float32Array(3 * (ringe * seg + 2));
  const hoch = bei(H.L, 1)[1];
  for (let i = 0; i < ringe; i++) {
    const [xl, yl] = bei(H.L, lam[i]!);
    const [xr, yr] = bei(H.R, lam[i]!);
    const [zh, yh] = bei(H.H, lam[i]!);
    const [zv, yv] = bei(H.V, lam[i]!);
    const mx = 0.5 * (xl + xr);
    const hx = 0.5 * (xr - xl);
    const mz = 0.5 * (zv + zh);
    const hz = 0.5 * (zv - zh);
    // Höcker (von der Vorlage): Oben wölbt sich die Fläche zwischen den vier Hälften und weitet sich ein wenig
    const kh = g.hoecker > 0 && hoch > 1e-9 ? Math.pow(klemmen((0.25 * (yl + yr + yv + yh)) / hoch, 0, 1), 5) : 0;
    for (let k = 0; k < seg; k++) {
      const q = Q[k]!;
      // die Höhe: durch die vier Stellen gelegt (bei gleicher mittlerer Höhe ein ebener, gekippter Ring)
      const y = 0.5 * (q.c * (1 + q.c) * yr + q.c * (q.c - 1) * yl + q.s * (1 + q.s) * yv + q.s * (q.s - 1) * yh);
      const dy = kh > 0 ? 0.1 * hoch * kh * (0.5 - 0.5 * (q.c * q.c * q.c * q.c - 6 * q.c * q.c * q.s * q.s + q.s * q.s * q.s * q.s)) : 0;
      const o = 3 * (i * seg + k);
      pos[o] = mx + hx * q.qx * (1 + 0.02 * kh);
      pos[o + 1] = y + dy;
      pos[o + 2] = mz + hz * q.qz * (1 + 0.02 * kh);
    }
  }
  // die Mitten der Deckel: unten der Schwerpunkt des ersten Rings, oben die Spitze selbst
  const boden = ringe * seg;
  for (let k = 0; k < seg; k++) for (let c = 0; c < 3; c++) pos[3 * boden + c] = pos[3 * boden + c]! + pos[3 * k + c]! / seg;
  const [xs, ys] = bei(H.L, 1);
  const zs = bei(H.H, 1)[0];
  pos[3 * (boden + 1)] = xs;
  pos[3 * (boden + 1) + 1] = ys;
  pos[3 * (boden + 1) + 2] = zs;
  const idx = new Uint32Array(3 * ((ringe - 1) * seg * 2 + 2 * seg));
  let o = 0;
  for (let i = 0; i + 1 < ringe; i++) {
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k;
      const c = i * seg + ((k + 1) % seg);
      const d = a + seg;
      const e = c + seg;
      idx[o++] = a;
      idx[o++] = d;
      idx[o++] = c;
      idx[o++] = c;
      idx[o++] = d;
      idx[o++] = e;
    }
  }
  for (let k = 0; k < seg; k++) {
    idx[o++] = k;
    idx[o++] = (k + 1) % seg;
    idx[o++] = boden;
  }
  for (let k = 0; k < seg; k++) {
    const a = (ringe - 1) * seg + k;
    idx[o++] = a;
    idx[o++] = boden + 1;
    idx[o++] = (ringe - 1) * seg + ((k + 1) % seg);
  }
  return { pos, idx, lam, ringe, seg };
}

/** Normalen je Punkt aus den Dreiecken (nach Fläche gewichtet, wie `computeVertexNormals`) */
export function normalen(pos: ArrayLike<number>, idx: ArrayLike<number>): Float32Array {
  const nor = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const a = 3 * idx[i]!;
    const b = 3 * idx[i + 1]!;
    const c = 3 * idx[i + 2]!;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) {
      nor[p] = nor[p]! + nx;
      nor[p + 1] = nor[p + 1]! + ny;
      nor[p + 2] = nor[p + 2]! + nz;
    }
  }
  for (let i = 0; i < nor.length; i += 3) {
    const l = Math.hypot(nor[i]!, nor[i + 1]!, nor[i + 2]!) || 1;
    nor[i] = nor[i]! / l;
    nor[i + 1] = nor[i + 1]! / l;
    nor[i + 2] = nor[i + 2]! / l;
  }
  return nor;
}

/** das Netz eines Zahns im Maul (wie `FormNetz` in `zaehne.ts`): Lagen, Normalen, Dreiecke, die Länge der Krone, ihre Tiefe */
export type GestaltNetz = { pos: Float32Array; nor: Float32Array; idx: Uint32Array; laenge: number; tiefe: number };
const netze = new WeakMap<ZahnGestalt, GestaltNetz>();
/** das Netz einer Gestalt für das Maul, je Gestalt einmal gebaut (so viele Punkte und Dreiecke wie eine Vorlage) */
export function gestaltNetz(g: ZahnGestalt): GestaltNetz {
  let n = netze.get(g);
  if (!n) {
    const b = gestaltBau(g);
    let hoch = 0;
    for (let i = 0; i < b.pos.length; i += 3) hoch = Math.max(hoch, b.pos[i + 1]!);
    // die Tiefe: die des tiefsten Rings (von hinten nach vorn), nicht die Ausdehnung des ganzen, vielleicht gebogenen Zahns
    let tief = 0;
    for (let i = 0; i < b.ringe; i++) tief = Math.max(tief, b.pos[3 * (i * b.seg + b.seg / 4) + 2]! - b.pos[3 * (i * b.seg + (3 * b.seg) / 4) + 2]!);
    n = { pos: b.pos, nor: normalen(b.pos, b.idx), idx: b.idx, laenge: Math.max(HOCH_MIN, hoch), tiefe: Math.max(WEIT_MIN, tief) };
    netze.set(g, n);
  }
  return n;
}
/** das feinere Netz für die Linse (nur die Krone; die Wurzel hängt an, wer sie zeigt) */
export const gestaltBauFein = (g: ZahnGestalt): ReturnType<typeof gestaltBau> => gestaltBau(g, RINGE_FEIN, SEG_FEIN);

/** ein Netz zwischen zwei Netzen gleicher Folge (t von 0 bis 1): der weiche Wechsel, sobald eine eigene Form beteiligt ist */
export function netzGemischt(a: GestaltNetz, b: GestaltNetz, t: number): GestaltNetz {
  if (a.pos.length !== b.pos.length || a.idx.length !== b.idx.length) return t < 0.5 ? a : b;
  const u = Math.max(0, Math.min(1, t));
  const pos = new Float32Array(a.pos.length);
  for (let i = 0; i < pos.length; i++) pos[i] = a.pos[i]! + u * (b.pos[i]! - a.pos[i]!);
  return { pos, nor: normalen(pos, a.idx), idx: a.idx, laenge: a.laenge + u * (b.laenge - a.laenge), tiefe: a.tiefe + u * (b.tiefe - a.tiefe) };
}

// ---------- eine Vorlage als Linien ----------

const spiegelX = (v: { x: number; y: number } | null): { x: number; y: number } | null => (v ? { x: -v.x, y: v.y } : null);
/** eine offene Folge von Ankern, andersherum durchlaufen */
const umgekehrt = (a: readonly Anker[]): Anker[] => [...a].reverse().map((q) => ({ x: q.x, y: q.y, ein: q.aus, aus: q.ein, ecke: q.ecke }));
/** zwei Griffe an einem Anker liegen (bis auf `grad`) auf einer Geraden */
function inFlucht(ein: { x: number; y: number } | null, aus: { x: number; y: number } | null, grad = 8): boolean {
  if (!ein || !aus) return false;
  const le = Math.hypot(ein.x, ein.y);
  const la = Math.hypot(aus.x, aus.y);
  if (le < 1e-9 || la < 1e-9) return false;
  return -(ein.x * aus.x + ein.y * aus.y) / (le * la) > Math.cos((grad * Math.PI) / 180);
}

const TREUE = 0.012;
const SCHRITT = 0.02;
/** eine abgetastete Hälfte als Anker (die wenigsten, die sie bis auf `TREUE` treffen); die Enden liegen genau auf ihr */
function ankerAus(spur: { x: number; y: number }[]): Anker[] {
  const p: Pfad = anpassen(spur, { treue: TREUE, schritt: SCHRITT, geschlossen: false }).pfad;
  const a = p.anker.map((q) => ({ ...q }));
  if (a.length >= 2) {
    const e = spur[spur.length - 1]!;
    a[0] = { ...a[0]!, x: spur[0]!.x, y: spur[0]!.y };
    a[a.length - 1] = { ...a[a.length - 1]!, x: e.x, y: e.y };
  }
  return a;
}

/** Jede Vorlage als Linien: ihre vier Hälften und ihr Querschnitt, abgetastet und mit den wenigsten Ankern angepasst */
export function gestaltAusForm(f: ZahnForm): ZahnGestalt {
  const hx = 0.5 * f.breite;
  const hz = 0.5 * f.tiefe;
  const N = 240;
  // (die Achse der Vorlage: ein Kreisbogen nach innen, wie in `zahnNetz`)
  const achse = (u: number): { y: number; z: number; w: number } => {
    const w = f.bogen * u;
    if (Math.abs(f.bogen) < 1e-4) return { y: f.laenge * u, z: 0, w: 0 };
    const r = f.laenge / f.bogen;
    return { y: r * Math.sin(w), z: -r * (1 - Math.cos(w)), w };
  };
  const spur = (ort: (u: number) => { x: number; y: number }): { x: number; y: number }[] =>
    Array.from({ length: N + 1 }, (_, i) => {
      // (oben dichter: Dort fällt das Profil steil zur Spitze)
      const u = 1 - Math.pow(1 - i / N, 2);
      return ort(u);
    });
  // von vorn: links vom Zahnfleisch zur Spitze, rechts sein Spiegelbild
  const links = ankerAus(spur((u) => ({ x: -hx * kronenProfil(f, u), y: achse(u).y })));
  const spitze = links[links.length - 1]!;
  const aus0 = spiegelX(spitze.ein);
  const rund = inFlucht(spitze.ein, aus0, 25);
  const vornSpitze: Anker = rund ? { x: spitze.x, y: spitze.y, ein: spitze.ein ? { x: spitze.ein.x, y: 0 } : null, aus: aus0 ? { x: aus0.x, y: 0 } : null, ecke: false } : { x: spitze.x, y: spitze.y, ein: spitze.ein, aus: aus0, ecke: true };
  const rechts = umgekehrt(links.slice(0, -1)).map((q) => ({ x: -q.x, y: q.y, ein: spiegelX(q.ein), aus: spiegelX(q.aus), ecke: q.ecke }));
  const vorn: Anker[] = [...links.slice(0, -1), vornSpitze, ...rechts];
  // von der Seite: hinten und vorn (mit der Biegung der Achse), jede vom Zahnfleisch zur Spitze
  const hinten = ankerAus(
    spur((u) => {
      const a = achse(u);
      const r = hz * kronenProfil(f, u);
      return { x: a.z - r * Math.cos(a.w), y: a.y - r * Math.sin(a.w) };
    }),
  );
  const vorne = ankerAus(
    spur((u) => {
      const a = achse(u);
      const r = hz * kronenProfil(f, u);
      return { x: a.z + r * Math.cos(a.w), y: a.y + r * Math.sin(a.w) };
    }),
  );
  const sh = hinten[hinten.length - 1]!;
  const sv = vorne[vorne.length - 1]!;
  const seiteSpitze: Anker = { x: sh.x, y: sh.y, ein: sh.ein, aus: sv.ein, ecke: !inFlucht(sh.ein, sv.ein, 25) };
  const seite: Anker[] = [...hinten.slice(0, -1), seiteSpitze, ...umgekehrt(vorne.slice(0, -1))];
  // quer am Zahnfleisch: vier Viertel des Querschnitts (rechts, vorn, links, hinten)
  const r0 = kronenProfil(f, 0);
  const hochN = (x: number): number => Math.sign(x) * Math.pow(Math.abs(x), 2 / f.kasten);
  const viertel = (q: number): Anker[] => ankerAus(Array.from({ length: 61 }, (_, i) => ((w) => ({ x: hochN(Math.cos(w)) * hx * r0, y: hochN(Math.sin(w)) * hz * r0 }))(((q + i / 60) * Math.PI) / 2)));
  const quer: Anker[] = [];
  const ecken: number[] = [];
  const teile = [0, 1, 2, 3].map(viertel);
  for (let q = 0; q < 4; q++) {
    const t = teile[q]!;
    const davor = teile[(q + 3) % 4]!;
    const a = t[0]!;
    // (an den vier geteilten Ankern steht die Linie genau quer zur Achse dorthin: rund, Griffe senkrecht beziehungsweise waagerecht)
    const ein = davor[davor.length - 1]!.ein;
    const quer0 = q % 2 === 0;
    ecken.push(quer.length);
    quer.push({ x: a.x, y: a.y, ein: ein ? (quer0 ? { x: 0, y: ein.y } : { x: ein.x, y: 0 }) : null, aus: a.aus ? (quer0 ? { x: 0, y: a.aus.y } : { x: a.aus.x, y: 0 }) : null, ecke: false });
    for (const m of t.slice(1, -1)) quer.push({ ...m });
  }
  return gestaltAngleichen({ vorn, spitzeV: links.length - 1, seite, spitzeS: hinten.length - 1, quer, ecken: ecken as [number, number, number, number], hoecker: f.hoecker >= 4 ? 4 : 0, wurzel: f.wurzel, wurzelLaenge: f.wurzelLaenge }, 'vorn');
}

// ---------- ordnen: was die Linien teilen, und die Grenzen ----------

const klemmen = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

/**
 * Die Gestalt ordnen, nachdem `von` geändert wurde: Die Punkte am Zahnfleisch liegen auf seiner Höhe (y = 0), die Spitze hat in
 * `vorn` und `seite` dieselbe Höhe, und die vier geteilten Anker haben in `quer` dasselbe x beziehungsweise z wie in ihrer Linie.
 * Die geänderte Linie gibt vor; die zwei anderen folgen an den geteilten Punkten. Dazu die Grenzen (Feld, kleinste Breite, Tiefe
 * und Höhe). Eine neue Gestalt; die alte bleibt.
 */
export function gestaltAngleichen(g: ZahnGestalt, von: GestaltLinie): ZahnGestalt {
  const kopie = (a: readonly Anker[]): Anker[] => a.map((q) => ({ ...q }));
  const vorn = kopie(g.vorn);
  const seite = kopie(g.seite);
  const quer = kopie(g.quer);
  const [r, v, l, h] = g.ecken;
  const nv = vorn.length - 1;
  const ns = seite.length - 1;
  // das Feld und die Höhe: Anker der Krone liegen nicht unter dem Zahnfleisch
  for (const a of [...vorn, ...seite]) {
    a.x = klemmen(a.x, -FELD, FELD);
    a.y = klemmen(a.y, 0, HOCH_MAX);
  }
  for (const a of quer) {
    a.x = klemmen(a.x, -FELD, FELD);
    a.y = klemmen(a.y, -FELD, FELD);
  }
  // was geteilt ist: Die geänderte Linie gibt vor
  if (von === 'quer') {
    vorn[0]!.x = quer[l]!.x;
    vorn[nv]!.x = quer[r]!.x;
    seite[0]!.x = quer[h]!.y;
    seite[ns]!.x = quer[v]!.y;
  }
  if (von === 'seite') vorn[g.spitzeV]!.y = seite[g.spitzeS]!.y;
  // die kleinsten Maße: Breite und Tiefe am Zahnfleisch, Höhe der Spitze
  if (vorn[nv]!.x - vorn[0]!.x < WEIT_MIN) {
    const m = 0.5 * (vorn[nv]!.x + vorn[0]!.x);
    vorn[0]!.x = m - 0.5 * WEIT_MIN;
    vorn[nv]!.x = m + 0.5 * WEIT_MIN;
  }
  if (seite[ns]!.x - seite[0]!.x < WEIT_MIN) {
    const m = 0.5 * (seite[ns]!.x + seite[0]!.x);
    seite[0]!.x = m - 0.5 * WEIT_MIN;
    seite[ns]!.x = m + 0.5 * WEIT_MIN;
  }
  vorn[g.spitzeV]!.y = Math.max(HOCH_MIN, vorn[g.spitzeV]!.y);
  vorn[0]!.y = 0;
  vorn[nv]!.y = 0;
  seite[0]!.y = 0;
  seite[ns]!.y = 0;
  seite[g.spitzeS]!.y = vorn[g.spitzeV]!.y;
  quer[l]!.x = vorn[0]!.x;
  quer[r]!.x = vorn[nv]!.x;
  quer[h]!.y = seite[0]!.x;
  quer[v]!.y = seite[ns]!.x;
  return { ...g, vorn, seite, quer };
}

/** einen Anker einer Linie löschen (die geteilten bleiben: dann null). Die Nachbarn behalten ihre Griffe. */
export function gestaltOhneAnker(g: ZahnGestalt, linie: GestaltLinie, k: number): ZahnGestalt | null {
  if (linie === 'vorn') {
    if (k <= 0 || k >= g.vorn.length - 1 || k === g.spitzeV) return null;
    return { ...g, vorn: g.vorn.filter((_, i) => i !== k), spitzeV: g.spitzeV - (k < g.spitzeV ? 1 : 0) };
  }
  if (linie === 'seite') {
    if (k <= 0 || k >= g.seite.length - 1 || k === g.spitzeS) return null;
    return { ...g, seite: g.seite.filter((_, i) => i !== k), spitzeS: g.spitzeS - (k < g.spitzeS ? 1 : 0) };
  }
  if (k < 0 || k >= g.quer.length || g.ecken.includes(k)) return null;
  return { ...g, quer: g.quer.filter((_, i) => i !== k), ecken: g.ecken.map((e) => e - (k < e ? 1 : 0)) as [number, number, number, number] };
}

/** der Umriss der Gestalt von vorn als Pfad (für das Zeichen am Formenring, wie `zahnUmriss`): Breite 1 ≙ `mass` */
export function gestaltUmriss(g: ZahnGestalt, mass: number): string {
  let hoch = 1.2;
  for (const a of g.vorn) hoch = Math.max(hoch, a.y);
  const k = mass / hoch;
  const mitte = 0.5 * (g.vorn[0]!.x + g.vorn[g.vorn.length - 1]!.x);
  const X = (x: number): string => ((x - mitte) * k).toFixed(2);
  const Y = (y: number): string => (-y * k).toFixed(2);
  let d = `M${X(g.vorn[0]!.x)},${Y(g.vorn[0]!.y)}`;
  for (let i = 0; i + 1 < g.vorn.length; i++) {
    const s = stueckZwischen(g.vorn[i]!, g.vorn[i + 1]!);
    d += `C${X(s[1].x)},${Y(s[1].y)} ${X(s[2].x)},${Y(s[2].y)} ${X(s[3].x)},${Y(s[3].y)}`;
  }
  return `${d}Z`;
}

// ---------- die Linie einer Ansicht als Netz der Linien-Anzeige ----------

/** Lagen im Netz aus denen der Linie (u, v): X = ax · u + bx · v + ox, Y = ay · u + by · v + oy */
export type Abbildung = { ax: number; ay: number; bx: number; by: number; ox: number; oy: number };

const linieVon = (g: ZahnGestalt, linie: GestaltLinie): Anker[] => (linie === 'vorn' ? g.vorn : linie === 'seite' ? g.seite : g.quer);

/**
 * Eine Linie der Gestalt als Netz (`linien/netz.ts`): ihre Anker als sichtbare Punkte in der Folge der Linie, ihre Griffe an den
 * Stücken, Ecken als Knick. `fest`: die Nummern der geteilten Punkte im Netz (vorn und Seite: Zahnfleisch, Spitze, Zahnfleisch;
 * quer: rechts, vorn, links, hinten). Fehlende Griffe (gerade auf den Nachbarn zu) stehen im Netz als ein Drittel der Sehne.
 */
export function gestaltAlsNetz(g: ZahnGestalt, linie: GestaltLinie, A: Abbildung): { netz: Netz; fest: number[] } {
  const anker = linieVon(g, linie);
  const zu = linie === 'quer';
  const n = anker.length;
  const P = (x: number, y: number): [number, number] => [A.ax * x + A.bx * y + A.ox, A.ay * x + A.by * y + A.oy];
  const V = (x: number, y: number): [number, number] => [A.ax * x + A.bx * y, A.ay * x + A.by * y];
  const punkte = anker.map((a) => {
    const [x, y] = P(a.x, a.y);
    return { x, y, sichtbar: true, verdeckt: false };
  });
  const stuecke: Linie['stuecke'] = [];
  for (let i = 0; i < (zu ? n : n - 1); i++) {
    const s = stueckZwischen(anker[i]!, anker[(i + 1) % n]!);
    const [g1x, g1y] = V(s[1].x - s[0].x, s[1].y - s[0].y);
    const [g2x, g2y] = V(s[2].x - s[3].x, s[2].y - s[3].y);
    stuecke.push({ g1x, g1y, g2x, g2y, art: 'umriss' });
  }
  const netz: Netz = { punkte, linien: [{ zu, punkte: anker.map((_, i) => i), stuecke, knick: anker.map((a) => a.ecke) }] };
  const fest = linie === 'vorn' ? [0, g.spitzeV, n - 1] : linie === 'seite' ? [0, g.spitzeS, n - 1] : [...g.ecken];
  return { netz, fest };
}

/**
 * Die Gestalt mit der Linie, wie sie im Netz steht (nach einem Griff: Punkte gezogen, Richtungen gedreht, mit P ein Punkt mehr).
 * `fest`: die Nummern der geteilten Punkte im Netz, wie `gestaltAlsNetz` sie gab (ein neuer Punkt bekommt im Netz eine neue
 * Nummer, die alten bleiben). Null: Das Netz trägt die Linie nicht mehr (ein geteilter Punkt fehlt). Danach geordnet.
 */
export function gestaltAusNetz(g: ZahnGestalt, linie: GestaltLinie, netz: Netz, fest: readonly number[], A: Abbildung): ZahnGestalt | null {
  const l = netz.linien[0];
  if (!l) return null;
  const det = A.ax * A.by - A.bx * A.ay;
  if (Math.abs(det) < 1e-12) return null;
  const V = (x: number, y: number): { x: number; y: number } => ({ x: (A.by * x - A.bx * y) / det, y: (-A.ay * x + A.ax * y) / det });
  const n = l.punkte.length;
  const zu = linie === 'quer';
  if (l.zu !== zu || l.stuecke.length !== (zu ? n : n - 1)) return null;
  const anker: Anker[] = l.punkte.map((pi, k) => {
    const p = netz.punkte[pi]!;
    const lage = V(p.x - A.ox, p.y - A.oy);
    const aus = zu || k < n - 1 ? l.stuecke[k % l.stuecke.length]! : null;
    const ein = zu || k > 0 ? l.stuecke[(k - 1 + l.stuecke.length) % l.stuecke.length]! : null;
    return { x: lage.x, y: lage.y, ein: ein ? V(ein.g2x, ein.g2y) : null, aus: aus ? V(aus.g1x, aus.g1y) : null, ecke: !!l.knick?.[k] };
  });
  const stelle = fest.map((pi) => l.punkte.indexOf(pi));
  if (stelle.some((k) => k < 0)) return null;
  let neu: ZahnGestalt;
  if (linie === 'vorn') {
    if (stelle[0] !== 0 || stelle[2] !== n - 1) return null;
    neu = { ...g, vorn: anker, spitzeV: stelle[1]! };
  } else if (linie === 'seite') {
    if (stelle[0] !== 0 || stelle[2] !== n - 1) return null;
    neu = { ...g, seite: anker, spitzeS: stelle[1]! };
  } else neu = { ...g, quer: anker, ecken: stelle as [number, number, number, number] };
  return gestaltAngleichen(neu, linie);
}

/** die Lagen im Netz, wie die geordnete Gestalt sie verlangt (nach `gestaltAusNetz`): nur die Punkte, in der Folge der Linie */
export function netzLagen(g: ZahnGestalt, linie: GestaltLinie, A: Abbildung): [number, number][] {
  return linieVon(g, linie).map((a) => [A.ax * a.x + A.bx * a.y + A.ox, A.ay * a.x + A.by * a.y + A.oy]);
}
