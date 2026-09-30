/**
 * Choreografie des Splashs nach 100 % (T0) und beim Tippen: Spuren schreiben in einen flachen Zustand (`Look`), den
 * SplashStage einmal pro Bild ins SVG überträgt. Zustandslos je Spur (siehe timeline.ts): Springen = Abspielen.
 *
 * Takt (Sekunden ab T0, "Stufen" = gehaltene Posen):
 *   0,00  Stamm schießt über 1 → 1,06 → 1, "100%" stempelt 1,2 → 1 · clack
 *   0,25  Ziffern fallen einzeln (18 px, 14°, 40 ms versetzt), Schnitt bei 0,45
 *   0,30  Möwenschatten zieht flach von links nach rechts, kreuzt die Punktspalte bei 0,62 · gullCall, gullWings
 *   0,66  Blob fällt von oben (x 410), streckt sich mit der Geschwindigkeit, Kontaktfleck wächst · dropFall
 *   1,08  Aufprall auf der schrägen Stammkante: Stauchen quer zur Kante, Stamm federt, 6 Tropfen · splat
 *   1,15  Blob springt auf den i-Punkt (ease-out-back), 0,4 s Nachwippen · popOut
 *   1,08  Rahmen wischt von der Chevron-Spitze links hoch, über den Bogen, rechts hinunter (9 × 40 ms)
 *   1,20  Wisch erreicht die Flamme: Zünden 0 → 1,25 → 1, dann Flackern und Glut · flameIgnite
 *   1,30  ® springt ein (0 → 1,5 → 1, −90° → 0°) · uiTick
 *   1,44  Platte knallt rein, das Logo wackelt ±4 px · stamp
 *   1,52 / 1,62 / 1,72  Sterne links, rechts, Mitte (2 → 0,9 → 1, ±20°) · starPop (Stufe 0/1/2)
 *   2,00  "Tippen" stempelt Buchstabe für Buchstabe (1,8 → 0,92 → 1, 45 ms) · leises clack
 *   ab 2,4 Leerlauf: "Tippen" drückt alle 1,8 s, Blob atmet und blinzelt, ein Stern tickt alle ≈ 5 s um 72°.
 * Ausklang (Tippen/Enter/Leertaste, 0,45 s): Buchstaben fallen, Sterne/®/Flamme auf 0, Schatten fahren ein, Rahmen
 * wischt zurück (7 × 40 ms), Platte weg bei 0,38, Stamm sinkt, Blob duckt sich; bei 0,45 Übergabe an den 3D-Helden.
 */
import { LOGO } from './logo.gen';
import { Timeline, easeIn, easeOut, easeOutBack, frames, gravity, keys, linear } from './timeline';
import { GULL_FPS } from './gull';
import type { Pt } from './longShadow';

export const INTRO_END = 2.4;
export const OUTRO_END = 0.45;
/** Hüpf-Anfrage vor der Übergabe: FlowScene startet den Flug 0,1 s nach `request('hop')`. */
export const OUTRO_HOP_AT = 0.35;
export const TIPPEN = 'Tippen';

export interface Look {
  stemS: number;
  stemE: number;
  labelOn: boolean;
  labelStamp: number;
  labelDrop: number[];
  blobOn: boolean;
  blobX: number;
  blobY: number;
  /** Stauchung entlang/quer einer Achse (Grad), 1 = rund. */
  blobAlong: number;
  blobAcross: number;
  blobAxis: number;
  blobEye: number;
  blobE: number;
  contact: number;
  /** 0 = keine Tropfen, (0, 1) = Flug hinaus und zurück. */
  drops: number;
  frameU: number;
  panel: boolean;
  flameOn: boolean;
  flameGrow: number;
  flameT: number;
  regS: number;
  regRot: number;
  regE: number;
  starS: number[];
  starRot: number[];
  starE: number[];
  shakeX: number;
  shakeY: number;
  gullOn: boolean;
  gullU: number;
  gullPose: number;
  tipOn: boolean[];
  tipS: number[];
  tipE: number[];
  tipDy: number[];
  tipPress: number;
  /** Übergabe erfolgt: SVG-Blob weg, Maskenloch offen. */
  handoff: boolean;
}

