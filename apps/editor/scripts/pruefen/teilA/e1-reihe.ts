// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-reihe.ts
// Umgebung: GITTER (kernring,schleifen), VERL (Feld über den Mundwinkel verlängern), JI (Reihen innen), FAELLE
// Kernring gegen Schleifengitter: Topologie (Prüfung, Valenzen), Lippe (A6), Haut (A7), Maße (Knick mit Ort).
// Aus packages/shape: npx vite-node <diese Datei>
import { alleFlaechen, type Kaefig, pruefeKaefig, valenz } from '../../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../../packages/shape/src/subdivision/matrix';
import { einsatzFaelle, einsatzFall } from '../../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { lippeAnpassen, lippenPunkt } from '../../../../../packages/shape/src/kern/einsatz/lippe';
import { a0Netz, einsatzLoesen, einsatzMessen } from '../../../../../packages/shape/src/kern/einsatz/loesen';
import { einsatzTopologie, hautGuete } from '../../../../../packages/shape/src/kern/einsatz/topologie';

type V3 = [number, number, number];
const PX = 461;
const NUR = process.env.FAELLE ? process.env.FAELLE.split(',') : null;
const GITTER = (process.env.GITTER ?? 'kernring,schleifen').split(',') as ('kernring' | 'schleifen')[];

/** größter Knick zwischen feinen Nachbarflächen (ohne Falten) im Bereich, mit Ort (Kantenmitte) */
function knickMitOrt(k: Kaefig, fein: Float64Array, flaechen: readonly number[][], imBereich: (f: number) => boolean): { w: number; ort: V3 } {
  const normalen = flaechen.map((f) => {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < f.length; i++) {
      const p = f[i]!;
      const q = f[(i + 1) % f.length]!;
      nx += (fein[3 * p + 1]! - fein[3 * q + 1]!) * (fein[3 * p + 2]! + fein[3 * q + 2]!);
      ny += (fein[3 * p + 2]! - fein[3 * q + 2]!) * (fein[3 * p]! + fein[3 * q]!);
      nz += (fein[3 * p]! - fein[3 * q]!) * (fein[3 * p + 1]! + fein[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l] as V3;
  });
  let w = 0;
  let ort: V3 = [0, 0, 0];
  for (let e = 0; e < k.nE; e++) {
    if (k.eFlaechen[e] !== 2 || k.eSchaerfe[e]! > 0) continue;
    const h = k.eHalb[e]!;
    const tw = k.hTwin[h]!;
    if (tw < 0) continue;
    const f1 = k.hFace[h]!;
    const f2 = k.hFace[tw]!;
    if (!imBereich(f1) || !imBereich(f2)) continue;
    const a = normalen[f1]!;
    const b = normalen[f2]!;
    const x = (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
    if (x > w) {
      w = x;
      const p = k.eA[e]!;
      const q = k.eB[e]!;
      ort = [0.5 * (fein[3 * p]! + fein[3 * q]!), 0.5 * (fein[3 * p + 1]! + fein[3 * q + 1]!), 0.5 * (fein[3 * p + 2]! + fein[3 * q + 2]!)];
    }
  }
  return { w, ort };
}

const zeilen: string[] = [];
for (const [art, anfang, form] of einsatzFaelle()) {
  const name = `${art}/${anfang}/${form}`;
  if (NUR && !NUR.includes(name)) continue;
  const f = einsatzFall(art, anfang, form, { verlaengerung: Number(process.env.VERL ?? 0) });
  if (!f || 'fehler' in f) continue;
  if (!NUR && f.hautAbstand > 1) continue;
  const linie = f.lippenZiel();
  const teile: string[] = [`${name} (M ${f.feld.m})`];
  for (const gitter of GITTER) {
    let t;
    try {
      t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter, jInnen: process.env.JI ? Number(process.env.JI) : undefined });
    } catch (e) {
      teile.push(`${gitter}: ${(e as Error).message}`);
      continue;
    }
    const pr = pruefeKaefig(t.kaefig);
    // Valenzen der neuen Punkte
    const val = new Map<number, number>();
    const benutzt = new Uint8Array(t.kaefig.n);
    for (let h = 0; h < t.kaefig.fVerts.length; h++) benutzt[t.kaefig.fVerts[h]!] = 1;
    for (let v = t.nAlt; v < t.kaefig.n; v++) if (benutzt[v]) val.set(valenz(t.kaefig, v), (val.get(valenz(t.kaefig, v)) ?? 0) + 1);
    const g0 = hautGuete(t); const umk = t.umgeklappt;
    const ende = gitter === 'kernring' ? 'falte' : 'ecke';
    const fit = lippeAnpassen(linie, t.m, t.lippenAnteile, { ende });
    const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 2), fit.punkte);
    const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, fit.punkte);
    // Knick mit Ort (Stufe 3, Bereich Kragen + Haut rechts)
    const ua = unterteilung(g.kaefig, 3);
    const ka = ua.stufen[ua.stufen.length - 1]!.kaefig;
    const feinA = anwenden3(ua.grenze, g.kaefig.xyz);
    const flA = alleFlaechen(ka);
    const block = flA.length / g.kaefig.nF;
    const kn = knickMitOrt(ka, feinA, flA, (q) => {
      const b = t.bereich[Math.floor(q / block)]!;
      return b === 1 || b === 2;
    });
    const spitze = lippenPunkt(fit.punkte, t.m, ende);
    const abSpitze = Math.hypot(kn.ort[0] - spitze[0], kn.ort[1] - spitze[1], kn.ort[2] - spitze[2]) * PX;
    const fe = fit.fehler;
    teile.push(
      `${gitter} m ${t.m} J ${t.J}${pr.ok ? '' : ' KÄFIG FEHLER'} val ${[...val].sort((a, b) => a[0] - b[0]).map(([v, n]) => `${v}:${n}`).join(' ')} · umgeklappt ${umk} · Güte ${g0.winkelMin.toFixed(0)}°/${g0.seitenMax.toFixed(1)} · Lippe ${Math.max(fe.seite, fe.front, fe.top, fe.raum).toFixed(2)} px (Winkel ${fe.winkel.toFixed(2)}) · Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°) bei ${abSpitze.toFixed(0)} px von der Spitze · Haut ${ms.hautMax.toFixed(2)} (99 % ${ms.hautP99.toFixed(2)}) px · Normale ${ms.normaleMax.toFixed(1)}° · außen ${ms.aussen}`,
    );
  }
  zeilen.push(teile.join('\n   '));
  console.log(teile.join('\n   '));
}
