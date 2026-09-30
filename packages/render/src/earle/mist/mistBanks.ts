import { DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import { abs, attribute, clamp, cross, exp, float, floor, fract, fwidth, max, mix, normalize, positionGeometry, select, sin, smoothstep, uniform, uv, vec2, vec3 } from 'three/tsl';
import type { MistBank } from '@ee/world';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';

/**
 * Nebelbänke als Airbrush (Welten 11/12, Ebene 20 und Ebene 7): je Bank ein senkrechtes Band in der Landschaft, das
 * sich um die Hochachse zur Kamera dreht. Das Gelände davor verdeckt es (Tiefentest), das Gelände dahinter liegt im
 * Nebel — so staffeln sich dunkle Hügel und helle Bänke wie im Bild. Die Farben kommen aus der Nebelzeile der Welt
 * (Kern = hellste Stufe, dann zwei Stufen zum Rand hin), der Übergang ist gespritzt (körnige Kante statt Verlauf aus
 * dem Rechner), die Ränder wellen sich langsam. Zwei Arten:
 * - Band (0): Kern in der Mitte, weich nach oben und unten auslaufend, lange Schlieren (Ebene 20);
 * - Nebelmeer (1): unten dicht und hell, zur Oberkante weich (Ebene 7: der Fuß der Felsstümpfe steckt im Nebel).
 *
 * Positionen relativ zum Anker (die Ebene setzt das Mesh an Anker − Fokus), durch die Anzeige-Abbildung gebogen.
 */
export interface MistBanksOptions {
  lookup: PaletteLookup;
  /** Anzeige-Abbildung (Objektraum → Objektraum). */
  warp: (p: Vec3Node) => Vec3Node;
  /** Höchstzahl der Bänke. */
  capacity?: number;
}

export class MistBanks {
  readonly mesh: Mesh;
  /** Kamera im Objektraum des Meshes (flach). */
  private readonly camLocal = uniform(new Vector3(0, 50, 0));
  /** Blickrichtung der Kamera in der Ebene (waagrecht, normiert): alle Bänder liegen quer dazu, waagrecht im Bild. */
  private readonly camForward = uniform(new Vector3(0, 0, -1));
  private readonly geometry: InstancedBufferGeometry;
  private readonly material: MeshBasicNodeMaterial;
  private readonly capacity: number;
  /** Höchste Oberkante (Höhe über der Grundfläche) im aktuellen Inhalt. */
  hMax = 0;

  constructor(options: MistBanksOptions) {
    const cap = (this.capacity = options.capacity ?? 96);
    const g = new InstancedBufferGeometry();
    // Quad −0.5..0.5 (x = längs, y = senkrecht), zwei Dreiecke
    g.setAttribute('position', new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('mistA', new InstancedBufferAttribute(new Float32Array(cap * 4), 4)); // Mitte xyz, Länge
    g.setAttribute('mistB', new InstancedBufferAttribute(new Float32Array(cap * 4), 4)); // Dicke, Deckkraft, Zufall, Art
    g.setAttribute('mistC', new InstancedBufferAttribute(new Float32Array(cap), 1)); // Nebelzeile der Welt
    g.instanceCount = 0;
    g.boundingSphere = null;
    this.geometry = g;

    const A = attribute('mistA', 'vec4');
    const B = attribute('mistB', 'vec4');
    const row = attribute('mistC', 'float');
    const centre = A.xyz;
    const up = vec3(0, 1, 0);
    // Quer zur Blickrichtung der Kamera um die Hochachse gedreht: jedes Band liegt waagrecht im Bild (Ebene 20),
    // auch am Bildrand (zur Kamera hin gedreht stünden seitliche Bänder schräg)
    const right = normalize(cross(up, this.camForward.negate()));
    const p = centre.add(right.mul(positionGeometry.x.mul(A.w))).add(up.mul(positionGeometry.y.mul(B.x)));

    const m = new MeshBasicNodeMaterial({ side: DoubleSide, transparent: true, depthWrite: false, fog: false });
    m.name = 'earle-mist-banks';
    m.positionNode = options.warp(p as unknown as Vec3Node);
    const u = uv().x;
    const v = uv().y;
    const seed = B.z;
    const isSea = B.w.greaterThan(0.5).and(B.w.lessThan(1.5));
    const isMountain = B.w.greaterThan(1.5);
    // langsam gewellte Ränder (je Bank eigene Phase)
    const wob = sin(u.mul(8.3).add(seed.mul(41.0))).mul(0.07).add(sin(u.mul(21.7).add(seed.mul(17.0))).mul(0.03));
    // Band: Gauß um die (gewellte) Mitte, die Unterkante etwas länger (der Nebel liegt auf)
    const dv = v.sub(float(0.5).add(wob));
    const sigma = select(dv.lessThan(0), float(0.24), float(0.19));
    const band = exp(dv.div(sigma).mul(dv.div(sigma)).negate());
    // Nebelmeer: bis knapp unter die Oberkante dicht, oben weich
    const sea = smoothstep(float(0.98).add(wob), float(0.52).add(wob), v).mul(smoothstep(0.0, 0.06, v));
    // Berg (Ebene 7): gezackte Oberkante aus drei Wellen, darunter eine Fläche, die nach oben verblasst
    const ridge = float(0.62)
      .add(sin(u.mul(7.3).add(seed.mul(29.0))).mul(0.16))
      .add(sin(u.mul(17.9).add(seed.mul(11.0))).mul(0.07))
      .add(abs(sin(u.mul(41.0).add(seed.mul(5.0)))).mul(0.05));
    const fwv = fwidth(v).max(1e-4);
    const mountain = smoothstep(ridge.add(fwv), ridge.sub(fwv), v).mul(mix(float(0.95), float(0.35), v.div(ridge.max(0.2)).clamp(0, 1)));
    const profile = select(isMountain, mountain, select(isSea, sea, band));
    // Enden: weich und unregelmäßig
    const endA = float(0.2).add(sin(v.mul(6.1).add(seed.mul(9.0))).mul(0.08));
    const endB = float(0.8).sub(sin(v.mul(4.7).add(seed.mul(13.0))).mul(0.08));
    const ends = smoothstep(0.0, endA, u).mul(smoothstep(1.0, endB, u));
    // Schlieren längs des Bands (Ebene 20: lange, fast durchgehende Bänder mit wenigen Lücken)
    const streak = float(0.78).add(sin(u.mul(17.0).add(seed.mul(7.0)).add(v.mul(2.2))).mul(0.12)).add(sin(u.mul(43.0).add(seed.mul(3.0))).mul(0.06));
    const a = clamp(profile.mul(select(isMountain, smoothstep(0.0, 0.12, u).mul(smoothstep(1.0, 0.88, u)), ends)).mul(select(isSea.or(isMountain), float(1), streak)), 0, 1);
    // Airbrush-Korn: Zellen von etwa 1,5 Bildpunkten im Band (schwimmt nicht mit dem Bildschirm), am stärksten im
    // Übergang — die Kante ist gespritzt wie bei Earle, der Kern bleibt ruhig
    const px = max(fwidth(u), float(1e-5)).mul(1.6);
    const py = max(fwidth(v), float(1e-5)).mul(1.6);
    const cell = floor(vec2(u.div(px), v.div(py)));
    const grain = fract(sin(cell.x.mul(12.9898).add(cell.y.mul(78.233)).add(seed.mul(37.0))).mul(43758.5453));
    // Korn nur an den weichen Rändern von Bank und Meer (die Bergkante bleibt eine klare Form)
    const edge = a.mul(float(1).sub(a)).mul(4).mul(select(isMountain, float(0), float(1)));
    // Nahe an der Kamera löst sich die Bank auf (kein Nebelvorhang vor der Linse; sie liegt im Mittelgrund)
    const near = smoothstep(3.5, 9.0, this.camLocal.sub(centre).length());
    const alpha = clamp(a.add(grain.sub(0.5).mul(0.55).mul(edge)), 0, 1).mul(B.y).mul(near);
    // Farben: Rand (Stufe 3) → Mitte (4) → Kern (5); Nebelmeer unten heller
    const edgeCol = options.lookup.pal(3, row).rgb as unknown as Vec3Node;
    const midCol = options.lookup.pal(4, row).rgb as unknown as Vec3Node;
    const coreCol = options.lookup.pal(5, row).rgb as unknown as Vec3Node;
    const k = select(isSea, float(1).sub(v).mul(0.9).add(a.mul(0.3)), a) as unknown as FloatNode;
    let col = mix(edgeCol, midCol, smoothstep(0.12, 0.5, k));
    col = mix(col, coreCol, smoothstep(0.5, 0.92, k));
    // Berge: Stufe 0 der Nebelzeile (ohne Deckkraft im Distanznebel, frei für die Bergfarbe — grauer als der Himmel)
    m.colorNode = select(isMountain, options.lookup.pal(0, row).rgb, col);
    m.opacityNode = alpha;
    this.material = m;

    const mesh = new Mesh(g, m);
    mesh.name = 'planet-mist';
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // nach dem Undurchsichtigen, vor den Nebelstreifen der Kamera
    mesh.renderOrder = 5;
    this.mesh = mesh;
  }

  /**
   * Bänke setzen (Positionen relativ zum Anker `origin`, der Besitzer setzt das Mesh an Anker − Fokus); `fogRow`
   * liefert die Nebelzeile der Welt einer Bank (Welt-Slot).
   */
  set(banks: readonly MistBank[], origin: { x: number; z: number }, fogRow: (world: number) => number): void {
    const g = this.geometry;
    const a = g.getAttribute('mistA') as InstancedBufferAttribute;
    const b = g.getAttribute('mistB') as InstancedBufferAttribute;
    const c = g.getAttribute('mistC') as InstancedBufferAttribute;
    // Berge zuerst (hinten), dann Bänke und Meer: eine Zeichnung, die Instanzen in dieser Reihenfolge
    banks = [...banks].sort((p, q) => (q.kind === 2 ? 1 : 0) - (p.kind === 2 ? 1 : 0));
    const n = Math.min(this.capacity, banks.length);
    let hMax = 0;
    for (let i = 0; i < n; i++) {
      const k = banks[i]!;
      a.setXYZW(i, k.x - origin.x, k.y, k.z - origin.z, k.length);
      b.setXYZW(i, k.thickness, k.opacity, k.seed, k.kind);
      c.setX(i, fogRow(k.world));
      hMax = Math.max(hMax, k.y + k.thickness * 0.5);
    }
    for (const attr of [a, b, c]) {
      attr.clearUpdateRanges();
      if (n > 0) {
        attr.addUpdateRange(0, n * attr.itemSize);
        attr.needsUpdate = true;
      }
    }
    g.instanceCount = n;
    this.hMax = hMax;
  }

  /** Kamera im Objektraum des Meshes (flacher Raum minus Mesh-Position) und ihre Blickrichtung (beliebig lang). */
  setCamera(x: number, y: number, z: number, forwardX = 0, forwardZ = -1): void {
    this.camLocal.value.set(x, y, z);
    const l = Math.hypot(forwardX, forwardZ);
    if (l > 1e-6) this.camForward.value.set(forwardX / l, 0, forwardZ / l);
  }

  get count(): number {
    return this.geometry.instanceCount;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
