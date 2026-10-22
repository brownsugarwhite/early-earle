// Werkzeug-Matrix (Plan Teil H0): Werkzeuge in wechselnder Reihenfolge wie im Editor anwenden und nach jedem Schritt
// messen, ob sie harmonieren. Florian (15.10.): „Wenn ich mit Aufblasen oder Ziehen einen Shape bearbeite, kann ich die
// Shapes danach kaum noch verwenden, weil jede Änderung der schwarzen Linie oder das Setzen des Mauls unvorhersehbare
// Abweichungen auswirft.“ Der Ablauf folgt dem Editor: Bau über `wesenBauen` wie im Worker, nach einem Pinselstrich
// ohne Maul „Formen folgen“ (wie `kernBau.ts`), nach jedem genauen Bau schreibt der Editor die Stationen zurück. DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument, KaefigDelta } from '../../dokument';
import { abgleichen } from '../../kopplung';
import { unterkieferVorschlag } from '../../maulKnoten';
import { bewegeKnoten, pfadAbtasten, vollerPfad } from '../../profil';
import type { V3 } from '../../versuch/catmullClark';
import { alleFlaechen } from '../../kaefig/halbkanten';
import { formenFolgen } from '../folgen';
import { maulLinieAusDokument } from '../maulDokument';
import { deltaKarte, deltaListe, deltasAnwenden, kaefigNormalen, spiegelIndex } from '../pinsel';
import { hautAusNetz, regionen } from '../pruefstand';
import type { MaulErgebnis } from '../maul';
import { type Bauplan, type WesenStand, pruefwesenBauplan, wesenBauen } from '../wesen';
import { type KoerperArt, GRUNDKOERPER, koerperDokument, vorlageVon } from './koerper';
import { maulBezug, maulLinien } from './linien';
import { dreiecke, flaechenAbstand } from './masse';
import type { Zufall } from './zufall';

const PX = 461;

/** Bauplan wie `bauplanAus` im Editor (ohne Anzeige-Zustand): gezeichnetes Maul → Lage „vorn“, sonst aus. */
export function planAus(dok: Dokument): Partial<Bauplan> {
  const aus = { ...pruefwesenBauplan(dok.name), ...(dok.ausstattung ?? {}) };
  let linie = aus.maulLinie;
  if (!dok.ausstattung?.maulLinie && dok.maul?.zu.oben && dok.maul.zu.oben.knoten.length >= 2) {
    try {
      linie = maulLinieAusDokument(dok) ?? linie;
    } catch {
      // nicht übersetzbar: ohne Maul wie im Editor (Warnung)
    }
  }
  return { ...aus, ...(linie ? { maulLinie: linie } : {}), maul: linie ? 'vorn' : 'aus', gewichte: {}, beine: 'aus', schwung: 0, stil: 'fest', earle: false, kaefigLinien: false, treffer: false };
}

export type Zustand = { dok: Dokument; stand: WesenStand | null; fein: Float32Array | null; flaechen: number[][] | null; haut?: boolean[]; maulVor?: Dokument };

/** Bau wie im Worker; danach das Zurückschreiben der Stationen wie `kernBauen`. */
export function bauen(z: Zustand): Zustand & { info: NonNullable<ReturnType<typeof wesenBauen>['netz']['info']> } {
  const r = wesenBauen(z.dok, planAus(z.dok), z.stand, false);
  let dok = z.dok;
  const st = r.netz.info.stationen;
  if (st && JSON.stringify(st) !== JSON.stringify(dok.kaefig?.stationen ?? null)) dok = { ...dok, kaefig: { deltas: [], ...dok.kaefig, stationen: st } };
  // angezeigter Körper = Ableitung des Stands (ohne Deltas) + Pinsel-Deltas, wie `mitDeltas` im Worker
  const deltas = dok.kaefig?.deltas ?? [];
  const abl = deltas.length ? deltasAnwenden(r.stand.abl, deltas) : r.stand.abl;
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  // Hautflächen: mit Maul ohne Lippen, Tasche und Rachen (deren Lage gehört zum Maul, nicht zum Körper)
  const maul = (abl as Partial<MaulErgebnis>).maul;
  const haut = maul ? regionen(abl as MaulErgebnis, flaechen).map((b) => b === 'haut') : flaechen.map(() => true);
  return { ...z, dok, stand: r.stand, fein: Float32Array.from(abl.fein), flaechen, haut, info: r.netz.info };
}

