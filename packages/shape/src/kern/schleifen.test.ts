// Plan 20.10., V6 „Loops (⌘R)“: Ein Loop sind verknüpfte Knoten (Rücken und Bauch in der Seite, einer im Top) plus ein
// eigener Käfigring durch Rücken- und Bauchknoten. Gemessen wie der Editor baut (Florians Ablauf aus der Startkugel).
// Vorab: Ein formneutral eingefügter Knoten (Stift, Kopplung, Loop) darf den Körper gar nicht ändern.
import { describe, expect, it } from 'vitest';
import type { Dokument, KaefigDelta } from '../dokument';
import { einfuegen, naechsterAufProfil, pfadAbtasten, type Profil, segmente } from '../profil';
import { kernLeiter, schleifenStationen, ziehen } from './ableiten';
import { abstandFlaeche, editorBauen, editorPlan, imAblauf } from './pruefen/extremMessung';
import { extremKoerper } from './pruefen/extremreihe';
import { feinesNetz } from './pruefstand';
import { punktMitRing, ringGeruest, ringSteht, schleifeEinfuegen, schleifeLoeschen, schleifenEinfuegen, schleifenOrt, schleifenOrtBei } from './schleifen';
import { spantEinfuegen } from '../spanten';
import { faltenNachZonenRoehre } from './pruefen/zonen';

const PX = 461;
const HEUTE = editorPlan('roehre');
const HUELLE = { ...HEUTE, umrisseExakt: true };

/** größter Abstand (px) gleich nummerierter feiner Punkte zweier Bauten derselben Topologie */
function punktAbstand(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!, a[i + 2]! - b[i + 2]!));
  return m * PX;
}

/** Florians Ablauf: Startkugel eingefroren, dann die Umrisse des Prüfkörpers. */
function ablauf(name: string, plan: typeof HEUTE) {
  return editorBauen(imAblauf(extremKoerper(name).dok(), 'roehre', 'kugel'), plan);
}

/** Knoten formneutral (de Casteljau) in Seite oder Top setzen (die Front teilt ihre Punktstruktur mit den Spanten). */
function mitKnoten(dok: Dokument, ansicht: 'seite' | 'top', segment: number, t: number): Dokument {
  return { ...dok, profile: { ...dok.profile, [ansicht]: einfuegen(dok.profile[ansicht], segment, t).profil } };
}

describe('Formneutral eingefügte Knoten ändern den Körper nicht', () => {
  // vorher: Langhals 1,8 px (die eingefrorenen Enden der Wirbelsäule galten nur bei gleicher Knotenzahl und wurden neu
  // gesucht; an der runden Spitze kippte die Wahl der vordersten Probe), Tigerkopf 1,2 px (Ecke und Spant an Ring 0
  // sprangen beim Nachführen auf Ring 1, zwei Ringe lagen aufeinander), Vase 3,4 px (Knoten im Top: ein Punkt rückte über
  // die harte Schwelle der Breitenpunkte). Rest unter einem halben Pixel (Abtastung der Profile je Segment).
  for (const [name, plan, ansicht, segmente] of [
    ['langhals', HUELLE, 'seite', [2, 8]],
    ['tigerkopf', HUELLE, 'seite', [1, 8]],
    ['tigerkopf', HEUTE, 'seite', [8]],
    ['robbe', HUELLE, 'seite', [6]],
    ['vase', HUELLE, 'top', [0, 1]],
    ['kegel', HUELLE, 'top', [1, 2]],
  ] as const) {
    it(`${name} (${plan === HEUTE ? 'heute' : 'Querschnitt aus der Hülle'}): Knoten in ${ansicht === 'seite' ? 'der Seite' : 'dem Top'}, Segment ${segmente.join(', ')}`, () => {
      const bau = ablauf(name, plan);
      for (const s of segmente) {
        const bau2 = editorBauen(mitKnoten(bau.dok, ansicht, s, 0.37), plan, bau.stand);
        expect(punktAbstand(bau.stand.abl.fein, bau2.stand.abl.fein), `Segment ${s}`).toBeLessThanOrEqual(0.5);
      }
    }, 90_000);
  }
});

