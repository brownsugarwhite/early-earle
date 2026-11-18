// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Prüfstand „Extremreihe“ — alle Körper in beiden Körperarten
// (Röhre, Teile) frisch und in Florians Ablauf (Startkugel eingefroren), gemessen wie der Editor baut (`extremMessen`).
// Ausgabe: Tabelle (Markdown, je Gruppe), JSON mit allen Werten, Kontaktbogen je Gruppe (Florians Ablauf: Seite, Front,
// Top mit schwarzer und gelber Linie, Netzlinien, Widerspruch, P-Linien; schräg; Zebra). Umgebung: KOERPER (Komma-Liste),
// GRUPPEN, OHNE_BOGEN=1, HASH=1 bzw. HASH=<datei> (Fingerabdrücke der gezeigten Netze, für bitgleiches Aufräumen),
// GRUNDZAHLEN=1 (schreibt `extremreihe.grundzahlen.json` für den Test; mit KOERPER/GRUPPEN nur deren
// Einträge), AUSGABE (Ordner), ARTEN (z. B. roehre), PLAN (JSON: Zusätze zum Bauplan, z. B. {"umrisseExakt":true}),
// TITEL (Zusatz im Titel und Dateinamen des Bogens), NAH_LINIE=1 (Zebra nah um die P-Linien statt des ganzen Körpers;
// NAH_LINIE=ende: nah um das Ende der ersten Linie), GROESSE (Kachel in px), FALTEN=1 (scharfe Käfigkanten rot).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/v1-extremreihe.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { RAND, SICHT } from '../../../../packages/shape/src/kern/netzSicht';
import { EXTREMREIHE, EXTREM_GRUPPEN, type ExtremGruppe, GRUPPEN_TITEL } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { type Ablauf, type Bauart, type ExtremMessung, extremMessen } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { erreichbarkeit } from '../../../../packages/shape/src/kern/grundkoerper/huelle';
import { type BogenFall, bogenHtml } from './kontaktbogen-html';
import { feinKette } from '../../../../packages/shape/src/kern/reifen';
import type { Kaefig } from '../../../../packages/shape/src/kaefig/halbkanten';
import type { Unterteilung } from '../../../../packages/shape/src/subdivision/catmullClark';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v1');
mkdirSync(AUSGABE, { recursive: true });
const nur = process.env.KOERPER?.split(',');
const gruppen = (process.env.GRUPPEN?.split(',') ?? EXTREM_GRUPPEN) as ExtremGruppe[];
const ARTEN = (process.env.ARTEN?.split(',') ?? ['roehre', 'teile']) as Bauart[];
const PLAN = process.env.PLAN ? JSON.parse(process.env.PLAN) : null;
const TITEL = process.env.TITEL ?? '';
const ABLAEUFE: Ablauf[] = ['kugel', 'frisch'];
const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const T = 1e9;
type V3 = [number, number, number];
/** Bild eines Punkts je Blatt wie im Kontaktbogen: Seite (x, y), Front (z, y), Top (x, −z). */
const bild = (p: ArrayLike<number>, v: number): [number, number] => (v === 0 ? [p[0]!, p[1]!] : v === 1 ? [p[2]!, p[1]!] : [p[0]!, -p[2]!]);
const BLICK = [SICHT.seite, SICHT.front, SICHT.top];
const FARBE: Record<string, string> = { 'kontur-seite': '#2b50d8', 'kontur-front': '#a03cc8', 'kontur-top': '#0f9e8e' };
const EIGEN = ['kontur-seite', 'kontur-front', 'kontur-top'];

/** Ausschnitt um alle P-Linien (Mitte und Halbmesser in Welt) für die Zebra-Nahansicht. */
function nahUm(kanten: readonly { knoten: readonly { p: readonly number[] }[] }[]): [number, number, number, number] {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const kk of kanten) for (const kn of kk.knoten) for (let d = 0; d < 3; d++) {
    lo[d] = Math.min(lo[d]!, kn.p[d]!);
    hi[d] = Math.max(hi[d]!, kn.p[d]!);
  }
  const r = 0.65 * Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!, 0.05);
  return [(lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2, r];
}

