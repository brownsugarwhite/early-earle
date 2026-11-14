// Zufallsreihe (Plan Teil V): Prüffälle = Körper × Maullage × Linienform × Länge × Kiefer × Bearbeitung danach.
// Jede Achse wird ausgewogen gezogen (gemischte Wiederholungen jeder Liste), damit alle Klassen gleich oft vorkommen;
// derselbe Startwert liefert dieselben Fälle. Die Dokumente entstehen wie im Editor: Stationen am Körper ohne Maul
// eingefroren (Florians üblicher Weg), Maul danach gezeichnet; bei einer Bearbeitung nach dem Maul gelten die Stationen,
// die der Editor nach dem ersten Maulbau zurückschreibt. DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument, KaefigDelta, Linie3 } from '../../dokument';
import { abgleichen } from '../../kopplung';
import { bewegeKnoten, pfadAbtasten, vollerPfad } from '../../profil';
import { type AbleitOptionen, ableiten } from '../ableiten';
import { ableitenMitMaul, maulOptionenVorlage } from '../maul';
import { maulLinieAusDokument } from '../maulDokument';
import { kaefigNormalen, spiegelIndex } from '../pinsel';
import { hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, KOERPER, type KoerperArt, koerperDokument, vorlageVon } from './koerper';
import { ANFAENGE, type Anfang, FORMEN, type Form, KIEFER, type KieferArt, type Laenge, maulBezug, maulLinien } from './linien';
import { type Zufall, zufall } from './zufall';

export const BEARBEITUNGEN = ['keine', 'anfang', 'mundwinkel', 'schaedel', 'kinn', 'schnauze', 'beule-maul', 'beule-silhouette'] as const;
export type Bearbeitung = (typeof BEARBEITUNGEN)[number];

export type Fall = { id: string; koerper: KoerperArt; anfang: Anfang; form: Form; laenge: Laenge; kiefer: KieferArt; bearbeitung: Bearbeitung; start: number };

/** Ausgewogene Folge: gemischte Wiederholungen der Liste. */
function folge<T>(liste: readonly T[], n: number, z: Zufall): T[] {
  const out: T[] = [];
  while (out.length < n) {
    const k = [...liste];
    for (let i = k.length - 1; i > 0; i--) {
      const j = Math.floor(z.zahl() * (i + 1));
      [k[i], k[j]] = [k[j]!, k[i]!];
    }
    out.push(...k);
  }
  return out.slice(0, n);
}

const VORLAGEN: readonly KoerperArt[] = ['kasten', 'rex', 'langhals', 'robbe', 'drache'];

/** `anzahl` Fälle zum Startwert `start`; ungültige Kombinationen (Hals ohne Hals, Vorlagenlinie ohne Vorlage) werden umgezogen. */
export function faelleZiehen(start: number, anzahl: number): Fall[] {
  const z = zufall(start);
  const koerper = folge(KOERPER, anzahl, z.ableger('koerper'));
  const anfaenge = folge(ANFAENGE, anzahl, z.ableger('anfang'));
  const formen = folge(FORMEN, anzahl, z.ableger('form'));
  const laengen = folge(['kurz', 'lang'] as const, anzahl, z.ableger('laenge'));
  const kiefer = folge(KIEFER, anzahl, z.ableger('kiefer'));
  const bearb = folge(BEARBEITUNGEN, anzahl, z.ableger('bearbeitung'));
  const rest = z.ableger('rest');
  const out: Fall[] = [];
  for (let i = 0; i < anzahl; i++) {
    const k = koerper[i]!;
    let a = anfaenge[i]!;
    let f = formen[i]!;
    if (a === 'hals' && k !== 'langhals' && k !== 'drache') a = rest.wahl(['hoch', 'mittel', 'tief', 'kinn'] as const);
    if (f === 'vorlage') {
      if (!VORLAGEN.includes(k)) f = rest.wahl(['gerade', 'hoch', 'runter', 'j', 's', 'senkrecht'] as const);
      else a = 'mittel';
    }
    const fallStart = (start * 7919 + i * 104729) >>> 0;
    out.push({ id: `${String(i).padStart(4, '0')}-${k}-${a}-${f}-${laengen[i]}-${kiefer[i]}-${bearb[i]}`, koerper: k, anfang: a, form: f, laenge: laengen[i]!, kiefer: kiefer[i]!, bearbeitung: bearb[i]!, start: fallStart });
  }
  return out;
}

