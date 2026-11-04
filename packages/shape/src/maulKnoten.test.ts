// Lippenanfänge als markierte Knoten des Seitenumrisses (Block 2): einfügen formtreu, trennen, vereinen, bewegen,
// nicht löschbar, Marke übersteht die Rundreise durchs Dokument.
import { describe, expect, it } from 'vitest';
import { dokumentLesen, neuesDokument } from './dokument';
import { maulAnMarken, maulAnfangBewegen, maulAnfangSetzen, maulGetrenntImUmriss, maulKnotenIndex, maulMitMarken, maulTrennen, maulVereinen } from './maulKnoten';
import { kannLoeschen, pfadAbtasten, vollerPfad } from './profil';
import type { Profil } from './profil';

/** Größter Abstand der Kurve a zur Kurve b (Punkte von a gegen den dichten Polygonzug von b). */
const abweichung = (a: Profil, b: Profil): number => {
  const pa = pfadAbtasten(vollerPfad(a), 32);
  const pb = pfadAbtasten(vollerPfad(b), 256);
  let max = 0;
  for (const p of pa) {
    let best = Infinity;
    for (let i = 0; i < pb.length; i++) {
      const q = pb[i]!;
      const r = pb[(i + 1) % pb.length]!;
      const dx = r.x - q.x;
      const dy = r.y - q.y;
      const l2 = dx * dx + dy * dy || 1e-18;
      const u = Math.min(1, Math.max(0, ((p.x - q.x) * dx + (p.y - q.y) * dy) / l2));
      best = Math.min(best, Math.hypot(q.x + dx * u - p.x, q.y + dy * u - p.y));
    }
    max = Math.max(max, best);
  }
  return max;
};

