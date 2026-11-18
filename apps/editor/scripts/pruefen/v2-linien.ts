// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V2 „Saubere Linien“: die Umrisslinien der ganzen Extremreihe in
// Florians Ablauf (Startkugel umgeformt), beide Körperarten — Stücke, Knicke über 45° (außer an gezeichneten Ecken; an
// Falten des Körpers getrennt), Schleifen (Kringel bis 30 px, die sich auch in der Tiefe berühren), Abstand in der eigenen
// Ansicht zur Silhouette und zur Haut, Zeit des Liniennetzes (Minimum aus 5 Läufen auf demselben Netz).
// Mit `ALT=<modul>` (ein früherer Stand von `kern/netzSicht.ts`, z. B. aus
// `git show a9134118:packages/shape/src/kern/netzSicht.ts`, Importe auf absolute Pfade umgeschrieben) dasselbe für den alten
// Code auf denselben Netzen: Tabelle vorher/nachher und Kontaktbögen je Gruppe (Seite, Front, Top, schräg; blau/lila/türkis =
// Umrisse von Seite/Front/Top, blass = verdeckt, grau = innere Konturen des eigenen Blatts).
// Umgebung: KOERPER, GRUPPEN, OHNE_BOGEN=1, AUSGABE. Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/v2-linien.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { type NetzSicht, type NetzSichtEingabe, RAND, SICHT, netzSicht } from '../../../../packages/shape/src/kern/netzSicht';
import { EXTREMREIHE, EXTREM_GRUPPEN, type ExtremGruppe, GRUPPEN_TITEL } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { type LinienMass, extremMessen, umrissLinien } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { type BogenFall, bogenHtml } from './kontaktbogen-html';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v2');
mkdirSync(AUSGABE, { recursive: true });
const nur = process.env.KOERPER?.split(',');
const gruppen = (process.env.GRUPPEN?.split(',') ?? EXTREM_GRUPPEN) as ExtremGruppe[];
const alt: ((e: NetzSichtEingabe) => NetzSicht) | null = process.env.ALT ? (await import(process.env.ALT)).netzSicht : null;
const BL = ['seite', 'front', 'top'] as const;
const T = 1e9;
const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
/** Bild eines Punkts je Blatt wie im Kontaktbogen: Seite (x, y), Front (z, y), Top (x, −z). */
const bild = (p: ArrayLike<number>, v: number): [number, number] => (v === 0 ? [p[0]!, p[1]!] : v === 1 ? [p[2]!, p[1]!] : [p[0]!, -p[2]!]);
const BLICK = [SICHT.seite, SICHT.front, SICHT.top];
const FARBE: Record<string, string> = { seite: '#2b50d8', front: '#a03cc8', top: '#0f9e8e' };

/** Linien je Blatt wie im Editor: fremde Umrisse (V2: die Umrisslinien, vorher die Randproben der Konturen), eigene innere Konturen. */
function netzLinien(ns: NetzSicht) {
  const neu = ns.zuege.some((z) => z.art.startsWith('umriss-'));
  return [0, 1, 2].map((v) => {
    const out: { f: string; p: number[] }[] = [];
    for (const z of ns.zuege) {
      const m = /^(kontur|umriss)-(seite|front|top)$/.exec(z.art);
      if (!m) continue;
      const eigen = m[2] === BL[v];
      if (eigen ? m[1] !== 'kontur' : m[1] !== (neu ? 'umriss' : 'kontur')) continue;
      for (const sicht of [true, false]) {
        const p: number[] = [];
        for (let i = 0; i < z.sicht.length; i++) {
          const rand = (z.sicht[i]! & RAND) !== 0;
          const nimm = m[1] === 'umriss' || (eigen ? !rand : rand);
          p.push(...(nimm && ((z.sicht[i]! & BLICK[v]!) !== 0) === sicht ? bild([z.punkte[3 * i]!, z.punkte[3 * i + 1]!, z.punkte[3 * i + 2]!], v) : [T, T]));
        }
        out.push({ f: eigen ? (sicht ? 'rgba(40,40,40,0.9)' : 'rgba(40,40,40,0.3)') : sicht ? FARBE[m[2]!]! : `${FARBE[m[2]!]!}55`, p });
      }
    }
    return out;
  });
}

