// Posen B5 (Plan Teil B): Rot und Blau der Pose. Die Lippen liegen nach der Projektion auf den Pose-Linien (L1 ≤ 1 px),
// eine unberührte Pose bleibt bitgleich, außerhalb des Bereichs ändert sich nichts, die Linien folgen der Form (Pinsel),
// formneutrales Einfügen ändert nichts, schiefe Posen gehen genauso.
import { describe, expect, it } from 'vitest';
import { type KaefigDelta, type LinienKnoten, type Pose, type PoseLinien, standardPosen } from '../../dokument';
import { MAUL_STANDARD, type MaulErgebnis, ableitenMitMaul, kieferGewichteSetzen, maulOptionenVorlage } from '../maul';
import { maulLinieAusDokument } from '../maulDokument';
import { kugelMaulDokument } from '../pruefstand';
import { linieEinfuegen, linienGrundKnoten, linienWirksam, lippenKetten } from './linien';
import { ketteBei, linienGriffAus, linienKnotenVerschieben, poseLinieAnzeige } from './linienGriffe';
import { griffZiehen3 } from '../../versuch/linie3d';

declare const console: { log: (...a: unknown[]) => void };
import { posenAuswerten, posenFuerBau } from './posen';

const OPT = { ...MAUL_STANDARD, ...maulOptionenVorlage('vorn'), haps: 0.7 };
type Art = 'gleich' | 'ueberbiss' | 'unterbiss';
function fall(art: Art) {
  const dok = kugelMaulDokument(art);
  const abl = ableitenMitMaul(dok, maulLinieAusDokument(dok)!, { stufen: 2 }, OPT);
  abl.maul.opt = OPT;
  kieferGewichteSetzen(abl.maul, OPT);
  return { dok, abl };
}
const mit = (posen: Pose[], id: string, p: Partial<Pose>): Pose[] => posen.map((q) => (q.id === id ? { ...q, ...p } : q));
const maxAbstand = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
  return m;
};
/** fester Zufall (Startwert) */
function zufall(start: number) {
  let x = start >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}
/**
 * Zufällige Pose-Linien auf den Standardknoten: Knoten bis ±w Kern-Einheiten (±14 px bei w = 0,03), Griffe glatt wie im
 * Editor (gegenüberliegende Griffe auf einer Geraden, Länge nach dem Segment), Anfangsgriff quer zur Spiegelebene, am
 * Mundwinkel ohne Griffversatz. `frei` = jeder Griff unabhängig (Knicke an den Knoten, härter als der Editor erzeugt).
 */
function zufallsLinien(abl: MaulErgebnis, dok: ReturnType<typeof kugelMaulDokument>, r: () => number, w: number, nur?: 'oben' | 'unten', frei = false): PoseLinien {
  const k = lippenKetten(abl);
  const z = () => (2 * r() - 1) * w;
  const mache = (name: 'oben' | 'unten'): LinienKnoten[] =>
    linienGrundKnoten(abl, k, dok, name).map((q, i, g) => {
      if (nur && nur !== name) return q;
      const letzter = i === g.length - 1;
      const v = [2 * z(), 2 * z(), 2 * z()];
      if (i === 0) v[0] = v[1] = 0;
      const dsA = i + 1 < g.length ? g[i + 1]!.s - q.s : 0;
      const dsE = i > 0 ? q.s - g[i - 1]!.s : 0;
      const aus: [number, number, number] = letzter ? [0, 0, 0] : frei ? [z() / 2, z() / 2, z() / 2] : [(v[0]! * dsA) / 3, (v[1]! * dsA) / 3, (v[2]! * dsA) / 3];
      const ein: [number, number, number] = letzter ? [0, 0, 0] : frei ? [z() / 2, z() / 2, z() / 2] : [(-v[0]! * dsE) / 3, (-v[1]! * dsE) / 3, (-v[2]! * dsE) / 3];
      return { ...q, d: [z(), z(), z()], ein, aus };
    });
  // wie der Editor speichert: Anfang auf der Naht, gemeinsamer Mundwinkel
  return linienWirksam({ oben: mache('oben'), unten: mache('unten') });
}

