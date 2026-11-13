// Plan vom 12.11.2026, Schritt 6, „Kanten neu“ (13.11. abends): kleiner Beweis „die Kante trägt ihren Winkel selbst“.
// Florian: „Bei der Maulkante ohne Punkte muss dann eingestellt sein, dass das Maul vom Lippenstart von der Seite mit je 90 bis 100
// Grad eingeknickt ist, auch ohne Punkt, und beim Mundwinkel ca. 70 Grad nach innen abknicken.“ Auf die Rückfrage, was die 70°
// meinen: „Ja, es meint den Knick quer an den Mundwinkeln nach innen. Mache gerne erstmal das bzw. den Beweis.“
//
// Heute ergibt sich der Winkel an einer Kante aus der Form; einstellen lässt er sich nur über die Griffe einer kreuzenden Linie.
// Ohne kreuzende Linie landet die Haut je nach Netz woanders (`form-maul-einfach.ts` mit OHNE_MITTE=1: 93°/100° oder 39°/68°).
//
// Die Kante bekommt je Stelle einen Winkel (an den Lippen LIPPE, am Mundwinkel WINKEL, dazwischen gleitend: `LoopPunkt.knick`). Die
// erste Reihe der Haut innen an der Linie wird in jeder Runde geführt: jeder ihrer Punkte um die Linie gedreht, bis er um diesen
// Winkel gegen die Haut außen abknickt (nach innen, also in den Körper); sein Abstand zur Linie bleibt. Für den Löser ist die
// Reihe eine Liste von Bindungen (ein Loop ohne Kette, der nur Orte hält). Alles Weitere im Maul rundet die Rechnung wie sonst.
// Keine Mittellinie, kein Punkt außer dem Mundwinkel. Gedreht wird in Stufen, dazwischen verfeinert wie nach einem Zug.
//
// Der erste Lauf des Beweises (13.11., 21:20 Uhr) hatte das alles in dieser Probe; seit Etappe 1 des Einbaus steht es im Kern
// (`packages/shape/src/dicht/kantenWinkel.ts`, geführt von `LoopZug`), und die Probe formt mit `maulFormen` (Weg „Kante“).
//
// Kriterium (vorher im Plan festgelegt): Kugel mit Maullinie, ohne weitere Linien, auf zwei Netzen: Knick an beiden Lippen 90 bis
// 100°, am Mundwinkel 65 bis 75°, auf beiden Netzen höchstens 5° auseinander; die Haut steht, nichts schlägt um.
//
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-kante-winkel.ts
//   DREIECKE=2000 (Startnetz wie im Fenster; 3000: das feinere)   LIPPE=95   WINKEL=70   STUFEN=12   SCHRITTE=6
//   NAME=<gesicherte Form> (statt der Kugel: ihre Linie mit dem Mundwinkel ist die Maullinie; RING=<Nummer des Loops> wählt sie)
//   LOSLASSEN=1 (danach ohne die Führung weiterrechnen: zeigt, dass der Winkel nur hält, solange die Kante ihn trägt)
//   AUS=<datei.html> (Bildblatt)
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type KnickReihe, knickQuer, knickReihe } from '../../../../packages/shape/src/dicht/kantenWinkel';
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, formAusZeichnung, griffeAnlegen, hautLagen, istSichtbar, kanteBei, mittlereKante, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { maulFormen } from '../../../../packages/shape/src/dicht/maulFormen';
import { mundwinkelProbe } from '../../../../packages/shape/src/dicht/maulLoop';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { type BlattBild, type BlattLinie, type BlattSchnitt, blattSchreiben } from './form-direkt-blatt';
import { formLaden, verdichtenWieImFenster } from './form-direkt-faelle';

const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const LIPPE = Number(process.env.LIPPE ?? 95);
const WINKEL = Number(process.env.WINKEL ?? 70);
const STUFEN = Number(process.env.STUFEN ?? 12);
const SCHRITTE = Number(process.env.SCHRITTE ?? 6);
const LOSLASSEN = process.env.LOSLASSEN === '1';
const NAME = process.env.NAME ?? '';
const AUS = process.env.AUS ?? '';
const RUHE = 0.02;
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mal = (a: V3, f: number): V3 => ({ x: a.x * f, y: a.y * f, z: a.z * f });
const punkt = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const kreuz = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const betrag = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const einheit = (a: V3): V3 => {
  const l = betrag(a);
  return l > 1e-12 ? mal(a, 1 / l) : { x: 0, y: 0, z: 0 };
};

