// Phase 0, Beweis 1 (Plan 11.1): Kern-Tempo und Treue. Käfig aus dem Seitenumriss ableiten, Grenzfläche der Stufe 3
// gegen die gezeichnete Kurve messen (px bei 461 px je Kachel), Zugschritt am Seitenumriss messen.
import { describe, expect, it } from 'vitest';
import type { V2 } from '../bezier';
import { type Dokument, dokumentLesen, neuesDokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import { alleFlaechen, pruefeKaefig } from '../kaefig/halbkanten';
import { nichtNull } from '../subdivision/matrix';
import type { V3 } from '../versuch/catmullClark';
import { umrissAusNetz } from '../versuch/umriss3d';
import langhalsRoh from '../versuch/vorlagen/langhals.json';
import rexRoh from '../versuch/vorlagen/rex.json';
import ueberhangRoh from '../versuch/vorlagen/ueberhang.json';
import tigerRoh from '../versuch/vorlagen/tiger.json';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { type Vorlage, vorlageDokument } from '../versuch/vorlagen';
import { ableiten, seiteZiehen } from './ableiten';

declare const process: { env: Record<string, string | undefined> };
/** CI-Rechner sind langsamer und lassen alle Pakete parallel laufen (Plan 20.10., V0): dort gilt das Doppelte der Zeitgrenze. */
const ZEIT = process.env.CI ? 2 : 1;

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;

/** Abstand jedes Punkts aus `pts` zum Zug `linie` (geschlossen): max und Mittel. */
function abstandZuZug(pts: readonly V2[], linie: readonly V2[]): { max: number; mittel: number; ort: V2 } {
  let max = 0;
  let summe = 0;
  let ort: V2 = { x: 0, y: 0 };
  for (const p of pts) {
    let best = Infinity;
    for (let i = 0; i < linie.length; i++) {
      const a = linie[i]!;
      const b = linie[(i + 1) % linie.length]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
      best = Math.min(best, Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y));
    }
    if (best > max) {
      max = best;
      ort = p;
    }
    summe += best;
  }
  return { max, mittel: pts.length ? summe / pts.length : 0, ort };
}

function naechsterKnoten(dok: Dokument, p: V2): string {
  let best = '';
  let d = Infinity;
  dok.profile.seite.knoten.forEach((k, i) => {
    const dd = Math.hypot(k.p.x * dok.skalierung - p.x, k.p.y * dok.skalierung - p.y);
    if (dd < d) {
      d = dd;
      best = `Knoten ${i} (${k.art}) in ${(dd * PX).toFixed(0)} px`;
    }
  });
  return best;
}

function profilZug(dok: Dokument, ansicht: 'seite' | 'front' | 'top' = 'seite'): V2[] {
  const s = dok.skalierung;
  return pfadAbtasten(vollerPfad(dok.profile[ansicht]), 160).map((p) => ({ x: p.x * s, y: p.y * s }));
}