/** Ausschnitt um das Ende einer Linie (letzter Knoten, Halbmesser ein Sechstel ihrer Länge). */
function nahEnde(k: { knoten: readonly { p: readonly number[] }[] }): [number, number, number, number] {
  const a = k.knoten[0]!.p;
  const e = k.knoten[k.knoten.length - 1]!.p;
  return [e[0]!, e[1]!, e[2]!, Math.max(0.02, Math.hypot(e[0]! - a[0]!, e[1]! - a[1]!, e[2]! - a[2]!) / 6)];
}

/** Scharfe Käfigkanten als Züge auf der Grenzfläche (je Kante die feinen Punkte). */
function faltenZuege(g: { kaefig: Kaefig; unterteilung: Unterteilung; fein: Float64Array }): number[][] {
  const out: number[][] = [];
  const k = g.kaefig;
  for (let e = 0; e < k.nE; e++) {
    if (!(k.eSchaerfe[e]! > 0)) continue;
    out.push(feinKette(g.unterteilung, k, k.eA[e]!, k.eB[e]!).flatMap((p) => [g.fein[3 * p]!, g.fein[3 * p + 1]!, g.fein[3 * p + 2]!]));
  }
  return out;
}

const alle: ExtremMessung[] = [];
const hashes: Record<string, Record<string, string>> = {};
const boegen = new Map<ExtremGruppe, BogenFall[]>();
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '–');
const f0 = (x: number) => (Number.isFinite(x) ? x.toFixed(0) : '–');

