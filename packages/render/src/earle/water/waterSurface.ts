import { abs, attribute, float, floor, fract, fwidth, hash, max, min, mix, positionLocal, positionView, select, sin, smoothstep, sqrt, step, vec2 } from 'three/tsl';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, patternTime, periodFade, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec2Node, type Vec3Node } from '../tsl';

export interface WaterMaterialOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Wasserzeile je Welt-Index. */
  waterRows: UniformArrayLike;
  /** Zusatz-Nebeldistanz (Schleier) je Welt-Index. */
  veil: (world: FloatNode) => FloatNode;
  warp: (p: Vec3Node) => Vec3Node;
}

/** Zufallsvektor 0..1 je Zelle. */
function hash2(c: Vec2Node): Vec2Node {
  return vec2(hash(c.x.mul(127.1).add(c.y.mul(311.7))), hash(c.x.mul(269.5).add(c.y.mul(183.3))));
}

/**
 * Voronoi-Zellen (3×3 Nachbarschaft): Abstand zur nächsten Zellkante (F2 − F1, in Zelleinheiten) und ein Schlüssel
 * 0..1 der nächsten Zelle.
 */
function cells(p: Vec2Node, wobble: FloatNode): { edge: FloatNode; key: FloatNode } {
  const c = floor(p);
  const f = fract(p);
  let d1: FloatNode = float(8);
  let d2: FloatNode = float(8);
  let key: FloatNode = float(0);
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const g = vec2(i, j);
      const cell = c.add(g);
      const h = hash2(cell);
      // Zellkerne atmen leicht (Seen) bzw. stehen (Eis)
      const o = h.mul(0.7).add(0.15).add(vec2(sin(wobble.add(h.x.mul(6.28))), sin(wobble.mul(0.8).add(h.y.mul(6.28)))).mul(0.08));
      const r = g.add(o).sub(f);
      const d = r.dot(r);
      const closer = d.lessThan(d1);
      d2 = select(closer, d1, min(d2, d)) as unknown as FloatNode;
      key = select(closer, h.x, key) as unknown as FloatNode;
      d1 = select(closer, d, d1) as unknown as FloatNode;
    }
  }
  return { edge: sqrt(d2).sub(sqrt(d1)), key };
}

/**
 * Earle-Wasser (Ebene_48, Ebene_29, Ebene_38) auf dem eigenen Wasser-Mesh: flache Palettenflächen statt Spiegelung.
 * Nah: Zellen (flache Wellen-Silhouetten) mit hellem Netz, einzelne dunklere Zellen, langsam mit der Strömung
 * ziehend; fern (Zellen < ~8 px): feine waagrechte Linienbänder quer zur Band-/Flussachse, die bei weiterer Entfernung
 * in die Grundfläche übergehen (kein Moiré). Flachwasser am Ufer als eine hellere Wertstufe mit organischer Kante (keine
 * Uferlinie). Schlagschatten von Bäumen, Felsen und Ufer fallen als tiefe Wasserfarbe — Earles flache Spiegelungen.
 * Eis: große Schollen (Zellen) in zwei hellen Stufen mit dunklen Rissen, ohne Bewegung.
 */
