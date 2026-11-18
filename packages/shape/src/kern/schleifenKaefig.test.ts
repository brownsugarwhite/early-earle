// Prüfplan P1 „Ansichten als Illustration“, Tag 2–3, zweiter Anlauf (03.11.2026): der Käfig aus den Schleifen. Tore der Tabelle
// im Prüfplan an den Einteilern (`pruefen/einteiler.ts`, Röhre, Florians Ablauf aus der Startkugel), je Körper zweigeteilt:
// **Form** — Δ je Blatt ≤ 0,5 px (Raster 1920, sonst kappt das Raster die Ecken des Würfels um 0,5–1 px), Überstand ≤ 0,5 px, Rest an
// den Schleifen ≤ 0,5 px, Silhouette ≤ 2°;
// **Glätte** — 0 nach innen gekehrte Flächen, Falten frei ≤ heute + 0,5 / Kappe ≤ max(15°, heute), Knicke Stufe 1 95 % ≤ 20° /
// max ≤ 30°, keine Wendepunkte in den Ringen, Flachband ≤ 13 % (runde Körper). Dazu Bau ≤ 50 ms und „ohne Option bitgleich“.
// Stand 03.11.: Kugel, Ei und scharfer Würfel halten alles; Zylinder und runde Vase halten die Glätte und liegen in der Form
// 0,7–1,3 px (Randecken und enge Rundungen bei 16 Punkten je Ring); Kegel (Kippung 84 px, ungekennzeichnete Rundungen),
// Stift-Würfel (Rundung r 14 px gegen scharfe Falte) und Vase aus der Kugel (Messerkante am Rand) verfehlen die Form; verfehlte
// Tore stehen als `it.fails` (Register „Befunde aus P1 Tag 2–3, zweiter Anlauf“). Messwerte mit `--reporter=verbose`.
import { describe, expect, it } from 'vitest';
import { alleFlaechen } from '../kaefig/halbkanten';
import { blattAbweichungen } from './abweichung';
import { editorBauen, editorPlan, imAblauf } from './pruefen/extremMessung';
import { EINTEILER, einteiler } from './pruefen/einteiler';
import { flachband, knickeStufe1, nachInnen, punkteVon, wendepunkte } from './pruefen/koerperMass';
import { faltenNachZonenRoehre } from './pruefen/zonen';
import { schleifenKaefig } from './schleifenKaefig';
import { umrissPlan } from './umrissPlan';

declare const console: { log: (...a: unknown[]) => void };

/** Körper → hält er heute (03.11.) die Form-Tore, die Glätte-Tore? */
const HAELT: Record<string, { form: boolean; glatt: boolean }> = {
  kugel: { form: true, glatt: true },
  ei: { form: true, glatt: true },
  'wuerfel-scharf': { form: true, glatt: true },
  zylinder: { form: false, glatt: true },
  'vase-rund': { form: false, glatt: true },
  kegel: { form: false, glatt: false },
  wuerfel: { form: false, glatt: true },
  vase: { form: false, glatt: false },
};

function messen(name: string) {
  const dok0 = einteiler(name).dok();
  const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dok = { ...bau.dok, skalierung: 1 };
  const r = schleifenKaefig(abl, umrissPlan(dok), dok);
  const flaechen = alleFlaechen(r.abl.unterteilung.stufen[r.abl.unterteilung.stufen.length - 1]!.kaefig);
  const vor = punkteVon(abl.fein);
  const nach = punkteVon(r.abl.fein);
  const dAlt = blattAbweichungen(vor, alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig), dok, 1920);
  const dNeu = blattAbweichungen(nach, flaechen, dok, 1920);
  const fAlt = faltenNachZonenRoehre(abl);
  const fNeu = faltenNachZonenRoehre(r.abl);
  const kNeu = knickeStufe1(r.abl, r.abl.fein);
  const fl = flachband(nach, flaechen);
  const wende = wendepunkte(r.abl, r.abl.fein, r.bericht.achse);
  const innen = nachInnen(nach, flaechen, r.abl, r.bericht.achse);
  return { r, dAlt, dNeu, fAlt, fNeu, kNeu, fl, wende, innen };
}

const f1 = (x: number) => x.toFixed(1);

