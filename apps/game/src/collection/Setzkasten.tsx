import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ZONE_KEYS, type ZoneId } from '@ee/genome';
import { useSceneOverlay, sleepBaseInput } from '../canvas/sceneOverlay';
import { useProgress } from '../state/progress';
import { useFlowStore } from '../flow/flowStore';
import { creatureLibrary } from '../flow/LevelBoard';
import { BUNDLED_RULES } from '../lab/creature/content';
import { holdNativeGlass } from '../native/liquidGlass';
import { audio } from '../audio/engine';
import { catalogFor, rarityOf, SPECIES_NAME, ZONE_LEVELS, ZONE_NAME } from './catalog';
import { SetzkastenScene } from './SetzkastenScene';
import { useSetzkasten, type CreatureCard } from './setzkastenStore';
import './setzkasten.css';

/** Tönung der Reiter je Zone (content/zones: Akzent und Himmel). */
const ZONE_TINT: Record<ZoneId, { bg: string; fg: string }> = {
  tjorizo: { bg: '#b8ff2a', fg: '#242c0b' },
  syrup: { bg: '#e5aed4', fg: '#1a131b' },
  luzz: { bg: '#2de5f8', fg: '#191b2f' },
  wooding: { bg: '#ddd042', fg: '#252d08' },
};

let host: HTMLDivElement | null = null;
let root: Root | null = null;
/** Eine Szene für alle Öffnungen (Herde, Materialien und Pipelines bleiben warm). */
let scene: SetzkastenScene | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function sceneInstance(): SetzkastenScene {
  scene ??= new SetzkastenScene({ rules: BUNDLED_RULES, library: creatureLibrary().then((c) => c?.library ?? null) });
  return scene;
}

/** Wartet auf eine ruhige Lücke, während die Karte steht (kein Anflug, kein Level). */
function mapIdle(): Promise<void> {
  return new Promise((resolve) => {
    const tryNow = () => {
      if (useFlowStore.getState().phase !== 'map' || useSetzkasten.getState().open) {
        setTimeout(tryNow, 300);
        return;
      }
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(() => resolve(), { timeout: 90 });
      else setTimeout(resolve, 40);
    };
    tryNow();
  });
}

/**
 * Wärmt den Setzkasten vor, während die Karte ruht (in kleinen Happen): Herde, Kasten der Zone des aktuellen Knotens,
 * Wesen, Pipelines. Das erste Öffnen zeigt dann sofort ein Bild.
 */
export async function prewarmSetzkasten(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { getRenderer, detectBackend } = await import('../canvas/rendererSingleton');
  const renderer = await getRenderer();
  await mapIdle();
  if (useSetzkasten.getState().open) return;
  useSetzkasten.setState({ zone: zoneOfNode(useFlowStore.getState().current) });
  const t0 = performance.now();
  await sceneInstance().prewarm(renderer, detectBackend(renderer), window.innerWidth, window.innerHeight, mapIdle);
  if (import.meta.env.DEV) console.debug(`[setzkasten] vorgewärmt in ${(performance.now() - t0).toFixed(0)} ms`);
}

/** Die Szene (Tests, Werkstatt); null, bevor sie gebraucht wurde. */
export function setzkastenScene(): SetzkastenScene | null {
  return scene;
}

/** Gibt die Setzkasten-Szene frei (der Flow wird verlassen). */
export function destroySetzkasten(): void {
  if (useSetzkasten.getState().open) return;
  scene?.destroy();
  scene = null;
}

/** Zone des aktuellen Knotens (dort schlägt der Setzkasten auf). */
function zoneOfNode(node: number): ZoneId {
  const no = node + 1;
  return ZONE_KEYS.find((z) => no >= ZONE_LEVELS[z][0] && no <= ZONE_LEVELS[z][1]) ?? 'tjorizo';
}

/** Öffnet den Setzkasten über der Map (nur dort): eigene DOM-Schicht, 3D-Szene als Overlay auf dem einen Renderer. */
export function openSetzkasten(): void {
  if (root || typeof document === 'undefined') return;
  if (useFlowStore.getState().phase !== 'map') return;
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  const zone = zoneOfNode(useFlowStore.getState().current);
  useSetzkasten.setState({ open: true, ready: false, closing: false, card: null, zone });
  const sc = sceneInstance();
  host = document.createElement('div');
  host.className = 'sk-host';
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<SetzkastenLayer scene={sc} />);
  useSceneOverlay.getState().open(sc);
  // Web-HUD und natives Glas-HUD der Karte ruhen, solange der Kasten offen ist.
  document.body.classList.add('sk-open');
  void holdNativeGlass(true);
  audio.sfx('clack', { zone });
}

/** Schließt den Setzkasten: Schublade zu, die Map läuft weiter. */
export function closeSetzkasten(): void {
  const st = useSetzkasten.getState();
  if (!st.open || st.closing) return;
  st.setClosing(true);
  st.setCard(null);
  audio.sfx('clack', { zone: st.zone });
  // Die Schublade deckt den Kasten ab, dann übernimmt die Map wieder (hinter der Schublade), dann gleitet sie weg.
  closeTimer = setTimeout(() => {
    useSceneOverlay.getState().close();
    document.body.classList.remove('sk-open');
    void holdNativeGlass(false);
    closeTimer = setTimeout(() => {
      closeTimer = null;
      root?.unmount();
      host?.remove();
      root = null;
      host = null;
      useSetzkasten.setState({ open: false, ready: false, closing: false, card: null });
    }, 320);
  }, 170);
}

