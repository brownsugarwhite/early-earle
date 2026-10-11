import { describe, expect, it } from 'vitest';
import { abstand, punktAuf, teilen } from './bezier';
import { neuesDokument } from './dokument';
import {
  START_RADIUS,
  bewegeGriff,
  bewegeKnoten,
  einfuegen,
  glaetten,
  kannLoeschen,
  loeschen,
  naechsterAufProfil,
  pfadAbtasten,
  segmente,
  umwandeln,
  vollerPfad,
} from './profil';

const r = START_RADIUS;

describe('Bézier', () => {
  it('Teilen ist formtreu', () => {
    const k = [{ x: 0, y: 0 }, { x: 0.3, y: 0.8 }, { x: 0.9, y: -0.2 }, { x: 1, y: 0.5 }] as const;
    const [a, b] = teilen(k, 0.37);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const p = punktAuf(k, t);
      const q = t <= 0.37 ? punktAuf(a, t / 0.37) : punktAuf(b, (t - 0.37) / 0.63);
      expect(abstand(p, q)).toBeLessThan(1e-9);
    }
  });
});

describe('Startform', () => {
  it('ist eine Kugel aus drei Kreisen (12 bzw. 7 Punkte)', () => {
    const d = neuesDokument();
    expect(d.profile.seite.knoten).toHaveLength(12);
    expect(d.profile.front.knoten).toHaveLength(7);
    expect(d.profile.top.knoten).toHaveLength(7);
    expect(d.skalierung).toBe(1);
    // alle Kurvenpunkte liegen auf dem Kreis (Bézier-Näherung < 0,1 %)
    for (const p of pfadAbtasten(vollerPfad(d.profile.seite), 16)) expect(Math.abs(abstand(p, { x: 0, y: r }) - r)).toBeLessThan(r * 1e-3);
    for (const p of pfadAbtasten(vollerPfad(d.profile.front), 16)) expect(Math.abs(abstand(p, { x: 0, y: r }) - r)).toBeLessThan(r * 1e-3);
    for (const p of pfadAbtasten(vollerPfad(d.profile.top), 16)) expect(Math.abs(abstand(p, { x: 0, y: 0 }) - r)).toBeLessThan(r * 1e-3);
  });
});

