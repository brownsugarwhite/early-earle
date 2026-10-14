// Eingefrorene Maullage (14.10.): Winkelring, Ringanfang und Konturanfang bleiben beim Ziehen eines Lippenanfangs, solange
// sie gültig sind bzw. im Band um ihre Schwelle liegen — sonst sprang das Netz (Langhals: Käfig 499 ↔ 513 Punkte beim
// Ziehen des roten Anfangs; Kugel: Lippe 18 px in eine andere Kappenzeile).
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import langhalsRoh from '../versuch/vorlagen/langhals.json';
import { ableitenMitMaul, maulOptionenVorlage } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { anfangVerschieben, kieferGetrennt, kugelMaulDokument, langhalsLinieDokument, mitStationenVon } from './pruefstand';

const bauen = (dok: Dokument) => {
  const g = dok.kaefig?.stationen;
  return ableitenMitMaul(dok, maulLinieAusDokument(dok)!, { stufen: 1, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
};
/** Lippenanfang um (dx, dy) in Welt-Einheiten verschieben (wie ein Zug im Editor) */
const zug = (d: Dokument, rolle: 'oben' | 'unten', dx: number, dy: number) => anfangVerschieben(d, rolle, dx / d.skalierung, dy / d.skalierung);

describe('Eingefrorene Maullage', () => {
  it('Langhals getrennt: der Winkelring bleibt, wenn der rote Anfang nach unten gezogen wird (vorher Käfig 499 ↔ 513)', () => {
    const v = langhalsRoh as unknown as Vorlage;
    const roh = kieferGetrennt(langhalsLinieDokument(vorlageDokument(v, 'zu', 'langhals'), { x: -0.125, y: 0.611 }, { x: -0.085, y: 0.635 }, { x: -0.04, y: 0.66 }));
    const basis = mitStationenVon(roh, roh);
    expect(basis.kaefig?.stationen?.maul?.winkel).toBeGreaterThan(0);
    const a0 = bauen(basis);
    for (const dy of [0.03, 0.032, 0.034, 0.036, 0.04]) {
      const a = bauen(zug(basis, 'oben', 0, -dy));
      expect(a.maul.lage.k, `${dy}`).toBe(a0.maul.lage.k);
      expect(a.kaefig.n, `${dy}`).toBe(a0.kaefig.n);
    }
  }, 60_000);

  it('Kugel: der Anfang bleibt im Band in seiner Kappenzeile und wechselt erst dahinter; zurück erst unter dem halben Abstand', () => {
    const roh = kugelMaulDokument('gleich', true);
    const basis = mitStationenVon(roh, roh);
    // Anfang 2,6 px unter der Spitze: Lippe durch die Spitze (Zeile c/2), eingefroren als „nicht auf der Kontur“
    expect(basis.kaefig?.stationen?.maul?.kontur).toBe(false);
    const bL0 = bauen(basis).maul.lage.bL;
    // 6 px tiefer (Anfang 8,9 px unter der Spitze, über der alten Schwelle von 4,6 px): bleibt
    expect(bauen(zug(basis, 'oben', 0, -0.014)).maul.lage.bL).toBe(bL0);
    // 9 px tiefer (11,7 px, über dem doppelten Abstand): Konturanfang, eine Zeile tiefer
    const unten = zug(basis, 'oben', 0, -0.02);
    expect(bauen(unten).maul.lage.bL).toBe(bL0 - 1);
    // von dort aus eingefroren (Konturanfang) wieder hoch auf 3,5 px unter der Spitze (unter der alten Schwelle, über dem halben Abstand): bleibt
    const untenGefroren = mitStationenVon(unten, unten);
    expect(untenGefroren.kaefig?.stationen?.maul?.kontur).toBe(true);
    expect(bauen(zug(untenGefroren, 'oben', 0, 0.0182)).maul.lage.bL).toBe(bL0 - 1);
  }, 60_000);
});
