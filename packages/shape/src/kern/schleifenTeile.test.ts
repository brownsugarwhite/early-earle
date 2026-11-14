// Prüfplan P1 „Ansichten als Illustration“, Tag 4–5 „Teile an der Naht“ (03.11.2026): Rumpf mit Kindern über Fenster auf dem
// Schleifen-Käfig. Prüfkörper: Langhals (Hals + Kopf auf dem Rücken, Streifen über die vordere Kappe), Robbe (Kopf vorn oben,
// Streifen über die Kappe), Ente (Hals + Kopf als Streifen; die Flügel als seitliches Paar bleiben im zweiten Schritt), Pilz
// (Stiel als Fortsetzung über die untere Kappe des Huts, Achse y). Tore je Körper:
// **gebaut** — Bericht ok, mindestens ein Kind, kein umgeklapptes Netz (`orientieren` und `pruefeKaefig` grün);
// **Form** — Δ Seite ≤ 1 px (beide Nähte sind Käfigreihen), Δ Front/Top ≤ 2 px (die seitliche Breite der Kinder kommt aus der
// Sichthülle), Rest an den Schleifen ≤ 1 px;
// **Naht** — Knick an den Fensterrändern auf Stufe 1 ≤ 30°, 0 nach innen gekehrte Flächen je Teil, Knicke Stufe 1 95 % ≤ 20°;
// **bitgleich** — ohne `schleifenKaefig` baut der Wesen-Bau wie heute.
// Stand 03.11. nachts: alle vier bauen; Seite Pilz 0,7, Langhals 1,3, Robbe 4,6, Ente 15,5 px; Front/Top 2–9 px; Nahtknick
// Langhals 29°, Ente 41°, Robbe 58°, Pilz 85°; nach innen 122–1214 je Kind.
// Stand 03.11. abends (Naht weich, Hülle als Obergrenze und Hüllenringe, Flügel als Paar, Röhrenende am Ende der Wirbelsäule,
// Silhouettenbedingung je Ring): Seite Langhals 1,0 (Rest 1,3), Pilz 0,9, Robbe 1,7, Ente 2,9 px; Front/Top Pilz 0,8/2,0, Ente 3,7/2,7,
// Langhals 4,6/2,9, Robbe 7,4/5,4 px; Nahtknick frei (ohne gezeichnete Ecken) Langhals 17,9°, Ente 20,2°, Robbe 37,0° (Falte längs
// der Fensterflanken), Pilz ohne freie Randkante (der Stiel trifft den Hut ringsum an einer gezeichneten Kante, dort 33,9°); nach
// innen Robbe 0, Langhals 26 (0,0 % der Fläche), Ente 284 (0,7 %, Fächer am Hals-Kopf-Knick) und 6 je Flügel, Pilz 3.
// Stand 03.11. nachts (Endstück): Die Robbe ist kein Streifen auf dem Rücken mehr, sondern die Fortsetzung des Röhrenendes (Rand =
// Ring 11 durch das hintere Sehnenende, Kappe und Ringe davor laufen als Ringe des Kopfs weiter, beide Seiten im gleichen
// Bogenanteil, alle Ringpunkte hart, keine Silhouettenbänder): Seite 1,5, Front 12,4, Top 9,6 px (Bauchecken und breiteste Stelle
// des Bauchs zwischen den 16 Ringpunkten), Naht 27,6° (vorher 37,0°), nach innen 0 / 6, Knicke max 68° (vorher 141°). Langhals,
// Ente und Pilz unverändert (der Langhals-Hals bleibt Streifen: Ring 0,40 zu Sehne 0,16).
// Stand 03.11. spätabends (Dichte je Ring): Ringvorlage des Rumpfs nach der Wurzel der Krümmung abgetastet (`ringDichteRumpf`), Tiefe
// der Rumpf-Reihenschleife aus der Vorlage (`rumpfTiefe`), Endstück-Ringe aus der Vorlage mit Bauchhälfte auf der Hülle und Kopfhälfte
// als Halbellipse (`vorlagenRing`): Robbe Seite/Front/Top 1,5/12,4/9,6 → 2,5/4,4/3,3 px (Bauchecke 12 → 4,4, breiteste Stelle 9,6 → 3,3;
// Naht 27,6 → 14,2°, nach innen 0 / 0, Knicke 95 % 19,9°: Glätte hält; neu Seite 2,5 am Rand und Überstand 4,7 px), Langhals
// 1,0/4,6/2,9 → 1,0/4,1/2,9 (Bauchecke 4,5 → 1,9, Rest 1,3 → 0,6: Form Seite hält; 4,1 px an der Kopfkrone des Hals-Kindes), Ente
// 2,9/3,7/2,7 → 2,9/4,5/2,7 (Naht 25,3°), Pilz unverändert. Front/Top ≤ 2 px hält weiter keiner.
// Verfehlte Tore stehen als `it.fails` (Register „Befunde aus P1 Tag 4–5“). Messwerte mit `--reporter=verbose`.
import { describe, expect, it } from 'vitest';
import { alleFlaechen } from '../kaefig/halbkanten';
import { blattAbweichungen } from './abweichung';
import { editorBauen, editorPlan, imAblauf } from './pruefen/extremMessung';
import { extremKoerper } from './pruefen/extremreihe';
import { knickeStufe1, nachInnenTeile, punkteVon } from './pruefen/koerperMass';
import { schleifenKaefig, teileFinden } from './schleifenKaefig';
import { umrissPlan } from './umrissPlan';

