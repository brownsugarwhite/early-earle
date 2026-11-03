// Prüfplan P0a (02.11.2026): Spielstufe — der Körper auf Stufe 1 mit Grenzlagen und Grenznormalen. Tore: Dreiecke im
// Budget, Umriss der Stufe 1 gegen Stufe 3 in Gerätepixeln bei Spielgröße, Facetten abseits gezeichneter Falten, Pose auf
// Stufe 1, Umschalten ohne Neubau des Käfigs. Verfehlte Tore stehen als `it.fails` mit Registereintrag („Befunde aus P0a“).
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { alleFlaechen } from '../kaefig/halbkanten';
import type { Kaefig } from '../kaefig/halbkanten';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { EXTREMREIHE } from './pruefen/extremreihe';
import { editorBauen, editorPlan, imAblauf } from './pruefen/extremMessung';
import { SPIEL_BUDGET, spielEcken, spielGeraetepixel } from './spielstufe';
import { type Bauplan, type WesenNetz, type WesenStand, pruefwesenBauplan, wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };

const koerper = (name: string) => {
  const k = EXTREMREIHE.find((e) => e.name === name);
  if (!k) throw new Error(`Prüfkörper ${name} fehlt`);
  return k.dok();
};

/** Bau wie der Editor (Röhre, glatt + mittel, Ablauf aus der Startkugel), dann die Spielstufe auf dem Stand. */
function spielBau(name: string, plan: Partial<Bauplan> = {}): { stand: WesenStand; netz3: WesenNetz; netz1: WesenNetz; ms: number } {
  const dok = name === 'kugel' ? neuesDokument('kugel') : koerper(name);
  const b = editorBauen(imAblauf(dok, 'roehre', 'kugel'), { ...editorPlan('roehre'), ...plan });
  const t0 = performance.now();
  const r = wesenBauen(b.dok, { ...editorPlan('roehre'), ...plan, stufen: 1 }, b.stand, false);
  return { stand: r.stand, netz3: b.netz, netz1: r.netz, ms: performance.now() - t0 };
}

/** Knicke zwischen Nachbarflächen der Stufe 1 (Grad), ohne Kanten mit Schärfe (gezeichnete Falten). */
function knicke(k1: Kaefig, fein: Float64Array): { p95: number; max: number } {
  const fl = alleFlaechen(k1);
  const fn = new Float64Array(3 * fl.length);
  fl.forEach((f, fi) => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      n0 += (fein[3 * a + 1]! - fein[3 * b + 1]!) * (fein[3 * a + 2]! + fein[3 * b + 2]!);
      n1 += (fein[3 * a + 2]! - fein[3 * b + 2]!) * (fein[3 * a]! + fein[3 * b]!);
      n2 += (fein[3 * a]! - fein[3 * b]!) * (fein[3 * a + 1]! + fein[3 * b + 1]!);
    }
    const s = 1 / (Math.hypot(n0, n1, n2) || 1);
    fn[3 * fi] = n0 * s;
    fn[3 * fi + 1] = n1 * s;
    fn[3 * fi + 2] = n2 * s;
  });
  const winkel: number[] = [];
  for (let e = 0; e < k1.nE; e++) {
    if (k1.eFlaechen[e] !== 2 || k1.eSchaerfe[e]! > 0) continue;
    const h = k1.eHalb[e]!;
    const t = k1.hTwin[h]!;
    if (t < 0) continue;
    const a = k1.hFace[h]!;
    const b = k1.hFace[t]!;
    const d = Math.max(-1, Math.min(1, fn[3 * a]! * fn[3 * b]! + fn[3 * a + 1]! * fn[3 * b + 1]! + fn[3 * a + 2]! * fn[3 * b + 2]!));
    winkel.push((Math.acos(d) * 180) / Math.PI);
  }
  winkel.sort((x, y) => x - y);
  return { p95: winkel[Math.floor(0.95 * (winkel.length - 1))] ?? 0, max: winkel[winkel.length - 1] ?? 0 };
}

/** Pose-Tor (Prüfplan P0a): 1 Gerätepixel; Stand 03.11. siehe Register „Befunde aus P0a“ */
const POSE_TOR = 1;

const gpx = (n: WesenNetz) => {
  const u = n.info.spiel?.umriss;
  if (!u) return null;
  return { seite: spielGeraetepixel(u.seite.max, n.hoehe), front: spielGeraetepixel(u.front.max, n.hoehe), top: spielGeraetepixel(u.top.max, n.hoehe) };
};

