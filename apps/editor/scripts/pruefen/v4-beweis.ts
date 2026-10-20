// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V4 „Exakte Umrisse“, Beweis im Kern: je Beweis-Körper (Röhre wie
// im Editor, glatt + mittel, Florians Ablauf aus der Startkugel) heute gegen „exakt“ (`ausstattung.umrisseExakt`): Δ je
// Blatt, größte Falte (frei, Kappe), Volumen, Bauzeit, Zahl der Bedingungen; mit DURCH=1 auch Durchdringungen; mit BOGEN=1
// ein Kontaktbogen (je Körper heute und exakt: Seite, Front, Top, schräg mit der Zeichnung). Umgebung: KOERPER (Liste), OPT
// (JSON für `umrisseOpt`, z. B. '{"front":true,"ungleich":2}'), NAME (Zusatz im Bildnamen), AUSGABE.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/v4-beweis.ts
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { selbstDurchdringungen } from '../../../../packages/shape/src/versuch/pruefen';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BogenFall, bogenHtml } from './kontaktbogen-html';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v4');
mkdirSync(AUSGABE, { recursive: true });
const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const faelle: BogenFall[] = [];

const BEWEIS = process.env.KOERPER?.split(',') ?? ['kugel', 'ei', 'robbe', 'tigerkopf', 'vase', 'einfach', 'kegel', 'widerspruch-breite'];
const opt = process.env.OPT ? JSON.parse(process.env.OPT) : undefined;
const BL = ['seite', 'front', 'top'] as const;

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

const zeilen: string[] = ['| Körper | Δ Seite heute → exakt | Δ Front | Δ Top | Falte frei / Kappe ° | Volumen | Bau ms | Bedingungen (Breite/Front/Tangente/Ungleich) |', '|---|---|---|---|---|---|---|---|'];
for (const name of BEWEIS) {
  const roh = extremKoerper(name).dok();
  const dok = imAblauf(roh, 'roehre', 'kugel');
  const heute = editorBauen(dok, editorPlan('roehre'));
  const exakt = editorBauen(dok, { ...editorPlan('roehre'), umrisseExakt: true, ...(opt ? { umrisseOpt: opt } : {}) });
  const mass = (b: typeof heute) => {
    const abl = b.stand.abl;
    const n = feinesNetz(abl);
    const z = faltenNachZonenRoehre(abl).zonen;
    return {
      d: BL.map((a) => b.netz.info.blatt?.[a].max ?? NaN),
      frei: z.frei.max,
      kappe: z.kappe.max,
      vol: volumen(n.punkte, n.flaechen),
      durch: process.env.DURCH ? selbstDurchdringungen({ punkte: n.punkte, flaechen: n.flaechen, schaerfe: new Map() }, 1e-4).paare : NaN,
      bericht: abl.umrisse,
    };
  };
  const a = mass(heute);
  const b = mass(exakt);
  if (process.env.BOGEN) {
    for (const [titel, bau, m] of [['heute', heute, a], ['exakt', exakt, b]] as const) {
      const nz = feinesNetz(bau.stand.abl);
      const tri: number[] = [];
      for (const fl of nz.flaechen) for (let q = 1; q + 1 < fl.length; q++) tri.push(fl[0]!, fl[q]!, fl[q + 1]!);
      const soll = (x: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(bau.dok.profile[x]), 24).flatMap((p) => [p.x * bau.dok.skalierung, p.y * bau.dok.skalierung]);
      faelle.push({
        name: `${name} ${titel}`,
        text: `<b>${name} · ${titel}</b> · Δ Seite ${m.d[0]!.toFixed(1)} · Front ${m.d[1]!.toFixed(1)} · Top ${m.d[2]!.toFixed(1)} px · Falte frei ${m.frei.toFixed(0)}°, Kappe ${m.kappe.toFixed(0)}°`,
        daten: { pos: b64(Float32Array.from(nz.punkte.flat())), tri: b64(Uint32Array.from(tri)), seite: soll('seite'), front: soll('front'), top: soll('top'), wirbel: [], sprossen: [], zebra: false },
      });
    }
  }
  const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '–');
  const r = b.bericht;
  zeilen.push(
    `| ${name} | ${f(a.d[0]!)} → **${f(b.d[0]!)}** | ${f(a.d[1]!)} → **${f(b.d[1]!)}** | ${f(a.d[2]!)} → **${f(b.d[2]!)}** | ${f(a.frei)}/${f(a.kappe)} → ${f(b.frei)}/${f(b.kappe)} | ${(((b.vol - a.vol) / a.vol) * 100).toFixed(1)} % | ${heute.ms.toFixed(0)} → ${exakt.ms.toFixed(0)} | ${r ? `${r.breitenlinie}/${r.frontlinie}/${r.tangenten}/${r.ungleich}, ${r.zerlegungen} Zerlegungen, ${r.ms.toFixed(0)} ms` : '–'}${process.env.DURCH ? ` · Durchdr. ${a.durch} → ${b.durch}` : ''} |`,
  );
  console.log(zeilen[zeilen.length - 1]);
}
console.log(`\n${zeilen.join('\n')}`);
if (process.env.BOGEN && faelle.length) {
  const name = process.env.NAME ?? 'beweis';
  const html = resolve(AUSGABE, `v4-${name}.html`);
  writeFileSync(html, bogenHtml('V4 Exakte Umrisse · Beweis im Kern · heute gegen exakt', faelle, 'je Körper zwei Reihen (heute, exakt): Seite · Front · Top · schräg; schwarz = gezeichneter Umriss; Δ = größte Abweichung Körper ↔ Zeichnung (px bei 461 je Kachel)'));
  const png = resolve(AUSGABE, `v4-${name}.png`);
  execFileSync('node', [resolve(WURZEL, 'apps/editor/scripts/pruefen/html-shot.mjs'), html, png, '1560'], { cwd: resolve(WURZEL, 'apps/editor'), stdio: 'inherit' });
  console.log(png);
}
