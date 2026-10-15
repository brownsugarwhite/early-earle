// Phase 2 / M4 (15.10. nachts): Prüfung der Zähne (Plan 5.3), aus dem Versuch vom 12.10. (`versuch/zaehne.ts`)
// herausgelöst. Die Fläche mit Kiefer und Haut/Tasche je Fläche liefert der Aufrufer (`PruefFlaeche`): im Kern
// `zaehnePruefen` (`zaehne.ts`), im Versuch der alte Maul-Käfig. Die Regeln sind unverändert:
// - Im sichtbaren Maul (u ≤ `sichtbarBis`): „stößt in den Gegenkiefer“, wenn ein Punkt des Zahns (ab Höhe des
//   Zahnfleischs) im Körper liegt (Strahlparität, Mehrheit aus drei Achsen) und die nächste Fläche zum Gegenkiefer gehört;
//   außen-Zähne brauchen 1 px Luft zum Gegenkiefer.
// - Dahinter (Reißverschluss, geschlossen verdeckt) zählt nur, dass der Zahn nicht aus dem Kopf sticht.
// - Zahn gegen Zahn wird nicht geprüft: Zähne dürfen sich überschneiden (Florian 15.10.: „das macht ein Maul erst aus“).
// Vorschläge (neigen, kürzen, außen, offen größer, nach vorn) werden nur gemeldet, nie still angewandt.

import type { V3 } from '../versuch/catmullClark';
import { type Dreiecksflaeche, dreiecksFlaeche, inAnsicht, rasterAlle, tiefeIn, treffer } from '../versuch/flaechenlinie';
import { type Kiefer, type RahmenQuelle, type Zahn, type ZahnAuf, type ZahnGitter, zahnBei, zahnGitter } from './zahnModell';

/** Kachel in Bildpunkten in der Grundansicht */
const PX = 461;
const zahl = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const px = (x: number) => (x * PX).toFixed(1);
const plus3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const minus3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mal3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const punkt3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const laenge3 = (a: V3): number => Math.hypot(a[0], a[1], a[2]);

export type ZahnAenderung = Partial<Omit<Zahn, 'kiefer' | 'seite'>>;
export type ZahnVorschlag = { text: string; aenderung: ZahnAenderung };

/**
 * - durchKiefer: Zahn steckt im Gegenkiefer (sichtbarer Teil des Mauls)
 * - durchHaut: Zahn hinter dem sichtbaren Mundwinkel (Reißverschluss, geschlossen verdeckt) sticht aus dem Kopf
 * - zuNah: außen-Zahn hat weniger als `luft` Abstand zum Gegenkiefer
 */
export type ZahnArt = 'durchKiefer' | 'durchHaut' | 'zuNah' | 'ok';

export type ZahnBefund = {
  zahn: number;
  art: ZahnArt;
  /** Eindringtiefe (durchKiefer, durchHaut: Abstand zur Fläche) bzw. fehlende Luft (zuNah), Kachel */
  tiefe: number;
  /** bester Vorschlag als Text */
  vorschlag?: string;
  vorschlaege?: ZahnVorschlag[];
};

export type PruefOptionen = {
  /** Öffnung für die Werte „auf“ und den Reißverschluss (der Käfig muss dazu passen) */
  alpha: number;
  stufen: number;
  /** Mindestluft der außen-Zähne zum Gegenkiefer (Kachel) */
  luft: number;
  /** kleinere Eindringtiefen zählen nicht (Kachel) */
  toleranz: number;
  seiten: number;
  ringe: number;
  /** Halbierungsschritte beim Kürzen (14: Grenze auf 1/16 000 der Länge) */
  schritte: number;
};

export const PRUEF_STANDARD: PruefOptionen = { alpha: 0, stufen: 3, luft: 1 / PX, toleranz: 0.25 / PX, seiten: 8, ringe: 6, schritte: 14 };

