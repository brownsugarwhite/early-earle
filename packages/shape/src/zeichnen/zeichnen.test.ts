// Zeichnen (08.11.2026): Bleistift mit Faden, Anpassen mit den wenigsten Ankern, Formen. Synthetische Striche (Hand mit Zittern und
// Drift, 120 Hz) bis Florians echte Striche als Wiedergabetests dazukommen.
import { describe, expect, it } from 'vitest';
import type { V2 } from '../bezier';
import { rundAusSeite } from '../dicht/rund';
import { type Pfad, abtasten, ankerEinfuegen, stuecke, umrissPunkte } from './bezierPfad';
import { Faden } from './faden';
import { anpassen } from './anpassen';
import { KAPPA, ellipse, rahmen, rechteck } from './formen';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);

/** kleiner fester Zufall (wiederholbar) */
function zufall(saat: number): () => number {
  let s = saat >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
}

/** Zeigerspur einer Hand: Punkte f(t) für t in [0, 1] bei 120 Hz und gegebenem Tempo (px/s), mit Zittern */
function hand(f: (t: number) => V2, laenge: number, tempo: number, zittern: number, saat = 7): V2[] {
  const z = zufall(saat);
  const n = Math.max(8, Math.round((laenge / tempo) * 120));
  const aus: V2[] = [];
  for (let k = 0; k <= n; k++) {
    const p = f(k / n);
    aus.push({ x: p.x + z() * 2 * zittern, y: p.y + z() * 2 * zittern });
  }
  return aus;
}

/** durch den Faden geschickt, am Ende bis zum Zeiger nachgezogen */
function mitFaden(zeiger: readonly V2[], R: number, schritt = 2): V2[] {
  const f = new Faden(R);
  const spur = [f.anfang(zeiger[0]!)];
  for (const p of zeiger.slice(1)) spur.push(...f.folge(p));
  spur.push(...f.ende(zeiger[zeiger.length - 1]!, schritt));
  return spur;
}

/** größter Abstand der Proben q zur Form (zur dicht abgetasteten Linie, Strecke für Strecke) */
function abstandZurForm(p: Pfad, q: readonly V2[]): number {
  const { punkte } = abtasten(p, 0.5);
  const L = p.geschlossen ? [...punkte, punkte[0]!] : punkte;
  let max = 0;
  for (const a of q) {
    let best = Infinity;
    for (let i = 0; i + 1 < L.length; i++) {
      const u = L[i]!;
      const v = L[i + 1]!;
      const dx = v.x - u.x;
      const dy = v.y - u.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((a.x - u.x) * dx + (a.y - u.y) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(u.x + dx * t - a.x, u.y + dy * t - a.y));
    }
    max = Math.max(max, best);
  }
  return max;
}

/** größtes Verhältnis Griff/Sehne über alle Stücke */
function armZuSehne(p: Pfad): number {
  let max = 0;
  for (const s of stuecke(p)) {
    const sehne = Math.hypot(s[3].x - s[0].x, s[3].y - s[0].y);
    const a1 = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y);
    const a2 = Math.hypot(s[2].x - s[3].x, s[2].y - s[3].y);
    max = Math.max(max, a1 / sehne, a2 / sehne);
  }
  return max;
}

/** größter Knick an glatten Ankern (Grad) */
function knickGlatt(p: Pfad): number {
  let max = 0;
  for (const a of p.anker) {
    if (a.ecke || !a.ein || !a.aus) continue;
    const w = Math.acos(Math.max(-1, Math.min(1, -(a.ein.x * a.aus.x + a.ein.y * a.aus.y) / (Math.hypot(a.ein.x, a.ein.y) * Math.hypot(a.aus.x, a.aus.y)))));
    max = Math.max(max, (w * 180) / Math.PI);
  }
  return max;
}

