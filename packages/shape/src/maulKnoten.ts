// Lippenanfänge als markierte Knoten des Seitenumrisses (Planseite „Ruhiges Netz und Maulschlitz“, Block 2; Florian
// 14.10.: „Ober- und Unterkieferlinie sollen von der Seite direkt in die schwarze Profillinie übergehen und verbunden
// sein, wodurch ein echter Maulschlitz entsteht“). Kiefer gleich = ein Knoten `maul`; getrennt = `maulOben` (rot) und
// `maulUnten` (blau), die Strecke dazwischen ist der Schlitz. Gefunden wird über die Marke, nie über Lage oder Nummer.
import { type V2, abstand, punktAuf } from './bezier';
import type { Dokument, Linie3, Lippen, V3T } from './dokument';
import { type Knoten, type Marke, type Profil, einfuegen, loeschen, naechsterAufProfil, segment, segmentAnzahl } from './profil';

export type MaulRolle = 'oben' | 'unten';

const passt = (m: Marke | undefined, rolle: MaulRolle) => m === 'maul' || m === (rolle === 'oben' ? 'maulOben' : 'maulUnten');

/** Index des Lippenanfangs der roten (oben) bzw. blauen (unten) Lippe; `maul` gilt für beide; −1 = keiner. */
export function maulKnotenIndex(pr: Profil, rolle: MaulRolle): number {
  return pr.knoten.findIndex((k) => passt(k.marke, rolle));
}

/** Sind die Kiefer im Umriss getrennt (zwei Lippenanfänge)? */
export function maulGetrenntImUmriss(pr: Profil): boolean {
  return pr.knoten.some((k) => k.marke === 'maulOben') && pr.knoten.some((k) => k.marke === 'maulUnten');
}

/** Alle Marken entfernen (die Knoten bleiben, sie waren formtreu eingefügt). */
export function maulMarkenEntfernen(pr: Profil): Profil {
  if (!pr.knoten.some((k) => k.marke)) return pr;
  return { ...pr, knoten: pr.knoten.map((k) => (k.marke ? ohneMarke(k) : k)) };
}

function ohneMarke(k: Knoten): Knoten {
  const rest = { ...k };
  delete rest.marke;
  return rest;
}

function markieren(pr: Profil, i: number, marke: Marke): Profil {
  return { ...pr, knoten: pr.knoten.map((k, j) => (j === i ? { ...k, marke } : k)) };
}

/**
 * Lippenanfang auf den Umriss setzen (Kiefer gleich): am nächsten Punkt der Kurve formtreu einfügen (liegt dort schon ein
 * Knoten näher als `rasten`, wird er genommen) und als `maul` markieren; alte Marken fallen weg.
 */
export function maulAnfangSetzen(pr: Profil, p: V2, rasten = 0.004): { profil: Profil; index: number; punkt: V2 } {
  const sauber = maulMarkenEntfernen(pr);
  const nah = sauber.knoten.findIndex((k) => abstand(k.p, p) <= rasten);
  if (nah >= 0) return { profil: markieren(sauber, nah, 'maul'), index: nah, punkt: sauber.knoten[nah]!.p };
  const tr = naechsterAufProfil(sauber, p);
  if (!tr) return { profil: sauber, index: -1, punkt: p };
  const { profil, index } = einfuegen(sauber, tr.segment, tr.t);
  if (index < 0) return { profil: sauber, index: -1, punkt: p };
  return { profil: markieren(profil, index, 'maul'), index, punkt: profil.knoten[index]!.p };
}

/** Punkt auf dem Umriss in Bogenlänge `weg` vom Knoten `i` aus, vorwärts (+1) oder rückwärts (−1); mit Segment und t. */
function entlang(pr: Profil, i: number, richtung: 1 | -1, weg: number): { segment: number; t: number; punkt: V2 } | null {
  const n = pr.knoten.length;
  const segs = segmentAnzahl(pr);
  let rest = weg;
  let s = richtung > 0 ? i : (i - 1 + n) % n;
  for (let runde = 0; runde < segs; runde++) {
    if (s < 0 || s >= segs) return null;
    const kub = segment(pr, s);
    // Bogenlänge des Segments in 64 Schritten, in Laufrichtung
    const proben: { t: number; p: V2; l: number }[] = [];
    let l = 0;
    let vor = punktAuf(kub, richtung > 0 ? 0 : 1);
    for (let k = 0; k <= 64; k++) {
      const t = richtung > 0 ? k / 64 : 1 - k / 64;
      const q = punktAuf(kub, t);
      l += abstand(vor, q);
      vor = q;
      proben.push({ t, p: q, l });
    }
    if (l >= rest) {
      const j = proben.findIndex((q) => q.l >= rest);
      return { segment: s, t: proben[Math.max(0, j)]!.t, punkt: proben[Math.max(0, j)]!.p };
    }
    rest -= l;
    s = richtung > 0 ? (s + 1) % n : (s - 1 + n) % n;
  }
  return null;
}