/** Nächster Punkt eines Dreiecks (Ericson, Real-Time Collision Detection 5.1.5). */
function naechsterAufDreieck(p: V3, a: V3, b: V3, c: V3): V3 {
  const ab = minus3(b, a);
  const ac = minus3(c, a);
  const ap = minus3(p, a);
  const d1 = punkt3(ab, ap);
  const d2 = punkt3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = minus3(p, b);
  const d3 = punkt3(ab, bp);
  const d4 = punkt3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return plus3(a, mal3(ab, d1 / (d1 - d3)));
  const cp = minus3(p, c);
  const d5 = punkt3(ab, cp);
  const d6 = punkt3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return plus3(a, mal3(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return plus3(b, mal3(minus3(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return plus3(a, plus3(mal3(ab, vb * den), mal3(ac, vc * den)));
}

/** Nächstes Dreieck (nur solche mit `nur(d)`); weiter als `bis` entfernt zählt nicht (Abstand dann ≥ bis, ggf. ∞). */
type Naehe = (p: V3, nur?: (d: number) => boolean, bis?: number) => { abstand: number; dreieck: number };

/** Nächstes Dreieck über ein gleichmäßiges 3D-Raster, nur für Dreiecke im Bereich [lo, hi]. */
function naeheRaster(fl: Dreiecksflaeche, lo: V3, hi: V3, zellen = 32): Naehe {
  const P = fl.punkte;
  const D = fl.dreiecke;
  const nD = D.length / 3;
  const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 1e-6);
  const h = ext / zellen;
  const nn = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k]! - lo[k]!) / h))) as [number, number, number];
  const zelle = (x: number, y: number, z: number) => x + nn[0] * (y + nn[1] * z);
  const zIndex = (x: number, k: number) => zahl(Math.floor((x - lo[k]!) / h), 0, nn[k]! - 1);
  const listen = new Map<number, number[]>();
  const ecke = (d: number, k: number): V3 => {
    const i = 3 * D[3 * d + k]!;
    return [P[i]!, P[i + 1]!, P[i + 2]!];
  };
  for (let d = 0; d < nD; d++) {
    const e = [ecke(d, 0), ecke(d, 1), ecke(d, 2)];
    const mn = [0, 1, 2].map((k) => Math.min(e[0]![k]!, e[1]![k]!, e[2]![k]!));
    const mx = [0, 1, 2].map((k) => Math.max(e[0]![k]!, e[1]![k]!, e[2]![k]!));
    if ([0, 1, 2].some((k) => mx[k]! < lo[k]! || mn[k]! > hi[k]!)) continue;
    for (let z = zIndex(mn[2]!, 2); z <= zIndex(mx[2]!, 2); z++) {
      for (let y = zIndex(mn[1]!, 1); y <= zIndex(mx[1]!, 1); y++) {
        for (let x = zIndex(mn[0]!, 0); x <= zIndex(mx[0]!, 0); x++) {
          const key = zelle(x, y, z);
          const l = listen.get(key);
          if (l) l.push(d);
          else listen.set(key, [d]);
        }
      }
    }
  }
  const stempel = new Uint32Array(nD);
  let runde = 0;
  return (p, nur, bis = Infinity) => {
    runde++;
    const c = [zIndex(p[0], 0), zIndex(p[1], 1), zIndex(p[2], 2)];
    let best = Infinity;
    let bestD = -1;
    const maxR = Math.max(...nn);
    for (let r = 0; r <= maxR; r++) {
      for (let z = c[2]! - r; z <= c[2]! + r; z++) {
        if (z < 0 || z >= nn[2]) continue;
        for (let y = c[1]! - r; y <= c[1]! + r; y++) {
          if (y < 0 || y >= nn[1]) continue;
          // im Inneren der Schale nur die beiden Randzellen in x
          const schale = r === 0 || Math.abs(z - c[2]!) === r || Math.abs(y - c[1]!) === r;
          for (let x = c[0]! - r; x <= c[0]! + r; x += schale ? 1 : 2 * r) {
            if (x < 0 || x >= nn[0]) continue;
            for (const d of listen.get(zelle(x, y, z)) ?? []) {
              if (stempel[d] === runde) continue;
              stempel[d] = runde;
              if (nur && !nur(d)) continue;
              const ab = laenge3(minus3(p, naechsterAufDreieck(p, ecke(d, 0), ecke(d, 1), ecke(d, 2))));
              if (ab < best) {
                best = ab;
                bestD = d;
              }
            }
          }
        }
      }
      // alle Zellen weiter außen liegen mindestens r·h entfernt
      if (best <= r * h || r * h > bis) break;
    }
    return { abstand: best, dreieck: bestD };
  };
}

/** Punkt-in-Fläche: Strahlparität in drei Achsen, Mehrheit (robust gegen Strahlen durch Kanten). */
function innenTest(fl: Dreiecksflaeche): (p: V3) => boolean {
  const raster = rasterAlle(fl, 96);
  const ansichten = ['seite', 'front', 'top'] as const;
  return (p) => {
    let ja = 0;
    for (let a = 0; a < 3; a++) {
      const ans = ansichten[a]!;
      const t = tiefeIn(p, ans);
      let n = 0;
      for (const h of treffer(raster[ans], inAnsicht(p, ans))) if (h.tiefe < t) n++;
      if (n % 2 === 1) ja++;
      if (ja >= 2 || ja + (2 - a) < 2) break;
    }
    return ja >= 2;
  };
}

