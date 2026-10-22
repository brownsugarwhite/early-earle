// Zufallsreihe (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil V): Prüffälle ziehen, wie im Editor bauen,
// gegen den Körper ohne Maul messen, Verstöße gegen die Schwellen der neuen Bauweise zählen. Die erste Reihe ist die
// Ausgangslage (heutiger Maulbau), jede spätere Stufe muss sie in allen Klassen schlagen.
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/zufallsreihe.ts
//   START=<Startwert> ANZAHL=<n> NUR=<Teil der Fall-Kennung> OEFFNUNGEN=0,0.5,1 KIEFER=0 (ohne Kieferprobe)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Fall, type FallDokumente, faelleZiehen, fallDokumente } from '../../../../packages/shape/src/kern/pruefen/faelle';
import { type FallMasse, type Verstoss, fallMessen, schwere, verstoesse } from '../../../../packages/shape/src/kern/pruefen/masse';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const START = Number(process.env.START ?? 20261015);
const ANZAHL = Number(process.env.ANZAHL ?? 200);
const nur = process.env.NUR?.split(',');
const oeffnungen = process.env.OEFFNUNGEN ? process.env.OEFFNUNGEN.split(',').map(Number) : undefined;
const mitKiefer = process.env.KIEFER !== '0';

type Eintrag = { fall: Fall; fehler?: string; masse?: FallMasse; verstoesse?: Verstoss[]; schwere?: number; dok?: unknown; maul?: FallDokumente['maul'] };
// FILTER=achse=wert|wert;achse=wert …: nur passende Fälle (aus einem großen Vorrat gezogen), z. B. die einfachsten Mäuler
const filter = (process.env.FILTER ?? '')
  .split(';')
  .filter(Boolean)
  .map((s) => s.split('=') as [keyof Fall, string])
  .map(([k, v]) => [k, v.split('|')] as const);
const passt = (f: Fall) => filter.every(([k, werte]) => werte.includes(String(f[k])));
const faelle = (filter.length ? faelleZiehen(START, 40000).filter(passt).slice(0, ANZAHL) : faelleZiehen(START, ANZAHL)).filter((f) => !nur || nur.some((n) => f.id.includes(n)));
const eintraege: Eintrag[] = [];
const t0 = Date.now();
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '∞');
for (const fall of faelle) {
  let fd: ReturnType<typeof fallDokumente>;
  try {
    fd = fallDokumente(fall);
  } catch (e) {
    eintraege.push({ fall, fehler: `Dokument: ${String(e).slice(0, 160)}` });
    console.log(`${fall.id.padEnd(58)} DOKUMENT-FEHLER ${String(e).slice(0, 90)}`);
    continue;
  }
  if ('fehler' in fd) {
    eintraege.push({ fall, fehler: `ungültig: ${fd.fehler}` });
    console.log(`${fall.id.padEnd(58)} ungültig: ${fd.fehler}`);
    continue;
  }
  try {
    const m = fallMessen(fd, { ...(oeffnungen ? { oeffnungen } : {}), kiefer: mitKiefer });
    const v = verstoesse(m, fall.kiefer === 'gleich');
    const s = schwere(v);
    eintraege.push({ fall, masse: m, verstoesse: v, schwere: s, dok: fd.dok, maul: fd.maul });
    const lu = m.lippe.unten;
    console.log(
      `${fall.id.padEnd(58)} Schwere ${f1(s).padStart(6)} · fern ${f1(m.formtreue.fern.max)} nah ${f1(m.formtreue.nah.max)} px · Δ ${f1(m.delta.mit.seite)}/${f1(m.delta.mit.front)}/${f1(m.delta.mit.top)} (ohne ${f1(m.delta.ohne.seite)}/${f1(m.delta.ohne.front)}/${f1(m.delta.ohne.top)}) · Lippe ${f1(Math.max(m.lippe.oben.seite, m.lippe.oben.front))}${lu ? `/${f1(Math.max(lu.seite, lu.front))}` : ''} · Faltenzuwachs ${f1(m.falten.fern.max)}/${f1(m.falten.nah.max)}° · umgekl. ${m.umgeklappt} · Paare ${m.paare.map((p) => p.haut).join('/')} · ${Math.round(m.zeit.mitMaul)} ms`,
    );
  } catch (e) {
    eintraege.push({ fall, fehler: `Bau: ${String(e).slice(0, 160)}`, dok: fd.dok, maul: fd.maul });
    console.log(`${fall.id.padEnd(58)} BAU-FEHLER ${String(e).slice(0, 90)}`);
  }
}
const dauer = (Date.now() - t0) / 1000;

// Zusammenfassung je Achse: gebaut, mit Verstoß, Median der Schwere, schlimmste Fälle
type Zeile = { wert: string; n: number; gebaut: number; ungueltig: number; baufehler: number; verstoss: number; medianSchwere: number };
const achsen = ['koerper', 'anfang', 'form', 'laenge', 'kiefer', 'bearbeitung'] as const;
const zusammenfassung: Record<string, Zeile[]> = {};
const median = (w: number[]) => (w.length ? [...w].sort((a, b) => a - b)[Math.floor((w.length - 1) / 2)]! : 0);
for (const a of achsen) {
  const gruppen = new Map<string, Eintrag[]>();
  for (const e of eintraege) {
    const k = String(e.fall[a]);
    gruppen.set(k, [...(gruppen.get(k) ?? []), e]);
  }
  zusammenfassung[a] = [...gruppen].map(([wert, l]) => ({
    wert,
    n: l.length,
    gebaut: l.filter((e) => e.masse).length,
    ungueltig: l.filter((e) => e.fehler?.startsWith('ungültig')).length,
    baufehler: l.filter((e) => e.fehler && !e.fehler.startsWith('ungültig')).length,
    verstoss: l.filter((e) => (e.verstoesse?.length ?? 0) > 0).length,
    medianSchwere: median(l.filter((e) => e.schwere !== undefined).map((e) => e.schwere!)),
  }));
}
// häufigste Verstöße
const haeufig = new Map<string, number>();
for (const e of eintraege) for (const v of e.verstoesse ?? []) haeufig.set(v.mass.replace(/ (seite|front|top)$/, ''), (haeufig.get(v.mass.replace(/ (seite|front|top)$/, '')) ?? 0) + 1);

console.log(`\n${eintraege.length} Fälle in ${dauer.toFixed(0)} s (Startwert ${START})`);
for (const a of achsen) {
  console.log(`\n${a}:`);
  for (const z of zusammenfassung[a]!) console.log(`  ${z.wert.padEnd(18)} n ${String(z.n).padStart(3)} · gebaut ${String(z.gebaut).padStart(3)} · ungültig ${String(z.ungueltig).padStart(2)} · Baufehler ${String(z.baufehler).padStart(2)} · mit Verstoß ${String(z.verstoss).padStart(3)} · Median Schwere ${f1(z.medianSchwere)}`);
}
console.log('\nhäufigste Verstöße:');
for (const [m, n] of [...haeufig].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)} × ${m}`);

mkdirSync(AUSGABE, { recursive: true });
const datei = resolve(AUSGABE, `zufallsreihe-${START}-${ANZAHL}${nur ? '-auswahl' : ''}${process.env.NAME ? `-${process.env.NAME}` : ''}.json`);
writeFileSync(datei, JSON.stringify({ start: START, anzahl: ANZAHL, dauer, zusammenfassung, haeufig: Object.fromEntries(haeufig), eintraege }));
console.log(`\n→ ${datei}`);