const zeit = (f: () => unknown) => {
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    f();
    best = Math.min(best, performance.now() - t0);
  }
  return best;
};
type Zeile = { name: string; gruppe: ExtremGruppe; art: 'roehre' | 'teile'; neu: Record<string, LinienMass>; msNeu: number; alt?: Record<string, LinienMass>; msAlt?: number };
const zeilen: Zeile[] = [];
const boegen = new Map<ExtremGruppe, BogenFall[]>();
const f1 = (x: number) => x.toFixed(1);
/** Stücke/Knicke/Schleifen je Umriss; Knicke an Falten des Körpers mit „+n F“ (die alte Messung kannte sie nicht) */
const kurz = (r: Record<string, LinienMass>) => BL.map((a) => `${r[a]!.stuecke}/${r[a]!.knicke}${r[a]!.falte ? `+${r[a]!.falte}F` : ''}/${r[a]!.schleifen}`).join(' · ');
const summe = (r: Record<string, LinienMass>, f: 'stuecke' | 'knicke' | 'falte' | 'schleifen') => BL.reduce((s, a) => s + (r[a]![f] ?? 0), 0);
const max = (r: Record<string, LinienMass>, f: 'eigen' | 'haut') => Math.max(...BL.map((a) => r[a]![f]));

for (const k of EXTREMREIHE) {
  if ((nur && !nur.includes(k.name)) || !gruppen.includes(k.gruppe)) continue;
  for (const art of ['roehre', 'teile'] as const) {
    const { bau, gezeigt: g } = extremMessen(k, art, 'kugel', { durchdringung: false, linien: false, zug: false });
    // dieselbe Eingabe wie im Worker: Röhre spiegelgleich, Teile nicht
    const e: NetzSichtEingabe = { dok: bau.dok, punkte: g.punkte, flaechen: g.flaechen, kaefig: g.kaefig, unterteilung: g.unterteilung, spiegelgleich: art === 'roehre' };
    const ns = netzSicht(e);
    const z: Zeile = { name: k.name, gruppe: k.gruppe, art, neu: umrissLinien(ns, bau.dok, g.punkte, g.flaechen), msNeu: zeit(() => netzSicht(e)) };
    const nsAlt = alt ? alt(e) : null;
    if (alt && nsAlt) {
      z.alt = umrissLinien(nsAlt, bau.dok, g.punkte, g.flaechen);
      z.msAlt = zeit(() => alt(e));
    }
    zeilen.push(z);
    console.log(`${k.name.padEnd(18)} ${art.padEnd(6)} ${z.alt ? `vorher ${kurz(z.alt)} (${f1(z.msAlt!)} ms) → ` : ''}${kurz(z.neu)} · eigen ${f1(max(z.neu, 'eigen'))} · Haut ${f1(max(z.neu, 'haut'))} px · ${f1(z.msNeu)} ms`);
    if (process.env.OHNE_BOGEN) continue;
    const pos = Float32Array.from(g.punkte.flat());
    const tri: number[] = [];
    for (const fl of g.flaechen) for (let q = 1; q + 1 < fl.length; q++) tri.push(fl[0]!, fl[q]!, fl[q + 1]!);
    const soll = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(bau.dok.profile[a]), 24).flatMap((p) => [p.x, p.y]);
    const liste = boegen.get(k.gruppe) ?? [];
    for (const [titel, n, r] of [...(nsAlt && z.alt ? [['vorher', nsAlt, z.alt] as const] : []), ['nachher', ns, z.neu] as const]) {
      liste.push({
        name: `${k.name} · ${art} · ${titel}`,
        text: `<b>${k.name} · ${art === 'roehre' ? 'Röhre' : 'Teile'} · ${titel}</b> · Stücke/Knicke(+F an Falten)/Schleifen je Umriss S · F · T ${kurz(r)} · eigen ${f1(max(r, 'eigen'))} px, Haut ${f1(max(r, 'haut'))} px`,
        daten: { pos: b64(pos), tri: b64(Uint32Array.from(tri)), seite: soll('seite'), front: soll('front'), top: soll('top'), wirbel: [], sprossen: [], netz: netzLinien(n), zebra: false },
      });
    }
    boegen.set(k.gruppe, liste);
  }
}

