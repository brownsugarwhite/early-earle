import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicNodeMaterial, PerspectiveCamera, Uint32BufferAttribute } from 'three/webgpu';
import { float, uniform, vec3 } from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';

/**
 * Vordergrund-Ast (Welt 12, Ebene 7): von oben links hängt ein feiner, fraktaler Ast ins Bild — ein dunkler, gewundener
 * Hauptast, von dem hängende Zweige in immer feineren Gabelungen abgehen, besetzt mit winzigen Blattpunkten (Spitzenwerk)
 * und an den Zweigspitzen Nadelsterne. Ornament aus feinen Linien (keine Kontur): eine flache Zeichnung in der
 * Bildebene, fest an der Kamera, immer vorn, skaliert mit dem Bildformat (hoch: kleiner in der Ecke).
 *
 * Einheit der Zeichnung: Bildhöhe = 1, Ursprung oben links, u nach rechts, v nach unten.
 */
export interface ForegroundBranch {
  readonly group: Group;
  /** An den Kamerastumpf legen (nach Größenänderung oder FOV-Wechsel). */
  layout(camera: PerspectiveCamera): void;
  /** Deckkraft 0..1 (Ein-/Ausblenden mit der Weltwahl). */
  setOpacity(value: number): void;
  dispose(): void;
}

interface Stroke {
  pts: Array<[number, number]>;
  w0: number;
  w1: number;
}

/** Tiefe der Zeichnung vor der Kamera (Welteinheiten): nah genug für den Vordergrund, weiter als die Nahebene. */
const DEPTH = 2.2;

function buildDrawing(seed: number): { strokes: Stroke[]; dots: Array<[number, number, number]>; stars: Array<[number, number, number]> } {
  const rand = mulberry32(hash32('foreground-branch', seed));
  const strokes: Stroke[] = [];
  const dots: Array<[number, number, number]> = [];
  const stars: Array<[number, number, number]> = [];
  /** Gewundene Linie von p in Richtung a (rad, 0 = nach rechts, π/2 = nach unten), Länge len, Schwerkraft g. */
  const wander = (x: number, y: number, a: number, len: number, g: number, kink: number): Array<[number, number]> => {
    const n = Math.max(3, Math.round(len / 0.012));
    const out: Array<[number, number]> = [[x, y]];
    let ang = a;
    for (let i = 1; i <= n; i++) {
      ang += (rand() - 0.5) * kink + g * Math.cos(ang) * 0.06;
      x += Math.cos(ang) * (len / n);
      y += Math.sin(ang) * (len / n);
      out.push([x, y]);
    }
    return out;
  };
  const twig = (x: number, y: number, a: number, len: number, w: number, depth: number): void => {
    const pts = wander(x, y, a, len, 1, 0.5);
    strokes.push({ pts, w0: w, w1: w * 0.35 });
    // Spitzenwerk: winzige Blattpunkte an beiden Seiten
    for (let i = 1; i < pts.length; i++) {
      // Blattpunkte paarweise rechts und links des Zweigs (Fischgräten-Spitze wie in Ebene 7)
      const [px, py] = pts[i]!;
      const [qx, qy] = pts[i - 1]!;
      const dl = Math.hypot(px - qx, py - qy) || 1;
      const nx = -(py - qy) / dl;
      const ny = (px - qx) / dl;
      for (const side of [1, -1]) {
        if (rand() < 0.7) dots.push([px + nx * side * 0.004, py + ny * side * 0.004 + 0.0015, 0.0013 + rand() * 0.001]);
      }
    }
    const end = pts[pts.length - 1]!;
    if (depth <= 0 || len < 0.03) {
      if (rand() < 0.45) stars.push([end[0], end[1], 0.006 + rand() * 0.004]);
      return;
    }
    // Gabelung: zwei bis drei hängende Zweige, feiner und kürzer
    const forks = 2 + (rand() < 0.4 ? 1 : 0);
    for (let k = 0; k < forks; k++) {
      const at = pts[Math.min(pts.length - 1, Math.floor(pts.length * (0.45 + 0.5 * rand())))]!;
      const na = Math.PI / 2 + (rand() - 0.5) * 1.6;
      twig(at[0], at[1], na, len * (0.55 + 0.25 * rand()), w * 0.6, depth - 1);
    }
    if (rand() < 0.25) stars.push([end[0], end[1], 0.006 + rand() * 0.004]);
  };
  // Hauptast: vom oberen Rand gewunden nach unten links, mit Knoten
  const main = wander(0.3, -0.02, Math.PI * 0.62, 0.72, 0.4, 0.28);
  strokes.push({ pts: main, w0: 0.018, w1: 0.006 });
  // Nebenäste entlang des Hauptasts (hängend, fächernd)
  for (let i = 3; i < main.length - 1; i += 2 + Math.floor(rand() * 3)) {
    const [px, py] = main[i]!;
    const t = i / main.length;
    const right = rand() < 0.55;
    const a = right ? 0.35 + rand() * 0.5 : Math.PI - 0.2 - rand() * 0.5;
    twig(px, py, a, 0.14 + 0.16 * (1 - t) * rand() + 0.06, 0.0055 * (1 - 0.5 * t), 3);
  }
  // Ein zweiter Ast oben, fast waagrecht nach rechts (Ebene 7: Zweige über dem Nebel)
  const upper = wander(0.12, 0.0, 0.35, 0.3, 0.6, 0.35);
  strokes.push({ pts: upper, w0: 0.007, w1: 0.003 });
  for (let i = 2; i < upper.length; i += 2) twig(upper[i]![0], upper[i]![1], Math.PI / 2 + (rand() - 0.5) * 1.2, 0.08 + 0.08 * rand(), 0.0035, 2);
  return { strokes, dots, stars };
}

