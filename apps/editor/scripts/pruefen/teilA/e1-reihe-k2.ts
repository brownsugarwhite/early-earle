// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-reihe-k2.ts
// Umgebung: LAGE (karte|band, Liste mit Komma), J (fest; sonst Standard), FAELLE, AUS (JSON-Zeilen), WULST (px), ECKE (eckeMin),
// VERL (Feld hinter dem Mundwinkel verlängert, in Feldradien), FELD (begradigt|kompakt), KAPPE (Radien, 0 = ganz begradigt),
// FAECHER (tutte|kreis), NAHT (bogen|karte)
// Ganze Reihe des Kernrings nach dem Standard (Plan 21.10.): Feld auf K2 begradigt bis 1,5 Radien, Schlitz genau auf der Linie,
// Reihenzahl konform (10 … 16), Fächer um c als Halbkreis, Nahtspeichen auf den Kartenlinien, Ausgleich außen, letzte
// Lippenspanne ¼ Feldkante, ohne Lippenwulst. Je ausgeglichenem Fall: Haut gegen A0 (max/99 %), Knick im Feld und am Mundwinkel (je gegen A0),
// umgeklappte Zellen, Viereckgüte, Lippe, außen, Spiegel, Zeit. Am Ende die Zusammenfassung je Lage.
import { appendFileSync } from 'node:fs';
import { einsatzAblauf, einsatzFaelle, einsatzFall } from '../../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { hautGuete } from '../../../../../packages/shape/src/kern/einsatz/topologie';

const NUR = process.env.FAELLE?.split(',');
const LAGEN = (process.env.LAGE ?? 'karte').split(',') as ('karte' | 'band')[];
const zeilen: Record<string, Record<string, number | string>[]> = {};
for (const [art, anfang, form] of einsatzFaelle()) {
  const name = `${art}/${anfang}/${form}`;
  if (NUR && !NUR.includes(name)) continue;
  const f = einsatzFall(art, anfang, form, { ...(process.env.VERL ? { verlaengerung: Number(process.env.VERL) } : {}), ...(process.env.FELD ? { feld: process.env.FELD as 'begradigt' | 'kompakt' } : {}), ...(process.env.KAPPE ? { kappe: Number(process.env.KAPPE) } : {}) });
  if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
  for (const lage of LAGEN) {
    const t0 = performance.now();
    let z: Record<string, number | string>;
    try {
      const { t, lippe, g, ms } = einsatzAblauf(f, { lage, ...(process.env.ECKE ? { eckeMin: Number(process.env.ECKE) } : {}), ...(process.env.FAECHER ? { faecher: process.env.FAECHER as 'tutte' | 'kreis' } : {}), ...(process.env.NAHT ? { naht: process.env.NAHT as 'bogen' | 'karte' } : {}), ...(process.env.J ? { J: Number(process.env.J) } : lage === 'band' ? { J: 10 } : {}) }, process.env.WULST ? { wulst: Number(process.env.WULST) } : {});
      let spiegel = 0;
      for (let v = t.nAlt; v < g.kaefig.n; v++) {
        const s = t.spiegel[v]!;
        if (s >= 0 && s !== v && (g.xyz[3 * s] !== g.xyz[3 * v] || g.xyz[3 * s + 1] !== g.xyz[3 * v + 1] || g.xyz[3 * s + 2] !== -g.xyz[3 * v + 2]!)) spiegel++;
      }
      const gu = hautGuete(t);
      const fe = lippe.fehler;
      z = { name, lage, m: t.m, M: t.M, J: t.J, haut: ms.hautMax, haut99: ms.hautP99, knick: ms.falten, knickA0: ms.faltenA0, ecke: ms.faltenEcke, eckeA0: ms.faltenEckeA0, umgeklappt: t.umgeklappt, winkelMin: gu.winkelMin, seitenMax: gu.seitenMax, lippe: Math.max(fe.seite, fe.front, fe.top, fe.raum), aussen: ms.aussen, spiegel, zeit: (performance.now() - t0) / 1000 };
    } catch (e) {
      z = { name, lage, fehler: (e as Error).message };
    }
    (zeilen[lage] ??= []).push(z);
    if (process.env.AUS) appendFileSync(process.env.AUS, `${JSON.stringify(z)}\n`);
    const n = (k: string, d = 2) => (typeof z[k] === 'number' ? (z[k] as number).toFixed(d) : '–');
    console.log(z.fehler ? `${name.padEnd(22)} ${lage}: Fehler ${z.fehler}` : `${name.padEnd(22)} ${lage} m ${z.m} J ${z.J}: Haut ${n('haut')} (99 % ${n('haut99')}) · Knick ${n('knick', 1)}° (A0 ${n('knickA0', 1)}°) · Ecke ${n('ecke', 1)}° (A0 ${n('eckeA0', 1)}°) · umgeklappt ${z.umgeklappt} · Güte ${n('winkelMin', 0)}°/${n('seitenMax', 1)} · Lippe ${n('lippe')} px · außen ${z.aussen} · Spiegel ${z.spiegel} · ${n('zeit', 1)} s`);
  }
}
for (const [lage, zs] of Object.entries(zeilen)) {
  const ok = zs.filter((z) => !z.fehler);
  const ohne = ok.filter((z) => !String(z.name).startsWith('rex') && !String(z.name).startsWith('robbe'));
  const haut = ohne.map((z) => z.haut as number).sort((a, b) => a - b);
  console.log(
    `\n${lage}: ${ok.length} Fälle (${zs.length - ok.length} Fehler) · Haut ≤ 0,25 px in ${haut.filter((h) => h <= 0.25).length}/${haut.length} (ohne Rex/Robbe), Median ${haut[haut.length >> 1]?.toFixed(2)}, max ${haut[haut.length - 1]?.toFixed(2)} · Ecke ≤ A0 + 2° in ${ok.filter((z) => (z.ecke as number) <= (z.eckeA0 as number) + 2).length}/${ok.length} · Knick > 30° in ${ok.filter((z) => (z.knick as number) > 30).length} · umgeklappt in ${ok.filter((z) => (z.umgeklappt as number) > 0).length} · Lippe ≤ 1 px in ${ok.filter((z) => (z.lippe as number) <= 1).length}/${ok.length} · außen ≠ 0 in ${ok.filter((z) => z.aussen !== 0).length} · Spiegel ≠ 0 in ${ok.filter((z) => z.spiegel !== 0).length}`,
  );
}