/** größter Abstand (Profil-Einheiten) der Kurve `neu` von der Kurve `alt` (dichte Proben, nächster Punkt) */
function kurvenAbstand(alt: Profil, neu: Profil): number {
  let m = 0;
  for (const p of pfadAbtasten(segmente(neu), 64)) m = Math.max(m, naechsterAufProfil(alt, p)!.abstand);
  return m;
}

/** Grenzlagen der Käfigpunkte vorher (p) gegen nachher (derselbe Punkt nach dem Einfügen) außerhalb ±3 Ringe um den Loop. */
function fernAenderung(alt: Float64Array, neu: Float64Array, R: number, N: number, ring: number): number {
  let m = 0;
  for (let p = 0; p < R * N; p++) {
    const r = Math.floor(p / N);
    if (r >= ring - 3 && r <= ring + 2) continue;
    const q = punktMitRing(p, R, N, ring);
    m = Math.max(m, Math.hypot(alt[3 * p]! - neu[3 * q]!, alt[3 * p + 1]! - neu[3 * q + 1]!, alt[3 * p + 2]! - neu[3 * q + 2]!));
  }
  return m * PX;
}

/** größte Hautänderung (px): feine Punkte des neuen Körpers gegen die Fläche des alten (jeder zweite Punkt) */
function hautAenderung(alt: ReturnType<typeof ablauf>, neu: ReturnType<typeof ablauf>): number {
  const n0 = feinesNetz(alt.stand.abl);
  const n2 = feinesNetz(neu.stand.abl);
  let m = 0;
  for (let i = 0; i < n2.punkte.length; i += 2) m = Math.max(m, abstandFlaeche(n2.punkte[i]!, n0.punkte, n0.flaechen) * PX);
  return m;
}

