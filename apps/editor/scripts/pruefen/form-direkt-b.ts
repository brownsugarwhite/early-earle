// Plan vom 12.11.2026, Anhang A.3, zweiter Beweis „B“ (13.11., Florian: „ok, prüfe B“), im Kern ohne Fenster.
//   B      Ziehen an fertiger Haut: Lagen direkt aus den Linien (`HautDirekt` mit festem Stand), die Normalen der Haut drehen mit
//          den Linien mit. Danach wird verdichtet wie im Fenster.
//   heute  der Löser des Fensters über die ganze Haut, dann verdichtet (zum Vergleich)
// Fälle und Kriterien stehen im Plan (Anhang A.3, „Zweiter Beweis“), das Ergebnis in `docs/research/2026-11-13-beweis-haut-direkt.md`.
// Ausgabe: je Fall wenige Zeilen; mit BLATT=<pfad ohne Endung> die Bilder als HTML (dann aus apps/editor
// `HOEHE=100 node scripts/pruefen/html-shot.mjs --jpg <pfad>-*.html`).
//   FALL=ruessel,horn,biegen,formen (Komma-Liste, Standard alle)   DREIECKE=2000
// Geprüft und verworfen (Schalter bleiben zum Nachrechnen): neue Haut mit der heutigen Rechnung runden, während der Rest fest steht.
//   RUNDEN=geometrie|gleich (Standard aus)   BEREICH=punkte (neue Punkte und RINGE Ringe darum) | feld (das ganze Feld zwischen den
//   Linien, wenn mindestens der Anteil ANTEIL seiner Punkte neu ist). Auf einem Teil der Haut kommt die heutige Rechnung nicht zur
//   Ruhe, stülpt Dreiecke um oder läuft davon (Rüssel: 5 von 8 Schritten mit `geometrie`, 8 von 8 mit `gleich`).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-direkt-b.ts
import { HautDirekt, linienDrehung } from '../../../../packages/shape/src/dicht/direkt';
import { type Haut, type V3, hautAus, hautNormalenMax } from '../../../../packages/shape/src/dicht/kurven';
import { falten } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, bindungenAus, festlegen, mittlereKante, verschiebungLaengs, zieleAus } from '../../../../packages/shape/src/dicht/loops';
import { linienRichtung } from '../../../../packages/shape/src/dicht/richtung';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { flaechenAbstand } from './flaechenabstand';
import { type BlattZeile, blattSchreiben } from './form-direkt-blatt';
import { type Abbildung, R, abbilden, formLaden, hartePunkte, mitSchnitten, nachVerdichten } from './form-direkt-faelle';

const FAELLE = (process.env.FALL ?? 'ruessel,horn,biegen,formen').split(',');
const DREIECKE = Number(process.env.DREIECKE ?? 2000);
const RINGE = Number(process.env.RINGE ?? 2);
/** Schalter zum Vergleichen: STAND=0 ohne festen Stand, DREHEN=0 ohne Mitdrehen der Normalen, RUNDEN=gleich|geometrie|aus */
const STAND = process.env.STAND !== '0';
const DREHEN = process.env.DREHEN !== '0';
const RUNDEN = (process.env.RUNDEN ?? 'aus') as 'gleich' | 'geometrie' | 'aus';
const BEREICH = (process.env.BEREICH ?? 'feld') as 'punkte' | 'feld';
const ANTEIL = Number(process.env.ANTEIL ?? 0);
const z1 = (x: number): string => x.toFixed(1).replace('.', ',');
const z2 = (x: number): string => x.toFixed(2).replace('.', ',');
const pz = (neu: number, alt: number): string => {
  const p = (100 * (neu - alt)) / alt;
  return `${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(1).replace('.', ',')} %`;
};
const blatt: (BlattZeile & { kurz: string })[] = [];
/** Zähler für das Runden neuer Haut: wie oft die Haut davongelaufen ist, wie oft sie in 150 Runden nicht zur Ruhe kam */
let davongelaufen = 0;
let nichtRuhig = 0;
const NAME_B = 'B · Linien bewegen die Haut direkt';
const kopie = (h: Haut): Haut => ({ ...h, pos: Float64Array.from(h.pos) });
const loopsKopie = (loops: readonly Loop[]): Loop[] => loops.map((l) => ({ ...l, ruhe: Float64Array.from(l.ruhe), punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })) }));
const fz = (h: Haut): string => {
  const f = falten(h);
  return `Knicke über 60° ${f.ueber60}, umgestülpt ${f.umgeklappt}`;
};
const punkte = (h: Haut): [number, number, number][] => Array.from({ length: h.n }, (_, v) => [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!]);
const dreiecke = (h: Haut): number[][] => Array.from({ length: h.tri.length / 3 }, (_, t) => [h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!]);
/** Abstand der Punkte von `a` zur Fläche von `b`: Mittel und größter */
function abstand(a: Haut, b: Haut, zelle = 20): { mittel: number; max: number } {
  const d = flaechenAbstand(punkte(a), punkte(b), dreiecke(b), zelle);
  let s = 0;
  let m = 0;
  for (const x of d) {
    s += x;
    m = Math.max(m, x);
  }
  return { mittel: s / d.length, max: m };
}
/** größter Weg eines Punkts zwischen zwei Lagen derselben Haut */
const weg = (a: Float64Array, b: Float64Array): number => {
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!, a[i + 2]! - b[i + 2]!));
  return m;
};

