// Der Stand eines Wesens als Datei (10.11.2026): packen und entpacken gibt denselben Stand Bit für Bit; eine Datei, die keine ist,
// abgeschnitten ist oder nicht stimmig, wird mit einem lesbaren Grund abgewiesen (das Fenster behält dann, was es hat).
import { type Haut, type Loop, griffeAnlegen, hautAus, kreuzungenZwischen, loopAusSchnitt, loopEinsetzen, mittlereKante, punktEinfuegen, rundAusSeite } from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import { type WesenStand, auskunft, entpacken, packen, pruefen, zusammen } from './ablage';
import { hautAusFlach, hautFlach } from './verfeinern';

function kugelMitLoops(dreiecke: number): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (const f of kreuzungenZwischen(loops[0]!, loops[0]!.ruhe, loops[1]!, loops[1]!.ruhe, tol)) {
    punktEinfuegen(loops[0]!, f.sa, k);
    punktEinfuegen(loops[1]!, f.sb, k);
    k++;
  }
  for (const l of loops) griffeAnlegen(l);
  return { h, loops };
}

function standAus(dreiecke = 1200): WesenStand {
  const { h, loops } = kugelMitLoops(dreiecke);
  loops[0]!.kante = true;
  // die Kante trägt ihren Winkel selbst (13.11.): Die Angabe am Punkt bleibt beim Sichern und Laden
  loops[0]!.punkte[0]!.knick = 95;
  if (loops[0]!.punkte[1]) loops[0]!.punkte[1]!.knick = 72.5;
  // das Maul aus einer Linie (14.11.): der Winkel der gerechneten Lage am Loop bleibt beim Sichern und Laden
  loops[0]!.maulLinie = 20;
  loops[0]!.maulGeformt = true;
  // eine Abzweigung (14.11.): welches Ende an einer anderen Linie hängt, bleibt beim Sichern und Laden
  loops[0]!.haengt = [true, false];
  // ein paar Zahlen, die als Text leicht leiden: sehr klein, negativ null, lange Brüche
  h.pos[0] = 1 / 3;
  h.pos[1] = -0;
  h.pos[2] = 5e-324;
  return {
    mk: mittlereKante(h),
    haut: hautFlach(h),
    loops,
    ids: [3, 5],
    maul: { id: 2 },
    pose: { kiefer: 30, schaedel: 12.5, delta: Float64Array.from({ length: 3 * h.n }, (_, i) => Math.sin(i)) },
    grund: null,
    ruhe: { setzen: true, nurInRuhe: false, verdichten: true, ziele: [Float64Array.from({ length: 3 * loops[0]!.proben.length }, (_, i) => i / 7), null] },
    sicht: { seite: { cx: 12, cy: -3, zoom: 3 }, front: { cx: 0, cy: 0, zoom: 1 }, top: { cx: 0, cy: 0, zoom: 1 } },
    zeit: '2026-11-10T17:30:00.000Z',
    quelle: 'kurven.html?gewichte=geometrie',
  };
}
const bits = (f: Float64Array): number[] => Array.from(new Uint32Array(f.buffer, f.byteOffset, 2 * f.length));

