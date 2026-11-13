// Plan vom 12.11.2026, Schritt 4: zweiter kleiner Beweis „Donut mit Florians Regel“ (13.11.2026), im Kern ohne Fenster.
// Florian: „Ich hätte mir vorgestellt, dass beim Donut an den neuen Kreuzungen Punkte ohne Knick entstehen und so der Donut wirklich
// ohne harte Kante entsteht. […] Beim Loslassen verschwindet er [der gezogene Punkt], und es gibt kein Zurückziehen. So ähnlich ist
// es bei Blender, wenn Clipping beim Mirror Modifier eingestellt ist.“
// Derselbe Fall wie `form-donut.ts` (Kugel mit drei Loops, der Punkt an der Seite durch die Spiegelebene gezogen), die Linien wie im
// Fenster genau auf ihren Pfaden. Beim Loslassen:
//   1. Die Hälfte der Haut wird an der Ebene abgeschnitten und mit ihrem Spiegelbild zu einer Haut verbunden (`verschmelzen`).
//   2. Der Pfad jeder geschnittenen Linie wird an der Ebene geteilt (de Casteljau: Was über der Ebene bleibt, behält genau seine
//      Form; der gezogene Punkt darunter fällt weg). Das neue Ende auf der Ebene ist ein Punkt ohne Knick: Sein Griff steht
//      senkrecht zur Ebene, die Linie läuft rund in ihr Spiegelbild (wie jedes Ende eines Rings im Kern). Vom Griff des geteilten
//      Stücks bleibt, was senkrecht zur Ebene zeigt: die kleinste Änderung, die den Punkt glatt macht. Taucht die Linie flach durch
//      die Ebene (der Punkt ist gerade erst über die Mitte), ist der Griff kurz, und die Form springt nicht.
//   3. Der Rand des Lochs ist ein neuer Loop der Mittelebene durch diese neuen Enden (die neuen Kreuzungen). Auch dort ist jeder
//      Punkt glatt, der Loop so rund wie möglich (Richtung parallel zur Sehne der Nachbarpunkte, Grifflänge wie ein Kreisbogen).
//   4. Die heutige Rechnung rechnet weiter, bis die Haut steht (sie folgt den Linien auf ihre neuen Pfade).
// Schalter zum Nachrechnen dessen, was verworfen wurde:
//   GRIFFE=angepasst  die Griffe der neuen Punkte nach dem Verlauf der abgeschnittenen Linie angepasst (`griffeAnlegen`): Sie werden
//                     null lang, die Spitze an den Kreuzungen bleibt (Knick am Rand im Mittel 26°, größter 88°, das Loch eckig)
//   GRIFFE=lang       der neue Griff behält seine ganze Länge: beim großen Loch der rundeste Schlauch, aber gerade erst über die Mitte
//                     gezogen springt die Form (die Linien gehen 43 statt 13 von ihrer Lage); mehrere mit Komma: je eine Spalte
//   RAND=ort          die Punkte des neuen Rands halten nur den Ort und geben keine Wölbung vor: Die Rechnung kommt nicht zur Ruhe
//   FANGEN=0          beim Schneiden nichts auf die Ebene legen: Es bleiben schmale Dreiecke; auf dem Standardnetz ohne Folgen, mit
//                     viermal so vielen Dreiecken (DREIECKE=8000) kommt die Rechnung daran nicht zur Ruhe (152 umgestülpt)
//   ERST=1            zuerst verdichten, dann rechnen (siehe unten)
// Ergebnis vom 13.11. (`docs/UEBERGABE.md`, Abschnitt 7; Bilder `docs/progress/editor/schritt4-donut-regel*-2026-11-13.jpg`, Zahlen
// `schritt4-donut-regel-messung-2026-11-13.txt`): Mit der Regel ist der Rand des Lochs glatt und das Loch rund (Halbmesser 91,1 bis
// 91,8 statt 77 bis 92; Knick quer über den Rand im Mittel 18° statt 96°, so groß wie eine Reihe daneben), die heutige Rechnung steht
// nach 3 + 8 Runden. Gleich bei mittlerem und kleinem Loch und auf dem feinen Netz.
// Kriterien (Plan, Schritt 4, Nachtrag vom 13.11. nachts): keine Kante am Rand des Lochs im Bild, im Schnitt keine Spitze; Knick quer
// über den Rand nicht größer als daneben; das Loch ohne Ecken, Halbmesser im Bereich von heute; die Rechnung kommt zur Ruhe.
// Aufruf aus packages/shape: BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-donut-regel.ts
//   TIEF=190 (so weit wird der Punkt gezogen; die Kugel hat Radius 150; mehrere mit Komma: je eine Zeile)   DREIECKE=2000
import { HautAusKurven } from '../../../../packages/shape/src/dicht/ausKurven';
import { type Haut, type V3 } from '../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  type LoopPunkt,
  bindungenAus,
  festlegen,
  griffeAnlegen,
  hatPfad,
  hautLagen,
  kantenGewichte,
  kruemmungsKetten,
  mittlereKante,
  pfadLagen,
  pfadParameter,
  zieleAus,
} from '../../../../packages/shape/src/dicht/loops';
import { type BlattBild, type BlattSchnitt, blattSchreiben } from './form-direkt-blatt';
import { R, kugelMit, nachVerdichten } from './form-direkt-faelle';
import { fz, heute, knickDaneben, kopie, lochRund, loopsKopie, randKnick, richtungswechsel, schnittDurch, verschmelzen, z1, z2 } from './form-donut-teile';

