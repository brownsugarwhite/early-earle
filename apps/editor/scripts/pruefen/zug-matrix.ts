// Ziehen wie im Editor (Stationen aus dem ersten Maulbau eingefroren): je Fall × Anfang × Richtung N Schritte à S (Welt).
// Meldet Wechsel von (Ring, k, m, Käfigpunkte) und Sprünge: größte Bewegung der feinen Punkte fern vom Anfang (> FERN Welt)
// zwischen zwei Schritten in px (461 px/Einheit); ein Schritt selbst ist S·461 px.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/zug-matrix.ts (FAELLE=…, RICHT=vor,zurück,runter,hoch, N, S)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { ableitenMitMaul, maulOptionenVorlage } from '../../../../packages/shape/src/kern/maul';
import { maulLinieAusDokument } from '../../../../packages/shape/src/kern/maulDokument';
import { anfangVerschieben, feinesNetz, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { flaechenAbstand } from './flaechenabstand';
const faelle = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../pruefen-ausgabe', process.env.DATEI ?? 'pruefreihe.json'), 'utf-8')) as Record<string, { dok: Dokument }>;
const namen = (process.env.FAELLE ?? 'kugel-gleich,kugel-ueberbiss,kugel-unterbiss-florian,langhals-gleich,langhals-getrennt,nase-gleich,nase-ueberbiss').split(',');
const RICHT: [string, number, number][] = [['vor', -1, 0], ['zurück', 1, 0], ['runter', 0, -1], ['hoch', 0, 1]].filter((r) => !process.env.RICHT || process.env.RICHT.split(',').includes(r[0] as string)) as [string, number, number][];
const N = Number(process.env.N ?? 15);
const S = Number(process.env.S ?? 0.002);
const FERN = Number(process.env.FERN ?? 0.1);
const SPRUNG = Number(process.env.SPRUNG ?? 1.5);
const SICHT = Number(process.env.SICHT ?? 0.5);
let wechselGesamt = 0;
let spruengeGesamt = 0;
for (const name of namen) {
  const roh = faelle[name]?.dok;
  if (!roh) { console.log('fehlt', name); continue; }
  const basis = roh.kaefig?.stationen ? roh : mitStationenVon(roh, roh);
  const rollen: ('oben' | 'unten')[] = roh.maul?.zu.unten ? ['oben', 'unten'] : ['oben'];
  for (const rolle of rollen) {
    for (const [rn, dx, dy] of RICHT) {
      let vorher = '';
      let fein0: Float64Array | null = null;
      const wechsel: string[] = [];
      const spruenge: string[] = [];
      let maxFern = 0;
      let maxSicht = 0;
      let netz0: ReturnType<typeof feinesNetz> | null = null;
      const sicht: string[] = [];
      for (let i = 0; i <= N; i++) {
        const dok = anfangVerschieben(basis, rolle, (i * dx * S) / basis.skalierung, (i * dy * S) / basis.skalierung);
        const g = dok.kaefig?.stationen;
        let sig: string;
        let fein: Float64Array | null = null;
        let netz: ReturnType<typeof feinesNetz> | null = null;
        let haut: Uint8Array | null = null;
        const sk = dok.skalierung;
        const kn = dok.profile.seite.knoten.find((k) => (rolle === 'oben' ? k.marke === 'maulOben' || k.marke === 'maul' : k.marke === 'maulUnten'));
        const a = kn ? { x: kn.p.x * sk, y: kn.p.y * sk } : { x: 0, y: 0 };
        try {
          const abl = ableitenMitMaul(dok, maulLinieAusDokument(dok)!, { stufen: 2, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
          const l = abl.maul.lage;
          sig = `${l.ringA ?? "K"}/${l.k}/${l.m}/${abl.kaefig.n}/b${l.bL}`;
          fein = abl.fein;
          netz = feinesNetz(abl);
          // Hautpunkte (Gewicht der Hautpunkte des Käfigs > 0,9): Tasche, Lippe und Rachen sind geschlossen verborgen
          const M = abl.unterteilung.matrix;
          const art = abl.maul.art;
          haut = new Uint8Array(abl.fein.length / 3);
          for (let q = 0; q < haut.length; q++) {
            let w = 0;
            for (let e = M.start[q]!; e < M.start[q + 1]!; e++) if (art[M.index[e]!] === 0) w += M.wert[e]!;
            haut[q] = w > 0.9 ? 1 : 0;
          }
        } catch (e) {
          sig = 'FEHLER ' + String(e).slice(0, 60);
        }
        if (i > 0 && netz && netz0) {
          const fern = netz.punkte.filter((p, q) => haut![q] === 1 && Math.hypot(p[0] - a.x, p[1] - a.y) >= FERN);
          const d = flaechenAbstand(fern, netz0.punkte, netz0.flaechen);
          let m = 0;
          for (const x of d) if (x > m) m = x;
          m *= 461;
          maxSicht = Math.max(maxSicht, m);
          if (m > SICHT) sicht.push(`${i}: ${m.toFixed(2)}`);
        }
        if (i > 0 && sig !== vorher) wechsel.push(`${i}: ${vorher} → ${sig}`);
        else if (i > 0 && fein && fein0 && fein.length === fein0.length) {
          let m = 0;
          for (let p = 0; p < fein.length; p += 3) {
            if (Math.hypot(fein[p]! - a.x, fein[p + 1]! - a.y) < FERN) continue;
            const d = Math.hypot(fein[p]! - fein0[p]!, fein[p + 1]! - fein0[p + 1]!, fein[p + 2]! - fein0[p + 2]!) * 461;
            if (d > m) m = d;
          }
          maxFern = Math.max(maxFern, m);
          if (m > SPRUNG) spruenge.push(`${i}: ${m.toFixed(1)} px`);
        }
        vorher = sig;
        fein0 = fein;
        netz0 = netz;
      }
      wechselGesamt += wechsel.length;
      spruengeGesamt += spruenge.length;
      console.log(`${name.padEnd(24)} ${rolle.padEnd(5)} ${rn.padEnd(7)} sichtbar max ${maxSicht.toFixed(2)} px${sicht.length ? ' [' + sicht.join(' ') + ']' : ''} · Gleiten max ${maxFern.toFixed(1)} px · ${wechsel.length ? 'Wechsel ' + wechsel.join(' | ') : 'Topologie stabil'}`);
    }
  }
}
console.log('Wechsel gesamt', wechselGesamt, 'Sprünge gesamt', spruengeGesamt, `(Schritt ${(S * 461).toFixed(2)} px, fern > ${FERN})`);