// Tabelle je Gruppe
const md: string[] = ['# V2 Umrisslinien · Extremreihe in Florians Ablauf', ''];
md.push(alt ? 'Je Körper und Körperart: vorher (Konturen) → nachher (Umrisslinien), auf demselben Netz.' : 'Je Körper und Körperart (Umrisslinien).');
md.push('Stücke/Knicke/Schleifen je Umriss Seite · Front · Top (Stücke je gezeichneter Hälfte; Knicke über 45° außer an gezeichneten Ecken, „+n F“ = an Falten des Körpers, wo die Linie mitknicken muss; Schleifen = Kringel bis 30 px, an denen sich die Linie auch in der Tiefe berührt (unter 1 px)); eigen = größter Abstand der Linie in ihrer Ansicht zur Silhouette, Haut = zur Haut (px bei 461 je Kachel); Zeit = Liniennetz, Minimum aus 5 Läufen.', '');
for (const gr of gruppen) {
  const zs = zeilen.filter((z) => z.gruppe === gr);
  if (!zs.length) continue;
  md.push(`## ${GRUPPEN_TITEL[gr]}`, '', `| Körper | Art | ${alt ? 'vorher | ' : ''}nachher | eigen | Haut | ${alt ? 'ms vorher | ' : ''}ms |`, `|---|---|${alt ? '---|' : ''}---|---|---|${alt ? '---|' : ''}---|`);
  for (const z of zs) md.push(`| ${z.name} | ${z.art === 'roehre' ? 'Röhre' : 'Teile'} | ${z.alt ? `${kurz(z.alt)} | ` : ''}${kurz(z.neu)} | ${f1(max(z.neu, 'eigen'))} | ${f1(max(z.neu, 'haut'))} | ${z.msAlt !== undefined ? `${f1(z.msAlt)} | ` : ''}${f1(z.msNeu)} |`);
  md.push('');
}
const sum = (f: (z: Zeile) => number) => zeilen.reduce((s, z) => s + f(z), 0);
md.push('## Summe', '');
if (alt) md.push(`vorher: ${sum((z) => summe(z.alt!, 'stuecke'))} Stücke, ${sum((z) => summe(z.alt!, 'knicke'))} Knicke (+${sum((z) => summe(z.alt!, 'falte'))} an Falten), ${sum((z) => summe(z.alt!, 'schleifen'))} Schleifen; Liniennetz bis ${f1(Math.max(...zeilen.map((z) => z.msAlt!)))} ms`, '');
md.push(`nachher: ${sum((z) => summe(z.neu, 'stuecke'))} Stücke, ${sum((z) => summe(z.neu, 'knicke'))} Knicke (+${sum((z) => summe(z.neu, 'falte'))} an Falten), ${sum((z) => summe(z.neu, 'schleifen'))} Schleifen; eigen bis ${f1(Math.max(...zeilen.map((z) => max(z.neu, 'eigen'))))} px, Haut bis ${f1(Math.max(...zeilen.map((z) => max(z.neu, 'haut'))))} px; Liniennetz bis ${f1(Math.max(...zeilen.map((z) => z.msNeu)))} ms (über 30 ms: ${zeilen.filter((z) => z.msNeu > 30).length})`);
writeFileSync(resolve(AUSGABE, 'v2-linien.md'), `${md.join('\n')}\n`);
writeFileSync(resolve(AUSGABE, 'v2-linien.json'), JSON.stringify(zeilen, null, 1));
console.log(resolve(AUSGABE, 'v2-linien.md'));

if (!process.env.OHNE_BOGEN) {
  for (const [gruppe, faelle] of boegen) {
    const html = resolve(AUSGABE, `v2-bogen-${gruppe}.html`);
    writeFileSync(
      html,
      bogenHtml(
        `V2 Umrisslinien · ${GRUPPEN_TITEL[gruppe]} · Florians Ablauf`,
        faelle,
        'je Körper, Körperart und Stand: Seite · Front · Top · schräg; schwarz = Zeichnung; blau/lila/türkis = Umriss von Seite/Front/Top auf dem Körper, wie die anderen Blätter ihn zeigen (blass = verdeckt), grau = innere Konturen des eigenen Blatts; Zahlen je Umriss: Stücke/Knicke über 45°/Schleifen, Abstand in der eigenen Ansicht zur Silhouette und zur Haut (px bei 461 je Kachel).',
      ),
    );
    const png = resolve(AUSGABE, `v2-bogen-${gruppe}.png`);
    execFileSync('node', [resolve(WURZEL, 'apps/editor/scripts/pruefen/html-shot.mjs'), html, png, '1560'], { cwd: resolve(WURZEL, 'apps/editor'), stdio: 'inherit' });
    console.log(png);
  }
}