const TIEFEN = (process.env.TIEF ?? '190').split(',').map(Number);
const DREIECKE = Number(process.env.DREIECKE ?? 2000);
/** Länge der Griffe an den neuen Enden: `anteil` (die Regel), `lang`, `angepasst` (siehe oben); mehrere mit Komma: je eine Spalte */
type GriffArt = 'anteil' | 'lang' | 'angepasst';
const GRIFF_ARTEN = (process.env.GRIFFE ?? 'anteil').split(',').map((g): GriffArt => (g === 'lang' || g === 'angepasst' ? g : 'anteil'));
const NUR_ORT = process.env.RAND === 'ort';
/** beim Schneiden: Punkte, neben denen näher als dieser Anteil einer Kante geschnitten würde, kommen selbst auf die Ebene (`FANGEN=0`: aus) */
const FANGEN = Number(process.env.FANGEN ?? 0.25);

type Stand = { h: Haut; loops: Loop[]; randId: number };
const randLoop = (s: Stand): Loop => s.loops.find((l) => l.id === s.randId)!;
const randPunkte = (s: Stand): number[] => randLoop(s).proben.map((p) => p.ecken[0]);

const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mal = (a: V3, f: number): V3 => ({ x: a.x * f, y: a.y * f, z: a.z * f });
const laenge = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const zwischen = (a: V3, b: V3, t: number): V3 => plus(a, mal(minus(b, a), t));