describe('P1 Tag 2–3, zweiter Anlauf: der Käfig aus den Schleifen', () => {
  for (const fall of EINTEILER) {
    const h = HAELT[fall.name] ?? { form: false, glatt: false };
    const fForm = h.form ? it : it.fails;
    const fGlatt = h.glatt ? it : it.fails;
    let m: ReturnType<typeof messen> | null = null;
    const mess = () => (m ??= messen(fall.name));
    fForm(`${fall.name} — Form: Δ je Blatt ≤ 0,5 px, Überstand ≤ 0,5 px, Rest an den Schleifen ≤ 0,5 px, Silhouette ≤ 2°`, () => {
      const x = mess();
      const b = x.r.bericht;
      console.log(
        `${fall.name}: Achse ${b.achse}, Ring ${b.ringF}, Δ S/F/T ${f1(x.dAlt.seite.max)}/${f1(x.dAlt.front.max)}/${f1(x.dAlt.top.max)} → ${f1(x.dNeu.seite.max)}/${f1(x.dNeu.front.max)}/${f1(x.dNeu.top.max)} px, Rest ${f1(b.rest.max)} px, Silhouette ${f1(b.silhouette)}°, innen ${f1(b.innen.max)} px, Überstand F/T ${f1(b.ueberstand.front)}/${f1(b.ueberstand.top)}, Kippung ${f1(b.kippung)} px, Falten Ringe ${JSON.stringify(b.falten.ringe)} Reihen ${JSON.stringify(b.falten.reihen)}, Bau ${b.ms.toFixed(0)} ms (Unterteilung ${b.msUnterteilung.toFixed(0)}, Lösen ${b.msLoeser.toFixed(0)})`,
      );
      expect(b.ok, b.grund).toBe(true);
      for (const a of ['seite', 'front', 'top'] as const) expect(x.dNeu[a].max, `Δ ${a}`).toBeLessThanOrEqual(0.5);
      expect(b.ueberstand.front, 'Überstand Front').toBeLessThanOrEqual(0.5);
      expect(b.ueberstand.top, 'Überstand Top').toBeLessThanOrEqual(0.5);
      expect(b.rest.max, 'Rest an den Schleifen').toBeLessThanOrEqual(0.5);
      expect(b.silhouette, 'Silhouette').toBeLessThanOrEqual(2);
    });
    fGlatt(`${fall.name} — Glätte: 0 nach innen, Falten ≤ heute (Kappen ≤ 15°), Knicke Stufe 1 ≤ 20°/30°, keine Wendepunkte${fall.rund ? ', Flachband ≤ 13 %' : ''}`, () => {
      const x = mess();
      console.log(
        `${fall.name}: nach innen ${x.innen.zahl}${x.innen.zahl ? ` (${x.innen.wo})` : ''}, Falten frei/Kappe ${f1(x.fAlt.zonen.frei.max)}/${f1(x.fAlt.zonen.kappe.max)}° → ${f1(x.fNeu.zonen.frei.max)}/${f1(x.fNeu.zonen.kappe.max)}°, Knicke Stufe 1 ${f1(x.kNeu.p95)}/${f1(x.kNeu.max)}°, Flachband ${f1(x.fl.seite)}/${f1(x.fl.front)}/${f1(x.fl.top)} %, Wendepunkte ${x.wende}`,
      );
      expect(x.innen.zahl, 'nach innen gekehrte Flächen').toBe(0);
      expect(x.fNeu.zonen.frei.max, 'Falten frei').toBeLessThanOrEqual(x.fAlt.zonen.frei.max + 0.5);
      expect(x.fNeu.zonen.kappe.max, 'Falten Kappe').toBeLessThanOrEqual(Math.max(15, x.fAlt.zonen.kappe.max));
      expect(x.kNeu.p95, 'Knicke 95 %').toBeLessThanOrEqual(20);
      expect(x.kNeu.max, 'Knicke max').toBeLessThanOrEqual(30);
      expect(x.wende, 'Wendepunkte').toBe(0);
      if (fall.rund) for (const a of ['seite', 'front', 'top'] as const) expect(x.fl[a], `Flachband ${a}`).toBeLessThanOrEqual(13);
    });
  }

  it.fails('Bau ≤ 50 ms (Kugel: Unterteilung mit neuen Falten ≈ 80 ms, ein gekoppelter Löser ≈ 60 ms)', () => {
    const m = messen('kugel');
    expect(m.r.bericht.ms).toBeLessThanOrEqual(50);
  });

  it('Spielbudget: der Käfig bleibt die Röhre (8 · Käfigflächen ≤ 8 000 Dreiecke)', () => {
    const m = messen('vase-rund');
    expect(8 * m.r.abl.kaefig.nF).toBeLessThanOrEqual(8000);
  });

  it('ohne Option bitgleich: der Wesen-Bau ohne `schleifenKaefig` lässt die Ableitung unangetastet', () => {
    const dok0 = einteiler('ei').dok();
    const a = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
    const b = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), { ...editorPlan('roehre'), umrissPlan: true });
    expect(Array.from(b.netz.positionen)).toEqual(Array.from(a.netz.positionen));
    const c = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), { ...editorPlan('roehre'), umrissPlan: true, schleifenKaefig: true });
    expect(c.netz.info.kaefig?.ok).toBe(true);
    expect(Array.from(c.netz.positionen)).not.toEqual(Array.from(a.netz.positionen));
  });
});
