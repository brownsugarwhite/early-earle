// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V2 „Saubere Linien“: Tore der Umrisslinien an Körpern der
// Extremreihe in Florians Ablauf (Startkugel umgeformt, gebaut wie im Editor). Vorher (Konturen, Stand a9134118) rauschten
// die Linien gerade hier: Kegel Front 8 Knicke, Würfel 203 Knicke, Vierbeiner Teile 21 Knicke.
import { describe, expect, it } from 'vitest';
import { extremKoerper } from './pruefen/extremreihe';
import { extremMessen, umrissLinien } from './pruefen/extremMessung';
import { netzSicht } from './netzSicht';

const ZEIT = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CI ? 2 : 1;

describe('V2: saubere Umrisslinien', () => {
  for (const [name, art] of [
    ['kegel', 'roehre'],
    ['kegel', 'teile'],
    ['wuerfel', 'roehre'],
    ['vierbeiner', 'teile'],
  ] as const) {
    it(`${name} · ${art}: je Umriss glatte Kurven ohne Knicke und Schleifen, auf der Silhouette und auf der Haut`, () => {
      const { bau, gezeigt: g } = extremMessen(extremKoerper(name), art, 'kugel', { durchdringung: false, linien: false, zug: false });
      const ns = bau.netz.netzSicht!;
      const r = umrissLinien(ns, bau.dok, g.punkte, g.flaechen);
      for (const a of ['seite', 'front', 'top'] as const) {
        expect(r[a].stuecke, `${a}: Linien`).toBeGreaterThan(0);
        expect(r[a].knicke, `${a}: Knicke über 45° außer an gezeichneten Ecken und Falten des Körpers`).toBe(0);
        expect(r[a].schleifen, `${a}: Schleifen`).toBe(0);
        expect(r[a].eigen, `${a}: Abstand zur Silhouette (px)`).toBeLessThanOrEqual(0.5);
        expect(r[a].haut, `${a}: Abstand zur Haut (px)`).toBeLessThanOrEqual(1);
      }
      // echte Kurven: Kontrollpunkte je Probe-Parameter, Griffe höchstens so lang wie die Sehne (sonst Schleifen)
      for (const z of ns.zuege) {
        if (!z.art.startsWith('umriss-')) continue;
        const K = z.kurve!;
        const nk = (K.length / 3 - 1) / 3;
        expect(Number.isInteger(nk) && nk > 0, z.id).toBe(true);
        expect(z.parameter!.length).toBe(z.sicht.length);
        for (let s = 0; s < nk; s++) {
          const p = (j: number) => [K[3 * (3 * s + j)]!, K[3 * (3 * s + j) + 1]!, K[3 * (3 * s + j) + 2]!];
          const sehne = Math.hypot(...p(3).map((x, i) => x - p(0)[i]!));
          expect(Math.hypot(...p(1).map((x, i) => x - p(0)[i]!)), `${z.id} Kurve ${s}`).toBeLessThanOrEqual(sehne + 1e-6);
          expect(Math.hypot(...p(2).map((x, i) => x - p(3)[i]!)), `${z.id} Kurve ${s}`).toBeLessThanOrEqual(sehne + 1e-6);
        }
      }
    }, 60_000 * ZEIT);
  }

  it('Knoten der Umrisse sitzen in der Tiefe genau auf ihrer Linie', () => {
    for (const [name, art] of [
      ['kegel', 'roehre'],
      ['ente', 'teile'],
    ] as const) {
      const { bau } = extremMessen(extremKoerper(name), art, 'kugel', { durchdringung: false, linien: false, zug: false });
      const ns = bau.netz.netzSicht!;
      let geprueft = 0;
      for (const [a, t] of [
        ['seite', 2],
        ['front', 0],
        ['top', 1],
      ] as const) {
        const n = bau.dok.profile[a].knoten.length;
        for (const z of ns.zuege) {
          // die Seite hat je Knoten einen Eintrag (die nahe Hälfte); ihre Spiegelbilder (Beine links) haben keinen
          if (z.art !== `umriss-${a}` || (a === 'seite' && z.id.endsWith('s'))) continue;
          z.knotenNr!.forEach((k, j) => {
            // Front und Top: das Spiegelbild hat eigene Einträge hinter der gezeichneten Hälfte
            const i = a !== 'seite' && z.id.endsWith('s') ? n + k : k;
            const probe = z.knoten![j]!;
            expect(ns.knoten[a][3 * i + t], `${name} ${z.id} Knoten ${k}`).toBeCloseTo(z.punkte[3 * probe + t]!, 6);
            geprueft++;
          });
        }
      }
      expect(geprueft, name).toBeGreaterThan(4);
    }
  }, 60_000 * ZEIT);

  it('Teile sind nicht genau spiegelgleich: die zweite Hälfte der Linien liegt auf ihrer eigenen Haut', () => {
    // mit gespiegelten Kopien lag sie am Vierbeiner bis 3,4 px neben der Haut (die Beine links und rechts weichen ab)
    const { bau, gezeigt: g } = extremMessen(extremKoerper('vierbeiner'), 'teile', 'kugel', { durchdringung: false, linien: false, zug: false });
    const kopie = netzSicht({ dok: bau.dok, punkte: g.punkte, flaechen: g.flaechen, spiegelgleich: true });
    const eigen = netzSicht({ dok: bau.dok, punkte: g.punkte, flaechen: g.flaechen, spiegelgleich: false });
    const haut = (ns: typeof eigen) => Math.max(...Object.values(umrissLinien(ns, bau.dok, g.punkte, g.flaechen)).map((m) => m.haut));
    expect(haut(kopie)).toBeGreaterThan(2);
    expect(haut(eigen)).toBeLessThanOrEqual(1);
  }, 60_000 * ZEIT);
});