describe('V6 Loops im Kern: ein Ring je Loop, Knoten formneutral', () => {
  it('Einfügen: ein Ring mehr, Rücken- und Bauchknoten in der Seite und ein Knoten im Top mit Kennung; die Umrisse bleiben dieselben Kurven', () => {
    const bau = ablauf('kugel', HUELLE);
    const ins = schleifeEinfuegen(bau.dok, schleifenOrtBei(bau.stand.abl, 0.4)!)!;
    expect(ins.dok.profile.seite.knoten.filter((k) => k.schleife === ins.id)).toHaveLength(2);
    expect(ins.dok.profile.top.knoten.filter((k) => k.schleife === ins.id)).toHaveLength(1);
    expect(kurvenAbstand(bau.dok.profile.seite, ins.dok.profile.seite)).toBeLessThanOrEqual(1e-9);
    expect(kurvenAbstand(bau.dok.profile.top, ins.dok.profile.top)).toBeLessThanOrEqual(1e-9);
    const bau2 = editorBauen(ins.dok, HUELLE, bau.stand);
    expect(bau2.stand.abl.vorlage.R).toBe(bau.stand.abl.vorlage.R + 1);
    expect(bau2.stand.abl.schleifenRinge).toEqual([{ id: ins.id, ring: schleifenOrtBei(bau.stand.abl, 0.4)!.ring!.ring }]);
  }, 60_000);

  // vorher änderte ein Loop die Vorlagen der übrigen Ringe: „Fülle wo nötig“, Breitenlinie, Reihenplan und „Umrisse berühren“
  // entschieden über alle Ringe und liefen nach Ringnummern aus (Robbe 4,2 px, Vase bis 3 px weit vom Loop)
  for (const [plan, name] of [
    [HEUTE, 'heute'],
    [HUELLE, 'Querschnitt aus der Hülle'],
  ] as const) {
    it(`Einfügen (${name}) ändert nur die Umgebung des Loops: Käfiglagen weiter als drei Ringe ≤ 0,25 px; Kugel und Ei überall ≤ 0,25 px`, () => {
      for (const [koerper, f] of [
        ['kugel', 0.5],
        ['ei', 0.3],
        ['langhals', 0.3],
        ['robbe', 0.5],
        ['rex', 0.3],
        ['vase', 0.5],
        ['tigerkopf', 0.5],
      ] as const) {
        const bau = ablauf(koerper, plan);
        const ort = schleifenOrtBei(bau.stand.abl, f)!;
        const bau2 = editorBauen(schleifeEinfuegen(bau.dok, ort)!.dok, plan, bau.stand);
        const { R, N } = bau.stand.abl.vorlage;
        expect(fernAenderung(bau.stand.abl.fein, bau2.stand.abl.fein, R, N, ort.ring!.ring), koerper).toBeLessThanOrEqual(0.25);
        if (koerper === 'kugel' || koerper === 'ei') expect(hautAenderung(bau, bau2), koerper).toBeLessThanOrEqual(0.25);
      }
    }, 180_000);
  }

  it('Einfügen und Löschen stellen das Dokument wieder her (Profile, Liste, Pinsel-Deltas)', () => {
    const bau = ablauf('robbe', HUELLE);
    const ort = schleifenOrtBei(bau.stand.abl, 0.45)!;
    const k = ort.ring!.ring;
    const N = ort.ring!.N;
    const deltas: KaefigDelta[] = [
      { punkt: (k - 1) * N + 3, d: [0.01, 0, 0.002] },
      { punkt: k * N + 3, d: [0.02, 0.001, 0] },
      { punkt: (k + 2) * N + 5, d: [0, 0.003, 0.004] },
      { punkt: ort.ring!.R * N + 7, d: [0.001, 0.001, 0.001] },
    ];
    const dok: Dokument = { ...bau.dok, kaefig: { ...bau.dok.kaefig!, deltas } };
    const ins = schleifeEinfuegen(dok, ort)!;
    const zurueck = schleifeLoeschen(ins.dok, ins.id, { ...ort.ring!, R: ort.ring!.R + 1 });
    const runden = (d: unknown) => JSON.stringify(d, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
    expect(runden(zurueck.profile)).toBe(runden(dok.profile));
    expect(zurueck.schleifen).toBeUndefined();
    expect(runden(zurueck.kaefig!.deltas)).toBe(runden(deltas));
  }, 60_000);

  it('Pinsel- und Posen-Deltas, Bezugs-Käfig und Augen rücken topologisch mit; der neue Ring bekommt das Mittel seiner Nachbarn', () => {
    const bau = ablauf('kugel', HUELLE);
    const ort = schleifenOrt(bau.stand.abl, 8, 0.5)!;
    const { R, N } = ort.ring!;
    const n = bau.stand.abl.vorlage.kaefig.n;
    const deltas: KaefigDelta[] = [
      { punkt: 5 * N + 2, d: [1, 0, 0] },
      { punkt: 7 * N + 4, d: [0, 2, 0] },
      { punkt: 8 * N + 4, d: [0, 4, 0] },
      { punkt: 10 * N + 3, d: [0, 0, 3] },
    ];
    const bezug = Array.from({ length: 3 * n }, (_, i) => i);
    const dok: Dokument = {
      ...bau.dok,
      kaefig: { ...bau.dok.kaefig!, deltas },
      posen: [{ id: 'p', name: 'p', art: 'frei', form: deltas, bezug }],
      ausstattung: { ...bau.dok.ausstattung, augen: { ring: 12, j: 3, groesse: 0.05 } },
    };
    const ins = schleifeEinfuegen(dok, ort)!.dok;
    const erwartet = [
      { punkt: 5 * N + 2, d: [1, 0, 0] },
      { punkt: 7 * N + 4, d: [0, 2, 0] },
      { punkt: 8 * N + 4, d: [0, 3, 0] },
      { punkt: 9 * N + 4, d: [0, 4, 0] },
      { punkt: 11 * N + 3, d: [0, 0, 3] },
    ];
    expect(ins.kaefig!.deltas).toEqual(erwartet);
    expect(ins.posen[0]!.form).toEqual(erwartet);
    expect(ins.posen[0]!.bezug).toHaveLength(3 * (n + N));
    // Ring 8 neu = Mittel der alten Ringe 7 und 8; der alte Ring 8 steht jetzt bei 9
    expect(ins.posen[0]!.bezug![3 * (8 * N) + 1]).toBe((bezug[3 * (7 * N) + 1]! + bezug[3 * (8 * N) + 1]!) / 2);
    expect(ins.posen[0]!.bezug![3 * (9 * N)]).toBe(bezug[3 * (8 * N)]);
    expect(ins.ausstattung!.augen!.ring).toBe(13);
    expect(punktMitRing(R * N + 1, R, N, 8)).toBe((R + 1) * N + 1);
  }, 60_000);

  it('Drei Loops zwischen zwei Ringen: drei Ringe mehr, in der Reihenfolge ihrer Stellen', () => {
    const bau = ablauf('langhals', HEUTE);
    let dok = bau.dok;
    const abl = bau.stand.abl;
    for (let i = 1; i <= 3; i++) {
      const ort = schleifenOrt(abl, 10, i / 4)!;
      dok = schleifeEinfuegen(dok, { ...ort, ring: { ring: 10 + i - 1, R: abl.vorlage.R + i - 1, N: abl.vorlage.N } })!.dok;
    }
    const bau2 = editorBauen(dok, HEUTE, bau.stand);
    const sr = bau2.stand.abl.schleifenRinge!;
    expect(bau2.stand.abl.vorlage.R).toBe(abl.vorlage.R + 3);
    expect(sr.map((s) => s.ring)).toEqual([10, 11, 12]);
    expect(sr.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  }, 60_000);

  it('Im Zug folgt der Loop-Ring seinem Knoten (die Sprosse läuft durch den gezogenen Rückenknoten)', () => {
    const bau = ablauf('langhals', HUELLE);
    const ins = schleifeEinfuegen(bau.dok, schleifenOrtBei(bau.stand.abl, 0.5)!)!;
    const bau2 = editorBauen(ins.dok, HUELLE, bau.stand);
    const abl = bau2.stand.abl;
    const s = ins.dok.profile.seite;
    // Rückenknoten des Loops 3 px längs der Kurve (Griffrichtung) schieben
    const i = s.knoten.findIndex((k, q) => k.schleife === ins.id && q === s.knoten.findIndex((x) => x.schleife === ins.id));
    const k0 = s.knoten[i]!;
    const lg = Math.hypot(k0.aus.x, k0.aus.y);
    const knoten = s.knoten.map((k, q) => (q === i ? { ...k, p: { x: k.p.x + (3 / PX) * (k0.aus.x / lg), y: k.p.y + (3 / PX) * (k0.aus.y / lg) } } : k));
    const dokNeu: Dokument = { ...ins.dok, profile: { ...ins.dok.profile, seite: { ...s, knoten } } };
    const z = ziehen(abl, dokNeu);
    const lr = abl.schleifenRinge![0]!.ring;
    const st = schleifenStationen(dokNeu, kernLeiter(dokNeu))[0]!;
    expect(z.stationen[lr]!.a).toBeCloseTo(st.a, 12);
    expect(z.stationen[lr]!.b).toBeCloseTo(st.b, 12);
    expect(z.stationen[lr]!.a).not.toBeCloseTo(abl.stationen[lr]!.a, 6);
  }, 60_000);

  it('Breitenknoten dort, wo der Ring den Umriss berührt: liegender Ring im Top, stehender (Hals) in der Front und in allen Spanten', () => {
    const bau = ablauf('langhals', HEUTE);
    const abl = bau.stand.abl;
    // Bauch (liegend) und Hals (stehend)
    const liegend = schleifenOrt(abl, 20, 0.5)!;
    const stehend = schleifenOrt(abl, 10, 0.5)!;
    expect(ringSteht(liegend.o, liegend.u)).toBe(false);
    expect(ringSteht(stehend.o, stehend.u)).toBe(true);
    const a = schleifeEinfuegen(bau.dok, liegend)!;
    expect(a.dok.profile.top.knoten.filter((k) => k.schleife === a.id)).toHaveLength(1);
    expect(a.dok.profile.front.knoten.filter((k) => k.schleife === a.id)).toHaveLength(0);
    // mit einem Spant: die Front teilt ihre Punktstruktur mit ihm
    const sp = spantEinfuegen(bau.dok, 0.3).spanten;
    const dok: Dokument = { ...bau.dok, spanten: sp };
    const b = schleifeEinfuegen(dok, stehend)!;
    expect(b.dok.profile.front.knoten.filter((k) => k.schleife === b.id)).toHaveLength(1);
    expect(b.dok.profile.top.knoten.filter((k) => k.schleife === b.id)).toHaveLength(0);
    expect(b.dok.spanten![0]!.profil.knoten).toHaveLength(b.dok.profile.front.knoten.length);
    expect(kurvenAbstand(dok.profile.front, b.dok.profile.front)).toBeLessThanOrEqual(1e-9);
    expect(kurvenAbstand(dok.spanten![0]!.profil, b.dok.spanten![0]!.profil)).toBeLessThanOrEqual(1e-9);
    const zurueck = schleifeLoeschen(b.dok, b.id);
    const runden = (d: unknown) => JSON.stringify(d, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v));
    expect(runden(zurueck.profile)).toBe(runden(dok.profile));
    expect(runden(zurueck.spanten)).toBe(runden(dok.spanten));
  }, 60_000);

  // Plan V6, Tor „Verjüngen ohne Falte > 20°“: drei Loops am Hals, der mittlere × 0,7 (Sprosse um ihre Mitte, Breite in der
  // Front), die Nachbarn × 0,85 wie mit proportional. Vorher lag der Breitenknoten im Top — beim stehenden Hals zeigt die
  // Front die Breite, Front und Top wichen 9–10 px ab
  for (const [plan, name] of [
    [HEUTE, 'heute'],
    [HUELLE, 'Querschnitt aus der Hülle'],
  ] as const) {
    it(`Langhals verjüngen (${name}): Umrisse bleiben (Δ höchstens +0,5 px), keine Falte über 20°`, () => {
      const bau = ablauf('langhals', plan);
      const ins = schleifenEinfuegen(bau.dok, ringGeruest(bau.stand.abl), 12, 3, 0.5, true)!;
      const bau2 = editorBauen(ins.dok, plan, bau.stand);
      const skal = (d: Dokument, id: string, f: number): Dokument => {
        const sk = d.profile.seite.knoten.filter((x) => x.schleife === id);
        const m = { x: (sk[0]!.p.x + sk[1]!.p.x) / 2, y: (sk[0]!.p.y + sk[1]!.p.y) / 2 };
        const seite = { ...d.profile.seite, knoten: d.profile.seite.knoten.map((x) => (x.schleife === id ? { ...x, p: { x: m.x + (x.p.x - m.x) * f, y: m.y + (x.p.y - m.y) * f }, ein: { x: x.ein.x * f, y: x.ein.y * f }, aus: { x: x.aus.x * f, y: x.aus.y * f } } : x)) };
        const front = { ...d.profile.front, knoten: d.profile.front.knoten.map((x) => (x.schleife === id ? { ...x, p: { x: x.p.x * f, y: x.p.y }, ein: { x: x.ein.x * f, y: x.ein.y }, aus: { x: x.aus.x * f, y: x.aus.y } } : x)) };
        return { ...d, profile: { ...d.profile, seite, front } };
      };
      let d = skal(ins.dok, ins.ids[1]!, 0.7);
      d = skal(d, ins.ids[0]!, 0.85);
      d = skal(d, ins.ids[2]!, 0.85);
      expect(d.profile.front.knoten.filter((k) => k.schleife).length).toBe(3);
      const bau3 = editorBauen(d, plan, bau2.stand);
      const b2 = bau2.netz.info.blatt!;
      const b3 = bau3.netz.info.blatt!;
      for (const a of ['seite', 'front', 'top'] as const) expect(b3[a].max, a).toBeLessThanOrEqual(b2[a].max + 0.5);
      expect(faltenNachZonenRoehre(bau3.stand.abl).zonen.frei.max).toBeLessThanOrEqual(20);
    }, 90_000);
  }

  // Tor des Plans (V6), nicht erreicht — Register „Befunde aus V6“  // Tor des Plans (V6), nicht erreicht — Register „Befunde aus V6“: Ein Loop gibt Auflösung; wo der Körper zwischen zwei Ringen
  // von seiner Hülle abweicht (eingefrorene Ringverteilung der Startkugel), rückt die Haut am Loop zur Hülle hin
  it.fails('Tor: Einfügen formneutral (Haut ≤ 0,1 px; Langhals, Rex)', () => {
    for (const [koerper, f] of [
      ['langhals', 0.3],
      ['rex', 0.3],
    ] as const) {
      const bau = ablauf(koerper, HUELLE);
      const bau2 = editorBauen(schleifeEinfuegen(bau.dok, schleifenOrtBei(bau.stand.abl, f)!)!.dok, HUELLE, bau.stand);
      expect(hautAenderung(bau, bau2), koerper).toBeLessThanOrEqual(0.1);
    }
  }, 120_000);
});
