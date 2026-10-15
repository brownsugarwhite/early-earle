// VERSUCH (12.10.2026): Zähne am Zahnfleisch (D4) – Reihe, Überblenden, Rahmen und Netz am Tiger (zu, ½, auf),
// Prüfung im geschlossenen Maul mit Vorschlägen, Tempo.

import { describe, expect, it } from 'vitest';
import { type Netz, type V3, unterteilen, unterteilenMehrfach } from './catmullClark';
import { gelenkBewegung } from './kiefer';
import { type MaulKaefig, kieferRig, maulAnpassen, maulKaefig, maulZwischen } from './maul';
import { abstandZuZug, ketteUnterteilen } from './pruefen';
import { type M3, abstand3, kreuz3, laenge3, minus3, punkt3 } from './v3';
import tigerDaten from './vorlagen/tiger.json';
import { type Vorlage, vorlageDokument, vorlageMaul } from './vorlagen';
import {
  type Kiefer,
  type Zahn,
  type ZahnBefund,
  type ZahnRahmen,
  ZAHN_STANDARD,
  grenzKetten,
  zahnBei,
  zahnfleisch,
  zahnfleischAusKaefig,
  zahnfleischKetten,
  zahnGitter,
  zahnNetz,
  zahnNetze,
  zahnPruefen,
  zahnreihe,
} from './zaehne';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now: () => number };

const PX = 461; // Kachel in Bildpunkten in der Grundansicht
const tiger = tigerDaten as unknown as Vorlage;
const spiegel = (p: V3): V3 => [p[0], p[1], -p[2]];

describe('Versuch Zähne: Reihe und Überblenden', () => {
  it('1 … 9 Zähne je Kiefer: spiegelgleich, Mittelzahn bei ungerader Zahl, gleiche Abstände', () => {
    const uMax = 0.9;
    for (const kiefer of ['oben', 'unten'] as const) {
      for (let n = 1; n <= 9; n++) {
        const reihe = zahnreihe(n, kiefer, ZAHN_STANDARD, uMax, 0);
        expect(reihe.length).toBe(n);
        const mitte = reihe.filter((z) => z.seite === 0);
        expect(mitte.length).toBe(n % 2);
        for (const z of mitte) expect(z.u).toBe(0);
        const rechts = reihe.filter((z) => z.seite === 1).map((z) => z.u);
        const links = reihe.filter((z) => z.seite === -1).map((z) => z.u);
        expect(links.length).toBe(rechts.length);
        // Reihe läuft von links nach rechts: links = Spiegelbild von rechts in umgekehrter Folge
        rechts.forEach((u, i) => expect(Math.abs(u - links[links.length - 1 - i]!)).toBeLessThan(1e-9));
        // vorzeichenbehaftete Lage v = Seite·u: überall Abstand Δ, an den Enden Δ/2 bis uMax
        const v = reihe.map((z) => z.seite * z.u);
        const delta = (2 * uMax) / n;
        for (let i = 1; i < v.length; i++) expect(Math.abs(v[i]! - v[i - 1]! - delta)).toBeLessThan(1e-6);
        expect(Math.abs(uMax - v[v.length - 1]! - delta / 2)).toBeLessThan(1e-6);
        expect(Math.abs(v[0]! + uMax - delta / 2)).toBeLessThan(1e-6);
      }
    }
  });

  it('Standard: die untere Reihe ist um Δ/2 versetzt und steht in den Lücken der oberen', () => {
    for (let n = 2; n <= 9; n++) {
      const oben = zahnreihe(n, 'oben', ZAHN_STANDARD).filter((z) => z.seite === 1);
      const unten = zahnreihe(n, 'unten', ZAHN_STANDARD).filter((z) => z.seite === 1);
      const k = Math.floor(n / 2);
      const delta = n % 2 ? 0.9 / (k + 0.5) : 0.9 / k;
      oben.forEach((z, i) => expect(Math.abs(unten[i]!.u - z.u - delta / 2)).toBeLessThan(1e-9));
      expect(Math.max(...unten.map((z) => z.u))).toBeLessThanOrEqual(0.9 + 1e-12);
    }
  });

  it('Werte für „auf“: Länge bei α = 1 doppelt, bei 0 unverändert, bei 0,5 halbwegs', () => {
    const L = ZAHN_STANDARD.laenge;
    const z: Zahn = { ...ZAHN_STANDARD, kiefer: 'oben', u: 0.3, seite: 1, auf: { laenge: 2 * L, neigung: 10 } };
    expect(zahnBei(z, 0).laenge).toBe(L);
    expect(Math.abs(zahnBei(z, 0.5).laenge - 1.5 * L)).toBeLessThan(1e-15);
    expect(Math.abs(zahnBei(z, 1).laenge - 2 * L)).toBeLessThan(1e-15);
    expect(zahnBei(z, 0.5).neigung).toBeCloseTo(5, 12);
    expect(zahnBei(z, 0.5).breite).toBe(ZAHN_STANDARD.breite);
    // im Netz (gleicher Rahmen, ohne Biegung): Abstand Wurzel → Spitze = wirksame Länge
    const mk = maulKaefig(vorlageDokument(tiger, 'zu'), vorlageMaul(tiger).eingabe);
    const zf = zahnfleischAusKaefig(mk, maulAnpassen(mk, 'zu'));
    const gerade: Zahn = { ...z, biegung: 0, auf: { laenge: 2 * L } };
    const laenge = (a: number) => {
      const g = zahnGitter(gerade, zf.oben, a);
      return abstand3(g.wurzel, g.spitze);
    };
    expect(Math.abs(laenge(0) - L)).toBeLessThan(1e-12);
    expect(Math.abs(laenge(0.5) - 1.5 * L)).toBeLessThan(1e-12);
    expect(Math.abs(laenge(1) - 2 * L)).toBeLessThan(1e-12);
  });
});