describe('Posen B5: Rot und Blau der Pose', () => {
  it('unberührte Pose (Versätze 0) bitgleich wie ohne Linien; Grundform bitgleich', () => {
    const { dok, abl } = fall('ueberbiss');
    const k = lippenKetten(abl);
    const null0: PoseLinien = { oben: linienGrundKnoten(abl, k, dok, 'oben'), unten: linienGrundKnoten(abl, k, dok, 'unten') };
    const ohne = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    const mitNull = mit(ohne, 'fressen', { linien: null0 });
    expect(maxAbstand(posenAuswerten(abl, abl, OPT, mitNull, { fressen: 1 }, dok).xyz, posenAuswerten(abl, abl, OPT, ohne, { fressen: 1 }, dok).xyz)).toBe(0);
    expect(posenAuswerten(abl, abl, OPT, mitNull, {}, dok).xyz).toBe(abl.kaefig.xyz);
  });

  for (const art of ['gleich', 'ueberbiss', 'unterbiss'] as const) {
    it(`${art}: Lippen ≤ 1 px auf zufälligen Pose-Linien (Fressen mit Haps, 24 Zufallsfälle bis ±14 px, Ziel 0,25 px)`, () => {
      const { dok, abl } = fall(art);
      const r = zufall(art.length * 7919);
      const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
      let schlimmste = 0;
      let frei = 0;
      let punkt = 0;
      for (let f = 0; f < 24; f++) {
        const linien = zufallsLinien(abl, dok, r, 0.03, undefined, f >= 12);
        const e = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien }), { fressen: 1 }, dok);
        const l = e.bearbeitung!.lippen!;
        if (f < 12) schlimmste = Math.max(schlimmste, l.abweichung.oben, l.abweichung.unten);
        else frei = Math.max(frei, l.abweichung.oben, l.abweichung.unten);
        punkt = Math.max(punkt, l.abweichungPunkt.oben, l.abweichungPunkt.unten);
        expect(l.gespeichert).toBe(true);
        expect(l.zu).toBe(false);
      }
      console.log(`${art}: größter Abstand Lippe ↔ Pose-Linie ${schlimmste.toFixed(3)} px (glatte Griffe), ${frei.toFixed(3)} px (freie Griffe); zum Zielpunkt beim selben Anteil ${punkt.toFixed(3)} px`);
      expect(schlimmste).toBeLessThan(0.25);
      expect(frei).toBeLessThan(1);
    });
  }

  it('außerhalb des Bereichs exakt 0; nur Blau versetzt lässt die Oberlippe (fast) stehen', () => {
    const { dok, abl } = fall('gleich');
    const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    const ohne = posenAuswerten(abl, abl, OPT, posen0, { fressen: 1 }, dok);
    const linien = zufallsLinien(abl, dok, zufall(5), 0.03, 'unten');
    const e = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien }), { fressen: 1 }, dok);
    const n = abl.kaefig.n;
    let bewegt = 0;
    for (let i = 0; i < n; i++) if (Math.hypot(e.xyz[3 * i]! - ohne.xyz[3 * i]!, e.xyz[3 * i + 1]! - ohne.xyz[3 * i + 1]!, e.xyz[3 * i + 2]! - ohne.xyz[3 * i + 2]!) > 0) bewegt++;
    expect(bewegt).toBeGreaterThan(0);
    expect(bewegt).toBeLessThan(n);
    // Oberlippe: gezeigte gegen natürliche Lage
    const l = e.bearbeitung!.lippen!;
    let oben = 0;
    for (const s of ['rechts', 'links'] as const) oben = Math.max(oben, maxAbstand(l.oben[s].ist, l.oben[s].natuerlich) * 461);
    console.log(`nur Blau: Käfigpunkte bewegt ${bewegt}/${n}, Oberlippe ${oben.toFixed(3)} px`);
    expect(oben).toBeLessThan(0.1);
    expect(l.abweichung.unten).toBeLessThan(1);
  });

  it('schiefe Pose (Schädel gerollt, Kiefer gegiert und seitlich): Lippen ≤ 1 px auf den Linien', () => {
    const { dok, abl } = fall('ueberbiss');
    const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    const r = zufall(42);
    let schlimmste = 0;
    for (let f = 0; f < 6; f++) {
      const linien = zufallsLinien(abl, dok, r, 0.03);
      const p = mit(posen0, 'fressen', { linien, stellung: { kiefer: { winkel: 50, gieren: 12, seit: 0.1 }, schaedel: { winkel: 12, rollen: 18 } } });
      const l = posenAuswerten(abl, abl, OPT, p, { fressen: 1 }, dok).bearbeitung!.lippen!;
      schlimmste = Math.max(schlimmste, l.abweichung.oben, l.abweichung.unten);
    }
    console.log(`schief: größte Abweichung ${schlimmste.toFixed(3)} px`);
    expect(schlimmste).toBeLessThan(1);
  });

  it('die Linien folgen der Form (Pinsel an der Lippe): gezeigte Lippe bewegt sich mit der natürlichen', () => {
    const { dok, abl } = fall('gleich');
    const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    const linien = zufallsLinien(abl, dok, zufall(9), 0.02);
    const vorher = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien }), { fressen: 1 }, dok).bearbeitung!.lippen!;
    // Form: alle Maulpunkte der rechten Hälfte 0,01 nach unten
    const form: KaefigDelta[] = [];
    for (let p = 0; p < abl.kaefig.n; p++) if (abl.kaefig.xyz[3 * p + 2]! >= 0 && abl.maul.art[p]! > 0) form.push({ punkt: p, d: [0, -0.01, 0] });
    const nachher = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien, form }), { fressen: 1 }, dok).bearbeitung!.lippen!;
    // gezeigte Lippe bewegt sich wie die natürliche (gleiche Versätze, gleiche Korrektur)
    let fehler = 0;
    for (const name of ['oben', 'unten'] as const)
      for (const s of ['rechts', 'links'] as const) {
        const a = vorher[name][s];
        const b = nachher[name][s];
        for (let q = 0; q < a.ist.length; q++) fehler = Math.max(fehler, Math.abs(b.ist[q]! - a.ist[q]! - (b.natuerlich[q]! - a.natuerlich[q]!)) * 461);
      }
    console.log(`Pinsel folgt: Abweichung der Bewegung ${fehler.toFixed(4)} px`);
    expect(fehler).toBeLessThan(0.05);
    expect(nachher.abweichung.oben).toBeLessThan(1);
  });

  it('formneutral einfügen: neuer Knoten im Versatzfeld ändert die Pose nicht', () => {
    const { dok, abl } = fall('ueberbiss');
    const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    const linien = zufallsLinien(abl, dok, zufall(3), 0.03);
    const a = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien }), { fressen: 1 }, dok).xyz;
    const ein = linieEinfuegen(linien.unten, 0.37);
    expect(ein.index).toBeGreaterThan(0);
    const b = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien: { ...linien, unten: ein.knoten } }), { fressen: 1 }, dok).xyz;
    expect(maxAbstand(a, b)).toBeLessThan(1e-9);
  });

  it('Knotenzug folgt dem Zeiger (Rᵀ·Δ am Knoten), Griffzug trifft den gezogenen Griff', () => {
    for (const art of ['gleich', 'ueberbiss'] as const) {
      const { dok, abl } = fall(art);
      const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
      const l0 = posenAuswerten(abl, abl, OPT, posen0, { fressen: 1 }, dok).bearbeitung!.lippen!;
      let schlimm = 0;
      let ecke = 0;
      for (const name of ['oben', 'unten'] as const) {
        const K = l0.knoten[name].length;
        for (let k = 0; k < K; k++) {
          for (const delta of [[0, -0.02, 0], [0.015, 0.01, 0]]) {
            const neu = linienKnotenVerschieben(l0, name, l0.knoten[name], [k], delta);
            const linien = linienWirksam(name === 'oben' ? { oben: neu, unten: l0.knoten.unten } : { oben: k === K - 1 ? l0.knoten.oben.map((q, i) => (i === K - 1 ? neu[k]! : q)) : l0.knoten.oben, unten: neu });
            const l1 = posenAuswerten(abl, abl, OPT, mit(posen0, 'fressen', { linien }), { fressen: 1 }, dok).bearbeitung!.lippen!;
            const a0 = ketteBei(l0[name].rechts, l0.knoten[name][k]!.s).ist;
            const a1 = ketteBei(l1[name].rechts, l0.knoten[name][k]!.s).ist;
            // erwartet: Δ, am Anfang ohne z-Anteil in Ruhe (Naht)
            const fehler = Math.hypot(a1[0] - a0[0] - delta[0]!, a1[1] - a0[1] - delta[1]!, a1[2] - a0[2] - delta[2]!) * 461;
            if (k === K - 1) ecke = Math.max(ecke, fehler);
            else schlimm = Math.max(schlimm, fehler);
          }
        }
      }
      console.log(`${art}: Knotenzug ${schlimm.toFixed(2)} px neben dem Zeiger, Mundwinkel ${ecke.toFixed(2)} px`);
      expect(schlimm).toBeLessThan(1);
      expect(ecke).toBeLessThan(2);
      // Griffzug: gezeigter Griff nach dem Umrechnen = gezogener Griff
      const anzeige = poseLinieAnzeige(l0, 'unten');
      const k = Math.min(1, anzeige.knoten.length - 2);
      const p = anzeige.knoten[k]!;
      const gezogen = griffZiehen3(anzeige, k, 'aus', 'seite', { x: p.p[0] + p.aus[0] + 0.01, y: p.p[1] + p.aus[1] - 0.012 }, false);
      const neu = linienGriffAus(l0, 'unten', l0.knoten.unten, k, gezogen);
      const wieder = poseLinieAnzeige({ ...l0, knoten: { ...l0.knoten, unten: neu } }, 'unten', neu);
      expect(Math.hypot(...([0, 1, 2].map((c) => wieder.knoten[k]!.aus[c]! - gezogen.knoten[k]!.aus[c]!) as [number, number, number]))).toBeLessThan(1e-9);
    }
  });

  it('Überblenden: halbe Pose liegt zwischen Grundform und Pose (endlich, nicht gleich)', () => {
    const { dok, abl } = fall('gleich');
    const posen0 = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    const linien = zufallsLinien(abl, dok, zufall(11), 0.03);
    const p = mit(posen0, 'fressen', { linien });
    const halb = posenAuswerten(abl, abl, OPT, p, { fressen: 0.5 }, dok).xyz;
    const voll = posenAuswerten(abl, abl, OPT, p, { fressen: 1 }, dok).xyz;
    expect(halb.every((x) => Number.isFinite(x))).toBe(true);
    expect(maxAbstand(halb, voll)).toBeGreaterThan(1e-4);
    expect(maxAbstand(halb, abl.kaefig.xyz)).toBeGreaterThan(1e-4);
  });
});