/** Ein Bézier-Stück: seine vier Kontrollpunkte */
type Stueck = [V3, V3, V3, V3];
/** de Casteljau: das Stück bis t und das ab t; zusammen genau das alte */
function teilen(k: Stueck, t: number): [Stueck, Stueck] {
  const ab = zwischen(k[0], k[1], t);
  const bc = zwischen(k[1], k[2], t);
  const cd = zwischen(k[2], k[3], t);
  const abc = zwischen(ab, bc, t);
  const bcd = zwischen(bc, cd, t);
  const m = zwischen(abc, bcd, t);
  return [
    [k[0], ab, abc, m],
    [m, bcd, cd, k[3]],
  ];
}
const hoehe = (k: Stueck, t: number): number => {
  const u = 1 - t;
  return u * u * u * k[0].z + 3 * u * u * t * k[1].z + 3 * u * t * t * k[2].z + t * t * t * k[3].z;
};
/** Stellen im Inneren des Stücks, an denen es die Ebene z = 0 kreuzt (aufsteigend) */
function kreuztEbene(k: Stueck): number[] {
  const aus: number[] = [];
  const N = 400;
  let t0 = 1e-6;
  let h0 = hoehe(k, t0);
  for (let i = 1; i <= N; i++) {
    const t1 = i === N ? 1 - 1e-6 : i / N;
    const h1 = hoehe(k, t1);
    if (h0 > 0 !== h1 > 0) {
      let a = t0;
      let b = t1;
      for (let r = 0; r < 60; r++) {
        const m = (a + b) / 2;
        if (hoehe(k, m) > 0 === h0 > 0) a = m;
        else b = m;
      }
      aus.push((a + b) / 2);
    }
    t0 = t1;
    h0 = h1;
  }
  return aus;
}

/**
 * Die Teile des Pfads eines Rings, die über der Ebene liegen: je Teil seine Punkte mit Griffen, Anfang und Ende auf der Ebene. Ein
 * Punkt unter der Ebene fällt weg. `neu`: die Enden, die beim Schneiden entstanden sind; ihr Griff ist noch der des geteilten Stücks
 * (die Linie hat dort ihre alte Richtung).
 */
function pfadUeberDerEbene(l: Loop): { teile: LoopPunkt[][]; neu: Set<LoopPunkt> } {
  const P = l.punkte;
  const teile: LoopPunkt[][] = [];
  const neu = new Set<LoopPunkt>();
  const punkt = (p: LoopPunkt): LoopPunkt => ({ ...p, ref: { ...p.ref }, cur: { ...p.ref }, s: 0 });
  const schnittPunkt = (q: V3): LoopPunkt => {
    const p: LoopPunkt = { s: 0, ref: { x: q.x, y: q.y, z: 0 }, cur: { x: q.x, y: q.y, z: 0 } };
    neu.add(p);
    return p;
  };
  let jetzt: LoopPunkt[] | null = [punkt(P[0]!)];
  for (let i = 0; i + 1 < P.length; i++) {
    const a = P[i]!;
    const b = P[i + 1]!;
    let rest: Stueck = [a.ref, plus(a.ref, a.aus!), plus(b.ref, b.ein!), b.ref];
    let t0 = 0;
    for (const t of kreuztEbene(rest)) {
      const [vorn, hinten] = teilen(rest, (t - t0) / (1 - t0));
      if (jetzt) {
        // hier taucht die Linie unter die Ebene: Der Teil endet am Schnittpunkt
        jetzt[jetzt.length - 1]!.aus = minus(vorn[1], vorn[0]);
        const ende = schnittPunkt(vorn[3]);
        ende.ein = minus(vorn[2], vorn[3]);
        jetzt.push(ende);
        teile.push(jetzt);
        jetzt = null;
      } else {
        // hier taucht sie wieder auf: Ein neuer Teil beginnt am Schnittpunkt
        const anfang = schnittPunkt(hinten[0]);
        anfang.aus = minus(hinten[1], hinten[0]);
        jetzt = [anfang];
      }
      rest = hinten;
      t0 = t;
    }
    if (jetzt) {
      jetzt[jetzt.length - 1]!.aus = minus(rest[1], rest[0]);
      const naechster = punkt(b);
      naechster.ein = minus(rest[2], rest[3]);
      jetzt.push(naechster);
    }
  }
  if (jetzt) teile.push(jetzt);
  return { teile, neu };
}

/**
 * Die heutige Rechnung (`HautAusKurven` nach der Geometrie, über die ganze Haut) zu den Lagen `lagen` der Linien: in `schritte`
 * Schritten hin, dann Runden bis zur Ruhe. `nurOrt`: Punkte der Haut, an denen eine Linie nur den Ort hält und keine Wölbung vorgibt
 * (die Rechnung verteilt die Wölbung dort wie an freier Haut); null: wie im Fenster.
 */