/** Feld so setzen, dass der wirksame Wert bei α `wert` ist (zu + (auf − zu)·α = wert). */
function setze(z: Zahn, feld: keyof ZahnAuf, wert: number, alpha: number): { zahn: Zahn; aenderung: ZahnAenderung } {
  const auf = z.auf?.[feld];
  if (auf !== undefined && alpha >= 1) {
    const neu: ZahnAuf = { ...z.auf, [feld]: wert };
    return { zahn: { ...z, auf: neu }, aenderung: { auf: neu } };
  }
  const zu = auf === undefined ? wert : (wert - auf * alpha) / (1 - alpha);
  const aenderung = { [feld]: zu } as ZahnAenderung;
  return { zahn: { ...z, ...aenderung }, aenderung };
}

/**
 * Fläche für die Prüfung: Punkte und Flächen (Polygone, in Dreiecke gefächert wie `dreiecksFlaeche`), je Fläche der
 * Kiefer (`mitte` = Übergang, gehört keinem) und ob sie Haut ist (sonst Tasche); bis `sichtbarBis` (u) ist das Maul
 * sichtbar, dahinter liegt der Reißverschluss.
 */
export type PruefFlaeche = {
  netz: { punkte: V3[]; flaechen: number[][] };
  kiefer: readonly (Kiefer | 'mitte')[];
  haut: readonly boolean[];
  sichtbarBis: number;
};

/**
 * Prüft die Zähne auf einer Fläche (meist das geschlossene Maul, α = 0). Geprüft werden die Punkte ab Höhe des
 * Zahnfleischs (Ring 1 bis Spitze); die Wurzel steckt absichtlich im Kiefer. Jeder Zahn bekommt mindestens einen Eintrag
 * (sonst „ok“).
 */
export function zahnPruefenAuf(f: PruefFlaeche, fleisch: Record<Kiefer, RahmenQuelle>, zaehne: readonly Zahn[], opt: Partial<PruefOptionen> = {}): ZahnBefund[] {
  if (!zaehne.length) return [];
  const { messen, vorschlaegeFuer, toleranz } = pruefer(f, fleisch, zaehne, opt);
  const befunde: ZahnBefund[] = [];
  zaehne.forEach((z, zi) => {
    const m = messen(z, false);
    const eintraege: ZahnBefund[] = [];
    const mitVorschlag = (e: ZahnBefund, v: ZahnVorschlag[]): ZahnBefund => (v.length ? { ...e, vorschlag: v[0]!.text, vorschlaege: v } : e);
    if (m.durch > toleranz) eintraege.push(mitVorschlag({ zahn: zi, art: 'durchKiefer', tiefe: m.durch }, vorschlaegeFuer(z, 'durchKiefer')));
    if (m.haut > toleranz) eintraege.push(mitVorschlag({ zahn: zi, art: 'durchHaut', tiefe: m.haut }, vorschlaegeFuer(z, 'durchHaut')));
    if (m.nah > toleranz) eintraege.push(mitVorschlag({ zahn: zi, art: 'zuNah', tiefe: m.nah }, vorschlaegeFuer(z, 'zuNah')));
    befunde.push(...(eintraege.length ? eintraege : [{ zahn: zi, art: 'ok' as const, tiefe: 0 }]));
  });
  return befunde;
}

/**
 * Größte Länge je Zahn (Wert `laenge` bei Öffnung α), bei der er auf der Fläche nicht stört: die volle Länge, wenn er
 * so schon passt, sonst gekürzt (Halbierung wie der Vorschlag „kürzen“); `null`, wenn auch 5 % der Länge stören.
 * Für die Automatik (geschlossen so lang, wie der Biss Platz lässt).
 */
export function zaehneEinpassen(f: PruefFlaeche, fleisch: Record<Kiefer, RahmenQuelle>, zaehne: readonly Zahn[], opt: Partial<PruefOptionen> = {}): (number | null)[] {
  if (!zaehne.length) return [];
  const { stoert, kuerzen, alpha } = pruefer(f, fleisch, zaehne, opt);
  return zaehne.map((z) => (stoert(z) ? kuerzen(z) : zahnBei(z, alpha).laenge));
}