export type Messung = {
  /** Δ je Blatt (px), wie im Blatt-Titel */
  delta: Record<'seite' | 'front' | 'top', number>;
  /** Lippen-px wie im Titel (rot/blau, Seite und Front) */
  lippe: number | null;
  /** größte Verschiebung der Haut fern der bearbeiteten Stelle gegen den Schritt davor (px) */
  fern: number;
  /** größte Verschiebung überhaupt gegen den Schritt davor (px) */
  gesamt: number;
};

function hautFlaechen(z: { fein: Float32Array | null; flaechen: number[][] | null; haut?: boolean[] }, nurHaut: boolean): { punkte: V3[]; flaechen: number[][] } | null {
  if (!z.fein || !z.flaechen) return null;
  const punkte: V3[] = [];
  for (let i = 0; i < z.fein.length / 3; i++) punkte.push([z.fein[3 * i]!, z.fein[3 * i + 1]!, z.fein[3 * i + 2]!]);
  return { punkte, flaechen: nurHaut && z.haut ? z.flaechen.filter((_f, i) => z.haut![i]) : z.flaechen };
}

/** Verschiebung der Fläche gegen den vorigen Schritt: Flächenmitten des neuen Netzes zur alten Fläche; „fern“ = weiter als `radius` von `ort`. */
export function verschiebung(vorher: Zustand, nachher: Zustand, ort: V3 | null, radius: number, sk: number): { fern: number; gesamt: number } {
  // alte Fläche ganz (die nächste Fläche zu einem Hautpunkt ist Haut), neue nur Haut (Lippen, Tasche, Rachen zählen nicht)
  const a = hautFlaechen(vorher, false);
  const b = hautFlaechen(nachher, true);
  if (!a || !b) return { fern: NaN, gesamt: NaN };
  const abstand = flaechenAbstand(dreiecke(a.punkte, a.flaechen));
  let fern = 0;
  let gesamt = 0;
  for (const f of b.flaechen) {
    const m: V3 = [0, 0, 0];
    for (const v of f) {
      m[0] += b.punkte[v]![0] / f.length;
      m[1] += b.punkte[v]![1] / f.length;
      m[2] += b.punkte[v]![2] / f.length;
    }
    const d = abstand(m).d;
    gesamt = Math.max(gesamt, d);
    if (!ort || Math.hypot(m[0] - ort[0], m[1] - ort[1], Math.abs(m[2]) - Math.abs(ort[2])) > radius) fern = Math.max(fern, d);
  }
  return { fern: (fern * PX) / sk, gesamt: (gesamt * PX) / sk };
}

export type HandlungsErgebnis = { dok: Dokument; ort: V3 | null; radius: number; pinsel?: boolean; maul?: boolean } | null;
export type Handlung = { name: string; anwenden(z: Zustand & { info: ReturnType<typeof bauen>['info'] }, r: Zufall, koerper: KoerperArt): HandlungsErgebnis };

function knotenZiehen(dok: Dokument, ansicht: 'seite' | 'front' | 'top', i: number, d: V2): Dokument {
  const pr = dok.profile[ansicht];
  const k = pr.knoten[i]!;
  const neu = bewegeKnoten(pr, i, { x: k.p.x + d.x, y: k.p.y + d.y });
  return { ...dok, profile: abgleichen({ ...dok.profile, [ansicht]: neu }, ansicht, dok.profile) };
}

/** Pinsel wie `pinselZeiger` (Grundform): Gewichte um den Treffer und sein Spiegelbild auf den Vorlagenpunkten, Zuwachs auf die gespeicherten Deltas. */
function pinsel(z: Zustand, mitte: V3, radius: number, versatz: (p: number, normale: V3) => V3): KaefigDelta[] {
  const abl = z.stand!.abl;
  const xyz = abl.kaefig.xyz;
  const n0 = Math.min(abl.vorlage.kaefig.n, abl.kaefig.n);
  const normalen = kaefigNormalen(xyz, abl.kaefig.fStart, abl.kaefig.fVerts, n0);
  void spiegelIndex;
  const karte = deltaKarte(z.dok.kaefig?.deltas);
  for (let p = 0; p < n0; p++) {
    const x = xyz[3 * p]!;
    const y = xyz[3 * p + 1]!;
    const zz = xyz[3 * p + 2]!;
    if (zz < -1e-9) continue;
    const w = Math.max(0, 1 - Math.hypot(x - mitte[0], y - mitte[1], zz - mitte[2]) / radius);
    const ws = Math.max(0, 1 - Math.hypot(x - mitte[0], y - mitte[1], zz + mitte[2]) / radius);
    const g = w * w * (3 - 2 * w) + ws * ws * (3 - 2 * ws);
    if (g <= 1e-9) continue;
    const d = versatz(p, [normalen[3 * p]!, normalen[3 * p + 1]!, normalen[3 * p + 2]!]);
    const a = karte.get(p) ?? [0, 0, 0];
    karte.set(p, [a[0] + g * d[0], a[1] + g * d[1], Math.abs(zz) < 1e-9 ? 0 : a[2] + g * d[2]]);
  }
  return deltaListe(karte);
}

