// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 Rest: verdeckte Stücke als eigene Kurven — Enden auf den Stoßstellen,
// Mitwandern mit der schwarzen Linie, gezeichnete Hälfte in Front/Top, ganz verdeckte Schleifen an Ort und Stelle.
import { describe, expect, it } from 'vitest';
import type { V2 } from '../../bezier';
import { neuesDokument } from '../../dokument';
import { type Profil, verschiebeKnoten } from '../../profil';
import { teilKurveAus, teilKurveKnoten, teilKurveMitKnoten, teilKurveStuecke } from './teilKurven';

const PX = 461;
/** Punkt der Bézier-Stücke bei t (für Abstände) */
function abtasten(st: [V2, V2, V2, V2][], n = 20): V2[] {
  const out: V2[] = [];
  for (const [p0, p1, p2, p3] of st)
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = 1 - t;
      out.push({ x: s * s * s * p0.x + 3 * s * s * t * p1.x + 3 * s * t * t * p2.x + t * t * t * p3.x, y: s * s * s * p0.y + 3 * s * s * t * p1.y + 3 * s * t * t * p2.y + t * t * t * p3.y });
    }
  return out;
}
/** Abstand zum Linienzug durch die Abtastpunkte (nicht zum nächsten Abtastpunkt — der liegt bis zu einem halben Schritt daneben) */
function naechster(pts: readonly V2[], q: V2): number {
  let d = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const f = Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1)));
    d = Math.min(d, Math.hypot(a.x + ab.x * f - q.x, a.y + ab.y * f - q.y));
  }
  return d;
}