export type FallDokumente = {
  fall: Fall;
  /** das Wesen mit Maul, wie im Editor nach allen Schritten */
  dok: Dokument;
  /** derselbe Körper ohne Maul (gleiche Bearbeitung, Stationen des Körpers vor dem Maul): die Form, die das Maul nicht verändern darf */
  ohneMaul: Dokument;
  /** Stationen, mit denen der Körper vor dem Maul eingefroren wurde */
  stationenKoerper: NonNullable<NonNullable<Dokument['kaefig']>['stationen']>;
  /** Anfang, Mundwinkel, Länge der vorderen Linie (Welt) */
  maul: { start: [number, number, number]; ecke: [number, number, number]; laenge: number };
};

const PX = 461;
const STUFEN = 2;

function umrissPunkte(dok: Dokument, n = 160): V2[] {
  const sk = dok.skalierung;
  return pfadAbtasten(vollerPfad(dok.profile.seite), n).map((q) => ({ x: q.x * sk, y: q.y * sk }));
}

/** Punkt auf dem Seitenumriss, `bogen` (Welt) vom nächsten Umrisspunkt zu p entfernt (Vorzeichen = Laufrichtung). */
function aufUmrissVerschoben(zug: readonly V2[], p: V2, bogen: number): V2 {
  let i0 = 0;
  for (let i = 1; i < zug.length; i++) if (Math.hypot(zug[i]!.x - p.x, zug[i]!.y - p.y) < Math.hypot(zug[i0]!.x - p.x, zug[i0]!.y - p.y)) i0 = i;
  const n = zug.length;
  let rest = Math.abs(bogen);
  let i = i0;
  const schritt = bogen >= 0 ? 1 : -1;
  while (rest > 0) {
    const a = zug[((i % n) + n) % n]!;
    const b = zug[(((i + schritt) % n) + n) % n]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l >= rest) return { x: a.x + ((b.x - a.x) * rest) / l, y: a.y + ((b.y - a.y) * rest) / l };
    rest -= l;
    i += schritt;
  }
  return zug[i0]!;
}

function knotenSetzen(l: Linie3, i: number, p: [number, number, number]): Linie3 {
  return { knoten: l.knoten.map((k, j) => (j === i ? { ...k, p: [...p] } : k)) };
}

/** Seitenknoten verschieben wie ein Zug im Editor (gekoppelt an Front und Top, nur am entsprechenden Punkt). */
function seiteZiehen(dok: Dokument, i: number, d: V2): Dokument {
  const k = dok.profile.seite.knoten[i]!;
  const neu = bewegeKnoten(dok.profile.seite, i, { x: k.p.x + d.x, y: k.p.y + d.y });
  return { ...dok, profile: abgleichen({ ...dok.profile, seite: neu }, 'seite', dok.profile) };
}

