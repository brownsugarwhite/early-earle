// Plan vom 12.11.2026, Schritt 6, zweite Fassung (13.11. abends): „Maul formen“ wie in Florians Modell `simple_mouth`.
// Florian: „keinerlei Extrapunkte im Innenbereich […] Nur die Handles zum Innenraum an den beiden Lippenkreuzungen zeigen von der
// Seite deutlich ins Maulinnere, ca. 90 bis 100 Grad von der Lippenkante von der Seite. Es bildet sich automatisch eine schöne
// abgerundete Maultasche.“
//
// Die Probe formt das Maul im Kern (`maulFormen`) an einer Kugel mit der schmalen Form ums Maul und schreibt je Abschnitt eine
// Zeile: Punkte, umgeschlagene Dreiecke, wie weit sich die Haut hinter dem Maul bewegt hat, Zeit. Mit AUS=<datei.html> dazu ein
// Bildblatt: links Florians Modell, rechts das automatisch geformte.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-maul-einfach.ts
//   MITTE=1 (vorher eine Mittellinie mit Punkten, wie von Hand gezogen)   OHNE_MITTE=1 (die nur zum Formen angelegte Mittellinie am
//   Ende wieder entfernen, wie in „simple_mouth_more simple“)   STUFEN=8   SCHRITTE=8   KNICK=95   TIEFE=0.55
//   DREIECKE=2000 (Startnetz wie im Fenster)   VERGLEICH=simple_mouth   AUS=<datei.html>
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, formAusZeichnung, griffeAnlegen, hautLagen, istSichtbar, kanteBei, knickAm, loopAusSchnitt, mittlereKante, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { maulFormen } from '../../../../packages/shape/src/dicht/maulFormen';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { type BlattBild, type BlattLinie, type BlattSchnitt, type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { formLaden, verdichtenWieImFenster } from './form-direkt-faelle';

const MITTE = process.env.MITTE === '1';
const STUFEN = Number(process.env.STUFEN ?? 8);
const SCHRITTE = Number(process.env.SCHRITTE ?? 8);
const KNICK = Number(process.env.KNICK ?? 95);
const TIEFE = Number(process.env.TIEFE ?? 0.55);
const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const VERGLEICH = process.env.VERGLEICH ?? 'simple_mouth';
const AUS = process.env.AUS ?? '';
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });

// die Kugel des Fensters mit der schmalen Form ums Maul (in der Seite vorn über den Umriss gezeichnet, wie mit F)
const netz = rundAusSeite(
  [
    { x: 150, y: 0 },
    { x: 0, y: 150 },
    { x: -150, y: 0 },
    { x: 0, y: -150 },
  ],
  { dreiecke: DREIECKE },
);
let h: Haut = hautAus(netz.positionen, netz.indizes);
const mk = mittlereKante(h);
let loops: Loop[] = [];
let id = 1;
if (MITTE) {
  const r = loopEinsetzen(h, [loopAusSchnitt(h, 'top', [-600, 0], [600, 0], id++, 8)!], 0)!;
  h = r.haut;
  loops = r.loops;
  // Punkte wie von Hand gesetzt (Doppelklick auf die Linie), dann die Griffe genau
  const m = loops[0]!;
  for (let k = 0; k < 4; k++) punktEinfuegen(m, ((k + 0.5) / 4) * m.laenge);
  griffeAnlegen(m, m.ruhe, true);
}
{
  const n = 64;
  const uv = Array.from({ length: n }, (_, i): [number, number] => [-115 + 60 * Math.cos((2 * Math.PI * i) / n), -20 + 14 * Math.sin((2 * Math.PI * i) / n)]);
  const knoten = Array.from({ length: n / 8 }, (_, i) => 8 * i);
  const r = loopEinsetzen(h, [...loops, formAusZeichnung(h, 'seite', uv, knoten, id++)!], loops.length)!;
  h = r.haut;
  loops = r.loops;
  griffeAnlegen(loops[loops.length - 1]!, loops[loops.length - 1]!.ruhe, true);
}
const maul = loops[loops.length - 1]!;
console.log(`Kugel: ${h.n} Punkte, mittlere Kante ${z1(mk)}; ${loops.length} Loops${MITTE ? ` (Mittellinie mit ${loops[0]!.punkte.length} Punkten)` : ''}; Maullinie mit ${maul.punkte.length} Punkten`);

