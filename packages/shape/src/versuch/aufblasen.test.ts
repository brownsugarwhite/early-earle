// Versuch 13.10. nachmittags: Bauweise „rund“ (Seite rund aufgeblasen, Breite aus Top und Front).
import { describe, expect, it } from 'vitest';
import { type Dokument, dokumentLesen, neuesDokument } from '../dokument';
import { naechsterAufProfil, pfadAbtasten, segmente } from '../profil';
import { RUND_GROB, rundKoerper } from './aufblasen';
import { topWelt, topZerlegen } from './seitenteile';
import { Triangulierung } from './dreiecke2d';
import { schnittLoft } from './schnittLoft';
import { type Vorlage, vorlageDokument } from './vorlagen';
import langhalsRoh from './vorlagen/langhals.json';
import ueberhangRoh from './vorlagen/ueberhang.json';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;
const R = 0.265;

const ente = (): Dokument => dokumentLesen(ueberhangRoh);
const langhals = (): Dokument => vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals');

/** Jede gerichtete Kante genau einmal, ihre Gegenrichtung genau einmal; Volumen; Euler-Charakteristik. */
function pruefeNetz(pos: Float32Array, idx: Uint32Array) {
  const kanten = new Map<string, number>();
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const k = `${idx[t + e]},${idx[t + ((e + 1) % 3)]}`;
      kanten.set(k, (kanten.get(k) ?? 0) + 1);
    }
  }
  let falsch = 0;
  for (const [k, n] of kanten) {
    const [a, b] = k.split(',');
    if (n !== 1 || kanten.get(`${b},${a}`) !== 1) falsch++;
  }
  let vol = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = 3 * idx[t]!;
    const b = 3 * idx[t + 1]!;
    const c = 3 * idx[t + 2]!;
    vol += (pos[a]! * (pos[b + 1]! * pos[c + 2]! - pos[b + 2]! * pos[c + 1]!) - pos[a + 1]! * (pos[b]! * pos[c + 2]! - pos[b + 2]! * pos[c]!) + pos[a + 2]! * (pos[b]! * pos[c + 1]! - pos[b + 1]! * pos[c]!)) / 6;
  }
  const euler = pos.length / 3 - kanten.size / 2 + idx.length / 3;
  return { falsch, volumen: vol, euler };
}

/** Knickwinkel zwischen benachbarten Dreiecken (Grad): Anteil p (z. B. 0,99) und Größtwert. */
function knicke(pos: Float32Array, idx: Uint32Array, p: number): { quantil: number; max: number } {
  const nrm = (t: number) => {
    const a = 3 * idx[t]!;
    const b = 3 * idx[t + 1]!;
    const c = 3 * idx[t + 2]!;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    return n.map((q) => q / l);
  };
  const kante = new Map<string, number>();
  const winkel: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = idx[t + e]!;
      const b = idx[t + ((e + 1) % 3)]!;
      const gegen = kante.get(`${b},${a}`);
      if (gegen === undefined) {
        kante.set(`${a},${b}`, t);
        continue;
      }
      const n1 = nrm(t);
      const n2 = nrm(gegen);
      const c = Math.min(1, Math.max(-1, n1[0]! * n2[0]! + n1[1]! * n2[1]! + n1[2]! * n2[2]!));
      winkel.push((Math.acos(c) * 180) / Math.PI);
    }
  }
  winkel.sort((a, b) => a - b);
  return { quantil: winkel[Math.floor(p * (winkel.length - 1))]!, max: winkel[winkel.length - 1]! };
}

