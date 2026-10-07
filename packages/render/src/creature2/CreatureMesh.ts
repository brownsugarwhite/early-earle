import { Bone, BufferAttribute, BufferGeometry, ConeGeometry, Float32BufferAttribute, Group, InstancedMesh, InterleavedBuffer, InterleavedBufferAttribute, Matrix4, Mesh, Quaternion, Skeleton, SkinnedMesh, SphereGeometry, Uint16BufferAttribute, Vector3, Vector4 } from 'three/webgpu';
import type { MeshBasicNodeMaterial } from 'three/webgpu';
import type { Bauplan, CreatureBuild } from '@ee/creature';
import { applyStil, createCreatureMaterial, createCreatureUniforms, createTongueMaterial, createToothMaterial, MAX_SLIT_EYES, type CreatureColors, type CreatureMaterialUniforms } from './material/earleCreature';
import { applyMuster } from './material/muster';
import { applyJellyColors, createJellyMaterial, createJellyUniforms, placeBubbles, type JellyUniforms } from './material/jelly';
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
const _q = new Quaternion();
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();

function colorsOf(b: Bauplan): CreatureColors {
  const f = b.muster.farben;
  return { grund: f.grund, bauch: f.bauch, muster: f.muster, akzent: f.akzent, lippe: f.lippe, rachen: f.rachen, auge: f.auge };
}

function toothGeometry(stil: 'rund' | 'spitz'): BufferGeometry {
  let g: BufferGeometry;
  if (stil === 'rund') {
    g = new SphereGeometry(0.5, 12, 10);
    g.scale(1, 1.0, 1);
    g.translate(0, 0.5, 0);
  } else {
    g = new ConeGeometry(0.5, 1, 12, 1, false);
    g.translate(0, 0.5, 0);
  }
  const pos = g.getAttribute('position');
  const t = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) t[i] = Math.min(1, Math.max(0, pos.getY(i)));
  g.setAttribute('eeTooth', new Float32BufferAttribute(t, 1));
  return g;
}

export class CreatureMesh {
  readonly root = new Group();
  readonly uniforms: CreatureMaterialUniforms;
  readonly material: MeshBasicNodeMaterial;
  readonly jellyMaterial: MeshBasicNodeMaterial;
  readonly jelly: JellyUniforms;
  private toothMaterial: MeshBasicNodeMaterial;
  private tongueMaterial: MeshBasicNodeMaterial;
  mesh: SkinnedMesh | null = null;
  skeleton: Skeleton | null = null;
  bones: Bone[] = [];
  build: CreatureBuild | null = null;
  private jawAxis = new Vector3(1, 0, 0);
  private jawBuildOpen = 0.3;
  private closeAngle = 0.2;
  private maxOpenAngle = 0.6;
  private upperTeeth: InstancedMesh | null = null;
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
  /** Blinzeln 0 (offen) … 1 (zu). */
  blink = 0;
  private blinkTimer = 2.5;
  private blinkPhase = -1;
  /** Atmen an/aus. */
  breathe = true;
  private elapsed = 0;

