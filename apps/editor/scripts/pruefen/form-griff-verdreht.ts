// Form zuerst (11.11.2026): einen Griff einer gesicherten Form auf die falsche Seite drehen, die Haut zur Ruhe kommen lassen (wie
// nach dem Loslassen), dann zurückdrehen – im Kern, ohne Fenster und ohne Verdichten. Kommt die Haut wieder an, wo sie war?
// Anlass: Florians Form `test_kaputt` („es darf nicht jedes Mal, wenn ich versehentlich ein Handle falschherum drehe, das Mesh
// kaputt gehen“). Im Fenster blieb nach dem Zurückdrehen ein Rest; hier lassen sich die Teilschritte einzeln tauschen:
//   (ohne Schalter)  derselbe Löser dreht zurück                              → gemessen 0 Knicke über 150°, Rauminhalt 100,0 %
//   NEU=1            wie das Fenster nach dem Loslassen: Linien und Griffe festlegen, neuer Löser, zerlegt auf der gefalteten
//                    Haut                                                      → 4 Knicke über 150°, Rauminhalt 99,0 %
//   NEU=1 VORLAGE=1  neuer Löser mit der Zerlegung von vor dem Verdrehen       → 0 Knicke, 100,0 %
// Daraus die Regel im Fenster (`nachZugAufraeumen`): Solange sich eine Linie selbst kreuzt, bleiben Netz und Zerlegung.
// Aufruf aus packages/shape: NAME=test_kaputt PUNKT=4:oben GRIFF=aus WEG="-200,-17,0" npx vite-node ../../apps/editor/scripts/pruefen/form-griff-verdreht.ts
//   JE=5 (Runden je Mausschritt)  SCHRITTE=12  RUHE=60 (Runden nach dem Verdrehen und nach dem Zurückdrehen)  SETZEN=<Runden mit dem neuen Löser>
//   FLUSS=0/1  VORSICHT=0  EINSETZEN=0 (lose Loops nicht einsetzen)  HALTEN=0 (nicht loslassen: gleich zurück)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type GriffVersatz, type Loop, LoopZug, festlegen, griffZiehen, griffeNach, hautLagen, linieKreuztSich, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { entpacken } from '../../src/form/ablage';