/** Knick der Haut an beiden Enden des Rings, im Schnitt durch die Mitte (Grad), und die Tiefe der Tasche (weitester Punkt des Schnitts hinter der Mitte der Lippen, in Richtung Mundwinkel) */
function lippen(H: Haut, l: Loop): string {
  const out: string[] = [];
  const enden = [l.proben[0]!.ecken[0], l.proben[l.proben.length - 1]!.ecken[0]];
  for (const v of enden) {
    const p = lage(H.pos, v);
    const r = H.nachbarn[v]!.filter((u) => Math.abs(H.pos[3 * u + 2]!) < 1e-6).map((u) => ({ x: H.pos[3 * u]! - p.x, y: H.pos[3 * u + 1]! - p.y }));
    if (r.length !== 2) {
      out.push('?');
      continue;
    }
    const c = (r[0]!.x * r[1]!.x + r[0]!.y * r[1]!.y) / (Math.hypot(r[0]!.x, r[0]!.y) * Math.hypot(r[1]!.x, r[1]!.y));
    out.push(`${z1(180 - (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI)}°`);
  }
  // die Tasche: Punkte der Mittelebene, die über den Schnitt mit einem Ende verbunden sind, ohne den Ring zu verlassen (innen)
  const a = lage(H.pos, enden[0]!);
  const b = lage(H.pos, enden[1]!);
  const W = l.punkte.find((q) => q.mundwinkel);
  if (!W) return `Knick an den Lippen ${out.join(' und ')}`;
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const zu = { x: W.ref.x - m.x, y: W.ref.y - m.y };
  const weite = Math.hypot(zu.x, zu.y);
  // von einem Ende aus den Schnitt entlang, auf der Seite, die zum Mundwinkel hin beginnt, bis zum anderen Ende
  let tief = 0;
  for (const start of H.nachbarn[enden[0]!]!.filter((u) => Math.abs(H.pos[3 * u + 2]!) < 1e-6)) {
    let vor = enden[0]!;
    let v = start;
    let t = 0;
    let ok = false;
    for (let k = 0; k < 400; k++) {
      if (v === enden[1]) {
        ok = true;
        break;
      }
      const q = lage(H.pos, v);
      t = Math.max(t, ((q.x - m.x) * zu.x + (q.y - m.y) * zu.y) / (weite * weite));
      const weiter = H.nachbarn[v]!.find((u) => u !== vor && Math.abs(H.pos[3 * u + 2]!) < 1e-6 && H.nachbarn[u]!.includes(v));
      if (weiter === undefined) break;
      vor = v;
      v = weiter;
    }
    if (ok && k_innen(H, enden, start)) tief = t;
  }
  return `Knick an den Lippen ${out.join(' und ')}, Tasche ${z2(tief)} des Wegs zum Mundwinkel`;
}
/** der Weg von einem Ende zum anderen ist der kürzere (durchs Maul) */
function k_innen(H: Haut, enden: number[], start: number): boolean {
  let vor = enden[0]!;
  let v = start;
  let zahl = 0;
  for (let k = 0; k < 4000 && v !== enden[1]; k++) {
    const weiter = H.nachbarn[v]!.find((u) => u !== vor && Math.abs(H.pos[3 * u + 2]!) < 1e-6);
    if (weiter === undefined) return false;
    vor = v;
    v = weiter;
    zahl++;
  }
  return zahl < 60;
}