/** heute: Zug in Schritten zu den neuen Lagen der Linien, dann Runden, bis die Haut steht */
function heute(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[], schritte = 16, ende = 150): number {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l, i) => Float64Array.from(lagen[i]!, (x, k) => x - l.ruhe[k]!));
  let bewegt = false;
  for (const d of versch) for (let k = 0; k < d.length; k++) if (d[k] !== 0) bewegt = true;
  if (bewegt) for (let s = 1; s <= schritte; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / schritte)), 2);
  let r = 0;
  for (; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    if (!(weg(vor, h.pos) >= 0.02)) break;
  }
  return r + 1;
}

/** B anlegen: Gewichte, Normalen und Stand aus der Haut, wie sie ist; `ziehen(lagen)` rechnet die Haut zu neuen Lagen der Linien */
function bAnlegen(h: Haut, loops: readonly Loop[]): { d: HautDirekt; ziehen: (lagen: readonly Float64Array[]) => void; nachfuehren: (lagen: readonly Float64Array[]) => number } {
  const plan = bindungenAus(h, loops);
  const nor = hautNormalenMax(h);
  const ruhe = loops.map((l) => Float64Array.from(l.ruhe));
  const d = new HautDirekt(h, plan.bind, { hart: hartePunkte(h, loops), stand: STAND });
  // die Richtung der Linien liest an der Haut nur die mittlere Kantenlänge: an der Haut vom Anlegen, damit gleiche Linien immer
  // dieselbe Richtung geben (mit der Haut von jetzt kam hin und zurück eine um 0,5 andere Haut heraus)
  const h0 = kopie(h);
  const rAlt = linienRichtung(h0, loops, plan, ruhe, nor);
  return {
    d,
    ziehen: (lagen) => {
      const feld = DREHEN ? d.normalenDrehen(linienDrehung(h0, loops, plan, ruhe, lagen, rAlt, linienRichtung(h0, loops, plan, lagen, nor))) : nor;
      d.lagenLoesen(zieleAus(plan, lagen), feld);
    },
    // dasselbe ohne neu zu zerlegen (mit der Zerlegung des letzten `ziehen`); zurück: Schritte des Nachführens
    nachfuehren: (lagen) => {
      const feld = DREHEN ? d.normalenDrehen(linienDrehung(h0, loops, plan, ruhe, lagen, rAlt, linienRichtung(h0, loops, plan, lagen, nor))) : nor;
      return d.lagenNachfuehren(zieleAus(plan, lagen), feld);
    },
  };
}

/**
 * Neue Haut runden mit der heutigen Rechnung; alles außerhalb des Bereichs steht fest. Zwei Regeln für den Bereich (BEREICH):
 *   punkte  die neuen Punkte und `RINGE` Ringe darum
 *   feld    jedes Feld zwischen den Linien, in dem neue Punkte liegen (mindestens der Anteil ANTEIL seiner Punkte); sein Rand
 *           sind dann nur Linien
 */