export const DOT: Pt = [LOGO.blob.center[0], LOGO.blob.center[1]];
export const BLOB_R = LOGO.blob.r;
const quad = LOGO.stem.quad;
export const STEM_ANGLE = (Math.atan(LOGO.stem.slope) * 180) / Math.PI;
const sin = Math.sin((STEM_ANGLE * Math.PI) / 180);
const cos = Math.cos((STEM_ANGLE * Math.PI) / 180);
/** Normale der Stammoberkante (nach oben, vom Stamm weg). */
export const STEM_NORMAL: Pt = [sin, -cos];
const topY = (x: number) => quad[0][1] + (x - quad[0][0]) * LOGO.stem.slope;
/** Fallspalte und Aufprall: der Kreis (Radius r) trifft die schräge Kante dort, wo ihre Normale durch die Mitte geht. */
export const FALL_X = 410;
export const CONTACT: Pt = [FALL_X - STEM_NORMAL[0] * BLOB_R, topY(FALL_X - STEM_NORMAL[0] * BLOB_R)];
const IMPACT_Y = CONTACT[1] + STEM_NORMAL[1] * BLOB_R;
const FALL_FROM = -90;

export function initialLook(): Look {
  return {
    stemS: 1,
    stemE: 1,
    labelOn: true,
    labelStamp: 1,
    labelDrop: [0, 0, 0, 0],
    blobOn: false,
    blobX: FALL_X,
    blobY: FALL_FROM,
    blobAlong: 1,
    blobAcross: 1,
    blobAxis: 90,
    blobEye: 1,
    blobE: 1,
    contact: 0,
    drops: 0,
    frameU: 0,
    panel: false,
    flameOn: false,
    flameGrow: 0,
    flameT: 0,
    regS: 0,
    regRot: -90,
    regE: 0,
    starS: [0, 0, 0],
    starRot: [0, 0, 0],
    starE: [0, 0, 0],
    shakeX: 0,
    shakeY: 0,
    gullOn: false,
    gullU: 0,
    gullPose: 0,
    tipOn: [false, false, false, false, false, false],
    tipS: [1, 1, 1, 1, 1, 1],
    tipE: [0, 0, 0, 0, 0, 0],
    tipDy: [0, 0, 0, 0, 0, 0],
    tipPress: 0,
    handoff: false,
  };
}

export function resetLook(l: Look): void {
  Object.assign(l, initialLook());
}

/** Endzustand des Aufbaus (Leerlauf ohne Bewegung): alles da, volle Schatten. */
export function assembledLook(): Look {
  const l = initialLook();
  Object.assign(l, {
    labelOn: false,
    blobOn: true,
    blobX: DOT[0],
    blobY: DOT[1],
    frameU: 1,
    panel: true,
    flameOn: true,
    flameGrow: 1,
    regS: 1,
    regRot: 0,
    regE: 1,
    starS: [1, 1, 1],
    starE: [1, 1, 1],
    tipOn: [true, true, true, true, true, true],
    tipE: [1, 1, 1, 1, 1, 1],
  });
  return l;
}

export type Sound = (id: string, p?: Record<string, number | string>) => void;

export interface ChoreoOptions {
  reduced: boolean;
  sound: Sound;
}

/** Stern-Einsatz: links, rechts, Mitte. */
const STAR_ORDER: ReadonlyArray<[number, number]> = [
  [0, 1.52],
  [2, 1.62],
  [1, 1.72],
];
const STAR_TILT = [20, 0, -20];

