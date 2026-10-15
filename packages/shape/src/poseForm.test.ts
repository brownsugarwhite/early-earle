// Fressen wie Editor (15.10.): Pose-Form als zweiter Satz Griffe — Sicht, Rückweg, Mitführen, gleiche Punktstruktur.
import { describe, expect, it } from 'vitest';
import { type Dokument, dokumentLesen, neuesDokument } from './dokument';
import { formAusGrundform, kurvenPunkt, poseDokument, poseHatForm, poseMitfuehren, poseVerwerfen, poseZurueck, strukturAenderung } from './poseForm';
import { type Profil, bewegeKnoten, einfuegen, loeschen, naechsterAufProfil, segmentAnzahl } from './profil';

/** größte Abweichung zweier Kurven gleicher Struktur, je Segment abgetastet */
function formAbstand(a: Profil, b: Profil): number {
  let m = 0;
  for (let s = 0; s < segmentAnzahl(a); s++) {
    for (let k = 0; k <= 16; k++) {
      const p = kurvenPunkt(a, s, k / 16);
      const q = kurvenPunkt(b, s, k / 16);
      m = Math.max(m, Math.hypot(p.x - q.x, p.y - q.y));
    }
  }
  return m;
}

/** Abstand einer Kurve zu einer anderen beliebiger Struktur: je Probe der nächste Punkt der anderen Kurve */
function kurvenAbstand(a: Profil, b: Profil): number {
  let m = 0;
  for (let s = 0; s < segmentAnzahl(a); s++) {
    for (let k = 0; k < 32; k++) {
      const p = kurvenPunkt(a, s, k / 32);
      m = Math.max(m, naechsterAufProfil(b, p)!.abstand);
    }
  }
  return m;
}

function mitPose(): Dokument {
  const d = neuesDokument('pose');
  return { ...d, posenForm: { fressen: formAusGrundform(d) } };
}