function neuesRunden(h: Haut, loops: readonly Loop[], neu: Uint8Array): { punkte: number; runden: number; bereich: number } {
  let zahlNeu = 0;
  for (let v = 0; v < h.n; v++) if (neu[v]) zahlNeu++;
  if (zahlNeu === 0 || RUNDEN === 'aus') return { punkte: zahlNeu, runden: 0, bereich: 0 };
  let bereich: Uint8Array;
  if (BEREICH === 'feld') {
    // Punkte auf Linien trennen die Felder
    const linie = new Uint8Array(h.n);
    for (const l of loops)
      for (const p of l.proben)
        if (p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]) {
          linie[p.ecken[0]] = 1;
          const sp = h.spiegel[p.ecken[0]]!;
          if (sp >= 0) linie[sp] = 1;
        }
    const feld = new Int32Array(h.n).fill(-1);
    const groesse: number[] = [];
    const neue: number[] = [];
    for (let v0 = 0; v0 < h.n; v0++) {
      if (linie[v0] || feld[v0]! >= 0) continue;
      const f = groesse.length;
      let g = 0;
      let nn = 0;
      const stapel = [v0];
      feld[v0] = f;
      while (stapel.length) {
        const v = stapel.pop()!;
        g++;
        if (neu[v]) nn++;
        for (const j of h.nachbarn[v]!) {
          if (linie[j] || feld[j]! >= 0) continue;
          feld[j] = f;
          stapel.push(j);
        }
      }
      groesse.push(g);
      neue.push(nn);
    }
    bereich = new Uint8Array(h.n);
    for (let v = 0; v < h.n; v++) {
      const f = feld[v]!;
      if (f >= 0 && neue[f]! > 0 && neue[f]! >= ANTEIL * groesse[f]!) bereich[v] = 1;
    }
  } else {
    bereich = Uint8Array.from(neu);
    let rand: number[] = [];
    for (let v = 0; v < h.n; v++) if (neu[v]) rand.push(v);
    for (let k = 0; k < RINGE; k++) {
      const weiter: number[] = [];
      for (const v of rand)
        for (const j of h.nachbarn[v]!) {
          if (bereich[j]) continue;
          bereich[j] = 1;
          weiter.push(j);
        }
      rand = weiter;
    }
  }
  let imBereich = 0;
  for (let v = 0; v < h.n; v++) if (bereich[v]) imBereich++;
  if (imBereich === 0) return { punkte: zahlNeu, runden: 0, bereich: 0 };
  const z = new LoopZug(h, loops, bereich, true, 'kurven', RUNDEN, {});
  const ruhig = loops.map(() => null);
  const anfang = Float64Array.from(h.pos);
  let gross = 0;
  for (let i = 0; i < anfang.length; i++) gross = Math.max(gross, Math.abs(anfang[i]!));
  let r = 0;
  for (; r < 150; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(ruhig, 1);
    let m = 0;
    for (let i = 0; i < h.pos.length; i++) m = Math.max(m, Math.abs(h.pos[i]!));
    if (!(m < 2 * gross)) {
      // die Haut läuft davon: zurück auf den Stand vor dem Runden (Runden = −1)
      h.pos.set(anfang);
      davongelaufen++;
      return { punkte: zahlNeu, runden: -1, bereich: imBereich };
    }
    if (!(weg(vor, h.pos) >= 0.02)) break;
  }
  if (r >= 150) nichtRuhig++;
  return { punkte: zahlNeu, runden: r + 1, bereich: imBereich };
}

type Stand = { h: Haut; loops: Loop[] };
/** ein Zug mit B bis zum Loslassen: direkt rechnen, Linien festlegen, verdichten, neue Haut runden */
function zugB(s: Stand, lagen: readonly Float64Array[], mk: number, runden = true): Stand & { neu: number; rundenZahl: number; bereich: number } {
  bAnlegen(s.h, s.loops).ziehen(lagen);
  for (const l of s.loops) festlegen(s.h, l);
  const v = nachVerdichten(s.h, s.loops, mk);
  const r = runden ? neuesRunden(v.h, v.loops, v.neu) : { punkte: v.neu.reduce((a, b) => a + b, 0), runden: 0, bereich: 0 };
  for (const l of v.loops) festlegen(v.h, l);
  return { h: v.h, loops: v.loops, neu: r.punkte, rundenZahl: r.runden, bereich: r.bereich };
}
/** derselbe Zug mit der heutigen Rechnung */
function zugHeute(s: Stand, lagen: readonly Float64Array[], mk: number, schritte = 16): Stand {
  heute(s.h, s.loops, lagen, schritte);
  for (const l of s.loops) festlegen(s.h, l);
  const v = nachVerdichten(s.h, s.loops, mk);
  for (const l of v.loops) festlegen(v.h, l);
  return { h: v.h, loops: v.loops };
}

