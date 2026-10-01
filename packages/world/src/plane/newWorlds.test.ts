import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, chunkAt, scatterPlaneProps, scatterPlaneTrees } from './chunks';
import { flankHeight } from './flank';
import { PlaneMist } from './mist';
import { AUTHORED_ROUTE, ROUTE, loadWorldFiles, testField } from './testWorlds';
import type { TreeFamily } from '../scatterTrees';

/**
 * Autorenwelten 11 und 12 (Ebene 20 „Nebelweide“, Ebene 7 „Goldnebelhang“) auf der Ebene: Route, Katalog, Nebelbänke,
 * Steilhang, Kammbäume, Wiese mit Kühen, Nebelmeer. Feld wie im Spiel (Seed 7).
 */
describe('Welten 11/12 (Ebene 20, Ebene 7)', () => {
  const field = testField();
  const files = loadWorldFiles();
  const w11 = files.findIndex((f) => f.id === 'w11');
  const w12 = files.findIndex((f) => f.id === 'w12');
  const k11 = AUTHORED_ROUTE.findIndex((r) => r.world === w11);
  const k12 = AUTHORED_ROUTE.findIndex((r) => r.world === w12);

  it('liegen nach w03 auf der Route (je 12 Level, 125–148); hinter der Route nur die angedeutete Zone', () => {
    expect(w11).toBe(10);
    expect(w12).toBe(11);
    const k03 = AUTHORED_ROUTE.findIndex((r) => r.world === files.findIndex((f) => f.id === 'w03'));
    expect(k11).toBe(k03 + 1);
    expect(k12).toBe(k03 + 2);
    const layout = field.layout;
    expect(layout.segment(k11)).toMatchObject({ world: w11, firstLevel: 125, levels: 12 });
    expect(layout.segment(k12)).toMatchObject({ world: w12, firstLevel: 137, levels: 12 });
    expect(layout.segmentOfLevel(140)).toBe(k12);
    // hinter der Route (Route 15 + 1): keine prozeduralen Welten, nur die angedeutete Zone ohne Level
    const n = AUTHORED_ROUTE.length;
    expect(layout.segment(n)).toMatchObject({ world: ROUTE.beyondWorld, levels: 0 });
    expect(field.catalog.isAuthored(w12)).toBe(true);
    expect(field.catalog.isAuthored(files.length)).toBe(false);
    // fremde Kennungen sind ohne Lab-Flag die angedeutete Welt, mit `?prozedural=1` prozedurale Welten
    expect(field.catalog.spec(files.length).id).toBe('w16');
    expect(testField(7, { procedural: true }).catalog.spec(files.length).id).toBe(`p${files.length}`);
  });

  it('Nebelbänke je Region: deterministisch, in der Welt; Welt 12 mit Nebelmeer und Bergsilhouetten', () => {
    const a = new PlaneMist(field);
    const b = new PlaneMist(field);
    const r11 = a.region(`p${k11}`);
    expect(r11.length).toBeGreaterThan(8);
    expect(b.region(`p${k11}`)).toEqual(r11);
    for (const bank of r11) {
      expect(bank.world).toBe(w11);
      expect(bank.thickness).toBeGreaterThan(0.5);
      expect(Number.isFinite(bank.y)).toBe(true);
    }
    const r12 = a.region(`p${k12}`);
    expect(r12.some((m) => m.kind === 1)).toBe(true);
    expect(r12.some((m) => m.kind === 2)).toBe(true);
    // Welten ohne Nebel planen nichts
    expect(a.region('p0')).toEqual([]);
  });

  it('Steilhang (Welt 12): flach am Pfad, steil bis zum Grat, dahinter weich, zu den Abschnittsenden auslaufend', () => {
    const spec = field.spec(w12).terrain.flank!;
    const seg = field.layout.segment(k12);
    const z = (seg.zStart + seg.zEnd) / 2;
    const xb = field.layout.backbone(z);
    const at = (u: number, zz = z) => flankHeight(field.layout, spec, xb + u * spec.side, zz);
    expect(at(0)).toBe(0);
    expect(at(-5)).toBe(0);
    expect(at(spec.crest)).toBeGreaterThan(spec.height * 0.95);
    // steil: auf halber Flanke schon fast die halbe Höhe
    expect(at((spec.from + spec.crest) / 2)).toBeGreaterThan(spec.height * 0.4);
    expect(at(spec.to + 1)).toBe(0);
    // Auslauf: am Abschnittsbeginn kein Hang (keine Wand an der Weltgrenze)
    expect(at(spec.crest, seg.zStart - 0.01)).toBeLessThan(0.05);
    // stetig: keine Sprünge im Profil
    let prev = at(spec.from);
    for (let u = spec.from; u <= spec.to; u += 0.05) {
      const h = at(u);
      expect(Math.abs(h - prev)).toBeLessThan(0.25);
      prev = h;
    }
  });

  it('Kammbäume: Welt 11 trägt Schirmbäume auf den Kämmen (einzeln/paarweise), Welt 12 Tannen am Hang', () => {
    const count = (world: number, k: number, kind: string): { n: number; heights: number[]; min: number } => {
      const seg = field.layout.segment(k);
      const out = { n: 0, heights: [] as number[], min: Infinity };
      const z0 = Math.floor(seg.zEnd / CHUNK_SIZE);
      const z1 = Math.floor(seg.zStart / CHUNK_SIZE);
      const xb = field.layout.backbone((seg.zStart + seg.zEnd) / 2);
      const cx0 = chunkAt(xb - 24, 0).cx;
      const cx1 = chunkAt(xb + 24, 0).cx;
      const pts: Array<[number, number]> = [];
      for (let cz = z0; cz <= z1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          for (const t of scatterPlaneTrees(field, cx, cz)) {
            if (t.world !== world || t.kind !== kind) continue;
            out.n++;
            out.heights.push(t.position[1]);
            for (const [px, pz] of pts) out.min = Math.min(out.min, Math.hypot(px - t.position[0], pz - t.position[2]));
            pts.push([t.position[0], t.position[2]]);
          }
        }
      }
      return out;
    };
    const parasols = count(w11, k11, 'parasol');
    expect(parasols.n).toBeGreaterThan(3);
    const firs = count(w12, k12, 'fir');
    expect(firs.n).toBeGreaterThan(5);
    // Tannen stehen oben am Hang (absolute Mindesthöhe der Weltdatei)
    const above = (field.spec(w12).vegetation as TreeFamily).grove?.crest?.aboveHeight ?? 0;
    for (const h of firs.heights) expect(h).toBeGreaterThan(above - 0.6);
  });

  it('Nebelmeer (Welt 12): unter dem Nebelspiegel stehen weder Bäume noch Requisiten', () => {
    const sea = field.spec(w12).mist!.sea!;
    const level = sea.height ?? sea.level * field.spec(w12).terrain.amplitude;
    const seg = field.layout.segment(k12);
    const xb = field.layout.backbone((seg.zStart + seg.zEnd) / 2);
    let n = 0;
    for (let cz = Math.floor(seg.zEnd / CHUNK_SIZE); cz <= Math.floor(seg.zStart / CHUNK_SIZE); cz++) {
      for (let cx = chunkAt(xb - 20, 0).cx; cx <= chunkAt(xb + 20, 0).cx; cx++) {
        for (const t of scatterPlaneTrees(field, cx, cz)) if (t.world === w12) {
          n++;
          expect(t.position[1]).toBeGreaterThan(level);
        }
        for (const p of scatterPlaneProps(field, cx, cz)) if (p.world === w12) expect(p.position[1]).toBeGreaterThan(level);
      }
    }
    expect(n).toBeGreaterThan(10);
  });

  it('Wiese (Welt 11): Feld am Bildfokus, winzige Kühe nur auf den Wiesen', () => {
    const key = `p${k11}`;
    const snow = field.features.region(key).snow!;
    expect(snow).not.toBeNull();
    const focal = field.focalSlot(key)!;
    const focus = field.spec(w11).features!.snowFields!.focus!;
    const f = Array.isArray(focus) ? focus[0]! : focus;
    const fx = focal.position[0] + (f.offset?.[0] ?? 0);
    const fz = focal.position[2] + (f.offset?.[1] ?? 0);
    expect(snow.value(fx, fz, field.heightNormAt(fx, fz))).toBeGreaterThan(0);
    const seg = field.layout.segment(k11);
    const xb = field.layout.backbone((seg.zStart + seg.zEnd) / 2);
    let cows = 0;
    for (let cz = Math.floor(seg.zEnd / CHUNK_SIZE); cz <= Math.floor(seg.zStart / CHUNK_SIZE); cz++) {
      for (let cx = chunkAt(xb - 28, 0).cx; cx <= chunkAt(xb + 28, 0).cx; cx++) {
        for (const p of scatterPlaneProps(field, cx, cz)) {
          if (p.world !== w11 || p.kind !== 'animal') continue;
          cows++;
          expect(p.scale).toBeLessThan(0.6);
          expect(field.features.region(field.sample(p.position[0], p.position[2]).region.key).snow!.value(p.position[0], p.position[2], field.heightNormAt(p.position[0], p.position[2]))).toBeGreaterThan(0.05);
        }
      }
    }
    expect(cows).toBeGreaterThan(0);
  });
});
