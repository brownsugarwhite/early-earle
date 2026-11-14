// Teil G, G2: Enden der Wirbelsäule. Bestehende Körper bauen bitgleich (vorderster/hinterster Punkt), Florians Ente und
// die Giraffe mit Bauch vor der Nase bekommen Schnabel bzw. Nase als Anfang, und ein Zug am Bauch über die Nase hinweg
// wirft die eingefrorenen Enden nicht mehr um.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../../dokument';
import { WIRBEL_STANDARD, leiter } from '../../versuch/wirbelsaeule';
import { ableiten, kernLeiter, leiterEntfaechern, leiterInnenEntfaechern } from '../ableiten';
import { giraffeBauchDokument, gKoerperDokument } from '../pruefen/grundkoerper';
import { kugelMaulDokument, mitStationenVon, pruefenMaul } from '../pruefstand';
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
  // Regression G2 (Florian 16.10. morgens): Die an der Startkugel eingefrorenen Enden blieben nach dem Umformen an der alten
  // Kugelstelle (Schnabel: Seite Δ 34 px; Unterbiss: Δ 20 px, 822 Durchdringungen; Vase: Wirbelsäule quer durch den Körper)
  const K = 0.146;
  const kn = (x: number, y: number, ex: number, ey: number, ax: number, ay: number, art: 'glatt' | 'ecke' = 'glatt') => ({ p: { x, y }, ein: { x: ex, y: ey }, aus: { x: ax, y: ay }, art });
  const r = 0.265;
  const schnabel = { art: 'geschlossen' as const, knoten: [kn(0, 2 * r, -K, 0, K, 0), kn(r, r, 0, K, 0, -K), kn(0, 0, K, 0, -K, 0), kn(-0.3975, 0.1405, 0.1, -0.08, 0.06, 0.02, 'ecke'), kn(-0.255, 0.1935, -0.05, -0.015, -0.03, 0.1, 'ecke')] };
  const vase = { art: 'geschlossen' as const, knoten: [kn(-0.12, 0.95, 0, -0.08, 0.08, 0, 'ecke'), kn(0.13, 0.95, -0.08, 0, 0, -0.1, 'ecke'), kn(0.11, 0.55, 0, 0.1, 0, -0.08), kn(0.27, 0.27, 0, 0.1, 0, -0.14), kn(0, 0, K, 0, -K, 0), kn(-0.26, 0.32, 0, -0.14, 0, 0.1), kn(-0.12, 0.6, -0.02, -0.08, 0, 0.1)] };

  it('Startkugel eingefroren, dann umgeformt: Schnabelspitze vorn (auch mit gezeichnetem Maul), Vase mit Ende im Kopf', () => {
    const start = neuesDokument('kugel');
    const g0 = ableiten(start, { stufen: 1 }).gefroren;
    const mit = (seite: typeof schnabel, maul = false): Dokument => ({ ...start, profile: { ...start.profile, seite }, kaefig: { deltas: [], stationen: g0 }, ...(maul ? { maul: kugelMaulDokument('florian').maul! } : {}) });
    const vornS = kernLeiter(mit(schnabel)).ruecken[0]!;
    expect(Math.hypot(vornS.x + 0.3975, vornS.y - 0.1405)).toBeLessThan(0.005);
    const vornM = kernLeiter(mit(schnabel, true)).ruecken[0]!;
    expect(Math.hypot(vornM.x + 0.3975, vornM.y - 0.1405)).toBeLessThan(0.005);
    expect(endenFuer(mit(schnabel, true)).quelle).toBe('spitzen');
    const lv = kernLeiter(mit(vase));
    const kopf = [lv.ruecken[0]!, lv.ruecken[lv.ruecken.length - 1]!].some((p) => p.y > 0.85);
    expect(kopf).toBe(true);
  });

  it('Maul-Prüfreihe mit eingefrorener Startkugel: Florians Unterbiss baut wie vor G2 (Δ ≤ 2 px, keine Durchdringung)', () => {
    const d = mitStationenVon(kugelMaulDokument('florian', true), neuesDokument('kugel'));
    const m = pruefenMaul(d);
    expect(m.delta.seite).toBeLessThan(2);
    expect(m.delta.top).toBeLessThan(3);
    expect(m.paare.every((p) => p.paare === 0)).toBe(true);
  }, 120_000);
});
