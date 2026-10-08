import { Bone, BufferAttribute, BufferGeometry, ConeGeometry, Euler, Float32BufferAttribute, Group, InstancedMesh, InterleavedBuffer, InterleavedBufferAttribute, Matrix4, Mesh, Quaternion, Skeleton, SkinnedMesh, SphereGeometry, Uint16BufferAttribute, Vector3, Vector4 } from 'three/webgpu';
import type { MeshBasicNodeMaterial } from 'three/webgpu';
import { jawPose, jawRig, type Bauplan, type CreatureBuild, type Tooth, type Vec3 } from '@ee/creature';
import { applyStil, createCreatureMaterial, createCreatureUniforms, createLidMaterial, createTongueMaterial, createToothMaterial, MAX_SLIT_EYES, type CreatureColors, type CreatureMaterialUniforms } from './material/earleCreature';
import { applyMuster, applyZonen } from './material/muster';
import { applyJellyColors, createJellyMaterial, createJellyUniforms, measureJellyFloor, placeBubbles, type JellyUniforms } from './material/jelly';
import { applyEyeType, createEyeMaterial, createEyeUniforms, type EyeUniforms } from './material/eye';
import { STIL_STANDARD, type WesenStil } from './material/stil';

/**
 * Ein Wesen als three.js-Objekt aus einem `CreatureBuild`: ein SkinnedMesh (Körper mit Deskriptor-Attributen), Skelett
 * aus den Bauplan-Knochen, Zähne als zwei Instanzmeshes (oben fest, unten am Kieferknochen), Zunge am Kiefer,
 * Schlitzaugen im Material. `update` animiert Atmen, Kiefer und Blinzeln. Austausch des Builds ohne neues Material.
 */
export interface CreatureMeshOptions {
  stil?: WesenStil;
  castShadow?: boolean;
}

const UP = new Vector3(0, 1, 0);
/** Lidwinkel um die Querachse: Ruhe (Pol nach hinten, nur ein Saum deckt den Augapfel oben) … geschlossen (Pol nach vorn). */
const LID_REST = -1.15;
const LID_CLOSED = 1.2;
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();

function colorsOf(b: Bauplan): CreatureColors {
  const f = b.muster.farben;
  const m = b.muster;
  return { grund: f.grund, bauch: f.bauch, muster: f.muster, akzent: f.akzent, lippe: f.lippe, rachen: f.rachen, auge: f.auge, nase: f.nase, zonen: [m.zone1.farbe, m.zone2.farbe, m.zone3.farbe], glimmer: f.glimmer };
}

/**
 * Teil-Koordinate je Vertex für die Zonen „Socken“ und „Schwanzspitze“: Schwanz und Schlangenleib +t (0 Wurzel … 1 Spitze),
 * Beine −t (0 Hüfte … 1 Sohle), alles andere 0. Aus der Teilgruppe des Vertex und der Knochenkette seiner Gruppe; über
 * den letzten Knochen hinaus läuft die Bogenlänge weiter, damit t genau an der Spitze bzw. Sohle 1 erreicht.
 */
export function teilKoordinate(build: CreatureBuild): Float32Array {
  const n = build.positions.length / 3;
  const out = new Float32Array(n);
  const gruppe = build.descriptors.group;
  if (!gruppe || gruppe.length < n) return out;
  const ketten = build.groups.map((g) => {
    if (g.kind !== 'schwanz' && g.kind !== 'schlange' && g.kind !== 'bein') return null;
    const pts = g.bones.map((bi) => build.bones[bi]?.pos).filter((q): q is Vec3 => !!q);
    if (pts.length < 2) return null;
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]));
    return { pts, lens, vorzeichen: g.kind === 'bein' ? -1 : 1, max: 1e-6 };
  });
  if (ketten.every((k) => k === null)) return out;
  const bogen = new Float32Array(n);
  for (let v = 0; v < n; v++) {
    const k = ketten[gruppe[v]!];
    if (!k) continue;
    const px = build.positions[v * 3]!, py = build.positions[v * 3 + 1]!, pz = build.positions[v * 3 + 2]!;
    let best = Infinity, arc = 0;
    for (let i = 0; i + 1 < k.pts.length; i++) {
      const a = k.pts[i]!, b = k.pts[i + 1]!;
      const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
      const l2 = ex * ex + ey * ey + ez * ez || 1e-12;
      let t = ((px - a[0]) * ex + (py - a[1]) * ey + (pz - a[2]) * ez) / l2;
      t = Math.max(0, i + 2 === k.pts.length ? t : Math.min(1, t));
      const qx = a[0] + ex * t - px, qy = a[1] + ey * t - py, qz = a[2] + ez * t - pz;
      const dd = qx * qx + qy * qy + qz * qz;
      if (dd < best) {
        best = dd;
        arc = k.lens[i]! + t * Math.sqrt(l2);
      }
    }
    bogen[v] = arc;
    if (arc > k.max) k.max = arc;
  }
  for (let v = 0; v < n; v++) {
    const k = ketten[gruppe[v]!];
    if (k) out[v] = k.vorzeichen * Math.min(1, bogen[v]! / k.max);
  }
  return out;
}