describe('Bearbeiten', () => {
  it('Achspunkte bleiben auf der Achse, innere Punkte auf ihrer Hälfte', () => {
    const front = neuesDokument().profile.front;
    const a = bewegeKnoten(front, 0, { x: 0.2, y: 0.7 });
    expect(a.knoten[0]!.p).toEqual({ x: 0, y: 0.7 });
    const b = bewegeKnoten(front, 3, { x: -0.3, y: 0.2 });
    expect(b.knoten[3]!.p.x).toBe(0);
    const top = neuesDokument().profile.top;
    const c = bewegeKnoten(top, 6, { x: 0.4, y: 0.3 });
    expect(c.knoten[6]!.p).toEqual({ x: 0.4, y: 0 });
  });

  it('glatter Griff zieht den Gegengriff als Linie mit, ⌥ macht eine Ecke', () => {
    const seite = neuesDokument().profile.seite;
    const kn = seite.knoten[2]!;
    const lEin = Math.hypot(kn.ein.x, kn.ein.y);
    const glatt = bewegeGriff(seite, 2, 'aus', { x: kn.p.x + 0.1, y: kn.p.y + 0.05 }, false).knoten[2]!;
    expect(glatt.art).toBe('glatt');
    // Gegengriff entgegengesetzt, Länge unverändert
    expect(glatt.ein.x * glatt.aus.y - glatt.ein.y * glatt.aus.x).toBeCloseTo(0, 10);
    expect(glatt.ein.x * glatt.aus.x + glatt.ein.y * glatt.aus.y).toBeLessThan(0);
    expect(Math.hypot(glatt.ein.x, glatt.ein.y)).toBeCloseTo(lEin, 10);
    const ecke = bewegeGriff(seite, 2, 'aus', { x: kn.p.x + 0.1, y: kn.p.y + 0.05 }, true).knoten[2]!;
    expect(ecke.art).toBe('ecke');
    expect(ecke.ein).toEqual(kn.ein);
  });

  it('Achs-Ecke: Spiegelgriff ist das Spiegelbild (Tropfenspitze im Top)', () => {
    const top = neuesDokument().profile.top;
    const kn = top.knoten[0]!;
    const e = bewegeGriff(top, 0, 'aus', { x: kn.p.x + 0.05, y: 0.06 }, true).knoten[0]!;
    expect(e.art).toBe('ecke');
    expect(e.ein).toEqual({ x: e.aus.x, y: -e.aus.y });
    // glatt am Achspunkt: quer zur Achse
    const g = bewegeGriff(top, 0, 'aus', { x: kn.p.x + 0.05, y: 0.06 }, false).knoten[0]!;
    expect(g.aus.x).toBe(0);
  });

  it('Glätten macht die Griffe wieder zur Linie', () => {
    const seite = neuesDokument().profile.seite;
    const kn = seite.knoten[4]!;
    const ecke = bewegeGriff(seite, 4, 'ein', { x: kn.p.x, y: kn.p.y + 0.1 }, true);
    const g = glaetten(ecke, 4).knoten[4]!;
    expect(g.art).toBe('glatt');
    expect(g.ein.x * g.aus.y - g.ein.y * g.aus.x).toBeCloseTo(0, 10);
  });

  it('Einfügen ist formtreu, Löschen hat Grenzen', () => {
    const seite = neuesDokument().profile.seite;
    const vorher = pfadAbtasten(segmente(seite), 32);
    const { profil, index } = einfuegen(seite, 3, 0.4);
    expect(index).toBe(4);
    expect(profil.knoten).toHaveLength(13);
    for (const p of pfadAbtasten(segmente(profil), 32)) {
      const best = Math.min(...vorher.map((q) => abstand(p, q)));
      expect(best).toBeLessThan(0.004);
    }
    expect(loeschen(profil, 4).knoten).toHaveLength(12);
    const front = neuesDokument().profile.front;
    expect(kannLoeschen(front, 0)).toBe(false);
    expect(kannLoeschen(front, 6)).toBe(false);
    expect(kannLoeschen(front, 3)).toBe(true);
  });

  it('Ziehen setzt keine Punkte von selbst (wie Illustrator)', () => {
    const seite = neuesDokument().profile.seite;
    expect(bewegeKnoten(seite, 3, { x: 0.8, y: 0.3 }).knoten).toHaveLength(12);
  });

  it('Löschen passt die Nachbargriffe an: ein eingefügter Punkt verschwindet spurlos', () => {
    const seite = neuesDokument().profile.seite;
    const mit = einfuegen(seite, 2, 0.37).profil;
    const ohne = loeschen(mit, 3);
    expect(ohne.knoten).toHaveLength(12);
    const a = pfadAbtasten(segmente(seite), 24);
    const b = pfadAbtasten(segmente(ohne), 24);
    for (let i = 0; i < a.length; i++) expect(abstand(a[i]!, b[i]!)).toBeLessThan(2e-4);
  });

  it('Löschen eines Punkts auf einer Beule zeichnet die Form nach statt zu springen', () => {
    const seite = bewegeKnoten(neuesDokument().profile.seite, 2, { x: 0.32, y: 0.5 });
    const ohne = loeschen(seite, 2);
    // das neue Segment läuft zwischen den Nachbarn nach außen (kein gerader Strich)
    const mitte = pfadAbtasten([segmente(ohne)[1]!], 8)[4]!;
    expect(abstand(mitte, { x: 0, y: r })).toBeGreaterThan(r);
  });

  it('⌥-Klick wandelt um: glatt → Ecke ohne Griffe → glatt', () => {
    const top = neuesDokument().profile.top;
    const ecke = umwandeln(top, 2).knoten[2]!;
    expect(ecke.art).toBe('ecke');
    expect(ecke.ein).toEqual({ x: 0, y: 0 });
    const wieder = umwandeln(umwandeln(top, 2), 2).knoten[2]!;
    expect(wieder.art).toBe('glatt');
    expect(Math.hypot(wieder.aus.x, wieder.aus.y)).toBeGreaterThan(0.01);
  });

  it('findet den nächsten Kurvenpunkt', () => {
    const seite = neuesDokument().profile.seite;
    const t = naechsterAufProfil(seite, { x: 0, y: 2 * r + 0.05 })!;
    expect(t.abstand).toBeCloseTo(0.05, 4);
  });
});