describe('Wesen als Datei', () => {
  it('packen und entpacken gibt denselben Stand, jede Zahl Bit für Bit', () => {
    const st = standAus();
    const datei = zusammen(packen(st));
    const zurueck = entpacken(datei);
    expect(zurueck.mk).toBe(st.mk);
    expect(zurueck.ids).toEqual(st.ids);
    expect(zurueck.maul).toEqual(st.maul);
    expect(zurueck.ruhe).toEqual(st.ruhe);
    expect(zurueck.ruhe!.ziele![0]).toBeInstanceOf(Float64Array);
    expect(bits(zurueck.ruhe!.ziele![0]!)).toEqual(bits(st.ruhe!.ziele![0]!));
    expect(zurueck.ruhe!.ziele![1]).toBeNull();
    expect(zurueck.sicht).toEqual(st.sicht);
    expect(zurueck.zeit).toBe(st.zeit);
    expect(zurueck.grund).toBeNull();
    // die Felder: gleiche Art, gleiche Bits (auch −0 und die kleinste Zahl)
    expect(zurueck.haut.pos).toBeInstanceOf(Float64Array);
    expect(bits(zurueck.haut.pos)).toEqual(bits(st.haut.pos));
    expect(Object.is(zurueck.haut.pos[1], -0)).toBe(true);
    expect(zurueck.haut.tri).toBeInstanceOf(Uint32Array);
    expect(Array.from(zurueck.haut.tri)).toEqual(Array.from(st.haut.tri));
    expect(Array.from(zurueck.haut.spiegel)).toEqual(Array.from(st.haut.spiegel));
    expect(Array.from(zurueck.haut.nbStart)).toEqual(Array.from(st.haut.nbStart));
    expect(Array.from(zurueck.haut.nb)).toEqual(Array.from(st.haut.nb));
    expect(bits(zurueck.pose.delta!)).toEqual(bits(st.pose.delta!));
    // die Loops: Proben, Stellen, Punkte samt Griffen und Schaltern
    expect(zurueck.loops.length).toBe(st.loops.length);
    zurueck.loops.forEach((l, i) => {
      const o = st.loops[i]!;
      expect(l.id).toBe(o.id);
      expect(l.art).toBe(o.art);
      expect(l.kante).toBe(o.kante);
      expect(l.pfad).toBe(o.pfad);
      expect(l.laenge).toBe(o.laenge);
      expect(l.proben).toEqual(o.proben);
      expect(bits(l.s)).toEqual(bits(o.s));
      expect(bits(l.ruhe)).toEqual(bits(o.ruhe));
      expect(l.punkte).toEqual(o.punkte);
    });
    // und die Haut daraus ist dieselbe Haut
    const h = hautAusFlach(zurueck.haut);
    const h0 = hautAusFlach(st.haut);
    expect(h.nachbarn).toEqual(h0.nachbarn);
    expect(auskunft(zurueck)).toContain(`${st.haut.n} Punkte im Netz, 2 Loops`);
  });

  it('die Felder liegen an durch 8 teilbaren Stellen, und die Datei ist kaum größer als ihre Felder', () => {
    const st = standAus();
    const teile = packen(st);
    const datei = zusammen(teile);
    const kopfLaenge = new DataView(datei.buffer).getUint32(6, true);
    const kopf = JSON.parse(new TextDecoder().decode(datei.subarray(10, 10 + kopfLaenge))) as { felder: { ab: number }[] };
    expect(kopf.felder.length).toBeGreaterThan(6);
    for (const f of kopf.felder) expect(f.ab % 8).toBe(0);
    const roh = st.haut.pos.byteLength + st.haut.tri.byteLength + st.haut.spiegel.byteLength + st.haut.nb.byteLength + st.haut.nbStart.byteLength + st.pose.delta!.byteLength;
    expect(datei.length).toBeLessThan(1.6 * roh);
  });

  it('in der Pose kommt die Grundform mit', () => {
    const st = standAus();
    const g = kugelMitLoops(1200);
    st.grund = { haut: hautFlach(g.h), loops: g.loops };
    // (gleiches Netz wie die Pose: hier dieselbe Kugel)
    st.haut = hautFlach(g.h);
    st.loops = g.loops;
    st.pose.delta = new Float64Array(3 * g.h.n);
    const zurueck = entpacken(zusammen(packen(st)));
    expect(zurueck.grund).not.toBeNull();
    expect(bits(zurueck.grund!.haut.pos)).toEqual(bits(st.grund.haut.pos));
    expect(zurueck.grund!.loops.length).toBe(2);
  });

  it('weist ab, was keine Wesen-Datei ist oder nicht stimmig', () => {
    const datei = zusammen(packen(standAus()));
    expect(() => entpacken(new TextEncoder().encode('{"kein":"wesen"}'))).toThrow(/keine Wesen-Datei/);
    expect(() => entpacken(datei.subarray(0, 200))).toThrow(/abgeschnitten/);
    expect(() => entpacken(datei.subarray(0, datei.length - 4096))).toThrow(/abgeschnitten/);
    // ein Dreieck zeigt auf einen Punkt, den es nicht gibt
    const kaputt = standAus();
    kaputt.haut.tri[0] = kaputt.haut.n + 7;
    expect(pruefen(kaputt)).toMatch(/Dreieck/);
    expect(() => entpacken(zusammen(packen(kaputt)))).toThrow(/nicht stimmig/);
    // nicht endliche Lagen
    const unendlich = standAus();
    unendlich.haut.pos[5] = Infinity;
    expect(pruefen(unendlich)).toMatch(/nicht endlich/);
    // ein Loop liegt auf einem Punkt, den es nicht gibt
    const loopKaputt = standAus();
    loopKaputt.loops[0]!.proben[0]!.ecken[0] = loopKaputt.haut.n;
    expect(pruefen(loopKaputt)).toMatch(/Loop/);
    expect(pruefen(standAus())).toBeNull();
  });
});
