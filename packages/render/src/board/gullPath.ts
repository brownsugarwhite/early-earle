/**
 * Möwenschatten, reine Geometrie (ohne three.js, getestet in `gullPath.test.ts`).
 *
 * **Entworfen wird der Bodenschatten, nicht der Vogel.** Die Umrissform liegt in (u, v) — u entlang der Flugrichtung,
 * v nach rechts — und wird auf dem Boden um das Earle-Maß 1,35 entlang der sonnenabgewandten Richtung gestreckt. Der
 * unsichtbare Werfer ist eine zur Sonne gedrehte Fläche: Spalten `Fp = F − L(F·L)`, `Rp = R − L(R·L)`, Ursprung
 * `C + L·h/L.y`. Jeder Eckpunkt fällt entlang der Sonne exakt auf `C + S(uF + vR)`, und weil die Fläche der Sonne zugewandt
 * ist, nutzt der Schatten die volle Auflösung der Schattenkarte (flach am Boden läge sie bei 10° Sonne fast auf der Kante).
 *
 * Flug: diagonal über den Bildschirm (±35°/45°/55° zur Bildschirm-Senkrechten, gemessen an der Kamera), ≈ 8,5 Einheiten/s,
 * sanfter Bogen, der Schatten steht beim Loslassen genau über der Zielzelle. Flügelschlag 3,2 Hz (der Aufschlag verkürzt die
 * Spannweite um cos φ und faltet die Hand), Gleiten mit voller Spannweite um den Abwurf (größter Schatten beim Abwurf), ein
 * Ruck beim Loslassen, danach zwei Schläge und eine Schräglage im Abflug.
 */

import type { GullTimes } from '@ee/core';

/** Earle-Streckung des Bodenschattens entlang der sonnenabgewandten Richtung. */
export const GULL_STRETCH = 1.35;
/** Flughöhe des Werfers über dem Brett (Einheiten); bei großer Spannweite etwas tiefer, siehe `GULL_MAX_HEIGHT`. */
export const GULL_HEIGHT = 1.4;
/** Kein Werfer-Eckpunkt liegt höher (Kaskaden fassen Werfer bis 1,8 im Grid-Lab, 2,5 im Flow). */
export const GULL_MAX_HEIGHT = 1.58;
/** Fluggeschwindigkeit des Schattens (Einheiten/s): schnell genug, um außerhalb des Bilds zu starten, langsam genug, dass
 * man den Vogel über dem Brett erkennt. */
export const GULL_SPEED = 7.5;
/** Flügelschläge je Sekunde. */
export const GULL_FLAP_HZ = 3.2;

/** Spannweite aus der Brettbreite (Einheiten): gut die Hälfte des Bretts — ein Schatten, den man als Möwe liest. */
export function gullSpan(boardWidth: number): number {
  return Math.min(2.5, Math.max(1.7, 0.55 * boardWidth));
}

// ------------------------------------------------------------------------------------------------ Umriss

/**
 * Entworfener Umriss in Bruchteilen der Spannweite (u vorn, v rechts): Körper als Fächer um die Mitte (Kopf vorn, breiteste
 * Stelle an der Brust), Keilschwanz, zwei Flügel mit Knick am Handgelenk (M-Form: Vorderkante des Arms nach vorn, Hand
 * spitz nach hinten gefegt, Kerbe an der Hinterkante zwischen Arm und Hand).
 */
const BODY: ReadonlyArray<readonly [number, number]> = [
  [0.03, 0], // Mitte (Fächer)
  [0.21, 0], // Kopf
  [0.19, 0.018],
  [0.14, 0.03],
  [0.06, 0.042],
  [-0.04, 0.04],
  [-0.11, 0.028],
  [-0.11, -0.028],
  [-0.04, -0.04],
  [0.06, -0.042],
  [0.14, -0.03],
  [0.19, -0.018],
];
const TAIL: ReadonlyArray<readonly [number, number]> = [
  [-0.09, 0.026],
  [-0.21, 0.05],
  [-0.21, -0.05],
  [-0.09, -0.026],
];
/** Ein Flügel (rechte Seite, v > 0): Schulter vorn, Arm-Vorderkante, Handgelenk, Spitze, Handkerbe, Schulter hinten. */
const WING: ReadonlyArray<readonly [number, number]> = [
  [0.055, 0.03],
  [0.085, 0.14],
  [0.095, 0.26],
  [-0.1, 0.5],
  [-0.055, 0.29],
  [-0.065, 0.03],
];
/** Schulterlinie (v) und Handgelenk-Index im Flügel. */
const SHOULDER_V = 0.03;
const WRIST = 2;