describe('Bleistift: Faden und Anpassen', () => {
  it('Kreis aus der Hand (Maus, Faden 24 px) → vier glatte Anker, nah an der Spur', () => {
    const r = 100;
    const zeiger = hand((t) => {
      const w = 2 * Math.PI * t + 0.3;
      const rr = r * (1 + 0.02 * Math.sin(3 * w));
      return { x: rr * Math.cos(w), y: rr * Math.sin(w) };
    }, 2 * Math.PI * r, 500, 0.6);
    const spur = mitFaden(zeiger, 24);
    const a = anpassen(spur, { treue: 4, schritt: 2, geschlossen: true });
    log(`Kreis: ${a.pfad.anker.length} Anker, Fehler ${a.fehler.toFixed(2)} px, ${a.ms.toFixed(1)} ms, Ecken ${a.ecken}`);
    expect(a.pfad.anker.length).toBe(4);
    expect(a.pfad.anker.every((x) => !x.ecke)).toBe(true);
    expect(a.fehler).toBeLessThanOrEqual(4.01);
    expect(abstandZurForm(a.pfad, spur)).toBeLessThanOrEqual(4.5);
    expect(armZuSehne(a.pfad)).toBeLessThanOrEqual(0.65 + 1e-9);
    expect(knickGlatt(a.pfad)).toBeLessThan(0.5);
  });

  it('Zittern ohne Faden zerfällt nicht in viele Stücke, wenn der Faden davor liegt', () => {
    const zeiger = hand((t) => ({ x: 400 * t, y: 60 * Math.sin(Math.PI * 2 * t) }), 500, 600, 2, 11);
    const roh = anpassen(zeiger, { treue: 2, schritt: 2, geschlossen: false });
    const glatt = anpassen(mitFaden(zeiger, 24), { treue: 4, schritt: 2, geschlossen: false });
    log(`S-Kurve: roh ${roh.pfad.anker.length} Anker, mit Faden ${glatt.pfad.anker.length} Anker (${glatt.ms.toFixed(1)} ms)`);
    expect(glatt.pfad.anker.length).toBeLessThanOrEqual(4);
    expect(glatt.pfad.anker.length).toBeLessThan(roh.pfad.anker.length);
  });

  it('S-Kurve → zwei bis drei Stücke, glatt', () => {
    const zeiger = hand((t) => ({ x: 400 * t, y: 60 * Math.sin(Math.PI * 2 * t) }), 500, 500, 0.6, 3);
    const a = anpassen(mitFaden(zeiger, 24), { treue: 4, schritt: 2, geschlossen: false });
    expect(a.pfad.anker.length).toBeGreaterThanOrEqual(3);
    expect(a.pfad.anker.length).toBeLessThanOrEqual(4);
    expect(knickGlatt(a.pfad)).toBeLessThan(0.5);
  });

  it('Rechteck aus der Hand mit scharfen Ecken (ohne Faden) → vier Ecken, gerade Seiten', () => {
    const E: V2[] = [
      { x: -150, y: -100 },
      { x: 150, y: -100 },
      { x: 150, y: 100 },
      { x: -150, y: 100 },
    ];
    const zeiger = hand((t) => {
      const s = t * 4;
      const i = Math.min(3, Math.floor(s));
      const u = s - i;
      const a = E[i]!;
      const b = E[(i + 1) % 4]!;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }, 1000, 500, 0.4, 5);
    const a = anpassen(zeiger, { treue: 4, schritt: 2, geschlossen: true });
    log(`Rechteck: ${a.pfad.anker.length} Anker, ${a.ecken} Ecken, Fehler ${a.fehler.toFixed(2)}`);
    expect(a.ecken).toBe(4);
    expect(a.pfad.anker.length).toBe(4);
    expect(a.pfad.anker.every((x) => x.ecke)).toBe(true);
  });

  it('Eine enge Rundung ist keine Ecke', () => {
    const zeiger = hand((t) => {
      const w = 2 * Math.PI * t;
      return { x: 30 * Math.cos(w), y: 30 * Math.sin(w) };
    }, 2 * Math.PI * 30, 300, 0.3, 9);
    const a = anpassen(zeiger, { treue: 2, schritt: 2, geschlossen: true });
    expect(a.ecken).toBe(0);
  });

  it('langer Strich bleibt schnell (unter 150 ms)', () => {
    const zeiger = hand((t) => {
      const w = 6 * Math.PI * t;
      return { x: 1500 * t, y: 120 * Math.sin(w) + 40 * Math.sin(3.3 * w) };
    }, 2600, 800, 0.6, 13);
    const a = anpassen(mitFaden(zeiger, 24), { treue: 4, schritt: 2, geschlossen: false });
    log(`langer Strich: ${a.proben} Proben, ${a.pfad.anker.length} Anker, ${a.ms.toFixed(1)} ms`);
    expect(a.ms).toBeLessThan(150);
    expect(a.fehler).toBeLessThanOrEqual(4.01);
  });
});

