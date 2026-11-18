// C2 im Plan „Ozzy stabil und schnell“ (18.11.2026), der Beweis im Kern: ein gebogener Strich quer über die Form, in Seite, Front
// und Top, gibt einen Loop rundum (`loopAusVorhang`: der Schnitt der Haut mit dem Vorhang durch den Strich längs der Blickrichtung).
// Je Form und Ansicht ein Bogen aus drei Punkten (Anfang und Ende im Leeren, der mittlere auf der Form, versetzt). Gemessen:
//   - wie weit der Loop in der Ansicht neben dem Strich liegt (größter Abstand seiner Punkte; Kriterium: höchstens 0,5 Bildpunkte,
//     bei 1,15 Bildpunkten je Einheit also 0,43 Einheiten),
//   - umgeschlagene Dreiecke vor und nach dem Einsetzen ins Netz (samt Zusammenlegen der Nadeln, wie im Fenster; Kriterium: keine neuen),
//   - Punkte ohne Spiegelbild danach (keine).
// Dazu ein Bild je Form (SVG): Umriss der Form, der Strich (rot), der Loop (schwarz; die Rückseite dünn) in den drei Ansichten.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-vorhang.ts [ordner für Bilder]
//   NAME="strange bird,teat firefish" (gesicherte Formen; dazu immer die Kugel)
import fs from 'node:fs';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { type Ansicht, type Loop, blickTiefe, blickUV, loopAusVorhang, mittlereKante } from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { nadelnZusammenlegen } from '../../../../packages/shape/src/dicht/verdichten';
import { formLaden } from './form-direkt-faelle';

const ordner = process.argv[2] ?? '';
const NAMEN = (process.env.NAME ?? 'strange bird').split(',').filter(Boolean);
const PX = 1.15;
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');

