// Teil A, E1 (Plan 21.10.): Gitter „Kernring“ — der Mundwinkel als regulärer Gitterpunkt am Ende des Schnitts. Seit dem
// 21.10. abends auf dem Standard des Kernrings (Feld auf K2 begradigt bis 1,5 Radien, Schlitz genau auf der Linie, Reihenzahl
// konform 10 … 16, Fächer um c als Halbkreis, Nahtspeichen auf den Kartenlinien, Ausgleich außen). Geprüft wird (1) die Lippe
// als Falte: Die Grenzkurve der Lippenschleife im Käfig (c Faltenpunkt ohne Punktschärfe) ist der B-Spline aus
// `lippenPunkt(…, 'falte')`, ihre Spitze liegt auf dem gezeichneten Mundwinkel; (2) die Topologie an allen 54 Fällen:
// geschlossen, Spiegel exakt, außen gleich, Valenzen wie vorhergesagt (neue Punkte 4, die beiden Kernecken je Hälfte 3, c mit
// vier Haut- und zwei Taschenflächen 6, die Rachenecken 3); (3) schnelle Wächter: genaue Haut an drei Fällen (≤ 0,25 px,
// faltenfrei, außen bitgleich, Spiegel bitgenau, Lippe ≤ 1 px), Mundwinkel an drei J-Linien (≤ A0 + 2°), keine umgeklappte
// Zelle an Robbe hoch und die Spitzen von A0 (Robbe mittel, Rex mittel). Seit E2 auf A0 wie im Editor. Die ganze Reihe
// (Haut-Tor und Mundwinkel-Tor) läuft im Extrem-Lauf (`kernring.extrem.ts`).
import { describe, expect, it } from 'vitest';
import { alleFlaechen, kanteZwischen, pruefeKaefig, valenz } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { einsatzAblauf, einsatzFaelle, einsatzFall } from '../pruefen/einsatzFall';
import { lippeAnpassen, lippenPunkt } from './lippe';
import { einsatzTopologie, ROLLE_AUSSEN, ROLLE_RAND, ROLLE_TOT } from './topologie';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil A, E1: Kernring', () => {
  // Seit E2 beginnt die Linie von Rex mittel S an der Schnauzenspitze (A0 spitz): die Lippe hat dort eine Ecke (Punktschärfe an U₀
  // und D₀, Phantompunkt 2U₀ − U₁) — der Test prüft beide Regeln zugleich
  it('Lippe als Falte: Grenzkurve im Käfig = B-Spline mit Phantompunkt U_{m−1}, Spitze auf dem Mundwinkel, Ecke am Anfang', () => {
    const f = einsatzFall('rex', 'mittel', 's');
    if (!f || 'fehler' in f) throw new Error('Fall fehlt');
    const ziel = f.lippenZiel();
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie: ziel, gitter: 'kernring', stufe: f.stufe });
    const fit = lippeAnpassen(ziel, t.m, t.lippenAnteile, { ende: 'falte', anfang: t.lippenAnfang });
    // Spitze auf dem Linienende, c eine halbe Spanne dahinter
    const e = ziel[ziel.length - 1]!;
    const spitze = lippenPunkt(fit.punkte, t.m, 'falte', t.lippenAnfang);
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
      const soll = lippenPunkt(fit.punkte, s, 'falte', t.lippenAnfang);
      const v = t.haut[0]![i]!;
      for (let d = 0; d < 3; d++) max = Math.max(max, Math.abs(fein[3 * v + d]! - soll[d]!));
      if (i < 2 * t.m) {
        const ke = kanteZwischen(k, v, t.haut[0]![i + 1]!);
        const sm = i < t.m ? i + 0.5 : 2 * t.m - i - 0.5;
        const sollM = lippenPunkt(fit.punkte, sm, 'falte', t.lippenAnfang);
        for (let d = 0; d < 3; d++) max = Math.max(max, Math.abs(fein[3 * (k.n + ke) + d]! - sollM[d]!));
      }
    }
    console.log(`Rex mittel/S, Kernring m ${t.m}, Anfang ${t.lippenAnfang}: Unterteilung gegen B-Spline (Falte) ${max.toExponential(1)}, Lippe ${Math.max(fit.fehler.seite, fit.fehler.front, fit.fehler.top, fit.fehler.raum).toFixed(2)} px`);
    expect(max).toBeLessThan(1e-12);
  });

  it('Topologie: geschlossen, Spiegel exakt, außen gleich, Valenzen wie vorhergesagt (54 Fälle, K2)', () => {
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
        t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie: f.lippenZiel(), gitter: 'kernring', stufe: f.stufe });
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
      // außen gleich (Blöcke außerhalb von M ∪ C auf derselben Stufe wie `feinFlaechen`)
      const uA = unterteilung(a, 3 - f.stufe);
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
    console.log(`Kernring K2: ${n} Fälle, außen ${aussenMax.toExponential(1)}, umgeklappte Zellen gesamt ${umgeklappt}${fehler ? `; Fehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(40);
    expect(fehler).toBe('');
    expect(aussenMax).toBeLessThanOrEqual(1e-12);
  }, 600_000);

  // Wächter der genauen Haut (Plan 21.10.: Standard des Kernrings) an drei Fällen — die ganze Reihe im Extrem-Lauf
  it('genaue Haut: ≤ 0,25 px gegen A0, faltenfrei, außen bitgleich, Spiegel bitgenau, Lippe ≤ 1 px (Wächter, 3 Fälle)', () => {
    const zeilen: string[] = [];
    let fehler = '';
    for (const name of ['kugel/mittel/gerade', 'ei/mittel/s', 'langhals/hoch/gerade']) {
      const [art, anfang, form] = name.split('/') as Parameters<typeof einsatzFall>;
      const f = einsatzFall(art, anfang, form);
      if (!f || 'fehler' in f) {
        fehler += `${name}: Fall fehlt; `;
        continue;
      }
      const { t, lippe, g, ms } = einsatzAblauf(f);
      const lf = Math.max(lippe.fehler.seite, lippe.fehler.front, lippe.fehler.top, lippe.fehler.raum);
      let spiegel = 0;
      for (let v = t.nAlt; v < g.kaefig.n; v++) {
        const s = t.spiegel[v]!;
        if (s >= 0 && s !== v && (g.xyz[3 * s] !== g.xyz[3 * v] || g.xyz[3 * s + 1] !== g.xyz[3 * v + 1] || g.xyz[3 * s + 2] !== -g.xyz[3 * v + 2]!)) spiegel++;
      }
      zeilen.push(`${name} m ${t.m} J ${t.J}: Haut ${ms.hautMax.toFixed(2)} px (99 % ${ms.hautP99.toFixed(2)}), Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°), Ecke ${ms.faltenEcke.toFixed(1)}° (A0 ${ms.faltenEckeA0.toFixed(1)}°), umgeklappt ${t.umgeklappt}, Lippe ${lf.toFixed(2)} px`);
      if (ms.hautMax > 0.25) fehler += `${name}: Haut ${ms.hautMax.toFixed(3)} px; `;
      if (t.umgeklappt) fehler += `${name}: ${t.umgeklappt} umgeklappt; `;
      if (ms.falten > 30) fehler += `${name}: Knick ${ms.falten.toFixed(0)}°; `;
      if (ms.aussen !== 0) fehler += `${name}: außen ${ms.aussen}; `;
      if (spiegel) fehler += `${name}: ${spiegel} Punkte nicht gespiegelt; `;
      if (lf > 1) fehler += `${name}: Lippe ${lf.toFixed(2)} px; `;
    }
    console.log(zeilen.join('\n'));
    expect(fehler).toBe('');
  }, 300_000);

  // Wächter Mundwinkel an J-Linien (dritte Sitzung E1): Ohne den Fächer als Halbkreis drehte die Karte den Fächer um c, sobald
  // Linie und Feldrand um c nicht symmetrisch liegen (vorher Kugel mittel J 4,4°, Ei tief J 4,8°, Langhals hoch J 8,0° gegen A0
  // 1,4 / 1,4 / 6,0°)
  it('Mundwinkel an J-Linien: Knick um die Spitze ≤ A0 + 2° (Wächter, 3 Fälle)', () => {
    const zeilen: string[] = [];
    let fehler = '';
    for (const name of ['kugel/mittel/j', 'ei/tief/j', 'langhals/hoch/j']) {
      const [art, anfang, form] = name.split('/') as Parameters<typeof einsatzFall>;
      const f = einsatzFall(art, anfang, form);
      if (!f || 'fehler' in f) {
        fehler += `${name}: Fall fehlt; `;
        continue;
      }
      const { t, ms } = einsatzAblauf(f);
      zeilen.push(`${name} m ${t.m} J ${t.J}: Ecke ${ms.faltenEcke.toFixed(2)}° (A0 ${ms.faltenEckeA0.toFixed(2)}°), Knick ${ms.falten.toFixed(1)}°, Haut ${ms.hautMax.toFixed(2)} px`);
      if (ms.faltenEcke > ms.faltenEckeA0 + 2) fehler += `${name}: Ecke ${ms.faltenEcke.toFixed(2)}° > A0 + 2° (${(ms.faltenEckeA0 + 2).toFixed(2)}°); `;
    }
    console.log(zeilen.join('\n'));
    expect(fehler).toBe('');
  }, 300_000);

  // Wächter Faltenfreiheit (dritte Sitzung E1): Nahtspeichen nach Bogenlänge passten nicht zu Reihe J_i auf ihrer Kartenlinie —
  // wo die Karte längs der Naht ungleich dehnt, klappten Zellen um (Robbe hoch gerade: 5 mit dem ganz begradigten Feld, 7 mit
  // dem gekappten); auf den Kartenlinien bleibt jede Stufe ein Rechteck
  it('keine umgeklappte Zelle an Robbe hoch (Wächter der Nahtspeichen)', () => {
    const f = einsatzFall('robbe', 'hoch', 'gerade');
    if (!f || 'fehler' in f) throw new Error('Fall fehlt');
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie: f.lippenZiel(), gitter: 'kernring', stufe: f.stufe });
    console.log(`robbe/hoch/gerade m ${t.m} J ${t.J}: umgeklappt ${t.umgeklappt}`);
    expect(t.umgeklappt).toBe(0);
  }, 300_000);

  // Wächter Spitzen von A0 (E2): Robbe mittel gerade — eine Spitze auf der Naht im Feld wird ein Gitterpunkt mit ihrer Schärfe
  // (ohne das glättete der Einsatz sie weg: Haut 0,58 px); Rex mittel gerade — die Linie beginnt an der Schnauzenspitze, die
  // Lippe hat dort eine Ecke (ohne das: Lippe 1,5 px). Haut ≤ 0,25 px, Knick ≤ A0 + 2° (ohne die Umgebung der Spitzen), Lippe ≤ 1 px.
  it('Spitzen von A0: Robbe mittel (Naht) und Rex mittel gerade (Linienanfang) — Haut, Knick, Lippe (Wächter)', () => {
    const zeilen: string[] = [];
    let fehler = '';
    for (const name of ['robbe/mittel/gerade', 'rex/mittel/gerade']) {
      const [art, anfang, form] = name.split('/') as Parameters<typeof einsatzFall>;
      const f = einsatzFall(art, anfang, form);
      if (!f || 'fehler' in f) {
        fehler += `${name}: Fall fehlt; `;
        continue;
      }
      const { t, lippe, ms } = einsatzAblauf(f);
      const lf = Math.max(lippe.fehler.seite, lippe.fehler.front, lippe.fehler.top, lippe.fehler.raum);
      zeilen.push(`${name} m ${t.m} J ${t.J}: Haut ${ms.hautMax.toFixed(2)} px, Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°), Lippe ${lf.toFixed(2)} px, Anfang ${t.lippenAnfang}`);
      if (ms.hautMax > 0.25) fehler += `${name}: Haut ${ms.hautMax.toFixed(3)} px; `;
      if (ms.falten > ms.faltenA0 + 2) fehler += `${name}: Knick ${ms.falten.toFixed(1)}° (A0 ${ms.faltenA0.toFixed(1)}°); `;
      if (lf > 1) fehler += `${name}: Lippe ${lf.toFixed(2)} px; `;
    }
    console.log(zeilen.join('\n'));
    expect(fehler).toBe('');
  }, 300_000);
});
