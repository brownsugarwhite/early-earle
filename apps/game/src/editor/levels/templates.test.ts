import { curveSpec } from '@ee/core';
import { describe, expect, it } from 'vitest';
import { ZONES } from './draft';
import { TEMPLATES, TEMPLATE_CURVE_TYPE, buildTemplate, templateBase } from './templates';
import { validateDraft } from './validation';

describe('Vorlagen („Neu aus Vorlage“)', () => {
  it('jede Basis ist ein Level des passenden Kurventyps (Tutorial: Einführung oder neue Elementart)', () => {
    for (const z of ZONES) {
      for (const t of TEMPLATES) {
        const base = templateBase(z, t.id);
        const spec = curveSpec(base);
        if (t.id === 'tutorial') {
          expect(spec.type === 'tutorial' || spec.type === 'intro' || spec.newElement !== undefined, `${z}/${t.id} → ${base} (${spec.type})`).toBe(true);
        } else {
          expect(spec.type, `${z}/${t.id} → ${base}`).toBe(TEMPLATE_CURVE_TYPE[t.id]);
        }
      }
    }
  });

  it('baut für alle Zonen und Vorlagen einen gültigen Entwurf hinter Level 184, ohne Band-Hinweis', () => {
    for (const z of ZONES) {
      for (const t of TEMPLATES) {
        const d = buildTemplate(z, t.id, 185);
        expect(d.zone).toBe(z);
        expect(d.id).toBe(`${z}-185`);
        const v = validateDraft(d);
        expect(v.errors, `${z}/${t.id}`).toEqual([]);
        expect(v.warnings.filter((w) => w.where === 'Versuche-Band'), `${z}/${t.id}`).toEqual([]);
      }
    }
  });

  it('der Boss ist 5×5 und hat ein Band über 3', () => {
    for (const z of ZONES) {
      const boss = buildTemplate(z, 'boss', 185);
      expect(boss.grid.w * boss.grid.h).toBeGreaterThanOrEqual(25);
      expect(boss.difficulty.targetAttempts[1]).toBeGreaterThan(3);
    }
  });
});
