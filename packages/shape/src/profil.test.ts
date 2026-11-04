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
  loeschenMehrere,
  naechsterAufProfil,
  pfadAbtasten,
  segmente,
  umwandeln,
  verschiebeKnoten,
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
  it('ist eine Kugel aus drei Kreisen (4 bzw. 3 Punkte, wie Illustrator)', () => {
    const d = neuesDokument();
    expect(d.profile.seite.knoten).toHaveLength(4);
    expect(d.profile.front.knoten).toHaveLength(3);
    expect(d.profile.top.knoten).toHaveLength(3);
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
    const b = bewegeKnoten(front, 1, { x: -0.3, y: 0.2 });
    expect(b.knoten[1]!.p.x).toBe(0);
    const top = neuesDokument().profile.top;
    const c = bewegeKnoten(top, 2, { x: 0.4, y: 0.3 });
    expect(c.knoten[2]!.p).toEqual({ x: 0.4, y: 0 });
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
    const kn = seite.knoten[1]!;
    const ecke = bewegeGriff(seite, 1, 'ein', { x: kn.p.x - 0.1, y: kn.p.y + 0.1 }, true);
    const g = glaetten(ecke, 1).knoten[1]!;
    expect(g.art).toBe('glatt');
    expect(g.ein.x * g.aus.y - g.ein.y * g.aus.x).toBeCloseTo(0, 10);
  });

  it('Einfügen ist formtreu, Löschen hat Grenzen', () => {
    const seite = neuesDokument().profile.seite;
    const { profil, index } = einfuegen(seite, 3, 0.4);
    expect(index).toBe(4);
    expect(profil.knoten).toHaveLength(5);
    // jeder Punkt der neuen Kurve liegt auf der alten
    for (const p of pfadAbtasten(segmente(profil), 32)) expect(naechsterAufProfil(seite, p)!.abstand).toBeLessThan(1e-6);
    expect(loeschen(profil, 4).knoten).toHaveLength(4);
    const front = neuesDokument().profile.front;
    expect(kannLoeschen(front, 0)).toBe(false);
    expect(kannLoeschen(front, 2)).toBe(false);
    expect(kannLoeschen(front, 1)).toBe(true);
  });

  it('Ziehen setzt keine Punkte von selbst (wie Illustrator)', () => {
    const seite = neuesDokument().profile.seite;
    expect(bewegeKnoten(seite, 1, { x: 0.8, y: 0.3 }).knoten).toHaveLength(4);
  });

  it('Löschen passt die Nachbargriffe an: ein eingefügter Punkt verschwindet spurlos', () => {
    const seite = neuesDokument().profile.seite;
    const mit = einfuegen(seite, 2, 0.37).profil;
    const ohne = loeschen(mit, 3);
    expect(ohne.knoten).toHaveLength(4);
    for (const p of pfadAbtasten(segmente(ohne), 24)) expect(naechsterAufProfil(seite, p)!.abstand).toBeLessThan(1e-4);
  });

  it('Löschen eines Punkts auf einer Beule zeichnet die Form nach statt zu springen', () => {
    const seite = bewegeKnoten(neuesDokument().profile.seite, 1, { x: 0.45, y: r });
    const ohne = loeschen(seite, 1);
    // das neue Segment oben → unten wölbt sich weiter nach hinten aus als der alte Kreis (kein gerader Strich)
    const mitte = pfadAbtasten([segmente(ohne)[0]!], 8)[4]!;
    expect(mitte.x).toBeGreaterThan(r);
  });

  it('⌥-Klick wandelt um: glatt → Ecke ohne Griffe → glatt', () => {
    const top = neuesDokument().profile.top;
    const ecke = umwandeln(top, 1).knoten[1]!;
    expect(ecke.art).toBe('ecke');
    expect(ecke.ein).toEqual({ x: 0, y: 0 });
    const wieder = umwandeln(umwandeln(top, 1), 1).knoten[1]!;
    expect(wieder.art).toBe('glatt');
    expect(Math.hypot(wieder.aus.x, wieder.aus.y)).toBeGreaterThan(0.01);
  });

  it('mehrere Punkte verschieben und löschen', () => {
    const seite = neuesDokument().profile.seite;
    const v = verschiebeKnoten(seite, [1, 3], { x: 0.05, y: 0.02 });
    expect(v.knoten[1]!.p.x).toBeCloseTo(r + 0.05, 12);
    expect(v.knoten[3]!.p.x).toBeCloseTo(-r + 0.05, 12);
    expect(v.knoten[0]!.p).toEqual(seite.knoten[0]!.p);
    expect(loeschenMehrere(seite, [1, 3]).knoten).toHaveLength(2);
    const front = neuesDokument().profile.front;
    // Achspunkte sind nicht löschbar, sie bleiben stehen
    expect(loeschenMehrere(front, [0, 1, 2]).knoten).toHaveLength(2);
    // Achspunkte bleiben beim Verschieben auf der Achse
    expect(verschiebeKnoten(front, [0, 1], { x: 0.1, y: 0.1 }).knoten[0]!.p.x).toBe(0);
  });

  it('findet den nächsten Kurvenpunkt', () => {
    const seite = neuesDokument().profile.seite;
    const t = naechsterAufProfil(seite, { x: 0, y: 2 * r + 0.05 })!;
    expect(t.abstand).toBeCloseTo(0.05, 4);
  });
});
