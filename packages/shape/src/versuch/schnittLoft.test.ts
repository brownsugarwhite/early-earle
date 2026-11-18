// Versuch 13.10.: Schnitt-Loft, ein impliziter Loft aus echten Schnitten (Florians Überhang, Acht, Top-Haken).
import { describe, expect, it } from 'vitest';
import type { V2 } from '../bezier';
import { type Dokument, dokumentLesen, neuesDokument } from '../dokument';
import { loftNetz } from '../platzhalter/loft';
import type { Profil } from '../profil';
import { hauptspantProfil } from '../spanten';
import { schnittLoft } from './schnittLoft';
import ueberhangRoh from './vorlagen/ueberhang.json';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now: () => number };
const PX = 461;

const ente = (): Dokument => dokumentLesen(ueberhangRoh);
/** Florians Acht (Spant S1 der Ente), normiert auf den Kasten */
const acht = () => ente().spanten![0]!.profil;

/** Punkt in den Umrissen (gerade-ungerade über alle Linien). */
function innen(umrisse: V2[][], p: V2): boolean {
  let z = 0;
  for (const u of umrisse) {
    for (let i = 0; i < u.length; i++) {
      const a = u[i]!;
      const b = u[(i + 1) % u.length]!;
      if (a.y <= p.y !== b.y <= p.y && p.x < a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x)) z++;
    }
  }
  return z % 2 === 1;
}

/** Punkt im Dreiecksnetz (Strahl entlang +z, Kreuzungen zählen). */
function innenImNetz(pos: Float32Array, idx: Uint32Array, p: [number, number, number]): boolean {
  let z = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = 3 * idx[t]!;
    const b = 3 * idx[t + 1]!;
    const c = 3 * idx[t + 2]!;
    const ax = pos[a]! - p[0];
    const ay = pos[a + 1]! - p[1];
    const bx = pos[b]! - p[0];
    const by = pos[b + 1]! - p[1];
    const cx = pos[c]! - p[0];
    const cy = pos[c + 1]! - p[1];
    const d1 = ax * by - ay * bx;
    const d2 = bx * cy - by * cx;
    const d3 = cx * ay - cy * ax;
    if (!((d1 > 0 && d2 > 0 && d3 > 0) || (d1 < 0 && d2 < 0 && d3 < 0))) continue;
    const s = d1 + d2 + d3;
    const zt = (d2 * pos[a + 2]! + d3 * pos[b + 2]! + d1 * pos[c + 2]!) / s;
    if (zt > p[2]) z++;
  }
  return z % 2 === 1;
}

