import { abs, attribute, clamp, float, floor, fract, fwidth, hash, max, min, mix, positionLocal, positionView, select, sin, smoothstep, sqrt, step, uniform, vec2 } from 'three/tsl';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, patternTime, periodFade, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec2Node, type Vec3Node } from '../tsl';
import { STEP_GRADIENT, earleGradients, shiftTone } from '../gradients';
import { seaColor } from './seaSurface';
import { poisonMask, toxicPalette } from './shoreBand';

/**
 * Bewegung des Wassers (Florians Entscheidung 5: „angenehm wogend“; STYLE §2 Zeile 8: Wellen als Bandebenen,
 * Lissajous/Moiré langsam animiert). Alle Kanten bleiben `aaStep`-hart — nur die Formen wandern.
 */
export interface WaterMotion {
  /** Drift der fernen Linienbänder längs der Strömung (Einheiten/s; Flüsse voll, Seen 60 %). Standard 0.07. */
  drift: number;
  /**
   * Lissajous-Bahn der Zellkerne (Wellen-Silhouetten): Frequenzen je Periode (ganzzahlig → die Bahn schließt sich) und
   * Amplitude als Anteil einer Zelle. Benachbarte Zellen laufen phasenversetzt, das helle Netz wogt.
   */
  lissajous: { fx: number; fz: number; amp: number };
  /** Gegenläufige Drift der breiten Bandhüllkurve (Einheiten/s): Linien und Hüllkurve schieben sich als Moiré. Standard 0.03. */
  bands: number;
  /** Periode der Bewegung (Sekunden): Lissajous, Spiegelbild, Blasen. Standard 60. */
  period: number;
}

export const DEFAULT_WATER_MOTION: WaterMotion = { drift: 0.07, lissajous: { fx: 3, fz: 2, amp: 0.11 }, bands: 0.03, period: 60 };

/** Uniforms der Bewegung (zur Laufzeit regelbar, z. B. im Lab). */
export interface WaterMotionUniforms {
  drift: TSLUniform;
  fx: TSLUniform;
  fz: TSLUniform;
  amp: TSLUniform;
  bands: TSLUniform;
  period: TSLUniform;
}

export function waterMotionUniforms(m: Partial<Omit<WaterMotion, 'lissajous'>> & { lissajous?: Partial<WaterMotion['lissajous']> } = {}): WaterMotionUniforms {
  const d = DEFAULT_WATER_MOTION;
  return {
    drift: uniform(m.drift ?? d.drift),
    fx: uniform(m.lissajous?.fx ?? d.lissajous.fx),
    fz: uniform(m.lissajous?.fz ?? d.lissajous.fz),
    amp: uniform(m.lissajous?.amp ?? d.lissajous.amp),
    bands: uniform(m.bands ?? d.bands),
    period: uniform(Math.max(1, m.period ?? d.period)),
  };
}

export interface WaterMaterialOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Wasserzeile je Welt-Index. */
  waterRows: UniformArrayLike;
  /** Zusatz-Nebeldistanz (Schleier) je Welt-Index. */
  veil: (world: FloatNode) => FloatNode;
  warp: (p: Vec3Node) => Vec3Node;
  /** Wachstum/Heilung 0..1 je Merkmals-Index (Vertex-Attribut `wg`); fehlt → immer geheilt. */
  growth?: (feature: FloatNode) => FloatNode;
  /** Bewegung (Standard `DEFAULT_WATER_MOTION`). */
  motion?: Partial<Omit<WaterMotion, 'lissajous'>> & { lissajous?: Partial<WaterMotion['lissajous']> };
}

/** Wassermaterial mit seinen Bewegungs-Uniforms. */
export type WaterMaterial = EarleMaterial & { motion: WaterMotionUniforms };