const vorher = Float64Array.from(h.pos);
let t = Date.now();
const r = maulFormen(h, loops, maul.id, {
  naechsteId: id,
  naechsteKreuzung: 1,
  stufen: STUFEN,
  schritte: SCHRITTE,
  knick: KNICK,
  tiefe: TIEFE,
  verdichten: { maxKante: 1.75 * mk, opt: verdichtenWieImFenster(mk) },
  ohneMitte: process.env.OHNE_MITTE === '1',
  zwischen: (was, hz, lz, alt) => {
    let weit = 0;
    let endlich = true;
    for (let v = 0; v < hz.n; v++) {
      if (!Number.isFinite(hz.pos[3 * v]!)) endlich = false;
      const a = alt[v]!;
      if (a < 0 || vorher[3 * a]! < -40) continue;
      weit = Math.max(weit, Math.hypot(hz.pos[3 * v]! - vorher[3 * a]!, hz.pos[3 * v + 1]! - vorher[3 * a + 1]!, hz.pos[3 * v + 2]! - vorher[3 * a + 2]!));
    }
    const f = endlich ? falten(hz) : null;
    console.log(
      `   ${was.padEnd(12)} ${String(hz.n).padStart(5)} Punkte, ${lz.length} Loops; ${endlich ? `umgeschlagen ${f!.umgeklappt}, Knicke über 60° ${f!.ueber60}; hinter dem Maul bis ${z2(weit)} bewegt; ${lippen(hz, lz.find((l) => l.id === maul.id)!)}` : 'LAGEN NICHT ENDLICH'}; ${Date.now() - t} ms`,
    );
    t = Date.now();
  },
});
if ('fehler' in r) {
  console.log(`geht so nicht: ${r.fehler}`);
  process.exit(1);
}
const L = r.loops.find((l) => l.id === maul.id)!;
const M = r.loops.find((l) => l.id === r.mitte);
const f1 = falten(r.haut);
const knicke = M ? M.punkte.map((p, i) => (L.punkte.some((q) => q.kreuzung !== undefined && q.kreuzung === p.kreuzung) ? `${z1(knickAm(M, i))}°` : null)).filter(Boolean) : [];
const mitteText = M ? `Mittellinie ${r.mitteNeu ? 'neu angelegt' : 'vorhanden'} mit ${M.punkte.length} Punkten, ihr Knick an den Lippen ${knicke.join(' und ')}` : 'keine Mittellinie (sie war nur das Gerüst zum Formen)';
const titelMitte = MITTE ? ' mit Mittellinie' : process.env.OHNE_MITTE === '1' ? ' ohne weitere Linien, die Mittellinie am Ende wieder entfernt' : ' ohne weitere Linien';
console.log(
  `geformt: ${r.haut.n} Punkte, ${r.runden} Runden, ${r.steht ? 'steht' : 'STEHT NICHT'}; umgeschlagen ${f1.umgeklappt}; ${r.loops.length} Loops; ${mitteText}; ` +
    `Maullinie mit ${L.punkte.filter(istSichtbar).length} sichtbaren Punkten; ${lippen(r.haut, L)}`,
);

