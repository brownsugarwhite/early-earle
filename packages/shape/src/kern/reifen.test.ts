// Phase 1 / M3: Reifen = Spanten als Käfigringe. Ein gezeichneter Spant rastet einen Ring auf seine Station; der Verlauf
// des Rings auf der Fläche ist eine geschlossene Kette feiner Punkte; Form und Sauberkeit bleiben.
import { describe, expect, it } from 'vitest';
import { spantEinfuegen, spantKasten } from '../spanten';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { selbstDurchdringungen } from '../versuch/pruefen';
import type { V3 } from '../versuch/catmullClark';
import { alleFlaechen } from '../kaefig/halbkanten';
import { ableiten, sprossenVon, kernLeiter } from './ableiten';
import { ableitenMitMaul, maulLinieVorlage, maulOptionenVorlage, maulPose } from './maul';
import { feinKette, ringSegmente } from './reifen';
import { wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };

describe('M3 Reifen', () => {
  const rex0 = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
  const s1 = spantEinfuegen(rex0, 0.3);
  const s2 = spantEinfuegen({ ...rex0, spanten: s1.spanten }, 0.62);
  const rex = { ...rex0, spanten: s2.spanten };

  it('zwei Spanten (0,3 und 0,62) rasten je einen Ring auf ihre Station; die Ringmitte liegt auf dem x des Spants', () => {
    const abl = ableiten(rex);
    expect(abl.reifen.length).toBe(2);
    const l = kernLeiter(rex);
    const spr = sprossenVon(l, abl.stationen);
    const laenge = l.ruecken[l.ruecken.length - 1]!.x - l.ruecken[0]!.x;
    for (const r of abl.reifen) {
      const sp = rex.spanten![r.spant]!;
      const xs = spantKasten(rex, sp.f).x * rex.skalierung;
      const s = spr[r.ring]!;
      const dx = Math.abs((s.o.x + s.u.x) / 2 - xs);
      console.log(`Reifen Spant ${r.spant} (f ${sp.f}) → Ring ${r.ring}, Abstand zur Spant-Stelle ${((dx / Math.abs(laenge)) * 100).toFixed(2)} % der Länge`);
      expect(dx / Math.abs(laenge)).toBeLessThan(0.01);
    }
    expect(abl.reifen[0]!.ring).toBeLessThan(abl.reifen[1]!.ring);
    // Ringe bleiben geordnet (Stationen steigen)
    const f = abl.stationen.map((st) => st.a);
    for (let i = 1; i < f.length; i++) expect(f[i]!).toBeGreaterThan(f[i - 1]!);
  });

  it('Verlauf eines Reifens: geschlossene Kette aus N·2^L Segmenten, alle Kanten vorhanden', () => {
    const abl = ableiten(rex);
    const { N } = abl.vorlage;
    const L = abl.unterteilung.stufen.length;
    const seg = ringSegmente(abl.unterteilung, abl.kaefig, abl.reifen[0]!.ring, N);
    expect(seg.length).toBe(2 * N * 2 ** L);
    // geschlossen: das Ende jedes Segments ist der Anfang des nächsten, das letzte endet am ersten
    for (let i = 0; i + 2 < seg.length; i += 2) expect(seg[i + 1]).toBe(seg[i + 2]);
    expect(seg[seg.length - 1]).toBe(seg[0]);
    // Kette einer Käfigkante beginnt und endet an den Punktpunkten (Index wie Eltern)
    const a = abl.reifen[0]!.ring * N;
    const kette = feinKette(abl.unterteilung, abl.kaefig, a, a + 1);
    expect(kette[0]).toBe(a);
    expect(kette[kette.length - 1]).toBe(a + 1);
    expect(kette.length).toBe(2 ** L + 1);
  });

  it('wesenBauen liefert Reifen-Daten: Ringlagen, Verlauf je Reifen, Perlen = Ringpunkte der Spant-Knoten', () => {
    const { netz } = wesenBauen(rex, { earle: false }, null);
    const rf = netz.reifen!;
    expect(rf.liste.length).toBe(2);
    const { R, N } = netz.treffer!.vorlage;
    expect(rf.ringLagen.length).toBe(3 * R * N);
    expect(rf.verlaufStart.length).toBe(3);
    expect(rf.verlaufStart[2]).toBe(rf.verlauf.length);
    expect(rf.knoten[0]!.length).toBe(rex.spanten![0]!.profil.knoten.length);
    expect(rf.knoten[0]![0]).toBe(0);
    expect(rf.knoten[0]![rf.knoten[0]!.length - 1]).toBe(N / 2);
    // Perle liegt auf dem Verlauf ihres Reifens (Ringpunkt = Anfang eines Segments)
    const r0 = rf.liste[0]!;
    const j = rf.knoten[0]![1]!;
    const p = [rf.ringLagen[3 * (r0.ring * N + j)]!, rf.ringLagen[3 * (r0.ring * N + j) + 1]!, rf.ringLagen[3 * (r0.ring * N + j) + 2]!];
    let best = Infinity;
    for (let i = rf.verlaufStart[0]!; i < rf.verlaufStart[1]!; i += 3) best = Math.min(best, Math.hypot(rf.verlauf[i]! - p[0]!, rf.verlauf[i + 1]! - p[1]!, rf.verlauf[i + 2]! - p[2]!));
    expect(best).toBeLessThan(1e-6);
    // ohne Spanten keine Reifen
    expect(wesenBauen(rex0, { earle: false }, null).netz.reifen).toBeNull();
  });

  it('Spanten einfügen ist formneutral (Naht ≤ 1,5 px) und sauber (Rex mit Maul vorn und zwei Reifen: 0 Durchdringungen bei 0/50/100 %)', () => {
    const ohne = wesenBauen(rex0, { earle: false }, null).netz;
    const mit = wesenBauen(rex, { earle: false }, null).netz;
    expect(mit.info.nahtMax).toBeLessThan(1.5);
    console.log(`Naht ohne Spanten ${ohne.info.nahtMax.toFixed(2)} px, mit zwei Spanten ${mit.info.nahtMax.toFixed(2)} px`);
    const m = wesenBauen(rex, { earle: false, maul: 'vorn', gewichte: { fressen: 0.5 } }, null).netz;
    expect(m.reifen).not.toBeNull();
    const abl = ableitenMitMaul(rex, maulLinieVorlage(rex, 'vorn'), { stufen: 2 }, maulOptionenVorlage('vorn'));
    expect(abl.reifen.length).toBe(2);
    const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
    const flaechen = alleFlaechen(letzte);
    for (const oeffnung of [0, 0.5, 1]) {
      const fein = maulPose(abl, oeffnung).fein;
      const punkte: V3[] = [];
      for (let i = 0; i < fein.length / 3; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
      const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map<string, number>() }, 1e-4);
      expect(d.paare, `Öffnung ${oeffnung}`).toBe(0);
    }
  });
});