function rechnen(h: Haut, loops: readonly Loop[], lagen: readonly Float64Array[], nurOrt: ReadonlySet<number> | null, schritte: number, ende: number): { runden: number; steht: boolean; fest: boolean } {
  const plan = bindungenAus(h, loops);
  const start = loops.map((l) => Float64Array.from(l.ruhe));
  let ketten = kruemmungsKetten(plan, loops);
  if (nurOrt) {
    const kette: (Int32Array | undefined)[] = ketten.kette.slice();
    for (let j = 0; j < plan.loop.length; j++) if (nurOrt.has(plan.bind.ecken[3 * j]!)) kette[j] = undefined;
    ketten = { ...ketten, kette: kette as Int32Array[] };
  }
  const loeser = new HautAusKurven(h, plan.bind, zieleAus(plan, start), null, 100, kantenGewichte(h, loops), ketten, 'geometrie', {});
  const bei = (f: number): Float64Array =>
    zieleAus(
      plan,
      start.map((s, i) => Float64Array.from(s, (x, k) => x + f * (lagen[i]![k]! - x))),
    );
  for (let s = 1; s <= schritte; s++) loeser.schritt(bei(s / schritte), 2);
  const ziel = bei(1);
  let r = 0;
  let steht = false;
  for (; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    loeser.schritt(ziel, 1);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!Number.isFinite(w)) throw new Error('die Haut ist nicht endlich');
    if (w < 0.02) {
      steht = true;
      break;
    }
  }
  return { runden: r + (steht ? 1 : 0), steht, fest: loeser.stehtFest };
}

/** größter Weg der Proben einer Linie von ihrer Lage auf ihren Pfad */
function wegZumPfad(l: Loop): number {
  const p = pfadLagen(l);
  let m = 0;
  if (p) for (let j = 0; j < p.length; j += 3) m = Math.max(m, Math.hypot(p[j]! - l.ruhe[j]!, p[j + 1]! - l.ruhe[j + 1]!, p[j + 2]! - l.ruhe[j + 2]!));
  return m;
}

/**
 * Florians Regel an der verbundenen Haut (Punkte 2 und 3 oben). `original`: die Loops vor dem Schnitt mit ihren Pfaden (der gezogene
 * Punkt unter der Ebene), `von`: aus welchem davon jeder Loop der verbundenen Haut stammt.
 */