describe('Triangulierung mit erzwungenen Kanten', () => {
  it('Umriss bleibt erhalten, alle Dreiecke gegen den Uhrzeigersinn, innen Delaunay', () => {
    // Stern mit 7 Zacken (konkav) und zufälligen Innenpunkten
    let saat = 7;
    const zufall = () => ((saat = (saat * 16807) % 2147483647) - 1) / 2147483646;
    const rand: { x: number; y: number }[] = [];
    for (let i = 0; i < 70; i++) {
      const w = (i / 70) * 2 * Math.PI;
      const r = i % 10 < 5 ? 1 : 0.45;
      rand.push({ x: r * Math.cos(w), y: r * Math.sin(w) });
    }
    const tri = new Triangulierung(-1, -1, 1, 1);
    const idx = rand.map((p) => tri.einfuegen(p.x, p.y));
    for (let i = 0; i < 400; i++) tri.einfuegen(2 * zufall() - 1, 2 * zufall() - 1);
    for (let i = 0; i < idx.length; i++) expect(tri.erzwingen(idx[i]!, idx[(i + 1) % idx.length]!)).toBe(true);
    for (let i = 0; i < idx.length; i++) expect(tri.hatKante(idx[i]!, idx[(i + 1) % idx.length]!)).toBe(true);
    const innen = (x: number, y: number) => {
      let z = 0;
      for (let i = 0; i < rand.length; i++) {
        const a = rand[i]!;
        const b = rand[(i + 1) % rand.length]!;
        if (a.y <= y !== b.y <= y && x < a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)) z++;
      }
      return z % 2 === 1;
    };
    const e = tri.ergebnis(innen);
    let flaeche = 0;
    for (let t = 0; t < e.dreiecke.length; t += 3) {
      const a = e.dreiecke[t]!;
      const b = e.dreiecke[t + 1]!;
      const c = e.dreiecke[t + 2]!;
      const o = (e.x[b]! - e.x[a]!) * (e.y[c]! - e.y[a]!) - (e.y[b]! - e.y[a]!) * (e.x[c]! - e.x[a]!);
      expect(o).toBeGreaterThan(0);
      flaeche += o / 2;
    }
    // Fläche des Sterns (Polygonformel)
    let soll = 0;
    for (let i = 0; i < rand.length; i++) soll += (rand[i]!.x * rand[(i + 1) % rand.length]!.y - rand[(i + 1) % rand.length]!.x * rand[i]!.y) / 2;
    expect(Math.abs(flaeche - soll)).toBeLessThan(1e-9);
    expect(tri.fehlend).toBe(0);
  });
});