for (const k of EXTREMREIHE) {
  if (!gruppen.includes(k.gruppe) || (nur && !nur.includes(k.name))) continue;
  for (const art of ARTEN) {
    for (const ablauf of ABLAEUFE) {
      const t0 = Date.now();
      let r: ReturnType<typeof extremMessen>;
      try {
        r = extremMessen(k, art, ablauf, PLAN ? { plan: PLAN } : {});
      } catch (err) {
        console.log(`${k.name} ${art} ${ablauf}: Bau scheitert: ${(err as Error).message}`);
        alle.push({ name: k.name, gruppe: k.gruppe, art, ablauf, fehler: (err as Error).message } as ExtremMessung);
        continue;
      }
      const m = r.messung;
      alle.push(m);
      // Fingerabdruck des gezeigten Netzes und Käfigs (Aufräumen muss bitgleich sein): FNV-1a über die Bytes
      if (process.env.HASH) {
        const fnv = (a: ArrayLike<number>, T: Float32ArrayConstructor | Float64ArrayConstructor) => {
          const b = new Uint8Array(T.from(a as number[]).buffer);
          let h = 0x811c9dc5;
          for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i]!, 0x01000193) >>> 0;
          return h.toString(16);
        };
        hashes[`${k.name}|${art}|${ablauf}`] = { netz: fnv(r.bau.netz.positionen, Float32Array), kaefig: fnv(r.gezeigt.kaefig.xyz, Float64Array), ...(r.mitLinien ? { linien: fnv(r.mitLinien.bau.netz.positionen, Float32Array) } : {}) };
      }
      console.log(`${k.name.padEnd(19)} ${art.padEnd(6)} ${ablauf.padEnd(6)} Δ ${f1(m.delta.seite.max)}/${f1(m.delta.front.max)}/${f1(m.delta.top.max)} frei ${f0(m.falten.frei.max)}° (${m.falten.frei.ueber20}) DD ${m.durchdringungen} ${Date.now() - t0} ms${m.fehler ? ` FEHLER ${m.fehler}` : ''}`);
      if (ablauf !== 'kugel' || process.env.OHNE_BOGEN) continue;
      // Kontaktbogen: Florians Ablauf, mit Linien, wenn der Körper welche hat
      const zeig = r.mitLinien ?? { bau: r.bau, gezeigt: r.gezeigt, kanten: [] };
      const g = zeig.gezeigt;
      const dok = zeig.bau.dok;
      const pos = new Float32Array(g.punkte.length * 3);
      g.punkte.forEach((p, i) => pos.set(p, 3 * i));
      const tri: number[] = [];
      for (const fl of g.flaechen) for (let q = 1; q + 1 < fl.length; q++) tri.push(fl[0]!, fl[q]!, fl[q + 1]!);
      const soll = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), 24).flatMap((p) => [p.x, p.y]);
      const er = erreichbarkeit(dok);
      const wid = (a: 'seite' | 'front' | 'top') => er[a].punkte.flatMap((q, i) => (er[a].widerspruch[i]! > 1 ? [q.x, a === 'top' ? -q.y : q.y] : [T, T]));
      // gelber Saum: Stücke > 2 px (Blattkoordinaten; Top im Bild gespiegelt wie der Körper)
      const saum = (['seite', 'front', 'top'] as const).map((a, v) => {
        const s = zeig.bau.netz.saum?.[a];
        const out: number[] = [];
        if (s) for (let i = 0; i < s.length; i += 3) out.push(...(s[i + 2]! > 2 && !Number.isNaN(s[i]!) ? [s[i]!, v === 2 ? -s[i + 1]! : s[i + 1]!] : [T, T]));
        return out;
      });
      // Netzlinien wie im Editor: fremde Umrisse nur am Rand und sichtbar
      const netz = [0, 1, 2].map((v) =>
        (zeig.bau.netz.netzSicht?.zuege ?? [])
          .filter((z) => FARBE[z.art] && z.art !== EIGEN[v])
          .map((z) => {
            const p: number[] = [];
            for (let i = 0; i < z.sicht.length; i++) p.push(...(z.sicht[i]! & RAND && z.sicht[i]! & BLICK[v]! ? bild([z.punkte[3 * i]!, z.punkte[3 * i + 1]!, z.punkte[3 * i + 2]!], v) : [T, T]));
            return { f: FARBE[z.art]!, p };
          }),
      );
      const linien = [0, 1, 2].map((v) =>
        zeig.kanten.map((kk) => {
          const out: number[] = [];
          for (let i = 0; i + 1 < kk.knoten.length; i++) {
            const a = kk.knoten[i]!;
            const b = kk.knoten[i + 1]!;
            for (let q = 0; q <= 12; q++) {
              const t = q / 12;
              const u = 1 - t;
              const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
              const P = [0, 1, 2].map((d) => w[0]! * a.p[d]! + w[1]! * (a.p[d]! + a.aus[d]!) + w[2]! * (b.p[d]! + b.ein[d]!) + w[3]! * b.p[d]!) as V3;
              out.push(...bild(P, v));
            }
          }
          return out;
        }),
      );
      const zonen = (['frei', 'kappe', 'ansatz', 'kante', 'spitze'] as const).map((z) => `${z} ${f0(m.falten[z].max)}°/${m.falten[z].ueber20}`).join(', ');
      const rausch = (['seite', 'front', 'top'] as const).map((a) => `${a[0]!.toUpperCase()} ${m.rauschen[a].stuecke}/${m.rauschen[a].knicke}/${m.rauschen[a].schleifen}`).join(' ');
      const lin = m.linien ? ` · P-Linien ${m.linien.arten.join(', ')}: Haut ${f1(m.linien.aufHaut)} px, Kante ${f1(m.linien.kante)} px, Kantenwinkel ${f0(m.linien.kanteMax)}°` : '';
      const liste = boegen.get(k.gruppe) ?? [];
      liste.push({
        name: `${k.name} · ${art}`,
        text: `<b>${k.name} · ${art === 'roehre' ? 'Röhre' : 'Teile'}</b>${m.baum ? ` (${m.baum.streifen} Streifen + ${m.baum.seiten} seitlich)` : ''}${m.fehler ? ` · <b style="color:#c0002a">Baum scheitert, zeigt die Röhre: ${m.fehler}</b>` : ''} · ${k.text} · Δ S ${f1(m.delta.seite.max)} · F ${f1(m.delta.front.max)} · T ${f1(m.delta.top.max)} px (Widerspruch ${f1(Math.max(m.delta.seite.widerspruch, m.delta.front.widerspruch, m.delta.top.widerspruch))}) · Falten ${zonen} · Durchdringungen ${m.durchdringungen} · Käfig ${f0(m.kaefig.winkel)}°/${f1(m.kaefig.seiten)} · Netzlinien Stücke/Knicke/Schleifen ${rausch}${lin} · ${f0(m.zeit.bau)} ms, Zug ${f0(m.zeit.zug)} ms`,
        daten: { pos: b64(pos), tri: b64(Uint32Array.from(tri)), seite: soll('seite'), front: soll('front'), top: soll('top'), wirbel: [], sprossen: [], wid: [wid('seite'), wid('front'), wid('top')], saum, netz, linien, zebra: true, ...(process.env.NAH_LINIE && zeig.kanten.length ? { nah: process.env.NAH_LINIE === 'ende' ? nahEnde(zeig.kanten[0]!) : nahUm(zeig.kanten) } : {}), ...(process.env.FALTEN ? { falten: faltenZuege(g) } : {}) },
      });
      boegen.set(k.gruppe, liste);
    }
  }
}

