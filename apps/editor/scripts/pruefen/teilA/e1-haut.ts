// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-haut.ts
// Umgebung: GITTER (kernring|schleifen), STUFE (1 = K1, 2 = K2), JS (Reihenzahlen, 0 = automatisch), AR (Ausgleichsrunden außen), WULST, FAELLE
// Haut des Kernrings gegen A0: je Fall und Reihenzahl J (konform = Standard, sonst fest) Haut max/99 %, Ort des Maximums
// (Abstand zur Lippe, zum Mundwinkel, zum Feldrand), Knick, Viereckgüte.
import { einsatzFaelle, einsatzFall } from '../../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { lippeAnpassen, lippenKurve, lippenPunkt } from '../../../../../packages/shape/src/kern/einsatz/lippe';
import { a0Netz, einsatzLoesen, einsatzMessen } from '../../../../../packages/shape/src/kern/einsatz/loesen';
import { einsatzTopologie, hautGuete } from '../../../../../packages/shape/src/kern/einsatz/topologie';
type V3 = [number, number, number];
const PX = 461;
const NUR = process.env.FAELLE?.split(',');
const JS = (process.env.JS ?? '0').split(',').map(Number);
const GITTER = (process.env.GITTER ?? 'kernring') as 'kernring' | 'schleifen';
const zuZug = (p: V3, zug: V3[]) => {
  let best = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) {
    const q = zug[i]!, r = zug[i + 1]!;
    const e = [r[0] - q[0], r[1] - q[1], r[2] - q[2]];
    const l2 = e[0]! ** 2 + e[1]! ** 2 + e[2]! ** 2;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - q[0]) * e[0]! + (p[1] - q[1]) * e[1]! + (p[2] - q[2]) * e[2]!) / l2)) : 0;
    best = Math.min(best, Math.hypot(q[0] + t * e[0]! - p[0], q[1] + t * e[1]! - p[1], q[2] + t * e[2]! - p[2]));
  }
  return best;
};
for (const [art, anfang, form] of einsatzFaelle()) {
  const name = `${art}/${anfang}/${form}`;
  if (NUR && !NUR.includes(name)) continue;
  const STUFE = Number(process.env.STUFE ?? 1) as 1 | 2;
  const f = einsatzFall(art, anfang, form, { stufe: STUFE });
  if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
  const linie = f.lippenZiel();
  for (const J of JS) {
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter: GITTER, ...(J ? { J } : {}), aussenRunden: Number(process.env.AR ?? 0) });
    const ende = GITTER === 'kernring' ? 'falte' : 'ecke';
    const fit = lippeAnpassen(linie, t.m, t.lippenAnteile, { ende });
    const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 3 - STUFE), fit.punkte, { stufen: 3 - STUFE, ...(process.env.WULST ? { wulst: Number(process.env.WULST) } : {}) });
    const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, fit.punkte, 4 - STUFE);
    const gu = hautGuete(t);
    const kurve = lippenKurve(fit.punkte, 32, ende);
    const sp = lippenPunkt(fit.punkte, t.m, ende);
    const rand = Array.from(f.feld.rand, (i): V3 => [f.v.kaefig.xyz[3 * i]!, f.v.kaefig.xyz[3 * i + 1]!, f.v.kaefig.xyz[3 * i + 2]!]);
    const o = ms.ortHaut;
    const dl = zuZug(o, kurve) * PX;
    const dc = Math.hypot(o[0] - sp[0], o[1] - sp[1], o[2] - sp[2]) * PX;
    const dr = Math.min(...rand.map((r) => Math.hypot(o[0] - r[0], o[1] - r[1], o[2] - r[2]))) * PX;
    console.log(`${name.padEnd(22)} ${GITTER} J ${String(t.J).padStart(2)} m ${t.m}: Haut ${ms.hautMax.toFixed(2)} (99 % ${ms.hautP99.toFixed(2)}) px bei Lippe ${dl.toFixed(0)} / Spitze ${dc.toFixed(0)} / Rand ${dr.toFixed(0)} px · Normale ${ms.normaleMax.toFixed(1)}° · Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°) · Güte ${gu.winkelMin.toFixed(0)}°/${gu.seitenMax.toFixed(1)}`);
  }
}