/**
 * Wachstum, ab dem Giftwasser zu klarem Wasser heilt: darunter ganz giftig, darüber weicht das Gift (harte Front) bis
 * Wachstum 1 zurück. 0,7 = Grundbestand der Natur-Welten (`TERRAIN_FLOOR`): auch Welten mit Müll in Nestern zeigen ihr
 * Giftwasser vor der Heilung ganz; die vermüllte Startwelt (Grundbestand 0) heilt im letzten Teil ihres Abschnitts.
 */
export const TOXIC_HEAL_FROM = 0.7;

/** Zufallsvektor 0..1 je Zelle. */
function hash2(c: Vec2Node): Vec2Node {
  return vec2(hash(c.x.mul(127.1).add(c.y.mul(311.7))), hash(c.x.mul(269.5).add(c.y.mul(183.3))));
}

/**
 * Voronoi-Zellen (3×3 Nachbarschaft): Abstand zur nächsten Zellkante (F2 − F1, in Zelleinheiten), ein Schlüssel 0..1
 * der nächsten Zelle und der Abstand zu ihrem Kern (F1). Die Kerne wandern auf Lissajous-Bahnen (Phase `ph`, Frequenzen
 * `fx`/`fz`, Amplitude `amp` in Zellanteilen; Eis: 0), jede Zelle mit eigener Phase.
 */
function cells(p: Vec2Node, ph: FloatNode, fx: FloatNode, fz: FloatNode, amp: FloatNode): { edge: FloatNode; key: FloatNode; f1: FloatNode } {
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
      const liss = vec2(sin(ph.mul(fx).add(h.x.mul(6.2832))), sin(ph.mul(fz).add(h.y.mul(6.2832)))).mul(amp);
      const o = h.mul(0.7).add(0.15).add(liss);
      const r = g.add(o).sub(f);
      const d = r.dot(r);
      const closer = d.lessThan(d1);
      d2 = select(closer, d1, min(d2, d)) as unknown as FloatNode;
      key = select(closer, h.x, key) as unknown as FloatNode;
      d1 = select(closer, d, d1) as unknown as FloatNode;
    }
  }
  return { edge: sqrt(d2).sub(sqrt(d1)), key, f1: sqrt(d1) };
}

/**
 * Earle-Wasser (Ebene_48, Ebene_29, Ebene_38) auf dem eigenen Wasser-Mesh: flache Palettenflächen statt Spiegelung.
 * Nah: Zellen (flache Wellen-Silhouetten) mit hellem Netz, einzelne dunklere Zellen, langsam mit der Strömung
 * ziehend, die Kerne auf Lissajous-Bahnen; fern (Zellen < ~8 px): feine waagrechte Linienbänder quer zur
 * Band-/Flussachse, die längs der Strömung driften und unter einer gegenläufigen Hüllkurve als Moiré wandern, bei
 * weiterer Entfernung in die Grundfläche übergehend. Flachwasser am Ufer als eine hellere Wertstufe mit organischer
 * Kante (keine Uferlinie). Schlagschatten von Bäumen, Felsen und Ufer fallen als tiefe Wasserfarbe — Earles flache
 * Spiegelungen; das Spiegelbild der Böschung wogt mit halber Amplitude. Eis: große Schollen (Zellen) in zwei hellen
 * Stufen mit dunklen Rissen, ohne Bewegung.
 *
 * Giftwasser (Müll v3, Vertex-Gift-Code > 0): Neon im Müllstil der Welt (`TOXIC_WATER`) — Schleimkörper als Zellen,
 * Schleimringe um die Zellkerne (Voronoi-F1, wandern nach außen), Blasen, die wachsen und platzen, ein Neon-Saum an der
 * Uferlinie; es verdorrt nicht, sondern weicht mit der Heilung (Wachstum über `TOXIC_HEAL_FROM`) als harte Front
 * klarem Wasser.
 */
