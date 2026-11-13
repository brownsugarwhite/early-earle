// Plan vom 12.11.2026, Schritt 6, „Kanten neu“ (13.11. abends): kleiner Beweis „die Kante trägt ihren Winkel selbst“.
// Florian: „Bei der Maulkante ohne Punkte muss dann eingestellt sein, dass das Maul vom Lippenstart von der Seite mit je 90 bis 100
// Grad eingeknickt ist, auch ohne Punkt, und beim Mundwinkel ca. 70 Grad nach innen abknicken.“ Auf die Rückfrage, was die 70°
// meinen: „Ja, es meint den Knick quer an den Mundwinkeln nach innen. Mache gerne erstmal das bzw. den Beweis.“
//
// Heute ergibt sich der Winkel an einer Kante aus der Form; einstellen lässt er sich nur über die Griffe einer kreuzenden Linie.
// Ohne kreuzende Linie landet die Haut je nach Netz woanders (`form-maul-einfach.ts` mit OHNE_MITTE=1: 93°/100° oder 39°/68°).
//
// Der Beweis: Die Kante bekommt je Stelle einen Winkel (an den Lippen LIPPE, am Mundwinkel WINKEL, dazwischen gleitend). Die erste
// Reihe der Haut innen an der Linie wird in jeder Runde geführt: jeder ihrer Punkte um die Linie gedreht, bis er um diesen Winkel
// gegen die Haut außen abknickt (nach innen, also in den Körper); sein Abstand zur Linie bleibt. Dafür braucht der Löser nichts
// Neues: Die Reihe ist für ihn eine Liste von Bindungen (ein Loop ohne Kette, der nur Orte hält). Alles Weitere im Maul rundet die
// Rechnung wie sonst. Keine Mittellinie, kein Punkt außer dem Mundwinkel. Gedreht wird in Stufen, dazwischen verfeinert wie nach
// einem Zug.
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
import { type Haut, type V3, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, formAusZeichnung, griffeAnlegen, hautLagen, istSichtbar, kanteBei, mittlereKante, pfadLagen, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { mundwinkelProbe } from '../../../../packages/shape/src/dicht/maulLoop';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
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
const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
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

// ---------- die erste Reihe innen an der Kante ----------
type Reihe = {
  /** Netzpunkte der Linie rundum: die Hälfte z ≥ 0, dann ihr Spiegelbild zurück */
  kette: number[];
  /** je Kettenglied die Probe der Maullinie (für den Winkel) */
  probe: number[];
  innen: Uint8Array;
  aufKette: Int32Array;
  /** Dreiecke je Netzpunkt */
  um: number[][];
  /** Punkte der ersten Reihe innen (z ≥ 0): je anliegendem Punkt der Linie der Abstand längs und quer, wie er beim Anlegen war */
  punkte: { w: number; an: { k: number; laengs: number; quer: number }[] }[];
};

function tangente(h: Haut, R: Pick<Reihe, 'kette'>, k: number): V3 {
  const m = R.kette.length;
  return einheit(minus(lage(h.pos, R.kette[(k + 1) % m]!), lage(h.pos, R.kette[(k - 1 + m) % m]!)));
}

function reiheAnlegen(h: Haut, L: Loop): Reihe {
  const halb = L.proben.map((p) => p.ecken[0]);
  const n = halb.length;
  const kette = [...halb];
  const probe = halb.map((_, j) => j);
  for (let j = n - 2; j >= 1; j--) {
    kette.push(h.spiegel[halb[j]!]!);
    probe.push(j);
  }
  const aufKette = new Int32Array(h.n).fill(-1);
  kette.forEach((v, k) => {
    aufKette[v] = k;
  });
  // innen: was die Linie umschließt (alle Teile der Haut neben der Linie außer dem größten)
  const teil = new Int32Array(h.n).fill(-1);
  const groesse: number[] = [];
  for (let v0 = 0; v0 < h.n; v0++) {
    if (teil[v0]! >= 0 || aufKette[v0]! >= 0) continue;
    const nr = groesse.length;
    let zahl = 0;
    const stapel = [v0];
    teil[v0] = nr;
    while (stapel.length) {
      const v = stapel.pop()!;
      zahl++;
      for (const u of h.nachbarn[v]!) {
        if (teil[u]! >= 0 || aufKette[u]! >= 0) continue;
        teil[u] = nr;
        stapel.push(u);
      }
    }
    groesse.push(zahl);
  }
  const aussen = groesse.indexOf(Math.max(...groesse));
  const innen = Uint8Array.from(teil, (t) => (t >= 0 && t !== aussen ? 1 : 0));
  const um: number[][] = Array.from({ length: h.n }, () => []);
  for (let f = 0; f < h.tri.length / 3; f++) for (let e = 0; e < 3; e++) um[h.tri[3 * f + e]!]!.push(f);
  const R: Reihe = { kette, probe, innen, aufKette, um, punkte: [] };
  for (let w = 0; w < h.n; w++) {
    if (!innen[w] || h.pos[3 * w + 2]! < -1e-9) continue;
    const an: Reihe['punkte'][number]['an'] = [];
    for (const x of h.nachbarn[w]!) {
      const k = aufKette[x]!;
      if (k < 0) continue;
      const t = tangente(h, R, k);
      const d = minus(lage(h.pos, w), lage(h.pos, x));
      const laengs = punkt(d, t);
      an.push({ k, laengs, quer: betrag(minus(d, mal(t, laengs))) });
    }
    if (an.length) R.punkte.push({ w, an });
  }
  return R;
}

/** an einem Punkt der Linie: Tangente, die Richtung der Haut außen von der Linie weg, ihre Normale nach außen */
function rahmen(h: Haut, R: Reihe, k: number): { t: V3; uAussen: V3; nAussen: V3 } | null {
  const x = R.kette[k]!;
  const p = lage(h.pos, x);
  const t = tangente(h, R, k);
  let u = { x: 0, y: 0, z: 0 };
  for (const j of h.nachbarn[x]!) {
    if (R.innen[j] || R.aufKette[j]! >= 0) continue;
    const d = minus(lage(h.pos, j), p);
    u = plus(u, einheit(minus(d, mal(t, punkt(d, t)))));
  }
  if (betrag(u) < 1e-9) return null;
  const uAussen = einheit(u);
  // die Normale der Haut außen: aus ihren Dreiecken an diesem Punkt
  let nRef = { x: 0, y: 0, z: 0 };
  for (const f of R.um[x]!) {
    const e = [h.tri[3 * f]!, h.tri[3 * f + 1]!, h.tri[3 * f + 2]!];
    if (e.some((v) => R.innen[v])) continue;
    if (e.filter((v) => R.aufKette[v]! >= 0).length === 3) continue;
    const a = lage(h.pos, e[0]!);
    nRef = plus(nRef, kreuz(minus(lage(h.pos, e[1]!), a), minus(lage(h.pos, e[2]!), a)));
  }
  let nAussen = einheit(kreuz(t, uAussen));
  if (punkt(nAussen, nRef) < 0) nAussen = mal(nAussen, -1);
  return { t, uAussen, nAussen };
}

/** das Soll je Stelle der Maullinie (Grad): an den Lippen `LIPPE`, am Mundwinkel `WINKEL`, dazwischen gleitend */
function sollBei(L: Loop, s: number): number {
  const sW = sMundwinkel(L);
  const f = s <= sW ? s / Math.max(sW, 1e-9) : (L.laenge - s) / Math.max(L.laenge - sW, 1e-9);
  return WINKEL + (LIPPE - WINKEL) * (1 - Math.max(0, Math.min(1, f)));
}
/** der Knick quer über die Linie, wie er am Anfang war (Stelle, Grad): Von ihm aus dreht sich die Reihe zum Soll */
let anfang: { s: number; w: number }[] = [];
function anfangBei(s: number): number | null {
  if (anfang.length === 0) return null;
  let i = anfang.findIndex((a) => a.s > s);
  if (i < 0) i = anfang.length;
  const a = anfang[Math.max(0, i - 1)]!;
  const b = anfang[Math.min(anfang.length - 1, i)]!;
  if (b.s - a.s < 1e-9) return a.w;
  const f = Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s)));
  return a.w + f * (b.w - a.w);
}
/** der Winkel je Probe (Grad) beim Anteil `anteil` des Wegs vom Knick am Anfang zum Soll */
function winkelBei(L: Loop, j: number, anteil: number): number {
  const s = L.s[j]!;
  const soll = sollBei(L, s);
  const von = anfangBei(s) ?? 0;
  return von + anteil * (soll - von);
}

