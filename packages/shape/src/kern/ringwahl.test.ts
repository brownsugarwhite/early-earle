// Plan 20.10., V0: frische Ringwahl mit Rückfall. Die Ringe verdichten sich nach der Krümmung der Seite; an einer
// Stadionform (gerader Rücken und Bauch, Halbkreis-Enden — Würste, Hälse, Beine, Stifte) standen an jedem Ende zehn Ringe
// 3 px auseinander, im geraden Teil drei, und der Löser schob am Übergang Ringe übereinander (frei 138–180°). Klappt die
// freie Haut bei frischer Ringwahl um, wird gestuft neu gewählt; alle übrigen Körper bauen bitgleich. Im Ablauf aus der
// Startkugel (eingefrorene Ringe) trat es nicht auf — es traf „Neu ableiten“, geladene Wesen ohne Stationen, Prüfwesen.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import type { Knoten, Profil } from '../profil';
import { GLATTE_HAUT, ableiten } from './ableiten';
import { s0KoerperDokument } from './pruefen/grundkoerper';
import { faltenNachZonenRoehre } from './pruefen/zonen';

const k = (x: number, y: number, ex = 0, ey = 0, ax = 0, ay = 0, art: 'ecke' | 'glatt' = 'glatt'): Knoten => ({ p: { x, y }, ein: { x: ex, y: ey }, aus: { x: ax, y: ay }, art });
const K = 0.5523;

/** Stadion: Länge 2L, Höhe 2H, gerade Kanten und Halbkreis-Enden in der Seite; Front Kreis, Top Ellipse. */
function stadion(L: number, H: number): Dokument {
  const seite: Profil = {
    art: 'geschlossen',
    knoten: [k(-L + H, 0.1 + H, -0.1, 0, 0.1, 0), k(L - H, 0.1 + H, -0.1, 0, K * H, 0), k(L, 0.1, 0, K * H, 0, -K * H), k(L - H, 0.1 - H, K * H, 0, -0.1, 0), k(-L + H, 0.1 - H, 0.1, 0, -K * H, 0), k(-L, 0.1, 0, -K * H, 0, K * H)],
  };
  const front: Profil = { art: 'halb', achse: 'senkrecht', knoten: [k(0, 0.1 + H, 0, 0, K * H, 0), k(H, 0.1, 0, K * H, 0, -K * H), k(0, 0.1 - H, K * H, 0, 0, 0)] };
  const top: Profil = { art: 'halb', achse: 'waagerecht', knoten: [k(-L, 0, 0, 0, 0, K * H), k(0, H, -K * L, 0, K * L, 0), k(L, 0, 0, K * H, 0, 0)] };
  return { ...neuesDokument('stadion'), profile: { seite, front, top } };
}

const EDITOR = { ...GLATTE_HAUT, fuelle: 'mittel' as const };

describe('Frische Ringwahl mit Rückfall (Plan 20.10., V0)', () => {
  it('Stadionform klappt nicht mehr um (vorher 138° bzw. 155°)', () => {
    for (const [L, H] of [
      [0.4, 0.08],
      [0.42, 0.04],
    ] as const) {
      const vorher = faltenNachZonenRoehre(ableiten(stadion(L, H), { ...EDITOR, ringStufung: 0 })).zonen.frei.max;
      const jetzt = faltenNachZonenRoehre(ableiten(stadion(L, H), EDITOR)).zonen.frei.max;
      expect(vorher, `${L / H}:1 ohne Rückfall`).toBeGreaterThan(100);
      expect(jetzt, `${L / H}:1`).toBeLessThan(20);
    }
  });

  it('Körper ohne Umklappen bauen bitgleich (Rückfall greift nicht)', () => {
    for (const d of [neuesDokument('kugel'), stadion(0.3, 0.1), s0KoerperDokument('vase'), s0KoerperDokument('ente-haken'), s0KoerperDokument('einfach')]) {
      const alt = ableiten(d, { ...EDITOR, ringStufung: 0 }).kaefig.xyz;
      const neu = ableiten(d, EDITOR).kaefig.xyz;
      expect(neu.length === alt.length && neu.every((x, i) => x === alt[i]), d.name).toBe(true);
    }
  });
});