describe('Pose-Form (Fressen wie Editor)', () => {
  it('Sicht: Griffe aus der Pose, alles andere aus der Grundform; ohne Pose die Grundform selbst', () => {
    const d = neuesDokument('x');
    expect(poseDokument(d, 'fressen')).toBe(d);
    const top = bewegeKnoten(d.profile.seite, 1, { x: d.profile.seite.knoten[1]!.p.x, y: d.profile.seite.knoten[1]!.p.y + 0.05 });
    const mp: Dokument = { ...d, ausstattung: { gesicht: true }, posenForm: { fressen: { profile: { ...d.profile, seite: top } } } };
    const s = poseDokument(mp, 'fressen');
    expect(s.profile.seite).toBe(top);
    expect(s.profile.front).toBe(d.profile.front);
    expect(s.ausstattung).toEqual({ gesicht: true });
    expect(poseHatForm(mp, 'fressen')).toBe(true);
    expect(poseHatForm(poseVerwerfen(mp, 'fressen'), 'fressen')).toBe(false);
  });

  it('Rückweg: Umriss geändert → in die Pose; Ausstattung und Käfig → in die Grundform; ohne Griffänderung keine neue Pose', () => {
    const d = neuesDokument('x');
    const sicht = poseDokument(d, 'fressen');
    // nur Ausstattung geändert: keine Pose-Form entsteht
    const nurAus = poseZurueck(d, sicht, { ...sicht, ausstattung: { gesicht: true } }, 'fressen');
    expect(nurAus.posenForm).toBeUndefined();
    expect(nurAus.ausstattung).toEqual({ gesicht: true });
    // Umriss in der Sicht gezogen: Pose bekommt ihn, die Grundform bleibt
    const k = d.profile.front.knoten[1]!;
    const front = bewegeKnoten(d.profile.front, 1, { x: k.p.x + 0.04, y: k.p.y });
    const b = poseZurueck(d, sicht, { ...sicht, profile: { ...sicht.profile, front }, kaefig: { deltas: [] } }, 'fressen');
    expect(b.profile).toBe(d.profile);
    expect(b.posenForm!.fressen!.profile.front).toBe(front);
    expect(b.kaefig).toEqual({ deltas: [] });
    // die neue Sicht zeigt die Pose
    expect(poseDokument(b, 'fressen').profile.front).toBe(front);
    // Rundreise durchs Dokumentformat
    const json = JSON.parse(JSON.stringify(b));
    expect(dokumentLesen(json)).toEqual(json);
  });

  it('Punkt in der Pose eingefügt oder gelöscht → formtreu auch in der Grundform (gleiche Struktur, Grundform unverändert)', () => {
    const d = mitPose();
    const sicht = poseDokument(d, 'fressen');
    const ein = einfuegen(sicht.profile.seite, 1, 0.37);
    const b = poseZurueck(d, sicht, { ...sicht, profile: { ...sicht.profile, seite: ein.profil } }, 'fressen');
    expect(b.profile.seite.knoten.length).toBe(d.profile.seite.knoten.length + 1);
    expect(b.posenForm!.fressen!.profile.seite.knoten.length).toBe(b.profile.seite.knoten.length);
    expect(kurvenAbstand(b.profile.seite, d.profile.seite)).toBeLessThan(1e-9);
    // wieder löschen
    const sicht2 = poseDokument(b, 'fressen');
    const weg = loeschen(sicht2.profile.seite, ein.index);
    const c = poseZurueck(b, sicht2, { ...sicht2, profile: { ...sicht2.profile, seite: weg } }, 'fressen');
    expect(c.profile.seite.knoten.length).toBe(d.profile.seite.knoten.length);
    // Löschen passt die Nachbargriffe per kleinster Quadrate an: fast spurlos (≤ 0,05 px)
    expect(kurvenAbstand(c.profile.seite, d.profile.seite)).toBeLessThan(1e-4);
  });

  it('Grundform geändert → die Pose wandert um dieselbe Verschiebung mit (Knoten, Griffe), ihr eigener Unterschied bleibt', () => {
    const d = mitPose();
    // Pose: oberer Punkt der Seite 0,05 höher
    const ks = d.profile.seite.knoten[1]!;
    const pose = bewegeKnoten(d.profile.seite, 1, { x: ks.p.x, y: ks.p.y + 0.05 });
    const mp: Dokument = { ...d, posenForm: { fressen: { profile: { ...d.profile, seite: pose } } } };
    // Grundform: derselbe Punkt 0,02 nach hinten, ein anderer 0,03 nach unten
    let seite = bewegeKnoten(d.profile.seite, 1, { x: ks.p.x + 0.02, y: ks.p.y });
    const k3 = d.profile.seite.knoten[3]!;
    seite = bewegeKnoten(seite, 3, { x: k3.p.x, y: k3.p.y - 0.03 });
    const neu = poseMitfuehren(mp, { ...mp, profile: { ...mp.profile, seite } });
    const ps = neu.posenForm!.fressen!.profile.seite;
    expect(ps.knoten[1]!.p.x).toBeCloseTo(ks.p.x + 0.02, 12);
    expect(ps.knoten[1]!.p.y).toBeCloseTo(ks.p.y + 0.05, 12);
    expect(ps.knoten[3]!.p.y).toBeCloseTo(k3.p.y - 0.03, 12);
    // Unterschied Pose − Grundform bleibt je Knoten
    for (let i = 0; i < ps.knoten.length; i++) {
      expect(ps.knoten[i]!.p.y - seite.knoten[i]!.p.y).toBeCloseTo(pose.knoten[i]!.p.y - d.profile.seite.knoten[i]!.p.y, 12);
    }
  });

  it('Punkt in der Grundform eingefügt/gelöscht → formtreu in der Pose; ein Spant der Grundform kommt in die Pose', () => {
    const d = mitPose();
    const ks = d.profile.seite.knoten[1]!;
    const pose = bewegeKnoten(d.profile.seite, 1, { x: ks.p.x, y: ks.p.y + 0.05 });
    const mp: Dokument = { ...d, posenForm: { fressen: { profile: { ...d.profile, seite: pose } } } };
    const ein = einfuegen(d.profile.seite, 2, 0.5);
    const neu = poseMitfuehren(mp, { ...mp, profile: { ...mp.profile, seite: ein.profil } });
    const ps = neu.posenForm!.fressen!.profile.seite;
    expect(ps.knoten.length).toBe(pose.knoten.length + 1);
    // die Pose behält ihre Form (formtreu eingefügt)
    expect(kurvenAbstand(ps, pose)).toBeLessThan(1e-9);
    expect(strukturAenderung(pose, ps)).toMatchObject({ art: 'eingefuegt', index: ein.index });
    // gelöscht
    const weg = loeschen(ein.profil, ein.index);
    const neu2 = poseMitfuehren(neu, { ...neu, profile: { ...neu.profile, seite: weg } });
    expect(neu2.posenForm!.fressen!.profile.seite.knoten.length).toBe(pose.knoten.length);
    expect(formAbstand(neu2.posenForm!.fressen!.profile.seite, pose)).toBeLessThan(1e-4);
    // Spant hinzugefügt
    const spant = { f: 0.3, profil: d.profile.front };
    const neu3 = poseMitfuehren(neu2, { ...neu2, spanten: [spant] });
    expect(neu3.posenForm!.fressen!.spanten).toEqual([spant]);
  });
});
