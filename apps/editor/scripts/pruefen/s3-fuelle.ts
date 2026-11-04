// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3 „Umrisse berühren“ auf der glatten Haut (`GLATTE_HAUT`): heute (ohne) |
// rund | mittel | genau. Je Körper frisch und aus der Startkugel: Falten nach Zonen, Δ je Blatt, Volumen, Bauzeit, dazu
// das größte Wachstum je Ring. Umgebung: KOERPER (Komma-Liste), NAME, AUSGABE, STUFEN (Komma-Liste, Standard alle).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/s3-fuelle.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import { type AbleitOptionen, GLATTE_HAUT, ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { feinesNetz, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { G_KOERPER, type GKoerper, S0_KOERPER, type S0Koerper, gKoerperDokument, s0KoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'fuelle';

function dokVon(name: string): Dokument {
  if ((G_KOERPER as readonly string[]).includes(name)) return gKoerperDokument(name as GKoerper);
  if ((S0_KOERPER as readonly string[]).includes(name)) return s0KoerperDokument(name as S0Koerper);
  return koerperDokument(name as 'kugel', zufall(1));
}

function volumen(punkte: readonly (readonly number[])[], flaechen: readonly (readonly number[])[]): number {
  let v = 0;
  for (const f of flaechen) {
    const a = punkte[f[0]!]!;
    for (let k = 1; k + 1 < f.length; k++) {
      const b = punkte[f[k]!]!;
      const c = punkte[f[k + 1]!]!;
      v += (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) - a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6;
    }
  }
  return Math.abs(v);
}

const ALLE: Record<string, Partial<AbleitOptionen>> = {
  heute: { ...GLATTE_HAUT },
  rund: { ...GLATTE_HAUT, fuelle: 'rund' },
  mittel: { ...GLATTE_HAUT, fuelle: 'mittel' },
  genau: { ...GLATTE_HAUT, fuelle: 'genau' },
};
// EXTRA (JSON): zusätzliche Optionen für alle Stufen außer „heute“ (z. B. {"randGewicht":0.5})
const EXTRA: Partial<AbleitOptionen> = process.env.EXTRA ? JSON.parse(process.env.EXTRA) : {};
const VARIANTEN = Object.fromEntries((process.env.STUFEN ?? 'heute,rund,mittel,genau').split(',').map((k) => [k, k === 'heute' ? ALLE[k]! : { ...ALLE[k]!, ...EXTRA }]));
const liste = (process.env.KOERPER ?? 'einfach-glatt,einfach,kugel,ei,robbe,rex,langhals,vase,giraffe-bauch,ente-haken').split(',');
const kugel = neuesDokument();
const zeilen: string[] = [`Messreihe S3 „${NAME}“ — Umrisse berühren: heute | rund | mittel | genau (glatte Haut)`];
zeilen.push('Körper/Ablauf          Stufe   frei°  >20  Kappe° >20 | Δ S/F/T px          | Vol      | Bau ms | Wünsche | Wachstum je Ring');
const ergebnis: Record<string, unknown> = {};
for (const name of liste) {
  for (const ablauf of ['frisch', 'kugel0'] as const) {
    const dok = ablauf === 'frisch' ? dokVon(name) : mitStationenVon(dokVon(name), kugel);
    let v0 = 0;
    for (const [v, o] of Object.entries(VARIANTEN)) {
      const opt = dok.kaefig?.stationen ? { ...o, stationen: dok.kaefig.stationen } : o;
      const abl = ableiten(dok, opt);
      const z = faltenNachZonenRoehre(abl).zonen;
      const { punkte, flaechen } = feinesNetz(abl);
      const ab = blattAbweichungen(punkte, flaechen, dok);
      const vol = volumen(punkte, flaechen);
      if (!v0) v0 = vol;
      const p = abl.rand?.wachstum ?? [];
      const key = `${name}/${ablauf}/${v}`;
      ergebnis[key] = { frei: z.frei.max, kappe: z.kappe.max, delta: [ab.seite.max, ab.front.max, ab.top.max], volumen: vol, bau: abl.zeiten.gesamt, wachstum: p, nachfrage: abl.rand?.nachfrage ?? 0 };
      zeilen.push(
        `${(name + '/' + ablauf).padEnd(22)} ${v.padEnd(6)} ${z.frei.max.toFixed(1).padStart(5)} ${String(z.frei.ueber20).padStart(4)}  ${z.kappe.max.toFixed(1).padStart(5)} ${String(z.kappe.ueber20).padStart(3)} | ${[ab.seite.max, ab.front.max, ab.top.max].map((x) => x.toFixed(1).padStart(5)).join(' ')} | ${(((vol - v0) / v0) * 100).toFixed(1).padStart(5)} % | ${abl.zeiten.gesamt.toFixed(0).padStart(5)} | ${String(abl.rand?.nachfrage ?? 0).padStart(4)} | ${p.length ? p.map((x) => x.toFixed(2)).join(' ') : '–'}`,
      );
    }
  }
}
console.log(zeilen.join('\n'));
writeFileSync(`${AUSGABE}/s3-${NAME}.json`, JSON.stringify(ergebnis, null, 1));
writeFileSync(`${AUSGABE}/s3-${NAME}.txt`, zeilen.join('\n'));
