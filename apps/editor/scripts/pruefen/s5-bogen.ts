// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5: Kontaktbogen Mittelebenen-Baum gegen S3 (glatt + Berühren mittel).
// Je Körper zwei Zeilen: heute (eine Röhre) und Baum (Streifen der Seitenfläche). Umgebung: KOERPER (Komma-Liste), NAME,
// OPT (JSON, Baum-Optionen), VARIANTEN (JSON {Name: Baum-Optionen}: statt „heute | Baum“ je Variante eine Zeile), NAH (1:
// fünfte Kachel nah am ersten seitlichen Ansatz mit Zebrastreifen; NAH_PUNKT "Körper:x,y,z,r;…" in px für eigene
// Ausschnitte). Aus packages/shape:
// npx vite-node ../../apps/editor/scripts/pruefen/s5-bogen.ts
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { GLATTE_HAUT, ableiten, kernLeiter, zugBei } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { baumAbleiten, baumFalten, baumFeinesNetz, paarAusnahme } from '../../../../packages/shape/src/kern/grundkoerper/baumBau';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { erreichbarkeit } from '../../../../packages/shape/src/kern/grundkoerper/huelle';
import { feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';
import { faltenNachZonen, faltenNachZonenRoehre } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { type BogenFall, bogenHtml } from './kontaktbogen-html';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const NAME = process.env.NAME ?? 's5-bogen';
const OPT = process.env.OPT ? JSON.parse(process.env.OPT) : {};
const VARIANTEN: Record<string, object> | null = process.env.VARIANTEN ? JSON.parse(process.env.VARIANTEN) : null;
const liste = (process.env.KOERPER ?? 'giraffe-bauch,ente,s-hals,ueberhang,fisch,vase').split(',');
const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

const faelle: BogenFall[] = [];
for (const name of liste) {
  const dok = teilSatzDokument(name);
  const sk = dok.skalierung;
  const soll = (a: 'seite' | 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), 24).flatMap((p) => [p.x * sk, p.y * sk]);
  const er = erreichbarkeit(dok);
  const aus = paarAusnahme(teilbaum(dok));
  const wid = (a: 'seite' | 'front' | 'top') => er[a].punkte.flatMap((q, i) => (er[a].widerspruch[i]! > 1 ? [q.x, a === 'top' ? -q.y : q.y] : [1e9, 1e9]));
  let nah: number[] | null = null;
  const fall = (art: string, punkte: [number, number, number][], flaechen: number[][], sprossen: number[][], wirbel: number[], zonen: string, ms: number, mitPaaren = false) => {
    const pos = new Float32Array(punkte.length * 3);
    punkte.forEach((p, i) => pos.set(p, 3 * i));
    const tri: number[] = [];
    for (const fl of flaechen) for (let k = 1; k + 1 < fl.length; k++) tri.push(fl[0]!, fl[k]!, fl[k + 1]!);
    // mit gebauten seitlichen Teilen (S6) ohne Ausnahme: Ihre Umrisse gehören dann zum Körper
    const d = blattAbweichungen(punkte, flaechen, dok, 240, undefined, true, mitPaaren ? undefined : aus);
    faelle.push({
      name: `${name} · ${art}`,
      text: `<b>${name} · ${art}</b> · Δ Seite ${d.seite.max.toFixed(1)} · Front ${d.front.max.toFixed(1)} · Top ${d.top.max.toFixed(1)} px · ${zonen} · ${ms.toFixed(0)} ms`,
      daten: { pos: b64(pos), tri: b64(Uint32Array.from(tri)), seite: soll('seite'), front: soll('front'), top: soll('top'), wirbel, sprossen, wid: [wid('seite'), wid('front'), wid('top')], ...(nah ? { nah } : {}) },
    });
  };
  const zonenText = (z: ReturnType<typeof faltenNachZonenRoehre>['zonen']) =>
    (['frei', 'ansatz', 'kappe', 'kante', 'spitze'] as const)
      .filter((k) => z[k].kanten)
      .map((k) => `${{ frei: 'frei', ansatz: 'Ansatz', kappe: 'Kappe', kante: 'Kante', spitze: 'Spitze' }[k]} ${z[k].max.toFixed(0)}°/${z[k].ueber20}`)
      .join(', ');
  if (process.env.NAH_PUNKT) {
    // eigener Ausschnitt: "Name:x,y,z,r;Name:…" in px bei 461
    const eintrag = process.env.NAH_PUNKT.split(';').map((t) => t.split(':')).find(([n]) => n === name);
    if (eintrag) nah = eintrag[1]!.split(',').map((v) => Number(v) / 461);
  } else if (process.env.NAH) {
    // Mitte des ersten seitlichen Ansatzes (Sehne), etwas zur Seite; Ausschnitt so groß wie die Sehne
    const e0 = baumAbleiten(dok, OPT).ebene;
    const an = e0.streifen.find((st) => st.ansatz?.art === 'seitlich')?.ansatz;
    if (an) {
      const L = Math.hypot(an.B.x - an.A.x, an.B.y - an.A.y);
      nah = [(an.A.x + an.B.x) / 2, (an.A.y + an.B.y) / 2, 0.15 * L, 0.9 * L];
    }
  }
  if (VARIANTEN) {
    for (const [art, o] of Object.entries(VARIANTEN)) {
      const b = baumAbleiten(dok, o);
      const nb = baumFeinesNetz(b);
      const sprossen = b.ringe.flatMap((r) => r.sprossen.map((sp) => [sp.o.x, sp.o.y, 0, sp.u.x, sp.u.y, 0]));
      const z = faltenNachZonen(b.kaefig, b.unterteilung, b.fein, baumFalten(b)).zonen;
      fall(`${art} (${b.ebene.streifen.length} Streifen${b.seiten.length ? ` + ${b.seiten.length} seitlich` : ''})`, nb.punkte, nb.flaechen, sprossen, [], zonenText(z), b.zeiten.gesamt, b.seiten.length > 0);
    }
    continue;
  }
  // heute
  const abl = ableiten(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
  const n3 = feinesNetz(abl);
  const l = kernLeiter(dok);
  fall(
    'S3 heute',
    n3.punkte,
    n3.flaechen,
    abl.stationen.map((s) => {
      const o = zugBei(l.ruecken, s.a);
      const u = zugBei(l.bauch, s.b);
      return [o.x, o.y, 0, u.x, u.y, 0];
    }),
    [],
    zonenText(faltenNachZonenRoehre(abl).zonen),
    abl.zeiten.gesamt,
  );
  // Baum
  try {
    const b = baumAbleiten(dok, OPT);
    const nb = baumFeinesNetz(b);
    const sprossen = b.ringe.flatMap((r) => r.sprossen.map((sp) => [sp.o.x, sp.o.y, 0, sp.u.x, sp.u.y, 0]));
    const z = faltenNachZonen(b.kaefig, b.unterteilung, b.fein, baumFalten(b)).zonen;
    fall(`Baum (${b.ebene.streifen.length} Streifen)`, nb.punkte, nb.flaechen, sprossen, [], zonenText(z), b.zeiten.gesamt);
  } catch (err) {
    faelle.push({ name: `${name} · Baum`, text: `<b>${name} · Baum</b> · Bau scheitert: ${(err as Error).message}`, daten: null });
  }
}
const out = resolve(AUSGABE, `${NAME}.html`);
writeFileSync(out, bogenHtml('S5 Mittelebenen-Baum gegen S3 (eine Röhre)', faelle));
console.log(out);
