// Prüfplan P1 „Ansichten als Illustration“, Tag 2–3 (03.11.2026): der Körper aus den geplanten Umrissschleifen. Tore der
// Tabelle im Prüfplan an den Prüfkörpern (Röhre, Florians Ablauf aus der Startkugel): Δ je Blatt ≤ 0,5 px, Überstand ≤ 0,5 px,
// 0 umgeklappte Flächen, Falten frei/Kappe ≤ heute (Kappen ≤ 15°), Flachband ≤ 13 % (nur runde Körper), Knicke Stufe 1
// 95 % ≤ 20° / max ≤ 30°, keine Wendepunkte in den Ringen, Lösen ≤ 50 ms. Stand 03.11.: nur die Kugel hält alle Tore;
// verfehlte stehen als `it.fails` (Register „Befunde aus P1 Tag 2–3“). Messwerte mit `--reporter=verbose`.
import { describe, expect, it } from 'vitest';
import { alleFlaechen } from '../kaefig/halbkanten';
import { blattAbweichungen } from './abweichung';
import { editorBauen, editorPlan, imAblauf } from './pruefen/extremMessung';
import { extremKoerper } from './pruefen/extremreihe';
import { flachband, knickeStufe1, punkteVon, umgeklappt, wendepunkte } from './pruefen/koerperMass';
import { faltenNachZonenRoehre } from './pruefen/zonen';
import { schleifenKoerper } from './schleifenKoerper';
import { umrissPlan } from './umrissPlan';

declare const console: { log: (...a: unknown[]) => void };

/** Körper → hält er heute (03.11.) alle Tore? Runde Körper zählen fürs Flachband-Tor. */
const FAELLE: { name: string; rund: boolean; haelt: boolean }[] = [
  { name: 'kugel', rund: true, haelt: true },
  { name: 'ei', rund: true, haelt: false },
  { name: 'kegel', rund: false, haelt: false },
  { name: 'wuerfel', rund: false, haelt: false },
  { name: 'pilz', rund: true, haelt: false },
  { name: 'robbe', rund: true, haelt: false },
  { name: 'rex', rund: true, haelt: false },
  { name: 'tigerkopf', rund: false, haelt: false },
  { name: 'langhals', rund: true, haelt: false },
  { name: 'vase', rund: true, haelt: false },
];

function messen(name: string) {
  const dok0 = extremKoerper(name).dok();
  const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dok = { ...bau.dok, skalierung: 1 };
  const plan = umrissPlan(dok);
  const r = schleifenKoerper(abl, plan, dok);
  const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
  const vor = punkteVon(abl.fein);
  const nach = punkteVon(r.abl.fein);
  const dAlt = blattAbweichungen(vor, flaechen, dok);
  const dNeu = blattAbweichungen(nach, flaechen, dok);
  const fAlt = faltenNachZonenRoehre(abl);
  const fNeu = faltenNachZonenRoehre(r.abl);
  const kNeu = knickeStufe1(r.abl, r.abl.fein);
  const fl = flachband(nach, flaechen);
  const wende = wendepunkte(r.abl, r.abl.fein);
  const um = umgeklappt(vor, nach, flaechen, abl);
  return { r, dAlt, dNeu, fAlt, fNeu, kNeu, fl, wende, um };
}

