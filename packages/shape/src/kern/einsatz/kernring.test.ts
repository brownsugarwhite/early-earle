// Teil A, E1 (Plan 21.10.): Gitter „Kernring“ — der Mundwinkel als regulärer Gitterpunkt am Ende des Schnitts. Geprüft wird
// (1) die Lippe als Falte: Die Grenzkurve der Lippenschleife im Käfig (c Faltenpunkt ohne Punktschärfe) ist der B-Spline aus
// `lippenPunkt(…, 'falte')`, ihre Spitze liegt auf dem gezeichneten Mundwinkel; (2) die Topologie an allen 54 Fällen: geschlossen,
// Spiegel exakt, außen gleich, Valenzen wie vorhergesagt (neue Punkte 4, die beiden Kernecken je Hälfte 3, c mit vier Haut- und
// zwei Taschenflächen 6, die Rachenecken 3); (3) das Tor (Knick am Mundwinkel ≤ Knick von A0 + 2°) — noch nicht erreicht
// (Planseite „Stand E1“, Register „Befunde aus E1“), deshalb `it.fails`; die Zahlen je Fall werden ausgegeben.
import { describe, expect, it } from 'vitest';
import { alleFlaechen, kanteZwischen, pruefeKaefig, valenz } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { einsatzFaelle, einsatzFall } from '../pruefen/einsatzFall';
import { lippeAnpassen, lippenPunkt } from './lippe';
import { a0Netz, einsatzLoesen, einsatzMessen } from './loesen';
import { einsatzTopologie, ROLLE_AUSSEN, ROLLE_RAND, ROLLE_TOT } from './topologie';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil A, E1: Kernring', () => {
  it('Lippe als Falte: Grenzkurve im Käfig = B-Spline mit Phantompunkt U_{m−1}, Spitze auf dem Mundwinkel', () => {
    const f = einsatzFall('rex', 'mittel', 's');
    if (!f || 'fehler' in f) throw new Error('Fall fehlt');
    const ziel = f.lippenZiel();
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie: ziel, gitter: 'kernring' });
    const fit = lippeAnpassen(ziel, t.m, t.lippenAnteile, { ende: 'falte' });
    // Spitze auf dem Linienende, c eine halbe Spanne dahinter
    const e = ziel[ziel.length - 1]!;
    const spitze = lippenPunkt(fit.punkte, t.m, 'falte');
    expect(Math.hypot(spitze[0] - e[0], spitze[1] - e[1], spitze[2] - e[2])).toBeLessThan(1e-12);
    const c = fit.punkte[t.m]!;
    const u = fit.punkte[t.m - 1]!;
    for (let d = 0; d < 3; d++) expect(Math.abs(c[d]! - (1.5 * e[d]! - 0.5 * u[d]!))).toBeLessThan(1e-12);
    // Grenzlagen der Lippenpunkte und der Kantenpunkte der Stufe 1 gegen die geschlossene Formel
    const xyz = Float64Array.from(t.kaefig.xyz);
    for (let k = 0; k <= 2 * t.m; k++) {
      const p = fit.punkte[k <= t.m ? k : 2 * t.m - k]!;
      const i = t.haut[0]![k]!;
      xyz.set([p[0], p[1], k === 0 || k === 2 * t.m ? 0 : p[2]], 3 * i);
      if (t.spiegel[i] !== i) xyz.set([p[0], p[1], -p[2]], 3 * t.spiegel[i]!);
    }
    const k = { ...t.kaefig, xyz };
    const unt = unterteilung(k, 2);
    const fein = anwenden3(unt.grenze, xyz);
    let max = 0;
    for (let i = 0; i <= 2 * t.m; i++) {
      const s = i <= t.m ? i : 2 * t.m - i;
      const soll = lippenPunkt(fit.punkte, s, 'falte');
      const v = t.haut[0]![i]!;
      for (let d = 0; d < 3; d++) max = Math.max(max, Math.abs(fein[3 * v + d]! - soll[d]!));
      if (i < 2 * t.m) {
        const ke = kanteZwischen(k, v, t.haut[0]![i + 1]!);
        const sm = i < t.m ? i + 0.5 : 2 * t.m - i - 0.5;
        const sollM = lippenPunkt(fit.punkte, sm, 'falte');
        for (let d = 0; d < 3; d++) max = Math.max(max, Math.abs(fein[3 * (k.n + ke) + d]! - sollM[d]!));
      }
    }
    console.log(`Rex mittel/S, Kernring m ${t.m}: Unterteilung gegen B-Spline (Falte) ${max.toExponential(1)}, Lippe ${Math.max(fit.fehler.seite, fit.fehler.front, fit.fehler.top, fit.fehler.raum).toFixed(2)} px`);
    expect(max).toBeLessThan(1e-12);
  });

  it('Topologie: geschlossen, Spiegel exakt, außen gleich, Valenzen wie vorhergesagt (54 Fälle)', () => {
    let fehler = '';
    let n = 0;
    let aussenMax = 0;
    let umgeklappt = 0;
    for (const [art, anfang, form] of einsatzFaelle()) {
      const f = einsatzFall(art, anfang, form);
      if (!f) continue;
      const name = `${art}/${anfang}/${form}`;
      if ('fehler' in f) {
        fehler += `${name}: ${f.fehler}; `;
        continue;
      }
      let t;
      try {
        t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie: f.lippenZiel(), gitter: 'kernring' });
      } catch (e) {
        fehler += `${name}: ${(e as Error).message}; `;
        continue;
      }
      n++;
      umgeklappt += t.umgeklappt;
      const a = t.kaefig;
      const xyz = a.xyz;
      const pr = pruefeKaefig(a);
      if (!pr.ok) fehler += `${name}: Käfig ${pr.fehler.slice(0, 3).join(', ')}; `;
      const benutzt = new Uint8Array(a.n);
      for (let h = 0; h < a.fVerts.length; h++) benutzt[a.fVerts[h]!] = 1;
      let nV = 0;
      for (let v = 0; v < a.n; v++) nV += benutzt[v]!;
      if (nV - a.nE + a.nF !== 2) fehler += `${name}: χ = ${nV - a.nE + a.nF}; `;
      for (let v = t.nAlt; v < a.n; v++) {
        const s = t.spiegel[v]!;
        if (s < 0 || xyz[3 * s] !== xyz[3 * v] || xyz[3 * s + 1] !== xyz[3 * v + 1] || xyz[3 * s + 2] !== -xyz[3 * v + 2]!) {
          fehler += `${name}: neuer Punkt ${v} nicht bitgenau gespiegelt; `;
          break;
        }
      }
      // außen gleich (Stufe 2, Blöcke außerhalb von M ∪ C)
      const uA = unterteilung(a, 2);
      const feinA = anwenden3(uA.grenze, a.xyz);
      const ffA = alleFlaechen(uA.stufen[uA.stufen.length - 1]!.kaefig);
      const block = f.feinFlaechen.length / f.v.kaefig.nF;
      const kragen = new Set(f.feld.kragen);
      for (let i = 0; i < t.alteFlaeche.length; i++) {
        const fl = t.alteFlaeche[i]!;
        if (kragen.has(fl)) continue;
        for (let q = 0; q < block; q++) {
          const ea = ffA[i * block + q]!;
          const e1 = f.feinFlaechen[fl * block + q]!;
          for (let c = 0; c < 4; c++) for (let d = 0; d < 3; d++) aussenMax = Math.max(aussenMax, Math.abs(feinA[3 * ea[c]! + d]! - f.feinK1[3 * e1[c]! + d]!));
        }
      }
      // Valenzen
      const randIndex = new Map<number, number>();
      f.feld.rand.forEach((v, i) => randIndex.set(v, i));
      const sp = (v: number) => t.spiegel[v]!;
      const H1 = t.haut[1]!;
      const drei = new Set([t.rachen[0]![0]!, t.rachen[t.m]![0]!, t.rachen[t.m]![t.m]!, t.rachen[0]![t.m]!, H1[t.M - 1]!, H1[t.M + 1]!, sp(H1[t.M - 1]!), sp(H1[t.M + 1]!)]);
      const sechs = new Set([t.haut[0]![t.m]!, sp(t.haut[0]![t.m]!)]);
      let valFehler = '';
      for (let v = 0; v < a.n; v++) {
        if (!benutzt[v]) {
          if (t.rolle[v] !== ROLLE_TOT) valFehler ||= `unbenutzter Punkt ${v} nicht tot`;
          continue;
        }
        const val = valenz(a, v);
        if (t.rolle[v] === ROLLE_AUSSEN) {
          if (val !== valenz(f.v.kaefig, v)) valFehler ||= `Punkt ${v} außen: ${valenz(f.v.kaefig, v)} → ${val}`;
        } else if (t.rolle[v] === ROLLE_RAND) {
          const soll = f.feld.valenz[randIndex.get(v)!]!;
          if (val !== soll) valFehler ||= `Randpunkt ${v}: ${val} statt ${soll}`;
        } else if (val !== (drei.has(v) ? 3 : sechs.has(v) ? 6 : 4)) valFehler ||= `neuer Punkt ${v} (Rolle ${t.rolle[v]}): Valenz ${val}`;
      }
      if (valFehler) fehler += `${name}: ${valFehler}; `;
    }
    console.log(`Kernring: ${n} Fälle, außen ${aussenMax.toExponential(1)}, umgeklappte Zellen gesamt ${umgeklappt}${fehler ? `; Fehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(40);
    expect(fehler).toBe('');
    expect(aussenMax).toBeLessThanOrEqual(1e-12);
  }, 600_000);

  // Tor E1 (Plan 21.10.): Knick am Mundwinkel ≤ Knick von A0 + 2° in allen ausgeglichenen Fällen (Linie auf der Haut, m ≤ 10).
  // Stand 21.10.: verfehlt (Planseite „Stand E1“, Register „Befunde aus E1“) — fällt dieser Test nicht mehr, ist das Tor erreicht.
  it.fails('Tor: Knick am Mundwinkel ≤ A0 + 2°, außen bitgleich, Spiegel bitgenau (ausgeglichene Fälle, m ≤ 10)', () => {
    const zeilen: string[] = [];
    let verfehlt = 0;
    let n = 0;
    // Fehler, die nicht das Tor betreffen, lassen den Test bestehen (it.fails meldet ihn dann als Fehler)
    let fremd = '';
    for (const [art, anfang, form] of einsatzFaelle()) {
      const f = einsatzFall(art, anfang, form);
      if (!f || 'fehler' in f || f.hautAbstand > 1) continue;
      const linie = f.lippenZiel();
      const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter: 'kernring' });
      if (t.m > 10) continue;
      n++;
      const fit = lippeAnpassen(linie, t.m, t.lippenAnteile, { ende: 'falte' });
      const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 2), fit.punkte);
      const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, fit.punkte);
      if (ms.aussen !== 0) fremd += `${f.name}: außen ${ms.aussen}; `;
      for (let v = t.nAlt; v < g.kaefig.n; v++) {
        const s = t.spiegel[v]!;
        if (s >= 0 && s !== v && (g.xyz[3 * s] !== g.xyz[3 * v] || g.xyz[3 * s + 2] !== -g.xyz[3 * v + 2]!)) {
          fremd += `${f.name}: Punkt ${v} nicht gespiegelt; `;
          break;
        }
      }
      const ok = ms.falten <= ms.faltenA0 + 2;
      if (!ok) verfehlt++;
      zeilen.push(`${f.name} m ${t.m} J ${t.J}: Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°)${ok ? '' : ' ✗'}, Haut ${ms.hautMax.toFixed(2)} px, Normale ${ms.normaleMax.toFixed(1)}°`);
    }
    console.log(`Kernring-Tor: ${n - verfehlt} von ${n} erfüllt\n${zeilen.join('\n')}${fremd ? `\nAndere Fehler: ${fremd}` : ''}`);
    if (fremd || n <= 5) return;
    expect(verfehlt).toBe(0);
  }, 900_000);
});
