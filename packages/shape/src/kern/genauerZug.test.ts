// Genauer Zug (Plan 2026-10-20): Der Pinsel „Ziehen“ wird so verstärkt, dass der getroffene Hautpunkt genau dem Zeiger
// folgt. Die Prüfung baut wie der Editor (Treffer auf dem gezeigten Netz, Gewichte auf den Käfiglagen der Trefferdaten,
// Deltas der rechten Hälfte, gespiegelt angewendet) und vergleicht weich (heute) mit genau.
import { describe, expect, it } from 'vitest';
import { type Dokument, type KaefigDelta, neuesDokument } from '../dokument';
import { type Bauplan, type WesenNetz, type WesenStand, wesenBauen, zugStencil } from './wesen';
import { type Stencil, baryzentrisch, genauerVersatz, poseWirkung, spiegelWirkung, stencilGewichte, stencilLage, verstaerkung, verstaerkungTraegt, zugGrenze } from './genauerZug';
import { deltaListe, pinselGewichte, spiegelIndex } from './pinsel';
import { enteDokument } from './pruefen/grundkoerper';

declare const console: { log: (...a: unknown[]) => void };

type V3 = [number, number, number];
/** px je Kern-Einheit (Δ und Saum messen bei 461 px je Kachel) */
const PX = 461;

/** Dreieck des Körpers, dessen Schwerpunkt dem Ziel am nächsten liegt (nur Körperdreiecke mit feiner Fläche). */
function dreieckBei(netz: WesenNetz, ziel: V3): { dreieck: number; punkt: V3 } {
  const p = netz.positionen;
  const tr = netz.treffer!;
  let best = -1;
  let bestD = Infinity;
  let punkt: V3 = [0, 0, 0];
  for (let t = 0; t < tr.dreieckFlaeche.length; t++) {
    if (tr.dreieckFlaeche[t]! < 0) continue;
    const o = 9 * t;
    const m: V3 = [(p[o]! + p[o + 3]! + p[o + 6]!) / 3, (p[o + 1]! + p[o + 4]! + p[o + 7]!) / 3, (p[o + 2]! + p[o + 5]! + p[o + 8]!) / 3];
    const d = Math.hypot(m[0] - ziel[0], m[1] - ziel[1], m[2] - ziel[2]);
    if (d < bestD) {
      bestD = d;
      best = t;
      punkt = m;
    }
  }
  return { dreieck: best, punkt };
}

/** Hautpunkt (Schwerpunkt-Gewichte im Dreieck) eines Netzes. */
function punktIn(netz: WesenNetz, dreieck: number, bary: readonly number[]): V3 {
  const p = netz.positionen;
  const o = 9 * dreieck;
  return [0, 1, 2].map((k) => bary[0]! * p[o + k]! + bary[1]! * p[o + 3 + k]! + bary[2]! * p[o + 6 + k]!) as V3;
}

type Zug = { bewegung: V3; fehlerPx: number; ausserhalbPx: number; unberuehrtMax: number; gesperrt: boolean; begrenzt: boolean; verstaerkung: number; stencilPinsel: boolean; kaefigFaktor: number };

/**
 * Ein Pinselstrich „Ziehen“ wie im Editor (`pinselZeiger`, Grundform): Gewichte um den Treffer und sein Spiegelbild auf den
 * Käfiglagen der Trefferdaten, Zuwachs (w + ws)·D in x/y und (w − ws)·D in z für die rechte Hälfte und die Naht.
 */
