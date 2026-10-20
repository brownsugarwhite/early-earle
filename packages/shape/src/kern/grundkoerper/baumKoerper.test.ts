// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.1/S7.2: der Baum als Körper im Wesen-Bau — genauer Bau und schneller Zug.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { teilSatzDokument } from '../pruefen/teilsatz';
import { wesenBauen } from '../wesen';

const PX = 461;

/** Einen Knoten der Seitenlinie (mit Griffen) verschieben. */
function knotenZiehen(dok: Dokument, k: number, dx: number, dy: number): Dokument {
  const kn = dok.profile.seite.knoten.map((q, i) => {
    if (i !== k) return q;
    const v = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy });
    return { ...q, p: v(q.p), ein: v(q.ein), aus: v(q.aus) };
  });
  return { ...dok, profile: { ...dok.profile, seite: { ...dok.profile.seite, knoten: kn } } };
}

describe('S7 Baum als Körper', () => {
  it('Ente: „Teile“ baut den Baum mit Flügel als Körper, Röhre bleibt ohne Schalter', () => {
    const dok = teilSatzDokument('ente');
    const roehre = wesenBauen(dok, { earle: true }, null).netz;
    expect(roehre.koerperBaum).toBeNull();
    const baum = wesenBauen(dok, { earle: true, koerper: 'teile' }, null).netz;
    expect(baum.koerperBaum?.seiten).toBe(1);
    expect(baum.positionen.length).not.toBe(roehre.positionen.length);
    expect(baum.deskriptoren?.length).toBe((baum.positionen.length / 3) * 16);
    expect(baum.info.blatt!.top.max).toBeLessThan(3);
  });

  it('schneller Zug: der Baum folgt einem Seitenknoten, nah am genauen Neubau', () => {
    const dok = teilSatzDokument('ente');
    const plan = { earle: true, koerper: 'teile' as const };
    const erst = wesenBauen(dok, plan, null);
    // ein Knoten am Rücken um 6 px nach oben
    const kn = dok.profile.seite.knoten;
    let k = 0;
    for (let i = 0; i < kn.length; i++) if (kn[i]!.p.y > kn[k]!.p.y && Math.abs(kn[i]!.p.x) < 0.25) k = i;
    const dok2 = knotenZiehen(dok, k, 0, 6 / PX / dok.skalierung);
    const zug = wesenBauen(dok2, plan, erst.stand, true).netz;
    expect(zug.koerperBaum).not.toBeNull();
    expect(zug.positionen.length).toBe(erst.netz.positionen.length);
    // höchster Punkt nahe am Knoten bewegt sich mit
    const hoechst = (p: Float32Array) => {
      let y = -Infinity;
      for (let i = 1; i < p.length; i += 3) y = Math.max(y, p[i]!);
      return y;
    };
    const neu = wesenBauen(dok2, plan, null).netz;
    expect(Math.abs(hoechst(zug.positionen) - hoechst(neu.positionen)) * PX).toBeLessThan(2);
    expect((hoechst(zug.positionen) - hoechst(erst.netz.positionen)) * PX).toBeGreaterThan(2);
  });
});

