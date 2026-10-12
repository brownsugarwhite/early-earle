// VERSUCH (12.10.2026 abends): Wirbelsäule am nachgezogenen Wesen.
// ?versuch=wirbel&wesen=langhals|robbe|rex|tiger|kugel&kaefig=1&azimut=-60
// Pose: &biegen=<Grad>&bei=<Anteil von der Schnauze>&weich=<Anteil> biegt die Wirbelsäule (Kopfseite dreht sich).
// 2D: Wirbelsäule (dunkelrot), Sprossen (orange = liegend, Breite aus dem Top; blau = stehend, Breite aus der Front),
// Umriss des 3D-Körpers gestrichelt zum Vergleich mit der Zeichnung. 3D: Körper weiß, auf Wunsch das Käfiggitter.

import { type Ansicht, neuesDokument } from '@ee/shape';
import { type Netz, type V3, type Vorlage, kaefigAusSprossen, selbstDurchdringungen, umrissAusNetz, unterteilenMehrfach, vorlageDokument, wirbelBiegen, wirbelKaefig, zuDreiecken } from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import type { Versuch } from './subdivision';
import { type UeberLinie, useUeberlagerung } from './ueberlagerung';

function kantenVon(netz: Netz): [number, number][] {
  const m = new Map<string, [number, number]>();
  for (const f of netz.flaechen) for (let i = 0; i < f.length; i++) {
    const a = f[i]!;
    const b = f[(i + 1) % f.length]!;
    m.set(a < b ? `${a},${b}` : `${b},${a}`, [a, b]);
  }
  return [...m.values()];
}

const proj = (p: V3, a: Ansicht) => (a === 'seite' ? { x: p[0], y: p[1] } : a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] });

export async function wirbelVersuch(versuch: Versuch, renderer: () => Renderer3D | null) {
  let dok = neuesDokument('Kugel');
  if (versuch.wesen !== 'kugel') {
    const basis = `${import.meta.env.BASE_URL}versuch/${versuch.wesen}/`;
    const vorlage = (await (await fetch(`${basis}${versuch.wesen}.json`)).json()) as Vorlage;
    dok = vorlageDokument(vorlage, 'zu', versuch.wesen);
  }
  useEditor.getState().laden(dok, null);

  const t0 = performance.now();
  const ruhe = wirbelKaefig(dok);
  const q = new URLSearchParams(location.search);
  const grad = Number(q.get('biegen') ?? 0);
  let wk = ruhe;
  if (grad) {
    const b = wirbelBiegen(ruhe, Number(q.get('bei') ?? 0.5), grad, Number(q.get('weich') ?? 0.15));
    const k = kaefigAusSprossen(b.sprossen, b.spitzeV, ruhe.wirbel[ruhe.wirbel.length - 1]!);
    wk = { ...ruhe, ...k, sprossen: b.sprossen, wirbel: b.wirbel };
  }
  const fein = unterteilenMehrfach(wk.netz, 3);
  console.info(`[wirbel] ${versuch.wesen}: ${wk.sprossen.length} Ringe, Käfig ${wk.netz.punkte.length} Punkte, ${(performance.now() - t0).toFixed(0)} ms`, wk.hinweise);

  // Durchdringungen (Stufe 1) als rote Punkte, wenn &pruefen=1
  const orte = new URLSearchParams(location.search).get('pruefen') === '1' ? selbstDurchdringungen(unterteilenMehrfach(wk.netz, 1)).orte : [];
  if (orte.length) console.info(`[wirbel] Durchdringungen (Stufe 1): ${orte.length}`);
  const ueber: ReturnType<typeof useUeberlagerung.getState> = {};
  for (const a of ['seite', 'front', 'top'] as const) {
    const linien: UeberLinie[] = [];
    if (versuch.kaefig) {
      for (const [i, j] of kantenVon(wk.netz)) {
        if (a !== 'seite' && wk.netz.punkte[i]![2] < -1e-6 && wk.netz.punkte[j]![2] < -1e-6) continue;
        linien.push({ punkte: [proj(wk.netz.punkte[i]!, a), proj(wk.netz.punkte[j]!, a)], farbe: '#19232b', breite: 1, strich: '3 3' });
      }
    }
    // Umriss des Körpers (gestrichelt) zum Vergleich mit der Zeichnung; gebogen: zusätzlich der Umriss in Ruhe (grau)
    const um = umrissAusNetz(fein, a, 400)[0];
    if (um) linien.push({ punkte: um, farbe: '#7a1f3d', breite: grad ? 2.5 : 1.5, zu: true, ...(grad ? {} : { strich: '6 4' }) });
    if (grad) {
      const umRuhe = umrissAusNetz(unterteilenMehrfach(ruhe.netz, 2), a, 300)[0];
      if (umRuhe) linien.push({ punkte: umRuhe, farbe: '#5b6770', breite: 1.2, zu: true, strich: '4 4' });
    }
    if (a === 'seite') {
      for (const s of wk.sprossen) linien.push({ punkte: [s.oben, s.unten], farbe: s.liegend >= 0.5 ? '#d9730d' : '#1f5fd1', breite: 1.2 });
      linien.push({ punkte: wk.wirbel, farbe: '#8a1020', breite: 3 });
    }
    ueber[a] = { punkte: orte.map((o) => ({ farbe: 'rot' as const, ...proj(o, a) })), linien };
  }
  useUeberlagerung.setState(ueber);

  if (versuch.nah) {
    const p = fein.punkte;
    const lo = [0, 1, 2].map((k) => Math.min(...p.map((q) => q[k]!)));
    const hi = [0, 1, 2].map((k) => Math.max(...p.map((q) => q[k]!)));
    const ziel: [number, number, number] = [(lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, 0];
    const groesse = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
    useUi.setState({ kamera: { azimut: (versuch.azimut * Math.PI) / 180, elevation: (12 * Math.PI) / 180, distanz: 2.6 * groesse + 0.3, ziel } });
  }

  const r = renderer();
  if (!r) return;
  const d = zuDreiecken(fein, 40);
  r.setzeDreiecke(d.positionen, d.normalen, null);
  if (versuch.kaefig) {
    const k = kantenVon(wk.netz);
    const punkte = new Float32Array(k.length * 6);
    k.forEach(([i, j], m) => {
      punkte.set(wk.netz.punkte[i]!, m * 6);
      punkte.set(wk.netz.punkte[j]!, m * 6 + 3);
    });
    r.setzeLinien(punkte);
  } else r.setzeLinien(null);
}