function strich(dok: Dokument, plan: Partial<Bauplan>, vorher: { netz: WesenNetz; stand: WesenStand }, ziel: V3, d: V3, radiusAnteil: number, genau: boolean, baum = false): Zug {
  const { netz, stand } = vorher;
  const tr = netz.treffer!;
  const { dreieck, punkt } = dreieckBei(netz, ziel);
  const o = 9 * dreieck;
  const P = netz.positionen;
  const bary = baryzentrisch(punkt, [P[o]!, P[o + 1]!, P[o + 2]!], [P[o + 3]!, P[o + 4]!, P[o + 5]!], [P[o + 6]!, P[o + 7]!, P[o + 8]!]);
  const xyz = tr.kaefig.xyz;
  const nMax = baum ? tr.kaefig.n : Math.min(tr.vorlage.n, tr.kaefig.n);
  const radius = radiusAnteil * netz.hoehe;
  let gewichte = pinselGewichte(xyz, nMax, punkt, radius);
  let stencilPinsel = false;
  let D: V3 = [...d];
  let gesperrt = false;
  let begrenzt = false;
  let verstaerkungX = 1;
  if (genau) {
    const st = zugStencil(stand, dreieck, tr.dreieckFlaeche[dreieck]!, bary);
    expect(st).not.toBeNull();
    // der Stencil gibt den Treffer aus den Käfiglagen wieder (Float32 der Trefferdaten)
    const q = stencilLage(st!, xyz);
    expect(Math.hypot(q[0] - punkt[0], q[1] - punkt[1], q[2] - punkt[2]) * PX).toBeLessThan(0.01);
    const mitGewichten = (liste: typeof gewichte) => {
      const w = new Map(liste.map((g) => [g.punkt, g] as const));
      return verstaerkung(st!, (i) => {
        const g = w.get(i);
        return g ? spiegelWirkung(g.w, g.wSpiegel) : null;
      });
    };
    let A = mitGewichten(gewichte);
    let grenze = zugGrenze(gewichte);
    if (!gewichte.length || !verstaerkungTraegt(A, { grenze })) {
      // wie im Editor: Radius kleiner als der Käfig → der Stencil selbst als Pinsel
      gewichte = stencilGewichte(st!, spiegelIndex(xyz, nMax), nMax);
      grenze = zugGrenze(gewichte);
      A = mitGewichten(gewichte);
      stencilPinsel = true;
    }
    const v = genauerVersatz(A, d, { grenze });
    D = v.D;
    gesperrt = v.gesperrt;
    begrenzt = v.begrenzt;
    verstaerkungX = Math.abs(d[0]) > 0 ? D[0] / d[0] : 1;
  }
  const karte = new Map<number, V3>();
  const rechts = (p: number) => xyz[3 * p + 2]! >= -1e-9;
  for (const g of gewichte) if (rechts(g.punkt)) karte.set(g.punkt, [(g.w + g.wSpiegel) * D[0], (g.w + g.wSpiegel) * D[1], (g.w - g.wSpiegel) * D[2]]);
  const liste = deltaListe(karte);
  // größter Käfigzug je Zeigerweg (die Grenze erlaubt höchstens das 4-Fache)
  let kaefigMax = 0;
  for (const x of liste) kaefigMax = Math.max(kaefigMax, Math.hypot(...x.d));
  const deltas: KaefigDelta[] = baum ? liste.map((x) => ({ ...x, lage: [xyz[3 * x.punkt]!, xyz[3 * x.punkt + 1]!, xyz[3 * x.punkt + 2]!] as V3 })) : liste;
  const mit = wesenBauen({ ...dok, kaefig: { ...(dok.kaefig ?? { deltas: [] }), ...(baum ? { baumDeltas: deltas } : { deltas }) } }, plan, stand);
  const neu = punktIn(mit.netz, dreieck, bary);
  const alt = punktIn(netz, dreieck, bary);
  const bewegung: V3 = [neu[0] - alt[0], neu[1] - alt[1], neu[2] - alt[2]];
  const fehlerPx = Math.hypot(bewegung[0] - d[0], bewegung[1] - d[1], bewegung[2] - d[2]) * PX;
  // Haut außerhalb des Radius (Abstand der Ecke zum Treffer > Radius): größte Änderung; weiter als zwei Käfigkanten: 0
  let ausserhalb = 0;
  let unberuehrt = 0;
  const kante = 0.45 * netz.hoehe;
  for (let i = 0; i < P.length / 3; i++) {
    const a = Math.hypot(P[3 * i]! - punkt[0], P[3 * i + 1]! - punkt[1], P[3 * i + 2]! - punkt[2]);
    const as = Math.hypot(P[3 * i]! - punkt[0], P[3 * i + 1]! - punkt[1], P[3 * i + 2]! + punkt[2]);
    const dd = Math.hypot(mit.netz.positionen[3 * i]! - P[3 * i]!, mit.netz.positionen[3 * i + 1]! - P[3 * i + 1]!, mit.netz.positionen[3 * i + 2]! - P[3 * i + 2]!);
    if (Math.min(a, as) > radius) ausserhalb = Math.max(ausserhalb, dd);
    if (Math.min(a, as) > radius + kante) unberuehrt = Math.max(unberuehrt, dd);
  }
  return { bewegung, fehlerPx, ausserhalbPx: ausserhalb * PX, unberuehrtMax: unberuehrt * PX, gesperrt, begrenzt, verstaerkung: verstaerkungX, stencilPinsel, kaefigFaktor: kaefigMax / Math.hypot(...d) };
}