// ---------- die Kugel des Fensters mit der schmalen Form ums Maul (wie mit F gezeichnet), die Lippen hart; oder eine gesicherte Form ----------
let haut: Haut;
let loops: Loop[];
let mk: number;
let MAUL: number;
if (NAME) {
  const g = formLaden(NAME);
  haut = g.h;
  loops = g.loops;
  mk = g.mk;
  const ring = process.env.RING ? loops.find((l) => l.id === Number(process.env.RING)) : loops.find((l) => l.art === 'ring' && l.punkte.some((p) => p.mundwinkel));
  if (!ring) throw new Error(`in „${NAME}“ ist keine Linie mit einem Mundwinkel (RING=<Nummer> wählt eine)`);
  MAUL = ring.id;
} else {
  const netz = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke: DREIECKE },
  );
  haut = hautAus(netz.positionen, netz.indizes);
  mk = mittlereKante(haut);
  const n = 64;
  const uv = Array.from({ length: n }, (_, i): [number, number] => [-115 + 60 * Math.cos((2 * Math.PI * i) / n), -20 + 14 * Math.sin((2 * Math.PI * i) / n)]);
  const knoten = Array.from({ length: n / 8 }, (_, i) => 8 * i);
  const r = loopEinsetzen(haut, [formAusZeichnung(haut, 'seite', uv, knoten, 1)!], 0)!;
  haut = r.haut;
  loops = r.loops;
  griffeAnlegen(loops[0]!, loops[0]!.ruhe, true);
  MAUL = loops[0]!.id;
}
const finde = (): Loop => loops.find((l) => l.id === MAUL)!;
{
  const L = finde();
  if (!L.punkte.some((p) => p.mundwinkel)) {
    const s = L.s[mundwinkelProbe(L)]!;
    const W = L.punkte.find((p) => Math.abs(p.s - s) < mk) ?? punktEinfuegen(L, s, undefined, true);
    W.mundwinkel = true;
    if (W.ecke === undefined) W.ecke = true;
  }
  L.kante = true;
  for (const p of L.punkte) p.kante = true;
}
/** die Stelle des Mundwinkels auf der Maullinie */
const sMundwinkel = (L: Loop): number => L.punkte.find((p) => p.mundwinkel)?.s ?? L.s[mundwinkelProbe(L)]!;
const vorher = { haut: { ...haut, pos: Float64Array.from(haut.pos) }, loops: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe) })) };
let vorherText = '';
console.log(`${NAME ? `Form „${NAME}“` : 'Kugel'}: ${haut.n} Punkte, mittlere Kante ${z1(mk)}; ${loops.length} Loop${loops.length === 1 ? '' : 's'}; die Maullinie mit ${finde().punkte.filter(istSichtbar).length} sichtbaren Punkten, hart`);

type Reihe = KnickReihe;
const reiheAnlegen = (h: Haut, L: Loop): Reihe => {
  const R = knickReihe(h, L);
  if (!R) throw new Error('innen an der Maullinie liegt kein Punkt der Haut');
  return R;
};