describe('P0a Spielstufe: Umsortierung', () => {
  it('Ecken der Stufe 1 zeigen auf Ecke 0 der Stufe-3-Fläche 16·f + 4·i', () => {
    const e = spielEcken(2, 3, 1);
    expect(Array.from(e.slice(0, 6))).toEqual([0, 24, 48, 0, 48, 72].map((x) => x * 1));
    expect(Array.from(e.slice(6, 12))).toEqual([96, 120, 144, 96, 144, 168]);
    expect(Array.from(spielEcken(1, 3, 2).slice(0, 6))).toEqual([0, 6, 12, 0, 12, 18]);
  });

  it('Kugel: Stufe 1 = erste n₁ Punkte der Grenzfläche, 3 200 Dreiecke, Eckenwerte in Fächerordnung; ohne Option kein Spiel-Feld', () => {
    const { stand, netz3, netz1 } = spielBau('kugel');
    expect(netz3.info.spiel).toBeUndefined();
    const k1 = stand.abl.unterteilung.stufen[0]!.kaefig;
    const fl = alleFlaechen(k1);
    expect(netz1.info.spiel?.stufe).toBe(1);
    expect(netz1.positionen.length / 9).toBe(2 * fl.length);
    expect(netz1.info.spiel?.dreiecke).toBe(3200);
    const F = [0, 1, 2, 0, 2, 3];
    const fein = stand.abl.fein;
    let maxAbw = 0;
    fl.forEach((f, fi) => {
      for (let k = 0; k < 6; k++) {
        const v = f[F[k]!]!;
        const o = 3 * (6 * fi + k);
        maxAbw = Math.max(maxAbw, Math.hypot(netz1.positionen[o]! - fein[3 * v]!, netz1.positionen[o + 1]! - fein[3 * v + 1]!, netz1.positionen[o + 2]! - fein[3 * v + 2]!));
      }
    });
    expect(maxAbw).toBeLessThan(1e-6);
    expect(netz1.normalen.length).toBe(netz1.positionen.length);
    expect(netz1.treffer).toBeNull();
    // Normalen der Grenzfläche sind Einheitsvektoren und bei der Kugel radial (≤ 3°)
    let schlecht = 0;
    for (let i = 0; i < netz1.positionen.length; i += 3) {
      const p = [netz1.positionen[i]! - netz3.mitte[0], netz1.positionen[i + 1]! - netz3.mitte[1], netz1.positionen[i + 2]! - netz3.mitte[2]];
      const l = Math.hypot(...p) || 1;
      const n = [netz1.normalen[i]!, netz1.normalen[i + 1]!, netz1.normalen[i + 2]!];
      const d = (p[0]! * n[0]! + p[1]! * n[1]! + p[2]! * n[2]!) / l;
      if (d < Math.cos((3 * Math.PI) / 180)) schlecht++;
    }
    expect(schlecht).toBe(0);
    // rohe Normalen zum Vergleich: andere Werte, ebenfalls Einheitslänge
    const roh = wesenBauen(stand.dok, { ...editorPlan('roehre'), stufen: 1, stufenNormalen: 'roh' }, stand, false).netz;
    let anders = 0;
    for (let i = 0; i < roh.normalen.length; i += 3) {
      expect(Math.abs(Math.hypot(roh.normalen[i]!, roh.normalen[i + 1]!, roh.normalen[i + 2]!) - 1)).toBeLessThan(1e-4);
      if (Math.abs(roh.normalen[i]! - netz1.normalen[i]!) > 1e-6) anders++;
    }
    expect(anders).toBeGreaterThan(0);
  });

  it('Umschalten baut den Käfig nicht neu (gleicher Stand, Ableitung 0 ms); Umrissvergleich beim zweiten Mal aus dem Stand', () => {
    const { stand, netz1, ms } = spielBau('rex');
    expect(netz1.info.ableitung).toBe(0);
    const t0 = performance.now();
    const r2 = wesenBauen(stand.dok, { ...editorPlan('roehre'), stufen: 1 }, stand, false);
    const ms2 = performance.now() - t0;
    expect(r2.stand.abl).toBe(stand.abl);
    expect(r2.netz.info.spiel?.umriss).toEqual(netz1.info.spiel?.umriss);
    const zurueck = wesenBauen(stand.dok, editorPlan('roehre'), r2.stand, false);
    expect(zurueck.netz.info.spiel).toBeUndefined();
    expect(zurueck.netz.positionen.length / 9).toBe(51200);
    console.log(`Umschalten Rex: erstes Mal ${ms.toFixed(0)} ms (mit Umrissvergleich), zweites Mal ${ms2.toFixed(0)} ms`);
  });
});

