// Plan vom 12.11.2026, Schritt 4b: die Rechnung auf der Hälfte (13.11.). Im Kern ohne Fenster: dieselbe Form, derselbe Zug, einmal
// wie bisher über die ganze Haut gelöst, einmal auf die Hälfte gefaltet (`HautOptionen.halb`). Gemessen wird:
//   - das Zerlegen beim Greifen (ms)
//   - eine Runde (ms; Anteile: vermessen, intrinsisch, Krümmung verteilen, Lagen lösen)
//   - wie weit die beiden Häute am Ende auseinander liegen (sie sollen dieselbe Form sein)
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-halb.ts
//   NAME="teat firefish,strange bird,test_kaputt" (gesicherte Formen, wie das Fenster sie lädt)   ZUG="0,40,0"   SCHRITTE=20   ENDE=20
//   MAL=3 (so oft, die schnellste Zeit zählt)   NUR=ganz|halb (nur eine der beiden Rechnungen)
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, istSichtbar, pfadLagen } from '../../../../packages/shape/src/dicht/loops';
import { formLaden } from './form-direkt-faelle';

const NAMEN = (process.env.NAME ?? 'test_kaputt,strange bird,teat firefish').split(',');
const [zx, zy, zz] = (process.env.ZUG ?? '0,40,0').split(',').map(Number) as [number, number, number];
const SCHRITTE = Number(process.env.SCHRITTE ?? 20);
const ENDE = Number(process.env.ENDE ?? 20);
const MAL = Number(process.env.MAL ?? 3);
const NUR = process.env.NUR ?? '';
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const z4 = (x: number): string => x.toFixed(4).replace('.', ',');
const jetzt = (): number => performance.now();

type Lauf = { zerlegen: number; runde: number; anteile: string; pos: Float64Array; runden: number };

/** der Zug: der höchste sichtbare Punkt um ZUG, in Schritten, dann Runden am Ende */
function lauf(h0: Haut, loops0: readonly Loop[], halb: boolean): Lauf {
  let best: Lauf | null = null;
  for (let mal = 0; mal < MAL; mal++) {
    const h: Haut = { ...h0, pos: Float64Array.from(h0.pos) };
    const loops: Loop[] = loops0.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));
    let wahl: { li: number; i: number; y: number; kreuzung: number | undefined } | null = null;
    loops.forEach((l, li) =>
      l.punkte.forEach((p, i) => {
        if (istSichtbar(p) && (!wahl || p.ref.y > wahl.y)) wahl = { li, i, y: p.ref.y, kreuzung: p.kreuzung };
      }),
    );
    const w = wahl!;
    const t0 = jetzt();
    const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { halb });
    const zerlegen = jetzt() - t0;
    // die Linien auf ihren Pfaden, der gewählte Punkt (an einer Kreuzung alle seine Punkte) verschoben
    const ziel = loops.map((l) => {
      const P = l.punkte.map((p) => (p === loops[w.li]!.punkte[w.i] || (w.kreuzung !== undefined && p.kreuzung === w.kreuzung) ? { x: p.ref.x + zx, y: p.ref.y + zy, z: p.ref.z + zz } : p.ref));
      return pfadLagen(l, P) ?? Float64Array.from(l.ruhe);
    });
    const versch = loops.map((l, i) => Float64Array.from(ziel[i]!, (x, k) => x - l.ruhe[k]!));
    const zeiten = (z.loeser as unknown as { zeiten: { runden: number; vermessen: number; intrinsisch: number; kruemmung: number; schritte: number; loesen: number } }).zeiten;
    const t1 = jetzt();
    for (let s = 1; s <= SCHRITTE; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / SCHRITTE)), 2);
    z.schritt(versch, ENDE);
    const dauer = jetzt() - t1;
    const runde = dauer / zeiten.runden;
    const rest = dauer - zeiten.vermessen - zeiten.intrinsisch - zeiten.kruemmung - zeiten.loesen;
    const anteil = (x: number): string => `${Math.round((100 * x) / dauer)} %`;
    const r: Lauf = {
      zerlegen,
      runde,
      runden: zeiten.runden,
      anteile: `vermessen ${anteil(zeiten.vermessen)}, intrinsisch ${anteil(zeiten.intrinsisch)}, Krümmung ${anteil(zeiten.kruemmung)} (${z1(zeiten.schritte / zeiten.runden)} Schritte), Lagen lösen ${anteil(zeiten.loesen)}, Rest ${anteil(rest)}`,
      pos: h.pos,
    };
    // das Zerlegen zählt nur beim ersten Mal (danach hat der Kern die Zerlegung gemerkt), bei der Runde die schnellste
    if (!best) best = r;
    else if (r.runde < best.runde) best = { ...r, zerlegen: best.zerlegen };
  }
  return best!;
}

for (const name of NAMEN) {
  const { h, loops } = formLaden(name);
  console.log(`${name}: ${h.n} Punkte, ${loops.length} Loops; Zug (${zx}, ${zy}, ${zz}) am höchsten Punkt, ${SCHRITTE} Schritte zu 2 Runden und ${ENDE} Runden am Ende`);
  const ganz = NUR === 'halb' ? null : lauf(h, loops, false);
  if (ganz) console.log(`   ganz: Zerlegen ${z1(ganz.zerlegen)} ms, Runde ${z2(ganz.runde)} ms (${ganz.anteile})`);
  const halb = NUR === 'ganz' ? null : lauf(h, loops, true);
  if (halb) console.log(`   halb: Zerlegen ${z1(halb.zerlegen)} ms, Runde ${z2(halb.runde)} ms (${halb.anteile})`);
  if (ganz && halb) {
    let weit = 0;
    let summe = 0;
    for (let i = 0; i < ganz.pos.length; i += 3) {
      const d = Math.hypot(ganz.pos[i]! - halb.pos[i]!, ganz.pos[i + 1]! - halb.pos[i + 1]!, ganz.pos[i + 2]! - halb.pos[i + 2]!);
      weit = Math.max(weit, d);
      summe += d;
    }
    const f = falten({ ...h, pos: halb.pos });
    console.log(`   halb gegen ganz: Zerlegen ${Math.round((100 * halb.zerlegen) / ganz.zerlegen)} %, Runde ${Math.round((100 * halb.runde) / ganz.runde)} %; die Häute liegen höchstens ${z4(weit)} auseinander (im Mittel ${z4(summe / h.n)}); halb: Knicke über 60° ${f.ueber60}, umgeklappt ${f.umgeklappt}`);
  }
}
