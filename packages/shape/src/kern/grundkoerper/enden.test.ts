// Teil G, G2: Enden der Wirbelsäule. Bestehende Körper bauen bitgleich (vorderster/hinterster Punkt), Florians Ente und
// die Giraffe mit Bauch vor der Nase bekommen Schnabel bzw. Nase als Anfang, und ein Zug am Bauch über die Nase hinweg
// wirft die eingefrorenen Enden nicht mehr um.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { WIRBEL_STANDARD, leiter } from '../../versuch/wirbelsaeule';
import { ableiten, kernLeiter, leiterEntfaechern, leiterInnenEntfaechern } from '../ableiten';
import { giraffeBauchDokument, gKoerperDokument } from '../pruefen/grundkoerper';
import { KOERPER, koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { endenAutomatisch, endenFuer } from './enden';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil G, G2: Enden der Wirbelsäule', () => {
  it('bestehende Körper: Enden wie bisher, Leiter bitgleich', () => {
    for (const k of KOERPER)
      for (const s of [1, 2, 3]) {
        const d = koerperDokument(k, zufall(s));
        expect(endenAutomatisch(d.profile.seite).quelle, `${k} ${s}`).toBe('spitzen');
        const neu = kernLeiter(d);
        const alt = leiterEntfaechern(leiter(d, WIRBEL_STANDARD));
        // G2b ändert bestehende Körper nicht (keine Fächer über eine Sprossenlänge)
        expect(leiterInnenEntfaechern(alt), `${k} ${s}`).toBe(alt);
        expect(neu.ruecken, `${k} ${s}`).toEqual(alt.ruecken);
        expect(neu.bauch, `${k} ${s}`).toEqual(alt.bauch);
        expect(neu.paare, `${k} ${s}`).toEqual(alt.paare);
      }
  });

  it('Ente: Schnabel vorn, Schwanz hinten; Giraffe mit Bauch vor der Nase: Nase vorn', () => {
    const ente = endenAutomatisch(gKoerperDokument('ente').profile.seite);
    expect(ente.quelle).toBe('achse');
    expect(ente.vorn.x).toBeLessThan(-0.17);
    expect(ente.vorn.y).toBeGreaterThan(0.5);
    expect(ente.hinten.x).toBeGreaterThan(0.2);
    const g = endenAutomatisch(gKoerperDokument('giraffe-bauch').profile.seite);
    expect(g.quelle).toBe('achse');
    expect(Math.hypot(g.vorn.x + 0.2, g.vorn.y - 0.93)).toBeLessThan(0.02);
  });

  it('Zug am Bauch über die Nase hinweg: eingefrorene Enden bleiben an der Nase (vorher sprang der Anfang zum Bauch)', () => {
    // Giraffe mit dem Bauch 4 cm hinter der Nase; Florian zieht die Bauchknoten in zehn Schritten 12 cm nach vorn
    const start = giraffeBauchDokument(-0.04);
    const bauch = start.profile.seite.knoten.map((k, i) => ({ i, k })).filter(({ k }) => k.p.y < 0.45 && k.p.x < -0.1).map(({ i }) => i);
    expect(bauch.length).toBeGreaterThan(0);
    let dok: Dokument = start;
    let altSprung = false;
    let maxNase = 0;
    for (let schritt = 0; schritt <= 10; schritt++) {
      const dx = (-0.12 * schritt) / 10;
      const seite = { ...start.profile.seite, knoten: start.profile.seite.knoten.map((k, i) => (bauch.includes(i) ? { ...k, p: { x: k.p.x + dx, y: k.p.y } } : k)) };
      dok = { ...dok, profile: { ...dok.profile, seite } };
      const abl = ableiten(dok, { stufen: 1 });
      const l = kernLeiter(dok);
      const vorn = l.ruecken[0]!;
      maxNase = Math.max(maxNase, Math.hypot(vorn.x + 0.2, vorn.y - 0.93));
      // alter Weg: vorderster Punkt
      const alt = leiterEntfaechern(leiter(dok, WIRBEL_STANDARD)).ruecken[0]!;
      if (Math.hypot(alt.x + 0.2, alt.y - 0.93) > 0.1) altSprung = true;
      // wie der Editor: die wirksamen Stationen samt Enden einfrieren
      dok = { ...dok, kaefig: { deltas: [], stationen: abl.gefroren } };
      expect(endenFuer(dok).quelle).toBe('eingefroren');
    }
    console.log(`Nase: größter Abstand des Anfangs ${(maxNase * 461).toFixed(1)} px über 10 Schritte; alter Weg springt zum Bauch: ${altSprung}`);
    expect(altSprung).toBe(true);
    expect(maxNase * 461).toBeLessThan(5);
  });
});