/**
 * Kiefer trennen: der `maul`-Knoten wird `maulOben` (rot), ein zweiter Knoten `maulUnten` (blau) kommt in Bogenlänge
 * `abstandUnten` auf die Kinnseite des Umrisses (die Seite der Lippenlinie, auf der der tiefste Umrisspunkt liegt).
 * `winkel` = Mundwinkel (Seite), gibt die Richtung der Lippenlinie.
 */
export function maulTrennen(pr: Profil, winkel: V2, abstandUnten = 0.035, ziel?: V2): { profil: Profil; oben: number; unten: number } | null {
  const i = pr.knoten.findIndex((k) => k.marke === 'maul');
  if (i < 0) return null;
  const s = pr.knoten[i]!.p;
  const d = { x: winkel.x - s.x, y: winkel.y - s.y };
  const seite = (q: V2) => Math.sign(d.x * (q.y - s.y) - d.y * (q.x - s.x));
  let tief = pr.knoten[0]!.p;
  for (const k of pr.knoten) if (k.p.y < tief.y) tief = k.p;
  const kinn = seite(tief) || -1;
  // mit Ziel (Anfang der blauen Linie): so weit entlang des Umrisses einfügen, wie das Ziel vom roten Anfang entfernt ist
  // (14.10.: 0,035 fest lag am kleinen Langhals-Kopf schon an der Kehle; der Unterkiefer hatte keine Länge)
  const weg = ziel ? Math.max(0.004, Math.min(abstandUnten, abstand(ziel, s))) : abstandUnten;
  const vor = entlang(pr, i, 1, weg);
  const rueck = entlang(pr, i, -1, weg);
  const wahl = vor && seite(vor.punkt) === kinn ? vor : rueck && seite(rueck.punkt) === kinn ? rueck : (vor ?? rueck);
  if (!wahl) return null;
  const { profil, index } = einfuegen(pr, wahl.segment, wahl.t);
  if (index < 0) return null;
  // der alte Knoten rückt beim Einfügen davor um eins nach hinten
  const oben = index <= i ? i + 1 : i;
  let neu = markieren(profil, oben, 'maulOben');
  neu = markieren(neu, index, 'maulUnten');
  return { profil: neu, oben, unten: index };
}

/** Kiefer gleich: der blaue Knoten wird formtreu gelöscht, der rote wird `maul`. */
export function maulVereinen(pr: Profil): Profil {
  const u = pr.knoten.findIndex((k) => k.marke === 'maulUnten');
  const o = pr.knoten.findIndex((k) => k.marke === 'maulOben');
  if (u < 0 || o < 0) return pr;
  const ohne = { ...pr, knoten: pr.knoten.map((k, j) => (j === u ? ohneMarke(k) : k)) } as Profil;
  const geloescht = loeschen(ohne, u);
  const o2 = geloescht.knoten.findIndex((k) => k.marke === 'maulOben');
  return o2 >= 0 ? markieren(geloescht, o2, 'maul') : geloescht;
}

/** Lippenanfang verschieben (Griffe wandern mit, wie ein Illustrator-Punkt). */
export function maulAnfangBewegen(pr: Profil, rolle: MaulRolle, p: V2): Profil {
  const i = maulKnotenIndex(pr, rolle);
  if (i < 0) return pr;
  return { ...pr, knoten: pr.knoten.map((k, j) => (j === i ? { ...k, p } : k)) };
}

/**
 * Vorschlag der Unterkieferkante für den Chip „getrennt“ (Überbiss, Florians Grundbedingung: blau hinter und über rot,
 * schmaler): die rote Linie, nach innen (oben) versetzt um 7 % der Lippenlänge, zum Mundwinkel auslaufend, seitlich 85 %,
 * der Anfang 15 % der Strecke zum zweiten Knoten zurück, der Mundwinkel gemeinsam. Nach der Lippenlänge statt fest
 * (14.10.: 0,025 fest war am kleinen Langhals-Kopf ein Viertel der Kopfhöhe).
 */