// ---- Rüssel aus der Kugel, danach verlängert ---------------------------------------------------------------------------------
const X0 = R * Math.cos((22 * Math.PI) / 180);
const LANG = 160;
/** Querschnitt des Rüssels bei x ± 12: Höhe (in y) und Breite (in z) */
function schnitt(h: Haut, x: number): { hoehe: number; breite: number } {
  let y0 = Infinity;
  let y1 = -Infinity;
  let zz = 0;
  for (let v = 0; v < h.n; v++) {
    if (Math.abs(h.pos[3 * v]! - x) > 12) continue;
    y0 = Math.min(y0, h.pos[3 * v + 1]!);
    y1 = Math.max(y1, h.pos[3 * v + 1]!);
    zz = Math.max(zz, Math.abs(h.pos[3 * v + 2]!));
  }
  return { hoehe: y1 - y0, breite: 2 * zz };
}
function ruessel(): void {
  const erzeugt: { name: string; h: Haut; loops: Loop[]; notiz: string }[] = [];
  const laenger: { name: string; h: Haut; loops: Loop[]; notiz: string }[] = [];
  // drei Abläufe: alles mit der heutigen Rechnung · mit ihr erzeugt und mit B verlängert · alles mit B
  for (const [erst, dann, name] of [
    ['heute', 'heute', 'heute'],
    ['heute', 'B', 'mit der heutigen Rechnung erzeugt, mit B verlängert'],
    ['B', 'B', 'B allein (erzeugt und verlängert)'],
  ] as const) {
    let gleichePunkte = '';
    const n = rundAusSeite(
      [
        { x: R, y: 0 },
        { x: 0, y: R },
        { x: -R, y: 0 },
        { x: 0, y: -R },
      ],
      { dreiecke: DREIECKE },
    );
    let s: Stand = mitSchnitten(hautAus(n.positionen, n.indizes), [
      ['top', [-200, 0], [200, 0]],
      ['seite', [10, 200], [10, -200]],
    ]);
    const mk = mittlereKante(s.h);
    // 1  aus der Kugel ziehen: die Kappe vorn in acht Schritten um 160 nach vorn
    const schritte = 8;
    for (let k = 0; k < schritte; k++) {
      const ab0 = X0 + (k * LANG) / schritte;
      const lagen = s.loops.map((l) => abbilden(l.ruhe, (x, y, z) => [x > ab0 ? x + LANG / schritte : x, y, z]));
      s = erst === 'heute' ? zugHeute(s, lagen, mk, 8) : zugB(s, lagen, mk);
    }
    const q1 = [0.25, 0.5, 0.75].map((t) => schnitt(s.h, X0 + t * LANG));
    const m1 = q1[1]!;
    if (erst !== dann || erst === 'B' || name === 'heute') {
      if (erst === dann)
        console.log(`Rüssel aus der Kugel, ${erst}${erst === 'B' && RUNDEN !== 'aus' ? ` (neue Haut gerundet mit ${RUNDEN}, ${BEREICH}: ${davongelaufen}-mal davongelaufen, ${nichtRuhig}-mal nicht zur Ruhe gekommen)` : ''}: ${s.h.n} Punkte, Querschnitt in der Mitte Höhe ${z1(m1.hoehe)}, Breite ${z1(m1.breite)}, Breite zu Höhe ${z2(m1.breite / m1.hoehe)} (bei 25 / 50 / 75 %: ${q1.map((q) => z2(q.breite / q.hoehe)).join(' · ')}), ${fz(s.h)}`);
      if (erst === dann) erzeugt.push({ name: erst === 'heute' ? 'heute' : 'B allein', h: kopie(s.h), loops: loopsKopie(s.loops), notiz: `Querschnitt in der Mitte: Höhe ${z1(m1.hoehe)}, Breite ${z1(m1.breite)} (Breite zu Höhe ${z2(m1.breite / m1.hoehe)}). ${fz(s.h)}.` });
    }
    // dasselbe Stück Haut vorher und nachher: der Rüssel in einem Zug um die Hälfte gestreckt, gemessen an den Punkten, die
    // vorher bei 25 / 50 / 75 % seiner Länge lagen (ohne Verdichten dazwischen, damit es dieselben Punkte sind)
    if (erst === 'heute') {
      const hh = kopie(s.h);
      const ls = loopsKopie(s.loops);
      const ganz: Abbildung = (x, y, z) => [x <= X0 ? x : x >= X0 + LANG ? x + LANG / 2 : X0 + (x - X0) * 1.5, y, z];
      const lagen = ls.map((l) => abbilden(l.ruhe, ganz));
      if (dann === 'heute') heute(hh, ls, lagen);
      else bAnlegen(hh, ls).ziehen(lagen);
      const teile = [0.25, 0.5, 0.75].map((t) => {
        let b0 = 0;
        let b1 = 0;
        for (let v = 0; v < hh.n; v++) {
          if (Math.abs(s.h.pos[3 * v]! - (X0 + t * LANG)) > 12) continue;
          b0 = Math.max(b0, Math.abs(s.h.pos[3 * v + 2]!));
          b1 = Math.max(b1, Math.abs(hh.pos[3 * v + 2]!));
        }
        return pz(b1, b0);
      });
      console.log(`   in einem Zug um die Hälfte gestreckt, ${dann}: dieselben Punkte der Haut vorher und nachher, ihre Breite bei 25 / 50 / 75 %: ${teile.join(' · ')}, ${fz(hh)}`);
      gleichePunkte = teile.join(' · ');
    }
    // 2  denselben Rüssel um die Hälfte verlängern: gleichmäßig gestreckt (wie ein Zug an seiner Spitze), in vier Schritten
    const mehr = LANG / 2;
    let lang = LANG;
    for (let k = 0; k < 4; k++) {
      const f = (lang + mehr / 4) / lang;
      const ende = X0 + lang;
      const strecken: Abbildung = (x, y, z) => [x <= X0 ? x : x >= ende ? x + mehr / 4 : X0 + (x - X0) * f, y, z];
      const lagen = s.loops.map((l) => abbilden(l.ruhe, strecken));
      s = dann === 'heute' ? zugHeute(s, lagen, mk, 8) : zugB(s, lagen, mk);
      lang += mehr / 4;
    }
    const q2 = [0.25, 0.5, 0.75].map((t) => schnitt(s.h, X0 + t * lang));
    const breiter = q2.map((q, i) => pz(q.breite, q1[i]!.breite)).join(' · ');
    const hoeher = q2.map((q, i) => pz(q.hoehe, q1[i]!.hoehe)).join(' · ');
    console.log(`   um die Hälfte verlängert, ${name}: ${s.h.n} Punkte, Querschnitt bei 25 / 50 / 75 % (Höhe × Breite): vorher ${q1.map((q) => `${z1(q.hoehe)} × ${z1(q.breite)}`).join(' · ')}, nachher ${q2.map((q) => `${z1(q.hoehe)} × ${z1(q.breite)}`).join(' · ')}; Breite ${breiter}, Höhe ${hoeher}, ${fz(s.h)}`);
    if (erst === 'heute') laenger.push({ name: dann === 'heute' ? 'heute' : 'mit B verlängert', h: kopie(s.h), loops: loopsKopie(s.loops), notiz: `Dasselbe Stück Haut vorher und nachher, Breite bei 25 / 50 / 75 % der Länge: ${gleichePunkte}. ${fz(s.h)}.` });
  }
  const blicke = [
    ['Seite', 0, 0, 0.45],
    ['von oben', 0, 90, 0.45],
  ] as const;
  blatt.push({ kurz: 'ruessel', titel: 'Rüssel nur aus zwei Profillinien, aus der Kugel gezogen (8 Schritte)', blicke, bilder: erzeugt });
  blatt.push({ kurz: 'ruessel-laenger', titel: 'Rüssel, mit der heutigen Rechnung erzeugt, danach um die Hälfte verlängert (4 Schritte)', blicke, bilder: laenger });
}

