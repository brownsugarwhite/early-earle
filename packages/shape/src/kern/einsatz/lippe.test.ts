// Teil A, Schritt A6: Lippenkanten exakt auf den Linien. (1) Die Grenzkurve der Lippenschleife im Käfig ist der B-Spline aus
// `lippenPunkt` (Unterteilung des Einsatz-Käfigs gegen die geschlossene Formel, ≤ 1e-12). (2) Tor: beidseitiger
// Hausdorff-Abstand ≤ 1 px in Seite, Front, Top und 3D gegen die auf A0 gelegte Linie (die Linien der Zufallsreihe liegen bis
// 13 px neben der Haut; im Editor liegen sie nach Teil H auf ihr), Anfang und Mundwinkel ≤ 0,1 px, für alle Linienformen ab
// m = 10 und in der Einsatz-Reihe (m aus A3, Lippenanteile aus A5). Ziel des Plans 0,3 px (als Zahl ausgegeben).
import { describe, expect, it } from 'vitest';
import { kanteZwischen } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { abtasten3 } from '../../versuch/linie3d';
import { ableiten } from '../ableiten';
import { hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from '../pruefen/koerper';
import { type Anfang, FORMEN, maulBezug, maulLinien } from '../pruefen/linien';
import { einsatzFaelle, einsatzFall, linieAufHaut } from '../pruefen/einsatzFall';
import { feinesNetz } from '../pruefstand';
import { ankerVon, feinNetz } from './flaeche';
import { zufall } from '../pruefen/zufall';
import { kruemmungsAnteile, lippeAnpassen, lippenPunkt, noetigesM } from './lippe';
import { einsatzTopologie } from './topologie';

declare const console: { log: (...a: unknown[]) => void };
declare const process: { env: Record<string, string | undefined> };

type V3 = [number, number, number];

describe('Teil A, A6: Lippe exakt auf der Linie', () => {
  it('Grenzkurve der Lippenschleife im Käfig = B-Spline mit Spiegel an der Naht und Phantompunkt am Mundwinkel', () => {
    const f = einsatzFall('rex', 'mittel', 's');
    if (!f || 'fehler' in f) throw new Error('Fall fehlt');
    const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel);
    const ziel = f.lippenZiel();
    const fit = lippeAnpassen(ziel, t.m, t.lippenAnteile);
    // Lippenpunkte setzen (beide Kiefer, beide Hälften)
    const xyz = Float64Array.from(t.kaefig.xyz);
    const setze = (i: number, p: V3) => xyz.set(p, 3 * i);
    for (let k = 0; k <= 2 * t.m; k++) {
      const p = fit.punkte[k <= t.m ? k : 2 * t.m - k]!;
      setze(t.haut[0]![k]!, p);
      if (t.spiegel[t.haut[0]![k]!] !== t.haut[0]![k]!) setze(t.spiegel[t.haut[0]![k]!]!, [p[0], p[1], -p[2]]);
    }
    const k = { ...t.kaefig, xyz };
    const u = unterteilung(k, 2);
    const fein = anwenden3(u.grenze, xyz);
    // Käfigpunkt U_k behält seinen Index (Grenzlage = C(k)), der Kantenpunkt der Stufe 1 auf (U_k, U_{k+1}) liegt bei C(k + ½)
    let max = 0;
    for (let i = 0; i <= 2 * t.m; i++) {
      const s = i <= t.m ? i : 2 * t.m - i;
      const soll = lippenPunkt(fit.punkte, s);
      const v = t.haut[0]![i]!;
      max = Math.max(max, Math.abs(fein[3 * v]! - soll[0]), Math.abs(fein[3 * v + 1]! - soll[1]), Math.abs(fein[3 * v + 2]! - soll[2]));
      if (i < 2 * t.m) {
        const e = kanteZwischen(k, v, t.haut[0]![i + 1]!);
        const sm = i < t.m ? i + 0.5 : 2 * t.m - i - 0.5;
        const sollM = lippenPunkt(fit.punkte, sm);
        const ip = k.n + e;
        max = Math.max(max, Math.abs(fein[3 * ip]! - sollM[0]), Math.abs(fein[3 * ip + 1]! - sollM[1]), Math.abs(fein[3 * ip + 2]! - sollM[2]));
      }
    }
    console.log(`Rex mittel/S, m ${t.m}: Unterteilung gegen B-Spline ${max.toExponential(1)}`);
    expect(max).toBeLessThanOrEqual(1e-12);
  });

  it('Tor ≤ 1 px in jedem Blatt ab m = 10 (alle Linienformen, krümmungsgewichtet); nötiges m je Linie; Einsatz-Reihe', () => {
    let fehler = '';
    let n = 0;
    let ungueltig = 0;
    const stat = new Map<number, { max: number; ueber03: number; n: number }>();
    const noetig1: number[] = [];
    const noetig03: number[] = [];
    let ecken = 0;
    for (const art of ['kugel', 'ei', 'birne', 'rex', 'langhals', 'robbe'] as KoerperArt[]) {
      const dok = koerperDokument(art, zufall(1));
      const abl = ableiten(dok, { stufen: 3 });
      const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals' | 'robbe');
      for (const anfang of ['hoch', 'mittel', 'tief'] as Anfang[])
        for (const form of FORMEN) {
          const l = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
          if ('fehler' in l) continue;
          const ziel = abtasten3(linieAufHaut(abl, l.oben), 64) as V3[];
          const netz = feinNetz(abl.fein, feinesNetz(abl).flaechen);
          let neben = 0;
          for (const p of ziel) neben = Math.max(neben, ankerVon(netz, p).abstand * 461);
          if (neben > 1) {
            ungueltig++;
            continue;
          }
          n++;
          for (const m of [10, 12, 16]) {
            const fit = lippeAnpassen(ziel, m, kruemmungsAnteile(ziel, m));
            const e = fit.fehler;
            const w = Math.max(e.seite, e.front, e.top, e.raum);
            const st = stat.get(m) ?? { max: 0, ueber03: 0, n: 0 };
            st.max = Math.max(st.max, w);
            st.ueber03 += w > 0.3 ? 1 : 0;
            st.n++;
            stat.set(m, st);
            ecken = Math.max(ecken, e.anfang, e.winkel);
            if (w > 1) fehler += `${art}/${anfang}/${form} m ${m}: Seite ${e.seite.toFixed(2)}, Front ${e.front.toFixed(2)}, Top ${e.top.toFixed(2)}, 3D ${e.raum.toFixed(2)} px; `;
          }
          noetig1.push(noetigesM(ziel, 1));
          noetig03.push(noetigesM(ziel, 0.3));
        }
    }
    // Einsatz-Reihe: m aus dem Feld (A3), Lippenstellen aus A5 (konform + Krümmung); Tor nur ab m = 10
    let reihe = '';
    let reiheMax = 0;
    let reiheKlein = 0;
    let ungueltigReihe = 0;
    for (const [art, anfang, form] of einsatzFaelle()) {
      const f = einsatzFall(art, anfang, form);
      if (!f || 'fehler' in f) continue;
      if (f.hautAbstand > 1) {
        ungueltigReihe++;
        continue;
      }
      const linie = f.lippenZiel();
      const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie });
      const e = lippeAnpassen(linie, t.m, t.lippenAnteile).fehler;
      const w = Math.max(e.seite, e.front, e.top, e.raum);
      if (t.m >= 10) {
        reiheMax = Math.max(reiheMax, w);
        if (w > 1) fehler += `${f.name} (Einsatz, m ${t.m}): ${w.toFixed(2)} px; `;
      } else if (w > 1) {
        reiheKlein++;
        reihe += `${f.name} m ${t.m} ${w.toFixed(2)} px; `;
      }
      if (process.env.ZEILEN) console.log(`${f.name} m ${t.m}: ${w.toFixed(2)} px`);
    }
    const sortiert = (a: number[]) => [...a].sort((x, y) => x - y);
    const q = (a: number[], p: number) => sortiert(a)[Math.floor(p * (a.length - 1))]!;
    console.log(`${n} Linien (7 Formen, auf der Haut; ${ungueltig} entlang der Silhouette nicht auf die Haut zu legen); ${[...stat].map(([m, st]) => `m ${m}: max ${st.max.toFixed(2)} px, ${st.ueber03} über 0,3 px`).join(' · ')}; Anfang/Mundwinkel ≤ ${ecken.toExponential(1)} px`);
    console.log(`nötiges m für ≤ 1 px: Median ${q(noetig1, 0.5)}, 95 % ${q(noetig1, 0.95)}, größtes ${q(noetig1, 1)}; für ≤ 0,3 px: Median ${q(noetig03, 0.5)}, 95 % ${q(noetig03, 0.95)}, größtes ${q(noetig03, 1)}`);
    console.log(`Einsatz-Reihe (${ungueltigReihe} Linien nicht auf der Haut ausgelassen) ab m = 10: max ${reiheMax.toFixed(2)} px; mit m < 10 über 1 px: ${reiheKlein}${reihe ? ` (${reihe})` : ''}`);
    expect(n).toBeGreaterThan(60);
    expect(fehler).toBe('');
  }, 900_000);
});
