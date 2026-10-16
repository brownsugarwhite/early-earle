// Teil G: Kontaktbogen und Zahlen der Grundkörper. Je Körper Seite, Front, Top (orthografisch, gezeichnete Umrisse
// schwarz, Wirbelsäule grün, Ringe der Seite grau) und eine Schrägansicht, alles mit Cel-Stufen wie im Earle-Look. Dazu je
// Blatt Δ (Körper ↔ Zeichnung, px bei 461), Faltenmaß und Bauzeit.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/grundkoerper-g.ts
// Umgebung: NAME (Dateiname, Standard „ausgangslage“), KOERPER (Komma-Liste), TITEL, OPT (JSON, Optionen der Ableitung),
// KUGEL0=1 (Stationen der Startkugel eingefroren wie in Florians Ablauf)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { type AbleitOptionen, ableiten, kernLeiter, zugBei } from '../../../../packages/shape/src/kern/ableiten';
import { type TeilErgebnis, ableitenMitTeilen } from '../../../../packages/shape/src/kern/grundkoerper/teilBau';
import { baumAbleiten, baumTeile } from '../../../../packages/shape/src/kern/grundkoerper/baum';
import { alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { faltenMass, feinesNetz, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { G_KOERPER, type GKoerper, S0_KOERPER, type S0Koerper, gKoerperDokument, s0KoerperDokument } from '../../../../packages/shape/src/kern/pruefen/grundkoerper';
import { koerperDokument } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';
import { faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { erreichbarkeit } from '../../../../packages/shape/src/kern/grundkoerper/huelle';
import { bogenHtml } from './kontaktbogen-html';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 'ausgangslage';
const TITEL = process.env.TITEL ?? 'Teil G, G1 — Ausgangslage der Grundkörper (heutiger Bau)';
const OPT: Partial<AbleitOptionen> = process.env.OPT ? JSON.parse(process.env.OPT) : {};
// VARIANTEN (JSON {Name: Optionen}): je Körper eine Zeile je Variante (z. B. S3 Fülle rund | mittel | genau)
const VARIANTEN: Record<string, Partial<AbleitOptionen>> = process.env.VARIANTEN ? JSON.parse(process.env.VARIANTEN) : { '': OPT };

const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

function dokVon(name: string): Dokument {
  if ((G_KOERPER as readonly string[]).includes(name)) return gKoerperDokument(name as GKoerper);
  if ((S0_KOERPER as readonly string[]).includes(name)) return s0KoerperDokument(name as S0Koerper);
  if (name === 'birne') return koerperDokument('birne', zufall(2));
  return koerperDokument(name as 'kugel', zufall(1));
}

const liste = (process.env.KOERPER ?? 'kugel,birne,ente,giraffe-bauch,s-hals,fisch,langhals,rex').split(',');
const faelle: { name: string; text: string; daten: unknown }[] = [];
const zeilen: string[] = [];
for (const [variante, optV] of liste.flatMap((n) => Object.entries(VARIANTEN).map(([v, o]) => [`${n}${v ? ` · ${v}` : ''}`, o] as const))) {
  const name = variante.split(' · ')[0]!;
  const dok = process.env.KUGEL0 ? mitStationenVon(dokVon(name), neuesDokument()) : dokVon(name);
  const opt: Partial<AbleitOptionen> = { stufen: 3, ...optV, ...(dok.kaefig?.stationen ? { stationen: dok.kaefig.stationen } : {}) };
  const sk = dok.skalierung;
  const t0 = performance.now();
  let abl: ReturnType<typeof ableiten>;
  // BAUM=1 (G4 neu, Schritt 2): Rumpf und Äste der Seite getrennt, die Äste als eigene Netze dazu
  let baumAeste: ReturnType<typeof ableiten>[] = [];
  try {
    if (process.env.BAUM === '3') abl = baumAbleiten(dok, { stufen: 3 });
    else if (process.env.BAUM) {
      const b = baumTeile(dok, { stufen: 3 });
      abl = b.rumpf;
      baumAeste = b.aeste;
    } else abl = process.env.TEILE ? ableitenMitTeilen(dok, { stufen: 3 }, process.env.TEILE === 'angesteckt' ? 'angesteckt' : 'verschmolzen') : ableiten(dok, opt);
  } catch (e) {
    zeilen.push(`${variante}: Bau scheitert (${(e as Error).message})`);
    faelle.push({ name: variante, text: `<b>${variante}</b> · Bau scheitert: ${(e as Error).message}`, daten: null });
    continue;
  }
  const zeit = performance.now() - t0;
  const netz0 = feinesNetz(abl);
  const punkte = [...netz0.punkte];
  const flaechen = [...netz0.flaechen];
  for (const a of baumAeste) {
    const o = punkte.length;
    const na = feinesNetz(a);
    for (const p of na.punkte) punkte.push(p);
    for (const f of na.flaechen) flaechen.push(f.map((i) => i + o));
  }
  // angesteckte Teile: ihre feinen Netze anhängen (für Δ und Bild)
  for (const g of (abl as Partial<TeilErgebnis>).gesteckt ?? []) {
    const o = punkte.length;
    for (let i = 0; i < g.fein.length / 3; i++) punkte.push([g.fein[3 * i]!, g.fein[3 * i + 1]!, g.fein[3 * i + 2]!]);
    for (const f of alleFlaechen(g.unterteilung.stufen[g.unterteilung.stufen.length - 1]!.kaefig)) flaechen.push(f.map((i) => i + o));
  }
  const d = blattAbweichungen(punkte, flaechen, dok);
  const f = faltenMass(abl);
  for (const a of baumAeste) {
    const fa = faltenMass(a);
    if (fa.max > f.max) f.max = fa.max;
    f.ueber20 += fa.ueber20;
  }
  // Wirbelsäulen und Sprossen je Teil (Rumpf und Äste, je mit seinem eigenen Seitenumriss)
  const wirbel: number[] = [];
  const sprossen: number[][] = [];
  for (const a of [abl, ...baumAeste]) {
    const l = kernLeiter(a.dok ?? dok);
    for (const p of l.paare) {
      const o = zugBei(l.ruecken, p.a);
      const u = zugBei(l.bauch, p.b);
      wirbel.push((o.x + u.x) / 2, (o.y + u.y) / 2, 0);
    }
    wirbel.push(1e9, 1e9, 0); // Trenner (JSON kennt kein NaN)
    for (const s of a.stationen) {
      const o = zugBei(l.ruecken, s.a);
      const u = zugBei(l.bauch, s.b);
      sprossen.push([o.x, o.y, 0, u.x, u.y, 0]);
    }
  }
  const pos = new Float32Array(punkte.length * 3);
  punkte.forEach((p, i) => pos.set(p, 3 * i));
  const tri: number[] = [];
  for (const fl of flaechen) for (let k = 1; k + 1 < fl.length; k++) tri.push(fl[0]!, fl[k]!, fl[k + 1]!);
  const soll = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), 24).flatMap((p) => [p.x * sk, p.y * sk]);
  // S0 (16.10.): Widersprüche der Zeichnungen (rot auf der Linie) und Falten nach Zonen (nur die Röhre des Rumpfs)
  const er = erreichbarkeit(dok);
  const widerspruchZug = (a: 'seite' | 'front' | 'top') => {
    const out: number[] = [];
    const e = er[a];
    e.punkte.forEach((q, i) => {
      if (e.widerspruch[i]! > 1) out.push(q.x, a === 'top' ? -q.y : q.y);
      else out.push(1e9, 1e9);
    });
    return out;
  };
  const zo = baumAeste.length || (abl as Partial<TeilErgebnis>).gesteckt?.length ? null : faltenNachZonenRoehre(abl);
  const zonenText = zo ? (['frei', 'kappe', 'spitze', 'kante'] as const).filter((z) => zo.zonen[z].kanten).map((z) => `${{ frei: 'freie Haut', kappe: 'Kappe', spitze: 'Spitze', kante: 'Kante' }[z]} ${zo.zonen[z].max.toFixed(0)}°/${zo.zonen[z].ueber20}`).join(', ') : '';
  const w = (a: 'seite' | 'front' | 'top') => (er[a].max > 1 ? ` <span style="color:#d81b43">(Widerspruch ${er[a].max.toFixed(1)})</span>` : '');
  const text = `<b>${variante}</b> · Seite Δ ${d.seite.max.toFixed(1)}${w('seite')} · Front Δ ${d.front.max.toFixed(1)}${w('front')} · Top Δ ${d.top.max.toFixed(1)}${w('top')} px · Falten ${f.max.toFixed(1)}° (über 20°: ${f.ueber20})${zonenText ? ` — nach Zonen: ${zonenText}` : ''} · ${zeit.toFixed(0)} ms`;
  zeilen.push(`${variante}: Seite ${d.seite.max.toFixed(1)} px, Front ${d.front.max.toFixed(1)} px, Top ${d.top.max.toFixed(1)} px, Falten ${f.max.toFixed(1)}° (>20°: ${f.ueber20}), ${zeit.toFixed(0)} ms`);
  faelle.push({ name: variante, text, daten: { pos: b64(pos), tri: b64(Uint32Array.from(tri)), seite: soll('seite'), front: soll('front'), top: soll('top'), wirbel, sprossen, wid: [widerspruchZug('seite'), widerspruchZug('front'), widerspruchZug('top')] } });
}

const html = bogenHtml(TITEL, faelle);
const out = resolve(AUSGABE, `grundkoerper-${NAME}.html`);
writeFileSync(out, html);
console.log(zeilen.join('\n'));
console.log('geschrieben', out);