// ---- Horn am strange bird: verlängern, biegen --------------------------------------------------------------------------------
/** Ausdehnung des Horns (Hälfte z > 0) in der Höhe y ± 8: in x und in z; `zurueck`: die Punkte vorher zurückbiegen */
function hornSchnitt(h: Haut, y: number, zurueck?: (p: [number, number, number]) => [number, number, number]): { x: number; z: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let zz0 = Infinity;
  let zz1 = -Infinity;
  for (let v = 0; v < h.n; v++) {
    if (h.pos[3 * v + 2]! < 1) continue;
    let p: [number, number, number] = [h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!];
    if (zurueck) p = zurueck(p);
    if (Math.abs(p[1] - y) > 8) continue;
    x0 = Math.min(x0, p[0]);
    x1 = Math.max(x1, p[0]);
    zz0 = Math.min(zz0, p[2]);
    zz1 = Math.max(zz1, p[2]);
  }
  return { x: x1 - x0, z: zz1 - zz0 };
}
const T3 = [0.4, 0.6, 0.8];
/** dasselbe Stück Haut vorher und nachher: die Punkte, die vorher in der Höhe y ± 8 lagen (z > 0), ihre Ausdehnung in z */
function stueck(vorher: Haut, nachher: Haut, y: number): { vor: number; nach: number } {
  let a0 = Infinity;
  let a1 = -Infinity;
  let b0 = Infinity;
  let b1 = -Infinity;
  for (let v = 0; v < vorher.n; v++) {
    if (Math.abs(vorher.pos[3 * v + 1]! - y) > 8 || vorher.pos[3 * v + 2]! < 1) continue;
    a0 = Math.min(a0, vorher.pos[3 * v + 2]!);
    a1 = Math.max(a1, vorher.pos[3 * v + 2]!);
    b0 = Math.min(b0, nachher.pos[3 * v + 2]!);
    b1 = Math.max(b1, nachher.pos[3 * v + 2]!);
  }
  return { vor: a1 - a0, nach: b1 - b0 };
}
function horn(): void {
  const { h, loops, mk } = formLaden('strange bird');
  // die Spitze des Horns: der höchste Punkt aller Loops; alle Punkte derselben Kreuzung gehen mit
  let spitze: { li: number; pi: number; y: number; kreuzung?: number } | null = null;
  loops.forEach((l, li) => l.punkte.forEach((p, pi) => (!spitze || p.cur.y > spitze.y ? (spitze = { li, pi, y: p.cur.y, kreuzung: p.kreuzung }) : 0)));
  const sp = spitze!;
  const WEIT = 70;
  const lagenBei = (weit: number): Float64Array[] =>
    loops.map((l, li) => {
      const D: V3[] = l.punkte.map((p, pi) => ((li === sp.li && pi === sp.pi) || (sp.kreuzung !== undefined && p.kreuzung === sp.kreuzung) ? { x: 0, y: weit, z: 0 } : { x: 0, y: 0, z: 0 }));
      const d = verschiebungLaengs(l, D);
      return Float64Array.from(l.ruhe, (x, k) => x + d[k]!);
    });
  const lagen = lagenBei(WEIT);
  const y0 = 250;
  const bei = (t: number, weit: number): number => y0 + t * (sp.y + weit - y0);
  const dick = (hh: Haut, weit: number): string => T3.map((t) => z1(hornSchnitt(hh, bei(t, weit)).z)).join(' · ');
  const mehr = (hh: Haut): string => T3.map((t) => pz(hornSchnitt(hh, bei(t, WEIT)).z, hornSchnitt(h, bei(t, 0)).z)).join(' · ');
  console.log(`Horn am strange bird (${h.n} Punkte), Spitze um ${WEIT} nach oben. Dicke (in z) bei 40 / 60 / 80 % der Länge: vorher ${dick(h, 0)}`);
  const gleichesStueck = (hh: Haut): string => T3.map((t) => { const q = stueck(h, hh, bei(t, 0)); return pz(q.nach, q.vor); }).join(' · ');
  let stueckHeute = '';
  {
    const hh = kopie(h);
    heute(hh, loops, lagen);
    stueckHeute = gleichesStueck(hh);
    console.log(`   dieselben Punkte der Haut vorher und nachher (ihre Dicke in z): heute ${stueckHeute}`);
  }
  // heute
  const sH = zugHeute({ h: kopie(h), loops: loopsKopie(loops) }, lagen, mk);
  console.log(`   heute (bis zur Ruhe, dann verdichtet): ${dick(sH.h, WEIT)} (${mehr(sH.h)}), ${fz(sH.h)}`);
  // B: im Zug, dann nach dem Loslassen (verdichtet, neue Haut gerundet)
  const imZug = kopie(h);
  const b = bAnlegen(imZug, loops);
  let t = performance.now();
  b.ziehen(lagen);
  const msZug = performance.now() - t;
  console.log(`   B im Zug (ein Rechnen ${msZug.toFixed(0)} ms, davon Zerlegen ${b.d.zeiten.zerlegen.toFixed(0)} ms, Einsetzen ${b.d.zeiten.loesen.toFixed(0)} ms): ${dick(imZug, WEIT)} (${mehr(imZug)}), ${fz(imZug)} (vorher ${fz(h)}) · dieselben Punkte: ${gleichesStueck(imZug)}`);
  const imZugB = kopie(imZug);
  // hin und zurück mit demselben Stand
  b.ziehen(loops.map((l) => l.ruhe));
  console.log(`   B hin und zurück: größter Unterschied zur Haut vor dem Zug ${weg(imZug.pos, h.pos).toExponential(1)}`);
  t = performance.now();
  const sB = zugB({ h: kopie(h), loops: loopsKopie(loops) }, lagen, mk);
  console.log(`   B nach dem Loslassen (verdichtet, ${sB.neu} neue Punkte, ${sB.bereich} Punkte in ${sB.rundenZahl} Runden gerundet, zusammen ${(performance.now() - t).toFixed(0)} ms): ${dick(sB.h, WEIT)} (${mehr(sB.h)}), ${fz(sB.h)}`);
  // nach dem Loslassen: neu anlegen, Linien unbewegt
  {
    const hh = kopie(sB.h);
    bAnlegen(hh, sB.loops).ziehen(sB.loops.map((l) => l.ruhe));
    console.log(`   B neu angelegt, Linien unbewegt: Haut bewegt sich um höchstens ${weg(hh.pos, sB.h.pos).toExponential(1)}`);
  }
  blatt.push({
    kurz: 'horn',
    titel: `Horn am „strange bird“: Spitze um ${WEIT} Einheiten nach oben gezogen`,
    blicke: [
      ['Seite', 0, 0, 0.8],
      ['von vorn', -90, 0, 0.8],
    ],
    bilder: [
      { name: 'vorher', h, loops, notiz: `Dicke des Horns (von vorn gesehen) bei 40 / 60 / 80 % seiner Länge: ${dick(h, 0)}` },
      { name: 'heute', h: sH.h, loops: sH.loops, notiz: `Dicke ${dick(sH.h, WEIT)} (${mehr(sH.h)}). Dasselbe Stück Haut vorher und nachher: ${stueckHeute}.` },
      { name: NAME_B, h: sB.h, loops: sB.loops, notiz: `Dicke ${dick(sB.h, WEIT)} (${mehr(sB.h)}). Dasselbe Stück Haut vorher und nachher: ${gleichesStueck(imZugB)}. ${fz(sB.h)} (vorher ${fz(h)}).` },
    ],
  });
}