// ---------- messen ----------
/** Knick der Haut an beiden Enden des Rings im Schnitt durch die Mitte (Grad), und die Tiefe der Tasche als Anteil des Wegs zum Mundwinkel */
function schnitt(h: Haut, L: Loop): { knick: number[]; tiefe: number } {
  const enden = [L.proben[0]!.ecken[0], L.proben[L.proben.length - 1]!.ecken[0]];
  const inMitte = (v: number): number[] => h.nachbarn[v]!.filter((u) => Math.abs(h.pos[3 * u + 2]!) < 1e-6);
  const knick = enden.map((v) => {
    const p = lage(h.pos, v);
    const r = inMitte(v).map((u) => ({ x: h.pos[3 * u]! - p.x, y: h.pos[3 * u + 1]! - p.y }));
    if (r.length !== 2) return NaN;
    const c = (r[0]!.x * r[1]!.x + r[0]!.y * r[1]!.y) / (Math.hypot(r[0]!.x, r[0]!.y) * Math.hypot(r[1]!.x, r[1]!.y));
    return 180 - (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  });
  const a = lage(h.pos, enden[0]!);
  const b = lage(h.pos, enden[1]!);
  const W = L.punkte.find((p) => p.mundwinkel)!;
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const zu = { x: W.ref.x - m.x, y: W.ref.y - m.y };
  const w2 = zu.x * zu.x + zu.y * zu.y;
  let tiefe = 0;
  let kurz = Infinity;
  for (const erster of inMitte(enden[0]!)) {
    let vor = enden[0]!;
    let v = erster;
    let t = 0;
    let zahl = 0;
    while (v !== enden[1] && zahl < 5000) {
      const q = lage(h.pos, v);
      t = Math.max(t, ((q.x - m.x) * zu.x + (q.y - m.y) * zu.y) / w2);
      const weiter = inMitte(v).find((u) => u !== vor);
      if (weiter === undefined) break;
      vor = v;
      v = weiter;
      zahl++;
    }
    if (v === enden[1] && zahl < kurz) {
      kurz = zahl;
      tiefe = t;
    }
  }
  return { knick, tiefe };
}

/** Knick quer über die Linie: nahe dem Mundwinkel (Mittel über die Proben bis `weit` Kanten davor und dahinter, ohne den Mundwinkel selbst), und längs der ganzen Linie */
function knicke(h: Haut, L: Loop): { winkel: number; lippenMitte: number; alle: number[] } {
  const R = reiheAnlegen(h, L);
  const sW = sMundwinkel(L);
  let jW = 0;
  for (let j = 1; j < L.s.length; j++) if (Math.abs(L.s[j]! - sW) < Math.abs(L.s[jW]! - sW)) jW = j;
  const alle = L.proben.map((_, j) => knickQuer(h, R, j));
  const nah = alle.filter((x, j) => Number.isFinite(x) && j !== jW && Math.abs(L.s[j]! - L.s[jW]!) < 2.5 * mk);
  const mitte = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  return { winkel: mitte(nah), lippenMitte: mitte([alle[0]!, alle[alle.length - 1]!].filter(Number.isFinite)), alle };
}

/**
 * Unruhe im Maul: der Knick zwischen Nachbardreiecken (Grad) an den Kanten der Haut innen, nach der Reihe gezählt, in der die
 * Kante liegt (1 = an der Linie und in der ersten Reihe, 2 = bis zur zweiten, 3 = tiefer). Die Kanten auf der Linie selbst zählen
 * nicht (dort ist der Knick gewollt). Je Gruppe das Mittel, dazu das Mittel über alle.
 */
function unruhe(h: Haut, L: Loop): { reihe: number[]; alle: number; zahl: number; gegen: number; gegenMittel: number } {
  const R = reiheAnlegen(h, L);
  // Reihe je Punkt: Abstand von der Linie in Kanten, nur im Inneren
  const reihe = new Int32Array(h.n).fill(-1);
  let rand: number[] = [];
  for (const v of R.kette) {
    reihe[v] = 0;
    rand.push(v);
  }
  for (let r = 1; rand.length; r++) {
    const neu: number[] = [];
    for (const v of rand)
      for (const u of h.nachbarn[v]!) {
        if (reihe[u]! >= 0 || !R.innen[u]) continue;
        reihe[u] = r;
        neu.push(u);
      }
    rand = neu;
  }
  const normale = (f: number): V3 => {
    const a = lage(h.pos, h.tri[3 * f]!);
    return einheit(kreuz(minus(lage(h.pos, h.tri[3 * f + 1]!), a), minus(lage(h.pos, h.tri[3 * f + 2]!), a)));
  };
  const innenFlaeche = (f: number): boolean => {
    const e = [h.tri[3 * f]!, h.tri[3 * f + 1]!, h.tri[3 * f + 2]!];
    return e.every((v) => reihe[v]! >= 0) && e.some((v) => R.innen[v]);
  };
  const summe = [0, 0, 0];
  const zahl = [0, 0, 0];
  // Gegenknicke: Kanten, über die sich die Fläche gegen die Mehrheit biegt (über 2°): ihr Anteil und ihr mittlerer Winkel. Eine
  // glatte Mulde biegt sich überall in dieselbe Richtung; Wellen zeigen sich als Gegenknicke.
  const mit: number[] = [];
  const gegenL: number[] = [];
  for (let v = 0; v < h.n; v++) {
    if (reihe[v]! < 0) continue;
    for (const u of h.nachbarn[v]!) {
      if (u < v || reihe[u]! < 0) continue;
      // die Kanten der Linie selbst nicht
      if (reihe[v] === 0 && reihe[u] === 0) continue;
      const fs = R.um[v]!.filter((f) => R.um[u]!.includes(f));
      if (fs.length !== 2 || !fs.every(innenFlaeche)) continue;
      const w = (Math.acos(Math.max(-1, Math.min(1, punkt(normale(fs[0]!), normale(fs[1]!))))) * 180) / Math.PI;
      const g = Math.min(2, Math.max(reihe[v]!, reihe[u]!) - 1);
      summe[g] = summe[g]! + w;
      zahl[g] = zahl[g]! + 1;
      // Vorzeichen: Liegt die gegenüberliegende Ecke der zweiten Fläche auf der Seite der Normale der ersten?
      const gegenEcke = [h.tri[3 * fs[1]!]!, h.tri[3 * fs[1]! + 1]!, h.tri[3 * fs[1]! + 2]!].find((x) => x !== v && x !== u)!;
      const seite = punkt(normale(fs[0]!), minus(lage(h.pos, gegenEcke), lage(h.pos, v)));
      if (w > 2) (seite > 0 ? mit : gegenL).push(w);
    }
  }
  const z = zahl[0]! + zahl[1]! + zahl[2]!;
  // die Minderheit sind die Gegenknicke
  const [wenige] = mit.length < gegenL.length ? [mit] : [gegenL];
  const gegen = mit.length + gegenL.length ? wenige.length / (mit.length + gegenL.length) : 0;
  const gegenMittel = wenige.length ? wenige.reduce((a, b) => a + b, 0) / wenige.length : 0;
  return { reihe: summe.map((x, g) => (zahl[g] ? x / zahl[g]! : NaN)), alle: z ? (summe[0]! + summe[1]! + summe[2]!) / z : NaN, zahl: z, gegen, gegenMittel };
}
const unruheText = (h: Haut, L: Loop): string => {
  const u = unruhe(h, L);
  return `Knick zwischen Nachbardreiecken im Maul im Mittel ${z1(u.alle)}° (erste Reihe ${z1(u.reihe[0]!)}°, zweite ${z1(u.reihe[1]!)}°, tiefer ${z1(u.reihe[2]!)}°; ${u.zahl} Kanten); Gegenknicke ${z1(100 * u.gegen)} % der Kanten, im Mittel ${z1(u.gegenMittel)}°`;
};

const ausgabe = (was: string, ms: number): void => {
  const L = finde();
  const s = schnitt(haut, L);
  const k = knicke(haut, L);
  const f = falten(haut);
  // an der Kugel: wie weit die Form hinter dem Maul (x > −40) von der Kugel abweicht
  let weit = 0;
  if (!NAME)
    for (let v = 0; v < haut.n; v++) {
      if (haut.pos[3 * v]! < -40) continue;
      weit = Math.max(weit, Math.abs(Math.hypot(haut.pos[3 * v]!, haut.pos[3 * v + 1]!, haut.pos[3 * v + 2]!) - 150));
    }
  console.log(
    `   ${was.padEnd(14)} ${String(haut.n).padStart(5)} Punkte; Knick an den Lippen (Schnitt) ${z1(s.knick[0]!)}° und ${z1(s.knick[1]!)}°, am Mundwinkel ${z1(k.winkel)}°; ` +
      `Tasche ${z2(s.tiefe)}; umgeschlagen ${f.umgeklappt}${NAME ? '' : `; hinter dem Maul bis ${z2(weit)} neben der Kugel`}; ${ms} ms`,
  );
};

// ---------- formen: `maulFormen` auf dem Weg „Kante“ (die Maullinie trägt ihren Knick selbst) ----------
let t0 = Date.now();
{
  const s0 = schnitt(haut, finde());
  const k0 = knicke(haut, finde());
  vorherText = `; Knick an den Lippen ${z1(s0.knick[0]!)}° und ${z1(s0.knick[1]!)}°, am Mundwinkel ${z1(k0.winkel)}°; Tasche ${z2(s0.tiefe)}`;
}
ausgabe('vorher', 0);
console.log(`   vorher: ${unruheText(haut, finde())}`);
const r = maulFormen(haut, loops, MAUL, {
  naechsteId: 1 + Math.max(...loops.map((l) => l.id)),
  naechsteKreuzung: 1 + Math.max(0, ...loops.flatMap((l) => l.punkte.map((p) => p.kreuzung ?? 0))),
  stufen: STUFEN,
  schritte: SCHRITTE,
  knick: LIPPE,
  knickWinkel: WINKEL,
  verdichten: { maxKante: 1.75 * mk, opt: verdichtenWieImFenster(mk) },
  zwischen: (was, hz, lz) => {
    haut = hz;
    loops = [...lz];
    ausgabe(was, Date.now() - t0);
    t0 = Date.now();
  },
});
if ('fehler' in r) {
  console.log(`geht so nicht: ${r.fehler}`);
  process.exit(1);
}
haut = r.haut;
loops = r.loops;
const runden = r.runden;
const steht = r.steht;
ausgabe(steht ? 'gesetzt' : 'STEHT NICHT', Date.now() - t0);
// MEHR=<n>: danach noch n Runden, auch wenn die Haut schon steht (die Kante trägt ihren Winkel in jeder Rechnung)
{
  const mehr = Number(process.env.MEHR ?? 0);
  if (mehr > 0) {
    const vor = Float64Array.from(haut.pos);
    const z = new LoopZug(haut, loops, null, true, 'kurven', 'geometrie', { halb: true });
    const still = loops.map((l) => new Float64Array(l.ruhe.length));
    for (let k = 0; k < mehr; k++) z.schritt(still, 1);
    let weit = 0;
    for (let k = 0; k < vor.length; k += 3) weit = Math.max(weit, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    for (const l of loops) l.ruhe = hautLagen(haut, l);
    // wo: im Maul (innen an der Linie und die Linie selbst) oder am Körper
    const R = reiheAnlegen(haut, finde());
    let imMaul = 0;
    let amKoerper = 0;
    for (let v = 0; v < haut.n; v++) {
      const d = Math.hypot(haut.pos[3 * v]! - vor[3 * v]!, haut.pos[3 * v + 1]! - vor[3 * v + 1]!, haut.pos[3 * v + 2]! - vor[3 * v + 2]!);
      if (R.innen[v] || R.aufKette[v]! >= 0) imMaul = Math.max(imMaul, d);
      else amKoerper = Math.max(amKoerper, d);
    }
    console.log(`   ${mehr} Runden mehr: Die Haut bewegt sich dabei noch um höchstens ${z2(weit)} (im Maul ${z2(imMaul)}, am Körper ${z2(amKoerper)})`);
    ausgabe('danach', 0);
  }
}
const geformt = { haut: { ...haut, pos: Float64Array.from(haut.pos) }, loops: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe) })) };
const sEnde = schnitt(haut, finde());
const kEnde = knicke(haut, finde());
const fEnde = falten(haut);
console.log(
  `Ergebnis (${NAME ? `„${NAME}“` : `${DREIECKE} bestellte Dreiecke`}): ${haut.n} Punkte, ${runden} Runden, ${steht ? 'steht' : 'STEHT NICHT'}; Knick an den Lippen ${z1(sEnde.knick[0]!)}° und ${z1(sEnde.knick[1]!)}° ` +
    `(Soll ${LIPPE}°), am Mundwinkel ${z1(kEnde.winkel)}° (Soll ${WINKEL}°); Tasche ${z2(sEnde.tiefe)} des Wegs zum Mundwinkel; umgeschlagen ${fEnde.umgeklappt}`,
);
console.log(`   nachher: ${unruheText(haut, finde())}`);
console.log(`   Knick quer längs der Linie (Probe für Probe, von der Oberlippe über den Mundwinkel zur Unterlippe): ${kEnde.alle.map((x) => (Number.isFinite(x) ? Math.round(x) : '–')).join(' ')}`);