/** Zufälliger Punkt auf der Haut (feiner Punkt der rechten Hälfte). */
function hautPunkt(z: Zustand, r: Zufall): V3 {
  const f = z.fein!;
  for (let versuch = 0; versuch < 50; versuch++) {
    const i = Math.floor(r.zahl() * (f.length / 3));
    if (f[3 * i + 2]! >= 0) return [f[3 * i]!, f[3 * i + 1]!, f[3 * i + 2]!];
  }
  return [f[0]!, f[1]!, f[2]!];
}

function umriss(dok: Dokument): V2[] {
  return pfadAbtasten(vollerPfad(dok.profile.seite), 160).map((q) => ({ x: q.x * dok.skalierung, y: q.y * dok.skalierung }));
}

const schritt = (px: number) => px / PX;

export const HANDLUNGEN: Handlung[] = [
  {
    name: 'seite-knoten',
    anwenden: (z, r) => {
      const n = z.dok.profile.seite.knoten.length;
      const i = Math.floor(r.zahl() * n);
      const k = z.dok.profile.seite.knoten[i]!;
      const d = { x: schritt(r.zwischen(-30, 30)), y: schritt(r.zwischen(-30, 30)) };
      return { dok: knotenZiehen(z.dok, 'seite', i, d), ort: [k.p.x, k.p.y, 0], radius: 0.15 };
    },
  },
  {
    name: 'front-knoten',
    anwenden: (z, r) => {
      const kn = z.dok.profile.front.knoten;
      const i = 1 + Math.floor(r.zahl() * Math.max(1, kn.length - 2));
      if (i >= kn.length - 1) return null;
      const d = { x: schritt(r.zwischen(-20, 20)), y: schritt(r.zwischen(-20, 20)) };
      return { dok: knotenZiehen(z.dok, 'front', i, d), ort: null, radius: 0 };
    },
  },
  {
    name: 'top-knoten',
    anwenden: (z, r) => {
      const kn = z.dok.profile.top.knoten;
      const i = 1 + Math.floor(r.zahl() * Math.max(1, kn.length - 2));
      if (i >= kn.length - 1) return null;
      const k = kn[i]!;
      const d = { x: schritt(r.zwischen(-20, 20)), y: schritt(r.zwischen(-20, 20)) };
      return { dok: knotenZiehen(z.dok, 'top', i, d), ort: [k.p.x, 0, k.p.y], radius: 0.15 };
    },
  },
  {
    name: 'aufblasen',
    anwenden: (z, r) => {
      const m = hautPunkt(z, r);
      const rad = r.zwischen(0.06, 0.14);
      const b = r.zwischen(0.008, 0.02) * (r.zahl() < 0.7 ? 1 : -1);
      const deltas = pinsel(z, m, rad, (_p, n) => [b * n[0], b * n[1], b * n[2]]);
      return { dok: { ...z.dok, kaefig: { ...(z.dok.kaefig ?? { deltas: [] }), deltas } }, ort: m, radius: rad * 1.5, pinsel: true };
    },
  },
  {
    name: 'ziehen',
    anwenden: (z, r) => {
      const m = hautPunkt(z, r);
      const rad = r.zwischen(0.06, 0.14);
      const D: V3 = [r.zwischen(-0.025, 0.025), r.zwischen(-0.025, 0.025), r.zwischen(-0.01, 0.01)];
      const deltas = pinsel(z, m, rad, () => D);
      return { dok: { ...z.dok, kaefig: { ...(z.dok.kaefig ?? { deltas: [] }), deltas } }, ort: m, radius: rad * 1.5, pinsel: true };
    },
  },
  {
    name: 'maul-zeichnen',
    anwenden: (z, r, koerper) => {
      if (z.dok.maul) return null;
      const haut = hautAusNetz(z.stand!.abl);
      const vorlage = GRUNDKOERPER.includes(koerper) ? null : vorlageVon(koerper === 'kasten' ? 'tiger' : koerper === 'drache' ? 'langhals' : (koerper as 'rex' | 'langhals' | 'robbe'));
      const l = maulLinien(z.dok, koerper, maulBezug(koerper, z.dok, vorlage), haut, 'mittel', r.wahl(['gerade', 'hoch', 'runter'] as const), 'kurz', 'gleich', r);
      if ('fehler' in l) return null;
      return { dok: { ...z.dok, maul: { zu: { oben: l.oben } } }, ort: l.ecke, radius: 1.5 * l.laenge, maul: true };
    },
  },
  {
    name: 'maul-anfang',
    anwenden: (z, r) => {
      const zu = z.dok.maul?.zu;
      if (!zu) return null;
      const s = zu.oben.knoten[0]!.p;
      const zug = umriss(z.dok);
      let i0 = 0;
      for (let i = 1; i < zug.length; i++) if (Math.hypot(zug[i]!.x - s[0], zug[i]!.y - s[1]) < Math.hypot(zug[i0]!.x - s[0], zug[i0]!.y - s[1])) i0 = i;
      const j = (i0 + (r.zahl() < 0.5 ? 2 : -2) + zug.length) % zug.length;
      const oben = { knoten: zu.oben.knoten.map((k, i) => (i === 0 ? { ...k, p: [zug[j]!.x, zug[j]!.y, 0] as [number, number, number] } : k)) };
      return { dok: { ...z.dok, maul: { zu: { ...zu, oben } } }, ort: [s[0], s[1], 0], radius: 0.12, maul: true };
    },
  },
  {
    name: 'getrennt',
    anwenden: (z) => {
      const zu = z.dok.maul?.zu;
      if (!zu || zu.unten) return null;
      return { dok: { ...z.dok, maul: { zu: { oben: zu.oben, unten: unterkieferVorschlag(zu.oben) } } }, ort: zu.oben.knoten[zu.oben.knoten.length - 1]!.p, radius: 0.15, maul: true };
    },
  },
  {
    name: 'maul-entfernen',
    anwenden: (z) => {
      if (!z.dok.maul) return null;
      const rest: Dokument = { ...z.dok };
      delete rest.maul;
      return { dok: rest, ort: null, radius: 0, maul: true };
    },
  },
];