const BODY_N = BODY.length;
const TAIL_0 = BODY_N;
const WING_R0 = TAIL_0 + TAIL.length;
const WING_L0 = WING_R0 + WING.length;
/** Eckpunkte des Umrisses. */
export const GULL_VERTS = WING_L0 + WING.length;

function buildIndex(): Uint16Array {
  const idx: number[] = [];
  // Körper: Fächer um die Mitte
  for (let k = 1; k < BODY_N; k++) idx.push(0, k, k === BODY_N - 1 ? 1 : k + 1);
  // Schwanz
  idx.push(TAIL_0, TAIL_0 + 1, TAIL_0 + 2, TAIL_0, TAIL_0 + 2, TAIL_0 + 3);
  // Flügel: Fächer aus der Handkerbe (einzige einspringende Ecke)
  for (const w0 of [WING_R0, WING_L0]) {
    const notch = w0 + 4;
    idx.push(notch, w0 + 5, w0 + 0, notch, w0 + 0, w0 + 1, notch, w0 + 1, w0 + 2, notch, w0 + 2, w0 + 3);
  }
  return new Uint16Array(idx);
}

/** Dreiecke des Umrisses (21). */
export const GULL_INDEX: Uint16Array = buildIndex();

/** Haltung eines Moments: Flügelwinkel, Handfaltung, Schräglage, Ruck. */
export interface GullPose {
  /** Flügelwinkel (rad, + = hoch); die Spannweite wirkt mit cos φ. */
  flap: number;
  /** 0..1 Handfaltung im Aufschlag (Hand kürzer und nach hinten gefegt). */
  fold: number;
  /** Schräglage (rad, + = rechter Flügel unten). */
  bank: number;
  /** Ruck beim Loslassen: Versatz des ganzen Schattens entlang der sonnenabgewandten Richtung (Einheiten). */
  jolt: number;
  /** 0 = eingeklappt (unsichtbar, Warm-up), 1 = voll. */
  scale: number;
}

export const GULL_REST_POSE: GullPose = { flap: 0, fold: 0, bank: 0, jolt: 0, scale: 1 };

/**
 * Schreibt die (u, v)-Paare des Umrisses für eine Haltung (Einheiten, vor der Earle-Streckung). `away` = sonnenabgewandte
 * Richtung in (u, v): der Ruck und die Parallaxe des gehobenen Flügels in der Schräglage laufen dorthin.
 */
export function gullOutline(span: number, pose: GullPose, away: readonly [number, number], out: Float32Array): Float32Array {
  const s = span * pose.scale;
  const cf = Math.cos(pose.flap);
  const cb = Math.cos(pose.bank);
  const sb = Math.sin(pose.bank);
  const ja = pose.jolt * pose.scale;
  let o = 0;
  const put = (u: number, v: number): void => {
    out[o++] = u * s + away[0] * ja;
    out[o++] = v * s + away[1] * ja;
  };
  for (const [u, v] of BODY) put(u, v * (0.8 + 0.2 * cb));
  for (const [u, v] of TAIL) put(u, v);
  for (const sign of [1, -1]) {
    // Schräglage: beide Flügel wirken kürzer (cos β); der gehobene Flügel (Außenseite der Kurve) wirft seinen Schatten
    // ein Stück weiter von der Sonne weg (Parallaxe) — so liest sich die Kurve.
    const raised = sign * sb < 0 ? Math.abs(sb) : 0;
    const wrist = WING[WRIST]!;
    const wristV = SHOULDER_V + (wrist[1] - SHOULDER_V) * cf;
    WING.forEach(([u0, v0], k) => {
      let u = u0;
      let v = SHOULDER_V + (v0 - SHOULDER_V) * cf;
      if (k === 3 || k === 4) {
        // Hand: faltet im Aufschlag zum Handgelenk hin und fegt nach hinten
        const f = pose.fold * (k === 3 ? 1 : 0.6);
        v = wristV + (v - wristV) * (1 - 0.5 * f);
        u = u0 - 0.1 * f;
      }
      v *= cb;
      const lift = raised * Math.max(0, v - SHOULDER_V) * 0.55;
      out[o++] = u * s + away[0] * (lift * s + ja);
      out[o++] = sign * v * s + away[1] * (lift * s + ja);
    });
  }
  return out;
}

