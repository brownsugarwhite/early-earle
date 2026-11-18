// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4-Tor „kein Wechsel der Einordnung in 30-Schritt-Zügen unter 10 px“: je
// Körper des Prüfsatzes Knoten aller drei Zeichnungen in 30 Schritten um 10 px ziehen (vier Richtungen), nach jedem
// Schritt neu lesen — mit eingefrorenem Baum (Hysterese, wie im Editor) und zum Vergleich ohne. Gezählt werden Züge, in
// denen sich die Einordnung (Art, Richtung und Kennung der Teile) ändert, und wie oft sie hin und her springt.
// Umgebung: KOERPER (Komma-Liste), KNOTEN (höchstens so viele je Zeichnung, Standard 6), SCHRITTE (30), PIXEL (10).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teile-zuege.ts
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { verschiebeKnoten } from '../../../../packages/shape/src/profil';
import { type GefrorenerTeilbaum, type Teilbaum, teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { TEIL_SATZ_KOERPER, teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';

const liste = (process.env.KOERPER ?? TEIL_SATZ_KOERPER.join(',')).split(',');
const KNOTEN = Number(process.env.KNOTEN ?? 6);
const SCHRITTE = Number(process.env.SCHRITTE ?? 30);
const PIXEL = Number(process.env.PIXEL ?? 10);
/** OHNE=1: zum Vergleich auch ohne eingefrorenen Baum lesen (doppelte Zeit) */
const OHNE = process.env.OHNE === '1';
const sig = (b: Teilbaum) => b.teile.slice(1).map((t) => `${t.id}:${t.art}:${t.richtung}`).sort().join(',');
let zuegeGesamt = 0;
let wechselMit = 0;
let flackernMit = 0;
let wechselOhne = 0;
let flackernOhne = 0;
let zeitMax = 0;
const auffaellig: string[] = [];
for (const name of liste) {
  const basis = teilSatzDokument(name);
  const start = teilbaum(basis);
  const s0 = sig(start);
  let z = 0;
  let wm = 0;
  let wo = 0;
  for (const blatt of ['seite', 'front', 'top'] as const) {
    const n = basis.profile[blatt].knoten.length;
    const schritt = Math.max(1, Math.floor(n / KNOTEN));
    for (let i = 0; i < n; i += schritt) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const d = PIXEL / 461 / basis.skalierung;
        let vorher: GefrorenerTeilbaum = start.gefroren;
        const folgeMit: string[] = [s0];
        const folgeOhne: string[] = OHNE ? [sig(teilbaum(basis))] : [];
        for (let k = 1; k <= SCHRITTE; k++) {
          const f = (d * k) / SCHRITTE;
          const dok: Dokument = { ...basis, profile: { ...basis.profile, [blatt]: verschiebeKnoten(basis.profile[blatt], [i], { x: dx * f, y: dy * f }) } };
          const b = teilbaum(dok, vorher);
          zeitMax = Math.max(zeitMax, b.zeit);
          vorher = b.gefroren;
          folgeMit.push(sig(b));
          if (OHNE) folgeOhne.push(sig(teilbaum(dok)));
        }
        const wechsel = (f: string[]) => f.slice(1).filter((x, k) => x !== f[k]).length;
        const w1 = wechsel(folgeMit);
        const w2 = OHNE ? wechsel(folgeOhne) : 0;
        z++;
        if (w1) {
          wm++;
          wechselMit++;
          if (w1 > 1) flackernMit++;
          auffaellig.push(`${name} ${blatt} Knoten ${i} (${dx},${dy}): ${w1} Wechsel mit Hysterese · ${folgeMit[0]} → ${folgeMit[SCHRITTE]}`);
        }
        if (w2) {
          wo++;
          wechselOhne++;
          if (w2 > 1) flackernOhne++;
        }
      }
    }
  }
  zuegeGesamt += z;
  console.log(`${name.padEnd(14)} ${String(z).padStart(3)} Züge · mit Hysterese ${wm} mit Wechsel · ohne ${wo}`);
}
console.log(`\n${zuegeGesamt} Züge: mit Hysterese ${wechselMit} mit Wechsel (${flackernMit} hin und her), ohne Hysterese ${wechselOhne} (${flackernOhne} hin und her); Bau höchstens ${zeitMax.toFixed(0)} ms`);
for (const a of auffaellig) console.log('  ' + a);
