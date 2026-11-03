// P1 Tag 1, Diagnose der geplanten Umrissschleifen: je Ansicht die Proben der Zeichnung mit Intervallen, gewählter Tiefe,
// Ecken und Strecken. Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/umriss-plan-diag.ts <körper> [ansicht]
import { ableitung, punktAuf } from '../../../../packages/shape/src/bezier';
import { vollerPfad } from '../../../../packages/shape/src/profil';
import { huelle } from '../../../../packages/shape/src/kern/grundkoerper/huelle';
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { umrissPlan } from '../../../../packages/shape/src/kern/umrissPlan';

const PX = 461;
const name = process.argv[2] ?? 'ente';
const nur = process.argv[3] as 'seite' | 'front' | 'top' | undefined;
const dok = extremKoerper(name).dok();
const sk = dok.skalierung;
const h = huelle(dok);
const plan = umrissPlan(dok);
console.log(`${name}: skalierung ${sk}, ${plan.schleifen.length} Schleifen, ${plan.ms.toFixed(1)} ms, Widerspruch`, plan.widerspruch);
for (const a of ['seite', 'front', 'top'] as const) {
  if (nur && a !== nur) continue;
  const segs = vollerPfad(dok.profile[a]);
  console.log(`\n== ${a}: ${segs.length} Segmente`);
  // Knoten mit Winkel
  segs.forEach((s, i) => {
    const vor = segs[(i - 1 + segs.length) % segs.length]!;
    const t1 = ableitung(vor, 1);
    const t2 = ableitung(s, 0);
    const w = (Math.atan2(t1.x * t2.y - t1.y * t2.x, t1.x * t2.x + t1.y * t2.y) * 180) / Math.PI;
    const p = punktAuf(s, 0);
    console.log(`  Knoten ${i}: (${(p.x * sk * PX).toFixed(0)}, ${(p.y * sk * PX).toFixed(0)}) px, Winkel ${w.toFixed(0)}°`);
  });
  for (const s of plan.schleifen.filter((q) => q.ansicht === a)) {
    console.log(`  Schleife ${s.id} (Teil ${s.teil}, ${s.proben.length} Proben, Tiefe ${(s.tiefe * PX).toFixed(0)} px)`);
    let letzteArt = -1;
    s.proben.forEach((p, i) => {
      const q = a === 'seite' ? [p.q.x, p.q.y] : a === 'front' ? [p.q.x, p.q.y] : [p.q.x, p.q.y];
      const t = a === 'seite' ? p.p[2] : a === 'front' ? p.p[0] : p.p[1];
      const iv = a === 'seite' ? h.zBei(p.q.x, p.q.y) : a === 'front' ? h.xBei(p.q.x, p.q.y) : h.yBei(p.q.x, p.q.y);
      const zeig = i % 4 === 0 || p.art !== letzteArt || i === s.proben.length - 1;
      letzteArt = p.art;
      if (!zeig) return;
      console.log(`    ${String(i).padStart(3)} art ${p.art} s ${p.s.toFixed(2).padStart(6)} q (${(q[0]! * PX).toFixed(0).padStart(4)}, ${(q[1]! * PX).toFixed(0).padStart(4)}) tiefe ${(t * PX).toFixed(1).padStart(6)} px  erlaubt [${Number.isFinite(p.lo) ? (p.lo * PX).toFixed(0) : '–'}, ${Number.isFinite(p.hi) ? (p.hi * PX).toFixed(0) : '–'}] von ${iv.length}: ${iv.map(([l, r]) => `[${(l * PX).toFixed(0)},${(r * PX).toFixed(0)}]`).join(' ')}${p.widerspruch ? ` WIDERSPRUCH ${p.widerspruch.toFixed(1)} px` : ''}`);
    });
  }
}