describe('P0a Tore (Röhre, Bau wie der Editor)', () => {
  const faelle = ['kugel', 'ei', 'rex', 'langhals', 'robbe', 'tigerkopf', 'kegel'];
  for (const name of faelle) {
    it(`${name}: Stufe 1 ≤ ${SPIEL_BUDGET} Dreiecke`, () => {
      const { netz1 } = spielBau(name);
      expect(netz1.info.spiel?.dreiecke).toBeLessThanOrEqual(SPIEL_BUDGET);
    });
  }
  // Umriss der Stufe 1 gegen Stufe 3 bei Spielgröße: Tor 1 Gerätepixel (Warnung ab 2)
  // Stand 03.11. (Register „Befunde aus P0a“): Kugel 0,7, Ei 0,8 ✓; Rex 2,8 (Seite), Langhals 1,1, Robbe 1,5, Tigerkopf 3,0 und
  // Kegel 3,0 (Front) verfehlen das Tor — 16 Punkte je Ring sind für Stufe 1 bei 300 px Höhe zu grob (Sagitta), Befund für
  // die Dichteregel des neuen Baus (Gegenprüfung 3.6: 24 je Rumpfring)
  const umrissTor: Record<string, 'it' | 'fails'> = { kugel: 'it', ei: 'it', rex: 'fails', langhals: 'fails', robbe: 'fails', tigerkopf: 'fails', kegel: 'fails' };
  for (const name of faelle) {
    const f = umrissTor[name] === 'fails' ? it.fails : it;
    f(`${name}: Umriss Stufe 1 gegen Stufe 3 ≤ 1 Gerätepixel bei Spielgröße`, () => {
      const { netz1 } = spielBau(name);
      const g = gpx(netz1)!;
      console.log(`${name}: Umriss S/F/T ${g.seite.toFixed(2)} / ${g.front.toFixed(2)} / ${g.top.toFixed(2)} Gerätepixel (Höhe ${netz1.hoehe.toFixed(3)})`);
      expect(Math.max(g.seite, g.front, g.top)).toBeLessThanOrEqual(1);
    });
  }
  // Facetten abseits gezeichneter Falten: 95 % ≤ 12°, max ≤ 25° (Prüfplan P0a)
  // Stand 03.11.: Kugel 11,2°/11,6°, Ei 11,9°/15,9° ✓; Rex 22°/88°, Langhals 22°/45°, Robbe 23°/53°, Tigerkopf 17°/74°, Kegel
  // 20°/47° verfehlen — Käfigfehler, die Stufe 3 verdeckt (Register „Befunde aus der Messung Spielstufe“ und „aus P0a“)
  const facettenTor: Record<string, 'it' | 'fails'> = { kugel: 'it', ei: 'it', rex: 'fails', langhals: 'fails', robbe: 'fails', tigerkopf: 'fails', kegel: 'fails' };
  for (const name of faelle) {
    const f = facettenTor[name] === 'fails' ? it.fails : it;
    f(`${name}: Knicke der Stufe 1 abseits der Falten 95 % ≤ 12°, max ≤ 25°`, () => {
      const { stand } = spielBau(name);
      const k = knicke(stand.abl.unterteilung.stufen[0]!.kaefig, stand.abl.fein);
      console.log(`${name}: Knicke Stufe 1 (Grenzlage) 95 % ${k.p95.toFixed(1)}°, max ${k.max.toFixed(1)}°`);
      expect(k.p95).toBeLessThanOrEqual(12);
      expect(k.max).toBeLessThanOrEqual(25);
    });
  }
});

describe('P0a Pose auf Stufe 1 (Rex mit Maul, Fressen)', () => {
  it('mit Augapfel-Höhle bleibt die Bau-Stufe, mit Grund im Spiel-Feld', () => {
    const dok = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
    const plan: Partial<Bauplan> = { ...pruefwesenBauplan('rex'), maul: 'vorn', gewichte: {}, earle: true, stufen: 1 };
    const r = wesenBauen(dok, plan, null);
    expect(r.netz.info.spiel?.stufe).toBe(3);
    expect(r.netz.info.spiel?.grund).toContain('Augapfel');
  });

  // Stand 03.11.: Rex (Höhe 0,356) Fressen 50 % Umriss S/F/T 1,5 / 1,6 / 2,1 Gerätepixel — Tor verfehlt (Register „Befunde aus
  // P0a“: dieselbe Ursache wie am Körper, 16 Punkte je Ring; mit Maul 4 540 Dreiecke auf Stufe 1)
  it.fails('Fressen 50 % und 100 % (gemalte Augen): Umriss Stufe 1 gegen Stufe 3 ≤ 1 Gerätepixel, Dreiecke und Ecken passen', () => {
    const dok = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
    const plan: Partial<Bauplan> = { ...pruefwesenBauplan('rex'), augen: { ring: 2, j: 2, groesse: 0.11 }, maul: 'vorn', gewichte: {}, earle: true };
    const g0 = wesenBauen(dok, plan, null);
    const werte: number[] = [];
    for (const w of [0.5, 1]) {
      const r = wesenBauen(dok, { ...plan, gewichte: { fressen: w }, stufen: 1 }, g0.stand, false);
      const sp = r.netz.info.spiel!;
      expect(sp.stufe).toBe(1);
      expect(r.netz.ruhe === null || r.netz.ruhe.length === r.netz.positionen.length).toBe(true);
      expect(r.netz.deskriptoren!.length).toBe((r.netz.positionen.length / 3) * 16);
      const g = gpx(r.netz)!;
      console.log(`Rex Fressen ${w}: Stufe 1 ${sp.dreiecke} Dreiecke (Körper ${sp.koerperDreiecke}); Umriss S/F/T ${g.seite.toFixed(2)} / ${g.front.toFixed(2)} / ${g.top.toFixed(2)} Gerätepixel (Höhe ${r.netz.hoehe.toFixed(3)})`);
      werte.push(Math.max(g.seite, g.front, g.top));
    }
    for (const w of werte) expect(w).toBeLessThanOrEqual(POSE_TOR);
  });
});