export function createWaterMaterial(o: WaterMaterialOptions): EarleMaterial {
  const wa = attribute('wa', 'vec4');
  const wb = attribute('wb', 'vec4');
  const u = wa.x;
  const v = wa.y;
  const e = wa.z;
  const frozen = wa.w;
  const world = wb.x;
  const flow = wb.y;
  const body = wb.z;
  const isRiver = wb.w.greaterThan(0.5);
  const isIce = frozen.greaterThan(0.5);
  const row = arrayElement(o.waterRows, world);
  const pal = (i: number) => o.lookup.pal(i, row).rgb;
  const t = patternTime.mul(frozen.oneMinus());
  // Zellen: Flüsse als lange Strömungsschlieren (längs gestreckt), Seen als flache Wellen quer zur Bandachse (im Blick
  // waagrecht), Eis als große gleichmäßige Schollen
  // Zellen quer zur Achse gestreckt (schmal in u, breit in v): Flüsse und Seen laufen längs des Weltbands, also in die
  // Bildtiefe — so liegen die Wellen-Silhouetten im Bild waagrecht (Ebene_48)
  const ku = select(isIce, float(0.9), select(isRiver, float(4.2), float(5.0)));
  const kv = select(isIce, float(0.9), select(isRiver, float(1.5), float(1.7)));
  const p = vec2(u.mul(ku).sub(t.mul(flow).mul(0.2)).add(body.mul(41.0)), v.mul(kv));
  const vor = cells(p, t.mul(0.35));
  const fw = fwidth(p.x).add(fwidth(p.y)).max(1e-5);
  const net = smoothstep(float(0.12).add(fw), float(0.12).sub(fw), vor.edge);
  // Zellen fern ausblenden (unter ~8 px), dort übernehmen Linienbänder
  const near = smoothstep(0.16, 0.08, fw);
  const base = pal(2);
  const dark = pal(1);
  const light = pal(3);
  let col: Vec3Node = mix(base, dark, step(vor.key, float(0.3)).mul(near));
  col = mix(col, mix(base, light, 0.7), net.mul(near));
  // Ferne Linienbänder quer zur Achse (waagrecht im Blick längs des Bands), in einigen Streifen dichter
  const band = aaStep(0.1, sin(u.mul(0.9).add(v.mul(0.35)).add(body.mul(9.0))));
  const lines = stripeMask(u.mul(5.5).sub(t.mul(flow).mul(0.08)), 0.34).mul(near.oneMinus()).mul(float(0.55).add(band.mul(0.45)));
  col = mix(col, light, lines);
  // Flachwasser: hellere Stufe an Teilen des Ufers mit organischer Kante (Wertsprung, keine umlaufende Uferlinie)
  const wob = sin(u.mul(1.7).add(v.mul(0.9)).add(body.mul(5.0))).mul(0.12).add(sin(u.mul(0.53).sub(v.mul(2.1))).mul(0.08));
  // Flachwasser wie Sandbänke: nur an einem Ufer, das Ufer wechselt längs des Gewässers (keine umlaufende Uferlinie)
  const bank = sin(u.mul(0.23).add(body.mul(17.0))).add(sin(u.mul(0.61).add(body.mul(3.0))).mul(0.35));
  const oneSide = aaStep(0.0, v.mul(select(bank.greaterThan(0), float(1), float(-1))));
  const patchy = aaStep(0.25, abs(bank)).mul(oneSide);
  const shallow = aaStep(e, float(0.2).add(wob.mul(0.8))).mul(patchy);
  col = mix(col, mix(light, pal(4), 0.3), shallow.mul(frozen.oneMinus()));
  // Eis: Schollen in zwei hellen Stufen, dunkle Risse (Zellkanten), Schneeflecken am Rand
  const plates = mix(pal(4), pal(5), step(vor.key, float(0.45)));
  const cracks = smoothstep(float(0.06).add(fw), float(0.06).sub(fw), vor.edge).mul(periodFade(p.x, 3.0));
  const iceCol = mix(mix(plates, pal(3), shallow.mul(0.5)), pal(6), cracks);
  col = mix(col, iceCol, frozen);
  // Schatten: tiefe Wasserfarbe; auf Eis eine Stufe unter dem Eis
  const shadowCol = mix(pal(0), mix(pal(2), pal(3), 0.4), frozen);
  return new EarleMaterial({
    lookup: o.lookup,
    row: 0,
    rowNode: row,
    fog: o.fog,
    bands: o.bands,
    bandNode: float(0.5),
    terminatorNode: float(-1),
    pattern: { mask: float(1), color: col, shadowColor: shadowCol },
    positionNode: o.warp(positionLocal),
    fogDistNode: positionView.length().add(o.veil(world)),
  });
}

void max;
