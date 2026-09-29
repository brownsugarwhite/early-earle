import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';

export interface TrunkSpec {
  height: number;
  baseRadius: number;
  topRadius: number;
  /** Gesamtverdrehung über die Höhe (rad) — Lappen und Rindenbänder drehen mit. */
  twist: number;
  /** Zahl der Wurzelanläufe/Lappen am Fuß (5–8). */
  lobes: number;
  /** Mesh-Auflösung (beeinflusst die Form nicht). */
  rings: number;
  segments: number;
  rootCount: number;
  rootLength: number;
  /** Seitliche Neigung der Achse an der Spitze (Welteinheiten). */
  lean: number;
  seed: number;
}

/** Wurzel-Mittellinie: Punkte (x, z, Kammhöhe, halbe Breite, radialer Abstand). */
export interface RootLine {
  pts: Array<[number, number, number, number, number]>;
  depth: number;
  uBase: number;
}

/** Reine Form des Stamms (ohne GPU-Objekte) — Grundlage für Mesh und Levelpfad. */
export interface TrunkProfile {
  spec: TrunkSpec;
  /** Größter Radius (inkl. Lappen) auf Höhe y. */
  radiusAt(y: number): number;
  /** Oberflächenradius auf Höhe y in Weltrichtung `angle` (rad, atan2(z, x) um die Achse). */
  surfaceAt(y: number, angle: number): number;
  /** Achsenpunkt auf Höhe y (der Stamm lehnt leicht). */
  axisAt(y: number, out: Vector3): Vector3;
  top: Vector3;
  topRadius: number;
  roots: RootLine[];
  /** Spitzen der Hauptwurzeln auf dem Boden (Startpunkt des Pfads). */
  rootTips: Vector3[];
  /** Umfang in der Stammmitte und Höhe (Welteinheiten). */
  surfaceUnits: [number, number];
}

export interface TrunkBuild extends TrunkProfile {
  geometry: BufferGeometry;
}

/**
 * Form des Riesenstamms (Ebene 21/35): verjüngt, leicht geneigt, am Fuß aufgefächert in `lobes` Wurzelanläufe,
 * die mit der Rinde um `twist` mitdrehen; `rootCount` Wurzelgrate entspringen den Lappenkämmen und verzweigen
 * zweimal (Fraktal). Deterministisch aus `seed`.
 */
export function trunkProfile(spec: TrunkSpec): TrunkProfile {
  const H = spec.height;
  const rMean = (t: number): number => spec.topRadius + (spec.baseRadius - spec.topRadius) * Math.pow(Math.max(0, 1 - t), 1.7) + spec.baseRadius * 1.15 * Math.exp(-t * 9);
  const lobeAmp = (t: number): number => 0.5 * Math.exp(-t * 4) + 0.06;
  /** Radius beim unverdrehten Umlaufparameter phi. */
  const shape = (t: number, phi: number): number => rMean(t) * (1 + lobeAmp(t) * (0.5 + 0.5 * Math.cos(spec.lobes * phi)));
  const axis = (t: number, out: Vector3): Vector3 => out.set(spec.lean * t * t, t * H, 0.25 * spec.lean * Math.sin(t * 2.6));

  // --- Wurzeln: entspringen den Lappenkämmen, je zwei Verzweigungsstufen ---------------------------------
  const rand = mulberry32(hash32('hero-roots', spec.seed));
  const roots: RootLine[] = [];
  const rootTips: Vector3[] = [];
  const addRoot = (phi0: number, rho0: number, len: number, w0: number, h0: number, depth: number, uBase: number) => {
    const steps = 14;
    const bend = (rand() - 0.5) * 0.8;
    const pts: RootLine['pts'] = [];
    for (let s = 0; s <= steps; s++) {
      const q = s / steps;
      const phi = phi0 + bend * q * q + 0.18 * Math.sin(q * 3.1 + phi0 * 2) * q;
      const rho = rho0 + len * q;
      pts.push([rho * Math.cos(phi), rho * Math.sin(phi), h0 * Math.pow(1 - q, 1.35) + 0.03, w0 * Math.pow(1 - q, 0.85) + 0.07, rho]);
    }
    roots.push({ pts, depth, uBase });
    const tip = pts[steps]!;
    if (depth === 0) rootTips.push(new Vector3(tip[0], 0, tip[1]));
    if (depth < 2) {
      const k = depth === 0 ? 2 : 1;
      for (let c = 0; c < k; c++) {
        const q = depth === 0 ? 0.35 + 0.3 * c : 0.5;
        const at = pts[Math.round(q * steps)]!;
        const side = c % 2 === 0 ? 1 : -1;
        const phiAt = Math.atan2(at[1], at[0]);
        addRoot(phiAt + side * (0.45 + rand() * 0.3), at[4] - 0.2, len * (0.42 + rand() * 0.18), at[3] * 0.55, at[2] * 0.7, depth + 1, uBase + side * 0.08);
      }
    }
  };
  const crest = (2 * Math.PI) / spec.lobes;
  const phiOffset = Math.floor(rand() * spec.lobes) * crest;
  for (let k = 0; k < spec.rootCount; k++) {
    // auf den nächsten Lappenkamm schnappen (cos(lobes·φ) = 1 am Fuß, t = 0 → keine Verdrehung)
    const phi = Math.round((phiOffset + (k / spec.rootCount) * Math.PI * 2) / crest) * crest;
    const len = spec.rootLength * (0.65 + 0.6 * rand());
    addRoot(phi, rMean(0.02) * 0.75, len, 1.0 + 0.4 * rand(), 1.25 + 0.4 * rand(), 0, phi / (Math.PI * 2));
  }

  const top = axis(1, new Vector3());
  top.y = H;
  return {
    spec,
    radiusAt: (y) => {
      const t = Math.min(1, Math.max(0, y / H));
      return rMean(t) * (1 + lobeAmp(t));
    },
    surfaceAt: (y, angle) => {
      const t = Math.min(1, Math.max(0, y / H));
      return shape(t, angle - spec.twist * t);
    },
    axisAt: (y, out) => axis(Math.min(1, Math.max(0, y / H)), out),
    top,
    topRadius: rMean(1),
    roots,
    rootTips,
    surfaceUnits: [Math.PI * 2 * rMean(0.5), H],
  };
}