describe('S4 eigene Kurven für verdeckte Stücke', () => {
  // Startkugel: Seite Kreis um (0; 0,265) mit Radius 0,265
  const r = 0.265;
  const kreisPunkt = (w: number): V2 => ({ x: r * Math.cos(w), y: r + r * Math.sin(w) });

  it('Seite: Stück zwischen zwei Stoßstellen — Enden genau auf der Linie, Form im Rahmen der Stoßstellen', () => {
    const dok = neuesDokument();
    // innerer Bogen von 30° nach 150° (über die Mitte nach oben gewölbt, im Körper)
    const zug: V2[] = [];
    for (let i = 0; i <= 40; i++) {
      const w = (Math.PI / 6) * (1 - i / 40) + ((5 * Math.PI) / 6) * (i / 40);
      const p = kreisPunkt(w);
      zug.push({ x: p.x * 0.999, y: r + (p.y - r) * 0.6 });
    }
    zug[0] = kreisPunkt(Math.PI / 6);
    zug[40] = kreisPunkt((5 * Math.PI) / 6);
    const k = teilKurveAus(dok, 'm1', 'seite', zug)!;
    expect(k.a && k.b).toBeTruthy();
    const kn = teilKurveKnoten(dok, k);
    // die Enden liegen auf der schwarzen Linie (Bézier-Kreis der Startkugel, ≈ 1 px neben dem idealen Kreis)
    const umriss = abtasten(teilKurveStuecke(dok.profile.seite.knoten, true), 80);
    expect(naechster(umriss, kn[0]!.p) * PX).toBeLessThan(0.05);
    expect(naechster(umriss, kn[kn.length - 1]!.p) * PX).toBeLessThan(0.05);
    const kurve = abtasten(teilKurveStuecke(kn));
    for (const p of zug) expect(naechster(kurve, p) * PX).toBeLessThan(2);
    // schwarze Linie oben 20 px höher gezogen (oberster Knoten): Enden bleiben auf der Linie, die Kurve wandert mit
    const seite: Profil = dok.profile.seite;
    const oben = seite.knoten.findIndex((q) => q.p.y > 0.5);
    const dok2 = { ...dok, profile: { ...dok.profile, seite: verschiebeKnoten(seite, [oben], { x: 0, y: 20 / PX }) } };
    const kn2 = teilKurveKnoten(dok2, k);
    const umriss2 = abtasten(teilKurveStuecke(dok2.profile.seite.knoten, true), 80);
    expect(naechster(umriss2, kn2[0]!.p) * PX).toBeLessThan(0.05);
    expect(naechster(umriss2, kn2[kn2.length - 1]!.p) * PX).toBeLessThan(0.05);
    // die Mitte wandert mit (oben gezogen: die Kurve hebt sich, statt stehen zu bleiben)
    const mitte1 = kn[Math.floor(kn.length / 2)]!.p.y;
    const mitte2 = kn2[Math.floor(kn2.length / 2)]!.p.y;
    expect(mitte2).toBeGreaterThan(mitte1);
  });

  it('Gezogene Knoten bleiben im Rahmen: zurück und wieder ausgewertet bitgleich bis 1e-12', () => {
    const dok = neuesDokument();
    const zug: V2[] = [kreisPunkt(Math.PI / 4), { x: 0.1, y: 0.3 }, { x: 0, y: 0.32 }, { x: -0.1, y: 0.3 }, kreisPunkt((3 * Math.PI) / 4)];
    const k = teilKurveAus(dok, 'm1', 'seite', zug)!;
    const kn = teilKurveKnoten(dok, k);
    const mitte = Math.floor(kn.length / 2);
    const gezogen = kn.map((q, i) => (i === mitte ? { ...q, p: { x: q.p.x, y: q.p.y + 0.02 } } : q));
    const k2 = teilKurveMitKnoten(dok, k, gezogen);
    const kn2 = teilKurveKnoten(dok, k2);
    kn2.forEach((q, i) => {
      expect(Math.abs(q.p.x - gezogen[i]!.p.x)).toBeLessThan(1e-12);
      expect(Math.abs(q.p.y - gezogen[i]!.p.y)).toBeLessThan(1e-12);
    });
  });

  it('Top: ein Stück über die Mitte wird die gezeichnete Hälfte bis zur Achse; die gespiegelte Hälfte allein wird gespiegelt', () => {
    const dok = neuesDokument();
    // Top der Startkugel: Kreis um (0, 0) mit Radius 0,265; innerer Bogen von (0,1; +Rand) über die Achse nach (0,1; −Rand)
    const rand = Math.sqrt(r * r - 0.1 * 0.1);
    const zug: V2[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      zug.push({ x: 0.1 - 0.15 * Math.sin(Math.PI * t), y: rand * (1 - 2 * t) });
    }
    const k = teilKurveAus(dok, 'p1', 'top', zug)!;
    expect(k.a).toBeTruthy();
    expect(k.b).toBeUndefined();
    const kn = teilKurveKnoten(dok, k);
    expect(kn.every((q) => q.p.y >= -1e-9)).toBe(true);
    expect(Math.abs(kn[kn.length - 1]!.p.y)).toBeLessThan(1e-9);
    // nur die gespiegelte Hälfte geklickt: dieselbe Kurve auf der gezeichneten Seite
    const unten = zug.filter((p) => p.y <= 0);
    const k2 = teilKurveAus(dok, 'p1', 'top', unten);
    expect(k2).not.toBeNull();
    expect(teilKurveKnoten(dok, k2!).every((q) => q.p.y >= -1e-9)).toBe(true);
  });

  it('Ganz verdeckt (Schleife ohne Berührung der Linie): geschlossen an Ort und Stelle', () => {
    const dok = neuesDokument();
    const zug: V2[] = [];
    for (let i = 0; i <= 24; i++) {
      const w = (2 * Math.PI * i) / 24;
      zug.push({ x: 0.05 * Math.cos(w), y: 0.1 + 0.03 * Math.sin(w) });
    }
    const k = teilKurveAus(dok, 'p2', 'top', zug)!;
    expect(k.zu).toBe(true);
    expect(k.a).toBeUndefined();
    const kurve = abtasten(teilKurveStuecke(teilKurveKnoten(dok, k), true));
    for (const p of zug) expect(naechster(kurve, p) * PX).toBeLessThan(2);
  });
});