/** Ziele der ersten Reihe: jeder Punkt um die Linie gedreht, bis er um den Winkel gegen die Haut außen nach innen abknickt */
function reihenZiele(h: Haut, L: Loop, R: Reihe, anteil: number): Float64Array {
  const Z = new Float64Array(3 * R.punkte.length);
  const rahmenBei = new Map<number, ReturnType<typeof rahmen>>();
  R.punkte.forEach((q, i) => {
    let s = { x: 0, y: 0, z: 0 };
    let zahl = 0;
    for (const a of q.an) {
      let r = rahmenBei.get(a.k);
      if (r === undefined) {
        r = rahmen(h, R, a.k);
        rahmenBei.set(a.k, r);
      }
      if (!r) continue;
      const w = (winkelBei(L, R.probe[a.k]!, anteil) * Math.PI) / 180;
      // geradeaus weiter wäre −uAussen; um den Winkel in den Körper gedreht (gegen die Normale außen)
      const uInnen = plus(mal(r.uAussen, -Math.cos(w)), mal(r.nAussen, -Math.sin(w)));
      s = plus(s, plus(lage(h.pos, R.kette[a.k]!), plus(mal(r.t, a.laengs), mal(uInnen, a.quer))));
      zahl++;
    }
    const z = zahl ? mal(s, 1 / zahl) : lage(h.pos, q.w);
    if (Math.abs(h.pos[3 * q.w + 2]!) < 1e-9) z.z = 0;
    Z[3 * i] = z.x;
    Z[3 * i + 1] = z.y;
    Z[3 * i + 2] = z.z;
  });
  return Z;
}