const umgeschlagen = (h: Haut): number => {
  const P = h.pos;
  const vn = new Float64Array(P.length);
  const fn = new Float64Array(h.tri.length);
  for (let i = 0; i < h.tri.length; i += 3) {
    const [a, b, c] = [3 * h.tri[i]!, 3 * h.tri[i + 1]!, 3 * h.tri[i + 2]!];
    const f = [(P[b + 1]! - P[a + 1]!) * (P[c + 2]! - P[a + 2]!) - (P[b + 2]! - P[a + 2]!) * (P[c + 1]! - P[a + 1]!), (P[b + 2]! - P[a + 2]!) * (P[c]! - P[a]!) - (P[b]! - P[a]!) * (P[c + 2]! - P[a + 2]!), (P[b]! - P[a]!) * (P[c + 1]! - P[a + 1]!) - (P[b + 1]! - P[a + 1]!) * (P[c]! - P[a]!)];
    for (let x = 0; x < 3; x++) {
      fn[i + x] = f[x]!;
      for (const v of [a, b, c]) vn[v + x] = vn[v + x]! + f[x]!;
    }
  }
  let z = 0;
  for (let i = 0; i < h.tri.length; i += 3) {
    let d = 0;
    for (let x = 0; x < 3; x++) d += fn[i + x]! * (vn[3 * h.tri[i]! + x]! + vn[3 * h.tri[i + 1]! + x]! + vn[3 * h.tri[i + 2]! + x]!);
    if (d < 0) z++;
  }
  return z;
};
const ohnePartner = (h: Haut): number => {
  let n = 0;
  for (let v = 0; v < h.n; v++) if (!(h.spiegel[v]! >= 0 && h.spiegel[h.spiegel[v]!] === v)) n++;
  return n;
};
/** ein Bogen aus drei Ankern (quadratisch durch den mittleren), dicht abgetastet */
const bogen = (A: [number, number], M: [number, number], B: [number, number], n = 96): [number, number][] => {
  // Kontrollpunkt so, dass die Kurve bei t = 0,5 durch M geht
  const C: [number, number] = [2 * M[0] - 0.5 * (A[0] + B[0]), 2 * M[1] - 0.5 * (A[1] + B[1])];
  const aus: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    aus.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]);
  }
  return aus;
};
const zumWeg = (W: readonly [number, number][], u: number, v: number): number => {
  let best = Infinity;
  for (let i = 0; i + 1 < W.length; i++) {
    const p = W[i]!;
    const q = W[i + 1]!;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const t = Math.max(0, Math.min(1, ((u - p[0]) * dx + (v - p[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(u - p[0] - t * dx, v - p[1] - t * dy));
  }
  return best;
};

type Fall = { name: string; h: Haut; loops: Loop[] };
const kugel = ((n) => hautAus(n.positionen, n.indizes))(
  rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: 2000 },
  ),
);
const faelle: Fall[] = [{ name: 'Kugel', h: kugel, loops: [] }, ...NAMEN.map((name) => ({ name, ...formLaden(name) }))];
let schlecht = 0;
for (const fall of faelle) {
  const svg: string[] = [];
  let spalte = 0;
  for (const a of ['seite', 'front', 'top'] as Ansicht[]) {
    const h = fall.h;
    // Kasten der Form im Blatt
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (let i = 0; i < h.n; i++) {
      const [u, v] = blickUV(a, { x: h.pos[3 * i]!, y: h.pos[3 * i + 1]!, z: h.pos[3 * i + 2]! });
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const cu = 0.5 * (u0 + u1);
    const cv = 0.5 * (v0 + v1);
    const ru = 0.5 * (u1 - u0);
    const rv = 0.5 * (v1 - v0);
    // der Strich: in der Seite quer über die Form (von links nach rechts ein Bogen nach oben); in Front und Top einmal über die
    // Mitte (wird spiegelgleich) und einmal auf einer Seite
    const striche: { was: string; w: [number, number][] }[] =
      a === 'seite'
        ? [{ was: 'quer, Bogen', w: bogen([cu + 0.15 * ru, v0 - 0.3 * rv], [cu - 0.1 * ru, cv], [cu + 0.2 * ru, v1 + 0.3 * rv]) }]
        : a === 'front'
          ? [
              { was: 'über die Mitte, Bogen', w: bogen([u0 - 0.3 * ru, cv + 0.1 * rv], [cu, cv + 0.35 * rv], [u1 + 0.3 * ru, cv + 0.1 * rv]) },
              { was: 'auf einer Seite, Bogen', w: bogen([cu + 0.45 * ru, v0 - 0.3 * rv], [cu + 0.6 * ru, cv], [cu + 0.4 * ru, v1 + 0.3 * rv]) },
            ]
          : [
              { was: 'über die Mitte, Bogen', w: bogen([cu + 0.1 * ru, v0 - 0.3 * rv], [cu + 0.3 * ru, cv], [cu + 0.1 * ru, v1 + 0.3 * rv]) },
              { was: 'auf einer Seite, Bogen', w: bogen([u0 - 0.3 * ru, cv + 0.5 * rv], [cu, cv + 0.6 * rv], [u1 + 0.3 * ru, cv + 0.45 * rv]) },
            ];
    for (const { was, w } of striche) {
      const mk = mittlereKante(h);
      const l = loopAusVorhang(h, a, w, 900, 0.6 * mk);
      if (!l) {
        console.log(`FEHL ${fall.name}, ${a}, ${was}: kein Loop`);
        schlecht++;
        continue;
      }
      // der Strich, wie er gilt (in Front und Top über die Mitte: spiegelgleich aus der längeren Hälfte): Der Loop wird gegen den
      // gezeichneten gemessen, über die Mitte gegen ihn und sein Spiegelbild
      const zi = a === 'front' ? 0 : 1;
      const gespiegelt = a === 'seite' ? [] : w.map((q) => (zi === 0 ? [-q[0], q[1]] : [q[0], -q[1]]) as [number, number]);
      let neben = 0;
      const lagen: { u: number; v: number; t: number }[] = [];
      for (let j = 0; j < l.proben.length; j++) {
        const p = { x: l.ruhe[3 * j]!, y: l.ruhe[3 * j + 1]!, z: l.ruhe[3 * j + 2]! };
        const [u, v] = blickUV(a, p);
        lagen.push({ u, v, t: blickTiefe(a, p) });
        neben = Math.max(neben, Math.min(zumWeg(w, u, v), gespiegelt.length ? zumWeg(gespiegelt, u, v) : Infinity));
      }
      const vor = umgeschlagen(h);
      const loops = [...fall.loops, l];
      const r = loopEinsetzen(h, loops, loops.length - 1);
      // wie das Fenster gleich nach dem Einsetzen: die Nadeln an der neuen Linie zusammenlegen
      const n = r ? nadelnZusammenlegen(r.haut, r.loops, mk) : null;
      const danach = n ? n.haut : r ? r.haut : null;
      const nach = danach ? umgeschlagen(danach) : -1;
      const ohne = danach ? ohnePartner(danach) : -1;
      const gut = neben * PX <= 0.5 && r !== null && nach <= vor && ohne === 0;
      if (!gut) schlecht++;
      console.log(
        `${gut ? 'gut ' : 'FEHL'} ${fall.name}, ${a}, ${was}: ${l.art} mit ${l.proben.length} Proben, in der Ansicht höchstens ${z2(neben)} Einheiten (${z2(neben * PX)} Bildpunkte) neben dem Strich; eingesetzt ${r ? 'ja' : 'NEIN'}, umgeschlagen ${vor} → ${nach}, ohne Spiegelbild ${ohne}`,
      );
      // Bild: Punkte der Form als Wolke (hell), Strich rot, Loop schwarz (hinten dünn), sein Spiegelbild grau
      const B = 300;
      const m = B / (2.9 * Math.max(ru, rv));
      const X = (u: number): number => spalte * (B + 20) + B / 2 + (u - cu) * m;
      const Y = (v: number): number => 30 + B / 2 - (v - cv) * m;
      const wolke: string[] = [];
      for (let i = 0; i < h.n; i += Math.max(1, Math.floor(h.n / 2500))) {
        const [u, v] = blickUV(a, { x: h.pos[3 * i]!, y: h.pos[3 * i + 1]!, z: h.pos[3 * i + 2]! });
        wolke.push(`<circle cx="${X(u).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="0.8"/>`);
      }
      const tMitte = lagen.reduce((s, q) => s + q.t, 0) / lagen.length;
      const strecke = (vorn: boolean): string =>
        lagen
          .map((q, j) => {
            const n = lagen[(j + 1) % lagen.length]!;
            if (j === lagen.length - 1 && l.art === 'ring') return '';
            return (0.5 * (q.t + n.t) >= tMitte) === vorn ? `M${X(q.u).toFixed(1)} ${Y(q.v).toFixed(1)}L${X(n.u).toFixed(1)} ${Y(n.v).toFixed(1)}` : '';
          })
          .join('');
      svg.push(
        `<g fill="#cfc8bd">${wolke.join('')}</g>`,
        `<path d="${w.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join('')}" fill="none" stroke="#e2452c" stroke-width="3" stroke-opacity="0.45"/>`,
        `<path d="${strecke(false)}" fill="none" stroke="#1f1a17" stroke-width="0.6"/>`,
        `<path d="${strecke(true)}" fill="none" stroke="#1f1a17" stroke-width="1.4"/>`,
        `<text x="${spalte * (B + 20) + 6}" y="18" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#1f1a17">${a}: ${was} · ${l.art} · ${z2(neben * PX)} px</text>`,
      );
      spalte++;
    }
  }
  if (ordner) {
    const datei = `${ordner}/vorhang-${fall.name.replace(/ /g, '_')}.svg`;
    fs.writeFileSync(datei, `<svg xmlns="http://www.w3.org/2000/svg" width="${spalte * 320}" height="340" viewBox="0 0 ${spalte * 320} 340"><rect width="100%" height="100%" fill="#fff"/>${svg.join('')}</svg>`);
    console.log(`   Bild: ${datei}`);
  }
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
