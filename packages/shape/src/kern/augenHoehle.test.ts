// Phase 2 M5, Schritt 3b (Plan 5.4): Augenhöhle im Käfig — Topologie (geschlossen, mannigfaltig, gleich orientiert, nur
// Vierecke), Abbildung der feinen Flächen außerhalb der Höhle auf die alten (gleiche Lagen weit weg vom Auge), Rex mit Maul:
// Höhle auf dem Augenpunkt, Durchdringungen des neuen Netzes bei 0, 50 und 100 % Öffnung (Kriterium 0), Wulst über der Haut.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexRoh from '../versuch/vorlagen/rex.json';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { alleFlaechen, pruefeKaefig } from '../kaefig/halbkanten';
import { ableiten } from './ableiten';
import { HOEHLE_STANDARD, type HoehlenAuge, augapfelEcke, augenOben, brauenReihe, hoehlenFein, hoehlenLagen, hoehlenRing, hoehlenTopologie } from './augenHoehle';
import { type MaulErgebnis, ableitenMitMaul, maulOptionenVorlage, maulPose } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { type Bauplan, pruefwesenBauplan, wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };
type V3 = [number, number, number];

function rexAbl(): MaulErgebnis {
  const d: Dokument = { ...vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex'), ausstattung: pruefwesenBauplan('rex') };
  const aus = d.ausstattung ?? {};
  const linie = aus.maulLinie ?? maulLinieAusDokument(d)!;
  return ableitenMitMaul(d, linie as never, { stufen: 2 } as never, { ...maulOptionenVorlage('vorn'), ...(aus.maulOptionen ?? {}) });
}
const punkteAus = (fein: Float64Array): V3[] => Array.from({ length: fein.length / 3 }, (_, i) => [fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!] as V3);

describe('Augenhöhle im Käfig', () => {
  it('Topologie an der Kugel: geschlossen, mannigfaltig, gleich orientiert; 16 Punkte je Auge; Flächen weit weg unverändert', () => {
    const abl = ableiten(neuesDokument('kugel'), { stufen: 2 });
    const v = abl.vorlage;
    const c = v.ringPunkt(Math.floor(v.R / 2), 2);
    const cl = v.ringPunkt(Math.floor(v.R / 2), v.N - 2);
    const augen: HoehlenAuge[] = [
      { c, radius: 0.03, oben: [0, 1, 0] },
      { c: cl, radius: 0.03, oben: [0, 1, 0] },
    ];
    const topo = hoehlenTopologie(abl.kaefig, 2, augen)!;
    expect(topo).not.toBeNull();
    const pr = pruefeKaefig(topo.kaefig);
    expect(pr.fehler).toEqual([]);
    expect(pr.geschlossen && pr.mannigfaltig && pr.orientiert).toBe(true);
    expect(topo.kaefig.n).toBe(abl.kaefig.n + 32);
    expect(topo.kaefig.nF).toBe(abl.kaefig.nF - 8 + 40);
    // Brauenkante oben scharf, unten weich, Lidrand halbscharf
    const s = Array.from(topo.kaefig.eSchaerfe).filter((x) => x > 0);
    expect(s.filter((x) => x === HOEHLE_STANDARD.schaerfeWulst).length).toBeGreaterThan(0);
    expect(s.filter((x) => x === HOEHLE_STANDARD.schaerfeLid).length).toBe(16);
    // Lagen der Ruhe: Flächen weit weg vom Auge liegen wie im alten Netz
    const xyz = hoehlenLagen(topo, abl.kaefig.xyz, augen);
    const fein = hoehlenFein(topo, xyz);
    const altFl = alleFlaechen(abl.unterteilung.stufen[1]!.kaefig);
    const cP: V3 = [abl.fein[3 * c]!, abl.fein[3 * c + 1]!, abl.fein[3 * c + 2]!];
    const clP: V3 = [abl.fein[3 * cl]!, abl.fein[3 * cl + 1]!, abl.fein[3 * cl + 2]!];
    let weit = 0;
    let groessteAbw = 0;
    let abgebildet = 0;
    for (let f = 0; f < topo.feinFlaechen.length; f++) {
      const a = topo.feinAlt[f]!;
      if (a < 0) continue;
      abgebildet++;
      const nf = topo.feinFlaechen[f]!;
      const af = altFl[a]!;
      const p: V3 = [fein[3 * nf[0]!]!, fein[3 * nf[0]! + 1]!, fein[3 * nf[0]! + 2]!];
      const d = Math.min(Math.hypot(p[0] - cP[0], p[1] - cP[1], p[2] - cP[2]), Math.hypot(p[0] - clP[0], p[1] - clP[1], p[2] - clP[2]));
      if (d < 0.25) continue;
      weit++;
      for (let k = 0; k < 4; k++) {
        const q = nf[k]!;
        const r = af[k]!;
        groessteAbw = Math.max(groessteAbw, Math.hypot(fein[3 * q]! - abl.fein[3 * r]!, fein[3 * q + 1]! - abl.fein[3 * r + 1]!, fein[3 * q + 2]! - abl.fein[3 * r + 2]!));
      }
    }
    console.log(`Kugel: abgebildet ${abgebildet} von ${topo.feinFlaechen.length} feinen Flächen, weit weg ${weit}, größte Abweichung ${groessteAbw.toExponential(2)}`);
    expect(abgebildet).toBe(altFl.length - 8 * 16);
    expect(weit).toBeGreaterThan(1000);
    expect(groessteAbw).toBeLessThan(1e-9);
  });

  it('Rex mit Maul: Höhle mit Brauenreihe am Augenpunkt (wie im Bau), keine Durchdringung mit der Höhle bei 0, 50, 100 % Öffnung (geschlossen bleibt nur die verdeckte Überbiss-Überlappung)', () => {
    const abl = rexAbl();
    const v = abl.vorlage;
    const c = augapfelEcke(abl, [-0.15, 0.285, 0.11])!;
    expect(c).not.toBeNull();
    const i = Math.floor(c / v.N);
    const j = c % v.N;
    const cl = v.ringPunkt(i, v.N - j);
    // Normale am Augenpunkt aus den vier Käfigflächen, Oben-Richtung mit 20° Drehung (links gespiegelt)
    const r = hoehlenRing(abl.kaefig, c)!;
    const n: V3 = [0, 0, 0];
    for (const f of r.ecken) {
      for (let k = 0; k < 4; k++) {
        const p = f[k]!;
        const q = f[(k + 1) % 4]!;
        const X = abl.kaefig.xyz;
        n[0] += (X[3 * p + 1]! - X[3 * q + 1]!) * (X[3 * p + 2]! + X[3 * q + 2]!);
        n[1] += (X[3 * p + 2]! - X[3 * q + 2]!) * (X[3 * p]! + X[3 * q]!);
        n[2] += (X[3 * p]! - X[3 * q]!) * (X[3 * p + 1]! + X[3 * q + 1]!);
      }
    }
    const ln = Math.hypot(...n);
    const nr: V3 = [n[0] / ln, n[1] / ln, n[2] / ln];
    const H = 0.356;
    const R = (0.06 * H) / 2;
    const obenR = augenOben(nr, 20, 1);
    const obenL = augenOben([nr[0], nr[1], -nr[2]], 20, -1);
    const bR = brauenReihe(abl, c, obenR, R);
    const bL = brauenReihe(abl, cl, obenL, R);
    expect(bR?.punkte.length).toBeGreaterThanOrEqual(3);
    console.log(`Brauenreihe: ${bR!.punkte.length} Punkte, Gewichte ${bR!.gewicht.map((g) => g.toFixed(2)).join(' ')}`);
    const augen: HoehlenAuge[] = [
      { c, radius: R, oben: obenR, ...(bR ? { braue: bR } : {}) },
      { c: cl, radius: R, oben: obenL, ...(bL ? { braue: bL } : {}) },
    ];
    const t0 = performance.now();
    const topo = hoehlenTopologie(abl.kaefig, 2, augen)!;
    const tTopo = performance.now() - t0;
    expect(topo).not.toBeNull();
    expect(pruefeKaefig(topo.kaefig).fehler).toEqual([]);
    const ergebnisse: string[] = [];
    let mitHoehle = 0;
    const bereich = Array.from(topo.feinAlt, (a) => (a < 0 ? 'hoehle' : 'haut'));
    const altFl = alleFlaechen(abl.unterteilung.stufen[1]!.kaefig);
    for (const oeffnung of [0, 0.5, 1]) {
      const pose = maulPose(abl, oeffnung);
      const t1 = performance.now();
      const xyz = hoehlenLagen(topo, pose.xyz, augen);
      const fein = hoehlenFein(topo, xyz);
      const tLagen = performance.now() - t1;
      const d = selbstDurchdringungen({ punkte: punkteAus(fein), flaechen: topo.feinFlaechen, schaerfe: new Map() }, 1e-4, bereich);
      // Vergleich: das alte Netz ohne Höhle in derselben Pose (geschlossen: verdeckte Überlappung des Überbisses)
      const alt = selbstDurchdringungen({ punkte: punkteAus(pose.fein), flaechen: altFl, schaerfe: new Map() }, 1e-4);
      const h = Object.entries(d.nachBereich).filter(([k]) => k.includes('hoehle'));
      for (const [, n] of h) mitHoehle += n;
      ergebnisse.push(`offen ${oeffnung}: ${d.paare} Paare (ohne Höhle ${alt.paare}; mit Höhle ${JSON.stringify(Object.fromEntries(h))}${h.length ? ` bei ${h.map(([k]) => (d.orteNachBereich[k] ?? []).slice(0, 2).map((o) => o.map((x) => x.toFixed(3)).join(',')).join(' | ')).join('; ')}` : ''}), Lagen ${tLagen.toFixed(1)} ms`);
    }
    console.log(`Rex: Ring (${i}, ${j}), Topologie ${tTopo.toFixed(0)} ms; ${ergebnisse.join('; ')}`);
    expect(mitHoehle).toBe(0);
  }, 120_000);

  it('im Wesen-Bau: Augapfel bekommt die Höhle im gezeichneten Netz (Deskriptoren, Ruhelage, Treffer passen), andere Augen nicht', () => {
    const d: Dokument = { ...vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex'), ausstattung: pruefwesenBauplan('rex') };
    const aus = d.ausstattung!;
    const plan = (augen: Bauplan['augen'], oeffnung = 0): Bauplan => ({ maul: 'vorn', oeffnung, beine: 'aus', schwung: 0, stil: 'fest', earle: true, kaefigLinien: false, ...(augen ? { augen } : {}), ...(aus.maulLinie ? { maulLinie: aus.maulLinie as NonNullable<Bauplan['maulLinie']> } : {}), ...(aus.maulOptionen ? { maulOptionen: aus.maulOptionen } : {}) });
    const basis = { ring: 4, j: 2, groesse: 0.085, punkt: [-0.16, 0.265, 0.14] as [number, number, number] };
    const ohne = wesenBauen(d, plan({ ...basis, art: 'glubsch' }), null).netz;
    const mit = wesenBauen(d, plan({ ...basis, art: 'augapfel' }), null).netz;
    const ecken = (n: typeof mit) => n.positionen.length / 3;
    console.log(`Rex: Ecken ohne Höhle ${ecken(ohne)}, mit ${ecken(mit)}; Augen ${mit.augen.map((a) => a.ecke).join(', ')}`);
    expect(ecken(mit)).toBeGreaterThan(ecken(ohne));
    expect(mit.deskriptoren!.length / 16).toBe(ecken(mit));
    expect(mit.ruhe!.length).toBe(mit.positionen.length);
    expect(mit.normalen.length).toBe(mit.positionen.length);
    // Treffer: Dreiecke der Höhle −1, die übrigen auf alte feine Flächen
    const df = mit.treffer!.dreieckFlaeche;
    expect(df.length).toBe(mit.positionen.length / 9);
    const hoehle = Array.from(df).filter((x) => x < 0).length;
    // zwei Augen: 40 neue Käfigflächen statt 8 alter; je Käfigfläche 4^L feine Vierecke à 2 Dreiecke
    const vierL = (ecken(mit) - ecken(ohne)) / 3 / ((40 - 8) * 2);
    expect(Number.isInteger(vierL)).toBe(true);
    expect(hoehle).toBe(40 * vierL * 2);
    // das Auge sitzt auf einem Ringpunkt (Mitte der Höhle), links der Spiegelpunkt
    const [r, l] = mit.augen;
    expect(l!.pos[2]).toBeCloseTo(-r!.pos[2], 9);
    expect(r!.art).toBe('augapfel');
    // offen: die Höhle folgt dem Schädel, das gezeichnete Netz bleibt durchdringungsfrei mit der Höhle (siehe oben)
    const offen = wesenBauen(d, plan({ ...basis, art: 'augapfel' }, 1), null).netz;
    expect(offen.positionen.length).toBe(mit.positionen.length);
  }, 120_000);
});
