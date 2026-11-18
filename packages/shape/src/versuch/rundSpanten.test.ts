// Versuch 13.10. nachmittags, Meilenstein 2: Spanten der Bauweise „rund“ (quer über ein Teil, bearbeitbar).
import { describe, expect, it } from 'vitest';
import { type Dokument, type Kante, dokumentLesen } from '../dokument';
import type { Profil } from '../profil';
import { rundKoerper } from './aufblasen';
import { KANTENPUNKT, kuerzesteSehne, profilZug, querZurLinie, rundSpantAnKante, rundSpantNeu, spantStrecke, spantenAufloesen, spantenAusLinie, uBei, uTabelle } from './rundSpanten';
import { type Vorlage, vorlageDokument } from './vorlagen';
import langhalsRoh from './vorlagen/langhals.json';
import tigerRoh from './vorlagen/tiger.json';
import ueberhangRoh from './vorlagen/ueberhang.json';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;
const langhals = (): Dokument => vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals');
const ente = (): Dokument => dokumentLesen(ueberhangRoh);

/** Kastenform mit runden Ecken (drei Knoten wie die Startform, Mitte weit außen) */
function kastig(pr: Profil): Profil {
  const k = pr.knoten.map((kn) => ({ ...kn, p: { ...kn.p }, ein: { ...kn.ein }, aus: { ...kn.aus } }));
  const m = k[1]!;
  m.p = { x: 1, y: 0.5 };
  m.ein = { x: 0, y: 0.45 };
  m.aus = { x: 0, y: -0.45 };
  k[0]!.aus = { x: 0.9, y: 0 };
  k[0]!.ein = { x: 0.9, y: 0 };
  k[2]!.ein = { x: 0.9, y: 0 };
  k[2]!.aus = { x: 0.9, y: 0 };
  return { ...pr, knoten: k };
}