export type Schritt = { handlung: string; messung: Messung; folgen: boolean };

/** Eine Handlung ausführen wie im Editor (mit „Formen folgen“ nach Pinselstrichen ohne Maul) und messen. */
export function schrittAusfuehren(z: ReturnType<typeof bauen>, h: Handlung, r: Zufall, koerper: KoerperArt): { z: ReturnType<typeof bauen>; schritt: Schritt } | null {
  const e = h.anwenden(z, r, koerper);
  if (!e) return null;
  let dok = e.dok;
  let folgen = false;
  if (e.pinsel && !maulLinieAusDokument(dok)) {
    // „Formen folgen“ am Gestenende (`kernBau.ts`): Profile an die Silhouette, Deltas nachgeführt
    const r2 = formenFolgen(dok, planAus(dok), z.stand);
    dok = { ...dok, profile: r2.profile, ...(r2.spanten ? { spanten: r2.spanten } : {}), kaefig: { ...(dok.kaefig ?? { deltas: [] }), deltas: r2.deltas } };
    folgen = true;
  }
  const neu = bauen({ ...z, dok });
  const v = verschiebung(z, neu, e.ort, e.radius, dok.skalierung);
  const b = neu.info.blatt;
  const lm = neu.info.maul;
  const lippe = lm ? Math.max(lm.oben.seite, lm.oben.front ?? 0, lm.unten?.seite ?? 0, lm.unten?.front ?? 0) : null;
  return { z: neu, schritt: { handlung: h.name, folgen, messung: { delta: { seite: b?.seite.max ?? NaN, front: b?.front.max ?? NaN, top: b?.top.max ?? NaN }, lippe, fern: v.fern, gesamt: v.gesamt } } };
}

/** Startzustand eines Körpers: erster Bau, Stationen eingefroren (wie beim Laden im Editor). */
export function startZustand(koerper: KoerperArt, r: Zufall): ReturnType<typeof bauen> {
  const dok = koerperDokument(koerper, r.ableger('koerper'));
  const z0 = bauen({ dok, stand: null, fein: null, flaechen: null });
  return bauen(z0);
}
