// VERSUCH (12.10.2026): Maul im Netz am nachgezogenen Wesen.
// ?versuch=maul&wesen=tiger|rex|robbe|langhals&zustand=zu|auf|0.5&kaefig=1&verfahren=knochen|linear
// Haut weiß (Matcap), Lippenband cremerosa, Rachen maroon; mit kaefig=1 das Käfiggitter (Lippenkante pink).

import type { Ansicht } from '@ee/shape';
import {
  type MaulKaefig,
  type Netz,
  type Starr,
  type V3,
  type Vorlage,
  type Zahn,
  ZAHN_STANDARD,
  anwenden,
  drehe,
  gelenkBewegung,
  kieferRig,
  kreuz3,
  minus3,
  naechsterFlaechenpunkt,
  plus3,
  punkt3,
  rasterAlle,
  treffer,
  unterteilenMehrfach,
  bereichUnterteilen,
  ketteUnterteilen,
  maulAnpassen,
  maulKaefig,
  maulZwischen,
  reissverschluss,
  spaltenAnteil,
  unterteilen,
  vorlageDokument,
  vorlageMaul,
  zahnreihe,
  zuDreiecken,
} from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { anhaengen, zahnDreiecke } from '../maul/zahnKoerper';
import type { Renderer3D } from '../three/Renderer3D';
import type { Versuch } from './subdivision';
import { type UeberLinie, type UeberPunkt, useUeberlagerung } from './ueberlagerung';

const FARBE: Record<string, [number, number, number]> = {
  haut: [1, 1, 1],
  lippe: [0.96, 0.74, 0.64],
  tasche: [0.55, 0.12, 0.18],
};

function kanten(netz: Netz): [number, number][] {
  const m = new Map<string, [number, number]>();
  for (const f of netz.flaechen) for (let i = 0; i < f.length; i++) {
    const a = f[i]!;
    const b = f[(i + 1) % f.length]!;
    m.set(a < b ? `${a},${b}` : `${b},${a}`, [a, b]);
  }
  return [...m.values()];
}

const proj = (p: V3, a: Ansicht) => (a === 'seite' ? { x: p[0], y: p[1] } : a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] });

/**
 * Bereich je Käfigfläche: Tasche, Lippenband (Haut an der offenen Naht) oder Haut. Der zugezogene Teil des
 * Reißverschlusses (hinter σ) ist Haut.
 */
export function flaechenBereiche(mk: MaulKaefig, alpha: number): string[] {
  const sigma = mk.sichtbar + (1 - mk.sichtbar) * alpha;
  const naht = new Map<number, number>();
  mk.tasche.forEach((r, c) => {
    naht.set(r[0]!, spaltenAnteil(mk, c));
    naht.set(r[6]!, spaltenAnteil(mk, c));
  });
  for (const e of mk.ecken) naht.set(e, 1);
  return mk.netz.flaechen.map((f) => {
    if (f.some((i) => mk.bereiche[i] === 'tasche')) return 'tasche';
    const anteile = f.map((i) => naht.get(i)).filter((a): a is number => a !== undefined);
    if (anteile.length && Math.min(...anteile) <= sigma + 0.02) return 'lippe';
    return 'haut';
  });
}

export type MaulErgebnis = { mk: MaulKaefig; zu: Netz; auf: Netz | null };

type P2 = { x: number; y: number };
type AugeVorlage = { art: 'schlitz' | 'knopf' | 'mandel'; punkte: P2[]; lid?: P2[]; glanz?: P2[] };

/**
 * Augen-Versuch (12.10.): Florians Augenumriss aus der Seitenansicht auf die geschlossene Fläche projiziert („gemalt“),
 * gespiegelt, beim Öffnen mit dem Schädel (Oberkieferknochen) bewegt. Arten wie in seinen Bögen: Schlitz, Knopf mit
 * Glanz, Mandel mit Lidlinie.
 */