/** Grenzfläche und Ketten nach `stufen` Unterteilungen (wie in maul.test.ts, unabhängig vom Zahn-Modul). */
function grenze(netz: Netz, ketten: number[][], stufen = 3): { netz: Netz; ketten: V3[][] } {
  let n = netz;
  let k = ketten;
  for (let s = 0; s < stufen; s++) {
    k = k.map((c) => ketteUnterteilen(n, c));
    n = unterteilen(n);
  }
  return { netz: n, ketten: k.map((c) => c.map((i) => n.punkte[i]!)) };
}

/** Zahnfleischlinie selbst gerechnet: Mitte von Lippenrand und innerer Lippe auf Stufe 3. */
function zahnfleischSelbst(mk: MaulKaefig, netz: Netz, kiefer: Kiefer): V3[] {
  const k = zahnfleischKetten(mk)[kiefer];
  const r0 = kiefer === 'oben' ? 0 : 6;
  const r1 = kiefer === 'oben' ? 1 : 5;
  mk.tasche.forEach((r, c) => {
    expect(k.rand[c + 1]).toBe(r[r0]);
    expect(k.innen[c + 1]).toBe(r[r1]);
  });
  const g = grenze(netz, [k.rand, k.innen], 3);
  return g.ketten[0]!.map((p, j) => [(p[0] + g.ketten[1]![j]![0]) / 2, (p[1] + g.ketten[1]![j]![1]) / 2, (p[2] + g.ketten[1]![j]![2]) / 2]);
}

/** Paarabstände (Stichprobe) aller Ecken eines Netzes, für „starr“. */
function paarAbstaende(pos: Float32Array): number[] {
  const n = pos.length / 3;
  const out: number[] = [];
  for (let a = 0; a < n; a += 3) {
    for (let b = a + 1; b < n; b += 5) out.push(Math.hypot(pos[3 * a]! - pos[3 * b]!, pos[3 * a + 1]! - pos[3 * b + 1]!, pos[3 * a + 2]! - pos[3 * b + 2]!));
  }
  return out;
}

/** Winkel (Grad) der Drehung von Rahmen A nach Rahmen B nach Abzug der Knochendrehung K (Rest = Q·Kᵀ, Q = B·Aᵀ). */
function restWinkel(A: ZahnRahmen, B: ZahnRahmen, K: M3): number {
  const a: M3 = [A.t, A.d, A.i];
  const b: M3 = [B.t, B.d, B.i];
  let spur = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) spur += (b[0][r]! * a[0][c]! + b[1][r]! * a[1][c]! + b[2][r]! * a[2][c]!) * K[r]![c]!;
  return (Math.acos(Math.min(1, Math.max(-1, (spur - 1) / 2))) * 180) / Math.PI;
}