/** die Reihe als Loop ohne Kette: Er hält nur Orte (jede Probe bindet einen Punkt der Haut; die Spiegelhälfte geht von selbst mit) */
function reihenLoop(h: Haut, R: Reihe): Loop {
  const proben = R.punkte.map((q) => {
    const f = R.um[q.w]![0]!;
    const andere = [h.tri[3 * f]!, h.tri[3 * f + 1]!, h.tri[3 * f + 2]!].filter((v) => v !== q.w);
    return { ecken: [q.w, andere[0]!, andere[1]!] as [number, number, number], b: [1, 0, 0] as [number, number, number] };
  });
  const ruhe = new Float64Array(3 * proben.length);
  R.punkte.forEach((q, i) => ruhe.set([h.pos[3 * q.w]!, h.pos[3 * q.w + 1]!, h.pos[3 * q.w + 2]!], 3 * i));
  return { id: 900001, art: 'paar', proben, s: Float64Array.from(proben, (_, i) => i), laenge: Math.max(1, proben.length), ruhe, punkte: [] };
}

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

/**
 * Knick der Haut quer über die Linie an einer Probe (Grad): die Richtung der Haut außen von der Linie weg gegen die der Haut innen,
 * beide aus den Nachbarpunkten quer zur Linie (0 = die Haut läuft gerade durch)
 */