let losText = '';
if (LOSLASSEN) {
  // zum Vergleich: ohne die Angaben weiterrechnen (wie bis zum 13.11., die Kante trägt nichts)
  for (const l of loops) for (const p of l.punkte) delete p.knick;
  const z = new LoopZug(haut, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const versch = loops.map((l) => new Float64Array(l.ruhe.length));
  let letzte = Infinity;
  let rr = 0;
  const vor = new Float64Array(haut.pos.length);
  for (; rr < 400 && letzte > RUHE; rr++) {
    vor.set(haut.pos);
    z.schritt(versch, 1);
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
  }
  const s = schnitt(haut, finde());
  const k = knicke(haut, finde());
  losText = `ohne die Führung nach ${rr} Runden: Knick an den Lippen ${z1(s.knick[0]!)}° und ${z1(s.knick[1]!)}°, am Mundwinkel ${z1(k.winkel)}°, Tasche ${z2(s.tiefe)}`;
  console.log(`   zum Vergleich ${losText}`);
}

if (AUS) {
  // Ausschnitt: an der Kugel fest (das Maul vergrößert im Schnitt), an einer gesicherten Form die ganze Form
  let mitte: [number, number, number] = [0, 0, 0];
  let mass = 430;
  let sx = 85;
  let sy = 20;
  let sMass = 240;
  if (NAME) {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (let v = 0; v < vorher.haut.n; v++) {
      const q = lage(vorher.haut.pos, v);
      xMin = Math.min(xMin, q.x);
      xMax = Math.max(xMax, q.x);
      yMin = Math.min(yMin, q.y);
      yMax = Math.max(yMax, q.y);
    }
    mitte = [(xMin + xMax) / 2, (yMin + yMax) / 2, 0];
    mass = 1.15 * Math.max(xMax - xMin, yMax - yMin);
    sx = -mitte[0];
    sy = -mitte[1];
    sMass = mass;
  }
  const schnittBild = (H: Haut): BlattSchnitt => {
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
      if (pkt.length === 2) strecken.push(pkt[0]![0] + sx, pkt[0]![1] + sy, pkt[1]![0] + sx, pkt[1]![1] + sy);
    }
    return { titel: NAME ? 'Schnitt durch die Mitte (das Maul von der Seite)' : 'Schnitt durch die Mitte (das Maul von der Seite, vergrößert)', strecken, mass: sMass, hoch: 0.55 };
  };
  const bild = (name: string, H: Haut, Ls: readonly Loop[], notiz: string): BlattBild => {
    const linien: BlattLinie[] = Ls.flatMap((l) => {
      const p = Array.from(hautLagen(H, l));
      const zu = l.art !== 'ring';
      const K = kanteBei(l, Ls);
      const hart = K.reduce((a, b) => a + b, 0) > K.length / 2 ? 1 : 0;
      return l.art === 'mitte' ? [{ p, zu, hart }] : [{ p, zu, hart }, { p: p.map((x, k) => (k % 3 === 2 ? -x : x)), zu, hart }];
    });
    const punkte = Ls.flatMap((l) => l.punkte.filter(istSichtbar).flatMap((p) => (Math.abs(p.ref.z) < 1e-6 ? [[p.ref.x, p.ref.y, p.ref.z]] : [[p.ref.x, p.ref.y, p.ref.z], [p.ref.x, p.ref.y, -p.ref.z]])));
    return { name, h: H, loops: [], notiz, fertig: { linien, punkte }, schnitt: schnittBild(H) };
  };
  blattSchreiben(
    AUS,
    'Schritt 6, Beweis „die Kante trägt ihren Winkel selbst“ (13.11.2026)',
    [
      {
        titel: `${NAME ? `Florians Form „${NAME}“` : `Kugel mit Maullinie, sonst keine Linie und kein Punkt im Maul (${DREIECKE} bestellte Dreiecke)`}: Die Kante knickt die Haut an den Lippen um ${LIPPE}° nach innen, am Mundwinkel um ${WINKEL}°`,
        bilder: [
          bild(NAME ? 'vorher: wie gesichert' : 'vorher: die Maullinie hart auf der Kugel', vorher.haut, vorher.loops, `${vorher.haut.n} Punkte${vorherText}`),
          bild(
            'nachher: die Kante trägt ihren Winkel',
            geformt.haut,
            geformt.loops,
            `${steht ? 'steht' : 'steht nicht'}; Knick an den Lippen ${z1(sEnde.knick[0]!)}° und ${z1(sEnde.knick[1]!)}°, am Mundwinkel ${z1(kEnde.winkel)}°; Tasche ${z2(sEnde.tiefe)}; umgeschlagen ${fEnde.umgeklappt}`,
          ),
        ],
        blicke: [
          ['Seite', 0, 0, 0.8],
          ['schräg von vorn', 50, 12, 0.8],
        ],
        mass,
        mitte,
      },
    ],
    1340,
    `Blaue Linien: Loops, schwarz: Kante an. Rot: eine Fläche, deren Rückseite man sieht. Flach schattiert, damit jeder Knick zu sehen ist.${losText ? ` Zum Vergleich ${losText}.` : ''}`,
  );
  console.log(`Bildblatt: ${AUS}`);
}