function regelAnlegen(s: Stand, original: readonly Loop[], von: readonly number[], griffArt: GriffArt): string {
  const rand = randLoop(s);
  const stelle = new Map<number, number>();
  rand.proben.forEach((p, i) => stelle.set(p.ecken[0], i));
  let k = 1 + Math.max(0, ...original.flatMap((l) => l.punkte.map((p) => p.kreuzung ?? 0)));
  const knicke: number[] = [];
  const griffe: number[] = [];
  let stuecke = 0;
  const kreuzung = (l: Loop, p: LoopPunkt, probe: number): void => {
    // das neue Ende liegt auf dem Rand des Lochs: eine Kreuzung mit ihm, ein Punkt, den man sieht und greifen kann
    const i = stelle.get(l.proben[probe]!.ecken[0]);
    if (i === undefined) throw new Error('ein neues Ende liegt nicht auf dem Rand des Lochs');
    p.kreuzung = k;
    delete p.vonSelbst;
    rand.punkte.push({ s: rand.s[i]!, ref: { ...p.ref }, cur: { ...p.ref }, kreuzung: k });
    k++;
  };
  original.forEach((o, oi) => {
    const hier = s.loops.filter((_, i) => von[i] === oi);
    if (o.art === 'mitte') {
      // die Mittellinie außen bleibt, wie sie war: ihre Punkte und Griffe
      const m = hier[0];
      if (m && m.proben.length === o.proben.length) {
        m.punkte = o.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.ref } }));
        m.s = Float64Array.from(o.s);
        m.laenge = o.laenge;
        if (o.pfad !== undefined) m.pfad = o.pfad;
      }
      return;
    }
    if (o.art !== 'ring' || !hatPfad(o)) return;
    if (griffArt === 'angepasst') {
      for (const l of hier) {
        griffeAnlegen(l, l.ruhe, true);
        stuecke++;
        const n = l.proben.length;
        if (stelle.has(l.proben[0]!.ecken[0])) kreuzung(l, l.punkte[0]!, 0);
        if (stelle.has(l.proben[n - 1]!.ecken[0])) kreuzung(l, l.punkte[l.punkte.length - 1]!, n - 1);
        for (const p of [l.punkte[0]!, l.punkte[l.punkte.length - 1]!]) if (p.kreuzung !== undefined && p.kreuzung >= k - 2) griffe.push(Math.abs((p.s === 0 ? p.aus! : p.ein!).z));
      }
      return;
    }
    const { teile, neu } = pfadUeberDerEbene(o);
    if (teile.length !== hier.length) throw new Error(`der Pfad von Loop ${o.id} hat ${teile.length} Teile über der Ebene, die Haut ${hier.length}`);
    teile.forEach((teil, ti) => {
      const l = hier[ti]!;
      const n = l.proben.length;
      stuecke++;
      teil.forEach((p, pi) => {
        if (pi === 0) p.s = 0;
        else if (pi === teil.length - 1) p.s = l.laenge;
        else {
          // ein Punkt im Inneren: an die Stelle der nächsten Probe
          let best = 0;
          for (let j = 1; j < n; j++) if (Math.hypot(l.ruhe[3 * j]! - p.ref.x, l.ruhe[3 * j + 1]! - p.ref.y, l.ruhe[3 * j + 2]! - p.ref.z) < Math.hypot(l.ruhe[3 * best]! - p.ref.x, l.ruhe[3 * best + 1]! - p.ref.y, l.ruhe[3 * best + 2]! - p.ref.z)) best = j;
          p.s = l.s[best]!;
        }
        if (!neu.has(p)) return;
        // Punkt ohne Knick: Der Griff steht senkrecht zur Ebene, der andere ist sein Spiegelbild. Seine Länge: was vom Griff des
        // geteilten Stücks senkrecht zur Ebene zeigt (die kleinste Änderung des Griffs, die den Punkt glatt macht; taucht die Linie
        // flach durch die Ebene, bleibt er kurz, und die Form springt beim Durchstoßen nicht). `GRIFFE=lang`: seine ganze Länge.
        const anfang = pi === 0;
        const roh = anfang ? p.aus! : p.ein!;
        const ganz = laenge(roh);
        const g = griffArt === 'lang' ? ganz : Math.abs(roh.z);
        knicke.push((2 * Math.acos(Math.max(-1, Math.min(1, roh.z / (ganz || 1)))) * 180) / Math.PI);
        griffe.push(g);
        p.aus = { x: 0, y: 0, z: anfang ? g : -g };
        p.ein = { x: 0, y: 0, z: anfang ? -g : g };
        kreuzung(l, p, anfang ? 0 : n - 1);
      });
      // Enden des alten Rings: der Griff nach außen ist das Spiegelbild des inneren
      const erster = teil[0]!;
      const letzter = teil[teil.length - 1]!;
      if (!neu.has(erster)) erster.ein = { ...erster.aus!, z: -erster.aus!.z };
      if (!neu.has(letzter)) letzter.aus = { ...letzter.ein!, z: -letzter.ein!.z };
      l.punkte = teil;
      l.pfad = true;
      pfadParameter(l, l.ruhe);
    });
  });
  // der Rand des Lochs: durch die neuen Kreuzungen, jeder Punkt glatt, so rund wie möglich
  rand.punkte.sort((a, b) => a.s - b.s);
  const P = rand.punkte;
  const m = P.length;
  const randGriffe: number[] = [];
  if (griffArt === 'angepasst') griffeAnlegen(rand, rand.ruhe, true);
  else if (m >= 2) {
    P.forEach((p, i) => {
      const a = P[(i + m - 1) % m]!.ref;
      const b = P[(i + 1) % m]!.ref;
      let u = minus(b, a);
      if (laenge(u) < 1e-6) {
        // nur zwei Punkte: quer zur Sehne, in Laufrichtung des Rands
        const sehne = minus(b, p.ref);
        u = { x: -sehne.y, y: sehne.x, z: 0 };
        const j = rand.s.findIndex((x) => x > p.s + 1e-9);
        const weiter = j >= 0 ? { x: rand.ruhe[3 * j]! - p.ref.x, y: rand.ruhe[3 * j + 1]! - p.ref.y, z: 0 } : u;
        if (u.x * weiter.x + u.y * weiter.y < 0) u = mal(u, -1);
      }
      u = mal(u, 1 / laenge(u));
      // Länge wie am Kreisbogen durch beide Punkte mit dieser Richtung: (2/3) · Sehne / (1 + cos des Winkels zur Sehne)
      const lang = (q: V3): number => {
        const sehne = minus(q, p.ref);
        const c = laenge(sehne);
        if (c < 1e-9) return 0;
        const cos = Math.abs(u.x * sehne.x + u.y * sehne.y) / c;
        return ((2 / 3) * c) / (1 + cos);
      };
      p.aus = mal(u, lang(b));
      p.ein = mal(u, -lang(a));
      randGriffe.push(lang(a), lang(b));
    });
    rand.pfad = true;
    pfadParameter(rand, rand.ruhe);
  }
  const mittel = (a: readonly number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const wegRinge = Math.max(0, ...s.loops.filter((l) => l.art === 'ring').map(wegZumPfad));
  return `${stuecke} Linienstücke, ${m} neue Kreuzungen${knicke.length ? ` (die Linien knickten dort an der Mitte um ${z1(mittel(knicke))}°; Griffe der neuen Enden im Mittel ${z1(mittel(griffe))} lang, am Rand ${z1(mittel(randGriffe))})` : ` (Griffe der neuen Enden im Mittel ${z1(mittel(griffe))} lang)`}. Die Linien gehen dafür bis ${z1(wegRinge)} (Ringe) und ${z1(wegZumPfad(rand))} (Rand) von ihrer Lage nach dem Schnitt.`;
}