const FLUSS_ART: { normalfluss?: boolean } = process.env.FLUSS === '1' ? { normalfluss: true } : process.env.FLUSS === '0' ? { normalfluss: false } : {};
const VORSICHT = process.env.VORSICHT !== '0';
const datei = process.env.DATEI ?? fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'test_kaputt'}.eewesen`, import.meta.url));
const SCHRITTE = Number(process.env.SCHRITTE ?? 12);
const JE = Number(process.env.JE ?? 5);
const RUHE = Number(process.env.RUHE ?? 60);
const HALTEN = process.env.HALTEN !== '0';
const [pl, pwas] = (process.env.PUNKT ?? '4:oben').split(':') as [string, string];
const seite = (process.env.GRIFF ?? 'aus') as 'ein' | 'aus';
const [wx, wy, wz] = (process.env.WEG ?? '-200,-17,0').split(',').map(Number) as [number, number, number];

const st = entpacken(new Uint8Array(fs.readFileSync(datei)));
let f: { pos: Float64Array; tri: Uint32Array; n: number; spiegel: Int32Array } = st.haut;
let nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(st.haut.nb.subarray(st.haut.nbStart[v]!, st.haut.nbStart[v + 1]!));
let loops: Loop[] = st.loops;
if (process.env.EINSETZEN !== '0')
  for (let li = 0; li < loops.length; li++) {
    if (loops[li]!.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) continue;
    const r = loopEinsetzen({ pos: f.pos, tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel }, loops, li);
    if (!r) continue;
    f = r.haut;
    nachbarn = r.haut.nachbarn;
    loops = r.loops;
  }
const h: Haut = { pos: Float64Array.from(f.pos), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };

function normalen(): { fn: Float64Array; vn: Float64Array } {
  const P = h.pos;
  const T = h.tri;
  const vn = new Float64Array(P.length);
  const fn = new Float64Array(T.length);
  for (let i = 0; i < T.length; i += 3) {
    const a = 3 * T[i]!;
    const b = 3 * T[i + 1]!;
    const c = 3 * T[i + 2]!;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    fn[i] = uy * vz - uz * vy;
    fn[i + 1] = uz * vx - ux * vz;
    fn[i + 2] = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      vn[v] = vn[v]! + fn[i]!;
      vn[v + 1] = vn[v + 1]! + fn[i + 1]!;
      vn[v + 2] = vn[v + 2]! + fn[i + 2]!;
    }
  }
  return { fn, vn };
}
/** umgeschlagene Dreiecke (wie im Fenster), Knicke über 150° (Winkel zwischen den Normalen zweier Nachbardreiecke), Rauminhalt */
function stand(): { umg: number; knicke: number; inhalt: number } {
  const P = h.pos;
  const T = h.tri;
  const { fn, vn } = normalen();
  let umg = 0;
  let inhalt = 0;
  const kante = new Map<number, number>();
  let knicke = 0;
  const cos150 = Math.cos((150 * Math.PI) / 180);
  for (let i = 0; i < T.length; i += 3) {
    const e = [T[i]!, T[i + 1]!, T[i + 2]!];
    const a = 3 * e[0]!;
    const b = 3 * e[1]!;
    const c = 3 * e[2]!;
    if (fn[i]! * (vn[a]! + vn[b]! + vn[c]!) + fn[i + 1]! * (vn[a + 1]! + vn[b + 1]! + vn[c + 1]!) + fn[i + 2]! * (vn[a + 2]! + vn[b + 2]! + vn[c + 2]!) < 0) umg++;
    inhalt += (P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) - P[a + 1]! * (P[b]! * P[c + 2]! - P[b + 2]! * P[c]!) + P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!)) / 6;
    for (let k = 0; k < 3; k++) {
      const u = e[k]!;
      const w = e[(k + 1) % 3]!;
      const key = u < w ? u * h.n + w : w * h.n + u;
      const t2 = kante.get(key);
      if (t2 === undefined) kante.set(key, i);
      else {
        const d = fn[i]! * fn[t2]! + fn[i + 1]! * fn[t2 + 1]! + fn[i + 2]! * fn[t2 + 2]!;
        const la = Math.hypot(fn[i]!, fn[i + 1]!, fn[i + 2]!);
        const lb = Math.hypot(fn[t2]!, fn[t2 + 1]!, fn[t2 + 2]!);
        if (la > 0 && lb > 0 && d / (la * lb) < cos150) knicke++;
      }
    }
  }
  return { umg, knicke, inhalt };
}

const l = loops.find((x) => String(x.id) === pl)!;
const sucht: Record<string, (p: V3, b: V3) => boolean> = {
  oben: (p, b) => p.y > b.y,
  unten: (p, b) => p.y < b.y,
  vorn: (p, b) => p.x < b.x,
  hinten: (p, b) => p.x > b.x,
  aussen: (p, b) => p.z > b.z,
};
const pi = /^\d+$/.test(pwas) ? Number(pwas) : l.punkte.reduce((bi, p, i) => (sucht[pwas]!(p.ref, l.punkte[bi]!.ref) ? i : bi), 0);
let z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorsicht: VORSICHT, ...FLUSS_ART });
/** NEU=1: wie das Fenster nach dem Loslassen: Griffe und Linien festlegen und für das Zurückdrehen einen neuen Löser auf der verdrehten Haut anlegen */
const NEU = process.env.NEU === '1';
/** Vorzeichen und Bezug des Zugs: nach dem Festlegen wird gegen die verdrehte Lage zurückgezogen */
let richtung = 1;
const ruhig = loops.map(() => null);
const D0: V3[] = l.punkte.map(() => ({ x: 0, y: 0, z: 0 }));
const zielBei = (a: number): (Float64Array | null)[] => {
  const gv: GriffVersatz = griffZiehen(l, pi, seite, { x: richtung * a * wx, y: richtung * a * wy, z: richtung * a * wz });
  const d = verschiebungLaengs(
    l,
    D0,
    l.punkte.map((_, q) => (q === pi ? gv : undefined)),
  );
  return loops.map((x) => (x === l ? d : null));
};
const zeile = (name: string, bezug: Float64Array | null): void => {
  const s = stand();
  let weit = 0;
  let n1 = 0;
  if (bezug) {
    const a: number[] = [];
    for (let i = 0; i < bezug.length; i += 3) a.push(Math.hypot(h.pos[i]! - bezug[i]!, h.pos[i + 1]! - bezug[i + 1]!, h.pos[i + 2]! - bezug[i + 2]!));
    a.sort((x, y) => x - y);
    weit = a[a.length - 1]!;
    n1 = a[Math.floor(0.99 * a.length)]!;
  }
  const gekreuzt = loops.filter((x) => linieKreuztSich(x, hautLagen(h, x))).map((x) => x.id);
  console.log(`${name}: umgeschlagen ${s.umg}, Knicke über 150° ${s.knicke}, Rauminhalt ${(s.inhalt / inhalt0 * 100).toFixed(1)} %${bezug ? `, gegen die Form davor bis ${weit.toFixed(2)} (99 % ${n1.toFixed(2)})` : ''}${gekreuzt.length ? ` · Loop ${gekreuzt.join(', ')} kreuzt sich selbst` : ''}`);
};

for (let r = 0; r < RUHE; r++) z.schritt(ruhig, 1);
const inhalt0 = stand().inhalt;
const A = Float64Array.from(h.pos);
console.log(`${datei.split('/').pop()}: ${h.n} Punkte · Punkt ${l.id}:${pi} (${l.punkte[pi]!.ref.x.toFixed(0)}, ${l.punkte[pi]!.ref.y.toFixed(0)}, ${l.punkte[pi]!.ref.z.toFixed(0)}), Griff ${seite} um ${wx},${wy},${wz} · ${JE} Runden je Schritt${FLUSS_ART.normalfluss === undefined ? '' : FLUSS_ART.normalfluss ? ' · Normalfluss erzwungen' : ' · ohne Normalfluss'}`);
zeile('gesetzt', null);
let d = zielBei(0);
for (let s = 1; s <= SCHRITTE; s++) {
  d = zielBei(s / SCHRITTE);
  for (let q = 0; q < JE; q++) z.schritt(d, 1);
}
zeile('verdreht, gehalten', A);
if (HALTEN) {
  for (let r = 0; r < RUHE; r++) z.schritt(d, 1);
  zeile(`verdreht, nach ${RUHE} Runden`, A);
}
if (NEU) {
  const gv: GriffVersatz = griffZiehen(l, pi, seite, { x: wx, y: wy, z: wz });
  const gNeu = griffeNach(
    l,
    D0,
    l.punkte.map((_, q) => (q === pi ? gv : undefined)),
  );
  l.punkte.forEach((p, i) => {
    p.ein = gNeu[i]!.ein;
    p.aus = gNeu[i]!.aus;
  });
  for (const x of loops) festlegen(h, x, false);
  // VORLAGE=1: der neue Löser übernimmt die Zerlegung (und die Gewichte der Matrix) des alten, wie sie vor dem Verdrehen war
  const vorlage = process.env.VORLAGE === '1' ? z.vorlage : null;
  z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorsicht: VORSICHT, ...FLUSS_ART, ...(vorlage ? { vorlage } : {}) });
  if (vorlage) console.log(`Vorlage des alten Lösers ${(z.loeser as { vorlageGenutzt?: boolean }).vorlageGenutzt ? 'übernommen' : 'NICHT übernommen'}`);
  const ruhig2 = loops.map(() => null);
  for (let r = 0; r < Number(process.env.SETZEN ?? 0); r++) z.schritt(ruhig2, 1);
  if (Number(process.env.SETZEN ?? 0) > 0) zeile(`verdreht, neuer Löser, nach ${process.env.SETZEN} Runden`, A);
  richtung = -1;
  for (let s = 1; s <= SCHRITTE; s++) {
    d = zielBei(s / SCHRITTE);
    for (let q = 0; q < JE; q++) z.schritt(d, 1);
  }
} else
  for (let s = SCHRITTE - 1; s >= 0; s--) {
    d = zielBei(s / SCHRITTE);
    for (let q = 0; q < JE; q++) z.schritt(d, 1);
  }
zeile('zurück, gehalten', A);
let runden = 0;
for (const bis of [10, 30, RUHE]) {
  while (runden < bis) {
    z.schritt(d, 1);
    runden++;
  }
  zeile(`zurück, nach ${bis} Runden`, A);
}