describe('Plan 20.10., V0: Baum nach dem Zurückschreiben der Teile', () => {
  it('wie im Editor: nach einer Geste schreibt er die eingefrorenen Teile zurück → der nächste Bau nimmt denselben Baum', () => {
    for (const name of ['giraffe-bauch', 'ente']) {
      const plan = { earle: true, koerper: 'teile' as const };
      /** gemeldeten Stand ins Dokument schreiben (wie `kernBau`) */
      const mitStand = (d: Dokument, st: NonNullable<ReturnType<typeof wesenBauen>['netz']['info']['stationen']>): Dokument => ({ ...d, kaefig: { ...(d.kaefig ?? { deltas: [] }), stationen: st } });
      // erster Bau, Ringe eingefroren (wie beim Laden), dann eine Geste: Rückenknoten 8 px hoch
      const dok0 = teilSatzDokument(name);
      const b0 = wesenBauen(dok0, plan, null);
      const dok1 = mitStand(dok0, b0.netz.info.stationen!);
      const b1 = wesenBauen(dok1, plan, b0.stand);
      const kn = dok1.profile.seite.knoten;
      let k = 0;
      for (let i = 0; i < kn.length; i++) if (kn[i]!.p.y > kn[k]!.p.y) k = i;
      const dok2 = knotenZiehen(mitStand(dok1, b1.netz.info.stationen!), k, 0, 8 / PX / dok1.skalierung);
      const b2 = wesenBauen(dok2, plan, b1.stand);
      expect(b2.stand.baum?.netz, `${name}: nach der Geste neu gebaut`).not.toBe(b1.stand.baum?.netz);
      // das Zurückschreiben ändert nur die eingefrorenen Teile → derselbe Baum, dasselbe Netz, derselbe gemeldete Stand
      const dok3 = mitStand(dok2, b2.netz.info.stationen!);
      const b3 = wesenBauen(dok3, plan, b2.stand);
      expect(b3.stand.baum?.netz === b2.stand.baum?.netz, `${name}: Baum wiederverwendet`).toBe(true);
      const p2 = b2.netz.positionen;
      const p3 = b3.netz.positionen;
      expect(p3.length === p2.length && p3.every((v, i) => v === p2[i]), `${name}: gleiches Netz`).toBe(true);
      expect(JSON.stringify(b3.netz.info.stationen) === JSON.stringify(b2.netz.info.stationen), `${name}: gleicher Stand`).toBe(true);
    }
  });
});

describe('Plan 20.10., V0: Auge per Klick auf dem Baum', () => {
  // Wächter: Die Code-Prüfung vom 20.10. vermutete, Augen per Klick gingen auf dem Baum nicht — gemessen: ein gesetzter Punkt
  // (wie `augeSetzen` ihn aus dem Treffer auf dem Baum rechnet) liegt dort, auch an der Flügelspitze
  it('ein gesetzter Punkt am Flügel liegt auf dem Baum dort', () => {
    const dok0 = teilSatzDokument('ente');
    const plan = { earle: true, koerper: 'teile' as const };
    const ohne = wesenBauen(dok0, plan, null).netz;
    // äußerster Punkt des Baums zur Seite (Flügelspitze), in Profil-Einheiten wie `augeSetzen`
    const P = ohne.positionen;
    let k = 0;
    for (let i = 2; i < P.length; i += 3) if (P[i]! > P[3 * k + 2]!) k = (i - 2) / 3;
    const sk = dok0.skalierung;
    const punkt: [number, number, number] = [P[3 * k]! / sk, P[3 * k + 1]! / sk, P[3 * k + 2]! / sk];
    // wie der Editor (`bauplanAus`): die Augen der Ausstattung kommen über den Bauplan
    const mit = wesenBauen(dok0, { ...plan, augen: { ring: 2, j: 2, groesse: 0.08, punkt } }, null).netz;
    const a = mit.augen.find((x) => x.pos[2] > 0)!;
    const d = Math.hypot(a.pos[0] - P[3 * k]!, a.pos[1] - P[3 * k + 1]!, a.pos[2] - P[3 * k + 2]!) * PX;
    expect(d).toBeLessThan(2);
  });
});