/** Pinselstrich „Aufblasen“ wie `pinselZeiger`: Gewichte um den Treffer und sein Spiegelbild, Versatz entlang der Käfignormalen. */
function aufblasen(dok: Dokument, mitte: [number, number, number], radius: number, betrag: number, opt: Partial<AbleitOptionen>): KaefigDelta[] {
  const abl = ableiten(dok, { stufen: STUFEN, ...opt });
  const xyz = abl.kaefig.xyz;
  const n0 = Math.min(abl.vorlage.kaefig.n, abl.kaefig.n);
  const normalen = kaefigNormalen(xyz, abl.kaefig.fStart, abl.kaefig.fVerts, n0);
  const spiegel = spiegelIndex(xyz, n0);
  const karte = new Map<number, [number, number, number]>();
  for (let p = 0; p < n0; p++) {
    const x = xyz[3 * p]!;
    const y = xyz[3 * p + 1]!;
    const zz = xyz[3 * p + 2]!;
    if (zz < -1e-9) continue;
    const w = Math.max(0, 1 - Math.hypot(x - mitte[0], y - mitte[1], zz - mitte[2]) / radius);
    const ws = Math.max(0, 1 - Math.hypot(x - mitte[0], y - mitte[1], zz + mitte[2]) / radius);
    const g = (w * w * (3 - 2 * w) + ws * ws * (3 - 2 * ws)) * betrag;
    if (g <= 1e-9) continue;
    karte.set(p, [g * normalen[3 * p]!, g * normalen[3 * p + 1]!, Math.abs(zz) < 1e-9 ? 0 : g * normalen[3 * p + 2]!]);
  }
  void spiegel;
  return [...karte].map(([punkt, d]) => ({ punkt, d }));
}