function biegen(): void {
  const { h, loops, mk } = formLaden('strange bird');
  let yS = -Infinity;
  for (const l of loops) for (const p of l.punkte) yS = Math.max(yS, p.cur.y);
  // gebogen wird das Horn oberhalb von y = 300, um die Achse quer zur Seite durch seine Mitte dort; an der Spitze 30°
  const yA = 300;
  let cx = 0;
  let cn = 0;
  for (let v = 0; v < h.n; v++)
    if (Math.abs(h.pos[3 * v + 1]! - yA) < 8 && h.pos[3 * v + 2]! > 1) {
      cx += h.pos[3 * v]!;
      cn++;
    }
  cx /= Math.max(1, cn);
  const GRAD = Number(process.env.GRAD ?? 30);
  const winkel = (y: number, anteil: number): number => {
    const u = Math.max(0, Math.min(1, (y - yA) / (yS - yA)));
    return ((anteil * GRAD * Math.PI) / 180) * u * u * (3 - 2 * u);
  };
  const drehe = (p: [number, number, number], a: number): [number, number, number] => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = p[0] - cx;
    const dy = p[1] - yA;
    return [cx + c * dx - s * dy, yA + s * dx + c * dy, p[2]];
  };
  const biege = (anteil: number): Abbildung => (x, y, z) => (y <= yA ? [x, y, z] : drehe([x, y, z], winkel(y, anteil)));
  /** einen Punkt der gebogenen Form zurückbiegen (seine Höhe vor dem Biegen in ein paar Schritten suchen) */
  const zurueck = (p: [number, number, number]): [number, number, number] => {
    if (p[1] <= yA && Math.abs(p[0] - cx) < 1e9 && p[1] < yA - 60) return p;
    let y = p[1];
    let q = p;
    for (let k = 0; k < 8; k++) {
      q = drehe(p, -winkel(y, 1));
      y = q[1];
    }
    return q;
  };
  const lagen = loops.map((l) => abbilden(l.ruhe, biege(1)));
  const bei = (t: number): number => 250 + t * (yS - 250);
  const dick = (hh: Haut, zb?: typeof zurueck): string => T3.map((t) => `${z1(hornSchnitt(hh, bei(t), zb).x)} × ${z1(hornSchnitt(hh, bei(t), zb).z)}`).join(' · ');
  const mehr = (hh: Haut): string => T3.map((t) => `${pz(hornSchnitt(hh, bei(t), zurueck).x, hornSchnitt(h, bei(t)).x)} × ${pz(hornSchnitt(hh, bei(t), zurueck).z, hornSchnitt(h, bei(t)).z)}`).join(' · ');
  console.log(`Horn am strange bird um ${GRAD}° gebogen (oberhalb y = ${yA}, an der Spitze ${GRAD}°). Querschnitt bei 40 / 60 / 80 % (in x × in z, zurückgebogen gemessen): vorher ${dick(h)}; ${fz(h)}`);
  const sH = zugHeute({ h: kopie(h), loops: loopsKopie(loops) }, lagen, mk);
  console.log(`   heute: ${dick(sH.h, zurueck)} (${mehr(sH.h)}), ${fz(sH.h)}`);
  const imZug = kopie(h);
  const b = bAnlegen(imZug, loops);
  b.ziehen(lagen);
  console.log(`   B im Zug: ${dick(imZug, zurueck)} (${mehr(imZug)}), ${fz(imZug)}`);
  b.ziehen(loops.map((l) => l.ruhe));
  console.log(`   B hin und zurück: größter Unterschied ${weg(imZug.pos, h.pos).toExponential(1)}`);
  // ohne Mitdrehen der Normalen zum Vergleich (wie im ersten Beweis)
  {
    const hh = kopie(h);
    const plan = bindungenAus(hh, loops);
    const d = new HautDirekt(hh, plan.bind, { hart: hartePunkte(hh, loops), stand: true });
    d.lagenLoesen(zieleAus(plan, lagen), hautNormalenMax(hh));
    console.log(`   B ohne Mitdrehen der Normalen: ${dick(hh, zurueck)} (${mehr(hh)}), ${fz(hh)}`);
  }
  // Tempo beim Biegen: 30 Bilder von 0° bis zum vollen Winkel, einmal beim Greifen zerlegt, je Bild nur nachgeführt
  {
    const hh = kopie(h);
    const bb = bAnlegen(hh, loops);
    const t0 = performance.now();
    bb.ziehen(loops.map((l) => l.ruhe));
    const greifen = performance.now() - t0;
    const schritte: number[] = [];
    const zeiten: number[] = [];
    const BILDER = 30;
    for (let k = 1; k <= BILDER; k++) {
      const L = loops.map((l) => abbilden(l.ruhe, biege(k / BILDER)));
      const t = performance.now();
      schritte.push(bb.nachfuehren(L));
      zeiten.push(performance.now() - t);
    }
    const genauH = kopie(h);
    bAnlegen(genauH, loops).ziehen(lagen);
    const sz = [...zeiten].sort((x, y) => x - y);
    const ss = [...schritte].sort((x, y) => x - y);
    console.log(`   B ohne neues Zerlegen je Bild (${BILDER} Bilder bis ${GRAD}°, Greifen ${greifen.toFixed(0)} ms): Schritte des Nachführens je Bild Median ${ss[BILDER >> 1]}, größter ${ss[BILDER - 1]}; Zeit je Bild Median ${sz[BILDER >> 1]!.toFixed(0)} ms, größte ${sz[BILDER - 1]!.toFixed(0)} ms; am Ende gegen die genaue Lösung höchstens ${z2(weg(hh.pos, genauH.pos))} daneben`);
  }
  const sB = zugB({ h: kopie(h), loops: loopsKopie(loops) }, lagen, mk);
  console.log(`   B nach dem Loslassen (verdichtet, ${sB.neu} neue Punkte, ${sB.bereich} Punkte in ${sB.rundenZahl} Runden gerundet): ${dick(sB.h, zurueck)} (${mehr(sB.h)}), ${fz(sB.h)}`);
  {
    const hh = kopie(sB.h);
    bAnlegen(hh, sB.loops).ziehen(sB.loops.map((l) => l.ruhe));
    console.log(`   B neu angelegt, Linien unbewegt: Haut bewegt sich um höchstens ${weg(hh.pos, sB.h.pos).toExponential(1)}`);
  }
  blatt.push({
    kurz: 'biegen',
    titel: `Horn am „strange bird“ um ${GRAD}° gebogen`,
    blicke: [
      ['Seite', 0, 0, 0.8],
      ['schräg von vorn', -40, 20, 0.8],
    ],
    bilder: [
      { name: 'vorher', h, loops, notiz: `${fz(h)}` },
      { name: 'heute', h: sH.h, loops: sH.loops, notiz: `Querschnitt gegen vorher (in x × in z): ${mehr(sH.h)}. ${fz(sH.h)}.` },
      { name: NAME_B, h: sB.h, loops: sB.loops, notiz: `Querschnitt gegen vorher (in x × in z): ${mehr(sB.h)}. ${fz(sB.h)}.` },
    ],
  });
}