/** Entworfener Umriss ohne Bewegung (für Tests und Doku). */
export function gullRestOutline(span: number): Float32Array {
  return gullOutline(span, GULL_REST_POSE, [0, 0], new Float32Array(GULL_VERTS * 2));
}

// ------------------------------------------------------------------------------------------------ Flug

export interface GullFlightSpec {
  /** Brettlokale Mitte der Zielzelle (x, z). */
  cell: readonly [number, number];
  /** Höhe der Plattenoberkante (y). */
  ground: number;
  /** Kamera in Brettkoordinaten. */
  camera: readonly [number, number, number];
  /** Richtung zur Sonne in Brettkoordinaten. */
  sun: readonly [number, number, number];
  side: -1 | 1;
  corridor: 0 | 1 | 2;
  span: number;
  /** Zeiten des Flugs (s ab Zugbeginn, `gullTimes`). */
  times: GullTimes;
}

export interface GullFlight {
  readonly spec: GullFlightSpec;
  /** Flugrichtung beim Abwurf (xz, Einheitsvektor) und ihre rechte Seite. */
  readonly f: readonly [number, number];
  readonly r: readonly [number, number];
  /** Sonnenabgewandte Richtung am Boden (xz, Einheitsvektor). */
  readonly away: readonly [number, number];
  /** Richtung zur Sonne (Einheitsvektor, y ≥ 0,05). */
  readonly sun: readonly [number, number, number];
  /** Flughöhe des Werfers über dem Boden. */
  readonly height: number;
  /** Bogen: Querbeschleunigung vor und nach dem Abwurf (Einheiten/s²) und Seite (±1 entlang `r`). */
  readonly bendIn: number;
  readonly bendOut: number;
  readonly bendSign: number;
}

/** Winkel der Schneisen zur Bildschirm-Senkrechten (rad) und ob der Bogen nach außen (1) oder zur Senkrechten (−1) dreht. */
const CORRIDORS: ReadonlyArray<{ angle: number; bend: 1 | -1 }> = [
  { angle: (35 * Math.PI) / 180, bend: -1 },
  { angle: (55 * Math.PI) / 180, bend: -1 },
  { angle: (45 * Math.PI) / 180, bend: 1 },
];

/** Richtet einen Flug ein: Kurs gegen die Kamera, Sonnenachsen, Höhe (so, dass kein Eckpunkt über `GULL_MAX_HEIGHT` liegt). */
export function planGullFlight(spec: GullFlightSpec): GullFlight {
  const [cx, cz] = spec.cell;
  // Bildschirm-oben am Boden: von der Kamera weg (durch die Zielzelle)
  let ux = cx - spec.camera[0];
  let uz = cz - spec.camera[2];
  let ul = Math.hypot(ux, uz);
  if (ul < 1e-4) {
    ux = 0;
    uz = -1;
    ul = 1;
  }
  ux /= ul;
  uz /= ul;
  // Bildschirm-rechts (Blick von oben, y hoch): (−u.z, u.x)
  const rx0 = -uz;
  const rz0 = ux;
  const c = CORRIDORS[spec.corridor] ?? CORRIDORS[0]!;
  const ca = Math.cos(c.angle);
  const sa = Math.sin(c.angle) * spec.side;
  const fx = ux * ca + rx0 * sa;
  const fz = uz * ca + rz0 * sa;
  // Sonne: Einheitsvektor, nie flacher als ≈ 3° (sonst liefe h/L.y davon)
  let [lx, ly, lz] = spec.sun;
  const ll = Math.hypot(lx, ly, lz) || 1;
  lx /= ll;
  ly /= ll;
  lz /= ll;
  if (ly < 0.05) {
    const k = Math.sqrt((1 - 0.05 * 0.05) / Math.max(1e-6, lx * lx + lz * lz));
    lx *= k;
    lz *= k;
    ly = 0.05;
  }
  let ax = -lx;
  let az = -lz;
  const al = Math.hypot(ax, az);
  if (al < 1e-4) {
    ax = -1;
    az = 0;
  } else {
    ax /= al;
    az /= al;
  }
  const flight: GullFlight = {
    spec,
    f: [fx, fz],
    r: [-fz, fx],
    away: [ax, az],
    sun: [lx, ly, lz],
    height: GULL_HEIGHT,
    bendIn: 0.9,
    bendOut: 2.2,
    bendSign: c.bend * spec.side,
  };
  // Ein Eckpunkt mit Bodenversatz G liegt h + L.y·|L_xz|·(G·A) hoch: den ganzen Flug abtasten und h so wählen, dass
  // der höchste Eckpunkt `GULL_MAX_HEIGHT` nicht überschreitet (große Spannweite, Wind entlang der Sonne → etwas tiefer).
  const reachA = maxAlongAway(flight);
  // (0,01 Reserve: die Abtastung trifft die Spitzen nur fast)
  const height = Math.min(GULL_HEIGHT, GULL_MAX_HEIGHT - 0.01 - ly * Math.hypot(lx, lz) * reachA);
  return { ...flight, height };
}

