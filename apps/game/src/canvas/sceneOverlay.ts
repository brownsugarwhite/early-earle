import { Color } from 'three/webgpu';
import { create } from 'zustand';
import type { SceneContext, SceneController } from './SceneController';

/**
 * Szenen-Overlay (Iteration 4, Setzkasten): eine zweite Szene, die den einen Renderer übernimmt, ohne dass die Route
 * wechselt. Der Basis-Controller (FlowScene) bleibt montiert, wird aber nicht mehr aktualisiert (seine Eingaben
 * schlafen, weil die DOM-Schicht des Overlays sie abfängt); `resize` geht an beide; der Qualitäts-Governor pausiert.
 * Beim Öffnen wird der Renderer-Zustand gesichert (Schatten, Tonemapping, Löschfarbe, Pixelverhältnis) und beim
 * Schließen wiederhergestellt.
 */
export interface SceneOverlayState {
  /** Gewünschtes Overlay (die DOM-Schicht öffnet/schließt es). */
  overlay: SceneController | null;
  /** Das Overlay ist montiert und zeichnet (erstes Bild fertig). */
  active: boolean;
  open(controller: SceneController): void;
  close(): void;
  /** @internal CanvasHost meldet, dass das Overlay zeichnet. */
  setActive(active: boolean): void;
}

export const useSceneOverlay = create<SceneOverlayState>((set, get) => ({
  overlay: null,
  active: false,
  open: (controller) => {
    if (get().overlay === controller) return;
    set({ overlay: controller, active: false });
  },
  close: () => {
    if (!get().overlay) return;
    set({ overlay: null, active: false });
  },
  setActive: (active) => set({ active }),
}));

/** Renderer-Zustand, den ein Overlay verändern darf. */
export interface RendererSnapshot {
  shadowMap: boolean;
  toneMapping: number;
  toneMappingExposure: number;
  clearColor: Color;
  clearAlpha: number;
  pixelRatio: number;
  autoClear: boolean;
}

type RendererLike = SceneContext['renderer'];

export function snapshotRenderer(r: RendererLike): RendererSnapshot {
  const clearColor = new Color();
  r.getClearColor(clearColor);
  return {
    shadowMap: r.shadowMap.enabled,
    toneMapping: r.toneMapping,
    toneMappingExposure: r.toneMappingExposure,
    clearColor,
    clearAlpha: r.getClearAlpha(),
    pixelRatio: r.getPixelRatio(),
    autoClear: r.autoClear,
  };
}

export function restoreRenderer(r: RendererLike, s: RendererSnapshot, ctx: Pick<SceneContext, 'width' | 'height'>): void {
  r.shadowMap.enabled = s.shadowMap;
  r.toneMapping = s.toneMapping as RendererLike['toneMapping'];
  r.toneMappingExposure = s.toneMappingExposure;
  r.setClearColor(s.clearColor, s.clearAlpha);
  r.autoClear = s.autoClear;
  if (Math.abs(r.getPixelRatio() - s.pixelRatio) > 1e-3) {
    r.setPixelRatio(s.pixelRatio);
    r.setSize(ctx.width, ctx.height, false);
  }
}

/** Tasten, mit denen die Basis-Szene (Flow) etwas auslöst: solange ein Overlay offen ist, kommen sie nicht an. */
const SLEEP_KEYS = new Set(['Enter', ' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'z', 'r', 'Backspace', 'Escape']);

/**
 * Legt die Tastatur-Eingaben der Basis schlafen: ein Capture-Listener am Fenster fängt Enter, Leertaste, Pfeile (und
 * die übrigen Spieltasten) ab, bevor der Flow sie sieht; `onKey` bekommt sie stattdessen (z. B. Escape → schließen).
 * Zeigereingaben fängt die DOM-Schicht des Overlays selbst ab. Rückgabe: aufwecken.
 */
export function sleepBaseInput(onKey?: (e: KeyboardEvent) => void, target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = window): () => void {
  const listener = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!SLEEP_KEYS.has(e.key)) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    onKey?.(e);
  };
  target.addEventListener('keydown', listener, { capture: true });
  return () => target.removeEventListener('keydown', listener, { capture: true });
}

export interface OverlayHost {
  /** Der Controller, der dieses Bild zeichnet (Overlay, sobald es montiert ist, sonst die Basis). */
  current(base: SceneController): SceneController;
  /** True, solange ein Overlay zeichnet (der Qualitäts-Governor pausiert). */
  readonly busy: boolean;
  resize(ctx: SceneContext): void;
  dispose(): void;
}

/**
 * Hängt den Overlay-Store an einen CanvasHost: montiert/entsorgt Overlays, sichert und restauriert den Renderer.
 * Ein Overlay zeichnet erst, wenn `mount` fertig ist (bis dahin läuft die Basis weiter, die DOM-Schicht deckt ab).
 */
export function attachSceneOverlay(ctx: SceneContext, store = useSceneOverlay): OverlayHost {
  let mounted: SceneController | null = null;
  let snapshot: RendererSnapshot | null = null;
  let pending: SceneController | null = null;
  let disposed = false;

  const unmount = (): void => {
    const m = mounted;
    mounted = null;
    if (m) {
      try {
        m.dispose();
      } catch {
        /* ein kaputtes Overlay darf die Basis nicht mitreißen */
      }
    }
    if (snapshot) restoreRenderer(ctx.renderer, snapshot, ctx);
    snapshot = null;
    if (store.getState().active) store.getState().setActive(false);
  };

  const sync = (want: SceneController | null): void => {
    if (disposed) return;
    if (want ? want === mounted || want === pending : !mounted && !pending) return;
    unmount();
    pending = want;
    if (!want) return;
    snapshot = snapshotRenderer(ctx.renderer);
    void Promise.resolve()
      .then(() => want.mount(ctx))
      .then(
        () => {
          if (disposed || pending !== want) {
            if (pending !== want) {
              try {
                want.dispose();
              } catch {
                /* schon weg */
              }
            }
            return;
          }
          pending = null;
          mounted = want;
          want.resize?.(ctx);
          store.getState().setActive(true);
        },
        () => {
          // Mount fehlgeschlagen: zurück zur Basis.
          if (pending === want) pending = null;
          if (snapshot) restoreRenderer(ctx.renderer, snapshot, ctx);
          snapshot = null;
          store.getState().close();
        },
      );
  };

  const off = store.subscribe((s, prev) => {
    if (s.overlay !== prev.overlay) sync(s.overlay);
  });
  sync(store.getState().overlay);

  return {
    current: (base) => mounted ?? base,
    get busy() {
      return mounted !== null || pending !== null;
    },
    resize: (c) => mounted?.resize?.(c),
    dispose: () => {
      disposed = true;
      off();
      pending = null;
      unmount();
    },
  };
}