describe('Spanten der Bauweise rund', () => {
  it('Hals: der Spant liegt quer zum Hals (waagerecht), ein neuer Spant ändert die Form nicht', () => {
    const dok = langhals();
    const k0 = rundKoerper(dok);
    const p = { x: -0.02, y: 0.45 };
    const s = kuerzesteSehne(k0.umrissWelt, p)!;
    console.log(`Hals-Spant: Richtung (${s.d.x.toFixed(2)}, ${s.d.y.toFixed(2)}), Länge ${(s.laenge * PX).toFixed(0)} px`);
    expect(Math.abs(s.d.y)).toBeLessThan(0.35);
    const sp = rundSpantNeu(k0.umrissWelt, k0.dickeBei, p, null)!;
    const k1 = rundKoerper({ ...dok, rundSpanten: [sp] });
    let max = 0;
    for (let v = 0; v < k0.flaeche.x.length; v++) max = Math.max(max, Math.abs(k1.flaeche.z[v]! - k0.flaeche.z[v]!));
    console.log(`neuer Spant: größte Änderung ${(max * PX).toFixed(2)} px`);
    expect(max * PX).toBeLessThan(1.5);
  });

  it('bearbeiteter Spant: der 3D-Querschnitt auf seiner Strecke ist genau sein Profil; dazwischen Punkt für Punkt', () => {
    const dok = langhals();
    const k0 = rundKoerper(dok);
    // Mitte des Halses auf einer Höhe (Innenstück der Waagerechten, das x = −0,02 am nächsten liegt)
    const halsMitte = (y: number) => {
      const xs: number[] = [];
      const u = k0.umrissWelt;
      for (let i = 0; i < u.length; i++) {
        const p = u[i]!;
        const q = u[(i + 1) % u.length]!;
        if (p.y <= y !== q.y <= y) xs.push(p.x + ((y - p.y) / (q.y - p.y)) * (q.x - p.x));
      }
      xs.sort((a, b) => a - b);
      let best = { x: 0, y };
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const m = (xs[i]! + xs[i + 1]!) / 2;
        if (Math.abs(m + 0.02) < Math.abs(best.x + 0.02)) best = { x: m, y };
      }
      return best;
    };
    const a = rundSpantNeu(k0.umrissWelt, k0.dickeBei, halsMitte(0.4), null)!;
    const b = rundSpantNeu(k0.umrissWelt, k0.dickeBei, halsMitte(0.52), null)!;
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const neu = { ...a, profil: kastig(a.profil) };
    const k1 = rundKoerper({ ...dok, rundSpanten: [neu, b] });
    const s = k1.spanten[0]!;
    // Breite des runden Querschnitts an der dicksten Stelle (Normierung des Profils)
    let zMax = 0;
    for (let i = 1; i < 64; i++) zMax = Math.max(zMax, k0.dickeBei({ x: s.a.x + (i / 64) * (s.b.x - s.a.x), y: s.a.y + (i / 64) * (s.b.y - s.a.y) }));
    const tab = uTabelle(neu.profil);
    let fehler = 0;
    for (let i = 3; i <= 61; i++) {
      const v = i / 64;
      const ist = k1.dickeBei({ x: s.a.x + v * (s.b.x - s.a.x), y: s.a.y + v * (s.b.y - s.a.y) });
      const soll = zMax * tab[Math.round(v * 64)]!;
      fehler = Math.max(fehler, Math.abs(ist - soll));
    }
    console.log(`Kasten-Spant am Hals: Querschnitt weicht höchstens ${(fehler * PX).toFixed(2)} px vom Profil ab`);
    expect(fehler * PX).toBeLessThan(1.5);
    // halbwegs zum zweiten Spant: zwischen Kasten und rund (nicht runder als der runde Körper, nicht kastiger als der Kasten)
    const mitte = halsMitte(0.46);
    const z0 = k0.dickeBei(mitte);
    const z1 = k1.dickeBei(mitte);
    expect(z1).toBeGreaterThanOrEqual(z0 - 1e-6);
  });

  it('eine Linie über Schnauze und Bauch gibt zwei getrennte Spanten; Profile bleiben auf ihrer Hälfte', () => {
    const dok = ente();
    const k0 = rundKoerper(dok, { seitenteile: false });
    // senkrechte Linie bei x = −0,22 vom Boden bis über die Schnauze
    const teile = spantenAusLinie(k0.umrissWelt, { x: -0.22, y: -0.05 }, { x: -0.22, y: 0.8 });
    expect(teile.length).toBe(2);
    // eine „Acht“: Punkte jenseits der Achse zählen nicht (u ≥ 0)
    const sp = rundSpantNeu(k0.umrissWelt, k0.dickeBei, teile[0]!.p, teile[0]!.richtung)!;
    const acht: Profil = { ...sp.profil, knoten: sp.profil.knoten.map((kn, i) => (i === 1 ? { ...kn, p: { x: -0.5, y: 0.5 } } : kn)) };
    const zug = profilZug(acht);
    for (const q of zug) expect(q.x).toBeGreaterThanOrEqual(0);
    expect(uBei(zug, 0.5)).toBeGreaterThanOrEqual(0);
  });
});