/** Maße am Rand des Lochs */
function masse(s: Stand): { knick: { mittel: number; max: number }; daneben: number; text: string } {
  const rand = randPunkte(s);
  const knick = randKnick(s.h, rand);
  const daneben = knickDaneben(s.h, rand);
  const L = hautLagen(s.h, randLoop(s));
  const e = richtungswechsel(L);
  return {
    knick,
    daneben,
    text: `${lochRund(L)}; längs des Rands biegt er von Punkt zu Punkt höchstens ${z1(e.max)}° (im Mittel ${z1(e.mittel)}°). Knick quer über den Rand: im Mittel ${z1(knick.mittel)}°, größter ${z1(knick.max)}°; eine Reihe daneben im Mittel ${z1(daneben)}°. ${fz(s.h)}.`,
  };
}

const pfade = (loops: readonly Loop[]): Float64Array[] => loops.map((l) => pfadLagen(l) ?? Float64Array.from(l.ruhe));
const legen = (h: Haut, loops: readonly Loop[]): void => {
  for (const l of loops) festlegen(h, l, !hatPfad(l));
};

// die Kugel mit drei Loops; wie im Fenster ist jede Linie genau ihr Pfad
const start = kugelMit('drei', DREIECKE);
const mk = mittlereKante(start.h);
for (const l of start.loops) griffeAnlegen(l, l.ruhe, true);
heute(start.h, start.loops, pfade(start.loops));
legen(start.h, start.loops);
// der Punkt an der Seite: die Kreuzung mit dem größten z
let wahl: { kreuzung: number; z: number; x: number; y: number } | null = null;
for (const l of start.loops) for (const p of l.punkte) if (p.kreuzung !== undefined && (!wahl || p.ref.z > wahl.z)) wahl = { kreuzung: p.kreuzung, z: p.ref.z, x: p.ref.x, y: p.ref.y };
const kz = wahl!.kreuzung;
console.log(`Kugel mit drei Loops (${start.h.n} Punkte, Radius ${R}), der Punkt an der Seite bei z = ${z1(wahl!.z)}`);