describe('Lippenanfänge im Seitenumriss', () => {
  const kugel = neuesDokument().profile.seite;
  // vorderer Konturpunkt der Startkugel in halber Höhe (Mitte (0, 0,265), r 0,265, Schnauze links)
  const vorn = { x: -0.2648, y: 0.26 };
  const winkel = { x: 0.08, y: 0.185 };

  it('setzen: formtreu eingefügt, als maul markiert, beide Rollen finden ihn', () => {
    const r = maulAnfangSetzen(kugel, vorn);
    expect(r.index).toBeGreaterThanOrEqual(0);
    expect(r.profil.knoten.length).toBe(kugel.knoten.length + 1);
    expect(abweichung(r.profil, kugel)).toBeLessThan(1e-4);
    expect(maulKnotenIndex(r.profil, 'oben')).toBe(r.index);
    expect(maulKnotenIndex(r.profil, 'unten')).toBe(r.index);
    expect(kannLoeschen(r.profil, r.index)).toBe(false);
  });

  it('trennen: roter Knoten bleibt, blauer kommt auf die Kinnseite (tiefer), vereinen stellt die Form wieder her', () => {
    const r = maulAnfangSetzen(kugel, vorn);
    const t = maulTrennen(r.profil, winkel);
    expect(t).not.toBeNull();
    expect(maulGetrenntImUmriss(t!.profil)).toBe(true);
    const oben = t!.profil.knoten[maulKnotenIndex(t!.profil, 'oben')]!.p;
    const unten = t!.profil.knoten[maulKnotenIndex(t!.profil, 'unten')]!.p;
    expect(oben.x).toBeCloseTo(r.punkt.x, 6);
    expect(unten.y).toBeLessThan(oben.y);
    expect(abweichung(t!.profil, kugel)).toBeLessThan(1e-4);
    const v = maulVereinen(t!.profil);
    expect(maulGetrenntImUmriss(v)).toBe(false);
    expect(v.knoten.length).toBe(r.profil.knoten.length);
    expect(abweichung(v, kugel)).toBeLessThan(2e-3);
  });

  it('bewegen: der blaue Anfang wandert mit seinem Knoten, die Kurve folgt (echter Schlitz)', () => {
    const t = maulTrennen(maulAnfangSetzen(kugel, vorn).profil, winkel)!;
    const ziel = { x: -0.23, y: 0.28 };
    const b = maulAnfangBewegen(t.profil, 'unten', ziel);
    expect(b.knoten[maulKnotenIndex(b, 'unten')]!.p).toEqual(ziel);
    expect(b.knoten.length).toBe(t.profil.knoten.length);
  });

  it('Rundreise: die Marke übersteht Speichern und Laden', () => {
    const d = neuesDokument();
    const seite = maulAnfangSetzen(d.profile.seite, vorn).profil;
    const zurueck = dokumentLesen(JSON.parse(JSON.stringify({ ...d, profile: { ...d.profile, seite } })));
    expect(zurueck.profile.seite.knoten.some((k) => k.marke === 'maul')).toBe(true);
  });

  it('Dokument: Lippen mit Marken setzen; Zug am schwarzen Knoten nimmt den Linienanfang mit', () => {
    const d = neuesDokument();
    const k = (x: number, y: number, z = 0) => ({ p: [x, y, z] as [number, number, number], ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const });
    const oben = { knoten: [k(-0.26, 0.26), k(-0.12, 0.24, 0.2), k(0.08, 0.185, 0.18)] };
    const d1 = maulMitMarken(d, { oben });
    const io = maulKnotenIndex(d1.profile.seite, 'oben');
    expect(io).toBeGreaterThanOrEqual(0);
    expect(d1.maul!.zu.oben.knoten[0]!.p[0]).toBeCloseTo(d1.profile.seite.knoten[io]!.p.x, 9);
    // getrennt (M2, jede Lippenlinie mit eigenem Anfang; 14.10.): der blaue Knoten sitzt genau am Anfang der blauen Linie —
    // Überbiss: blau hinter und über rot —, im Umriss der Nachbar des roten Knotens auf der Kinnseite (dazwischen der Schlitz)
    const unten = { knoten: [k(-0.25, 0.27), k(-0.1, 0.25, 0.18), k(0.08, 0.185, 0.18)] };
    const d2 = maulMitMarken(d1, { oben: d1.maul!.zu.oben, unten });
    expect(maulGetrenntImUmriss(d2.profile.seite)).toBe(true);
    const iu = maulKnotenIndex(d2.profile.seite, 'unten');
    const io2 = maulKnotenIndex(d2.profile.seite, 'oben');
    expect(d2.profile.seite.knoten[iu]!.p.x).toBeCloseTo(-0.25, 9);
    expect(d2.profile.seite.knoten[iu]!.p.y).toBeCloseTo(0.27, 9);
    expect(d2.maul!.zu.unten!.knoten[0]!.p[1]).toBeCloseTo(d2.profile.seite.knoten[iu]!.p.y, 9);
    const n = d2.profile.seite.knoten.length;
    expect(Math.abs(iu - io2) === 1 || Math.abs(iu - io2) === n - 1).toBe(true);
    // die übrigen Knoten bleiben, wo sie waren (formtreu eingefügt)
    for (const q of d1.profile.seite.knoten) expect(d2.profile.seite.knoten.some((r) => Math.hypot(r.p.x - q.p.x, r.p.y - q.p.y) < 1e-9)).toBe(true);
    // schwarzen Knoten (blauer Anfang) ziehen → die blaue Linie folgt
    const ziel = { x: -0.22, y: 0.29 };
    const d3 = maulAnMarken({ ...d2, profile: { ...d2.profile, seite: maulAnfangBewegen(d2.profile.seite, 'unten', ziel) } });
    expect(d3.maul!.zu.unten!.knoten[0]!.p[0]).toBeCloseTo(ziel.x, 9);
    expect(d3.maul!.zu.unten!.knoten[0]!.p[1]).toBeCloseTo(ziel.y, 9);
    // gleich: zurück zu einem Knoten
    const d4 = maulMitMarken(d3, { oben: d3.maul!.zu.oben });
    expect(maulGetrenntImUmriss(d4.profile.seite)).toBe(false);
    expect(d4.profile.seite.knoten.filter((q) => q.marke).length).toBe(1);
  });
});
