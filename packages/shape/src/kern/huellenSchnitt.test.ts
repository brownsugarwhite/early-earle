// Plan 20.10., V4 „Querschnitt aus der Sichthülle“ (`ausstattung.umrisseExakt`): Grenzen aus den Messungen vom 21.10. nachts
// (Florians Ablauf aus der Startkugel, Röhre wie im Editor). Die Kugel bleibt genau eine Kugel, die Robbe trifft Front und Top
// deutlich besser als heute, Ecken laufen als Kanten auf derselben Reihe, flache Enden werden erkannt (Kuppen nicht).
import { describe, expect, it } from 'vitest';
import { kanteZwischen } from '../kaefig/halbkanten';
import { silhouettenBreite } from './breite';
import { huelleEntlang } from './huellenSchnitt';
import { editorBauen, editorPlan, imAblauf } from './pruefen/extremMessung';
import { extremKoerper } from './pruefen/extremreihe';
import { faltenNachZonenRoehre } from './pruefen/zonen';
import { kernLeiter, sprossenVon } from './ableiten';

const bauen = (name: string, huelle: boolean) => {
  const dok = imAblauf(extremKoerper(name).dok(), 'roehre', 'kugel');
  return editorBauen(dok, { ...editorPlan('roehre'), ...(huelle ? { umrisseExakt: true } : {}) });
};
const delta = (b: ReturnType<typeof bauen>) => {
  const bl = b.netz.info.blatt!;
  return { seite: bl.seite.max, front: bl.front.max, top: bl.top.max };
};

describe('V4 Querschnitt aus der Sichthülle', () => {
  it('Kugel bleibt genau (Δ ≤ 0,5 px, Falte wie heute)', () => {
    const b = bauen('kugel', true);
    const d = delta(b);
    expect(Math.max(d.seite, d.front, d.top)).toBeLessThanOrEqual(0.5);
    expect(faltenNachZonenRoehre(b.stand.abl).zonen.frei.max).toBeLessThanOrEqual(3.5);
  }, 60_000);

  it('Robbe: Front und Top deutlich näher an der Zeichnung als heute, Falten nicht schlechter als +2°', () => {
    const heute = bauen('robbe', false);
    const neu = bauen('robbe', true);
    const dh = delta(heute);
    const dn = delta(neu);
    // heute 6,3 / 12,5 px; neu (21.10.) 3,7 / 3,0 px
    expect(dn.front).toBeLessThan(dh.front - 1.5);
    expect(dn.top).toBeLessThan(dh.top - 6);
    expect(dn.front).toBeLessThanOrEqual(4.2);
    expect(dn.top).toBeLessThanOrEqual(3.5);
    expect(faltenNachZonenRoehre(neu.stand.abl).zonen.frei.max).toBeLessThanOrEqual(faltenNachZonenRoehre(heute.stand.abl).zonen.frei.max + 2);
  }, 60_000);

  it('Giraffe mit Bauch: Front 18,9 px heute → ≤ 2,5 px', () => {
    expect(delta(bauen('giraffe-bauch', true)).front).toBeLessThanOrEqual(2.5);
  }, 60_000);

  it('Rochen: die gezeichnete Flügelspitze läuft als Längsfalte auf einer Reihe (kein Zickzack)', () => {
    const b = bauen('rochen', true);
    const abl = b.stand.abl;
    const k = abl.kaefig;
    const { R, N } = abl.vorlage;
    const reihen = new Set<number>();
    let segmente = 0;
    for (let i = 0; i + 1 < R; i++) {
      for (let j = 1; j < N / 2; j++) {
        const e = kanteZwischen(k, abl.vorlage.ringPunkt(i, j), abl.vorlage.ringPunkt(i + 1, j));
        if (e >= 0 && k.eSchaerfe[e]! > 0) {
          reihen.add(j);
          segmente++;
        }
      }
    }
    expect(segmente).toBeGreaterThanOrEqual(6);
    expect(reihen.size).toBe(1);
  }, 60_000);

  it('flache Enden: Kugel rund an beiden Nähten, Pilzstiel flach am Boden', () => {
    for (const [name, erwartet] of [
      ['kugel', 'rund'],
      ['pilz', 'flach'],
    ] as const) {
      const dok = imAblauf(extremKoerper(name).dok(), 'roehre', 'kugel');
      const abl = bauen(name, true).stand.abl;
      const br = silhouettenBreite(dok);
      const sp = sprossenVon(kernLeiter(dok), abl.stationen);
      const mitte = sp[Math.floor(sp.length / 2)]!;
      const h = huelleEntlang(mitte, br, []);
      if (erwartet === 'rund') expect(Math.max(h.flach.oben, h.flach.unten)).toBeLessThan(0.1);
      else expect(h.flach.unten).toBeGreaterThan(0.5);
    }
  }, 60_000);
});