describe('Formen', () => {
  it('Ellipse: vier glatte Anker, κ = 0,5519150, Kreis auf 0,02 % genau', () => {
    const p = ellipse(0, 0, 100, 100);
    expect(p.anker).toHaveLength(4);
    expect(Math.hypot(p.anker[0]!.aus!.x, p.anker[0]!.aus!.y)).toBeCloseTo(100 * KAPPA, 9);
    const { punkte } = abtasten(p, 0.2);
    let max = 0;
    for (const q of punkte) max = Math.max(max, Math.abs(Math.hypot(q.x, q.y) - 100));
    expect(max).toBeLessThan(0.025);
  });

  it('Rahmen: ⇧ gleich, ⌥ aus der Mitte (wie Illustrator)', () => {
    expect(rahmen({ von: { x: 0, y: 0 }, bis: { x: 100, y: 40 } })).toEqual({ cx: 50, cy: 20, rx: 50, ry: 20 });
    expect(rahmen({ von: { x: 0, y: 0 }, bis: { x: 100, y: 40 }, gleich: true })).toEqual({ cx: 50, cy: 50, rx: 50, ry: 50 });
    expect(rahmen({ von: { x: 10, y: 10 }, bis: { x: 40, y: -30 }, ausMitte: true })).toEqual({ cx: 10, cy: 10, rx: 30, ry: 40 });
  });

  it('Rechteck: vier Ecken, gerade Seiten', () => {
    const p = rechteck(0, 0, 150, 100);
    expect(p.anker.every((a) => a.ecke)).toBe(true);
    for (const s of stuecke(p)) {
      const d = { x: s[3].x - s[0].x, y: s[3].y - s[0].y };
      const k1 = (s[1].x - s[0].x) * d.y - (s[1].y - s[0].y) * d.x;
      expect(Math.abs(k1)).toBeLessThan(1e-9);
    }
  });

  it('Anker einfügen lässt die Linie stehen', () => {
    const p = ellipse(0, 0, 120, 80);
    const vor = abtasten(p, 0.5).punkte;
    const q = ankerEinfuegen(p, 1, 0.37);
    expect(q.anker).toHaveLength(5);
    expect(abstandZurForm(q, vor)).toBeLessThan(0.05);
  });
});

describe('Aufblasen aus dem Pfad (rundAusSeite, unverändert)', () => {
  it('Kreis-Pfad → Kugel (≤ 0,5 % Abweichung)', () => {
    const r = 150;
    const netz = rundAusSeite(umrissPunkte(ellipse(0, 0, r, r), 2), { dreiecke: 6000 });
    let max = 0;
    for (let i = 0; i < netz.positionen.length; i += 3) {
      const d = Math.hypot(netz.positionen[i]!, netz.positionen[i + 1]!, netz.positionen[i + 2]!);
      max = Math.max(max, Math.abs(d - r));
    }
    log(`Kugel aus dem Kreis-Pfad: größte Abweichung ${max.toFixed(3)} (${((100 * max) / r).toFixed(2)} %)`);
    expect(max / r).toBeLessThan(0.005);
  });
});