function knickQuer(h: Haut, R: Reihe, k: number): number {
  const r = rahmen(h, R, k);
  if (!r) return NaN;
  const x = R.kette[k]!;
  const p = lage(h.pos, x);
  let u = { x: 0, y: 0, z: 0 };
  for (const j of h.nachbarn[x]!) {
    if (!R.innen[j]) continue;
    const d = minus(lage(h.pos, j), p);
    u = plus(u, einheit(minus(d, mal(r.t, punkt(d, r.t)))));
  }
  if (betrag(u) < 1e-9) return NaN;
  const c = punkt(einheit(u), mal(r.uAussen, -1));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
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

// ---------- formen: die Reihe in Stufen drehen ----------
let runden = 0;
let steht = false;
const opt = verdichtenWieImFenster(mk);
let t0 = Date.now();
{
  const s0 = schnitt(haut, finde());
  const k0 = knicke(haut, finde());
  vorherText = `; Knick an den Lippen ${z1(s0.knick[0]!)}° und ${z1(s0.knick[1]!)}°, am Mundwinkel ${z1(k0.winkel)}°; Tasche ${z2(s0.tiefe)}`;
}
ausgabe('vorher', 0);
{
  const L = finde();
  const R = reiheAnlegen(haut, L);
  anfang = L.proben.map((_, j) => ({ s: L.s[j]!, w: knickQuer(haut, R, j) })).filter((a) => Number.isFinite(a.w));
}
/** eine Stufe: die Reihe von `von` bis `bis` (Anteil des Winkels) drehen, in Schritten; danach setzen (höchstens `setzen` Runden) */
function stufe(von: number, bis: number, schritte: number, setzen: number): boolean {
  const L = finde();
  const R = reiheAnlegen(haut, L);
  const fuehrung = reihenLoop(haut, R);
  const alle = [...loops, fuehrung];
  const z = new LoopZug(haut, alle, null, true, 'kurven', 'geometrie', { halb: true });
  const start = alle.map((l) => Float64Array.from(l.ruhe));
  const versch = (anteil: number): Float64Array[] =>
    alle.map((l, i) => {
      const Z = l === fuehrung ? reihenZiele(haut, L, R, anteil) : (pfadLagen(l) ?? start[i]!);
      return Float64Array.from(Z, (x, k) => x - start[i]![k]!);
    });
  for (let k = 1; k <= schritte; k++) {
    z.schritt(versch(von + ((bis - von) * k) / schritte), 2);
    runden += 2;
  }
  let letzte = Infinity;
  const vor = new Float64Array(haut.pos.length);
  for (let r = 0; r < setzen && letzte > RUHE; r++) {
    vor.set(haut.pos);
    // die Ziele der Reihe folgen der Haut außen (ihr Winkel ist gegen sie gemessen)
    z.schritt(versch(bis), 1);
    runden++;
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    if (!Number.isFinite(letzte)) throw new Error('die Lagen sind nicht endlich');
  }
  for (const l of loops) {
    l.ruhe = hautLagen(haut, l);
    for (const p of l.punkte) p.ref = { ...p.cur };
  }
  return letzte <= RUHE;
}
for (let b = 1; b <= STUFEN; b++) {
  stufe((b - 1) / STUFEN, b / STUFEN, SCHRITTE, 40);
  // verfeinern wie das Fenster nach einem Zug
  for (let g = 0; g < 8; g++) {
    const v = verdichten(haut, loops, 1.75 * mk, opt);
    if (!v) break;
    haut = v.haut;
    loops = v.loops;
    for (const l of loops) for (const q of l.punkte) q.cur = { ...q.ref };
    if (haut.n > 40000) throw new Error('das Netz wächst über alle Maßen');
    if (v.gelegt === 0 && v.neu === 0) break;
  }
  ausgabe(`Stufe ${b}`, Date.now() - t0);
  t0 = Date.now();
}
// setzen, mit der Führung (die Kante trägt ihren Winkel weiter)
for (let g = 0; g < 4 && !steht; g++) steht = stufe(1, 1, 0, 200);
// MEHR=<n>: danach noch n Runden mit der Führung, auch wenn die Haut schon steht (rundet sich das Innere weiter?)
{
  const mehr = Number(process.env.MEHR ?? 0);
  if (mehr > 0) {
    const vor = Float64Array.from(haut.pos);
    const L = finde();
    const R = reiheAnlegen(haut, L);
    const fuehrung = reihenLoop(haut, R);
    const alle = [...loops, fuehrung];
    const z = new LoopZug(haut, alle, null, true, 'kurven', 'geometrie', { halb: true });
    const start = alle.map((l) => Float64Array.from(l.ruhe));
    for (let r = 0; r < mehr; r++)
      z.schritt(
        alle.map((l, i) => Float64Array.from(l === fuehrung ? reihenZiele(haut, L, R, 1) : (pfadLagen(l) ?? start[i]!), (x, k) => x - start[i]![k]!)),
        1,
      );
    let weit = 0;
    for (let k = 0; k < vor.length; k += 3) weit = Math.max(weit, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    for (const l of loops) l.ruhe = hautLagen(haut, l);
    console.log(`   ${mehr} Runden mehr mit der Führung: Die Haut bewegt sich dabei noch um höchstens ${z2(weit)}`);
  }
}
ausgabe(steht ? 'gesetzt' : 'STEHT NICHT', Date.now() - t0);
t0 = Date.now();
const geformt = { haut: { ...haut, pos: Float64Array.from(haut.pos) }, loops: loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe) })) };
const sEnde = schnitt(haut, finde());
const kEnde = knicke(haut, finde());
const fEnde = falten(haut);
console.log(
  `Ergebnis (${NAME ? `„${NAME}“` : `${DREIECKE} bestellte Dreiecke`}): ${haut.n} Punkte, ${runden} Runden, ${steht ? 'steht' : 'STEHT NICHT'}; Knick an den Lippen ${z1(sEnde.knick[0]!)}° und ${z1(sEnde.knick[1]!)}° ` +
    `(Soll ${LIPPE}°), am Mundwinkel ${z1(kEnde.winkel)}° (Soll ${WINKEL}°); Tasche ${z2(sEnde.tiefe)} des Wegs zum Mundwinkel; umgeschlagen ${fEnde.umgeklappt}`,
);
console.log(`   Knick quer längs der Linie (Probe für Probe, von der Oberlippe über den Mundwinkel zur Unterlippe): ${kEnde.alle.map((x) => (Number.isFinite(x) ? Math.round(x) : '–')).join(' ')}`);

let losText = '';
if (LOSLASSEN) {
  // zum Vergleich: ohne die Führung weiterrechnen (wie heute, die Kante trägt nichts)
  const z = new LoopZug(haut, loops, null, true, 'kurven', 'geometrie', { halb: true });
  const versch = loops.map((l) => new Float64Array(l.ruhe.length));
  let letzte = Infinity;
  let r = 0;
  const vor = new Float64Array(haut.pos.length);
  for (; r < 400 && letzte > RUHE; r++) {
    vor.set(haut.pos);
    z.schritt(versch, 1);
    letzte = 0;
    for (let k = 0; k < vor.length; k += 3) letzte = Math.max(letzte, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
  }
  const s = schnitt(haut, finde());
  const k = knicke(haut, finde());
  losText = `ohne die Führung nach ${r} Runden: Knick an den Lippen ${z1(s.knick[0]!)}° und ${z1(s.knick[1]!)}°, am Mundwinkel ${z1(k.winkel)}°, Tasche ${z2(s.tiefe)}`;
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
