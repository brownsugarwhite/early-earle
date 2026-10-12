// Maul an der Umrisslinie (Florian 12.10. abends): Maulanfänge sind Umrissknoten, der Umriss zeigt den Spalt.
import { describe, expect, it } from 'vitest';
import { type Linie3, neuesDokument } from '../dokument';
import { bewegeKnoten, pfadAbtasten, segmente } from '../profil';
import { linieDurch, maulAnKontur, versetzt3 } from './linie3d';
import { knotenBei, maulAnfaengeEinbauen, umrissMitSpalt } from './maulUmriss';

const d = neuesDokument();
// Maul der Kugel: Start vorn auf der Kontur (Knoten 3 = vorderster Punkt, etwas tiefer), Mundwinkel innen
function maul(): { oben: Linie3; unten?: Linie3 } {
  const seite = d.profile.seite;
  const vorn = seite.knoten.reduce((a, k) => (k.p.x < a.p.x ? k : a));
  const start: [number, number, number] = [vorn.p.x + 0.004, vorn.p.y - 0.06, 0];
  return { oben: linieDurch([start, [vorn.p.x + 0.08, vorn.p.y - 0.05, 0.08], [vorn.p.x + 0.16, vorn.p.y - 0.02, 0.12]]) };
}

describe('Maul an der Umrisslinie', () => {
  it('Anfang der Oberlinie wird Umrissknoten, die Form bleibt', () => {
    const r = maulAnfaengeEinbauen(d.profile.seite, maul());
    expect(r.oben).toBeGreaterThanOrEqual(0);
    expect(r.seite.knoten.length).toBe(d.profile.seite.knoten.length + 1);
    expect(knotenBei(r.seite, { x: r.zu.oben.knoten[0]!.p[0], y: r.zu.oben.knoten[0]!.p[1] })).toBe(r.oben);
    // formtreu: alter Umriss liegt auf dem neuen
    const alt = pfadAbtasten(segmente(d.profile.seite), 16);
    const neu = pfadAbtasten(segmente(r.seite), 32);
    const zumZug = (p: { x: number; y: number }) => {
      let best = Infinity;
      for (let k = 0; k + 1 < neu.length; k++) {
        const a = neu[k]!;
        const b = neu[k + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
      }
      return best;
    };
    const abst = Math.max(...alt.map(zumZug));
    expect(abst * 461).toBeLessThan(0.5);
    // zweiter Aufruf ändert nichts
    const r2 = maulAnfaengeEinbauen(r.seite, r.zu);
    expect(r2.seite).toBe(r.seite);
  });

  it('Kiefer getrennt: Unterlinien-Anfang wird eigener Knoten auf der Kinnseite, Umriss zeigt den Spalt', () => {
    const m = maul();
    const r = maulAnfaengeEinbauen(d.profile.seite, { oben: m.oben, unten: versetzt3(m.oben, -0.012) });
    expect(r.unten).not.toBeNull();
    expect(r.unten).not.toBe(r.oben);
    const o = r.seite.knoten[r.oben]!.p;
    const u = r.seite.knoten[r.unten!]!.p;
    expect(u.y).toBeLessThan(o.y);
    const sp = umrissMitSpalt(r.seite, r.zu);
    expect(sp).not.toBeNull();
    expect(sp!.segmente.length).toBe(r.seite.knoten.length - 1);
  });

  it('Unterbiss: Unterlinien-Anfang nach vorn ziehen = Umrissknoten ziehen, der Anfang geht genau mit', () => {
    const m = maul();
    const r = maulAnfaengeEinbauen(d.profile.seite, { oben: m.oben, unten: versetzt3(m.oben, -0.012) });
    const u = r.seite.knoten[r.unten!]!.p;
    const seiteNeu = bewegeKnoten(r.seite, r.unten!, { x: u.x - 0.05, y: u.y });
    const gefolgt = maulAnKontur({ zu: r.zu }, r.seite, seiteNeu);
    expect(gefolgt.zu.unten!.knoten[0]!.p[0]).toBeCloseTo(u.x - 0.05, 12);
    expect(gefolgt.zu.oben.knoten[0]!.p).toEqual(r.zu.oben.knoten[0]!.p);
    expect(umrissMitSpalt(seiteNeu, gefolgt.zu)).not.toBeNull();
  });
});