export function unterkieferVorschlag(oben: Linie3): Linie3 {
  const kn = oben.knoten;
  const n = kn.length;
  if (n < 2) return oben;
  const a = kn[0]!.p;
  const e = kn[n - 1]!.p;
  const dy = 0.07 * Math.hypot(e[0] - a[0], e[1] - a[1]);
  const knoten = kn.map((k, i) => {
    const w = i >= n - 1 ? 0 : 1 - (i / (n - 1)) ** 2;
    return { ...k, p: [k.p[0], k.p[1] + dy * w, k.p[2] * 0.85] as V3T, ein: [k.ein[0], k.ein[1], k.ein[2] * 0.85] as V3T, aus: [k.aus[0], k.aus[1], k.aus[2] * 0.85] as V3T };
  });
  const b = knoten[1]!.p;
  const s = knoten[0]!.p;
  knoten[0] = { ...knoten[0]!, p: [s[0] + 0.15 * (b[0] - s[0]), s[1] + 0.15 * (b[1] - s[1]), s[2] + 0.15 * (b[2] - s[2])] as V3T };
  knoten[n - 1] = { ...knoten[n - 1]!, p: [...e] as V3T };
  return { ...oben, knoten };
}

// ---------- Dokument: Lippenlinien und Lippenanfänge zusammen führen ----------

function startAuf(l: Linie3, p: V2): Linie3 {
  const k0 = l.knoten[0]!;
  if (Math.abs(k0.p[0] - p.x) < 1e-12 && Math.abs(k0.p[1] - p.y) < 1e-12 && Math.abs(k0.p[2]) < 1e-12) return l;
  return { knoten: l.knoten.map((k, i) => (i === 0 ? { ...k, p: [p.x, p.y, 0] as V3T } : k)) };
}

/**
 * Linienanfänge auf die markierten Knoten legen (rot auf `maulOben`/`maul`, blau auf `maulUnten`): nach jedem Zug am
 * Seitenumriss, damit die Lippen mit der schwarzen Linie verbunden bleiben. Unverändert, wenn nichts zu tun ist.
 */
export function maulAnMarken(dok: Dokument): Dokument {
  const zu = dok.maul?.zu;
  if (!zu) return dok;
  const seite = dok.profile.seite;
  const io = maulKnotenIndex(seite, 'oben');
  if (io < 0) return dok;
  const oben = startAuf(zu.oben, seite.knoten[io]!.p);
  const iu = maulKnotenIndex(seite, 'unten');
  const unten = zu.unten && iu >= 0 ? startAuf(zu.unten, seite.knoten[iu]!.p) : zu.unten;
  if (oben === zu.oben && unten === zu.unten) return dok;
  return { ...dok, maul: { ...dok.maul!, zu: { ...zu, oben, ...(unten ? { unten } : {}) } } };
}

/**
 * Geschlossene Lippen setzen und die Lippenanfänge im Seitenumriss führen (Bauweise Kern): Fehlt die Marke, wird der
 * Anfang der roten Linie formtreu als `maul` eingefügt; mit blauer Linie werden die Kiefer getrennt (`maulOben` +
 * `maulUnten` auf der Kinnseite), ohne sie wieder vereint. Danach liegen die Linienanfänge exakt auf den Knoten.
 */
export function maulMitMarken(dok: Dokument, zu: Lippen): Dokument {
  let seite = dok.profile.seite;
  if (maulKnotenIndex(seite, 'oben') < 0) {
    const p0 = zu.oben.knoten[0]!.p;
    seite = maulAnfangSetzen(seite, { x: p0[0], y: p0[1] }).profil;
  }
  const winkel = zu.oben.knoten[zu.oben.knoten.length - 1]!.p;
  if (zu.unten && !maulGetrenntImUmriss(seite)) {
    // Kiefer trennen: der blaue Knoten sitzt genau am Anfang der blauen Linie (wie ein Zug am Anfang im Editor), nicht an
    // einem festen Abstand entlang des Umrisses — die schwarze Linie geht durch beide Lippenanfänge
    const u0 = zu.unten.knoten[0]!.p;
    const ziel = { x: u0[0], y: u0[1] };
    const t = maulTrennen(seite, { x: winkel[0], y: winkel[1] }, 0.035, ziel);
    if (t) seite = maulAnfangBewegen(t.profil, 'unten', ziel);
  } else if (!zu.unten && maulGetrenntImUmriss(seite)) {
    seite = maulVereinen(seite);
  }
  const maul = { ...(dok.maul ?? {}), zu };
  return maulAnMarken({ ...dok, profile: { ...dok.profile, seite }, maul } as Dokument);
}