describe('Genauer Zug', () => {
  const kugel = neuesDokument('Kugel');
  const plan: Partial<Bauplan> = { earle: false };
  const vorher = wesenBauen(kugel, plan, null);
  const H = vorher.netz.hoehe;
  // Treffer seitlich rechts auf halber Höhe, etwas vorn (kein Käfigpunkt, keine Naht)
  const ziel: V3 = [-0.06, 0.5 * H, 0.2];

  it('Stand merkt die Grundlage; der Stencil ist eine Mischung (Summe 1) und trifft den Hautpunkt', () => {
    expect(vorher.stand.zugGrundlage).toBeTruthy();
    const { dreieck, punkt } = dreieckBei(vorher.netz, ziel);
    const tr = vorher.netz.treffer!;
    const st = zugStencil(vorher.stand, dreieck, tr.dreieckFlaeche[dreieck]!, [1 / 3, 1 / 3, 1 / 3]);
    expect(st).not.toBeNull();
    let summe = 0;
    for (const g of st!.gewichte) summe += g;
    expect(summe).toBeCloseTo(1, 9);
    expect(st!.punkte.length).toBeGreaterThan(8);
    const q = stencilLage(st!, tr.kaefig.xyz);
    expect(Math.hypot(q[0] - punkt[0], q[1] - punkt[1], q[2] - punkt[2]) * PX).toBeLessThan(0.01);
    // falsche Fläche (veralteter Stand) → kein Stencil
    expect(zugStencil(vorher.stand, dreieck, tr.dreieckFlaeche[dreieck]! + 1, [1 / 3, 1 / 3, 1 / 3])).toBeNull();
  });

  it('Kugel: genau trifft ≤ 0,1 px für Radien 5–50 % und Züge in x, y, z; weich bleibt zurück', () => {
    const zeilen: string[] = [];
    for (const r of [0.05, 0.1, 0.25, 0.5]) {
      for (const d of [[0.03, 0, 0], [0, 0.04, 0], [0, 0, 0.03]] as V3[]) {
        const weich = strich(kugel, plan, vorher, ziel, d, r, false);
        const genau = strich(kugel, plan, vorher, ziel, d, r, true);
        const betrag = Math.hypot(...d);
        zeilen.push(`r ${r} d ${d.join('/')}: weich folgt ${((Math.hypot(...weich.bewegung) / betrag) * 100).toFixed(0)} % (Fehler ${weich.fehlerPx.toFixed(2)} px), genau ${genau.fehlerPx.toFixed(3)} px${genau.stencilPinsel ? ' (Stencil-Pinsel)' : ''}, Käfig ${genau.kaefigFaktor.toFixed(2)}× Zug${genau.begrenzt ? ' begrenzt' : ''}; außerhalb des Radius weich ${weich.ausserhalbPx.toFixed(2)} / genau ${genau.ausserhalbPx.toFixed(2)} px`);
        expect(genau.begrenzt).toBe(false);
        expect(genau.fehlerPx).toBeLessThan(0.1);
        expect(genau.kaefigFaktor).toBeLessThanOrEqual(4 + 1e-9);
        expect(genau.fehlerPx).toBeLessThanOrEqual(weich.fehlerPx + 1e-9);
        // weit weg bleibt die Haut bitgleich (Käfigpunkte außerhalb des Radius bewegen sich nicht)
        expect(genau.unberuehrtMax).toBe(0);
        expect(weich.unberuehrtMax).toBe(0);
      }
    }
    console.log(zeilen.join('\n'));
  });

  it('Kleine Radien: 3 % trifft genau mit höchstens 4-fachem Käfigzug; ohne Käfigpunkt im Radius (0,5 %) wird der Stencil der Pinsel', () => {
    for (const r of [0.03, 0.005]) {
      const g = strich(kugel, plan, vorher, ziel, [0.02, 0.03, 0], r, true);
      console.log(`Radius ${r * 100} %: ${g.stencilPinsel ? 'Stencil-Pinsel' : 'Abfall'}, Rest ${g.fehlerPx.toFixed(3)} px, Käfig ${g.kaefigFaktor.toFixed(2)}× Zug, außerhalb des Radius ${g.ausserhalbPx.toFixed(1)} px`);
      expect(g.begrenzt).toBe(false);
      expect(g.fehlerPx).toBeLessThan(0.1);
      expect(g.kaefigFaktor).toBeLessThanOrEqual(4 + 1e-9);
      // weit weg (Radius + 0,45 Höhen) bitgleich; der Stencil-Pinsel greift Käfigpunkte bis zwei Käfigkanten neben dem
      // Treffer, unabhängig vom Radius — dort klingt die Änderung erst etwas weiter aus (gemessen ≈ 0,1 px)
      if (g.stencilPinsel) expect(g.unberuehrtMax).toBeLessThan(0.5);
      else expect(g.unberuehrtMax).toBe(0);
      if (r === 0.005) expect(g.stencilPinsel).toBe(true);
    }
  });

  it('Naht: ein Treffer auf der Mittelebene bewegt sich nicht aus ihr heraus (gesperrt), x und y genau', () => {
    const naht: V3 = [-0.12, 0.6 * H, 0];
    const g = strich(kugel, plan, vorher, naht, [0.02, 0.03, 0.02], 0.25, true);
    expect(g.gesperrt).toBe(true);
    expect(Math.abs(g.bewegung[2]) * PX).toBeLessThan(0.05);
    expect(Math.hypot(g.bewegung[0] - 0.02, g.bewegung[1] - 0.03) * PX).toBeLessThan(0.1);
  });

  it('Pose (Drehung je Punkt, schief): Δp = A·D nach dem Rückdrehen, Spiegeln in der Ruhe und Posieren wie `poseSchreiben`', () => {
    // Drei Punktpaare (rechts j, links j') und ein Nahtpunkt mit verschiedenen Drehungen (gerollter Kiefer: links ≠ gespiegelt)
    const dreh = (ax: number, ay: number, az: number): number[] => {
      const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
      // R = Rz · Ry · Rx, zeilenweise
      return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
    };
    const R = [dreh(0.3, -0.2, 0.5), dreh(-0.25, 0.4, 0.1), dreh(0.1, 0.2, -0.4), dreh(0.05, -0.3, 0.2), dreh(0.6, 0.1, 0.3), dreh(-0.1, -0.5, 0.25), dreh(0.2, 0, 0.35)];
    const drehFeld = Float32Array.from(R.flat());
    const partner = [3, 4, 5, 0, 1, 2, 6]; // 0–2 rechts, 3–5 links, 6 Naht
    const w = [0.9, 0.4, 0.2, 0.3, 0.7, 0.05, 0.6];
    const st: Stencil = { punkte: Uint32Array.from([0, 1, 2, 3, 4, 5, 6]), gewichte: Float64Array.from([0.3, 0.1, 0.05, 0.15, 0.2, 0.1, 0.1]) };
    const A = verstaerkung(st, (i) => poseWirkung(drehFeld, i, partner[i]!, w[i]!, partner[i] === i ? 0 : w[partner[i]!]!));
    const D: V3 = [0.012, -0.007, 0.004];
    // Editor: posierter Zuwachs w·D je Punkt → Rᵀ in die Ruhe → rechts direkt, links gespiegelt beim Partner, Naht 2x/2y/0
    const Rt = (i: number, v: V3): V3 => [0, 1, 2].map((c) => R[i]![c]! * v[0] + R[i]![3 + c]! * v[1] + R[i]![6 + c]! * v[2]) as V3;
    const Rv = (i: number, v: V3): V3 => [0, 1, 2].map((r) => R[i]![3 * r]! * v[0] + R[i]![3 * r + 1]! * v[1] + R[i]![3 * r + 2]! * v[2]) as V3;
    const ruhe: V3[] = Array.from({ length: 7 }, () => [0, 0, 0]);
    for (let i = 0; i < 7; i++) {
      const x = Rt(i, [w[i]! * D[0], w[i]! * D[1], w[i]! * D[2]]);
      if (i === 6) ruhe[6] = [ruhe[6]![0] + 2 * x[0], ruhe[6]![1] + 2 * x[1], 0];
      else if (i < 3) ruhe[i] = [ruhe[i]![0] + x[0], ruhe[i]![1] + x[1], ruhe[i]![2] + x[2]];
      else {
        const q = partner[i]!;
        ruhe[q] = [ruhe[q]![0] + x[0], ruhe[q]![1] + x[1], ruhe[q]![2] - x[2]];
      }
    }
    // Ruhe-Deltas gespiegelt auf die linke Hälfte, posiert mit der eigenen Drehung
    const bewegung: V3 = [0, 0, 0];
    for (let i = 0; i < 7; i++) {
      const r = i < 3 || i === 6 ? ruhe[i]! : ([ruhe[partner[i]!]![0], ruhe[partner[i]!]![1], -ruhe[partner[i]!]![2]] as V3);
      const dx = Rv(i, r);
      for (let k = 0; k < 3; k++) bewegung[k] = bewegung[k]! + st.gewichte[i]! * dx[k]!;
    }
    const AD: V3 = [A[0] * D[0] + A[1] * D[1] + A[2] * D[2], A[3] * D[0] + A[4] * D[1] + A[5] * D[2], A[6] * D[0] + A[7] * D[1] + A[8] * D[2]];
    expect(Math.hypot(AD[0] - bewegung[0], AD[1] - bewegung[1], AD[2] - bewegung[2])).toBeLessThan(1e-9);
    // und rückwärts: genauerVersatz trifft ein Ziel d mit dieser schiefen Verstärkung (ohne Grenze der Verstärkung; die
    // Gewichte dieses Beispiels sind klein, mit der Standardgrenze 0,25 würde eine Richtung begrenzt)
    const d: V3 = [0.02, 0.01, -0.015];
    const v = genauerVersatz(A, d, { grenze: 0.01 });
    expect(v.begrenzt).toBe(false);
    expect(v.rest).toBeLessThan(1e-9);
    const b = genauerVersatz(A, d);
    if (b.begrenzt) expect(b.rest).toBeGreaterThan(0);
  });

  it('Ente (Körper aus Teilen): genau trifft ≤ 0,1 px', () => {
    const ente = enteDokument();
    const planB: Partial<Bauplan> = { earle: false, koerper: 'teile' };
    const v = wesenBauen(ente, planB, null);
    expect(v.netz.koerperBaum?.fehler).toBeUndefined();
    expect(v.stand.zugGrundlage).toBeTruthy();
    const h = v.netz.hoehe;
    // Brust rechts
    const brust: V3 = [-0.1, 0.35 * h, 0.12];
    const weich = strich(ente, planB, v, brust, [0.02, 0.02, 0], 0.15, false, true);
    const genau = strich(ente, planB, v, brust, [0.02, 0.02, 0], 0.15, true, true);
    console.log(`Ente: weich Fehler ${weich.fehlerPx.toFixed(2)} px, genau ${genau.fehlerPx.toFixed(3)} px (Verstärkung ${genau.verstaerkung.toFixed(2)})`);
    expect(genau.fehlerPx).toBeLessThan(0.1);
    expect(weich.fehlerPx).toBeGreaterThan(genau.fehlerPx);
  });
});