/**
 * Mesh des Stamms mit Wurzelgraten: Ringe mit duplizierter Naht (Rindenkoordinate `bark` = (u Umlauf, v Höhe)),
 * `barkCirc` = Umfang am Ring (isotrope Flechtenzellen), Kappe über dem Stamm, Wurzeln als dreieckige Grate.
 */
export function buildTrunk(input: TrunkSpec | TrunkProfile): TrunkBuild {
  const profile = 'radiusAt' in input ? input : trunkProfile(input);
  const spec = profile.spec;
  const H = spec.height;
  const rMean = (t: number): number => spec.topRadius + (spec.baseRadius - spec.topRadius) * Math.pow(Math.max(0, 1 - t), 1.7) + spec.baseRadius * 1.15 * Math.exp(-t * 9);
  const lobeAmp = (t: number): number => 0.5 * Math.exp(-t * 4) + 0.06;
  const pos: number[] = [];
  const bark: number[] = [];
  const circ: number[] = [];
  const idx: number[] = [];
  const a = new Vector3();

  const rings: Array<{ t: number; y: number; rf: number }> = [];
  for (let i = 0; i <= spec.rings; i++) {
    const t = i / spec.rings;
    rings.push({ t, y: t * H, rf: 1 });
  }
  // Kappe: zwei Ringe, die sich über dem Stamm schließen (Äste bedecken sie fast)
  rings.push({ t: 1, y: H + 0.35, rf: 0.62 });
  rings.push({ t: 1, y: H + 0.6, rf: 0.001 });
  const N = spec.segments;
  for (const ring of rings) {
    profile.axisAt(ring.t * H, a);
    const ringCirc = Math.PI * 2 * rMean(ring.t) * (1 + 0.5 * lobeAmp(ring.t));
    for (let j = 0; j <= N; j++) {
      const phi = (j / N) * Math.PI * 2;
      const phiG = phi + spec.twist * ring.t;
      const r = rMean(ring.t) * (1 + lobeAmp(ring.t) * (0.5 + 0.5 * Math.cos(spec.lobes * phi))) * ring.rf;
      pos.push(a.x + r * Math.cos(phiG), ring.y, a.z + r * Math.sin(phiG));
      bark.push(j / N, ring.t + (ring.y - ring.t * H) / H);
      circ.push(ringCirc);
    }
  }
  const ringVerts = N + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const v0 = i * ringVerts + j;
      const v1 = v0 + ringVerts;
      idx.push(v0, v1, v0 + 1, v1, v1 + 1, v0 + 1);
    }
  }

  const baseR = rMean(0) * (1 + lobeAmp(0));
  const rootCirc = Math.PI * 2 * rMean(0);
  for (const root of profile.roots) {
    const base = pos.length / 3;
    const steps = root.pts.length - 1;
    for (let s = 0; s <= steps; s++) {
      const [cx, cz, h, w, rho] = root.pts[s]!;
      const n = root.pts[Math.min(steps, s + 1)]!;
      const pv = root.pts[Math.max(0, s - 1)]!;
      let dx = n[0] - pv[0];
      let dz = n[1] - pv[1];
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;
      const lx = -dz;
      const lz = dx;
      const v = -(rho - baseR) / H;
      pos.push(cx + lx * w, -0.06, cz + lz * w, cx, h, cz, cx - lx * w, -0.06, cz - lz * w);
      bark.push(root.uBase - 0.15, v, root.uBase, v, root.uBase + 0.15, v);
      circ.push(rootCirc, rootCirc, rootCirc);
    }
    for (let s = 0; s < steps; s++) {
      const L0 = base + s * 3;
      const C0 = L0 + 1;
      const R0 = L0 + 2;
      const L1 = L0 + 3;
      const C1 = L1 + 1;
      const R1 = L1 + 2;
      idx.push(L0, C0, L1, L1, C0, C1, C0, R0, C1, R0, R1, C1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setAttribute('bark', new Float32BufferAttribute(bark, 2));
  geometry.setAttribute('barkCirc', new Float32BufferAttribute(circ, 1));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { ...profile, geometry };
}