describe('Versuch Zähne am Tiger: Rahmen, Netz und Wurzel in jedem Zustand', () => {
  const mk = maulKaefig(vorlageDokument(tiger, 'zu'), vorlageMaul(tiger).eingabe);
  const zu = maulAnpassen(mk, 'zu');
  const auf = maulAnpassen(mk, 'auf');
  const rig = kieferRig(mk, zu, auf);
  const halb = maulZwischen(mk, zu, auf, 0.5, 'knochen', rig);
  const zustaende: [string, Netz, number][] = [
    ['zu', zu, 0],
    ['½', halb, 0.5],
    ['auf', auf, 1],
  ];
  const form = { ...ZAHN_STANDARD, laenge: 0.035, biegung: 0.3, neigung: 5, spreizung: 6, rundheit: 0.7, schaerfe: 0.7 };
  const zaehne: Zahn[] = [...zahnreihe(7, 'oben', form), ...zahnreihe(6, 'unten', { ...form, laenge: 0.025 })];
  // drei Zähne mit Werten für „auf“ (größer; verschoben und anders geneigt; stärker gebogen), einer außen
  zaehne[1] = { ...zaehne[1]!, auf: { laenge: 0.06, breite: 0.016 } };
  zaehne[5] = { ...zaehne[5]!, auf: { u: zaehne[5]!.u + 0.05, neigung: -5 } };
  zaehne[9] = { ...zaehne[9]!, auf: { laenge: 0.04, biegung: 0.6 } };
  zaehne[3] = { ...zaehne[3]!, aussen: true };

  it('Rahmen: orthonormal, d zum Gegenkiefer, i zum Rachen, links = Spiegelbild von rechts', () => {
    for (const [name, netz] of zustaende) {
      const zf = zahnfleischAusKaefig(mk, netz);
      // Unsymmetrie des Käfigs selbst (offen: ARAP läuft nicht spiegelgleich)
      const C = mk.tasche.length;
      let kaefig = 0;
      for (let c = 0; c < C; c++) for (let r = 0; r < 7; r++) kaefig = Math.max(kaefig, abstand3(spiegel(netz.punkte[mk.tasche[c]![r]!]!), netz.punkte[mk.tasche[C - 1 - c]![r]!]!));
      let ortho = 0;
      let spiegelFehler = 0;
      let minD = Infinity;
      let minRachen = Infinity;
      let uFehler = 0;
      for (const kiefer of ['oben', 'unten'] as const) {
        const gegen = zf[kiefer === 'oben' ? 'unten' : 'oben'];
        for (let u = 0; u <= 0.9001; u += 0.05) {
          for (const s of [-1, 1] as const) {
            for (const aussen of [false, true]) {
              const r = zf[kiefer](u, s, aussen);
              for (const v of [r.t, r.d, r.i]) ortho = Math.max(ortho, Math.abs(laenge3(v) - 1));
              ortho = Math.max(ortho, Math.abs(punkt3(r.t, r.d)), Math.abs(punkt3(r.t, r.i)), Math.abs(punkt3(r.d, r.i)));
            }
            const r = zf[kiefer](u, s);
            const g = gegen(u, s).p;
            minD = Math.min(minD, punkt3(r.d, minus3(g, r.p)) / Math.max(1e-12, abstand3(g, r.p)));
            uFehler = Math.max(uFehler, Math.abs(zf[kiefer].uVon(r.p, s).u - u));
          }
          const R = zf[kiefer](u, 1);
          const L = zf[kiefer](u, -1);
          for (const [a, b] of [
            [R.p, L.p],
            [R.t, L.t],
            [R.d, L.d],
            [R.i, L.i],
            [R.rand, L.rand],
          ] as const) {
            spiegelFehler = Math.max(spiegelFehler, abstand3(spiegel(a), b));
          }
        }
        // i zeigt in den Mund: zum Rachen (Taschenreihe 3) an jeder Nahtspalte
        const K = mk.nahtAnteile.length - 2;
        for (let c = K; c < C; c++) {
          const r = zf[kiefer](mk.nahtAnteile[c - K]!, 1);
          const rachen = zf.grenze.punkte[mk.tasche[c]![3]!]!;
          minRachen = Math.min(minRachen, punkt3(r.i, minus3(rachen, r.p)) / abstand3(rachen, r.p));
        }
      }
      console.log(
        `${name}: orthonormal bis ${ortho.toExponential(1)}; Spiegel bis ${spiegelFehler.toExponential(1)} (Käfig ${kaefig.toExponential(1)}); ` +
          `cos(d, Gegenkiefer) ≥ ${minD.toFixed(2)}; cos(i, Rachen) ≥ ${minRachen.toFixed(2)}; u zurück bis ${uFehler.toExponential(1)}`,
      );
      expect(ortho).toBeLessThan(1e-12);
      expect(spiegelFehler).toBeLessThan(1e-9 + 50 * kaefig);
      if (name === 'zu') expect(spiegelFehler).toBeLessThan(1e-9);
      expect(minD).toBeGreaterThan(0);
      expect(minRachen).toBeGreaterThan(0);
      expect(uFehler).toBeLessThan(1e-6);
    }
  });

  it('Wurzel auf dem Zahnfleisch (≤ 0,5 px) zu, ½, auf – auch mit Werten für „auf“; Zahn starr', () => {
    const netze = new Map<number, Float32Array>();
    for (const [name, netz, alpha] of zustaende) {
      const zf = zahnfleischAusKaefig(mk, netz);
      const linie = { oben: zahnfleischSelbst(mk, netz, 'oben'), unten: zahnfleischSelbst(mk, netz, 'unten') };
      let maxWurzel = 0;
      let maxRing = 0;
      let maxStarr = 0;
      zaehne.forEach((z, zi) => {
        const g = zahnGitter(z, zf[z.kiefer], alpha);
        // Ring 1 (Höhe des Zahnfleischs) liegt um die Wurzel
        const ring = g.ringe[1]!;
        const m = [0, 1, 2].map((k) => ring.reduce((s, p) => s + p[k]!, 0) / ring.length) as V3;
        maxRing = Math.max(maxRing, abstand3(m, g.wurzel));
        if (!z.aussen) maxWurzel = Math.max(maxWurzel, abstandZuZug([g.wurzel], linie[z.kiefer]).max);
        if (!z.auf) {
          const pos = zahnNetz(z, zf[z.kiefer], alpha).positionen;
          const alt = netze.get(zi);
          if (alt) {
            const a = paarAbstaende(alt);
            const b = paarAbstaende(pos);
            maxStarr = Math.max(maxStarr, ...a.map((x, i) => Math.abs(x - b[i]!)));
          } else netze.set(zi, pos);
        }
      });
      // außen-Zahn: Ansatz am Lippenrand, um halbe Tiefe plus 1,5 px nach außen
      const za = zaehne[3]!;
      const ga = zahnGitter(za, zf.oben, alpha);
      const versatz = abstand3(ga.wurzel, zf.oben(za.u, za.seite, true).rand) - za.tiefe / 2;
      console.log(
        `${name}: Wurzel–Zahnfleisch max ${(maxWurzel * PX).toFixed(4)} px, Ringmitte–Wurzel ${maxRing.toExponential(1)}, ` +
          `Paarabstände ändern sich um ≤ ${maxStarr.toExponential(1)}; außen: Ansatz ${(versatz * PX).toFixed(2)} px vor dem Rand`,
      );
      expect(maxWurzel * PX).toBeLessThan(0.5);
      expect(maxRing).toBeLessThan(1e-9);
      expect(maxStarr).toBeLessThan(1e-6);
      expect(Math.abs(versatz * PX - 1.5)).toBeLessThan(1e-6);
    }
  });

  it('Netz: geschlossen und nach außen orientiert, Spiegelzahn = Spiegelbild', () => {
    const zf = zahnfleischAusKaefig(mk, zu);
    for (const z of zaehne) {
      const { positionen: p, normalen: nn } = zahnNetz(z, zf[z.kiefer], 0);
      // Volumen über die Divergenz: Σ a · (b × c) / 6 > 0 heißt: Dreiecke außen gegen den Uhrzeigersinn
      let vol = 0;
      let gleich = 0;
      for (let o = 0; o < p.length; o += 9) {
        const a: V3 = [p[o]!, p[o + 1]!, p[o + 2]!];
        const b: V3 = [p[o + 3]!, p[o + 4]!, p[o + 5]!];
        const c: V3 = [p[o + 6]!, p[o + 7]!, p[o + 8]!];
        vol += punkt3(a, kreuz3(b, c)) / 6;
        if (punkt3(kreuz3(minus3(b, a), minus3(c, a)), [nn[o]!, nn[o + 1]!, nn[o + 2]!]) > 0) gleich++;
      }
      expect(vol).toBeGreaterThan(0);
      expect(gleich).toBe(p.length / 9);
    }
    const r = zaehne.find((z) => z.kiefer === 'unten' && z.seite === 1 && !z.auf)!;
    const l = zaehne.find((z) => z.kiefer === 'unten' && z.seite === -1 && z.u === r.u)!;
    const gr = zahnGitter(r, zf.unten, 0);
    const gl = zahnGitter(l, zf.unten, 0);
    let fehler = 0;
    gr.ringe.forEach((ring, m) => ring.forEach((p, j) => (fehler = Math.max(fehler, abstand3(spiegel(p), gl.ringe[m]![j]!)))));
    expect(fehler).toBeLessThan(1e-9);
  });

  it('Bericht: Drehung des Zahns gegenüber dem Kieferknochen zwischen zu und auf', () => {
    const zfZu = zahnfleischAusKaefig(mk, zu);
    const zfAuf = zahnfleischAusKaefig(mk, auf);
    const K = { oben: gelenkBewegung(rig.gelenkOben, 1).R, unten: gelenkBewegung(rig.gelenkUnten, 1).R };
    for (const kiefer of ['oben', 'unten'] as const) {
      const w = [0, 0.2, 0.4, 0.6, 0.8].map((u) => restWinkel(zfZu[kiefer](u, 1), zfAuf[kiefer](u, 1), K[kiefer]));
      console.log(`${kiefer}: Rahmen zu → auf minus Knochen (u = 0, 0,2 … 0,8): ${w.map((x) => x.toFixed(0)).join('°, ')}°`);
    }
  });
});