export function createWaterMaterial(o: WaterMaterialOptions): WaterMaterial {
  const motion = waterMotionUniforms(o.motion);
  const wa = attribute('wa', 'vec4');
  const wb = attribute('wb', 'vec4');
  const wg = attribute('wg', 'vec3');
  const u = wa.x;
  const v = wa.y;
  const e = wa.z;
  const frozen = wa.w;
  const world = wb.x;
  const flow = wb.y;
  const body = wb.z;
  // Art: 0 See, 1 Fluss, 2 Sumpf (wie ein See gezeichnet; eigene Sümpfe kommen als Wahrzeichen)
  const isRiver = abs(wb.w.sub(1)).lessThan(0.5);
  const isIce = frozen.greaterThan(0.5);
  const row = arrayElement(o.waterRows, world);
  const pal = (i: number) => o.lookup.pal(i, row).rgb;
  const still = frozen.oneMinus();
  const t = patternTime.mul(still);
  // Phase der Wellenbewegung: eine Umdrehung je Periode
  const ph = t.mul(Math.PI * 2).div(motion.period);
  // Zellen: Flüsse als lange Strömungsschlieren (längs gestreckt), Seen als flache Wellen quer zur Bandachse (im Blick
  // waagrecht), Eis als große gleichmäßige Schollen
  // Zellen quer zur Achse gestreckt (schmal in u, breit in v): Flüsse und Seen laufen längs des Weltbands, also in die
  // Bildtiefe — so liegen die Wellen-Silhouetten im Bild waagrecht (Ebene_48)
  const ku = select(isIce, float(0.9), select(isRiver, float(4.2), float(5.0)));
  const kv = select(isIce, float(0.9), select(isRiver, float(1.5), float(1.7)));
  const p = vec2(u.mul(ku).sub(t.mul(flow).mul(0.2)).add(body.mul(41.0)), v.mul(kv));
  const vor = cells(p, ph, motion.fx, motion.fz, motion.amp.mul(still));
  const fw = fwidth(p.x).add(fwidth(p.y)).max(1e-5);
  // Wasser (Ebene_48): runde, liegende Wellenkiesel (dunkle Zellen) in einem helleren Netz; Größe je Zelle variiert
  const radiusCell = float(0.34).add(vor.key.mul(0.12));
  const pebble = smoothstep(radiusCell.add(fw), radiusCell.sub(fw), vor.f1);
  // Zellen fern ausblenden (unter ~8 px), dort übernehmen Linienbänder
  const near = smoothstep(0.16, 0.08, fw);
  const base = pal(2);
  const dark = pal(1);
  const light = pal(3);
  const pebbleCol = mix(base, dark, step(vor.key, float(0.35)));
  let col: Vec3Node = mix(base, mix(mix(base, light, 0.55), pebbleCol, pebble), near);
  // Ferne Linienbänder quer zur Achse (waagrecht im Blick längs des Bands): sie driften längs der Strömung (Seen 60 %),
  // eine breite Hüllkurve läuft gegenläufig darüber — dichtere Streifen wandern als Moiré durch die Linien
  const lineDrift = t.mul(motion.drift).mul(select(isRiver, float(1), float(0.6)));
  const band = aaStep(0.1, sin(u.add(t.mul(motion.bands)).mul(0.9).add(v.mul(0.35)).add(body.mul(9.0))));
  const lineCoord = u.sub(lineDrift).mul(5.5);
  const beat = stripeMask(u.sub(lineDrift.mul(0.8)).mul(5.5 * 1.09), 0.5);
  const lines = stripeMask(lineCoord, 0.34).mul(near.oneMinus()).mul(float(0.4).add(max(band, beat).mul(0.6)));
  col = mix(col, light, lines);
  // Flachwasser: hellere Stufe an Teilen des Ufers mit organischer Kante (Wertsprung, keine umlaufende Uferlinie)
  const wob = sin(u.mul(1.7).add(v.mul(0.9)).add(body.mul(5.0))).mul(0.12).add(sin(u.mul(0.53).sub(v.mul(2.1))).mul(0.08));
  // Flachwasser wie Sandbänke: nur an einem Ufer, das Ufer wechselt längs des Gewässers (keine umlaufende Uferlinie)
  const sandSide = sin(u.mul(0.23).add(body.mul(17.0))).add(sin(u.mul(0.61).add(body.mul(3.0))).mul(0.35));
  const oneSide = aaStep(0.0, v.mul(select(sandSide.greaterThan(0), float(1), float(-1))));
  const patchy = aaStep(0.25, abs(sandSide)).mul(oneSide);
  // (Stufen über `aaStep(0, Kante − e)`: die Kantenbreite folgt dem Uferabstand, genau ein Pixel)
  const shallow = aaStep(0, float(0.2).add(wob.mul(0.8)).sub(e)).mul(patchy);
  col = mix(col, mix(light, pal(4), 0.3), shallow.mul(still));
  // Flache Spiegelung der Böschung (Ebene_29): ein dunkles Band am Ufer, so breit wie das Ufer hoch ist, mit welliger
  // Kante; darin laufen die Wellen als dunklere Silhouetten weiter. Die Kante wogt mit halber Amplitude der Wellen
  const bankH = wg.y;
  const sway = sin(u.mul(1.1).add(v.mul(0.6)).add(body.mul(11.0)).add(ph.mul(2))).mul(motion.amp.mul(0.5 * 1.6));
  const reflEdge = bankH.mul(0.8).add(wob.mul(1.4).add(sway).mul(bankH.min(1)));
  const refl = aaStep(0, reflEdge.sub(e)).mul(step(0.25, bankH)).mul(still);
  const reflCol = mix(pal(0), pal(1), select(vor.edge.lessThan(0.12), float(0.55), float(0.12)).mul(near));
  col = mix(col, reflCol, refl);
  // Eis: Schollen in zwei hellen Stufen, dunkle Risse (Zellkanten), Schneeflecken am Rand
  const plates = mix(pal(4), pal(5), step(vor.key, float(0.45)));
  const cracks = smoothstep(float(0.06).add(fw), float(0.06).sub(fw), vor.edge).mul(periodFade(p.x, 3.0));
  const iceCol = mix(mix(plates, pal(3), shallow.mul(0.5)), pal(6), cracks);
  col = mix(col, iceCol, frozen);
  // Verlauf über die ganze Wasserfläche (Ebene 29): hinten hell, vorn tief — unter den harten Wellenformen, die ihre
  // Kanten behalten (alle Töne wandern gemeinsam, höchstens 40 % zur Nachbarstufe)
  const depthG = smoothstep(4.0, 22.0, positionView.length()).mul(2).sub(1);
  const gradAmount = earleGradients.surface.mul(STEP_GRADIENT);
  col = shiftTone(col, pal(3), pal(1), depthG, gradAmount.mul(still));
  // Schatten: tiefe Wasserfarbe; auf Eis eine Stufe unter dem Eis
  let shadowCol: Vec3Node = mix(pal(0), mix(pal(2), pal(3), 0.4), frozen) as unknown as Vec3Node;

  // --- Giftwasser (Müll v3) ---------------------------------------------------------------------------------------
  const code = wg.z;
  const isToxic = step(0.5, code);
  const growth = o.growth ? o.growth(wg.x) : float(1);
  // ganz giftig bis zum Grundbestand, dann weicht das Gift als harte, organische Front (ruhiges Rauschen aus drei Wellen)
  const front = sin(u.mul(0.37).add(body.mul(13.0)))
    .mul(0.22)
    .add(sin(v.mul(0.61).sub(u.mul(0.19)).add(body.mul(5.0))).mul(0.18))
    .add(sin(u.mul(1.3).add(v.mul(0.9))).mul(0.06))
    .add(0.5);
  const toxicMask = isToxic.mul(poisonMask(growth, front, TOXIC_HEAL_FROM));
  const tp = (k: number) => toxicPalette(code, k);
  // Schleimkörper: die Wellenzellen als dunkle, zähe Schleimbuckel im Neon-Grundton, das Netz heller
  let tox: Vec3Node = mix(tp(2), mix(mix(tp(2), tp(3), 0.35), mix(tp(2), tp(1), step(vor.key, float(0.45))), pebble), near) as unknown as Vec3Node;
  // Schleimringe: konzentrische Neonringe um die Zellkerne (F1), die langsam nach außen wandern
  const ringCoord = vor.f1.mul(5.2).sub(ph.mul(1.5));
  const rings = stripeMask(ringCoord, 0.2).mul(aaStep(0, radiusCell.add(0.06).sub(vor.f1))).mul(near);
  tox = mix(tox, tp(3), rings) as unknown as Vec3Node;
  // Blasen: an jeder dritten Zelle wächst am Kern eine Blase (heller Ring mit Glanzpunkt) und platzt
  const bubbleKey = hash(vor.key.mul(91.7).add(3.1));
  const life = fract(ph.div(Math.PI * 2).mul(5.0).add(bubbleKey.mul(7.0)));
  const rb = float(0.05).add(life.mul(0.16));
  const bubbleRing = smoothstep(float(0.035).add(fw), float(0.035).sub(fw), abs(vor.f1.sub(rb)));
  const gleam = smoothstep(rb.mul(0.4).add(fw), rb.mul(0.4).sub(fw), vor.f1);
  const bubbles = max(bubbleRing, gleam).mul(step(0.66, bubbleKey)).mul(step(life, float(0.88))).mul(near);
  tox = mix(tox, tp(4), bubbles) as unknown as Vec3Node;
  // fern: Neon-Linien auf dem Grundton (dieselben driftenden Bänder)
  tox = mix(tox, tp(3), lines) as unknown as Vec3Node;
  // Neon-Saum an der Uferlinie (Schleimrand), wellig wie das Flachwasser
  const rim = aaStep(0, float(0.16).add(wob.mul(0.6)).add(sway.mul(0.5)).sub(e));
  tox = mix(tox, tp(3), rim) as unknown as Vec3Node;
  // dunkles Spiegelbild der Böschung bleibt (in Schleimtiefe)
  tox = mix(tox, mix(tp(1), tp(0), select(vor.edge.lessThan(0.12), float(0.6), float(0.15)).mul(near)), refl.mul(rim.oneMinus())) as unknown as Vec3Node;
  tox = shiftTone(tox, tp(3), tp(1), depthG, gradAmount);
  col = mix(col, tox, toxicMask) as unknown as Vec3Node;
  shadowCol = mix(shadowCol, mix(tp(0), tp(1), rim.mul(0.6)), toxicMask) as unknown as Vec3Node;

  // Meer (Art 3, Welt 14): Earles gestaffelte Kräusel statt der Seezellen; als Faktor gemischt (kein `select`-Zweig)
  const isSea = clamp(float(1).sub(abs(wb.w.sub(3)).mul(2)), 0, 1);
  const sea = seaColor({ lookup: o.lookup, row, x: u, z: v, shore: bankH, body, warp: o.warp, mirror: flow, motion });
  col = mix(col, sea.color, isSea) as unknown as Vec3Node;
  shadowCol = mix(shadowCol, sea.shadow, isSea) as unknown as Vec3Node;
  const material = new EarleMaterial({
    lookup: o.lookup,
    row: 0,
    rowNode: row,
    fog: o.fog,
    bands: o.bands,
    bandNode: float(0.5),
    terminatorNode: float(-1),
    pattern: { mask: float(1), color: col, shadowColor: shadowCol },
    positionNode: o.warp(positionLocal),
    // Meer: weniger Luftperspektive (sein ferner Glanz ist selbst hell; Ebene 29), sonst wie das Gelände
    fogDistNode: positionView.length().mul(mix(float(1), float(0.55), isSea)).add(o.veil(world)),
    // Vor der Heilung trüb wie das verdorrte Gelände ringsum; Giftwasser verdorrt nicht (sein Neon weicht der Heilung)
    growthNode: o.growth ? max(growth, isToxic) : null,
  });
  return Object.assign(material, { motion });
}
