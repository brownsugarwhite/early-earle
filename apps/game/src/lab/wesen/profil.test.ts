import { it } from 'vitest';
import { construct, evalScene, parseBauplan } from '@ee/creature';
import { WESEN_VORLAGEN } from './presets';

function silhouette(ids: string[]): string {
  const out: string[] = [];
  for (const id of ids) {
    const v = WESEN_VORLAGEN.find((x) => x.id === id)!;
    const c = construct(parseBauplan(v.bauplan));
    const b = c.bounds;
    const m = c.mouth!;
    // Projektion auf die Seiten- und die Vorderebene, feines Raster, dann auf die echte Ausdehnung beschnitten
    const N = 120, NX = 36;
    const sample = (view: 'seite' | 'vorn'): { grid: boolean[][]; y0: number; y1: number; z0: number; z1: number } => {
      const z0 = view === 'seite' ? b.min[2] : b.min[0], z1 = view === 'seite' ? b.max[2] : b.max[0];
      const grid: boolean[][] = [];
      for (let r = 0; r < N; r++) {
        const y = b.max[1] - (r + 0.5) * ((b.max[1] - b.min[1]) / N);
        const row: boolean[] = [];
        for (let cI = 0; cI < N; cI++) {
          const zz = z0 + (cI + 0.5) * ((z1 - z0) / N);
          let inside = false;
          for (let k = 0; k < NX && !inside; k++) {
            const t = (k + 0.5) / NX;
            const other = view === 'seite' ? b.min[0] + t * (b.max[0] - b.min[0]) : b.min[2] + t * (b.max[2] - b.min[2]);
            const p: [number, number, number] = view === 'seite' ? [other, y, zz] : [zz, y, other];
            if (evalScene(c.scene, p) < 0) inside = true;
          }
          row.push(inside);
        }
        grid.push(row);
      }
      return { grid, y0: b.min[1], y1: b.max[1], z0, z1 };
    };
    const seite = sample('seite'), vorn = sample('vorn');
    // echte Ausdehnung (ohne Schwanz: Spalten mit mindestens 3 Zellen Höhe)
    let rTop = N, rBot = -1;
    for (let r = 0; r < N; r++) if (seite.grid[r]!.some(Boolean)) { rTop = Math.min(rTop, r); rBot = Math.max(rBot, r); }
    const yTop = b.max[1] - rTop * ((b.max[1] - b.min[1]) / N), yBot = b.max[1] - (rBot + 1) * ((b.max[1] - b.min[1]) / N);
    const Hs = yTop - yBot;
    const colsIn = (g: boolean[][]): [number, number] => { let a = N, z = -1; for (const row of g) row.forEach((v, i) => { if (v) { a = Math.min(a, i); z = Math.max(z, i); } }); return [a, z]; };
    const [cA, cZ] = colsIn(seite.grid), [vA, vZ] = colsIn(vorn.grid);
    const tiefe = ((cZ - cA + 1) / N) * (seite.z1 - seite.z0), breite = ((vZ - vA + 1) / N) * (vorn.z1 - vorn.z0);
    const f = (y: number): string => ((y - yBot) / Hs).toFixed(2);
    out.push(`== ${v.name}: Höhe ${Hs.toFixed(2)} · Tiefe ${tiefe.toFixed(2)} (${(tiefe / Hs).toFixed(2)} H) · Breite ${breite.toFixed(2)} (${(breite / Hs).toFixed(2)} H) · Lippe vorn ${f(m.center[1])} H, Winkel ${f(m.corners[0]![1])} H · Auge ${f(c.eyes[0]?.pos[1] ?? yBot)} H · Mundwinkel z ${m.corners[0]![2].toFixed(2)} · Lippe z ${m.center[2].toFixed(2)} · Öffnung ${(m.gapeMax / Hs).toFixed(2)} H`);
    const rows = 40;
    for (const [name, sm, a, z] of [['Seite (vorn = rechts)', seite, cA, cZ], ['Vorn', vorn, vA, vZ]] as const) {
      out.push(`-- ${name}`);
      const step = (rBot - rTop + 1) / rows;
      const colStep = Math.max(1, Math.round(((z - a + 1) / 70)));
      for (let r = 0; r < rows; r++) {
        const r0 = rTop + Math.floor(r * step), r1 = Math.max(r0, rTop + Math.floor((r + 1) * step) - 1);
        let line = '';
        for (let cI = a; cI <= z; cI += colStep) {
          let inside = false;
          for (let rr = r0; rr <= r1 && !inside; rr++) for (let cc = cI; cc < cI + colStep && cc <= z && !inside; cc++) if (sm.grid[rr]![cc]) inside = true;
          line += inside ? '#' : '.';
        }
        const y = b.max[1] - (r0 + 0.5) * ((b.max[1] - b.min[1]) / N);
        const yf = (y - yBot) / Hs;
        const near = (v: number) => Math.abs(((v - yBot) / Hs) - yf) < 0.5 / rows;
        let mark = '';
        if (near(m.center[1])) mark = ' ← Lippe vorn';
        else if (near(m.corners[0]![1])) mark = ' ← Mundwinkel';
        else if (c.eyes[0] && near(c.eyes[0].pos[1])) mark = ' ← Auge';
        out.push(`${yf.toFixed(2)} ${line}${mark}`);
      }
    }
  }
  return out.join('\n');
}

// Silhouetten-Werkzeug (Seite/Vorn aus dem SDF, ASCII) — nur auf Wunsch:
//   EE_PROFIL=keil,vierbeiner npx vitest run src/lab/wesen/profil.test.ts
it.skipIf(!process.env.EE_PROFIL)('druckt Silhouetten', () => {
  process.stderr.write('\n' + silhouette((process.env.EE_PROFIL ?? 'keil,vierbeiner').split(',')) + '\n');
}, 120000);