const _uv = new Float32Array(GULL_VERTS * 2);

/** Größter Bodenversatz eines Eckpunkts entlang der sonnenabgewandten Richtung über den ganzen Flug (Earle-gestreckt). */
function maxAlongAway(flight: GullFlight): number {
  const { enterAt, exitAt } = flight.spec.times;
  const c = { x: 0, z: 0, hx: 0, hz: 0 };
  const pose: GullPose = { ...GULL_REST_POSE };
  let best = 0;
  for (let t = enterAt; t <= exitAt + 1e-9; t += 1 / 240) {
    gullCenter(flight, t, c);
    gullPose(flight, t, pose);
    const [au, av] = awayInUV(flight, c.hx, c.hz);
    gullOutline(flight.spec.span, pose, [au, av], _uv);
    for (let i = 0; i < GULL_VERTS; i++) best = Math.max(best, _uv[i * 2]! * au + _uv[i * 2 + 1]! * av);
  }
  return best * GULL_STRETCH;
}

/**
 * Bodenmitte des Schattens und Kurs zur Zugzeit `t` (s ab Zugbeginn): `C(τ) = Zelle + F·v·τ + R·Bogen(τ)` mit τ = t − Abwurf,
 * der Bogen ist 0 beim Abwurf (Schatten genau über der Zelle) und wächst quadratisch (davor sanft, danach stärker).
 */