/** Dokumente eines Falls bauen; `fehler`, wenn der Fall auf diesem Körper nicht zeichenbar ist. */
export function fallDokumente(fall: Fall): FallDokumente | { fall: Fall; fehler: string } {
  const z = zufall(fall.start);
  const koerper = koerperDokument(fall.koerper, z.ableger('koerper'));
  const stationenKoerper = ableiten(koerper, { stufen: STUFEN }).gefroren;
  const basis: Dokument = { ...koerper, kaefig: { deltas: [], stationen: stationenKoerper } };
  const opt = { stationen: stationenKoerper };
  const haut = hautAusNetz(ableiten(basis, { stufen: STUFEN, ...opt }));
  const vorlage = GRUNDKOERPER.includes(fall.koerper) ? null : vorlageVon(fall.koerper === 'kasten' ? 'tiger' : fall.koerper === 'drache' ? 'langhals' : (fall.koerper as 'rex' | 'langhals' | 'robbe'));
  const bezug = maulBezug(fall.koerper, basis, vorlage);
  const linien = maulLinien(basis, fall.koerper, bezug, haut, fall.anfang, fall.form, fall.laenge, fall.kiefer, z.ableger('linie'));
  if ('fehler' in linien) return { fall, fehler: linien.fehler };
  let dok: Dokument = { ...basis, maul: { zu: { oben: linien.oben, ...(linien.unten ? { unten: linien.unten } : {}) } } };
  let ohneMaul: Dokument = basis;
  if (fall.bearbeitung !== 'keine') {
    // der Editor schreibt nach dem ersten Maulbau die Stationen zurück (`kernBau.ts`); die Bearbeitung baut darauf
    const linie = maulLinieAusDokument(dok);
    if (linie) {
      try {
        const g = ableitenMitMaul(dok, linie, { stufen: STUFEN, ...opt }, maulOptionenVorlage('vorn')).gefroren;
        dok = { ...dok, kaefig: { deltas: [], stationen: g } };
      } catch {
        // Maul baut nicht: Stationen des Körpers bleiben
      }
    }
    const zz = z.ableger('bearbeitung');
    const vorne = fall.kiefer === 'unterbiss' ? 'unten' : 'oben';
    const zu = dok.maul!.zu;
    const schritt = 10 / PX;
    const sk = dok.skalierung;
    const knotenIn = (pred: (x: number, y: number) => boolean, wert: (x: number, y: number) => number) => {
      let best = -1;
      let bestWert = -Infinity;
      dok.profile.seite.knoten.forEach((k, i) => {
        if (!pred(k.p.x * sk, k.p.y * sk)) return;
        const w = wert(k.p.x * sk, k.p.y * sk);
        if (w > bestWert) {
          bestWert = w;
          best = i;
        }
      });
      return best;
    };
    switch (fall.bearbeitung) {
      case 'anfang': {
        const l = zu[vorne]!;
        const s = l.knoten[0]!.p;
        if (Math.abs(s[2]) > 1e-9) {
          const y = s[1] + schritt * (zz.zahl() < 0.5 ? 1 : -1);
          const hz = haut(s[0], y);
          if (hz === null) return { fall, fehler: 'Anfang neben dem Körper' };
          zu[vorne] = knotenSetzen(l, 0, [s[0], y, hz]);
        } else {
          const q = aufUmrissVerschoben(umrissPunkte(dok), { x: s[0] * sk, y: s[1] * sk }, schritt * (zz.zahl() < 0.5 ? 1 : -1));
          zu[vorne] = knotenSetzen(l, 0, [q.x / sk, q.y / sk, 0]);
        }
        dok = { ...dok, maul: { zu: { ...zu } } };
        break;
      }
      case 'mundwinkel': {
        const e = linien.ecke;
        const x = e[0] + schritt * (zz.zahl() < 0.5 ? 1 : -1);
        const y = e[1] + schritt * (zz.zahl() < 0.5 ? 1 : -1);
        const hz = haut(x, y);
        if (hz === null) return { fall, fehler: 'Mundwinkel neben dem Körper' };
        const p: [number, number, number] = [x, y, hz];
        const neu = { oben: knotenSetzen(zu.oben, zu.oben.knoten.length - 1, p), ...(zu.unten ? { unten: knotenSetzen(zu.unten, zu.unten.knoten.length - 1, p) } : {}) };
        dok = { ...dok, maul: { zu: neu } };
        break;
      }
      case 'schaedel': {
        const i = knotenIn((x) => x < linien.ecke[0] + 0.05, (_x, y) => y);
        if (i < 0) return { fall, fehler: 'kein Schädelknoten' };
        dok = seiteZiehen(dok, i, { x: 0, y: 18 / PX / sk });
        ohneMaul = seiteZiehen(ohneMaul, i, { x: 0, y: 18 / PX / sk });
        break;
      }
      case 'kinn': {
        const i = knotenIn((x) => x < linien.ecke[0], (_x, y) => -y);
        if (i < 0) return { fall, fehler: 'kein Kinnknoten' };
        dok = seiteZiehen(dok, i, { x: 0, y: -12 / PX / sk });
        ohneMaul = seiteZiehen(ohneMaul, i, { x: 0, y: -12 / PX / sk });
        break;
      }
      case 'schnauze': {
        const i = knotenIn(() => true, (x) => -x);
        dok = seiteZiehen(dok, i, { x: -15 / PX / sk, y: 0 });
        ohneMaul = seiteZiehen(ohneMaul, i, { x: -15 / PX / sk, y: 0 });
        break;
      }
      case 'beule-maul':
      case 'beule-silhouette': {
        let mitte: [number, number, number];
        if (fall.bearbeitung === 'beule-maul') mitte = [...linien.ecke];
        else {
          // höchster Umrisspunkt im Kopffenster (auf der Naht)
          const zug = umrissPunkte(dok).filter((q) => q.x < linien.ecke[0] + 0.05);
          const top = zug.reduce((a, b) => (b.y > a.y ? b : a), zug[0]!);
          mitte = [top.x, top.y, 0];
        }
        const deltas = aufblasen(ohneMaul, mitte, 0.25 * Math.max(0.08, linien.laenge), (fall.bearbeitung === 'beule-maul' ? 0.012 : 0.015) / sk, opt);
        dok = { ...dok, kaefig: { ...dok.kaefig!, deltas } };
        ohneMaul = { ...ohneMaul, kaefig: { ...ohneMaul.kaefig!, deltas } };
        break;
      }
    }
  }
  return { fall, dok, ohneMaul, stationenKoerper, maul: { start: linien.start, ecke: linien.ecke, laenge: linien.laenge } };
}
