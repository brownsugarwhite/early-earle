// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S2 „Glatte Haut“: Messreihe je Körper — Falten nach Zonen (frei, Kappe,
// Ansatz, Kante, Spitze; größter Winkel und Kanten über 20°), Δ je Blatt (genau, px bei 461), Volumen, Bau- und Zugzeit,
// Fernwirkung eines örtlichen Zugs. Je Körper frisch und mit den Stationen der Startkugel (Florians Ablauf: neue Kugel,
// dann umformen; `mitStationenVon`). Optionen der Ableitung über OPT (JSON), Vergleich über VERGLEICH (JSON-Datei einer
// früheren Messung). Ausgabe: Tabelle und JSON (AUSGABE/s2-<NAME>.json).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/s2-glatt.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import { type AbleitOptionen, ableiten, ziehen } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { feinesNetz, lokalitaet, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { G_KOERPER, type GKoerper, S0_KOERPER, type S0Koerper, gKoerperDokument, s0KoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { type Profil, bewegeKnoten } from '../../../../packages/shape/src/profil';

const knotenSetzen = (pr: Profil, i: number, p: { x: number; y: number }): Profil => bewegeKnoten(pr, i, p);

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'ausgangslage';
const OPT: Partial<AbleitOptionen> = process.env.OPT ? JSON.parse(process.env.OPT) : {};
const VERGLEICH = process.env.VERGLEICH ? (JSON.parse(readFileSync(process.env.VERGLEICH, 'utf8')) as Record<string, Messung>) : null;
const PX = 461;

function dokVon(name: string): Dokument {
  if ((G_KOERPER as readonly string[]).includes(name)) return gKoerperDokument(name as GKoerper);
  if ((S0_KOERPER as readonly string[]).includes(name)) return s0KoerperDokument(name as S0Koerper);
  return koerperDokument(name as 'kugel', zufall(1));
}

/** Volumen des feinen Netzes (Divergenzsatz über die Flächen, gefächert) */
function volumen(punkte: [number, number, number][], flaechen: number[][]): number {
  let v = 0;
  for (const f of flaechen) {
    const a = punkte[f[0]!]!;
    for (let k = 1; k + 1 < f.length; k++) {
      const b = punkte[f[k]!]!;
      const c = punkte[f[k + 1]!]!;
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
  }
  return Math.abs(v);
}

type Messung = {
  frei: number;
  frei20: number;
  kappe: number;
  kappe20: number;
  ansatz: number;
  kante: number;
  spitze: number;
  delta: [number, number, number];
  volumen: number;
  bau: number;
  zug: number;
  fern: number;
};

function messen(dok: Dokument): Messung {
  // eingefrorene Stationen des Dokuments wie im Worker (`ableitOpt`)
  const opt: Partial<AbleitOptionen> = dok.kaefig?.stationen ? { ...OPT, stationen: dok.kaefig.stationen } : OPT;
  const abl = ableiten(dok, opt);
  const z = faltenNachZonenRoehre(abl).zonen;
  const { punkte, flaechen } = feinesNetz(abl);
  const ab = blattAbweichungen(punkte, flaechen, dok);
  // Zug: Seitenknoten 1 um 6 px (gleiche Stationen)
  const kn = dok.profile.seite.knoten[1]!;
  const dok2: Dokument = { ...dok, profile: { ...dok.profile, seite: knotenSetzen(dok.profile.seite, 1, { x: kn.p.x + 6 / PX, y: kn.p.y }) } };
  let zug = NaN;
  try {
    zug = ziehen(abl, dok2).zugZeit.loeser;
  } catch {
    /* Käfig mit Maul */
  }
  const lok = lokalitaet(dok, 'seite', 1, { x: 6 / PX, y: 0 }, opt);
  return {
    frei: z.frei.max,
    frei20: z.frei.ueber20,
    kappe: z.kappe.max,
    kappe20: z.kappe.ueber20,
    ansatz: z.ansatz.max,
    kante: z.kante.max,
    spitze: z.spitze.max,
    delta: [ab.seite.max, ab.front.max, ab.top.max],
    volumen: volumen(punkte as [number, number, number][], flaechen),
    bau: abl.zeiten.gesamt,
    zug,
    fern: lok.fern,
  };
}

const liste = (process.env.KOERPER ?? 'kugel,ei,birne,rex,robbe,langhals,drache,einfach,einfach-glatt,ente-haken,vase,ente,giraffe-bauch,s-hals,fisch').split(',');
const kugel = neuesDokument();
const ergebnis: Record<string, Messung> = {};
const zeilen: string[] = [];
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '–');
zeilen.push(`Messreihe S2 „${NAME}“ ${JSON.stringify(OPT)}`);
zeilen.push('Körper              Ablauf  frei°  >20  Kappe°  >20  Ansatz° Kante° Spitze° | Δ S/F/T px          | Vol      | Bau ms Zug ms | fern px');
for (const name of liste) {
  const dok = dokVon(name);
  for (const ablauf of ['frisch', 'kugel0'] as const) {
    const d = ablauf === 'frisch' ? dok : mitStationenVon(dok, kugel);
    let m: Messung;
    try {
      m = messen(d);
    } catch (e) {
      zeilen.push(`${name.padEnd(19)} ${ablauf.padEnd(7)} Fehler: ${String(e).slice(0, 80)}`);
      continue;
    }
    const key = `${name}/${ablauf}`;
    ergebnis[key] = m;
    const alt = VERGLEICH?.[key];
    const diff = (a: number, b: number | undefined, eps = 0.05) => (b === undefined ? '' : Math.abs(a - b) < eps ? '' : a > b ? '↑' : '↓');
    zeilen.push(
      `${name.padEnd(19)} ${ablauf.padEnd(7)} ${f1(m.frei).padStart(5)}${diff(m.frei, alt?.frei)} ${String(m.frei20).padStart(4)}  ${f1(m.kappe).padStart(6)}${diff(m.kappe, alt?.kappe)} ${String(m.kappe20).padStart(4)}  ${f1(m.ansatz).padStart(6)} ${f1(m.kante).padStart(6)} ${f1(m.spitze).padStart(6)}  | ${m.delta.map((v) => f1(v).padStart(5)).join(' ')}${alt ? ` (${alt.delta.map((v) => f1(v)).join('/')})` : ''} | ${(m.volumen * 1000).toFixed(2).padStart(7)}${alt ? ` ${(((m.volumen - alt.volumen) / alt.volumen) * 100).toFixed(1)}%` : ''} | ${f1(m.bau).padStart(5)} ${f1(m.zug).padStart(5)} | ${f1(m.fern)}`,
    );
  }
}
console.log(zeilen.join('\n'));
writeFileSync(`${AUSGABE}/s2-${NAME}.json`, JSON.stringify(ergebnis, null, 1));
writeFileSync(`${AUSGABE}/s2-${NAME}.txt`, zeilen.join('\n'));