describe('P1 Tag 2–3: Körper aus den Schleifen', () => {
  for (const fall of FAELLE) {
    const f = fall.haelt ? it : it.fails;
    f(`${fall.name}: Δ je Blatt ≤ 0,5 px, Überstand ≤ 0,5 px, 0 umgeklappte Flächen, Falten ≤ heute (Kappen ≤ 15°), Knicke Stufe 1 ≤ 20°/30°, keine Wendepunkte${fall.rund ? ', Flachband ≤ 13 %' : ''}`, () => {
      const m = messen(fall.name);
      const b = m.r.bericht;
      console.log(
        `${fall.name}: Δ S/F/T ${m.dAlt.seite.max.toFixed(1)}/${m.dAlt.front.max.toFixed(1)}/${m.dAlt.top.max.toFixed(1)} → ${m.dNeu.seite.max.toFixed(1)}/${m.dNeu.front.max.toFixed(1)}/${m.dNeu.top.max.toFixed(1)} px, Überstand F/T ${b.ueberstand.front.toFixed(1)}/${b.ueberstand.top.toFixed(1)}, umgeklappt ${m.um.zahl}${m.um.zahl ? ` (${m.um.wo})` : ''}, Falten frei/Kappe ${m.fAlt.zonen.frei.max.toFixed(1)}/${m.fAlt.zonen.kappe.max.toFixed(1)}° → ${m.fNeu.zonen.frei.max.toFixed(1)}/${m.fNeu.zonen.kappe.max.toFixed(1)}°, Knicke Stufe 1 ${m.kNeu.p95.toFixed(1)}/${m.kNeu.max.toFixed(1)}°, Flachband ${m.fl.seite.toFixed(1)}/${m.fl.front.toFixed(1)}/${m.fl.top.toFixed(1)} %, Wendepunkte ${m.wende}, Lösen ${b.ms.toFixed(0)} ms, gebunden F ${b.proben.front.gebunden}/${b.proben.front.gezeichnet} T ${b.proben.top.gebunden}/${b.proben.top.gezeichnet}, aufgegeben ${b.aufgegeben.front + b.aufgegeben.top}, weich ${b.weich.front + b.weich.top}`,
      );
      for (const a of ['seite', 'front', 'top'] as const) expect(m.dNeu[a].max, `Δ ${a}`).toBeLessThanOrEqual(0.5);
      expect(b.ueberstand.front, 'Überstand Front').toBeLessThanOrEqual(0.5);
      expect(b.ueberstand.top, 'Überstand Top').toBeLessThanOrEqual(0.5);
      expect(m.um.zahl, 'umgeklappte Flächen').toBe(0);
      expect(m.fNeu.zonen.frei.max, 'Falten frei').toBeLessThanOrEqual(m.fAlt.zonen.frei.max + 0.5);
      expect(m.fNeu.zonen.kappe.max, 'Falten Kappe').toBeLessThanOrEqual(Math.max(15, m.fAlt.zonen.kappe.max));
      expect(m.kNeu.p95, 'Knicke 95 %').toBeLessThanOrEqual(20);
      expect(m.kNeu.max, 'Knicke max').toBeLessThanOrEqual(30);
      expect(m.wende, 'Wendepunkte').toBe(0);
      if (fall.rund) for (const a of ['seite', 'front', 'top'] as const) expect(m.fl[a], `Flachband ${a}`).toBeLessThanOrEqual(13);
    });
  }

  it.fails('Lösen ≤ 50 ms bei ≤ 2 000 Käfigpunkten (Kugel: 6 Runden, drei gekoppelte Zerlegungen je Runde)', () => {
    const m = messen('kugel');
    console.log(`kugel: Lösen ${m.r.bericht.ms.toFixed(0)} ms (davon Zerlegungen ${m.r.bericht.msLoeser.toFixed(0)} ms), ${m.r.bericht.unbekannte} Unbekannte, Hülle ${m.r.bericht.huelle}`);
    expect(m.r.bericht.ms).toBeLessThanOrEqual(50);
  });

  it('ohne Option bitgleich: der Wesen-Bau ohne `schleifenKoerper` lässt die Ableitung unangetastet', () => {
    const dok0 = extremKoerper('ei').dok();
    const a = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
    const b = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), { ...editorPlan('roehre'), umrissPlan: true });
    expect(Array.from(b.netz.positionen)).toEqual(Array.from(a.netz.positionen));
    const c = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), { ...editorPlan('roehre'), umrissPlan: true, schleifenKoerper: true });
    expect(c.netz.info.schleifen).toBeTruthy();
    expect(Array.from(c.netz.positionen)).not.toEqual(Array.from(a.netz.positionen));
  });
});