/** Gemeinsame Werkzeuge der Prüfung auf einer Fläche: Messung je Zahn und Vorschläge. */
function pruefer(f: PruefFlaeche, fleisch: Record<Kiefer, RahmenQuelle>, zaehne: readonly Zahn[], opt: Partial<PruefOptionen>) {
  const o: PruefOptionen = { ...PRUEF_STANDARD, ...opt };
  const { alpha, seiten, ringe, toleranz, luft, schritte } = o;
  const n = f.netz;
  const fl = dreiecksFlaeche({ punkte: n.punkte, flaechen: n.flaechen, schaerfe: new Map() });
  const dKiefer: string[] = [];
  const dHaut: boolean[] = [];
  n.flaechen.forEach((fa, fi) => {
    for (let t = 1; t < fa.length - 1; t++) {
      dKiefer.push(f.kiefer[fi]!);
      dHaut.push(f.haut[fi]!);
    }
  });
  const imKoerper = innenTest(fl);
  // der Kopf ohne Tasche wird nur für Zähne hinter dem sichtbaren Mundwinkel gebraucht
  let kopfTest: ((p: V3) => boolean) | null = null;
  const imKopf = (p: V3) => {
    kopfTest ??= innenTest(dreiecksFlaeche({ punkte: n.punkte, flaechen: n.flaechen.filter((_, fi) => f.haut[fi]), schaerfe: new Map() }));
    return kopfTest(p);
  };
  const sigma = f.sichtbarBis;

  // Nähe-Raster um alle Zähne, mit Rand für die Vorschläge
  let lo: V3 = [Infinity, Infinity, Infinity];
  let hi: V3 = [-Infinity, -Infinity, -Infinity];
  let groesste = 0;
  for (const z of zaehne) {
    const g = zahnGitter(z, fleisch[z.kiefer], alpha, seiten, ringe);
    for (const p of [...g.ringe.flat(), g.spitze]) {
      lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1]), Math.min(lo[2], p[2])];
      hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1]), Math.max(hi[2], p[2])];
    }
    const gr = Math.max(z.groesse ?? 1, z.auf?.groesse ?? 0);
    groesste = Math.max(groesste, gr * Math.max(z.laenge, z.auf?.laenge ?? 0, z.breite, z.tiefe));
  }
  const rand = groesste + 4 / PX;
  const naehe = naeheRaster(fl, minus3(lo, [rand, rand, rand]), plus3(hi, [rand, rand, rand]));

  type Messung = { durch: number; haut: number; nah: number };
  /** Messung eines Zahns; `frueh`: abbrechen, sobald etwas stört (für die Suche nach Vorschlägen). */
  // Zahnfleisch im Gegenkiefer vergraben (geschlossener Über- oder Unterbiss: der schmalere Kiefer steckt im anderen,
  // verdeckte Überlappung ist erlaubt, Florian 15.10.): der Zahn ist dort verdeckt und stößt nicht sichtbar in den
  // Gegenkiefer. Proben: der Ansatz (Zahnfleisch, mit „vor“ versetzt) und der Sockelring (Ring 1), ½ px in Beißrichtung.
  const vergraben = (z: Zahn, f: ReturnType<typeof zahnBei>, g: ZahnGitter): boolean => {
    if (f.aussen) return false;
    const r = fleisch[z.kiefer](f.u, z.seite, false);
    const gegen = z.kiefer === 'oben' ? 'unten' : 'oben';
    const schub = mal3(r.d, 0.5 / PX);
    for (const p of [g.wurzel, ...g.ringe[1]!]) {
      const probe = plus3(p, schub);
      if (imKoerper(probe) && dKiefer[naehe(probe).dreieck] === gegen) return true;
    }
    return false;
  };
  const messen = (z: Zahn, frueh: boolean): Messung => {
    const g = zahnGitter(z, fleisch[z.kiefer], alpha, seiten, ringe);
    const f = zahnBei(z, alpha);
    const gegen = z.kiefer === 'oben' ? 'unten' : 'oben';
    // hinter dem sichtbaren Mundwinkel (Reißverschluss): verdeckt, nur ein Durchstich der Haut zählt
    const verdeckt = f.u > sigma;
    const m: Messung = { durch: 0, haut: 0, nah: 0 };
    // im Gegenkiefer vergraben: verdeckt, ohne Befund (in der Überlappung zweier Körperteile zählt der Paritätstest einen
    // Punkt in beiden als außen, ein Hautdurchstich ist dort nicht messbar); ob der Zahn zu lang ist, zeigt die Prüfung
    // bei größerer Öffnung, wo die Kiefer auseinander sind
    if (!verdeckt && vergraben(z, f, g)) return m;
    // von der Spitze zum Zahnfleisch (Ring 1)
    const pts: V3[] = [g.spitze];
    for (let r = g.ringe.length - 1; r >= 1; r--) pts.push(...g.ringe[r]!);
    for (const p of pts) {
      if (verdeckt) {
        if (!imKopf(p)) m.haut = Math.max(m.haut, naehe(p, (d) => dHaut[d]!).abstand);
      } else if (imKoerper(p)) {
        const q = naehe(p);
        if (dKiefer[q.dreieck] === gegen) m.durch = Math.max(m.durch, q.abstand);
      } else if (f.aussen) {
        m.nah = Math.max(m.nah, luft - naehe(p, (d) => dKiefer[d] === gegen, luft).abstand);
      }
      if (frueh && Math.max(m.durch, m.haut, m.nah) > toleranz) break;
    }
    return m;
  };
  const stoert = (z: Zahn) => Math.max(...Object.values(messen(z, true))) > toleranz;

  // Vorschläge (gesucht, nie angewandt)
  const kuerzen = (z: Zahn): number | null => {
    const L = zahnBei(z, alpha).laenge;
    const mit = (f: number) => setze(z, 'laenge', L * f, alpha).zahn;
    if (stoert(mit(0.05))) return null;
    let a = 0.05;
    let b = 1;
    for (let it = 0; it < schritte; it++) {
      const m = (a + b) / 2;
      if (stoert(mit(m))) b = m;
      else a = m;
    }
    return L * a;
  };
  const neigen = (z: Zahn, nurNachAussen: boolean): number | null => {
    const nu = zahnBei(z, alpha).neigung;
    for (let s = 1; s <= 8; s++) {
      for (const v of nurNachAussen ? [-1] : [1, -1]) {
        const w = nu + v * 2.5 * s;
        if (!stoert(setze(z, 'neigung', w, alpha).zahn)) return w;
      }
    }
    return null;
  };
  const vorschlaegeFuer = (z: Zahn, art: 'durchKiefer' | 'durchHaut' | 'zuNah'): ZahnVorschlag[] => {
    const jetzt = zahnBei(z, alpha);
    const w = neigen(z, art === 'zuNah');
    const L = kuerzen(z);
    const neig = w === null ? null : { text: `Neigung ${w.toFixed(1)}° statt ${jetzt.neigung.toFixed(1)}°`, aenderung: setze(z, 'neigung', w, alpha).aenderung };
    const kurz = L === null ? null : { text: `kürzen auf ${px(L * jetzt.groesse)} px (statt ${px(jetzt.laenge * jetzt.groesse)} px)`, aenderung: setze(z, 'laenge', L, alpha).aenderung };
    const vorn: ZahnVorschlag[] = [];
    const hinten: ZahnVorschlag[] = [];
    // kleine Änderungen zuerst: wenig Neigung, wenig kürzer; große am Ende
    if (neig) (Math.abs(w! - jetzt.neigung) <= 10 ? vorn : hinten).push(neig);
    if (kurz) (L! >= 0.6 * jetzt.laenge ? vorn : hinten).push(kurz);
    if (art === 'durchKiefer' && !jetzt.aussen && !stoert({ ...z, aussen: true })) vorn.push({ text: 'außen über die Gegenlippe stellen', aenderung: { aussen: true } });
    if (art === 'durchHaut') {
      // hinter dem Mundwinkel: außen-Zahn stünde an der Backe; nach innen nehmen oder ins sichtbare Maul schieben
      if (jetzt.aussen && !stoert({ ...z, aussen: false })) vorn.push({ text: 'nach innen nehmen (nicht außen)', aenderung: { aussen: false } });
      const vor = setze(z, 'u', 0.98 * sigma, alpha);
      if (sigma < 1 && !stoert(vor.zahn)) vorn.push({ text: `nach vorn ins sichtbare Maul (u ${(0.98 * sigma).toFixed(2)} statt ${jetzt.u.toFixed(2)})`, aenderung: vor.aenderung });
    }
    if (art !== 'zuNah' && L !== null && alpha <= 0) {
      // Florians Weg für Riesenzähne: geschlossen klein, offen groß (wächst beim Öffnen hinein)
      const offen = Math.max(z.auf?.laenge ?? z.laenge, z.laenge);
      vorn.push({ text: `geschlossen ${px(L * jetzt.groesse)} px, offen ${px(offen * (z.auf?.groesse ?? jetzt.groesse))} px (wächst beim Öffnen)`, aenderung: { laenge: L, auf: { ...z.auf, laenge: offen } } });
    }
    return [...vorn, ...hinten];
  };
  return { messen, stoert, kuerzen, vorschlaegeFuer, toleranz, alpha };
}