function augenDreiecke(augen: AugeVorlage[], flaeche: Netz, bewegung: Starr | null): { pos: number[]; nrm: number[]; col: number[] } {
  const raster = rasterAlle(flaeche).seite;
  const pos: number[] = [];
  const nrm: number[] = [];
  const col: number[] = [];
  const auf = (q: P2, abstand: number): { p: V3; n: V3 } | null => {
    const h = treffer(raster, q)[0] ?? naechsterFlaechenpunkt(raster, q);
    if (!h) return null;
    const p: V3 = [h.p[0] + h.n[0] * abstand, h.p[1] + h.n[1] * abstand, h.p[2] + h.n[2] * abstand];
    return bewegung ? { p: anwenden(bewegung, p), n: drehe(bewegung.R, h.n) } : { p, n: h.n };
  };
  type Ecke = { p: V3; n: V3 };
  const dreieck = (a: Ecke, b: Ecke, c: Ecke, farbe: readonly number[]) => {
    // Umlaufsinn nach der Hautnormalen (Florians Umrisse laufen mal links-, mal rechtsherum; Material ist einseitig)
    const g = kreuz3(minus3(b.p, a.p), minus3(c.p, a.p));
    if (punkt3(g, plus3(plus3(a.n, b.n), c.n)) < 0) [b, c] = [c, b];
    for (const spiegel of [1, -1]) {
      const ecken = spiegel === 1 ? [a, b, c] : [a, c, b];
      for (const e of ecken) {
        pos.push(e.p[0], e.p[1], e.p[2] * spiegel);
        nrm.push(e.n[0], e.n[1], e.n[2] * spiegel);
        col.push(...farbe);
      }
    }
  };
  // Fläche des Umrisses in Ringen (100 %, 75 %, 50 %, 25 %) auf die Haut projiziert, damit sie der Wölbung folgt
  const faecher = (umriss: P2[], farbe: readonly number[], abstand: number) => {
    const m = { x: umriss.reduce((a, q) => a + q.x, 0) / umriss.length, y: umriss.reduce((a, q) => a + q.y, 0) / umriss.length };
    const ringe = [1, 0.75, 0.5, 0.25].map((f) => umriss.map((q) => auf({ x: m.x + (q.x - m.x) * f, y: m.y + (q.y - m.y) * f }, abstand)));
    const mitte = auf(m, abstand);
    if (!mitte || ringe.some((r) => r.some((x) => !x))) return;
    const n = umriss.length;
    for (let r = 0; r < ringe.length - 1; r++) {
      for (let i = 0; i < n; i++) {
        const a = ringe[r]![i]!;
        const b = ringe[r]![(i + 1) % n]!;
        const c = ringe[r + 1]![(i + 1) % n]!;
        const d = ringe[r + 1]![i]!;
        dreieck(d, a, b, farbe);
        dreieck(d, b, c, farbe);
      }
    }
    const innen = ringe[ringe.length - 1]!;
    for (let i = 0; i < n; i++) dreieck(mitte, innen[i]!, innen[(i + 1) % n]!, farbe);
  };
  // Linie als Strich (Lid): Versatz entlang der Bildnormalen, zu den Enden verjüngt
  const strich = (linie: P2[], breite: number, farbe: readonly number[], abstand: number) => {
    const n = linie.length;
    const seiten = linie.map((q, i) => {
      const v = linie[Math.max(0, i - 1)]!;
      const h = linie[Math.min(n - 1, i + 1)]!;
      const l = Math.hypot(h.x - v.x, h.y - v.y) || 1;
      const w = breite * (0.35 + 0.65 * Math.sin((Math.PI * i) / (n - 1)));
      const nx = -(h.y - v.y) / l;
      const ny = (h.x - v.x) / l;
      return [auf({ x: q.x + nx * w, y: q.y + ny * w }, abstand), auf({ x: q.x - nx * w, y: q.y - ny * w }, abstand)] as const;
    });
    if (seiten.some(([o, u]) => !o || !u)) return;
    for (let i = 0; i < n - 1; i++) {
      const [a, d] = seiten[i]!;
      const [b, c] = seiten[i + 1]!;
      dreieck(a!, b!, c!, farbe);
      dreieck(a!, c!, d!, farbe);
    }
  };
  const verkleinert = (umriss: P2[], f: number): P2[] => {
    const m = { x: umriss.reduce((a, q) => a + q.x, 0) / umriss.length, y: umriss.reduce((a, q) => a + q.y, 0) / umriss.length };
    return umriss.map((q) => ({ x: m.x + (q.x - m.x) * f, y: m.y + (q.y - m.y) * f }));
  };
  for (const a of augen) {
    if (a.art === 'schlitz') faecher(a.punkte, [0.07, 0.1, 0.12], 0.002);
    else if (a.art === 'knopf') {
      faecher(a.punkte, [0.05, 0.05, 0.07], 0.002);
      if (a.glanz?.length) faecher(a.glanz, [1, 1, 1], 0.003);
    } else {
      faecher(a.punkte, [0.95, 0.5, 0.14], 0.002);
      faecher(verkleinert(a.punkte, 0.42), [0.08, 0.05, 0.04], 0.003);
      if (a.lid && a.lid.length > 1) {
        strich(a.lid, 0.0022, [0.1, 0.07, 0.1], 0.0035);
      }
    }
  }
  return { pos, nrm, col };
}

