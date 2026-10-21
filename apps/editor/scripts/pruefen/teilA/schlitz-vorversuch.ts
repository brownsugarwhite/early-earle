// Teil A, Vorversuch: Faltet ein geschlossener Schlitz am Ende, wenn das Ende ein regulärer Gitterpunkt ist (vier Flächen
// darum, 360° natürlich)? Kissen aus zwei 9×9-Gittern (oben mit Schlitz längs y = 0 von x = −2 bis +2, Lippen ∞ scharf),
// Catmull–Clark Stufe 3 auf die Grenzfläche; gemessen: größter Knick zwischen Nachbarflächen über nicht scharfe Kanten.
import { kaefigAusFlaechen, kanteZwischen, alleFlaechen } from '../../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../../packages/shape/src/subdivision/matrix';

type V3 = [number, number, number];
const N = 4;
const S = 0.25;

function bauen(variante: 'ecke' | 'falte'): { knick: number; ort: V3 } {
  const P: V3[] = [];
  const top = new Map<string, number>();
  const unten = new Map<string, number>();
  const add = (p: V3) => (P.push(p), P.length - 1);
  const z = (x: number, y: number, s: number) => s * (1 - 0.04 * (x * x + y * y));
  // Rand gemeinsam
  for (let x = -N; x <= N; x++)
    for (let y = -N; y <= N; y++) {
      const rand = Math.abs(x) === N || Math.abs(y) === N;
      const k = `${x},${y}`;
      if (rand) {
        const i = add([x * S, y * S, 0]);
        top.set(k, i);
        unten.set(k, i);
      } else {
        top.set(k, add([x * S, y * S, z(x, y, 1)]));
        unten.set(k, add([x * S, y * S, z(x, y, -1)]));
      }
    }
  // Schlitz: innere Punkte x = −1 … 1 auf y = 0 doppelt (D für die Flächen darunter)
  const D = new Map<number, number>();
  for (let x = -1; x <= 1; x++) D.set(x, add([...P[top.get(`${x},0`)!]!] as V3));
  const t = (x: number, y: number, unterhalb: boolean) => (y === 0 && x >= -1 && x <= 1 && unterhalb ? D.get(x)! : top.get(`${x},${y}`)!);
  const F: number[][] = [];
  for (let x = -N; x < N; x++)
    for (let y = -N; y < N; y++) {
      const unterhalb = y === -1; // Zelle unter der Linie y = 0
      F.push([t(x, y, false), t(x + 1, y, false), t(x + 1, y + 1, unterhalb), t(x, y + 1, unterhalb)]);
      F.push([unten.get(`${x},${y}`)!, unten.get(`${x},${y + 1}`)!, unten.get(`${x + 1},${y + 1}`)!, unten.get(`${x + 1},${y}`)!]);
    }
  const flaechen = F;
  const k = kaefigAusFlaechen(P, flaechen);
  const kette = (pts: number[]) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const e = kanteZwischen(k, pts[i]!, pts[i + 1]!);
      if (e < 0) throw new Error(`Kante fehlt ${pts[i]}-${pts[i + 1]}`);
      k.eSchaerfe[e] = 1e6;
    }
  };
  const c1 = top.get('-2,0')!;
  const c2 = top.get('2,0')!;
  kette([c1, top.get('-1,0')!, top.get('0,0')!, top.get('1,0')!, c2]);
  kette([c1, D.get(-1)!, D.get(0)!, D.get(1)!, c2]);
  if (variante === 'ecke') {
    k.vSchaerfe[c1] = 1e6;
    k.vSchaerfe[c2] = 1e6;
  }
  const u = unterteilung(k, 3);
  const fein = anwenden3(u.grenze, k.xyz);
  const kf = u.stufen[u.stufen.length - 1]!.kaefig;
  const fl = alleFlaechen(kf);
  const normale = (f: number[]): V3 => {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      nx += (fein[3 * a + 1]! - fein[3 * b + 1]!) * (fein[3 * a + 2]! + fein[3 * b + 2]!);
      ny += (fein[3 * a + 2]! - fein[3 * b + 2]!) * (fein[3 * a]! + fein[3 * b]!);
      nz += (fein[3 * a]! - fein[3 * b]!) * (fein[3 * a + 1]! + fein[3 * b + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const ns = fl.map(normale);
  const kante = new Map<string, number>();
  let knick = 0;
  let ort: V3 = [0, 0, 0];
  fl.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      const e = kanteZwischen(kf, a, b);
      if (e >= 0 && kf.eSchaerfe[e]! > 0) continue;
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      const g = kante.get(key);
      if (g === undefined) kante.set(key, fi);
      else {
        const n1 = ns[fi]!;
        const n2 = ns[g]!;
        const w = (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI;
        const mx = fein[3 * a]!;
        const my = fein[3 * a + 1]!;
        const nahe = Math.min(Math.hypot(mx - 0.5, my), Math.hypot(mx + 0.5, my)) < 0.3 && fein[3 * a + 2]! > 0;
        if (nahe && w > knick) {
          knick = w;
          ort = [fein[3 * a]!, fein[3 * a + 1]!, fein[3 * a + 2]!];
        }
      }
    }
  });
  return { knick, ort };
}

for (const v of ['ecke', 'falte'] as const) {
  try {
    const r = bauen(v);
    console.log(`${v}: größter Knick ${r.knick.toFixed(1)}° bei (${r.ort.map((x) => x.toFixed(3)).join(', ')})`);
  } catch (e) {
    console.log(`${v}: ${String(e)}`);
  }
}