export function gullCenter(flight: GullFlight, t: number, out: { x: number; z: number; hx: number; hz: number } = { x: 0, z: 0, hx: 0, hz: 0 }): { x: number; z: number; hx: number; hz: number } {
  const tau = t - flight.spec.times.releaseAt;
  const k = tau < 0 ? flight.bendIn : flight.bendOut;
  const s = GULL_SPEED * tau;
  const lat = flight.bendSign * k * tau * tau;
  const [fx, fz] = flight.f;
  const [rx, rz] = flight.r;
  const [cx, cz] = flight.spec.cell;
  out.x = cx + fx * s + rx * lat;
  out.z = cz + fz * s + rz * lat;
  // Kurs = Tangente
  const dl = flight.bendSign * 2 * k * tau;
  const hx = fx * GULL_SPEED + rx * dl;
  const hz = fz * GULL_SPEED + rz * dl;
  const hl = Math.hypot(hx, hz) || 1;
  out.hx = hx / hl;
  out.hz = hz / hl;
  return out;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Haltung zur Zugzeit `t`: Schlagen mit 3,2 Hz im Anflug, Gleiten mit voller Spannweite um den Abwurf, Ruck beim
 * Loslassen (der leichter gewordene Vogel steigt: sein Schatten springt kurz von der Sonne weg), zwei Schläge, dann
 * Schräglage in die Kurve.
 */
export function gullPose(flight: GullFlight, t: number, out: GullPose = { ...GULL_REST_POSE }): GullPose {
  const tau = t - flight.spec.times.releaseAt;
  const w = 2 * Math.PI * GULL_FLAP_HZ;
  // Schlagen: Mittellage 12° hoch, ±34°; um den Abwurf ausgeblendet (Gleiten, Flügel leicht unter der Waagerechten)
  const glide = smooth(-0.46, -0.3, tau) * (1 - smooth(0.06, 0.16, tau));
  const beat = 1 - glide;
  // Phase so gelegt, dass der Anflug im Abschlag ins Gleiten übergeht
  const th = w * tau + 0.5 * Math.PI;
  const sn = Math.sin(th);
  let flap = beat * (0.21 + 0.6 * sn) + glide * -0.07;
  let fold = beat * Math.pow(Math.max(0, sn), 1.5) * 0.9;
  // Nach dem Abwurf: zwei kräftige Schläge (größere Amplitude), dann Schräglage und Gleiten hinaus
  const outBeats = smooth(0.06, 0.14, tau) * (1 - smooth(0.62, 0.78, tau));
  if (tau > 0) {
    const th2 = w * (tau - 0.1) - 0.5 * Math.PI;
    const s2 = Math.sin(th2);
    flap = flap * (1 - outBeats) + outBeats * (0.26 + 0.7 * s2);
    fold = fold * (1 - outBeats) + outBeats * Math.pow(Math.max(0, s2), 1.5);
    const glideOut = smooth(0.7, 0.85, tau);
    flap = flap * (1 - glideOut) + glideOut * -0.04;
    fold *= 1 - glideOut;
  }
  out.flap = flap;
  out.fold = Math.min(1, Math.max(0, fold));
  // Schräglage in die Kurve (innerer Flügel unten): der Bogen dreht zur Seite `bendSign` von R
  out.bank = flight.bendSign * 0.62 * smooth(0.3, 0.95, tau);
  // Ruck: schnell hoch, weich zurück
  out.jolt = tau > 0 && tau < 0.45 ? 0.3 * Math.sin(Math.PI * Math.min(1, tau / 0.12) * 0.5) * (1 - smooth(0.12, 0.45, tau)) : 0;
  out.scale = 1;
  return out;
}

/**
 * Werfermatrix (column-major, 16 Zahlen, wie `Matrix4.elements`) für einen Schatten mit Bodenmitte (x, z) und Kurs (hx, hz):
 * lokale x-Achse = u (Flugrichtung), lokale z-Achse = v (rechts), lokale y-Achse = Richtung zur Sonne. Die Spalten sind
 * die Earle-gestreckten Bodenvektoren, senkrecht zur Sonne projiziert; der Ursprung liegt `h/L.y` zur Sonne hin.
 */
export function gullCasterMatrix(flight: GullFlight, x: number, z: number, hx: number, hz: number, out: number[] | Float32Array = new Array<number>(16)): number[] | Float32Array {
  const [lx, ly, lz] = flight.sun;
  const [ax, az] = flight.away;
  const k = GULL_STRETCH - 1;
  // Streckung S = I + k·A·Aᵀ (am Boden, xz)
  const stretch = (gx: number, gz: number): [number, number] => {
    const d = gx * ax + gz * az;
    return [gx + k * d * ax, gz + k * d * az];
  };
  const [fsx, fsz] = stretch(hx, hz);
  // rechte Seite des aktuellen Kurses
  const [rsx, rsz] = stretch(-hz, hx);
  // senkrecht zur Sonne projizieren
  const fl = fsx * lx + fsz * lz;
  const rl = rsx * lx + rsz * lz;
  const fpx = fsx - lx * fl;
  const fpy = -ly * fl;
  const fpz = fsz - lz * fl;
  const rpx = rsx - lx * rl;
  const rpy = -ly * rl;
  const rpz = rsz - lz * rl;
  const h = flight.height;
  const ox = x + (lx * h) / ly;
  const oy = flight.spec.ground + h;
  const oz = z + (lz * h) / ly;
  // column-major: Spalte 0 = u, Spalte 1 = Sonne (Normale), Spalte 2 = v, Spalte 3 = Ursprung
  out[0] = fpx;
  out[1] = fpy;
  out[2] = fpz;
  out[3] = 0;
  out[4] = lx;
  out[5] = ly;
  out[6] = lz;
  out[7] = 0;
  out[8] = rpx;
  out[9] = rpy;
  out[10] = rpz;
  out[11] = 0;
  out[12] = ox;
  out[13] = oy;
  out[14] = oz;
  out[15] = 1;
  return out;
}

/** Sonnenabgewandte Richtung in (u, v) eines Kurses (für Ruck und Parallaxe in `gullOutline`). */
export function awayInUV(flight: GullFlight, hx: number, hz: number): [number, number] {
  const [ax, az] = flight.away;
  return [ax * hx + az * hz, ax * -hz + az * hx];
}

/** Wirft einen Punkt entlang der Sonne auf die Bodenebene y = `ground` (Tests, Doku). */
export function projectToGround(p: readonly [number, number, number], sun: readonly [number, number, number], ground: number): [number, number] {
  const k = (p[1] - ground) / sun[1];
  return [p[0] - sun[0] * k, p[2] - sun[2] * k];
}