/** Netz mit der Ebene x = x0 schneiden: Strecken (z, y) des Schnitts, zu Zügen verbunden. */
function netzSchnitt(pos: Float32Array, idx: Uint32Array, x0: number): V2[][] {
  const strecken: [V2, V2][] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const pk: V2[] = [];
    for (let e = 0; e < 3; e++) {
      const a = 3 * idx[t + e]!;
      const b = 3 * idx[t + ((e + 1) % 3)]!;
      const xa = pos[a]! - x0;
      const xb = pos[b]! - x0;
      if (xa < 0 === xb < 0) continue;
      const u = xa / (xa - xb);
      pk.push({ x: pos[a + 2]! + u * (pos[b + 2]! - pos[a + 2]!), y: pos[a + 1]! + u * (pos[b + 1]! - pos[a + 1]!) });
    }
    if (pk.length === 2) strecken.push([pk[0]!, pk[1]!]);
  }
  // längsten Zug aus den Strecken bilden (Enden über die Lage verbinden)
  const key = (p: V2) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`;
  const nb = new Map<string, V2[]>();
  for (const [a, b] of strecken) {
    (nb.get(key(a)) ?? nb.set(key(a), []).get(key(a))!).push(b);
    (nb.get(key(b)) ?? nb.set(key(b), []).get(key(b))!).push(a);
  }
  const besucht = new Set<string>();
  const zuege: V2[][] = [];
  for (const [a] of strecken) {
    if (besucht.has(key(a))) continue;
    const zug: V2[] = [];
    let p: V2 | undefined = a;
    while (p && !besucht.has(key(p))) {
      besucht.add(key(p));
      zug.push(p);
      p = (nb.get(key(p)) ?? []).find((q) => !besucht.has(key(q)));
    }
    zuege.push(zug);
  }
  return zuege.sort((a, b) => b.length - a.length);
}

/** schärfste Richtungsänderung entlang eines geschlossenen Zugs über ±r (Grad), nur für |z| ≥ 0,05 und y im Bereich. */
function eckWinkel(z: V2[], r: number, yBereich: [number, number] = [-Infinity, Infinity]): { winkel: number; y: number } {
  const n = z.length;
  const bogen = [0];
  for (let i = 1; i <= n; i++) bogen.push(bogen[i - 1]! + Math.hypot(z[i % n]!.x - z[i - 1]!.x, z[i % n]!.y - z[i - 1]!.y));
  const L = bogen[n]!;
  const bei = (s0: number) => {
    const s1 = ((s0 % L) + L) % L;
    let i = 0;
    while (i < n - 1 && bogen[i + 1]! < s1) i++;
    return z[i]!;
  };
  let best = { winkel: 0, y: 0 };
  for (let i = 0; i < n; i++) {
    if (Math.abs(z[i]!.x) < 0.05 || z[i]!.y < yBereich[0] || z[i]!.y > yBereich[1]) continue;
    const a = bei(bogen[i]! - r);
    const b = bei(bogen[i]! + r);
    const p = z[i]!;
    let d = Math.abs(Math.atan2(b.y - p.y, b.x - p.x) - Math.atan2(p.y - a.y, p.x - a.x));
    if (d > Math.PI) d = 2 * Math.PI - d;
    if ((d * 180) / Math.PI > best.winkel) best = { winkel: (d * 180) / Math.PI, y: p.y };
  }
  return best;
}

/** Kanten mit genau zwei Dreiecken in Gegenrichtung (geschlossen und gleich orientiert), Volumen. */
function pruefeNetz(pos: Float32Array, idx: Uint32Array) {
  const kanten = new Map<string, number>();
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = idx[t + e]!;
      const b = idx[t + ((e + 1) % 3)]!;
      const k = `${a},${b}`;
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
  return { falsch, kanten: kanten.size, volumen: vol };
}

describe('Versuch Schnitt-Loft', () => {
  it('Kugel: drei Kreise ergeben eine Kugel, die reine Hülle den kantigen Steinmetz-Körper', () => {
    const R = 0.265;
    const fehler = (runden: boolean) => {
      const s = schnittLoft(neuesDokument(), { runden });
      let max = 0;
      let summe = 0;
      const n = s.positionen.length / 3;
      for (let v = 0; v < n; v++) {
        const r = Math.hypot(s.positionen[3 * v]!, s.positionen[3 * v + 1]! - R, s.positionen[3 * v + 2]!);
        max = Math.max(max, Math.abs(r - R));
        summe += Math.abs(r - R);
      }
      return { s, max, mittel: summe / n };
    };
    const kugel = fehler(true);
    const huelle = fehler(false);
    const netz = pruefeNetz(kugel.s.positionen, kugel.s.indizes);
    console.log(
      `Kugel: Radiusfehler max ${(kugel.max * PX).toFixed(2)} px, mittel ${(kugel.mittel * PX).toFixed(2)} px; reine Hülle max ${(huelle.max * PX).toFixed(1)} px; ` +
        `${kugel.s.info.dreiecke} Dreiecke, ${kugel.s.info.millisekunden.toFixed(0)} ms, Volumen ${netz.volumen.toFixed(4)} (Kugel ${((4 / 3) * Math.PI * R ** 3).toFixed(4)}), offene/ungleiche Kanten ${netz.falsch}`,
    );
    expect(kugel.max * PX).toBeLessThan(2.5);
    expect(kugel.mittel * PX).toBeLessThan(0.8);
    expect(huelle.max * PX).toBeGreaterThan(15);
    expect(netz.falsch).toBe(0);
    expect(netz.volumen).toBeGreaterThan(0);
    expect(Math.abs(netz.volumen / ((4 / 3) * Math.PI * R ** 3) - 1)).toBeLessThan(0.02);
    const mitte = kugel.s.schnittBei(0.5);
    expect(mitte.teile).toBe(1);
    expect(mitte.loecher).toBe(0);
  });

  it('Florians Ente: der Schnitt bei S1 hat zwei Teile (Schnauze und Bauch), mit und ohne Acht', () => {
    const d = ente();
    const f = d.spanten![0]!.f;
    const faelle: [string, Dokument][] = [
      ['mit Acht', d],
      ['ohne Spanten', { ...d, spanten: [] }],
    ];
    for (const [name, dok] of faelle) {
      const s = schnittLoft(dok);
      const sch = s.schnittBei(f);
      console.log(`Ente ${name}: S1 ${sch.teile} Teile, ${sch.loecher} Löcher, ${s.info.dreiecke} Dreiecke, ${s.info.millisekunden.toFixed(0)} ms, Gitter ${s.info.gitter.join('×')}`);
      expect(sch.teile).toBe(2);
      // Schnauze oben, Bauch unten: die Lücke dazwischen liegt außen (Seite bei S1: Bauch 0,086–0,336, Schnauze 0,504–0,638)
      expect(innen(sch.umrisse, { x: 0, y: 0.42 })).toBe(false);
      expect(innen(sch.umrisse, { x: 0, y: 0.2 })).toBe(true);
      expect(innen(sch.umrisse, { x: 0, y: 0.58 })).toBe(true);
      const netz = pruefeNetz(s.positionen, s.indizes);
      expect(netz.volumen).toBeGreaterThan(0);
    }
    // Der Platzhalter-Loft füllt die Lücke (ein Ring je Stelle)
    const loft = loftNetz(d);
    const x = -0.219;
    expect(innenImNetz(loft.positionen, loft.indizes, [x, 0.42, 0])).toBe(true);
    const s = schnittLoft(d);
    expect(innenImNetz(s.positionen, s.indizes, [x, 0.42, 0])).toBe(false);
    expect(innenImNetz(s.positionen, s.indizes, [x, 0.2, 0])).toBe(true);
  });

  it('Acht-Spant: zwei Teile (jede Hälfte gilt nur auf ihrer Seite); gerade-ungerade lässt die Mitte als dritten Teil stehen', () => {
    // Kugel mit Florians Acht als Spant bei 40 %, Hauptspant hinten
    const dok: Dokument = { ...neuesDokument(), spanten: [{ f: 0.4, profil: acht() }], hauptspant: 0.85 };
    const halb = schnittLoft(dok).schnittBei(0.4);
    const gu = schnittLoft(dok, { regel: 'gerade-ungerade' }).schnittBei(0.4);
    // Mitte der Acht (normiert v ≈ 0,7, dort kreuzt die Hälfte die Achse): Kasten bei 40 % reicht von y 0,005 bis 0,525
    const mitte = { x: 0, y: 0.005 + 0.7 * 0.52 };
    console.log(`Acht auf der Kugel: Regel „halb“ ${halb.teile} Teile (Mitte ${innen(halb.umrisse, mitte) ? 'voll' : 'leer'}), „gerade-ungerade“ ${gu.teile} Teile (Mitte ${innen(gu.umrisse, mitte) ? 'voll' : 'leer'})`);
    expect(halb.teile).toBe(2);
    expect(innen(halb.umrisse, mitte)).toBe(false);
    // gerade-ungerade: die Mitte ist einmal umschlossen und bleibt; die Linsen hängen an den Kreuzungspunkten zusammen
    expect(innen(gu.umrisse, mitte)).toBe(true);
    expect(gu.teile).toBeLessThan(halb.teile + 2);
    // An der Ente: Schnauze und Bauch bekommen je ihren Teil der Acht, nicht beide je eine Acht
    const d = ente();
    const sch = schnittLoft(d).schnittBei(d.spanten![0]!.f);
    expect(sch.teile).toBe(2);
  });

  it('Top-Haken: die Kerbe bleibt außen, der Haken selbst ist Körper', () => {
    const d = ente();
    const s = schnittLoft(d);
    // Stelle im Haken (x ≈ 0,03): Top bei z ≈ 0,1 (Körper) | Kerbe | 0,21–0,25 (Haken)
    const f = (0.03 - s.xMin) / (s.xMax - s.xMin);
    const sch = s.schnittBei(f);
    const kerbe = { x: 0.155, y: 0.25 };
    console.log(`Top-Haken bei f = ${f.toFixed(3)}: ${sch.teile} Teile`);
    expect(innen(sch.umrisse, kerbe)).toBe(false);
    expect(innen(sch.umrisse, { x: -kerbe.x, y: kerbe.y })).toBe(false);
    expect(sch.teile).toBe(3);
    expect(innenImNetz(s.positionen, s.indizes, [0.03, 0.25, 0.155])).toBe(false);
    // der Platzhalter-Loft blockt die Kerbe zu
    const loft = loftNetz(d);
    expect(innenImNetz(loft.positionen, loft.indizes, [0.03, 0.25, 0.155])).toBe(true);
  });

  it('Kanten über Spant-Punkte: Punkt-Überblendung lässt die Ecke wandern, Felder blenden sie aus und ein', () => {
    // Kugel mit zwei Spanten, deren mittlerer Punkt eine Ecke ist: S1 (30 %) hoch, S2 (70 %) tief
    const kugel = neuesDokument();
    const mitEcke = (v: number): Profil => {
      const h = hauptspantProfil(kugel);
      const knoten = h.knoten.map((k, i) => (i === 1 ? { ...k, p: { x: 1, y: v }, ein: { x: 0, y: 0 }, aus: { x: 0, y: 0 }, art: 'ecke' as const } : k));
      return { ...h, knoten };
    };
    const dok: Dokument = { ...kugel, spanten: [{ f: 0.3, profil: mitEcke(0.78) }, { f: 0.7, profil: mitEcke(0.22) }], hauptspant: 0.97 };
    /** schärfste Ecke im echten Schnitt (Raster) bzw. im fertigen Netz (nach Surface Nets und Taubin) */
    // nur zwischen den Höhen der beiden Ecken suchen (Pole des Schnitts auslassen)
    const band: [number, number] = [0.1, 0.42];
    const ecke = (s: ReturnType<typeof schnittLoft>, f: number) => eckWinkel(s.schnittBei(f).umrisse[0]!, 2.5 * s.info.h, band);
    const ecke3d = (s: ReturnType<typeof schnittLoft>, f: number) => eckWinkel(netzSchnitt(s.positionen, s.indizes, s.xMin + f * (s.xMax - s.xMin))[0]!, 2.5 * s.info.h, band);
    const feld = schnittLoft(dok, { ueberblenden: 'feld' });
    const punkte = schnittLoft(dok, { ueberblenden: 'punkte' });
    const zeilen: string[] = [];
    for (const f of [0.3, 0.4, 0.5, 0.6, 0.7]) {
      const a = ecke(feld, f);
      const b = ecke(punkte, f);
      const c = ecke3d(feld, f);
      const d = ecke3d(punkte, f);
      zeilen.push(
        `f ${f}: Felder ${a.winkel.toFixed(0)}° bei y ${a.y.toFixed(3)} (Netz ${c.winkel.toFixed(0)}°) | Punkte ${b.winkel.toFixed(0)}° bei y ${b.y.toFixed(3)} (Netz ${d.winkel.toFixed(0)}°)`,
      );
    }
    // gezeichnet: Ecke mit ≈ 94° Richtungsänderung
    console.log(`Ecke zwischen zwei Spanten (schärfste Richtungsänderung über ±2,5 Rasterpunkte; Schnitt im Raster, in Klammern im fertigen Netz):\n${zeilen.join('\n')}\nBauzeit Felder ${feld.info.millisekunden.toFixed(0)} ms, Punkte ${punkte.info.millisekunden.toFixed(0)} ms`);
    expect(ecke(punkte, 0.5).winkel).toBeGreaterThan(ecke(feld, 0.5).winkel + 10);
  });

  it('Laufzeit je Auflösung', () => {
    const zeilen: string[] = [];
    for (const [name, dok] of [
      ['Kugel', neuesDokument()],
      ['Ente', ente()],
    ] as const) {
      for (const aufloesung of [48, 64, 96, 128]) {
        const t0 = performance.now();
        const s = schnittLoft(dok, { aufloesung });
        const ms = performance.now() - t0;
        const z = s.info.zeiten;
        zeilen.push(
          `${name} ${aufloesung}: ${ms.toFixed(0)} ms (Vorlagen ${z.vorlagen.toFixed(0)}, Feld ${z.feld.toFixed(0)}, Netz ${z.netz.toFixed(0)}, Glätten ${z.glaetten.toFixed(0)}), ${s.info.dreiecke} Dreiecke, Gitter ${s.info.gitter.join('×')}`,
        );
        expect(s.info.dreiecke).toBeGreaterThan(500);
      }
    }
    console.log(zeilen.join('\n'));
  });
});