describe('Versuch Zähne am Tiger: Prüfung im geschlossenen Maul', () => {
  const mk = maulKaefig(vorlageDokument(tiger, 'zu'), vorlageMaul(tiger).eingabe);
  const zu = maulAnpassen(mk, 'zu');
  // sechs lange Oberzähne im geschlossen sichtbaren Maul (bis zum schwarzen Mundwinkel)
  const lang = zahnreihe(6, 'oben', { ...ZAHN_STANDARD, laenge: 0.04, biegung: 0 }, mk.sichtbar);
  const zeige = (titel: string, b: ZahnBefund[]) => {
    console.log(titel);
    for (const e of b) console.log(`  Zahn ${e.zahn} ${e.art} ${(e.tiefe * PX).toFixed(2)} px${e.vorschlaege ? ` → ${e.vorschlaege.map((v) => v.text).join(' | ')}` : ''}`);
  };
  const anwenden = (zaehne: readonly Zahn[], b: ZahnBefund[], art: string, beginn: string): Zahn[] =>
    zaehne.map((z, i) => {
      const v = b.find((e) => e.zahn === i && e.art === art)?.vorschlaege?.find((x) => x.text.startsWith(beginn));
      return v ? { ...z, ...v.aenderung } : z;
    });

  it('sechs lange Oberzähne stoßen in den Unterkiefer: Tiefe und Vorschläge, nichts wird still geändert', () => {
    const vorher = JSON.stringify(lang);
    const t0 = performance.now();
    const b = zahnPruefen(mk, zu, lang);
    const t1 = performance.now();
    zeige(`lang ${(0.04 * PX).toFixed(1)} px (${(t1 - t0).toFixed(0)} ms mit Vorschlägen)`, b);
    expect(JSON.stringify(lang)).toBe(vorher);
    const durch = b.filter((e) => e.art === 'durchKiefer');
    expect(durch.length).toBe(6);
    for (const e of durch) {
      expect(e.tiefe * PX).toBeGreaterThan(1);
      expect(e.vorschlaege?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('Vorschläge angewandt: gekürzt bzw. außen ohne Befund; „offen größer“ wächst beim Öffnen', () => {
    const b = zahnPruefen(mk, zu, lang);
    const kurz = anwenden(lang, b, 'durchKiefer', 'kürzen');
    const t0 = performance.now();
    const bk = zahnPruefen(mk, zu, kurz);
    zeige(`gekürzt (${(performance.now() - t0).toFixed(0)} ms ohne Befund)`, bk);
    expect(bk.every((e) => e.art === 'ok')).toBe(true);
    const aussen = anwenden(lang, b, 'durchKiefer', 'außen');
    expect(aussen.every((z) => z.aussen)).toBe(true);
    const ba = zahnPruefen(mk, zu, aussen);
    zeige('außen (Vorschlag, ≥ 1 px Luft)', ba);
    expect(ba.every((e) => e.art === 'ok')).toBe(true);
    const offen = anwenden(lang, b, 'durchKiefer', 'geschlossen');
    for (const z of offen) {
      expect(zahnBei(z, 1).laenge).toBeCloseTo(0.04, 12);
      expect(zahnBei(z, 0).laenge).toBeLessThan(0.04);
    }
    expect(zahnPruefen(mk, zu, offen).every((e) => e.art === 'ok')).toBe(true);
  });

  it('hinter dem sichtbaren Mundwinkel verdeckt: innen ok, außen sticht aus der Backe (mit Vorschlag)', () => {
    const z: Zahn = { ...ZAHN_STANDARD, kiefer: 'oben', u: 0.75, seite: 1, laenge: 0.04 };
    const b = zahnPruefen(mk, zu, [z, { ...z, aussen: true }]);
    zeige(`u = 0,75 hinter dem Mundwinkel (sichtbar bis ${mk.sichtbar.toFixed(2)})`, b);
    expect(b.filter((e) => e.zahn === 0).map((e) => e.art)).toEqual(['ok']);
    const backe = b.find((e) => e.zahn === 1);
    expect(backe?.art).toBe('durchHaut');
    expect(backe?.vorschlaege?.length ?? 0).toBeGreaterThan(0);
  });

  it('Zähne dürfen sich überschneiden (Florian 15.10.): zu breite Nachbarn geben keinen Befund', () => {
    const breit = zahnreihe(5, 'oben', { ...ZAHN_STANDARD, laenge: 0.004, breite: 0.05 }, mk.sichtbar);
    const schmal = zahnreihe(5, 'oben', { ...ZAHN_STANDARD, laenge: 0.004 }, mk.sichtbar);
    const b = zahnPruefen(mk, zu, breit);
    zeige('breit', b);
    expect(b.map((e) => `${e.zahn}:${e.art}`)).toEqual(zahnPruefen(mk, zu, schmal).map((e) => `${e.zahn}:${e.art}`));
  });

  it('Tempo: 2 × 9 Zahnnetze < 10 ms', () => {
    const t0 = performance.now();
    const grenzeZu = unterteilenMehrfach(zu, 3);
    const t1 = performance.now();
    const kt = grenzKetten(mk.netz, zahnfleischKetten(mk), 3).ketten;
    const t2 = performance.now();
    const alle = [...zahnreihe(9, 'oben', ZAHN_STANDARD), ...zahnreihe(9, 'unten', ZAHN_STANDARD)];
    let dauerNetze = Infinity;
    let dauerFleisch = Infinity;
    for (let w = 0; w < 5; w++) {
      const a = performance.now();
      const fleisch = { oben: zahnfleisch(mk, grenzeZu, kt, 'oben'), unten: zahnfleisch(mk, grenzeZu, kt, 'unten') };
      const b = performance.now();
      const netz = zahnNetze(alle, fleisch, 0);
      const c = performance.now();
      expect(netz.bereiche.length).toBe(18);
      expect(netz.positionen.length).toBe(18 * 112 * 9);
      dauerNetze = Math.min(dauerNetze, c - b);
      dauerFleisch = Math.min(dauerFleisch, b - a);
    }
    console.log(
      `Unterteilung Stufe 3: ${(t1 - t0).toFixed(1)} ms; Ketten (einmal je Topologie): ${(t2 - t1).toFixed(1)} ms; ` +
        `Zahnfleisch beider Kiefer: ${dauerFleisch.toFixed(2)} ms; 18 Zahnnetze: ${dauerNetze.toFixed(2)} ms`,
    );
    expect(dauerNetze + dauerFleisch).toBeLessThan(10);
  });
});