// Tabelle je Gruppe (Florians Ablauf), dazu die Abweichung „frisch“, wo sie mehr als 2 px bzw. 5° ausmacht
const zeilen: string[] = [];
const wert = (n: string, art: Bauart, ablauf: Ablauf) => alle.find((m) => m.name === n && m.art === art && m.ablauf === ablauf);
for (const gruppe of gruppen) {
  const namen = [...new Set(alle.filter((m) => m.gruppe === gruppe).map((m) => m.name))];
  if (!namen.length) continue;
  zeilen.push(`\n#### ${GRUPPEN_TITEL[gruppe]}\n`);
  zeilen.push('| Körper | Bau | Δ S · F · T px | Saum px | frei° (> 20) · Kappe° · Ansatz° · Kante° | Durchdr. | Käfig °/↔ | Netzlinien S · F · T (Stücke/Knicke/Schleifen) | ms Bau/Zug | P-Linien (Art, Haut, Kante px) |');
  zeilen.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const n of namen) {
    for (const art of ARTEN) {
      const m = wert(n, art, 'kugel');
      if (!m) continue;
      if (!m.delta) {
        zeilen.push(`| ${n} | ${art === 'roehre' ? 'Röhre' : 'Teile'} | Bau scheitert: ${m.fehler} | | | | | | | |`);
        continue;
      }
      const fr = wert(n, art, 'frisch');
      const abw = fr?.delta && (Math.abs(fr.delta.front.max - m.delta.front.max) > 2 || Math.abs(fr.delta.top.max - m.delta.top.max) > 2 || Math.abs(fr.delta.seite.max - m.delta.seite.max) > 2 || Math.abs(fr.falten.frei.max - m.falten.frei.max) > 5) ? ` (frisch ${f1(fr.delta.seite.max)} · ${f1(fr.delta.front.max)} · ${f1(fr.delta.top.max)}, frei ${f0(fr.falten.frei.max)}°)` : '';
      const r = m.rauschen;
      zeilen.push(
        `| ${n} | ${art === 'roehre' ? 'Röhre' : `Teile${m.baum ? ` ${m.baum.streifen}+${m.baum.seiten}` : ''}`}${m.fehler ? ' ⚠' : ''} | ${f1(m.delta.seite.max)} · ${f1(m.delta.front.max)} · ${f1(m.delta.top.max)}${abw} | ${f0(m.saum.seite)} · ${f0(m.saum.front)} · ${f0(m.saum.top)} | ${f0(m.falten.frei.max)} (${m.falten.frei.ueber20}) · ${f0(m.falten.kappe.max)} · ${f0(m.falten.ansatz.max)} · ${f0(m.falten.kante.max)} | ${m.durchdringungen} | ${f0(m.kaefig.winkel)}/${f1(m.kaefig.seiten)} | ${r.seite.stuecke}/${r.seite.knicke}/${r.seite.schleifen} · ${r.front.stuecke}/${r.front.knicke}/${r.front.schleifen} · ${r.top.stuecke}/${r.top.knicke}/${r.top.schleifen} | ${f0(m.zeit.bau)}/${f0(m.zeit.zug)} | ${m.linien ? `${m.linien.arten.join(', ')}; ${f1(m.linien.aufHaut)}; ${f1(m.linien.kante)}` : ''} |`,
      );
    }
  }
}
const md = resolve(AUSGABE, 'v1-extremreihe.md');
writeFileSync(md, zeilen.join('\n') + '\n');
writeFileSync(resolve(AUSGABE, 'v1-extremreihe.json'), JSON.stringify(alle, null, 1));
if (process.env.HASH) writeFileSync(resolve(AUSGABE, process.env.HASH === '1' ? 'v1-hashes.json' : process.env.HASH), JSON.stringify(hashes, null, 1));
console.log(md);

