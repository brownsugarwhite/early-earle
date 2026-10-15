// Teil A, Schritt A5: Topologie des Einsatzes. Tor (Plan): `pruefeKaefig` in Ordnung (dazu Euler-Charakteristik 2), Spiegel
// exakt, außen gleich (Kragen-Lemma: feine Grenzlagen außerhalb von M ∪ C ≤ 1e-12 gegen K1), Valenzen wie vorhergesagt (neue
// Punkte 4, genau die vier Rachenecken 3, Randpunkte wie A3, alles andere unverändert). Dazu Zahlen: Güte der Hautvierecke
// (Entwurf 2.5: ≥ 25°, ≤ 4:1 — noch kein Tor, hängt an der Feldform aus A3), Taschentiefe, Mundwinkelversatz, Zeit.
import { describe, expect, it } from 'vitest';
import { alleFlaechen, pruefeKaefig, valenz } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { abtasten3 } from '../../versuch/linie3d';
import { einsatzFaelle, einsatzFall } from '../pruefen/einsatzFall';
import { einsatzTopologie, hautGuete, ROLLE_AUSSEN, ROLLE_RAND, ROLLE_TOT, UNENDLICH } from './topologie';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };
declare const process: { env: Record<string, string | undefined> };

describe('Teil A, A5: Topologie', () => {
  it('geschlossen, Spiegel exakt, außen gleich, Valenzen wie vorhergesagt (54 Fälle)', () => {
    let fehler = '';
    let n = 0;
    let zeit = 0;
    let aussenMax = 0;
    let kragenMax = 0;
    let altSpiegelMax = 0;
    let winkelMin = 180;
    let seitenMax = 0;
    const zeilen: string[] = [];
    const klein = { n: 0, unter20: 0, ueber4: 0 };
    const gross = { n: 0, unter20: 0, ueber4: 0 };
    for (const [art, anfang, form] of einsatzFaelle()) {
      const f = einsatzFall(art, anfang, form);
      if (!f) continue;
      const name = `${art}/${anfang}/${form}`;
      if ('fehler' in f) {
        fehler += `${name}: ${f.fehler}; `;
        continue;
      }
      n++;
      const k1 = f.v.kaefig;
      const t0 = performance.now();
      let t;
      try {
        t = einsatzTopologie(k1, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie: abtasten3(f.maulLinie, 64) as [number, number, number][] });
      } catch (e) {
        fehler += `${name}: ${(e as Error).message}; `;
        continue;
      }
      zeit = Math.max(zeit, performance.now() - t0);
      const a = t.kaefig;
      const xyz = a.xyz;
      // 1. geschlossen, mannigfaltig, orientiert; Euler-Charakteristik der benutzten Punkte
      const pr = pruefeKaefig(a);
      if (!pr.ok) fehler += `${name}: Käfig ${pr.fehler.slice(0, 3).join(', ')}; `;
      const benutzt = new Uint8Array(a.n);
      for (let h = 0; h < a.fVerts.length; h++) benutzt[a.fVerts[h]!] = 1;
      let nV = 0;
      for (let v = 0; v < a.n; v++) nV += benutzt[v]!;
      if (nV - a.nE + a.nF !== 2) fehler += `${name}: χ = ${nV - a.nE + a.nF}; `;
      for (let i = 0; i < xyz.length; i++)
        if (!Number.isFinite(xyz[i]!)) {
          fehler += `${name}: Lage ${Math.floor(i / 3)} nicht endlich; `;
          break;
        }
      // 2. Spiegel: neue Punkte bitgenau (x, y, −z), alte wie K1; Flächen gespiegelt mit umgekehrtem Umlauf vorhanden
      for (let v = 0; v < a.n; v++) {
        if (!benutzt[v]) continue;
        const s = t.spiegel[v]!;
        if (s < 0 || t.spiegel[s] !== v || !benutzt[s]) {
          fehler += `${name}: Punkt ${v} ohne Spiegel; `;
          break;
        }
        const dx = xyz[3 * s]! - xyz[3 * v]!;
        const dy = xyz[3 * s + 1]! - xyz[3 * v + 1]!;
        const dz = xyz[3 * s + 2]! + xyz[3 * v + 2]!;
        if (v >= t.nAlt) {
          if (dx !== 0 || dy !== 0 || dz !== 0) {
            fehler += `${name}: neuer Punkt ${v} nicht bitgenau gespiegelt; `;
            break;
          }
          if (s === v && xyz[3 * v + 2] !== 0) fehler += `${name}: Nahtpunkt ${v} mit z ≠ 0; `;
        } else altSpiegelMax = Math.max(altSpiegelMax, Math.abs(dx), Math.abs(dy), Math.abs(dz));
      }
      const gerichtet = new Set<string>();
      for (let fl = 0; fl < a.nF; fl++) {
        const e = Array.from(a.fVerts.subarray(a.fStart[fl]!, a.fStart[fl + 1]!));
        gerichtet.add(e.join(','));
      }
      const drehungen = (e: number[]) => e.map((_, i) => [...e.slice(i), ...e.slice(0, i)].join(','));
      let spiegelFehlt = 0;
      for (let fl = 0; fl < a.nF; fl++) {
        const e = Array.from(a.fVerts.subarray(a.fStart[fl]!, a.fStart[fl + 1]!));
        const g = e.map((v) => t.spiegel[v]!).reverse();
        if (!drehungen(g).some((s) => gerichtet.has(s))) spiegelFehlt++;
      }
      if (spiegelFehlt) fehler += `${name}: ${spiegelFehlt} Flächen ohne Spiegelbild; `;
      // 3. außen gleich: feine Grenzlagen der Blöcke außerhalb von M ∪ C (Stufe 2) gegen K1
      const uA = unterteilung(a, 2);
      const feinA = anwenden3(uA.grenze, a.xyz);
      const ffA = alleFlaechen(uA.stufen[uA.stufen.length - 1]!.kaefig);
      const ff1 = f.feinFlaechen;
      const block = ff1.length / k1.nF;
      if (ffA.length !== block * a.nF) fehler += `${name}: Blockgröße passt nicht; `;
      const kragen = new Uint8Array(k1.nF);
      for (const fl of f.feld.kragen) kragen[fl] = 1;
      for (let i = 0; i < t.alteFlaeche.length; i++) {
        const fl = t.alteFlaeche[i]!;
        let max = 0;
        for (let q = 0; q < block; q++) {
          const ea = ffA[i * block + q]!;
          const e1 = ff1[fl * block + q]!;
          for (let c = 0; c < 4; c++)
            for (let d = 0; d < 3; d++) max = Math.max(max, Math.abs(feinA[3 * ea[c]! + d]! - f.feinK1[3 * e1[c]! + d]!));
        }
        if (kragen[fl]) kragenMax = Math.max(kragenMax, max);
        else aussenMax = Math.max(aussenMax, max);
      }
      // 4. Valenzen: alte Punkte außen unverändert, Randpunkte wie A3 vorhergesagt, neue 4 außer genau den vier Rachenecken
      const randIndex = new Map<number, number>();
      f.feld.rand.forEach((v, i) => randIndex.set(v, i));
      const rachenEcken = new Set([t.rachen[0]![0]!, t.rachen[t.m]![0]!, t.rachen[t.m]![t.m]!, t.rachen[0]![t.m]!]);
      let valFehler = '';
      for (let v = 0; v < a.n; v++) {
        if (!benutzt[v]) {
          if (t.rolle[v] !== ROLLE_TOT) valFehler ||= `unbenutzter Punkt ${v} nicht tot`;
          continue;
        }
        const val = valenz(a, v);
        if (t.rolle[v] === ROLLE_AUSSEN) {
          if (val !== valenz(k1, v)) valFehler ||= `Punkt ${v} außen: ${valenz(k1, v)} → ${val}`;
        } else if (t.rolle[v] === ROLLE_RAND) {
          const soll = f.feld.valenz[randIndex.get(v)!]!;
          if (val !== soll) valFehler ||= `Randpunkt ${v}: ${val} statt ${soll}`;
        } else if (val !== (rachenEcken.has(v) ? 3 : 4)) valFehler ||= `neuer Punkt ${v} (Rolle ${t.rolle[v]}): Valenz ${val}`;
      }
      if (valFehler) fehler += `${name}: ${valFehler}; `;
      // Schärfen: Lippenschleife unendlich, Mundwinkel Ecken
      let lippeScharf = 0;
      for (let i = 0; i < t.lippe.length; i++) {
        const p = t.lippe[i]!;
        const q = t.lippe[(i + 1) % t.lippe.length]!;
        for (let e = 0; e < a.nE; e++) if ((a.eA[e] === p && a.eB[e] === q) || (a.eA[e] === q && a.eB[e] === p)) lippeScharf += a.eSchaerfe[e]! >= UNENDLICH ? 1 : 0;
      }
      if (lippeScharf !== 4 * t.m) fehler += `${name}: ${lippeScharf} von ${4 * t.m} Lippenkanten scharf; `;
      // Güte der Hautvierecke (rechte Hälfte, Startlagen auf A0; Winkel am Mundwinkel ausgenommen), getrennt nach Feldgröße
      const g = hautGuete(t);
      const wMin = g.winkelMin;
      const sMax = g.seitenMax;
      const klasse = t.m <= 10 ? klein : gross;
      klasse.n++;
      klasse.unter20 += g.winkelMin < 20 ? 1 : 0;
      klasse.ueber4 += g.seitenMax > 4 ? 1 : 0;
      winkelMin = Math.min(winkelMin, wMin);
      seitenMax = Math.max(seitenMax, sMax);
      zeilen.push(`${name}: m ${t.m}, ${a.n - t.nAlt} neu, ${t.tot.length} tot, Haut min ${wMin.toFixed(0)}° / ${sMax.toFixed(1)}:1, Tasche ${(t.taschenTiefe * 461).toFixed(0)} px, V-Versatz ${t.winkelVersatz.toFixed(3)}${t.umgedreht ? ', umgedreht' : ''}${t.verloreneFalten ? `, ${t.verloreneFalten} Falten in M` : ''}`);
    }
    if (process.env.ZEILEN) for (const z of zeilen) console.log(z);
    console.log(`${n} Fälle; außen ${aussenMax.toExponential(1)} (Kragen ${kragenMax.toExponential(1)}), alte Spiegel ${altSpiegelMax.toExponential(1)}; Hautvierecke min ${winkelMin.toFixed(1)}°, max ${seitenMax.toFixed(1)}:1 (m ≤ 10: ${klein.unter20} von ${klein.n} Fällen < 20°, ${klein.ueber4} > 4:1; m > 10: ${gross.unter20} von ${gross.n} < 20°, ${gross.ueber4} > 4:1); längster Bau ${zeit.toFixed(0)} ms${fehler ? `; Fehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(40);
    expect(fehler).toBe('');
    expect(aussenMax).toBeLessThanOrEqual(1e-12);
  }, 600_000);
});