export function createForegroundBranch(color = '#1b1408', seed = 7): ForegroundBranch {
  const { strokes, dots, stars } = buildDrawing(seed);
  const pos: number[] = [];
  const idx: number[] = [];
  const quad = (ax: number, ay: number, bx: number, by: number, wa: number, wb: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const base = pos.length / 3;
    pos.push(ax + nx * wa, ay + ny * wa, 0, ax - nx * wa, ay - ny * wa, 0, bx + nx * wb, by + ny * wb, 0, bx - nx * wb, by - ny * wb, 0);
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  };
  for (const s of strokes) {
    const n = s.pts.length;
    for (let i = 0; i < n - 1; i++) {
      const t0 = i / (n - 1);
      const t1 = (i + 1) / (n - 1);
      const [ax, ay] = s.pts[i]!;
      const [bx, by] = s.pts[i + 1]!;
      // Überlappung an den Gelenken (keine Lücken bei Knicken)
      const ex = (bx - ax) * 0.15;
      const ey = (by - ay) * 0.15;
      quad(ax - ex, ay - ey, bx + ex, by + ey, (s.w0 + (s.w1 - s.w0) * t0) * 0.5, (s.w0 + (s.w1 - s.w0) * t1) * 0.5);
    }
  }
  const disc = (cx: number, cy: number, r: number) => {
    const base = pos.length / 3;
    pos.push(cx, cy, 0);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      pos.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0);
    }
    for (let k = 0; k < 6; k++) idx.push(base, base + 1 + k, base + 1 + ((k + 1) % 6));
  };
  for (const [x, y, r] of dots) disc(x, y, r);
  // Nadelsterne: feine Strahlen um die Zweigspitze
  for (const [x, y, r] of stars) {
    const rays = 9;
    for (let k = 0; k < rays; k++) {
      const a = (k / rays) * Math.PI * 2 + x * 31;
      quad(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 0.0007, 0.0003);
    }
    disc(x, y, 0.0022);
  }
  // Zeichnung (u rechts, v unten) → Bildebene (x rechts, y oben); Maßstab und Lage setzt `layout`
  for (let i = 1; i < pos.length; i += 3) pos[i] = -pos[i]!;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setIndex(new Uint32BufferAttribute(idx, 1));
  geometry.computeBoundingSphere();
  const opacity = uniform(1);
  // beidseitig: die Zeichnung ist gespiegelt aufgebaut (v nach unten), die Wicklung spielt keine Rolle
  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false, side: DoubleSide });
  material.name = 'earle-foreground-branch';
  const c = hexToLinear(color);
  material.colorNode = vec3(c[0], c[1], c[2]);
  material.opacityNode = float(1).mul(opacity);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'foreground-branch';
  mesh.frustumCulled = false;
  mesh.renderOrder = 50;
  const group = new Group();
  group.name = 'ForegroundBranch';
  group.add(mesh);
  return {
    group,
    layout(camera: PerspectiveCamera) {
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * DEPTH;
      const halfW = halfH * camera.aspect;
      // Bildhöhe = 1 Zeichnungseinheit; im Hochformat kleiner, damit der Ast in der Ecke bleibt
      const k = 2 * halfH * Math.min(1, 0.95 * camera.aspect + 0.2);
      mesh.scale.set(k, k, 1);
      mesh.position.set(-halfW, halfH, -DEPTH);
    },
    setOpacity(value: number) {
      opacity.value = Math.min(1, Math.max(0, value));
      mesh.visible = opacity.value > 0.001;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      group.removeFromParent();
    },
  };
}

function hexToLinear(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return [f((v >> 16) & 255), f((v >> 8) & 255), f(v & 255)];
}