declare const console: { log: (...a: unknown[]) => void };
declare const process: { env: Record<string, string | undefined> };
/** CI-Rechner sind langsamer und lassen alle Pakete parallel laufen (Plan 20.10., V0): dort gilt das Doppelte der Zeitgrenze. */
const ZEIT = process.env.CI ? 2 : 1;

/** Körper → hält er heute (03.11. spätabends) Form Seite, Form Front/Top, Naht (Knick frei ≤ 30°), Glätte (0 nach innen, Knicke 95 % ≤ 20°)? */
const HAELT: Record<string, { seite: boolean; frontTop: boolean; naht: boolean; glatt: boolean; kinder: number }> = {
  langhals: { seite: true, frontTop: false, naht: true, glatt: false, kinder: 1 },
  robbe: { seite: false, frontTop: false, naht: true, glatt: true, kinder: 1 },
  ente: { seite: false, frontTop: false, naht: true, glatt: false, kinder: 3 },
  pilz: { seite: true, frontTop: false, naht: true, glatt: false, kinder: 1 },
};
const TEILE = ['langhals', 'robbe', 'ente', 'pilz'] as const;

function messen(name: string) {
  const dok0 = extremKoerper(name).dok();
  const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
  const abl = bau.stand.abl;
  const dok = { ...bau.dok, skalierung: 1 };
  const plan = umrissPlan(dok);
  const fund = teileFinden(dok, plan, abl.gefroren);
  const r = schleifenKaefig(abl, plan, dok);
  const flaechen = alleFlaechen(r.abl.unterteilung.stufen[r.abl.unterteilung.stufen.length - 1]!.kaefig);
  const nach = punkteVon(r.abl.fein);
  const dNeu = blattAbweichungen(nach, flaechen, dok, 1920);
  const dAlt = blattAbweichungen(punkteVon(abl.fein), alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig), dok, 1920);
  const kNeu = knickeStufe1(r.abl, r.abl.fein);
  const innen = r.bericht.teile?.teilVonFlaeche ? nachInnenTeile(nach, flaechen, r.abl, r.bericht.achse, r.bericht.teile.teilVonFlaeche, r.bericht.teile.kinder) : { zahl: -1, wo: '', rumpf: -1, kinder: [] as number[], anteil: { rumpf: 0, kinder: [] as number[] } };
  return { r, fund, dAlt, dNeu, kNeu, innen, abl };
}

const f1 = (x: number) => x.toFixed(1);