describe('Versuch rund (aufblasen)', () => {
  it('drei Kreise ergeben eine Kugel (Radius auf 0,5 px), fein und grob', () => {
    for (const abstand of [undefined, RUND_GROB]) {
      const k = rundKoerper(neuesDokument(), abstand ? { abstand } : {});
      let max = 0;
      let summe = 0;
      const n = k.positionen.length / 3;
      for (let v = 0; v < n; v++) {
        const e = Math.abs(Math.hypot(k.positionen[3 * v]!, k.positionen[3 * v + 1]! - R, k.positionen[3 * v + 2]!) - R);
        max = Math.max(max, e);
        summe += e;
      }
      // Normalen zeigen nach außen und stimmen mit der Kugel überein
      let normalFehler = 0;
      for (let v = 0; v < n; v++) {
        const x = k.positionen[3 * v]!;
        const y = k.positionen[3 * v + 1]! - R;
        const z = k.positionen[3 * v + 2]!;
        const l = Math.hypot(x, y, z);
        const c = (x * k.normalen[3 * v]! + y * k.normalen[3 * v + 1]! + z * k.normalen[3 * v + 2]!) / l;
        normalFehler = Math.max(normalFehler, (Math.acos(Math.min(1, c)) * 180) / Math.PI);
      }
      const netz = pruefeNetz(k.positionen, k.indizes);
      console.log(
        `Kugel ${abstand ? 'grob' : 'fein'}: Radius max ${(max * PX).toFixed(2)} px, Mittel ${((summe / n) * PX).toFixed(3)} px, Normalen max ${normalFehler.toFixed(1)}°, ` +
          `${k.info.dreiecke} Dreiecke, ${k.info.millisekunden.toFixed(0)} ms (Netz ${k.info.zeiten.netz2d.toFixed(0)}, Aufblasen ${k.info.zeiten.aufblasen.toFixed(0)} in ${k.info.cgSchritte} Schritten, Breite ${k.info.zeiten.breite.toFixed(0)})`,
      );
      expect(max * PX).toBeLessThan(0.5);
      expect(normalFehler).toBeLessThan(abstand ? 8 : 5);
      expect(netz.falsch).toBe(0);
      expect(netz.euler).toBe(2);
      expect(Math.abs(netz.volumen / ((4 / 3) * Math.PI * R ** 3) - 1)).toBeLessThan(0.01);
      expect(k.info.fehlendeKanten).toBe(0);
    }
  });

  it('die Seite stimmt genau: Randpunkte auf dem Umriss, z = 0 am Rand', () => {
    for (const dok of [ente(), langhals()]) {
      const k = rundKoerper(dok, { seitenteile: false });
      const f = k.flaeche;
      let max = 0;
      for (const v of f.umriss) {
        const t = naechsterAufProfil(dok.profile.seite, { x: f.x[v]!, y: f.y[v]! })!;
        max = Math.max(max, t.abstand);
        expect(f.z[v]).toBe(0);
      }
      expect(max * PX).toBeLessThan(0.01);
      const netz = pruefeNetz(k.positionen, k.indizes);
      expect(netz.falsch).toBe(0);
      expect(netz.euler).toBe(2);
      expect(netz.volumen).toBeGreaterThan(0);
    }
  });

  it('Langhals: runde Tropfenform, runder Hals ohne Wirbelsäule, keine Knicke (gegen den Schnitt-Loft)', () => {
    const dok = langhals();
    const k = rundKoerper(dok);
    // Hals auf halber Höhe: waagerechter Schnitt durch das Netz (x-Ausdehnung aus der Seite, z-Ausdehnung aus der Front)
    const y0 = 0.42;
    let xMin = Infinity;
    let xMax = -Infinity;
    let zMax = 0;
    const pos = k.positionen;
    for (let t = 0; t < k.indizes.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = 3 * k.indizes[t + e]!;
        const b = 3 * k.indizes[t + ((e + 1) % 3)]!;
        if (pos[a + 1]! <= y0 === pos[b + 1]! <= y0) continue;
        const s = (y0 - pos[a + 1]!) / (pos[b + 1]! - pos[a + 1]!);
        const x = pos[a]! + s * (pos[b]! - pos[a]!);
        const z = pos[a + 2]! + s * (pos[b + 2]! - pos[a + 2]!);
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
        zMax = Math.max(zMax, Math.abs(z));
      }
    }
    const halbX = (xMax - xMin) / 2;
    // halbe Breite der Front auf dieser Höhe (Front auf die Höhe der Seite gestreckt wie im Körper)
    const front = pfadAbtasten(segmente(dok.profile.front), 64);
    const seite = pfadAbtasten(segmente(dok.profile.seite), 64);
    const sy0 = Math.min(...seite.map((q) => q.y));
    const sy1 = Math.max(...seite.map((q) => q.y));
    const fy0 = Math.min(...front.map((q) => q.y));
    const fy1 = Math.max(...front.map((q) => q.y));
    const yf = fy0 + ((y0 - sy0) / (sy1 - sy0)) * (fy1 - fy0);
    let frontHalb = Infinity;
    for (let i = 0; i + 1 < front.length; i++) {
      const a = front[i]!;
      const b = front[i + 1]!;
      if (a.y <= yf !== b.y <= yf) frontHalb = Math.min(frontHalb, Math.abs(a.x + ((yf - a.y) / (b.y - a.y)) * (b.x - a.x)));
    }
    const rund = knicke(k.positionen, k.indizes, 0.99);
    const s = schnittLoft(dok, { aufloesung: 112 });
    const schnitt = knicke(s.positionen, s.indizes, 0.99);
    console.log(
      `Langhals: Hals bei y ${y0}: halbe Breite seitlich ${(halbX * PX).toFixed(1)} px, quer ${(zMax * PX).toFixed(1)} px (Front ${(frontHalb * PX).toFixed(1)} px); ` +
        `Knick zwischen Nachbardreiecken 99 % / max: rund ${rund.quantil.toFixed(1)}° / ${rund.max.toFixed(1)}°, Schnitt-Loft ${schnitt.quantil.toFixed(1)}° / ${schnitt.max.toFixed(1)}°`,
    );
    // Der Hals ist eine Röhre: quer so breit wie die Front dort, seitlich wie die Seite (elliptisch, wenn die Front schmaler ist)
    expect(Math.abs(zMax - frontHalb) * PX).toBeLessThan(1.5);
    // keine Falten (der Schnitt-Loft hatte Knicke bis über 140°)
    expect(rund.max).toBeLessThan(90);
  });

  it('Überhang ohne Wirbelsäule: Schnauze und Bauch bleiben getrennt, beide rund', () => {
    const dok = ente();
    // ohne Seitenteile (mit ihnen wird das Netz über Abstandsfelder vereinigt, dann liegen keine Punkte genau auf z = 0)
    const k = rundKoerper(dok, { seitenteile: false });
    // senkrechter Schnitt bei x = −0,22 (Schnauze oben, Bauch unten, dazwischen Luft)
    const x0 = -0.22;
    const ys: number[] = [];
    const pos = k.positionen;
    for (let t = 0; t < k.indizes.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = 3 * k.indizes[t + e]!;
        const b = 3 * k.indizes[t + ((e + 1) % 3)]!;
        if (pos[a]! <= x0 === pos[b]! <= x0) continue;
        const s = (x0 - pos[a]!) / (pos[b]! - pos[a]!);
        if (Math.abs(pos[a + 2]! + s * (pos[b + 2]! - pos[a + 2]!)) < 1e-9) ys.push(pos[a + 1]! + s * (pos[b + 1]! - pos[a + 1]!));
      }
    }
    // Die Randpunkte des Schnitts (z = 0) liegen auf dem Seitenumriss: vier Höhen (Bauch unten/oben, Schnauze unten/oben)
    ys.sort((a, b) => a - b);
    const hoehen = ys.filter((y, i) => i === 0 || y - ys[i - 1]! > 0.01);
    expect(hoehen.length).toBe(4);
    expect(hoehen[2]! - hoehen[1]!).toBeGreaterThan(0.1);
  });

  it('Haken im Top als Seitenteile: Kerbe bleibt Luft, Widerhaken ist Körper, ein geschlossenes Netz', () => {
    // Zerlegung: nur Florians Überhang hat einen Rücklauf im Top (zwei Widerhaken, je Spiegelseite einer)
    expect(topZerlegen(topWelt(neuesDokument())).teile.length).toBe(0);
    expect(topZerlegen(topWelt(langhals())).teile.length).toBe(0);
    const dok = ente();
    const z = topZerlegen(topWelt(dok));
    expect(z.teile.length).toBe(1);
    const k = rundKoerper(dok);
    expect(k.info.seitenteile).toBe(1);
    const netz = pruefeNetz(k.positionen, k.indizes);
    console.log(`Überhang mit Seitenteil: ${k.info.dreiecke} Dreiecke, ${k.info.millisekunden.toFixed(0)} ms, nicht mannigfaltige Kanten ${netz.falsch}, Euler ${netz.euler}`);
    // ein Stück (Kugel-Topologie); Surface Nets lässt an sehr steilen Stellen einzelne doppelt belegte Kanten stehen
    expect(netz.euler).toBe(2);
    expect(netz.falsch).toBeLessThan(10);
    expect(netz.volumen).toBeGreaterThan(0);
    // Punkt im Widerhaken (Top: x ≈ 0,03, z ≈ 0,22) auf seiner Höhe (Mitte der Front dort ≈ 0,19) ist innen,
    // Punkt in der Kerbe (x ≈ 0,04, z ≈ 0,15) ist außen; ohne Seitenteile ist der Haken nicht da
    const innen = (p: [number, number, number]) => {
      let n = 0;
      const pos = k.positionen;
      const idx = k.indizes;
      for (let t = 0; t < idx.length; t += 3) {
        // Strahl entlang +y
        const a = 3 * idx[t]!;
        const b = 3 * idx[t + 1]!;
        const c = 3 * idx[t + 2]!;
        const ax = pos[a]! - p[0];
        const az = pos[a + 2]! - p[2];
        const bx = pos[b]! - p[0];
        const bz = pos[b + 2]! - p[2];
        const cx = pos[c]! - p[0];
        const cz = pos[c + 2]! - p[2];
        const d1 = ax * bz - az * bx;
        const d2 = bx * cz - bz * cx;
        const d3 = cx * az - cz * ax;
        if (!((d1 > 0 && d2 > 0 && d3 > 0) || (d1 < 0 && d2 < 0 && d3 < 0))) continue;
        const yt = (d2 * pos[a + 1]! + d3 * pos[b + 1]! + d1 * pos[c + 1]!) / (d1 + d2 + d3);
        if (yt > p[1]) n++;
      }
      return n % 2 === 1;
    };
    const haken = topZerlegen(topWelt(dok)).teile[0]!;
    const hx = haken.umriss.reduce((q, p) => q + p.x, 0) / haken.umriss.length;
    const hz = haken.umriss.reduce((q, p) => q + p.y, 0) / haken.umriss.length;
    expect(innen([hx, 0.19, hz])).toBe(true);
    expect(innen([hx, 0.19, -hz])).toBe(true);
    expect(innen([0.04, 0.19, 0.15])).toBe(false);
    const ohne = rundKoerper(dok, { seitenteile: false });
    expect(ohne.info.seitenteile).toBe(0);
  });

  it('Laufzeit fein und grob (Prüfwesen)', () => {
    for (const [name, dok] of [
      ['Kugel', neuesDokument()],
      ['Überhang', ente()],
      ['Langhals', langhals()],
    ] as const) {
      rundKoerper(dok);
      const fein = rundKoerper(dok);
      const grob = rundKoerper(dok, { abstand: RUND_GROB, vereinigen: false });
      console.log(`${name}: fein ${fein.info.millisekunden.toFixed(0)} ms (${fein.info.dreiecke} Dreiecke), grob ${grob.info.millisekunden.toFixed(0)} ms (${grob.info.dreiecke} Dreiecke)`);
      // großzügig: Testdateien laufen parallel
      // mit Seitenteil (Überhang) wird fein über Abstandsfelder vereinigt (≈ 0,4 s); grob nur zusammengelegt
      expect(fein.info.millisekunden).toBeLessThan(name === 'Überhang' ? 1500 : 400);
      expect(grob.info.millisekunden).toBeLessThan(120);
    }
  });
});