export function buildIntro(l: Look, o: ChoreoOptions): Timeline {
  const tl = new Timeline();
  tl.reset = () => resetLook(l);
  const S = o.sound;

  // --- Stamm und "100%"
  tl.add({ t0: 0, dur: 0.1, steps: 2, apply: (p) => (l.stemS = frames([1.06, 1])(p)) });
  tl.add({ t0: 0, dur: 0.12, steps: 2, apply: (p) => (l.labelStamp = frames([1.2, 1])(p)) });
  tl.call(0, () => S('clack', { step: 6 }));
  for (let i = 0; i < 4; i++) tl.add({ t0: 0.25 + i * 0.04, dur: 0.12, steps: 3, apply: (p) => (l.labelDrop[i] = p) });
  tl.add({ t0: 0.45, dur: 0, apply: () => (l.labelOn = false) });

  // --- Möwenschatten
  if (!o.reduced) {
    tl.add({
      t0: 0.3,
      dur: 1.1,
      apply: (p, t) => {
        l.gullOn = p < 1;
        l.gullU = p;
        l.gullPose = Math.floor(t * GULL_FPS);
      },
    });
    // Möwe fliegt von links nach rechts über das Bild
    tl.call(0.3, () => S('gullCall', { pan: -0.7, dir: 'right' }));
    tl.call(0.4, () => S('gullWings', { pan: -0.4, dir: 'right', dur: 1.0 }));
  }

  // --- Blob fällt
  if (!o.reduced) {
    tl.add({
      t0: 0.66,
      dur: 0.42,
      ease: linear,
      apply: (p) => {
        l.blobOn = true;
        l.blobX = FALL_X;
        l.blobY = FALL_FROM + (IMPACT_Y - FALL_FROM) * gravity(p);
        // Streckung mit der Fallgeschwindigkeit (∝ p), senkrecht
        l.blobAxis = 90;
        l.blobAlong = 1 + 0.35 * p;
        l.blobAcross = 1 / Math.sqrt(l.blobAlong);
      },
    });
    tl.add({ t0: 0.88, dur: 0.2, ease: easeIn, apply: (p) => (l.contact = p) });
    tl.call(0.66, () => S('dropFall', { dur: 0.42 }));
    // Aufprall: Stauchen quer zur Kante (2 Stufen), Stamm federt, Tropfen
    tl.add({
      t0: 1.08,
      dur: 0.07,
      steps: 2,
      apply: (p) => {
        const [along, across] = frames<[number, number]>([
          [0.6, 1.45],
          [0.8, 1.22],
        ])(p);
        l.blobAxis = STEM_ANGLE - 90; // entlang der Normalen
        l.blobAlong = along;
        l.blobAcross = across;
        l.blobX = CONTACT[0] + STEM_NORMAL[0] * BLOB_R * along;
        l.blobY = CONTACT[1] + STEM_NORMAL[1] * BLOB_R * along;
        l.contact = 1 - p;
      },
    });
    tl.add({ t0: 1.08, dur: 0.1, steps: 2, apply: (p) => (l.stemS = frames([0.95, 1])(p)) });
    tl.add({ t0: 1.08, dur: 0.4, apply: (p) => (l.drops = p < 1 ? Math.max(0.001, p) : 0) });
    tl.call(1.08, () => S('splat', { tier: 1 }));
    // auf den Punkt
    tl.add({
      t0: 1.15,
      dur: 0.2,
      ease: easeOutBack,
      apply: (p) => {
        const sx = CONTACT[0] + STEM_NORMAL[0] * BLOB_R * 0.8;
        const sy = CONTACT[1] + STEM_NORMAL[1] * BLOB_R * 0.8;
        l.blobX = sx + (DOT[0] - sx) * p;
        l.blobY = sy + (DOT[1] - sy) * p;
        const q = Math.min(1, Math.max(0, p));
        l.blobAlong = 0.8 + 0.2 * q;
        l.blobAcross = 1.22 - 0.22 * q;
      },
    });
    tl.call(1.15, () => S('popOut'));
    // Nachwippen
    tl.add({
      t0: 1.35,
      dur: 0.4,
      apply: (_p, t) => {
        const a = 0.09 * Math.exp(-6 * t) * Math.sin(2 * Math.PI * 5 * t);
        l.blobX = DOT[0];
        l.blobY = DOT[1];
        l.blobAxis = 90;
        l.blobAlong = 1 + a;
        l.blobAcross = 1 - a * 0.7;
      },
    });
  } else {
    tl.add({ t0: 0, dur: 0, apply: () => Object.assign(l, { blobOn: true, blobX: DOT[0], blobY: DOT[1] }) });
  }

  // --- Rahmen, Flamme, ®, Platte, Sterne
  tl.add({ t0: o.reduced ? 0 : 1.08, dur: o.reduced ? 0 : 0.36, steps: 9, apply: (p) => (l.frameU = p) });
  tl.add({ t0: o.reduced ? 0 : 1.2, dur: o.reduced ? 0 : 0.2, steps: 4, apply: (p) => ((l.flameOn = true), (l.flameGrow = frames([0.35, 0.8, 1.25, 1])(p))) });
  tl.add({ t0: 1.2, dur: Infinity, apply: (_p, t) => (l.flameT = o.reduced ? 0 : t) });
  if (!o.reduced) tl.call(1.2, () => S('flameIgnite'));
  tl.add({
    t0: o.reduced ? 0 : 1.3,
    dur: o.reduced ? 0 : 0.15,
    steps: 3,
    apply: (p) => {
      l.regS = frames([0.6, 1.5, 1])(p);
      l.regRot = frames([-90, -30, 0])(p);
    },
  });
  tl.add({ t0: o.reduced ? 0 : 1.3, dur: o.reduced ? 0 : 0.24, apply: (p) => (l.regE = p) });
  if (!o.reduced) tl.call(1.3, () => S('uiTick'));
  tl.add({ t0: o.reduced ? 0 : 1.44, dur: 0, apply: () => (l.panel = true) });
  if (!o.reduced) {
    tl.add({
      t0: 1.44,
      dur: 0.15,
      steps: 3,
      apply: (p) => {
        const [x, y] = frames<[number, number]>([
          [4, -2],
          [-3, 3],
          [0, 0],
        ])(p);
        l.shakeX = x;
        l.shakeY = y;
      },
    });
  }
  tl.call(o.reduced ? 0 : 1.44, () => S('stamp'));
  for (const [k, [i, t0]] of STAR_ORDER.entries()) {
    const tilt = STAR_TILT[i]!;
    tl.add({
      t0: o.reduced ? 0 : t0,
      dur: o.reduced ? 0 : 0.15,
      steps: 3,
      apply: (p) => {
        l.starS[i] = frames([2, 0.9, 1])(p);
        l.starRot[i] = frames([tilt, -tilt * 0.3, 0])(p);
      },
    });
    tl.add({ t0: o.reduced ? 0 : t0, dur: o.reduced ? 0 : 0.22, apply: (p) => (l.starE[i] = p) });
    if (!o.reduced) tl.call(t0, () => S('starPop', { step: k }));
  }

  // --- "Tippen"
  for (let j = 0; j < TIPPEN.length; j++) {
    const t0 = o.reduced ? 0 : 2.0 + j * 0.045;
    tl.add({
      t0,
      dur: o.reduced ? 0 : 0.135,
      steps: 3,
      apply: (p) => {
        l.tipOn[j] = true;
        l.tipS[j] = frames([1.8, 0.92, 1])(p);
      },
    });
    tl.add({ t0, dur: o.reduced ? 0 : 0.2, apply: (p) => (l.tipE[j] = p) });
  }
  if (!o.reduced) tl.call(2.0, () => S('clack', { vel: 0.5, step: 2 }));

  // --- Leerlauf
  tl.add({ t0: INTRO_END, dur: Infinity, apply: (_p, t) => idle(l, t, o.reduced) });
  return tl;
}