describe('S7.3 Pinsel auf dem Baum', () => {
  it('Ente: Delta mit Ruhelage beult die Flanke; falsche Nummer, gleiche Lage → derselbe Körper', () => {
    const dok = teilSatzDokument('ente');
    const plan = { earle: true, koerper: 'teile' as const };
    const ohne = wesenBauen(dok, plan, null).netz;
    const tr = ohne.treffer!;
    expect(tr).not.toBeNull();
    // Käfigpunkt rechts auf der Flanke, nahe der Körpermitte
    const n = tr.kaefig.n;
    let p = -1;
    let best = -Infinity;
    for (let q = 0; q < n; q++) {
      const z = tr.kaefig.xyz[3 * q + 2]!;
      const y = tr.kaefig.xyz[3 * q + 1]!;
      if (y < 0.05 || y > 0.2) continue;
      if (z > best) {
        best = z;
        p = q;
      }
    }
    expect(p).toBeGreaterThanOrEqual(0);
    const lage: [number, number, number] = [tr.kaefig.xyz[3 * p]!, tr.kaefig.xyz[3 * p + 1]!, tr.kaefig.xyz[3 * p + 2]!];
    const mit = (punkt: number) => wesenBauen({ ...dok, kaefig: { deltas: [], baumDeltas: [{ punkt, d: [0, 0, 12 / PX], lage }] } }, plan, null).netz;
    const a = mit(p);
    let maxD = 0;
    for (let i = 0; i < a.positionen.length; i++) maxD = Math.max(maxD, Math.abs(a.positionen[i]! - ohne.positionen[i]!));
    expect(maxD * PX).toBeGreaterThan(3);
    // falsche Nummer, gleiche Ruhelage: das Delta findet seinen Punkt über die Lage
    const b = mit(p === 0 ? 1 : p - 1);
    let diff = 0;
    for (let i = 0; i < a.positionen.length; i++) diff = Math.max(diff, Math.abs(a.positionen[i]! - b.positionen[i]!));
    expect(diff).toBeLessThan(1e-9);
  });

  it('Δ im Blatt-Titel misst den gepinselten Baum (Plan 20.10., V0; vorher den ungepinselten)', () => {
    const dok = teilSatzDokument('ente');
    const plan = { earle: true, koerper: 'teile' as const };
    const ohne = wesenBauen(dok, plan, null).netz;
    const tr = ohne.treffer!;
    // Käfigpunkt rechts auf der Flanke, nahe der Körpermitte, 40 px nach außen: die Flanke steht über den Top-Umriss hinaus
    let p = -1;
    let best = -Infinity;
    for (let q = 0; q < tr.kaefig.n; q++) {
      const y = tr.kaefig.xyz[3 * q + 1]!;
      if (y < 0.05 || y > 0.2) continue;
      if (tr.kaefig.xyz[3 * q + 2]! > best) {
        best = tr.kaefig.xyz[3 * q + 2]!;
        p = q;
      }
    }
    const lage: [number, number, number] = [tr.kaefig.xyz[3 * p]!, tr.kaefig.xyz[3 * p + 1]!, tr.kaefig.xyz[3 * p + 2]!];
    const mit = wesenBauen({ ...dok, kaefig: { deltas: [], baumDeltas: [{ punkt: p, d: [0, 0, 40 / PX], lage }] } }, plan, null).netz;
    expect(mit.info.blatt!.top.max).toBeGreaterThan(ohne.info.blatt!.top.max + 5);
  });
});

describe('S7.3 Posen auf dem Baum', () => {
  it('Ente: Form der Pose auf dem Baum wirkt mit ihrem Gewicht, Bearbeitungsdaten bei Gewicht 1', () => {
    const dok = teilSatzDokument('ente');
    const plan = { earle: true, koerper: 'teile' as const };
    const grund = wesenBauen(dok, plan, null).netz;
    const tr = grund.treffer!;
    // ein Punkt auf der Flanke, 15 px nach außen in der Pose „frei“
    let p = 0;
    for (let q = 0; q < tr.kaefig.n; q++) if (tr.kaefig.xyz[3 * q + 2]! > tr.kaefig.xyz[3 * p + 2]!) p = q;
    const lage: [number, number, number] = [tr.kaefig.xyz[3 * p]!, tr.kaefig.xyz[3 * p + 1]!, tr.kaefig.xyz[3 * p + 2]!];
    const dokP = { ...dok, posen: [{ id: 'p1', name: 'Pose', art: 'frei' as const, form: [], baum: { form: [{ punkt: p, d: [0, 0, 15 / PX] as [number, number, number], lage }] } }] };
    const voll = wesenBauen(dokP, { ...plan, gewichte: { p1: 1 } }, null).netz;
    const halb = wesenBauen(dokP, { ...plan, gewichte: { p1: 0.5 } }, null).netz;
    const aus = wesenBauen(dokP, plan, null).netz;
    const maxD = (a: Float32Array, b: Float32Array) => {
      let m = 0;
      for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
      return m * PX;
    };
    expect(maxD(aus.positionen, grund.positionen)).toBeLessThan(1e-6);
    const dv = maxD(voll.positionen, grund.positionen);
    const dh = maxD(halb.positionen, grund.positionen);
    expect(dv).toBeGreaterThan(3);
    expect(Math.abs(dh - dv / 2)).toBeLessThan(0.15 * dv);
    expect(voll.pose?.id).toBe('p1');
    expect(halb.pose).toBeNull();
  });
});
