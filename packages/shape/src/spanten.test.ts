// Spanten (Versuch 12.10. nachmittags): Querschnitte an gewählten Stellen, gleiche Punktstruktur, Überblendung.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from './dokument';
import { querschnitt } from './platzhalter/loft';
import { type Profil, bewegeKnoten, einfuegen, umwandeln } from './profil';
import {
  hauptspantProfil,
  hauptspantStelle,
  spantEinfuegen,
  spantenAngleichen,
  spantenPunktEinfuegen,
  spantenPunktLoeschen,
  spantKasten,
  spantNachWelt,
  spantProfilBei,
  vorlageBei,
  weltNachSpant,
} from './spanten';

const dok = neuesDokument();
const maxAbstand = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i]!.x, p.y - b[i]!.y)));

/** kastiger Querschnitt: mittleren Knoten der Front-Hälfte nach außen oben ziehen und zur Ecke machen */
function kastig(pr: Profil): Profil {
  const k = pr.knoten[1]!;
  return umwandeln(bewegeKnoten(pr, 1, { x: k.p.x + 0.05, y: k.p.y + 0.2 }), 1);
}

describe('Spanten', () => {
  it('ohne Spanten liefert vorlageBei genau den bisherigen Querschnitt', () => {
    const v = vorlageBei(dok, 0.3, 24);
    expect(v.q).toEqual(querschnitt(dok, 24));
  });

  it('Hauptspant: Front normiert auf den Einheitskasten, an der dicksten Stelle', () => {
    const h = hauptspantProfil(dok);
    expect(Math.max(...h.knoten.map((k) => k.p.x))).toBeCloseTo(1, 2);
    expect(Math.min(...h.knoten.map((k) => k.p.y))).toBeCloseTo(0, 2);
    expect(Math.max(...h.knoten.map((k) => k.p.y))).toBeCloseTo(1, 2);
    expect(hauptspantStelle(dok)).toBeCloseTo(0.5, 1);
  });

  it('Kasten und Umrechnung normiert ↔ Welt sind invers', () => {
    const k = spantKasten(dok, 0.3);
    const p = { x: 0.4, y: 0.7 };
    const q = weltNachSpant(k, spantNachWelt(k, p));
    expect(q.x).toBeCloseTo(p.x, 9);
    expect(q.y).toBeCloseTo(p.y, 9);
  });

  it('ein neuer Spant ändert die Form nicht (Überblendung an seiner Stelle)', () => {
    const mitS1 = spantEinfuegen(dok, 0.2);
    const d: Dokument = { ...dok, spanten: mitS1.spanten };
    // mit einem kastigen Spant vorn, dann einen zweiten dazwischen setzen
    const kast: Dokument = { ...d, spanten: [{ ...d.spanten![0]!, profil: kastig(d.spanten![0]!.profil) }] };
    const vorher = [0.1, 0.25, 0.3, 0.4].map((f) => vorlageBei(kast, f, 24).q);
    const zwei = spantEinfuegen(kast, 0.3);
    const nachher: Dokument = { ...kast, spanten: zwei.spanten };
    [0.1, 0.25, 0.3, 0.4].forEach((f, i) => expect(maxAbstand(vorlageBei(nachher, f, 24).q, vorher[i]!)).toBeLessThan(1e-9));
  });

  it('Überblendung: am Spant genau seine Form, davor gehalten, bis zum Hauptspant fließend', () => {
    const s = spantEinfuegen(dok, 0.2);
    const sp = { ...s.spanten[0]!, profil: kastig(s.spanten[0]!.profil) };
    const d: Dokument = { ...dok, spanten: [sp] };
    const hF = hauptspantStelle(d);
    expect(spantProfilBei(d, 0.2).knoten[1]!.p).toEqual(sp.profil.knoten[1]!.p);
    expect(spantProfilBei(d, 0.05).knoten[1]!.p).toEqual(sp.profil.knoten[1]!.p);
    const mitte = spantProfilBei(d, (0.2 + hF) / 2).knoten[1]!.p;
    const h = hauptspantProfil(d).knoten[1]!.p;
    expect(mitte.y).toBeCloseTo((sp.profil.knoten[1]!.p.y + h.y) / 2, 6);
    // Ecke: Härte 1 am Spant, 0,5 auf halbem Weg, 0 am Hauptspant
    expect(vorlageBei(d, 0.2, 24).haerte[1]).toBeCloseTo(1, 9);
    expect(vorlageBei(d, (0.2 + hF) / 2, 24).haerte[1]).toBeCloseTo(0.5, 6);
    expect(vorlageBei(d, hF, 24).haerte[1]).toBeCloseTo(0, 9);
    // Knoten liegen in jeder Station auf derselben Stützstelle
    expect(vorlageBei(d, 0.2, 24).knoten).toEqual(vorlageBei(d, 0.7, 24).knoten);
  });

  it('Punkt einfügen und löschen gilt in allen Querschnitten, die Form bleibt', () => {
    const s = spantEinfuegen(dok, 0.25);
    const d: Dokument = { ...dok, spanten: [{ ...s.spanten[0]!, profil: kastig(s.spanten[0]!.profil) }] };
    const vor = [0.1, 0.25, 0.6].map((f) => vorlageBei(d, f, 48).q);
    const r = spantenPunktEinfuegen(d, 0, 0.5);
    expect(r.dok.profile.front.knoten.length).toBe(d.profile.front.knoten.length + 1);
    expect(r.dok.spanten![0]!.profil.knoten.length).toBe(r.dok.profile.front.knoten.length);
    // formtreu eingefügt: die Querschnitte bleiben (bis auf die Verteilung der Stützstellen)
    [0.1, 0.25, 0.6].forEach((f, i) => {
      const nach = vorlageBei(r.dok, f, 48).q;
      // Abstand zum neuen Polygonzug (die Stützstellen verteilen sich anders, die Kurve bleibt)
      const zumZug = (p: { x: number; y: number }) => {
        let best = Infinity;
        for (let k = 0; k + 1 < nach.length; k++) {
          const a = nach[k]!;
          const b = nach[k + 1]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
          best = Math.min(best, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
        }
        return best;
      };
      expect(Math.max(...vor[i]!.map(zumZug))).toBeLessThan(0.003);
    });
    const weg = spantenPunktLoeschen(r.dok, r.index)!;
    expect(weg.profile.front.knoten.length).toBe(d.profile.front.knoten.length);
    expect(weg.spanten![0]!.profil.knoten.length).toBe(weg.profile.front.knoten.length);
    expect(spantenPunktLoeschen(d, 0)).toBeNull();
  });

  it('Front mit dem Zeichenstift geändert: die Spanten gleichen ihre Punktstruktur an', () => {
    const s = spantEinfuegen(dok, 0.25);
    const front = dok.profile.front;
    const neu = einfuegen(front, 0, 0.4).profil;
    const angeglichen = spantenAngleichen(front, neu, s.spanten);
    expect(angeglichen[0]!.profil.knoten.length).toBe(neu.knoten.length);
    const zurueck = spantenAngleichen(neu, front, angeglichen);
    expect(zurueck[0]!.profil.knoten.length).toBe(front.knoten.length);
  });
});
