// Versuch 13.10. nachmittags, Meilenstein 2: Spanten der Bauweise „rund“ (quer über ein Teil, bearbeitbar).
import { describe, expect, it } from 'vitest';
import { type Dokument, dokumentLesen } from '../dokument';
import type { Profil } from '../profil';
import { rundKoerper } from './aufblasen';
import { kuerzesteSehne, profilZug, rundSpantNeu, spantenAusLinie, uBei, uTabelle } from './rundSpanten';
import { type Vorlage, vorlageDokument } from './vorlagen';
import langhalsRoh from './vorlagen/langhals.json';
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