/**
 * Instanzmatrix eines Zahns: Basis y = Zahnrichtung, −z = nach innen (Biegung zum Rachen), Lage plus Spitzmund-Versatz.
 * Der Versatz wirkt bei der Haut **nach** dem Skinning (ungedreht, Körperraum); der Zahn hängt am Kieferknochen, also
 * wird der Versatz mit der inversen Knochendrehung in den Knochenraum gebracht — sonst wanderten die Zähne beim Öffnen um
 * die gedrehte Versatzdifferenz ins Fleisch (Unterkiefer 45° → ein Viertel Kopfhöhe).
 */
function toothMatrix(t: Tooth, spitzmund: number, out: Matrix4, invRot?: Quaternion): Matrix4 {
  const yA = new Vector3(...t.dir).normalize();
  const inw = t.inward ? new Vector3(...t.inward) : new Vector3(0, 0, -1);
  const zA = inw.multiplyScalar(-1).addScaledVector(yA, -inw.clone().multiplyScalar(-1).dot(yA)).normalize();
  if (zA.lengthSq() < 1e-6) zA.set(0, 0, 1);
  const xA = new Vector3().crossVectors(yA, zA).normalize();
  zA.crossVectors(xA, yA).normalize();
  out.makeBasis(xA, yA, zA);
  _s.set(t.size * 0.38, t.size, t.size * 0.38);
  out.scale(_s);
  _p.set(...t.pos);
  if (t.pucker && spitzmund !== 0) {
    const off = new Vector3(...t.pucker).multiplyScalar(spitzmund);
    if (invRot) off.applyQuaternion(invRot);
    _p.add(off);
  }
  out.setPosition(_p);
  return out;
}

function toothGeometry(stil: 'rund' | 'spitz', biegung = 0.4): BufferGeometry {
  let g: BufferGeometry;
  if (stil === 'rund') {
    g = new SphereGeometry(0.5, 12, 10);
    g.scale(1, 1.0, 1);
    g.translate(0, 0.5, 0);
  } else {
    g = new ConeGeometry(0.5, 1, 12, 6, false);
    g.translate(0, 0.5, 0);
    // Fangzahn (Bild 5/11): leicht gebogen, zur Spitze hin nach hinten (−z) kippend, Ansatz etwas breiter als rund
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Biegung zum Rachen (lokal −z; die Instanz richtet −z nach innen), Bild 5/11: Fänge krümmen sich nach hinten
      const bend = (0.06 + 0.55 * biegung) * y * y;
      pos.setXYZ(i, pos.getX(i) * (1 + 0.15 * (1 - y)), y, pos.getZ(i) * 0.85 - bend);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
  }
  const pos = g.getAttribute('position');
  const t = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) t[i] = Math.min(1, Math.max(0, pos.getY(i)));
  g.setAttribute('eeTooth', new Float32BufferAttribute(t, 1));
  return g;
}

/**
 * Zunge (Bild 5/11/14): fleischiger Körper mit flacher Unterseite, Mittelrinne, runder Spitze; Länge entlang +z (zur
 * Öffnung), Breite x, Dicke y. Hinten (z = 0) breit am Ansatz, vorn verjüngt und leicht nach oben gebogen.
 */