// Schnitte: durch eine Linie (y = 0, dort läuft ein Ring) und zwischen den Linien (45° durch die Mitte des Lochs)
const schnitte = (h: Haut): BlattSchnitt[] => [
  { titel: 'Schnitt durch eine Linie (von oben gesehen)', strecken: schnittDurch(h, 0, 0, 0), mass: 420, hoch: 0.36 },
  { titel: 'Schnitt zwischen den Linien (45°)', strecken: schnittDurch(h, wahl!.x, wahl!.y, 45), mass: 420, hoch: 0.36 },
];

/** ein Fall: der Punkt um `tief` durch die Spiegelebene gezogen und losgelassen; links wie heute gezeigt, rechts mit der Regel */
function fall(tief: number): BlattBild[] {
  console.log(`— der Punkt wird um ${tief} durch die Spiegelebene gezogen (bis z = ${z1(wahl!.z - tief)})`);
  // im Zug: die ganze Haut gerechnet wie heute, die Linien auf ihren Pfaden mit dem gezogenen Punkt
  const wahr = { h: kopie(start.h), loops: loopsKopie(start.loops) };
  const gezogen = wahr.loops.map((l) => l.punkte.map((p): V3 => (p.kreuzung === kz ? { x: p.ref.x, y: p.ref.y, z: p.ref.z - tief } : p.ref)));
  const rH = heute(
    wahr.h,
    wahr.loops,
    wahr.loops.map((l, i) => pfadLagen(l, gezogen[i]) ?? Float64Array.from(l.ruhe)),
  );
  wahr.loops.forEach((l, i) =>
    l.punkte.forEach((p, j) => {
      p.cur = { ...gezogen[i]![j]! };
    }),
  );
  legen(wahr.h, wahr.loops);
  console.log(`im Zug (heutige Rechnung, ganze Haut): ${rH.runden} Runden bis zur Ruhe${rH.steht ? '' : ' (steht nicht)'}`);
  const bilder: BlattBild[] = [];

  // heute gezeigt: jede Hälfte bis zur Ebene, nichts weiter gerechnet (der Rand als Loop nur, um ihn der Reihe nach zu messen)
  const v0 = verschmelzen(wahr.h, wahr.loops, true);
  const s0: Stand = { h: v0.h, loops: v0.loops, randId: v0.loops[v0.loops.length - 1]!.id };
  const m0 = masse(s0);
  console.log(`heute gezeigt: ${s0.h.n} Punkte. ${m0.text}`);
  const ohne = verschmelzen(wahr.h, wahr.loops, false);
  bilder.push({ name: 'heute: jede Hälfte wird bis zur Mitte gezeigt', h: ohne.h, loops: ohne.loops, notiz: m0.text, schnitt: schnitte(ohne.h) });

  for (const griffArt of GRIFF_ARTEN) {
    const name = `${griffArt === 'angepasst' ? 'deine Regel, die Griffe der neuen Punkte nach der abgeschnittenen Linie angepasst' : griffArt === 'lang' ? 'dieselben Punkte, die Griffe der neuen Enden länger' : 'deine Regel: beim Loslassen geschnitten, neue Punkte ohne Knick'}${NUR_ORT ? ' (der Rand hält nur den Ort)' : ''}`;
    const v = verschmelzen(wahr.h, wahr.loops, true, false, FANGEN);
    const s: Stand = { h: v.h, loops: v.loops, randId: v.loops[v.loops.length - 1]!.id };
    let text = '';
    try {
      const an = regelAnlegen(s, wahr.loops, v.von, griffArt);
      const nurOrt = (): Set<number> | null => (NUR_ORT ? new Set(randPunkte(s)) : null);
      const aufraeumen = (): void => {
        const d = nachVerdichten(s.h, s.loops, mk);
        s.h = d.h;
        s.loops = d.loops;
      };
      // erst gehen die Linien auf ihre neuen Pfade und die Haut rundet sich, dann verdichtet das Netz wie im Fenster nach jedem Zug.
      // `ERST=1`: zuerst verdichten; mit sauberem Schnitt (`FANGEN`) kommt dasselbe heraus, ohne ihn blieben 10 bis 46 umgestülpte
      // Dreiecke (das Verdichten setzt dann viele Punkte an den Grat, der gleich verschwindet).
      if (process.env.ERST === '1') aufraeumen();
      const r1 = rechnen(s.h, s.loops, pfade(s.loops), nurOrt(), 30, 300);
      legen(s.h, s.loops);
      aufraeumen();
      const r2 = rechnen(s.h, s.loops, pfade(s.loops), nurOrt(), 0, 300);
      legen(s.h, s.loops);
      let lauf = `${an} ${r1.runden} + ${r2.runden} Runden bis zur Ruhe${r1.steht && r2.steht ? '' : ' (steht nicht)'}${r1.fest || r2.fest ? ' (die Rechnung hat aufgegeben)' : ''}; ${s.h.n} Punkte.`;
      // noch einmal 100 Runden der heutigen Rechnung, ganz wie im Fenster: Bleibt es so?
      const davor = masse(s);
      const vor = Float64Array.from(s.h.pos);
      const r3 = rechnen(s.h, s.loops, pfade(s.loops), null, 0, 100);
      legen(s.h, s.loops);
      let weg = 0;
      for (let i = 0; i < vor.length; i += 3) weg = Math.max(weg, Math.hypot(s.h.pos[i]! - vor[i]!, s.h.pos[i + 1]! - vor[i + 1]!, s.h.pos[i + 2]! - vor[i + 2]!));
      lauf += ` Weitere Runden der heutigen Rechnung: ${r3.runden}${r3.steht ? '' : ' (steht nicht)'}, die Haut bewegt sich dabei höchstens ${z2(weg)} (Knick am Rand davor im Mittel ${z1(davor.knick.mittel)}°). Die Linien liegen höchstens ${z2(Math.max(0, ...s.loops.map(wegZumPfad)))} neben ihren Pfaden.`;
      text = `${lauf} ${masse(s).text}`;
    } catch (e) {
      text = `hält nicht: ${(e as Error).message}`;
    }
    console.log(`${name}: ${text}`);
    bilder.push({ name, h: s.h, loops: s.loops, notiz: text, schnitt: schnitte(s.h), punkte: true });
  }
  return bilder;
}

const zeilen = TIEFEN.map((tief) => ({
  titel: `Kugel mit drei Loops, der Punkt an der Seite um ${String(tief).replace('.', ',')} durch die Spiegelebene gezogen (bis ${z1(Math.abs(wahl!.z - tief))} hinter die Mitte) und losgelassen`,
  blicke: [
    ['schräg von vorn', -40, 20, 0.8],
    ['von der Seite auf die Mitte', 0, 0, 0.8],
  ] as const,
  bilder: fall(tief),
}));
if (process.env.BLATT) {
  blattSchreiben(`${process.env.BLATT}.html`, 'Schritt 4, zweiter kleiner Beweis: der Donut mit deiner Regel', zeilen, Number(process.env.BREITE ?? 1300));
  console.log(`${process.env.BLATT}.html`);
}
