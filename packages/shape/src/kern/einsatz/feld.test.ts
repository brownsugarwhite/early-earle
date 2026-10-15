// Teil A, Schritt A3: Feldwahl. Tor: Scheibe, spiegelsymmetrisch, Polzahl wie vorhergesagt (keine konkaven Ecken, Summe der
// Valenzüberschüsse am Rand = Gauß–Bonnet), deterministisch, gerade Kantenzahl am halben Rand; für Körper × Linienformen
// (hoch, mittel, tief × gerade, J, S). Offen: m ≤ 20 hält beim tiefen Rex-Mund nicht (m 22, lange Linie).
import { describe, expect, it } from 'vitest';
import { alleFlaechen } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { ableiten } from '../ableiten';
import { feinesNetz, hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from '../pruefen/koerper';
import { type Anfang, type Form, maulBezug, maulLinien } from '../pruefen/linien';
import { zufall } from '../pruefen/zufall';
import { M_MAX, feldMitGerademRand, flaechenAbstand } from './feld';
import { feinNetz, linieAufNetz, scheibenPruefung } from './flaeche';
import { verfeinern1 } from './verfeinern';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil A, A3: Feldwahl', () => {
  const faelle: [KoerperArt, Anfang, Form][] = [];
  for (const k of ['kugel', 'ei', 'birne', 'rex', 'langhals', 'robbe'] as KoerperArt[]) for (const a of ['hoch', 'mittel', 'tief'] as Anfang[]) for (const f of ['gerade', 'j', 's'] as Form[]) faelle.push([k, a, f]);
  it('Scheibe, symmetrisch, Pole wie vorhergesagt, deterministisch (54 Fälle)', () => {
    let fehler = '';
    let n = 0;
    const ms: number[] = [];
    const zuGross: string[] = [];
    for (const [art, anfang, form] of faelle) {
      const dok = koerperDokument(art, zufall(1));
      const abl = ableiten(dok, { stufen: 3 });
      const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals' | 'robbe');
      const l = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
      if ('fehler' in l) continue;
      n++;
      const { flaechen } = feinesNetz(abl);
      const netz = feinNetz(abl.fein, flaechen);
      const auf = linieAufNetz(netz, l.oben);
      const v = verfeinern1(abl.kaefig);
      const u = unterteilung(v.kaefig, 2);
      const fein = anwenden3(u.grenze, v.kaefig.xyz);
      const ff = alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig);
      const d = flaechenAbstand(fein, ff, v.kaefig.nF, auf.lagen);
      // Radius: drei Kanten der Stufe 1 (Median der Käfigkanten nahe der Linie)
      const kanten: number[] = [];
      for (let e = 0; e < v.kaefig.nE; e++) {
        const a = v.kaefig.eA[e]!;
        const b = v.kaefig.eB[e]!;
        kanten.push(Math.hypot(v.kaefig.xyz[3 * a]! - v.kaefig.xyz[3 * b]!, v.kaefig.xyz[3 * a + 1]! - v.kaefig.xyz[3 * b + 1]!, v.kaefig.xyz[3 * a + 2]! - v.kaefig.xyz[3 * b + 2]!));
      }
      kanten.sort((a, b) => a - b);
      const h1 = kanten[Math.floor(kanten.length / 2)]!;
      const s = feldMitGerademRand(v.kaefig, d, 3 * h1, h1);
      const s2 = feldMitGerademRand(v.kaefig, d, 3 * h1, h1);
      // Scheibe: Flächen von M als Dreiecke
      const tri: number[] = [];
      for (const f of s.feld) {
        const e = Array.from(v.kaefig.fVerts.subarray(v.kaefig.fStart[f]!, v.kaefig.fStart[f + 1]!));
        for (let k = 1; k + 1 < e.length; k++) tri.push(e[0]!, e[k]!, e[k + 1]!);
      }
      const sch = scheibenPruefung(Int32Array.from(tri));
      // symmetrisch: Flächenmitten (x, y, ±z) als Menge gleich
      const mitte = (f: number) => {
        const e = Array.from(v.kaefig.fVerts.subarray(v.kaefig.fStart[f]!, v.kaefig.fStart[f + 1]!));
        const o = [0, 0, 0];
        for (const p of e) for (let a = 0; a < 3; a++) o[a] = o[a]! + v.kaefig.xyz[3 * p + a]! / e.length;
        return o;
      };
      const schl = (o: number[]) => o.map((x) => Math.round(x * 1e6)).join(',');
      const menge = new Set(Array.from(s.feld).map((f) => schl(mitte(f))));
      const symmetrisch = Array.from(s.feld).every((f) => {
        const o = mitte(f);
        return menge.has(schl([o[0]!, o[1]!, -o[2]!]));
      });
      const det = s2.feld.length === s.feld.length && s2.feld.every((x, i) => x === s.feld[i]);
      ms.push(s.m);
      const ok = sch.euler === 1 && sch.raender === 1 && sch.kneif === 0 && symmetrisch && s.konkav === 0 && s.polSumme === s.polSummeSoll && det && Number.isFinite(s.m);
      if (Number.isFinite(s.m) && s.m > M_MAX) zuGross.push(`${art}/${anfang}/${form} m ${s.m}`);
      if (!ok) fehler += `${art}/${anfang}/${form}: χ ${sch.euler}, Ränder ${sch.raender}, Kneif ${sch.kneif}, symmetrisch ${symmetrisch}, konkav ${s.konkav}, Pole ${s.polSumme}/${s.polSummeSoll}, det ${det}, m ${s.m}; `;
    }
    const gerade = ms.filter((m) => Number.isFinite(m));
    console.log(`${n} Fälle; m: ${gerade.length} gerade halbe Ränder (m ${Math.min(...gerade)}–${Math.max(...gerade)}), ${ms.length - gerade.length} ungerade; über m_max ${M_MAX} (offen, Rückfall Übergangsreihe oder größeres m_max): ${zuGross.join(', ') || '—'}${fehler ? `; Fehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(40);
    expect(fehler).toBe('');
    expect(zuGross.length).toBeLessThanOrEqual(2);
  });
});
