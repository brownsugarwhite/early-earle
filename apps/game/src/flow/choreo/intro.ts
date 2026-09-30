import { Vector3 } from 'three/webgpu';
import { useGridStore } from '../../lab/grid/gridStore';
import { useProgress } from '../../state/progress';
import { useFlowStore } from '../flowStore';
import { FLOW_LEVELS } from '../levels';
import { easeInOut, easeInOutQuint } from '../tween';
import type { FlowStage } from './stage';

/**
 * Erster Start im echten Modus (Iteration 4, Punkt 3): Tippen → das „i“ fährt weg und der Blob springt DIREKT in das
 * erste Level (keine Map davor). Eine Einstellung auf der Szenenuhr, Zeiten ab dem Tipp:
 *
 *  0     Phase `intro`; Splash-Overlay und Hintergrundscheibe blenden aus (0,55 s); Level 1 lädt verdeckt auf Knoten 0
 *  0,05  Kamera Splash-Pose → Level-Pose (1,8 s, mit leichtem Bogen)
 *  0,30  der Held verlässt den i-Punkt: Bogen auf seine Zelle (1,45 s), wächst dabei auf Brettgröße
 *  0,45  das Plateau hebt sich (≈ 1,3 s), Nebelstreifen nach unten
 *  1,00  Schattenkarte eng ums Plateau
 *  1,75  Landung: der Held wird zu seinem Blob (wie beim Anflug)
 *  1,90  Phase `level`; REX sagt seine erste Zeile und zeigt aufs Brett; Intro gilt als gesehen
 */
export const INTRO_TIMES = {
  splashFade: 0.55,
  cameraAt: 0.05,
  camera: 1.8,
  heroAt: 0.3,
  heroFlight: 1.45,
  heroArc: 2.2,
  riseAt: 0.45,
  shadowAt: 1.0,
  levelAt: 1.9,
} as const;

/** Seitlicher Bogen der Kamerafahrt (wie beim Anflug). */
const CAMERA_ARC = 0.14;
const TAG = 'intro';

export function playIntro(stage: FlowStage): void {
  const T = INTRO_TIMES;
  const { hero, board, tweens } = stage;
  const flow = useFlowStore.getState();
  stage.setPhase('intro');
  stage.fadeSplash(T.splashFade);
  stage.rex?.setVisible(false);
  // Level 1 is played on node 0: under the splash ink the view jumps there, the hero stays on the i-dot.
  if (flow.current !== 0) flow.setCurrent(0);
  stage.snapFocus(0);
  stage.holdHeroAtSplash();
  flow.setPlaying(0);
  useGridStore.getState().loadLevel(FLOW_LEVELS[0]?.index ?? 0);
  // The level arrives hidden (a round hill under the terrain), exactly like a fly-in.
  board.bind({ hidden: true });
  const { away } = stage.placeBoardAt(0);
  if (!away) stage.setLevelNode(0);
  stage.setFootClear(false);
  const entry = board.entryBlob(hero.tier);
  if (entry) board.setBlobHidden(entry.id, true);
  const scale = entry ? board.worldScale(entry.tier) : 0.02;
  const local = entry ? entry.local.clone() : new Vector3();

  // Until it jumps, the hero stays glued to the i-dot on screen (the camera already moves).
  tweens.add(T.heroAt, () => stage.holdHeroAtSplash(), { tag: TAG, ease: (t) => t });
  tweens.after(
    T.cameraAt,
    () => {
      stage.cue('flyIn');
      stage.tweenCamera(stage.levelPose(), T.camera, { ease: easeInOutQuint, arc: CAMERA_ARC });
    },
    TAG,
  );
  tweens.after(
    T.heroAt,
    () => {
      stage.cue('heroJump');
      hero.flyTo(stage.boardPose(local, scale), {
        duration: T.heroFlight,
        arc: T.heroArc,
        ease: easeInOut,
        done: () => {
          stage.landOnEntry(entry, local, scale);
          stage.cue('land');
        },
      });
    },
    TAG,
  );
  tweens.after(
    T.riseAt,
    () => {
      board.playRise();
      stage.cue('rise');
      stage.stripesTo(-4, 0.8);
    },
    TAG,
  );
  tweens.after(T.shadowAt, () => stage.setShadowFocus(true), TAG);
  tweens.after(
    T.levelAt,
    () => {
      stage.setPhase('level');
      useProgress.getState().markIntroSeen();
    },
    TAG,
  );
}
