// Teil A, Schritt A4: Karte des halben Maulfelds. Tor: 0 umgeklappte Kartendreiecke in der ganzen Reihe (Körper ×
// Linienformen). Dazu Zahlen: Mundwinkel-V, CG-Schritte, Zeit.
import { describe, expect, it } from 'vitest';
import { ableiten } from '../ableiten';
import { feinesNetz, hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from '../pruefen/koerper';
import { type Anfang, type Form, maulBezug, maulLinien } from '../pruefen/linien';
import { zufall } from '../pruefen/zufall';
import { alleFlaechen } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { feldMitGerademRand, flaechenAbstand } from './feld';
import { aufschneiden, feinNetz, kantenPfad, linieAufNetz } from './flaeche';
import { karteBauen } from './karte';
import { verfeinern1 } from './verfeinern';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };

describe('Teil A, A4: Karte', () => {
  const faelle: [KoerperArt, Anfang, Form][] = [];
  for (const k of ['kugel', 'ei', 'birne', 'rex', 'langhals', 'robbe'] as KoerperArt[]) for (const a of ['hoch', 'mittel', 'tief'] as Anfang[]) for (const f of ['gerade', 'j', 's'] as Form[]) faelle.push([k, a, f]);
  it('0 umgeklappte Dreiecke in der ganzen Reihe (54 Fälle)', () => {
    let fehler = '';
    let n = 0;
    let zeit = 0;
    let schritte = 0;
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
      const kanten: number[] = [];
      for (let e = 0; e < v.kaefig.nE; e++) {
        const a = v.kaefig.eA[e]!;
        const b = v.kaefig.eB[e]!;
        kanten.push(Math.hypot(v.kaefig.xyz[3 * a]! - v.kaefig.xyz[3 * b]!, v.kaefig.xyz[3 * a + 1]! - v.kaefig.xyz[3 * b + 1]!, v.kaefig.xyz[3 * a + 2]! - v.kaefig.xyz[3 * b + 2]!));
      }
      kanten.sort((a, b) => a - b);
      const h1 = kanten[Math.floor(kanten.length / 2)]!;
      const s = feldMitGerademRand(v.kaefig, d, 3 * h1, h1);
      // feine Dreiecke der rechten Hälfte von M (Blöcke der Stufe-1-Flächen; je Viereck zwei Dreiecke in `feinNetz`)
      const block = ff.length / v.kaefig.nF;
      const dreiecke: number[] = [];
      for (const f of s.feld)
        for (let q = f * block; q < (f + 1) * block; q++) {
          const ecken = ff[q]!;
          if (ecken.some((p) => netz.punkte[3 * p + 2]! < -1e-9)) continue;
          dreiecke.push(2 * q, 2 * q + 1);
        }
      const t0 = performance.now();
      const pfad = kantenPfad(netz, dreiecke, auf.lagen);
      const name = `${art}/${anfang}/${form}`;
      if (pfad.length < 2) {
        fehler += `${name}: kein Pfad; `;
        continue;
      }
      const schnitt = aufschneiden(netz, dreiecke, pfad);
      const k = karteBauen({ dreiecke: schnitt.dreiecke, punkte: netz.punkte, nPunkte: netz.punkte.length / 3, doppel: schnitt.doppel, pfad });
      zeit = Math.max(zeit, performance.now() - t0);
      schritte = Math.max(schritte, k.schritte);
      if (k.umgeklappt > 0 || k.entartet > 0) fehler += `${name}: ${k.umgeklappt} umgeklappt, ${k.entartet} entartet (${k.punkte.length} Punkte); `;
    }
    console.log(`${n} Fälle; längste Karte ${zeit.toFixed(0)} ms, höchstens ${schritte} CG-Schritte${fehler ? `; Fehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(40);
    expect(fehler).toBe('');
  });
});