describe('Kantenlinie → Spanten an ihren Punkten (Meilenstein 3)', () => {
  const tiger = () => vorlageDokument(tigerRoh as unknown as Vorlage, 'zu', 'tiger');
  const kn = (x: number, y: number) => ({ p: [x, y, 0.1] as [number, number, number], ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const });
  const kante: Kante = { knoten: [kn(-0.27, 0.32), kn(-0.21, 0.35), kn(-0.15, 0.35), kn(-0.09, 0.33)], haerte: [0, 0, 0, 0], blick: 'seite' };
  /** Knick am Kantenpunkt: Ecke ohne Griffe (⌥ wie im Editor), etwas nach außen */
  const knicken = (pr: Profil, raus: number): Profil => ({ ...pr, knoten: pr.knoten.map((k, i) => (i === KANTENPUNKT ? { ...k, p: { x: k.p.x + raus, y: k.p.y }, art: 'ecke' as const, ein: { x: 0, y: 0 }, aus: { x: 0, y: 0 } } : k)) });
  /** Knick quer zur Kante an einem Punkt der Seite: Winkel zwischen den Steigungen von z oberhalb und unterhalb (Grad) */
  const knickWinkel = (dicke: (p: { x: number; y: number }) => number, p: { x: number; y: number }, d: { x: number; y: number }) => {
    const e = 0.012;
    const z = (t: number) => dicke({ x: p.x + t * d.x, y: p.y + t * d.y });
    const oben = Math.atan2(z(2 * e) - z(e), e);
    const unten = Math.atan2(z(-e) - z(-2 * e), e);
    return Math.abs(oben - unten) * (180 / Math.PI);
  };

  it('an jedem Punkt ein Spant, parallel quer zur Linie, der Kantenpunkt liegt genau darin; ohne Knick ändert sich nichts', () => {
    const dok: Dokument = { ...tiger(), kanten: [kante] };
    const k0 = rundKoerper(dok);
    const pts = kante.knoten.map((q) => ({ x: q.p[0], y: q.p[1] }));
    const ri = querZurLinie(pts);
    const sp = pts.map((p, i) => rundSpantAnKante(k0.umrissWelt, k0.dickeBei, k0.dickeRundBei, p, ri[i]!, { index: 0, knoten: i })!);
    expect(sp.every((s) => s && s.profil.knoten.length === 2 * KANTENPUNKT + 1)).toBe(true);
    const k1 = rundKoerper({ ...dok, rundSpanten: sp });
    // Kantenpunkt: auf der Strecke genau an der Stelle des Punkts (Lage v)
    sp.forEach((s, i) => {
      const st = k1.spanten[i]!;
      const v = ((pts[i]!.x - st.a.x) * st.d.x + (pts[i]!.y - st.a.y) * st.d.y) / st.laenge;
      expect(Math.abs(s.profil.knoten[KANTENPUNKT]!.p.y - v)).toBeLessThan(1e-6);
    });
    let max = 0;
    for (let v = 0; v < k1.flaeche.x.length; v++) {
      const q = { x: k1.flaeche.x[v]!, y: k1.flaeche.y[v]! };
      max = Math.max(max, Math.abs(k1.dickeBei(q) - k0.dickeBei(q)));
    }
    console.log(`Kante neutral: größte Änderung ${(max * PX).toFixed(2)} px`);
    expect(max * PX).toBeLessThan(1);
    // geknickt: zwischen den Spanten (Mitte der Kante) läuft die Kante weiter
    const geknickt = rundKoerper({ ...dok, rundSpanten: sp.map((s) => ({ ...s, profil: knicken(s.profil, 0.06) })) });
    const mitte = { x: -0.18, y: 0.35 };
    const vorher = knickWinkel(k1.dickeBei, mitte, sp[1]!.richtung);
    const nachher = knickWinkel(geknickt.dickeBei, mitte, sp[1]!.richtung);
    console.log(`Knick quer zur Kante zwischen zwei Spanten: vorher ${vorher.toFixed(1)}°, geknickt ${nachher.toFixed(1)}°`);
    expect(nachher).toBeGreaterThan(vorher + 10);
  });

  it('Spanten folgen der Kantenlinie, wenn ihr Punkt wandert', () => {
    const dok: Dokument = { ...tiger(), kanten: [kante] };
    const k0 = rundKoerper(dok);
    const pts = kante.knoten.map((q) => ({ x: q.p[0], y: q.p[1] }));
    const ri = querZurLinie(pts);
    const sp = pts.map((p, i) => rundSpantAnKante(k0.umrissWelt, k0.dickeBei, k0.dickeRundBei, p, ri[i]!, { index: 0, knoten: i })!);
    const verschoben: Kante = { ...kante, knoten: kante.knoten.map((k, i) => (i === 1 ? { ...k, p: [k.p[0] + 0.02, k.p[1] - 0.03, k.p[2]] as [number, number, number] } : k)) };
    const auf = spantenAufloesen(sp, [verschoben], k0.umrissWelt);
    expect(auf[1]!.p.x).toBeCloseTo(-0.19, 6);
    expect(auf[1]!.p.y).toBeCloseTo(0.32, 6);
    const st = spantStrecke(k0.umrissWelt, auf[1]!.p, auf[1]!.richtung)!;
    const v = ((auf[1]!.p.x - st.a.x) * st.d.x + (auf[1]!.p.y - st.a.y) * st.d.y) / st.laenge;
    expect(Math.abs(auf[1]!.profil.knoten[KANTENPUNKT]!.p.y - v)).toBeLessThan(1e-6);
  });
});