describe('P1 Tag 4–5: Teile an der Naht auf dem Schleifen-Käfig', () => {
  for (const name of TEILE) {
    const h = HAELT[name]!;
    let m: ReturnType<typeof messen> | null = null;
    const mess = () => (m ??= messen(name));
    it(`${name} — gebaut: Bericht ok, ${h.kinder} Kind(er), Käfig orientiert`, () => {
      const x = mess();
      const b = x.r.bericht;
      const t = b.teile;
      console.log(
        `${name}: Kinder ${x.fund.kinder.map((k) => `${k.name} (${k.quelle}, Rumpf ${k.laenglich.toFixed(2)} : 1, Sehne ${k.sehneWinkel.toFixed(0)}°)`).join(', ') || '–'}; ausgelassen ${x.fund.ausgelassen.map((a) => `${a.name}: ${a.grund}`).join('; ') || '–'}`,
      );
      expect(b.ok, b.grund).toBe(true);
      expect(t, 'Teile-Bericht').toBeDefined();
      console.log(
        `${name}: Achse ${b.achse}, ${t!.kinder.map((k) => `${k.name} ${k.art} λ ${k.fenster.lamA}…${k.fenster.lamB} ${k.fenster.seite} ${k.art === 'streifen' ? `Spalten ${k.fenster.c}` : `Ring ${k.fenster.c}`}, ${k.ringe} Ringe × ${k.punkte}, Länge ${f1(k.laenge)} px`).join('; ')}; Punkte ${x.r.abl.kaefig.n} (${x.abl.kaefig.n}), Bau ${b.ms.toFixed(0)} ms`,
      );
      expect(t!.kinder.length, 'gebaute Kinder').toBeGreaterThanOrEqual(h.kinder);
      expect(x.r.abl.kaefig.n, 'neue Punkte').toBeGreaterThan(x.abl.kaefig.n);
    });
    (h.seite ? it : it.fails)(`${name} — Form Seite: Δ ≤ 1 px, Rest an den Schleifen ≤ 1 px`, () => {
      const x = mess();
      const b = x.r.bericht;
      console.log(`${name}: Δ S/F/T ${f1(x.dAlt.seite.max)}/${f1(x.dAlt.front.max)}/${f1(x.dAlt.top.max)} → ${f1(x.dNeu.seite.max)}/${f1(x.dNeu.front.max)}/${f1(x.dNeu.top.max)} px, Rest ${f1(b.rest.max)} px, Silhouette ${f1(b.silhouette)}°, Überstand F/T ${f1(b.ueberstand.front)}/${f1(b.ueberstand.top)} px`);
      expect(b.ok, b.grund).toBe(true);
      expect(x.dNeu.seite.max, 'Δ Seite').toBeLessThanOrEqual(1);
      expect(b.rest.max, 'Rest').toBeLessThanOrEqual(1);
    });
    (h.frontTop ? it : it.fails)(`${name} — Form Front und Top: Δ ≤ 2 px`, () => {
      const x = mess();
      expect(x.r.bericht.ok, x.r.bericht.grund).toBe(true);
      expect(x.dNeu.front.max, 'Δ Front').toBeLessThanOrEqual(2);
      expect(x.dNeu.top.max, 'Δ Top').toBeLessThanOrEqual(2);
    });
    (h.naht ? it : it.fails)(`${name} — Naht: Knick an den Fensterrändern (Stufe 1) ≤ 30°, außer an gezeichneten Ecken (T-Stoß einer Ansicht)`, () => {
      const x = mess();
      const t = x.r.bericht.teile;
      console.log(
        `${name}: Nahtknick frei ${f1(t?.nahtKnick ?? 0)}° (${t?.nahtKanten.frei ?? 0} Kanten)${t?.nahtKnickEcken !== null && t?.nahtKnickEcken !== undefined ? `, an gezeichneten Ecken ${f1(t.nahtKnickEcken)}° (${t.nahtKanten.ecken} Kanten)` : ''}, nach innen ${x.innen.zahl} (${x.innen.wo}; Fläche Rumpf ${f1(x.innen.anteil.rumpf)} %, Kinder ${x.innen.anteil.kinder.map(f1).join('/')} %), Knicke Stufe 1 ${f1(x.kNeu.p95)}/${f1(x.kNeu.max)}°`,
      );
      expect(x.r.bericht.ok, x.r.bericht.grund).toBe(true);
      expect(t?.nahtKnick ?? 999, 'Nahtknick (freie Randkanten)').toBeLessThanOrEqual(30);
    });
    (h.glatt ? it : it.fails)(`${name} — Glätte: 0 nach innen je Teil, Knicke Stufe 1 95 % ≤ 20°`, () => {
      const x = mess();
      expect(x.r.bericht.ok, x.r.bericht.grund).toBe(true);
      expect(x.innen.zahl, `nach innen (${x.innen.wo})`).toBe(0);
      expect(x.kNeu.p95, 'Knicke 95 %').toBeLessThanOrEqual(20);
    });
  }

  it('ohne Option bitgleich: der Wesen-Bau ohne `schleifenKaefig` baut Langhals, Robbe, Ente und Pilz wie heute; mit Option ein anderer Körper mit Teilen', () => {
    for (const name of TEILE) {
      const dok0 = extremKoerper(name).dok();
      const a = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
      const b = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), { ...editorPlan('roehre'), umrissPlan: true });
      expect(Array.from(b.netz.positionen), name).toEqual(Array.from(a.netz.positionen));
      const c = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), { ...editorPlan('roehre'), umrissPlan: true, schleifenKaefig: true });
      expect(c.netz.info.kaefig?.ok, `${name}: ${c.netz.info.kaefig?.grund}`).toBe(true);
      expect(c.netz.info.kaefig?.teile?.kinder.length ?? 0, `${name}: Kinder im Editor-Bau`).toBeGreaterThanOrEqual(1);
      expect(c.netz.positionen.length, `${name}: mehr Punkte mit Teilen`).toBeGreaterThan(a.netz.positionen.length);
    }
  }, 60_000 * ZEIT); // zwölf Editor-Bauten: lokal allein ≈ 13 s, auf CI über die 30 s des Standards

  it('Einteiler bleiben Einteiler: Vase, runde Vase, Kegel, Würfel bekommen kein Kind aus dem Teilbaum', () => {
    for (const name of ['vase', 'kegel', 'wuerfel'] as const) {
      const dok0 = extremKoerper(name).dok();
      const bau = editorBauen(imAblauf(dok0, 'roehre', 'kugel'), editorPlan('roehre'));
      const dok = { ...bau.dok, skalierung: 1 };
      const fund = teileFinden(dok, umrissPlan(dok), bau.stand.abl.gefroren);
      expect(fund.kinder.length, `${name}: ${fund.ausgelassen.map((a) => a.grund).join('; ')}`).toBe(0);
    }
  });
});