/** Zähne der Versuchswesen nach Florians Bögen (Rex, Bogen 06: 14 Oberzähne außen über der Unterlippe). */
const VERSUCH_ZAEHNE: Record<string, () => Zahn[]> = {
  rex: () => zahnreihe(14, 'oben', { ...ZAHN_STANDARD, laenge: 0.05, breite: 0.02, tiefe: 0.014, schaerfe: 0.8, biegung: 0.1, aussen: true }),
};

export function maulBauen(v: Vorlage): MaulErgebnis {
  const dokZu = vorlageDokument(v, 'zu');
  const { eingabe } = vorlageMaul(v);
  const mk = maulKaefig(dokZu, eingabe);
  const zu = maulAnpassen(mk, 'zu');
  const auf = mk.zielAuf ? maulAnpassen(mk, 'auf') : null;
  return { mk, zu, auf };
}

export async function maulVersuch(versuch: Versuch, renderer: () => Renderer3D | null) {
  const basis = `${import.meta.env.BASE_URL}versuch/${versuch.wesen}/`;
  const vorlage = (await (await fetch(`${basis}${versuch.wesen}.json`)).json()) as Vorlage;
  const alpha = versuch.zustand === 'zu' ? 0 : versuch.zustand === 'auf' ? 1 : Number(versuch.zustand);
  const offen = alpha >= 0.5;
  const dok = vorlageDokument(vorlage, offen ? 'auf' : 'zu', versuch.wesen);
  useEditor.getState().laden(dok, null);
  if (offen) useEditor.getState().setzeModus('fressen');

  const t0 = performance.now();
  const { mk, zu, auf } = maulBauen(vorlage);
  const zwischen = alpha <= 0 || !auf ? zu : alpha >= 1 ? auf : maulZwischen(mk, zu, auf, alpha, versuch.verfahren === 'linear' ? 'linear' : 'knochen');
  const kaefig: Netz = alpha > 0 && alpha < 1 ? reissverschluss(mk, zwischen, alpha) : zwischen;
  console.info(`[maul] ${versuch.wesen}: Käfig ${mk.netz.punkte.length} Punkte, gebaut in ${(performance.now() - t0).toFixed(0)} ms`, mk.hinweise);

  // Grenzfläche (Stufe 3) mit Bereichen und Lippenrändern
  let n = kaefig;
  let bereich = flaechenBereiche(mk, alpha);
  let rimO = [mk.ecken[0], ...mk.nahtOben, mk.ecken[1]];
  let rimU = [mk.ecken[0], ...mk.nahtUnten, mk.ecken[1]];
  for (let s = 0; s < 3; s++) {
    rimO = ketteUnterteilen(n, rimO);
    rimU = ketteUnterteilen(n, rimU);
    bereich = bereichUnterteilen(n, bereich);
    n = unterteilen(n);
  }

  // 2D: Florians Punkte, Lippenränder der Fläche, auf Wunsch das Käfiggitter
  const quelle: Record<Ansicht, string> = { seite: offen ? 'seite_auf' : 'seite', front: offen ? 'front_auf' : 'front', top: 'top' };
  const ueber: ReturnType<typeof useUeberlagerung.getState> = {};
  for (const a of ['seite', 'front', 'top'] as const) {
    const linien: UeberLinie[] = [];
    if (versuch.kaefig) {
      for (const [i, j] of kanten(kaefig)) {
        if (a !== 'seite' && kaefig.punkte[i]![2] < -1e-6 && kaefig.punkte[j]![2] < -1e-6) continue;
        const scharf = (kaefig.schaerfe.get(i < j ? `${i},${j}` : `${j},${i}`) ?? 0) > 0;
        linien.push({ punkte: [proj(kaefig.punkte[i]!, a), proj(kaefig.punkte[j]!, a)], farbe: scharf ? '#ff0095' : '#19232b', breite: scharf ? 2.5 : 1, ...(scharf ? {} : { strich: '3 3' }) });
      }
    }
    for (const [rim, farbe] of [[rimO, offen ? '#e0306a' : '#00b8a5'], [rimU, offen ? '#2040ff' : '#00b8a5']] as const) {
      const pts = rim.map((i) => n.punkte[i]!).filter((p) => a === 'seite' || p[2] >= -1e-6);
      linien.push({ punkte: pts.map((p) => proj(p, a)), farbe, breite: 2 });
    }
    const punkte: UeberPunkt[] = [];
    const roh = vorlage.punkte?.[quelle[a]];
    if (roh) punkte.push(...roh);
    for (const l of vorlage.linien?.[quelle[a]] ?? []) {
      l.punkte.forEach((p, k) => punkte.push({ farbe: k === l.punkte.length - 1 ? 'schwarz' : l.farbe, x: p.x, y: p.y }));
    }
    ueber[a] = { punkte, linien };
  }
  useUeberlagerung.setState(ueber);

  if (versuch.nah) {
    // Kamera aufs Maul: Ziel = Mitte der Lippenränder, Abstand nach Kopfgröße
    const rim = [...rimO, ...rimU].map((i) => n.punkte[i]!);
    const lo = [0, 1, 2].map((k) => Math.min(...rim.map((p) => p[k]!)));
    const hi = [0, 1, 2].map((k) => Math.max(...rim.map((p) => p[k]!)));
    const ziel: [number, number, number] = [(lo[0]! + hi[0]!) / 2 + 0.03, (lo[1]! + hi[1]!) / 2, 0];
    const groesse = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, 2 * hi[2]!, 0.15);
    useUi.setState({ kamera: { azimut: (versuch.azimut * Math.PI) / 180, elevation: (12 * Math.PI) / 180, distanz: 3.2 * groesse + 0.3, ziel } });
  }

  const r = renderer();
  if (!r) return;
  const d = zuDreiecken(n, 40);
  const farben = new Float32Array(d.positionen.length);
  let o = 0;
  n.flaechen.forEach((f, fi) => {
    const c = FARBE[bereich[fi]!] ?? FARBE.haut!;
    for (let k = 0; k < 3 * (f.length - 2); k++) farben.set(c, (o + k) * 3);
    o += 3 * (f.length - 2);
  });
  let pos = d.positionen;
  let nrm = d.normalen;
  let col = farben;
  const dazu = (t: { positionen: Float32Array; normalen: Float32Array; farben: Float32Array }) => {
    pos = anhaengen(pos, t.positionen);
    nrm = anhaengen(nrm, t.normalen);
    col = anhaengen(col, t.farben);
  };
  // Zähne am Zahnfleisch der aktuellen Lage (folgen Knochen, Korrektur und Reißverschluss)
  const zaehne = versuch.zaehne ? (VERSUCH_ZAEHNE[versuch.wesen]?.() ?? []) : [];
  if (zaehne.length) {
    const t1 = performance.now();
    dazu(zahnDreiecke(mk, kaefig, zaehne, alpha, 3));
    console.info(`[maul] ${zaehne.length} Zähne in ${(performance.now() - t1).toFixed(0)} ms`);
  }
  // Augen aus der Zeichnung (geschlossene Seitenansicht), beim Öffnen mit dem Schädel bewegt
  const augenVorlage = (vorlage as Vorlage & { augen?: Record<string, AugeVorlage[]> }).augen?.seite ?? [];
  if (augenVorlage.length) {
    const bewegung = auf && alpha > 0 ? gelenkBewegung(kieferRig(mk, zu, auf).gelenkOben, alpha) : null;
    const au = augenDreiecke(augenVorlage, unterteilenMehrfach(zu, 3), bewegung);
    dazu({ positionen: new Float32Array(au.pos), normalen: new Float32Array(au.nrm), farben: new Float32Array(au.col) });
  }
  r.setzeDreiecke(pos, nrm, col);
  if (versuch.kaefig) {
    const k = kanten(kaefig);
    const punkte = new Float32Array(k.length * 6);
    const fl = new Float32Array(k.length * 6);
    k.forEach(([i, j], m) => {
      punkte.set(kaefig.punkte[i]!, m * 6);
      punkte.set(kaefig.punkte[j]!, m * 6 + 3);
      const scharf = (kaefig.schaerfe.get(i < j ? `${i},${j}` : `${j},${i}`) ?? 0) > 0;
      const c = scharf ? [1, 0, 0.58] : [0.1, 0.14, 0.17];
      fl.set([...c, ...c], m * 6);
    });
    r.setzeLinien(punkte, fl);
  } else r.setzeLinien(null);
}