  constructor(opts: CreatureMeshOptions = {}) {
    this.stil = opts.stil ?? STIL_STANDARD;
    this.castShadow = opts.castShadow ?? true;
    this.uniforms = createCreatureUniforms({ grund: '#9c6cc7', bauch: '#d9c7ec', muster: '#3d2457', akzent: '#f08a4b', lippe: '#5a2f6b', rachen: '#6e2334', auge: '#101418' }, this.stil, 1);
    this.material = createCreatureMaterial(this.uniforms);
    this.jelly = createJellyUniforms();
    this.jellyMaterial = createJellyMaterial(this.uniforms, this.jelly);
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
    applyJellyColors(this.jelly, b.muster.farben.grund, b.muster.farben.muster, stil);
    placeBubbles(this.jelly, this.build?.bodyScale ?? b.koerper.hoehe, b.material === 'jelly' ? 9 : 0, b.seed);
    if (this.mesh) this.mesh.material = b.material === 'jelly' ? this.jellyMaterial : this.material;
    this.uniforms.bauchlinie.value = (b.muster.bauchlinie - 0.5) * 1.6;
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
    // Spine (4) · Region (4) · Extra (AO, Dicke) · Verschluss (3) · Spitzmund (3) = 16 Floats je Vertex
    const n = build.positions.length / 3;
    const packed = new Float32Array(n * 16);
    const d = build.descriptors;
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
      packed[o + 10] = build.closed[v * 3]!;
      packed[o + 11] = build.closed[v * 3 + 1]!;
      packed[o + 12] = build.closed[v * 3 + 2]!;
      packed[o + 13] = build.pucker[v * 3]!;
      packed[o + 14] = build.pucker[v * 3 + 1]!;
      packed[o + 15] = build.pucker[v * 3 + 2]!;
    }
    const ib = new InterleavedBuffer(packed, 16);
    g.setAttribute('eeSpine', new InterleavedBufferAttribute(ib, 4, 0));
    g.setAttribute('eeRegion', new InterleavedBufferAttribute(ib, 4, 4));
    g.setAttribute('eeExtra', new InterleavedBufferAttribute(ib, 2, 8));
    g.setAttribute('eeClosed', new InterleavedBufferAttribute(ib, 3, 10));
    g.setAttribute('eePucker', new InterleavedBufferAttribute(ib, 3, 13));
    g.setIndex(new BufferAttribute(build.index, 1));
    g.computeBoundingSphere();
    // --- Skelett: Knochen mit Identitätsdrehung, Position relativ zum Elternknochen ---------------------------------
    this.bones = build.bones.map((bb) => {
      const bone = new Bone();
      bone.name = `wesen-${bb.name}`;
      return bone;
    });
    build.bones.forEach((bb, i) => {
      const bone = this.bones[i]!;
      const parent = bb.parent >= 0 ? build.bones[bb.parent]!.pos : [0, 0, 0];
      bone.position.set(bb.pos[0] - parent[0]!, bb.pos[1] - parent[1]!, bb.pos[2] - parent[2]!);
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
      this.jawBuildOpen = build.mouth.oeffnung;
      this.closeAngle = build.closeAngle;
      this.maxOpenAngle = build.maxOpenAngle;
    }
    // --- Zähne und Zunge ------------------------------------------------------------------------------------------------
    const stilZ = b.zaehne.stil;
    if (build.mouth && stilZ !== 'keine' && build.mouth.teeth.length > 0) {
      this.toothGeo = toothGeometry(stilZ);
      const upper = build.mouth.teeth.filter((t) => t.upper);
      const lower = build.mouth.teeth.filter((t) => !t.upper);
      const make = (list: typeof upper, parent: Bone | Group, offset: Vector3 | null): InstancedMesh | null => {
        if (list.length === 0) return null;
        const im = new InstancedMesh(this.toothGeo!, this.toothMaterial, list.length);
        im.name = 'wesen-zaehne';
        im.frustumCulled = false;
        im.castShadow = this.castShadow;
        list.forEach((t, i) => {
          _p.set(...t.pos);
          _q.setFromUnitVectors(UP, new Vector3(...t.dir).normalize());
          _s.set(t.size * 0.55, t.size, t.size * 0.55);
          _m.compose(_p, _q, _s);
          im.setMatrixAt(i, _m);
        });
        im.instanceMatrix.needsUpdate = true;
        if (offset) im.position.copy(offset);
        parent.add(im);
        return im;
      };
      this.upperTeeth = make(upper, this.root, null);
      const jaw = this.bones[build.jawBone];
      if (jaw) {
        const jp = build.bones[build.jawBone]!.pos;
        this.lowerTeeth = make(lower, jaw, new Vector3(-jp[0], -jp[1], -jp[2]));
      }
    }
    if (build.mouth && b.maul.sichtbar && b.zunge.groesse > 0.02) {
      const s = build.mouth.tongue.size;
      this.tongueGeo = new SphereGeometry(1, 16, 12);
      this.tongueGeo.scale(s * 0.9, s * 0.32, s * 1.25);
      const tongue = new Mesh(this.tongueGeo, this.tongueMaterial);
      tongue.name = 'wesen-zunge';
      const jaw = this.bones[build.jawBone];
      const jp = build.bones[build.jawBone]!.pos;
      tongue.position.set(build.mouth.tongue.pos[0] - jp[0], build.mouth.tongue.pos[1] - jp[1], build.mouth.tongue.pos[2] - jp[2]);
      _q.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...build.mouth.tongue.dir).normalize());
      tongue.quaternion.copy(_q);
      (jaw ?? this.root).add(tongue);
      this.tongue = tongue;
    }
    // --- Augen (Schlitze im Material) --------------------------------------------------------------------------------------
    const eyes = build.eyes.slice(0, MAX_SLIT_EYES);
    this.uniforms.eyeCount.value = eyes.length;
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

  /** Spielt ein Verb (einfach): Maul auf/zu, Blinzeln. */
  play(action: 'maulAuf' | 'maulZu' | 'blinzeln'): void {
    if (action === 'maulAuf') this.openness = 1;
    else if (action === 'maulZu') this.openness = 0;
    else if (action === 'blinzeln') this.blinkPhase = 0;
  }

  update(dt: number): void {
    this.elapsed += dt;
    // Kiefer zum Ziel
    const k = 1 - Math.exp(-dt * 9);
    this.opennessNow += (this.openness - this.opennessNow) * k;
    // Blinzeln: Timer + Kurve (schnell zu, weicher auf)
    if (this.blinkPhase < 0) {
      this.blinkTimer -= dt;
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
    this.applyPose();
  }

  private applyPose(): void {
    if (!this.build || !this.mesh) return;
    const jaw = this.bones[this.build.jawBone];
    if (jaw && this.build.mouth) {
      // Bauzustand = Öffnung o_b: darunter schließt der Kiefer um closeAngle, darüber öffnet er bis maxOpenAngle
      const o = this.opennessNow;
      const ob = Math.max(1e-3, this.jawBuildOpen);
      const form = this.bauplan?.maul.form ?? 1;
      const angle = (o < ob ? -(1 - o / ob) * this.closeAngle : ((o - ob) / Math.max(1e-3, 1 - ob)) * this.maxOpenAngle) * form;
      jaw.quaternion.setFromAxisAngle(this.jawAxis, angle);
      // Verschluss-Morph greift beim Schließen, Spitzmund-Morph beim Weiten des Lochmauls
      const t = 1 - Math.min(1, o / ob);
      this.uniforms.verschluss.value = t * t * (3 - 2 * t);
      this.uniforms.spitzmund.value = Math.max(0, (o - ob) / Math.max(1e-3, 1 - ob));
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
    this.toothGeo?.dispose();
    this.tongueGeo?.dispose();
    this.upperTeeth = this.lowerTeeth = null;
    this.tongue = null;
    this.toothGeo = this.tongueGeo = null;
    this.skeleton = null;
    this.bones = [];
  }

  dispose(): void {
    this.clearMesh();
    this.material.dispose();
    this.jellyMaterial.dispose();
    this.toothMaterial.dispose();
    this.tongueMaterial.dispose();
    this.root.removeFromParent();
  }
}