function tongueGeometry(laenge: number, breite: number, dicke: number): BufferGeometry {
  // Zunge als pralles Kissen (Florians Skizze): geschlossene Fläche, oben gewölbt mit flacher Rinne, unten flach, Spitze
  // rund, hinten breit und dick — kein dünner Spatel
  const nu = 22, nv = 20;
  const pos: number[] = [], idx: number[] = [], tooth: number[] = [];
  const halbBreite = (u: number): number => (breite / 2) * (0.62 + 0.38 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.45) / 0.55, 2)))) * (u > 0.8 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.8) / 0.2, 2))) * 0.9 + 0.1 : 1);
  const hoehe = (u: number): number => dicke * (1.1 - 0.35 * u) * (u > 0.85 ? Math.sqrt(Math.max(0.05, 1 - Math.pow((u - 0.85) / 0.15, 2))) : 1);
  for (let i = 0; i <= nu; i++) {
    const u = i / nu; // 0 Ansatz … 1 Spitze
    const hb = halbBreite(u), h = hoehe(u);
    const lift = laenge * 0.1 * u * u;
    for (let j = 0; j <= nv; j++) {
      const a = (j / nv) * Math.PI * 2;
      const cx = Math.cos(a), sy = Math.sin(a);
      // obere Hälfte: Halbellipse mit Rinne; untere Hälfte: flach (20 % der Höhe)
      const rinne = sy > 0 ? 1 - 0.22 * Math.exp(-Math.pow(cx / 0.32, 2)) : 1;
      const y = sy > 0 ? h * sy * rinne : h * 0.2 * sy;
      pos.push(cx * hb, y + lift, u * laenge);
      tooth.push(u);
    }
  }
  const stride = nv + 1;
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * stride + j, b = a + 1, c = a + stride, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('eeTooth', new Float32BufferAttribute(tooth, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class CreatureMesh {
  readonly root = new Group();
  readonly uniforms: CreatureMaterialUniforms;
  readonly material: MeshBasicNodeMaterial;
  readonly jellyMaterial: MeshBasicNodeMaterial;
  readonly jelly: JellyUniforms;
  readonly eye: EyeUniforms;
  private eyeMaterial: MeshBasicNodeMaterial;
  private eyeMeshes: Mesh[] = [];
  private eyeGeo: BufferGeometry | null = null;
  /** Oberlider: Halbkugel-Kappen aus Hautmaterial am Augapfel, drehen beim Blinzeln nach vorn-unten (Bild 10: Sichel). */
  private lidMaterial: MeshBasicNodeMaterial;
  private lidMeshes: Mesh[] = [];
  private lidGeo: BufferGeometry | null = null;
  private toothMaterial: MeshBasicNodeMaterial;
  private tongueMaterial: MeshBasicNodeMaterial;
  mesh: SkinnedMesh | null = null;
  skeleton: Skeleton | null = null;
  bones: Bone[] = [];
  build: CreatureBuild | null = null;
  private jawAxis = new Vector3(1, 0, 0);
  /** Ruhelage der Knochen relativ zum Elternknochen (für Ketten, die neben der Drehung auch versetzt werden). */
  private restLocal: Vector3[] = [];
  /** Vorn-Achse des Maulträgers (Körperraum) für das seitliche Kippen des Oberkiefers (Bohne). */
  private hostForward = new Vector3(0, 0, 1);
  /** Hochachse des Trägers. */
  private hostUp = new Vector3(0, 1, 0);
  private upperTeeth: InstancedMesh | null = null;
  /** Zahnsätze mit Spitzmund-Versatz (Lochmaul): Instanzmatrizen folgen der Öffnung. */
  private toothSets: Array<{ im: InstancedMesh; list: Tooth[]; bone: number }> = [];
  private spitzmundTeeth = 0;
  private toothRotKey = 0;
  /** Absolute Drehung der Kieferknochen aus der letzten Pose (Körperraum), für den Zahnversatz. */
  private absRot = new Map<number, Quaternion>();
  private lowerTeeth: InstancedMesh | null = null;
  private tongue: Mesh | null = null;
  private toothGeo: BufferGeometry | null = null;
  private tongueGeo: BufferGeometry | null = null;
  private stil: WesenStil;
  private bauplan: Bauplan | null = null;
  private readonly castShadow: boolean;
  /** Kieferöffnung 0…1 (Ziel) und aktueller Wert. */
  openness = 0.3;
  private opennessNow = 0.3;
  /** Demo-Gang (Lab): Beine schwingen, Körper wippt — zum Prüfen der Beinform in Bewegung. */
  laufen = false;
  private laufPhase = 0;
  private laufAmp = 0;
  /** Blinzeln 0 (offen) … 1 (zu). */
  blink = 0;
  /** Hält die Lider in einer Stellung (0 offen … 1 zu) für Standbilder; `null` = Blinzel-Automatik. */
  blinkHold: number | null = null;
  private blinkTimer = 2.5;
  private blinkPhase = -1;
  /** Atmen an/aus. */
  breathe = true;
  /** Automatisches Blinzeln (aus für Standbilder). */
  autoBlink = true;
  private elapsed = 0;

  constructor(opts: CreatureMeshOptions = {}) {
    this.stil = opts.stil ?? STIL_STANDARD;
    this.castShadow = opts.castShadow ?? true;
    this.uniforms = createCreatureUniforms({ grund: '#9c6cc7', bauch: '#d9c7ec', muster: '#3d2457', akzent: '#f08a4b', lippe: '#5a2f6b', rachen: '#6e2334', auge: '#101418' }, this.stil, 1);
    this.material = createCreatureMaterial(this.uniforms);
    this.jelly = createJellyUniforms();
    this.jellyMaterial = createJellyMaterial(this.uniforms, this.jelly);
    this.eye = createEyeUniforms();
    this.eyeMaterial = createEyeMaterial(this.uniforms, this.eye);
    this.lidMaterial = createLidMaterial(this.uniforms);
    this.toothMaterial = createToothMaterial(this.uniforms, '#f1e6c9');
    this.tongueMaterial = createTongueMaterial(this.uniforms, '#e07c92');
    this.root.name = 'wesen';
  }

  /** Farben, Stil und Augen aus dem Bauplan übernehmen (kein neues Mesh nötig). */
  setStyle(b: Bauplan, stil: WesenStil = this.stil): void {
    this.stil = stil;
    this.bauplan = b;
    applyStil(this.uniforms, stil, colorsOf(b));
    this.uniforms.bauchStaerke.value = b.muster.typ === 'bauchRuecken' ? 1 : 0;
    applyMuster(this.uniforms.musterU, b.muster);
    applyZonen(this.uniforms.zonen, [b.muster.zone1, b.muster.zone2, b.muster.zone3]);
    this.uniforms.glimmerWesen.value = b.muster.glimmer;
    applyEyeType(this.eye, b.augen.typ, b.muster.farben.auge, b.muster.farben.pupille);
    applyJellyColors(this.jelly, b.muster.farben.grund, b.muster.farben.muster, stil);
    placeBubbles(this.jelly, this.build?.bodyScale ?? b.koerper.hoehe, b.material === 'jelly' ? 9 : 0, b.seed);
    if (this.mesh) this.mesh.material = b.material === 'jelly' ? this.jellyMaterial : this.material;
    this.uniforms.bauchlinie.value = (b.muster.bauchlinie - 0.5) * 1.6;
    this.uniforms.gesichtHell.value = b.muster.gesichtHell;
    if (this.toothMaterial) this.toothMaterial.dispose();
    this.toothMaterial = createToothMaterial(this.uniforms, b.muster.farben.zahn);
    if (this.upperTeeth) this.upperTeeth.material = this.toothMaterial;
    if (this.lowerTeeth) this.lowerTeeth.material = this.toothMaterial;
    this.tongueMaterial.dispose();
    this.tongueMaterial = createTongueMaterial(this.uniforms, b.muster.farben.zunge);
    if (this.tongue) this.tongue.material = this.tongueMaterial;
  }

  /** Neues Mesh aus einem Build (ersetzt das alte). */
  setBuild(build: CreatureBuild, b: Bauplan): void {
    this.clearMesh();
    this.build = build;
    this.bauplan = b;
    this.uniforms.bodyScale.value = build.bodyScale;
    // --- Geometrie mit Deskriptoren ------------------------------------------------------------------------------
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(build.positions, 3));
    g.setAttribute('normal', new BufferAttribute(build.normals, 3));
    const si = new Uint16Array(build.descriptors.skinIndex.length);
    for (let i = 0; i < si.length; i++) si[i] = build.descriptors.skinIndex[i]!;
    g.setAttribute('skinIndex', new Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new BufferAttribute(build.descriptors.skinWeight, 4));
    // Alle Deskriptoren in einem verschachtelten Puffer (WebGPU erlaubt höchstens 8 Vertex-Puffer):
    // Spine (4) · Region (4) · Extra (AO, Dicke, Kante, Unterlippenseite) · Spitzmund (3) · Teil (1) = 16 Floats je Vertex
    const n = build.positions.length / 3;
    const packed = new Float32Array(n * 16);
    const d = build.descriptors;
    const teil = teilKoordinate(build);
    for (let v = 0; v < n; v++) {
      const o = v * 16;
      packed[o] = d.spine[v * 4]!;
      packed[o + 1] = d.spine[v * 4 + 1]!;
      packed[o + 2] = d.spine[v * 4 + 2]!;
      packed[o + 3] = d.spine[v * 4 + 3]!;
      packed[o + 4] = d.region[v * 4]!;
      packed[o + 5] = d.region[v * 4 + 1]!;
      packed[o + 6] = d.region[v * 4 + 2]!;
      packed[o + 7] = d.region[v * 4 + 3]!;
      packed[o + 8] = d.ao[v]!;
      packed[o + 9] = d.thick[v]!;
      packed[o + 10] = build.crease[v]!;
      packed[o + 11] = build.seite[v]!;
      packed[o + 12] = build.pucker[v * 3]!;
      packed[o + 13] = build.pucker[v * 3 + 1]!;
      packed[o + 14] = build.pucker[v * 3 + 2]!;
      packed[o + 15] = teil[v]!;
    }
    const ib = new InterleavedBuffer(packed, 16);
    g.setAttribute('eeSpine', new InterleavedBufferAttribute(ib, 4, 0));
    g.setAttribute('eeRegion', new InterleavedBufferAttribute(ib, 4, 4));
    g.setAttribute('eeExtra', new InterleavedBufferAttribute(ib, 4, 8));
    g.setAttribute('eePucker', new InterleavedBufferAttribute(ib, 3, 12));
    g.setAttribute('eeTeil', new InterleavedBufferAttribute(ib, 1, 15));
    this.uniforms.teilAn.value = 1;
    // Zonen messen in der Gesamthöhe des Wesens (Latz, Band); Jelly-Bodenlappen aus der Grundfläche
    this.uniforms.zonen.hoehe.value = Math.max(build.meshBounds.max[1], 0.5 * build.bodyScale);
    measureJellyFloor(this.jelly, build.positions, build.bodyScale);    g.setIndex(new BufferAttribute(build.index, 1));
    g.computeBoundingSphere();
    // --- Skelett: Knochen mit Identitätsdrehung, Position relativ zum Elternknochen ---------------------------------
    this.bones = build.bones.map((bb) => {
      const bone = new Bone();
      bone.name = `wesen-${bb.name}`;
      return bone;
    });
    this.restLocal = [];
    build.bones.forEach((bb, i) => {
      const bone = this.bones[i]!;
      const parent = bb.parent >= 0 ? build.bones[bb.parent]!.pos : [0, 0, 0];
      bone.position.set(bb.pos[0] - parent[0]!, bb.pos[1] - parent[1]!, bb.pos[2] - parent[2]!);
      this.restLocal.push(bone.position.clone());
      if (bb.parent >= 0) this.bones[bb.parent]!.add(bone);
    });
    const mesh = new SkinnedMesh(g, b.material === 'jelly' ? this.jellyMaterial : this.material);
    mesh.name = 'wesen-koerper';
    mesh.frustumCulled = false;
    mesh.castShadow = this.castShadow;
    mesh.receiveShadow = false;
    mesh.add(this.bones[0]!);
    this.skeleton = new Skeleton(this.bones);
    mesh.bind(this.skeleton);
    this.mesh = mesh;
    this.root.add(mesh);
    // --- Kiefer -----------------------------------------------------------------------------------------------------
    if (build.mouth) {
      this.jawAxis.set(...build.mouth.hinge.axis).normalize();
      this.hostUp.set(...build.mouth.up).normalize();
      this.hostForward.crossVectors(this.jawAxis, this.hostUp).normalize();
    }
    // Lippenband (Zahnfleisch) in Körpereinheiten: 0 ohne Lippe (Giraffe), sonst bis ≈ 10 % der Körperhöhe
    this.uniforms.lippenBand.value = b.maul.sichtbar && b.maul.lippe > 0.02 ? (0.015 + 0.085 * Math.min(1, b.maul.lippe)) * build.bodyScale : 0;
    // ω-Lippe: das Band gehört zur Oberlippe, unten nur ein Hauch (Bild 8/9; Florian: das W darf unten nicht sichtbar sein)
    this.uniforms.lippenBandUnten.value = b.maul.wForm > 0.02 ? 0.1 : 1;
    const gesicht = build.gesicht;
    this.uniforms.gesichtAn.value = gesicht ? 1 : 0;
    if (gesicht) {
      this.uniforms.naseMitte.value.set(gesicht.nase[0], gesicht.nase[1], gesicht.nase[2], gesicht.nasenRadius);
      if (gesicht.nasenOben && gesicht.nasenRechts && gesicht.nasenHoehe) {
        this.uniforms.naseOben.value.set(gesicht.nasenOben[0], gesicht.nasenOben[1], gesicht.nasenOben[2], gesicht.nasenHoehe);
        this.uniforms.naseRechts.value.set(gesicht.nasenRechts[0], gesicht.nasenRechts[1], gesicht.nasenRechts[2], 0);
      } else this.uniforms.naseOben.value.set(0, 1, 0, 0);
      this.uniforms.philtrumA.value.set(gesicht.philtrum[0][0], gesicht.philtrum[0][1], gesicht.philtrum[0][2], 0.012 * build.bodyScale);
      this.uniforms.philtrumB.value.set(gesicht.philtrum[1][0], gesicht.philtrum[1][1], gesicht.philtrum[1][2]);
    }
    // --- Zähne und Zunge ------------------------------------------------------------------------------------------------
    const stilZ = b.zaehne.stil;
    if (build.mouth && stilZ !== 'keine' && build.mouth.teeth.length > 0) {
      this.toothGeo = toothGeometry(stilZ, b.zaehne.biegung);
      const upper = build.mouth.teeth.filter((t) => t.upper);
      const lower = build.mouth.teeth.filter((t) => !t.upper);
      const make = (list: typeof upper, parent: Bone | Group, offset: Vector3 | null, boneIndex = -1): InstancedMesh | null => {
        if (list.length === 0) return null;
        const im = new InstancedMesh(this.toothGeo!, this.toothMaterial, list.length);
        im.name = 'wesen-zaehne';
        im.frustumCulled = false;
        im.castShadow = this.castShadow;
        list.forEach((t, i) => im.setMatrixAt(i, toothMatrix(t, 0, _m)));
        im.instanceMatrix.needsUpdate = true;
        if (offset) im.position.copy(offset);
        parent.add(im);
        // Lochmaul: Zähne mit Spitzmund-Versatz werden je Bild mit der Öffnung nachgeführt
        if (list.some((t) => t.pucker)) this.toothSets.push({ im, list, bone: boneIndex });
        return im;
      };
      const upperBone = this.bones[build.upperJawBone];
      if (upperBone) {
        const up0 = build.bones[build.upperJawBone]!.pos;
        this.upperTeeth = make(upper, upperBone, new Vector3(-up0[0], -up0[1], -up0[2]), build.upperJawBone);
      } else this.upperTeeth = make(upper, this.root, null);
      const jaw = this.bones[build.jawBone];
      if (jaw) {
        const jp = build.bones[build.jawBone]!.pos;
        this.lowerTeeth = make(lower, jaw, new Vector3(-jp[0], -jp[1], -jp[2]), build.jawBone);
      }
    }
    if (build.mouth && b.maul.sichtbar && b.zunge.groesse > 0.02 && build.mouth.tongue.laenge > 0.001) {
      const tg = build.mouth.tongue;
      this.tongueGeo = tongueGeometry(tg.laenge, tg.breite, Math.max(0.004, tg.breite * 0.5));
      const tongue = new Mesh(this.tongueGeo, this.tongueMaterial);
      tongue.name = 'wesen-zunge';
      const jaw = this.bones[build.jawBone];
      const jp = build.bones[build.jawBone]!.pos;
      tongue.position.set(tg.pos[0] - jp[0], tg.pos[1] - jp[1], tg.pos[2] - jp[2]);
      // Rahmen: +z = Zungenrichtung (zur Öffnung), +y = oben
      const zAx = new Vector3(...tg.dir).normalize();
      const yAx = new Vector3(...tg.up).addScaledVector(zAx, -new Vector3(...tg.up).dot(zAx)).normalize();
      const xAx = new Vector3().crossVectors(yAx, zAx).normalize();
      tongue.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xAx, yAx, zAx));
      (jaw ?? this.root).add(tongue);
      this.tongue = tongue;
    }
    // --- Augen: Schlitze im Material oder Augäpfel als Kugeln in der Höhle ------------------------------------------------
    const eyes = build.eyes.slice(0, MAX_SLIT_EYES);
    const slit = b.augen.typ === 'schlitz';
    this.uniforms.eyeCount.value = slit ? eyes.length : 0;
    // Höhlenring um Augäpfel (nicht um Schlitze), Stärke aus `augen.ring`
    this.uniforms.ringCount.value = slit ? 0 : eyes.length;
    this.uniforms.ringStaerke.value = b.augen.ring;
    if (!slit && eyes.length > 0) {
      this.eyeGeo = new SphereGeometry(1, 28, 20);
      for (const e of eyes) {
        // Auge folgt seinem Knochen (Oberkiefer hebt die Augen mit, Bild 5/14), sonst dem Träger
        const host = this.bones[e.bone] ?? this.bones[build.hostBone] ?? this.root;
        const hp = build.bones[e.bone]?.pos ?? build.bones[build.hostBone]?.pos ?? [0, 0, 0];
        const n = new Vector3(...e.normal).normalize();
        const r = e.radius;
        // Zentrum: in der Höhle (Tiefe) bzw. aufgesetzt; Blickachse (+z) zeigt entlang der Flächennormale nach außen
        // Tiefe je Typ: Drache/Schlange liegen tief unter dem Wulst (Bild 11), große Kulleraugen sitzen weiter außen (Bild 10)
        const typDepth = b.augen.typ === 'drache' || b.augen.typ === 'schlange' ? 0.62 : b.augen.typ === 'schwarzweiss' ? 0.45 : 0.3;
        const depth = Math.max(e.depth, (b.kopf.braue ?? 0) * 0.22, typDepth);
        // aufgesetzt (Tiefe 0): Halbkugel ragt heraus (Bild 10); eingesunken (Rex, Bild 11): Mitte unter der Fläche,
        // der Wulst hängt darüber — von der Seite ragt kein Ball mehr über die Silhouette
        const center = new Vector3(...e.pos).addScaledVector(n, r * (0.5 - 1.2 * depth));
        const m = new Mesh(this.eyeGeo, this.eyeMaterial);
        m.name = 'wesen-auge';
        m.scale.setScalar(r * 1.0);
        m.position.set(center.x - hp[0]!, center.y - hp[1]!, center.z - hp[2]!);
        // Augenrahmen: +z Blick (Normale), +y oben (Welt-oben projiziert), +x quer — das Lid dreht um x
        const yAx = UP.clone().addScaledVector(n, -UP.dot(n)).normalize();
        const xAx = new Vector3().crossVectors(yAx, n).normalize();
        m.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xAx, yAx, n));
        m.castShadow = false;
        host.add(m);
        this.eyeMeshes.push(m);
        // Oberlid als Kind des Augapfels: Halbkugel-Kappe (Pol +y), in Ruhe nach hinten gekippt (nur ein Saum oben
        // sichtbar), beim Blinzeln nach vorn über den Augapfel
        if (!this.lidGeo) this.lidGeo = new SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const lid = new Mesh(this.lidGeo, this.lidMaterial);
        lid.name = 'wesen-lid';
        lid.scale.setScalar(1.07);
        lid.rotation.x = LID_REST;
        lid.castShadow = false;
        m.add(lid);
        this.lidMeshes.push(lid);
      }
    }
    eyes.forEach((e, i) => {
      const n = new Vector3(...e.normal).normalize();
      const up = UP.clone().addScaledVector(n, -UP.dot(n)).normalize();
      const pos = this.uniforms.eyePos.array[i] as Vector4;
      pos.set(e.pos[0] + n.x * 0.002, e.pos[1] + n.y * 0.002, e.pos[2] + n.z * 0.002, e.radius * 2.2);
      const u4 = this.uniforms.eyeUp.array[i] as Vector4;
      u4.set(up.x, up.y, up.z, 1);
    });
    this.setStyle(b, this.stil);
    this.applyPose();
  }

  /** Spielt ein Verb (einfach): Maul auf/zu, Blinzeln, Laufen (an/aus). */
  play(action: 'maulAuf' | 'maulZu' | 'blinzeln' | 'laufen'): void {
    if (action === 'maulAuf') this.openness = 1;
    else if (action === 'maulZu') this.openness = 0;
    else if (action === 'blinzeln') this.blinkPhase = 0;
    else if (action === 'laufen') this.laufen = !this.laufen;
  }

  update(dt: number): void {
    this.elapsed += dt;
    // Uhr der Shader (Funkeln, Lavalampe): steht im Standbild, damit Bilder gleich bleiben
    if (this.breathe) this.uniforms.zeit.value += dt;
    // Kiefer zum Ziel
    const k = 1 - Math.exp(-dt * 9);
    this.opennessNow += (this.openness - this.opennessNow) * k;
    // Gang: Amplitude weich ein- und ausblenden, Phase läuft nur, solange Bewegung sichtbar ist (≈ 1,4 Schritte je Sekunde)
    this.laufAmp += ((this.laufen ? 1 : 0) - this.laufAmp) * (1 - Math.exp(-dt * 6));
    if (this.laufAmp > 0.001) this.laufPhase += dt * Math.PI * 2 * 1.4;
    else this.laufPhase = 0;
    // Blinzeln: Timer + Kurve (schnell zu, weicher auf)
    if (this.blinkHold !== null) {
      this.blink = this.blinkHold;
    } else if (this.blinkPhase < 0) {
      if (this.autoBlink) this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkPhase = 0;
        this.blinkTimer = 2.4 + Math.random() * 4;
      }
      this.blink = 0;
    } else {
      this.blinkPhase += dt;
      const u = this.blinkPhase / 0.17;
      this.blink = u < 0.4 ? Math.pow(u / 0.4, 0.6) : Math.max(0, 1 - Math.pow((u - 0.4) / 0.6, 1.4));
      if (u >= 1) {
        this.blinkPhase = -1;
        this.blink = 0;
      }
    }
    this.uniforms.blink.value = this.blink;
    for (const lid of this.lidMeshes) lid.rotation.x = LID_REST + (LID_CLOSED - LID_REST) * this.blink;
    this.applyPose();
  }

  private applyPose(): void {
    if (!this.build || !this.mesh) return;
    if (this.build.mouth && this.bauplan) {
      // eine Formel für Bau, Darstellung und Tests (siehe `jawTransforms`): der Schädel kippt um das Schädelgelenk und
      // hebt sich, der Unterkiefer dreht um sein mitwanderndes Gelenk. Hier als **absolute** Transformationen je Knochen;
      // die Kinder werden relativ zum (ebenfalls bewegten) Kopfknochen gesetzt — so bewegt sich auch mit, was Restgewicht
      // auf dem Kopf trägt (Hinterkopf, Augen, Mundwinkel)
      const B = this.build;
      const mo = this.build.mouth;
      const rig = jawRig(B, this.bauplan.maul);
      const pose = jawPose(rig, this.opennessNow);
      const A = new Vector3(...mo.skullHinge.point), J = new Vector3(...mo.hinge.point);
      const axis = this.jawAxis, fwd = this.hostForward, up = this.hostUp;
      // p → pivot + q·(p − pivot) + offset
      const compose = (q: Quaternion, pivot: Vector3, offset: Vector3): Matrix4 => new Matrix4().compose(pivot.clone().sub(pivot.clone().applyQuaternion(q)).add(offset), q, new Vector3(1, 1, 1));
      const tilt = (c: number): Matrix4 => {
        const q = new Quaternion().setFromAxisAngle(axis, pose.upperAngle * c).multiply(new Quaternion().setFromAxisAngle(fwd, pose.upperRoll * c));
        return compose(q, A, up.clone().multiplyScalar((pose.lift + pose.upperRise) * c));
      };
      const lower = (c: number): Matrix4 => {
        const qU = new Quaternion().setFromAxisAngle(axis, pose.upperAngle * c);
        const JA = J.clone().sub(A);
        const delta = JA.clone().applyQuaternion(qU).sub(JA);
        return compose(new Quaternion().setFromAxisAngle(axis, pose.lowerAngle * c), J, delta.add(up.clone().multiplyScalar((pose.lift - pose.lowerDrop) * c)));
      };
      const abs = new Map<number, Matrix4>();
      if (B.hostIstKopf) abs.set(B.hostBone, tilt(rig.kopfFrei));
      abs.set(B.upperJawBone, tilt(1));
      abs.set(B.napeBones[0], tilt(2 / 3));
      abs.set(B.napeBones[1], tilt(1 / 3));
      abs.set(B.jawBone, lower(1));
      abs.set(B.throatBones[0], lower(2 / 3));
      abs.set(B.throatBones[1], lower(1 / 3));
      // Ruhe-Weltmatrix eines Knochens = Verschiebung um seine Lage, Welt = Abs · T(pos); Lokalmatrix = Welt(Eltern)⁻¹ ·
      // Welt(Knochen) → Lage = (Abs_E⁻¹ · Abs)(pos) − pos_E, Drehung aus derselben Matrix. Eltern ohne Bewegung: Abs = 1
      const ident = new Matrix4();
      this.absRot.clear();
      for (const [bi, M] of abs) this.absRot.set(bi, new Quaternion().setFromRotationMatrix(M));
      for (const [bi, M] of abs) {
        const bone = this.bones[bi];
        const bb = B.bones[bi];
        if (!bone || !bb) continue;
        const parentAbs = bb.parent >= 0 ? (abs.get(bb.parent) ?? ident) : ident;
        const pp = bb.parent >= 0 ? B.bones[bb.parent]!.pos : [0, 0, 0];
        const local = new Matrix4().copy(parentAbs).invert().multiply(M);
        bone.position.copy(new Vector3(...bb.pos).applyMatrix4(local).sub(new Vector3(pp[0]!, pp[1]!, pp[2]!)));
        bone.quaternion.setFromRotationMatrix(local);
      }
      this.uniforms.spitzmund.value = pose.spitzmund;
      // Spitzmund-Zähne folgen der Öffnung und der Kieferdrehung (Versatz in den Knochenraum gedreht) — jedes Bild,
      // solange sich Öffnung oder Kieferwinkel ändern
      const rotKey = pose.lowerAngle * 7 + pose.upperAngle * 13 + pose.upperRoll * 17;
      if (this.toothSets.length > 0 && (Math.abs(pose.spitzmund - this.spitzmundTeeth) > 1e-5 || Math.abs(rotKey - this.toothRotKey) > 1e-5)) {
        this.spitzmundTeeth = pose.spitzmund;
        this.toothRotKey = rotKey;
        for (const set of this.toothSets) {
          const inv = set.bone >= 0 ? this.absRot.get(set.bone)?.clone().invert() : undefined;
          set.list.forEach((t, i) => set.im.setMatrixAt(i, toothMatrix(t, pose.spitzmund, _m, inv)));
          set.im.instanceMatrix.needsUpdate = true;
        }
      }
    }
    // Atmen: Körperknochen sanft skalieren (oben stärker)
    const bodyBones = this.build.groups.find((g) => g.kind === 'koerper')?.bones ?? [];
    const breath = this.breathe ? Math.sin(this.elapsed * 1.9) * 0.012 : 0;
    bodyBones.forEach((bi, i) => {
      const bone = this.bones[bi];
      if (!bone) return;
      const s = 1 + breath * (0.4 + 0.3 * i);
      bone.scale.set(s, 1 + breath * 0.5, s);
    });
    // Demo-Gang (Florian: Beine in Bewegung prüfen): Hüfte schwingt um die Querachse, Knie knickt im Schwung nach hinten,
    // Fuß hält die Sohle flach, Körper wippt zweimal je Schritt. Zweibeiner gegenphasig, Vierbeiner diagonal (Trab),
    // Achtbeiner wechselnd — reine Bewegung, kein Bodenkontaktmodell. Der Hüftschwung (Becken dreht und kippt mit dem
    // Schritt, Schultern halten leicht dagegen) kommt über die Rumpfknochen; der Oberschenkel selbst schwingt verhalten
    // (Florian: „bewegt sich zu heftig, unnatürlich, wenn die Hüfte sehr hoch sitzt“)
    const legGroups = this.build.groups.filter((g) => g.kind === 'bein');
    if (legGroups.length > 0) {
      const A = this.laufAmp;
      const n = legGroups.length;
      const X = new Vector3(1, 0, 0);
      const hoehe = this.bauplan ? Math.min(1, Math.max(0, this.bauplan.unterkoerper.beine.hoehe)) : 0.3;
      const ampHip = 0.26 * (1 - 0.4 * hoehe);
      const offsetOf = (i: number): number => (n === 2 ? (i % 2) * Math.PI : n === 4 ? (i === 0 || i === 3 ? 0 : Math.PI) : ((i + (i >> 1)) % 2) * Math.PI);
      legGroups.forEach((g, i) => {
        const ph = this.laufPhase + offsetOf(i);
        // Stand 0 … π: das Bein streicht nach hinten; Schwung π … 2π: nach vorn mit angewinkeltem Knie
        const hip = -ampHip * A * Math.cos(ph);
        const knee = 0.7 * A * Math.max(0, -Math.sin(ph));
        const [bHip, bKnee, bFoot] = g.bones;
        const hipB = bHip !== undefined ? this.bones[bHip] : undefined;
        const kneeB = bKnee !== undefined ? this.bones[bKnee] : undefined;
        const footB = bFoot !== undefined ? this.bones[bFoot] : undefined;
        if (hipB) hipB.quaternion.setFromAxisAngle(X, hip);
        if (kneeB) kneeB.quaternion.setFromAxisAngle(X, knee);
        if (footB) footB.quaternion.setFromAxisAngle(X, -0.6 * knee - 0.5 * hip);
      });
      // Hüftschwung (Florian: „der Hintern wackelt hin und her wie bei Goldies“): das Becken dreht um eine senkrechte
      // Achse **an der Brust** (Drehung plus Versatz, damit die Brust steht und das Hinterteil ausschlägt), kippt leicht
      // zur Seite des vorschwingenden hinteren linken Beins; Mitte und Schultern drehen je zur Hälfte zurück — die
      // Wirbelsäule knickt, Kopf und Brust bleiben ruhig, der Schwanz wedelt mit
      const links = n === 4 ? 2 : 0;
      const phL = this.laufPhase + offsetOf(links);
      const yaw = (n >= 8 ? 0 : 0.2) * A * Math.cos(phL);
      const roll = (n >= 8 ? 0 : 0.06) * A * Math.sin(phL);
      const becken = this.bones[bodyBones[0] ?? -1];
      const mitte = this.bones[bodyBones[1] ?? -1];
      const schulter = this.bones[bodyBones[2] ?? -1];
      const restB = this.restLocal[bodyBones[0] ?? -1];
      if (becken && restB) {
        becken.quaternion.setFromEuler(new Euler(0, yaw, roll));
        const Lf = 0.55 * this.build.bodyScale;
        becken.position.set(restB.x - Lf * Math.sin(yaw), restB.y, restB.z + Lf * (1 - Math.cos(yaw)));
      }
      if (mitte) mitte.quaternion.setFromEuler(new Euler(0, -0.5 * yaw, -0.5 * roll));
      if (schulter) schulter.quaternion.setFromEuler(new Euler(0, -0.5 * yaw, -0.5 * roll));
      const bob = 0.018 * this.build.bodyScale * A * (0.5 - 0.5 * Math.cos(2 * this.laufPhase));
      this.mesh.position.set(0.01 * this.build.bodyScale * A * Math.sin(phL), bob, 0);
      if (this.upperTeeth && this.upperTeeth.parent === this.root) this.upperTeeth.position.copy(this.mesh.position);
    }
  }

  private clearMesh(): void {
    if (this.mesh) {
      this.root.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    this.upperTeeth?.removeFromParent();
    this.lowerTeeth?.removeFromParent();
    this.tongue?.removeFromParent();
    for (const m of this.eyeMeshes) m.removeFromParent();
    this.eyeMeshes = [];
    this.lidMeshes = [];
    this.eyeGeo?.dispose();
    this.eyeGeo = null;
    this.lidGeo?.dispose();
    this.lidGeo = null;
    this.toothGeo?.dispose();
    this.tongueGeo?.dispose();
    this.upperTeeth = this.lowerTeeth = null;
    this.toothSets = [];
    this.spitzmundTeeth = 0;
    this.toothRotKey = 0;
    this.tongue = null;
    this.toothGeo = this.tongueGeo = null;
    this.skeleton = null;
    this.bones = [];
  }

  dispose(): void {
    this.clearMesh();
    this.material.dispose();
    this.jellyMaterial.dispose();
    this.eyeMaterial.dispose();
    this.lidMaterial.dispose();
    this.toothMaterial.dispose();
    this.tongueMaterial.dispose();
    this.root.removeFromParent();
  }
}