/** Umriss der Projektion des feinen Netzes gegen das Profil der Ansicht (px, beide Richtungen). */
function ansichtMessen(abl: ReturnType<typeof ableiten>, dok: Dokument, ansicht: 'front' | 'top'): { hin: number; her: number } {
  const fein = abl.fein;
  const punkte: V3[] = [];
  for (let i = 0; i < fein.length / 3; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const umriss = umrissAusNetz({ punkte, flaechen: alleFlaechen(letzte), schaerfe: new Map() }, ansicht, 900)[0] ?? [];
  const kurve = profilZug(dok, ansicht);
  return { hin: abstandZuZug(umriss, kurve).max * PX, her: abstandZuZug(kurve, umriss).max * PX };
}

function messen(name: string, dok: Dokument, optionen: Parameters<typeof ableiten>[1] = {}) {
  const abl = ableiten(dok, optionen);
  expect(pruefeKaefig(abl.kaefig).ok).toBe(true);
  const fein = abl.fein;
  const nF = fein.length / 3;
  // Nahtpunkte der feinen Grenzfläche (z = 0) gegen die Kurve, und die Kurve gegen die Naht
  const punkte: V3[] = [];
  for (let i = 0; i < nF; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  // Naht in Schleifenreihenfolge (geschlossener Zug)
  const naht: V2[] = Array.from(abl.naht.fein, (i) => ({ x: fein[3 * i]!, y: fein[3 * i + 1]! }));
  const kurve = profilZug(dok);
  const hin = abstandZuZug(naht, kurve);
  const zurueck = abstandZuZug(kurve, naht);
  // Umriss der Projektion (Raster) gegen die Kurve
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const umriss = umrissAusNetz({ punkte, flaechen: alleFlaechen(letzte), schaerfe: new Map() }, 'seite', 1200);
  const silhouette = abstandZuZug(umriss[0] ?? [], kurve);
  const front = ansichtMessen(abl, dok, 'front');
  const top = ansichtMessen(abl, dok, 'top');
  const z = abl.zeiten;
  console.log(
    `${name}: Käfig ${abl.kaefig.n} Punkte, fein ${nF} Punkte, ${nichtNull(abl.unterteilung.grenze)} Gewichte, Naht ${naht.length} Punkte, Ecken ${JSON.stringify(abl.ecken)} Spitzen ${JSON.stringify(abl.spitzen ?? null)}; ` +
      `Naht→Kurve max ${(hin.max * PX).toFixed(2)} px (Ø ${(hin.mittel * PX).toFixed(2)}), Kurve→Naht max ${(zurueck.max * PX).toFixed(2)} px; ` +
      `Umriss→Kurve max ${(silhouette.max * PX).toFixed(2)} px (Ø ${(silhouette.mittel * PX).toFixed(2)}, ${umriss.length} Züge); Front ${front.hin.toFixed(1)}/${front.her.toFixed(1)} px, Top ${top.hin.toFixed(1)}/${top.her.toFixed(1)} px; ` +
      `größte Abweichung bei (${hin.ort.x.toFixed(3)}, ${hin.ort.y.toFixed(3)}) nahe ${naechsterKnoten(dok, hin.ort)}; Kurve→Naht bei (${zurueck.ort.x.toFixed(3)}, ${zurueck.ort.y.toFixed(3)}) nahe ${naechsterKnoten(dok, zurueck.ort)}; ` +
      `Zeiten ms: Leiter ${z.leiter.toFixed(0)}, Breiten ${z.breiten.toFixed(0)}, Matrix ${z.matrix.toFixed(0)}, Löser ${z.loeser.toFixed(0)}, Ziele+Lösen+Netz ${z.ziele.toFixed(0)}, gesamt ${z.gesamt.toFixed(0)}`,
  );
  return { abl, hin, zurueck, silhouette, front, top, nahtPunkte: naht.length };
}

describe('Beweis 1: Kern-Tempo und Treue', () => {
  it('Kugel: Naht und Umriss ≤ 0,5 px', () => {
    const r = messen('Kugel', neuesDokument());
    expect(r.hin.max * PX).toBeLessThan(0.5);
    expect(r.zurueck.max * PX).toBeLessThan(0.5);
    expect(r.silhouette.max * PX).toBeLessThan(1.0);
    // 15.10. („Zeichnung ist Form“, Schritt 1): Front und Top ebenfalls auf der Kurve (0,1 bzw. 0,5 px)
    expect(Math.max(r.front.hin, r.front.her)).toBeLessThan(1.0);
    expect(Math.max(r.top.hin, r.top.her)).toBeLessThan(1.0);
  });

  it('Rex (nachgezogen): Naht ≤ 0,5 px', () => {
    const dok = vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex');
    messen('Rex 36 Ringe', dok, { ringe: 36 });
    const r = messen('Rex', dok);
    // Ziel (Plan 11.1): 0,5 px. Stand 13.10. nachts: 0,33 px (kleine Kappe an Spitzen-Ecken, Ringe nach Krümmung).
    expect(r.hin.max * PX).toBeLessThan(0.5);
    expect(r.zurueck.max * PX).toBeLessThan(0.5);
    // 15.10. (Schritt 1): Top mit Breitenpunkten im Ausgleich 1,1 px (vorher 1,9). Die Front bleibt bei 11 px: Florians
    // Front ist am breitesten Punkt 0,014 breiter als sein Top (Widerspruch der Zeichnungen, wird im Blatt angezeigt).
    expect(Math.max(r.top.hin, r.top.her)).toBeLessThan(1.5);
  });

  it('Langhals (Hals steht): Naht ≤ 2 px', () => {
    const r = messen('Langhals', vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals'));
    // Stand 13.10. nachts: 0,97 px (Ringe nach Krümmung); Ziel ≤ 2 px
    expect(r.hin.max * PX).toBeLessThan(1.5) // Plan: ≤ 2 px; mit entfächerter Leiter 1,36 px (vorher 0,97, dafür Schwanz ohne Durchdringungen);
    // 15.10.: Top 4 px (vorher 17, dann 14): schräge Sprossen am Hals-Rumpf-Übergang bekommen ab 0,5 Neigung den
    // Front-Lappen statt des Kreises (`liegendAb`); der Rest ist der Widerspruch Top gegen Seite + Front an der Brust (≈ 3 px)
    expect(Math.max(r.top.hin, r.top.her)).toBeLessThan(6);
  });

  it('Überhang-Ente (Florian 13.10.): Naht ≤ 2 px ohne Sonderregel', () => {
    const r = messen('Überhang', dokumentLesen(ueberhangRoh));
    expect(r.hin.max * PX).toBeLessThan(2);
  });

  it('Kasten in der Front: flache Seiten bleiben flach, Ecken werden Längsfalten', () => {
    const dok = neuesDokument('Kasten');
    const r = 0.265;
    // Front als Kasten (rechte Hälfte, Achse senkrecht): oben Achse → Ecke oben rechts → Ecke unten rechts → unten Achse
    const o = { x: 0, y: 0 };
    const kasten: Dokument['profile']['front'] = {
      art: 'halb',
      achse: 'senkrecht',
      knoten: [
        { p: { x: 0, y: 2 * r }, ein: o, aus: o, art: 'glatt' },
        { p: { x: 0.8 * r, y: 2 * r }, ein: o, aus: o, art: 'ecke', haerte: 1 },
        { p: { x: 0.8 * r, y: 0 }, ein: o, aus: o, art: 'ecke', haerte: 1 },
        { p: { x: 0, y: 0 }, ein: o, aus: o, art: 'glatt' },
      ],
    };
    const d: Dokument = { ...dok, profile: { ...dok.profile, front: kasten } };
    const res = messen('Kasten-Kugel', d);
    // Front-Umriss folgt dem Kasten (flache Seiten); Längsfalte: Flächennormalen um die Ecken-Längskante knicken ≈ 90°
    expect(res.front.hin).toBeLessThan(2.5);
    const abl = res.abl;
    const v = abl.vorlage;
    const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
    const f = abl.fein;
    // Käfigpunkt der oberen rechten Ecke (Ring in der Mitte, j = Stützstelle der Ecke) hat auf Stufe 3 denselben Index
    let maxWinkel = 0;
    for (let i = 4; i < v.R - 4; i++) {
      for (let j = 1; j < v.N / 2; j++) {
        const p = v.ringPunkt(i, j);
        const normalen: [number, number, number][] = [];
        for (let k = letzte.vFStart[p]!; k < letzte.vFStart[p + 1]!; k++) {
          const fl = letzte.vFlaechen[k]!;
          const h0 = letzte.fStart[fl]!;
          const a = letzte.fVerts[h0]!;
          const b = letzte.fVerts[h0 + 1]!;
          const c = letzte.fVerts[h0 + 2]!;
          const ux = f[3 * b]! - f[3 * a]!, uy = f[3 * b + 1]! - f[3 * a + 1]!, uz = f[3 * b + 2]! - f[3 * a + 2]!;
          const wx = f[3 * c]! - f[3 * a]!, wy = f[3 * c + 1]! - f[3 * a + 1]!, wz = f[3 * c + 2]! - f[3 * a + 2]!;
          const n: [number, number, number] = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
          const l = Math.hypot(...n) || 1;
          normalen.push([n[0] / l, n[1] / l, n[2] / l]);
        }
        for (let x = 0; x < normalen.length; x++) for (let y = x + 1; y < normalen.length; y++) {
          const d = normalen[x]![0] * normalen[y]![0] + normalen[x]![1] * normalen[y]![1] + normalen[x]![2] * normalen[y]![2];
          maxWinkel = Math.max(maxWinkel, (Math.acos(Math.min(1, Math.max(-1, d))) * 180) / Math.PI);
        }
      }
    }
    console.log(`Kasten-Kugel: größter Knick zwischen Flächen an Ringpunkten ${maxWinkel.toFixed(1)}° (Ziel ≈ 90°, rund wären < 15°)`);
    expect(maxWinkel).toBeGreaterThan(60);
  });

  for (const ringe of [24, 36]) it(`Zugschritt am Seitenumriss (${ringe} Ringe): Löser + Matrix ≤ 16 ms, Naht folgt der neuen Kurve`, () => {
    const dok = vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex');
    const abl = ableiten(dok, { ringe });
    // oberster Knoten des Seitenumrisses um 0,05 Kachel (23 px) anheben
    const seite = dok.profile.seite;
    let top = 0;
    seite.knoten.forEach((k, i) => {
      if (k.p.y > seite.knoten[top]!.p.y) top = i;
    });
    const knoten = seite.knoten.map((k, i) => (i === top ? { ...k, p: { x: k.p.x, y: k.p.y + 0.05 } } : k));
    const dokNeu: Dokument = { ...dok, profile: { ...dok.profile, seite: { ...seite, knoten } as typeof seite } };
    let best = Infinity;
    let r = seiteZiehen(abl, dokNeu);
    for (let i = 0; i < 5; i++) {
      r = seiteZiehen(abl, dokNeu);
      best = Math.min(best, r.zugZeit.loeser + r.zugZeit.matrix);
    }
    const naht: V2[] = Array.from(r.naht.fein, (i) => ({ x: r.fein[3 * i]!, y: r.fein[3 * i + 1]! }));
    const hin = abstandZuZug(naht, profilZug(dokNeu));
    const her = abstandZuZug(profilZug(dokNeu), naht);
    console.log(`Zugschritt Rex (${ringe} Ringe): Kurve→Naht max ${(her.max * PX).toFixed(2)} px bei (${her.ort.x.toFixed(3)}, ${her.ort.y.toFixed(3)}) nahe ${naechsterKnoten(dokNeu, her.ort)}; größte Naht→Kurve bei ${naechsterKnoten(dokNeu, hin.ort)};  Leiter ${r.zugZeit.leiter.toFixed(1)} ms, Ziele ${r.zugZeit.ziele.toFixed(1)} ms, Löser ${r.zugZeit.loeser.toFixed(2)} ms, Matrix ${r.zugZeit.matrix.toFixed(2)} ms (bestes Löser+Matrix ${best.toFixed(2)} ms); Naht→neue Kurve max ${(hin.max * PX).toFixed(2)} px`);
    expect(best).toBeLessThan(16 * ZEIT);
    // Während der Geste: Naht ≈ 1,6–2 px neben der neuen Kurve an einem 23-px-Sprung eines einzelnen Knotens (die
    // Ringdichte stammt von vor dem Sprung). Beim Loslassen wird neu abgeleitet (Ringe nach Krümmung): dann ≤ 0,5 px.
    expect(hin.max * PX).toBeLessThan(2.2);
    const neu = ableiten(dokNeu, { ringe });
    const nahtNeu: V2[] = Array.from(neu.naht.fein, (i) => ({ x: neu.fein[3 * i]!, y: neu.fein[3 * i + 1]! }));
    const hinNeu = abstandZuZug(nahtNeu, profilZug(dokNeu));
    console.log(`  nach dem Loslassen (Ableitung ${neu.zeiten.gesamt.toFixed(0)} ms): Naht→Kurve max ${(hinNeu.max * PX).toFixed(2)} px`);
    // Stand 13.10. nachts: 0,75 px (24 Ringe), 0,37 px (36 Ringe); die scharfe Beule verlangt die Verdichtung
    expect(hinNeu.max * PX).toBeLessThan(ringe >= 36 ? 0.6 : 1.0);
  });

  it('Sauberkeit (Plan 3.2): alle Prüfwesen ohne Maul 0 Durchdringungen (Stufe 2)', () => {
    const zeilen: string[] = [];
    for (const [name, json] of [['kugel', null], ['rex', rexRoh], ['langhals', langhalsRoh], ['ueberhang', ueberhangRoh], ['tiger', tigerRoh]] as const) {
      const dok = json ? vorlageDokument(json as unknown as Vorlage, 'zu', name) : neuesDokument('kugel');
      const abl = ableiten(dok, { stufen: 2 });
      const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
      const punkte: V3[] = [];
      for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
      const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map<string, number>() }, 1e-4);
      zeilen.push(`${name}: ${d.paare}`);
      expect(d.paare, name).toBe(0);
    }
    console.log(`Sauberkeit ohne Maul: ${zeilen.join(', ')} (Langhals vor der entfächerten Leiter: 94 am Schwanz)`);
  });
});