// ---- seine drei Formen angefasst, nichts gezogen -----------------------------------------------------------------------------
function formen(): void {
  for (const name of ['strange bird', 'teat firefish', 'test_kaputt']) {
    const { h, loops } = formLaden(name);
    const hB = kopie(h);
    const t = performance.now();
    bAnlegen(hB, loops).ziehen(loops.map((l) => l.ruhe));
    const ms = performance.now() - t;
    const hH = kopie(h);
    const runden = heute(hH, loops, loops.map((l) => l.ruhe));
    const aH = abstand(hH, h);
    console.log(`${name} (${h.n} Punkte) angefasst, nichts gezogen: B bewegt die Haut um höchstens ${weg(hB.pos, h.pos).toExponential(1)} (${ms.toFixed(0)} ms) · heute im Mittel ${z2(aH.mittel)}, größter ${z1(aH.max)} (${runden} Runden)`);
  }
}

const t0 = performance.now();
if (FAELLE.includes('ruessel')) ruessel();
if (FAELLE.includes('horn')) horn();
if (FAELLE.includes('biegen')) biegen();
if (FAELLE.includes('formen')) formen();
if (process.env.BLATT) {
  const titel = 'Zweiter Beweis: B (Linien bewegen die Haut direkt)';
  blattSchreiben(`${process.env.BLATT}.html`, titel, blatt);
  blatt.forEach((z, i) => blattSchreiben(`${process.env.BLATT}-${i + 1}-${z.kurz}.html`, titel, [z]));
  console.log(`${process.env.BLATT}.html und ${blatt.length} einzelne`);
}
console.log(`${((performance.now() - t0) / 1000).toFixed(0)} s`);
