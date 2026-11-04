// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5.1: 2D-Auslegung der Seitenfläche je Prüfkörper — Streifen farbig (Rumpf
// grau, Kinder farbig), Sprossen als Linien, die festen Sprossen unter einer Sehne dicker, Sehnen schwarz, Spitzen als Punkte.
// Im Titel: Streifen, Ringe, Punkte je Ring, Käfigpunkte und -flächen (Topologie aus `baumKaefig`).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/s5-auslegung.ts (KOERPER, NAME, ANSATZ = sehne | kragen)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baumKaefig } from '../../../../packages/shape/src/kaefig/baumKaefig';
import { silhouettenBreite } from '../../../../packages/shape/src/kern/breite';
import { RING_STANDARD, ebene, ringeAuslegen } from '../../../../packages/shape/src/kern/grundkoerper/ebene';
import { teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';
import { streifenTopologie } from '../../../../packages/shape/src/kern/grundkoerper/baumBau';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 's5-auslegung';
const ANSATZ = (process.env.ANSATZ ?? 'kragen') as 'sehne' | 'kragen';
const liste = (process.env.KOERPER ?? 'giraffe-bauch,ente,s-hals,ueberhang,fisch,vase,langhals,drache').split(',');
const flach = (ps: readonly { x: number; y: number }[]) => ps.flatMap((p) => [+p.x.toFixed(4), +p.y.toFixed(4)]);
const daten = liste.map((name) => {
  const dok = teilSatzDokument(name);
  const t0 = performance.now();
  const e = ebene(dok, undefined, undefined, ANSATZ);
  const t1 = performance.now();
  const ringe = ringeAuslegen(e, silhouettenBreite(dok), { ...RING_STANDARD, ansatz: ANSATZ });
  const t2 = performance.now();
  let topo = '';
  try {
    const bk = baumKaefig(streifenTopologie(e, ringe));
    topo = `Käfig ${bk.kaefig.n} Punkte, ${bk.kaefig.nF} Flächen`;
  } catch (err) {
    topo = `Topologie: ${(err as Error).message}`;
  }
  return {
    name,
    titel: `${e.streifen.length} Streifen (${e.streifen.map((s, i) => `${i}: N ${s.N}, R ${ringe[i]!.sprossen.length}`).join('; ')}) · ${topo} · ${(t1 - t0).toFixed(0)} + ${(t2 - t1).toFixed(0)} ms`,
    seite: flach(e.seite),
    streifen: e.streifen.map((s, i) => ({
      umriss: flach(s.umriss),
      sprossen: ringe[i]!.sprossen.map((sp) => flach([sp.o, sp.u])),
      fest: ringe[i]!.kinder.flatMap((k) => Array.from({ length: k.t.length }, (_, j) => k.ring + j)),
      kappen: [...ringe[i]!.kappen.anfang, ...ringe[i]!.kappen.ende].map((sp) => flach([sp.o, sp.u])),
      spitzen: flach([ringe[i]!.spitzen.anfang, ringe[i]!.spitzen.ende].filter((p): p is { x: number; y: number } => !!p)),
      sehne: s.ansatz ? flach([s.ansatz.A, s.ansatz.B]) : [],
    })),
  };
});
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:10px;font:12px -apple-system,Helvetica,sans-serif;background:#f4efe6}canvas{background:#fff;border:1px solid #d8cfc0;margin:2px}.k{display:inline-block;margin:0 8px 10px 0;vertical-align:top;width:420px}</style>
<h3>S5.1 Auslegung der Seitenfläche — Rumpf grau, Kinder farbig, feste Sprossen unter der Sehne dick, Sehne schwarz, Kappenstationen gestrichelt</h3>
<div id="w"></div><script>
const D = ${JSON.stringify(daten)};
const FARBEN = ['#777', '#d0303a', '#1a6fd0', '#1a9a3a', '#c08a00', '#8a3ad0'];
const w = document.getElementById('w');
for (const d of D) {
  const div = document.createElement('div'); div.className = 'k'; w.appendChild(div);
  const t = document.createElement('div'); t.innerHTML = '<b>' + d.name + '</b> ' + d.titel; div.appendChild(t);
  const cv = document.createElement('canvas'); cv.width = 420; cv.height = 360; div.appendChild(cv);
  const c = cv.getContext('2d');
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < d.seite.length; i += 2) { x0 = Math.min(x0, d.seite[i]); x1 = Math.max(x1, d.seite[i]); y0 = Math.min(y0, d.seite[i + 1]); y1 = Math.max(y1, d.seite[i + 1]); }
  const s = 0.9 * Math.min(cv.width / (x1 - x0), cv.height / (y1 - y0));
  const X = (x) => (cv.width - s * (x1 - x0)) / 2 + s * (x - x0), Y = (y) => (cv.height + s * (y1 - y0)) / 2 - s * (y - y0);
  const zug = (p, farbe, b, zu, strich) => { c.strokeStyle = farbe; c.lineWidth = b; c.setLineDash(strich ?? []); c.beginPath(); for (let j = 0; j < p.length; j += 2) (j ? c.lineTo : c.moveTo).call(c, X(p[j]), Y(p[j + 1])); if (zu) c.closePath(); c.stroke(); c.setLineDash([]); };
  d.streifen.forEach((st, i) => {
    const f = FARBEN[i % FARBEN.length];
    c.fillStyle = i ? f + '22' : '#f2d9b8'; c.beginPath(); for (let j = 0; j < st.umriss.length; j += 2) (j ? c.lineTo : c.moveTo).call(c, X(st.umriss[j]), Y(st.umriss[j + 1])); c.closePath(); c.fill();
  });
  d.streifen.forEach((st, i) => {
    const f = FARBEN[i % FARBEN.length];
    st.sprossen.forEach((sp, r) => zug(sp, f, st.fest.includes(r) ? 2.2 : 1));
    st.kappen.forEach((sp) => zug(sp, f, 1, false, [3, 3]));
    c.fillStyle = f; for (let j = 0; j < st.spitzen.length; j += 2) { c.beginPath(); c.arc(X(st.spitzen[j]), Y(st.spitzen[j + 1]), 3.5, 0, 7); c.fill(); }
    if (st.sehne.length) zug(st.sehne, '#000', 2.5);
  });
  zug(d.seite, '#000', 1.2, true);
}
</script>`;
writeFileSync(resolve(AUSGABE, `${NAME}.html`), html);
console.log(daten.map((d) => `${d.name}: ${d.titel}`).join('\n'));
console.log(`${AUSGABE}/${NAME}.html`);