if (process.env.GRUNDZAHLEN) {
  // Grundzahlen für den Test (Florians Ablauf): was „nicht schlechter als heute“ heißt
  const grund = alle
    .filter((m) => m.ablauf === 'kugel' && m.delta)
    .map((m) => ({
      name: m.name,
      art: m.art,
      fehler: m.fehler ?? null,
      delta: [m.delta.seite.max, m.delta.front.max, m.delta.top.max].map((x) => Math.round(x * 100) / 100),
      frei: Math.round(m.falten.frei.max * 10) / 10,
      ueber20: m.falten.frei.ueber20,
      kappe: Math.round(m.falten.kappe.max * 10) / 10,
      ansatz: Math.round(m.falten.ansatz.max * 10) / 10,
      durchdringungen: m.durchdringungen,
      knicke: m.rauschen.seite.knicke + m.rauschen.front.knicke + m.rauschen.top.knicke,
      schleifen: m.rauschen.seite.schleifen + m.rauschen.front.schleifen + m.rauschen.top.schleifen,
      umriss: {
        eigen: Math.round(Math.max(m.rauschen.seite.eigen, m.rauschen.front.eigen, m.rauschen.top.eigen) * 100) / 100,
        haut: Math.round(Math.max(m.rauschen.seite.haut, m.rauschen.front.haut, m.rauschen.top.haut) * 100) / 100,
      },
      ...(m.linien ? { linien: { arten: m.linien.arten, kante: Number.isFinite(m.linien.kante) ? Math.round(m.linien.kante * 100) / 100 : null, aufHaut: Math.round(m.linien.aufHaut * 100) / 100 } } : {}),
    }));
  const ziel = resolve(WURZEL, 'packages/shape/src/kern/pruefen/extremreihe.grundzahlen.json');
  // mit KOERPER bzw. GRUPPEN nur deren Einträge ersetzen, die übrigen bleiben
  const bisher: typeof grund = nur || process.env.GRUPPEN ? JSON.parse(readFileSync(ziel, 'utf8')) : [];
  const neu = new Set(grund.map((g) => `${g.name}|${g.art}`));
  const zusammen = [...bisher.filter((g) => !neu.has(`${g.name}|${g.art}`)), ...grund];
  const reihenfolge = (g: { name: string; art: string }) => EXTREMREIHE.findIndex((k) => k.name === g.name) * 2 + (g.art === 'teile' ? 1 : 0);
  zusammen.sort((a, b) => reihenfolge(a) - reihenfolge(b));
  writeFileSync(ziel, JSON.stringify(zusammen, null, 1) + '\n');
  console.log(ziel);
}

if (!process.env.OHNE_BOGEN) {
  for (const [gruppe, faelle] of boegen) {
    const html = resolve(AUSGABE, `v1-bogen-${gruppe}${TITEL ? `-${TITEL}` : ''}.html`);
    writeFileSync(
      html,
      bogenHtml(
        `V1 Extremreihe · ${GRUPPEN_TITEL[gruppe]} · Florians Ablauf (Startkugel umgeformt)${TITEL ? ` · ${TITEL}` : ''}`,
        faelle,
        'je Körper und Körperart: Seite · Front · Top (orthografisch; schwarz = Zeichnung, gelb = Körper > 2 px daneben, rot = Widerspruch der Zeichnungen, blau/lila/türkis = Umrisse von Seite/Front/Top auf dem Körper wie im Editor, braun = P-Linien) · schräg · Zebra (Knicke brechen die Streifen). Δ in px bei 461 je Kachel; Falten nach Zonen: größter Winkel/Kanten über 20°; Netzlinien je Umriss: Stücke/Knicke über 45°/Schleifen.',
        Number(process.env.GROESSE ?? 300),
      ),
    );
    const png = resolve(AUSGABE, `v1-bogen-${gruppe}${TITEL ? `-${TITEL}` : ''}.png`);
    execFileSync('node', [resolve(WURZEL, 'apps/editor/scripts/pruefen/html-shot.mjs'), html, png, '1560'], { cwd: resolve(WURZEL, 'apps/editor'), stdio: 'inherit' });
    console.log(png);
  }
}