function hash(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Leerlauf ab 2,4 s (t = Sekunden seit Beginn): Drücken, Atmen, Blinzeln, Stern-Tick. */
export function idle(l: Look, t: number, reduced: boolean): void {
  if (reduced) return;
  // "Tippen" drückt alle 1,8 s für zwei Bilder (12 fps)
  const ph = t % 1.8;
  l.tipPress = ph > 1.0 && ph < 1.0 + 2 / 12 ? 1 : 0;
  // Atmen ±2 %, Blinzeln alle ≈ 3,4 s für zwei Bilder
  const b = 0.02 * Math.sin((2 * Math.PI * t) / 2.3);
  l.blobAxis = 90;
  l.blobAlong = 1 + b;
  l.blobAcross = 1 - b * 0.6;
  const bl = (t + 0.7) % 3.4;
  l.blobEye = bl < 2 / 12 ? 0.12 : 1;
  // ein Stern tickt alle ≈ 5 s um 72° (drei Stufen)
  const k = Math.floor(t / 5);
  const s = k % 3 === 0 ? 1 : k % 3 === 1 ? 2 : 0;
  const lt = t - k * 5 - (0.6 + hash(k, 3) * 1.2);
  if (lt > 0 && lt < 0.25) l.starRot[s] = keys([0, 30, 60, 72])(Math.min(1, Math.ceil((lt / 0.25) * 3) / 3));
}

export interface OutroHooks {
  hop(): void;
  handoff(): void;
}

export function buildOutro(l: Look, o: ChoreoOptions, hooks: OutroHooks): Timeline {
  const tl = new Timeline();
  const base = assembledLook();
  tl.reset = () => {
    Object.assign(l, base, { starS: [...base.starS], starE: [...base.starE], starRot: [...base.starRot], tipOn: [...base.tipOn], tipS: [...base.tipS], tipE: [...base.tipE], tipDy: [...base.tipDy], flameT: l.flameT });
  };
  if (o.reduced) {
    tl.add({
      t0: 0,
      dur: 0,
      apply: () => {
        Object.assign(l, initialLook(), { labelOn: false, stemS: 0, blobOn: true, blobX: DOT[0], blobY: DOT[1] });
      },
    });
    tl.call(0, () => hooks.hop(), 'hook');
    tl.call(0.1, () => hooks.handoff(), 'hook');
    return tl;
  }
  tl.call(0, () => o.sound('uiTick'));
  // Buchstaben fallen heraus
  for (let j = 0; j < TIPPEN.length; j++) {
    tl.add({
      t0: j * 0.02,
      dur: 0.12,
      ease: easeIn,
      apply: (p) => {
        l.tipDy[j] = 40 * p;
        l.tipE[j] = 1 - p;
        l.tipOn[j] = p < 1;
      },
    });
  }
  // Sterne, ®, Flamme auf 0 (je 2 Stufen, 40 ms versetzt), Schatten fahren in 150 ms ein
  const out: Array<[number, (p: number) => void]> = [
    [0.0, (p) => ((l.starS[0] = frames([0.5, 0])(p)), (l.starE[0] = Math.max(0, 1 - p * 1.4)))],
    [0.04, (p) => ((l.starS[2] = frames([0.5, 0])(p)), (l.starE[2] = Math.max(0, 1 - p * 1.4)))],
    [0.08, (p) => ((l.starS[1] = frames([0.5, 0])(p)), (l.starE[1] = Math.max(0, 1 - p * 1.4)))],
    [0.12, (p) => ((l.regS = frames([0.5, 0])(p)), (l.regE = Math.max(0, 1 - p * 1.4)))],
    [0.16, (p) => ((l.flameGrow = frames([0.5, 0])(p)), (l.flameOn = p < 1))],
  ];
  for (const [t0, fn] of out) tl.add({ t0, dur: 0.15, apply: fn });
  // Rahmen wischt zurück, Platte weg
  tl.add({ t0: 0.08, dur: 0.28, steps: 7, apply: (p) => (l.frameU = 1 - p) });
  tl.add({ t0: 0.38, dur: 0, apply: () => (l.panel = false) });
  // Stamm sinkt
  tl.add({ t0: 0.18, dur: 0.22, ease: easeIn, apply: (p) => (l.stemS = 1 - p) });
  // Blob duckt sich
  tl.add({
    t0: 0.3,
    dur: 0.15,
    ease: easeOut,
    apply: (p) => {
      l.blobAxis = 90;
      l.blobAlong = 1 - 0.3 * p;
      l.blobAcross = 1 + 0.3 * p;
      // Unterkante bleibt stehen
      l.blobY = DOT[1] + BLOB_R * 0.3 * p;
    },
  });
  tl.call(OUTRO_HOP_AT, () => hooks.hop(), 'hook');
  tl.call(OUTRO_END, () => hooks.handoff(), 'hook');
  return tl;
}
