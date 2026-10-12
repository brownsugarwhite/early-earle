// VERSUCH (12.10.2026): Maul im Netz am nachgezogenen Wesen.
// ?versuch=maul&wesen=tiger|rex|robbe|langhals&zustand=zu|auf|0.5&kaefig=1&verfahren=knochen|linear
// Haut weiß (Matcap), Lippenband cremerosa, Rachen maroon; mit kaefig=1 das Käfiggitter (Lippenkante pink).

import type { Ansicht } from '@ee/shape';
import {
  type MaulKaefig,
  type Netz,
  type V3,
  type Vorlage,
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
  zuDreiecken,
} from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
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
  r.setzeDreiecke(d.positionen, d.normalen, farben);
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