if (AUS) {
  const schnitt = (H: Haut, dx: number, dy: number, mass: number): BlattSchnitt => {
    const strecken: number[] = [];
    for (let k = 0; k < H.tri.length; k += 3) {
      const pkt: [number, number][] = [];
      for (let e = 0; e < 3; e++) {
        const a = lage(H.pos, H.tri[k + e]!);
        const b = lage(H.pos, H.tri[k + ((e + 1) % 3)]!);
        if (Math.abs(a.z) < 1e-9) pkt.push([a.x, a.y]);
        else if (Math.abs(b.z) > 1e-9 && a.z * b.z < 0) {
          const g = a.z / (a.z - b.z);
          pkt.push([a.x + g * (b.x - a.x), a.y + g * (b.y - a.y)]);
        }
      }
      if (pkt.length === 2) strecken.push(pkt[0]![0] + dx, pkt[0]![1] + dy, pkt[1]![0] + dx, pkt[1]![1] + dy);
    }
    return { titel: 'Schnitt durch die Mitte (das Maul von der Seite)', strecken, mass, hoch: 0.6 };
  };
  const bild = (name: string, H: Haut, Ls: readonly Loop[], notiz: string, dx: number, dy: number, mass: number): BlattBild => {
    const linien: BlattLinie[] = Ls.flatMap((l) => {
      const p = Array.from(hautLagen(H, l));
      const zu = l.art !== 'ring';
      const K = kanteBei(l, Ls);
      const hart = K.reduce((a, b) => a + b, 0) > K.length / 2 ? 1 : 0;
      return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    const punkte = Ls.flatMap((l) => l.punkte.filter(istSichtbar).flatMap((p) => (Math.abs(p.ref.z) < 1e-6 ? [[p.ref.x, p.ref.y, p.ref.z]] : [[p.ref.x, p.ref.y, p.ref.z], [p.ref.x, p.ref.y, -p.ref.z]])));
    return { name, h: H, loops: [], notiz, fertig: { linien, punkte }, schnitt: schnitt(H, dx, dy, mass) };
  };
  const blicke = [
    ['Seite', 0, 0, 0.8],
    ['schräg von vorn', 50, 12, 0.8],
  ] as const;
  const zeilen: BlattZeile[] = [];
  const bilder: BlattBild[] = [];
  let mitte: [number, number, number] = [0, 0, 0];
  let mass = 430;
  if (VERGLEICH) {
    const v = formLaden(VERGLEICH);
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let k = 0; k < v.h.n; k++) {
      const p = lage(v.h.pos, k);
      xMin = Math.min(xMin, p.x);
      xMax = Math.max(xMax, p.x);
      yMin = Math.min(yMin, p.y);
      yMax = Math.max(yMax, p.y);
    }
    mitte = [(xMin + xMax) / 2, (yMin + yMax) / 2, 0];
    mass = 1.15 * Math.max(xMax - xMin, yMax - yMin);
    const fv = falten(v.h);
    zeilen.push({
      titel: `Florians Modell „${VERGLEICH}“: zwei Loops, keine Punkte im Maul; die Mittellinie knickt an beiden Lippen ins Maul`,
      bilder: [bild(`„${VERGLEICH}“, von Hand`, v.h, v.loops, `${v.h.n} Punkte; umgeschlagen ${fv.umgeklappt}`, -mitte[0], -mitte[1], mass)],
      blicke,
      mass,
      mitte,
    });
  }
  bilder.push(bild('vorher: die schmale Form ums Maul auf der Kugel', h, loops, `${h.n} Punkte`, 0, 0, 430));
  bilder.push(
    bild(
      'nachher: „Maul formen“',
      r.haut,
      r.loops,
      `${r.steht ? 'steht' : 'steht nicht'}; umgeschlagen ${f1.umgeklappt}; ${r.loops.length} Loops; ${mitteText}; ${lippen(r.haut, L)}`,
      0,
      0,
      430,
    ),
  );
  zeilen.push({
    titel: `„Maul formen“ an der Kugel${titelMitte}: Lippen hart, die Mittellinie knickt an beiden Lippen um ${KNICK}° ins Maul; nichts geschnitten, keine Punkte im Maul`,
    bilder,
    blicke,
    mass: 430,
    mitte: [0, 0, 0],
  });
  blattSchreiben(
    AUS,
    'Schritt 6, zweite Fassung: „Maul formen“ wie in Florians Modell (13.11.2026)',
    zeilen,
    1340,
    'Blaue Linien: Loops, schwarz: Kante an. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist. Unter jedem Bild der Schnitt durch die Mitte.',
  );
  console.log(`Bildblatt: ${AUS}`);
}