export function isSetzkastenOpen(): boolean {
  return useSetzkasten.getState().open;
}

function SetzkastenLayer({ scene: sc }: { scene: SetzkastenScene }) {
  const zone = useSetzkasten((s) => s.zone);
  const card = useSetzkasten((s) => s.card);
  const ready = useSetzkasten((s) => s.ready);
  const closing = useSetzkasten((s) => s.closing);
  const collection = useProgress((s) => s.collection);
  const reached = useProgress((s) => s.reached);
  const active = useSceneOverlay((s) => s.active);
  const catalog = useMemo(() => catalogFor(BUNDLED_RULES), []);
  const headRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) useSetzkasten.getState().setReady(true);
  }, [active]);

  // Die Map schläft: Spieltasten gehen an den Setzkasten (Escape schließt, Pfeile blättern und scrollen).
  useEffect(
    () =>
      sleepBaseInput((e) => {
        const st = useSetzkasten.getState();
        if (e.key === 'Escape') {
          if (st.card) st.setCard(null);
          else closeSetzkasten();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const i = ZONE_KEYS.indexOf(st.zone);
          const next = ZONE_KEYS[Math.min(ZONE_KEYS.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))]!;
          if (next !== st.zone) st.setZone(next);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          sc.wheel(0, e.key === 'ArrowDown' ? 120 : -120);
        }
      }),
    [sc],
  );

  // Kopf und Reiter decken den oberen Rand ab: der Kasten scrollt darunter.
  useLayoutEffect(() => {
    const measure = () => {
      const h = headRef.current?.getBoundingClientRect();
      sc.setInsets(h ? h.bottom + 6 : 132, 20);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sc]);

  // Wischen, Tippen, Rad: die DOM-Schicht fängt alles ab (die Map darunter schläft) und reicht es an die Szene.
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, .sk-card')) return;
      el.setPointerCapture?.(e.pointerId);
      sc.pointerDown(e.pointerId, e.clientX, e.clientY);
    };
    const move = (e: PointerEvent) => sc.pointerMove(e.pointerId, e.clientX, e.clientY);
    const up = (e: PointerEvent) => sc.pointerUp(e.pointerId, e.clientX, e.clientY);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      sc.wheel(e.deltaX, e.deltaY);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [sc]);

  const total = catalog.length;
  const earned = catalog.filter((e) => collection[e.key]).length;
  const perZone = (z: ZoneId) => {
    const all = catalog.filter((e) => e.zone === z);
    return { have: all.filter((e) => collection[e.key]).length, all: all.length };
  };
  const first = ZONE_LEVELS[zone][0];
  const locked = reached < first - 1 && perZone(zone).have === 0;

  return (
    <div ref={layerRef} className="sk-layer" data-testid="setzkasten" data-ready={ready} data-closing={closing} role="dialog" aria-label="Setzkasten">
      <div className="sk-drawer" aria-hidden="true" />
      <button className="sk-close" onClick={closeSetzkasten} aria-label="Schließen" data-testid="setzkasten-close">
        <span aria-hidden="true">✕</span>
      </button>
      <div ref={headRef} className="sk-head">
        <div className="sk-title">
          <h2>Setzkasten</h2>
          <b className="sk-count" data-testid="setzkasten-count">
            {earned} / {total}
          </b>
        </div>
        <nav className="sk-tabs" aria-label="Zonen">
          {ZONE_KEYS.map((z) => {
            const c = perZone(z);
            const on = z === zone;
            return (
              <button
                key={z}
                className="sk-tab"
                data-active={on}
                data-testid={`setzkasten-tab-${z}`}
                style={{ '--tab-bg': ZONE_TINT[z].bg, '--tab-fg': ZONE_TINT[z].fg } as CSSProperties}
                onClick={() => useSetzkasten.getState().setZone(z)}
                aria-label={`${ZONE_NAME[z]} ${c.have} von ${c.all}`}
              >
                {on ? <span className="sk-tab-name">{ZONE_NAME[z]}</span> : null}
                <b>
                  {c.have}/{c.all}
                </b>
              </button>
            );
          })}
        </nav>
      </div>
      {locked && ready ? (
        <div className="sk-lid" data-testid="setzkasten-lid">
          <b>ab Level {first}</b>
        </div>
      ) : null}
      {card ? <Card card={card} /> : null}
    </div>
  );
}

function Card({ card }: { card: CreatureCard }) {
  const name = card.earned ? SPECIES_NAME[card.species as keyof typeof SPECIES_NAME] ?? card.species : '?';
  return (
    <div className="sk-card" data-testid="setzkasten-card" data-earned={card.earned} onClick={() => useSetzkasten.getState().setCard(null)}>
      <b className="sk-card-tier">{2 ** card.tier}</b>
      <div className="sk-card-body">
        <h3 className="sk-card-name">{name}</h3>
        <p className="sk-card-where">{card.earned && card.level !== null ? `gefunden in Level ${card.level}` : 'noch nicht gefunden'}</p>
        <p className="sk-card-tags">
          <span className="sk-chip" style={{ '--chip-bg': ZONE_TINT[card.zone].bg, '--chip-fg': ZONE_TINT[card.zone].fg } as CSSProperties}>
            {ZONE_NAME[card.zone]}
          </span>
          <span className="sk-chip sk-rarity">{rarityOf(card.p)}</span>
        </p>
      </div>
    </div>
  );
}
