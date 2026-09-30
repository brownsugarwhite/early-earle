import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import rexJson from '@content/rex/lines.json';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { RexLabScene, type RexLabAction, type RexLabHud, type RexLabStats, type RexLabView } from '../lab/rex/RexLabScene';
import '../lab/earle/earle-lab.css';
import '../lab/rex/rex-lab.css';

/** Every line REX has (content/rex/lines.json), for the talk presets. */
const LINES: string[] = (() => {
  const triggers = (rexJson as { triggers: Record<string, Array<{ lines: string[] }>> }).triggers;
  const out = new Set<string>();
  for (const entries of Object.values(triggers)) for (const e of entries) for (const l of e.lines) out.add(l);
  return [...out];
})();

const ACTIONS: Array<{ id: RexLabAction; label: string; arg?: string; test: string }> = [
  { id: 'idle', label: 'Idle', test: 'idle' },
  { id: 'cheer', label: 'Jubeln', test: 'cheer' },
  { id: 'cheer', label: 'Jubeln ×3', arg: 'combo3', test: 'cheer3' },
  { id: 'despair', label: 'Verzweifeln', test: 'despair' },
  { id: 'point', label: 'Zeigen', test: 'point' },
  { id: 'peek', label: 'Auftauchen', test: 'peek' },
  { id: 'dizzy', label: 'Benommen', test: 'dizzy' },
  { id: 'celebrate', label: 'Feiern', test: 'celebrate' },
  { id: 'celebrate', label: 'Zonenfinale', arg: 'finale', test: 'finale' },
  { id: 'hide', label: 'Abtauchen', test: 'hide' },
];

const VIEWS: Array<{ id: RexLabView; label: string }> = [
  { id: 'wiese', label: 'Wiese' },
  { id: 'map', label: 'iPhone · Karte' },
  { id: 'level', label: 'iPhone · Level' },
];

/** iPhone 15/16 Pro portrait in CSS px, with its safe areas. */
const PHONE = { w: 393, h: 852, safeTop: 59, safeBottom: 34 };

/**
 * Speech-bubble tail: a triangle standing on the bubble's top edge, pointing at REX's mouth (at most 30 px long,
 * never reaching into him). Frame px.
 */
function tailPoints(anchor: { x: number; y: number }, box: { left: number; right: number; top: number }): string {
  const bx = Math.max(box.left + 26, Math.min(box.right - 26, anchor.x));
  const by = box.top + 2;
  const dx = anchor.x - bx;
  const dy = anchor.y - by;
  const len = Math.hypot(dx, dy);
  const L = Math.min(30, len - 12);
  if (L < 8 || dy > -4) return '';
  const ax = bx + (dx / len) * L;
  const ay = by + (dy / len) * L;
  return `${bx - 12},${by} ${ax.toFixed(1)},${ay.toFixed(1)} ${bx + 12},${by}`;
}

function viewFromUrl(v: string | null): RexLabView {
  return v === 'map' || v === 'level' ? v : 'wiese';
}

function Range(props: { label: string; value: number; min: number; max: number; step: number; format?: (v: number) => string; onChange: (v: number) => void; testId?: string }) {
  const { label, value, min, max, step, format, onChange, testId } = props;
  return (
    <label className="earle-ctl" data-testid={testId}>
      <span>{label}</span>
      <output>{format ? format(value) : value}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Rect of `el` in the canvas' CSS px (the phone frame may be scaled to fit the window). */
function rectIn(el: Element | null, canvas: DOMRect, k: number): RexLabHud['lineBox'] {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: (r.left - canvas.left) / k, top: (r.top - canvas.top) / k, right: (r.right - canvas.left) / k, bottom: (r.bottom - canvas.top) / k };
}

/**
 * P7 REX-Lab: REX alone on an Earle meadow (every animation on a button, size and time-scale sliders, click the
 * meadow to move the pink target for `Zeigen`), and an iPhone portrait frame (393 × 852) that shows his map and
 * level placement with a mock path, the glass-HUD insets and his line box attached as a speech bubble.
 * URL: `?view=wiese|map|level&anim=cheer&size=1&ui=0`.
 */
export function LabRex() {
  const [search] = useSearchParams();
  const [view, setView] = useState<RexLabView>(viewFromUrl(search.get('view')));
  const [size, setSize] = useState(() => Math.max(0.5, Math.min(1.8, Number(search.get('size') ?? 1) || 1)));
  const [timeScale, setTimeScale] = useState(1);
  const [text, setText] = useState(LINES[1] ?? 'Hallo, Kleines.');
  const [line, setLine] = useState<string>(LINES[1] ?? 'Hallo, Kleines.');
  const [debug, setDebug] = useState(search.get('debug') !== '0');
  const [stats, setStats] = useState<RexLabStats | null>(null);
  const controller = useMemo(() => {
    const c = (search.get('cam') ?? '').split(',').map(Number);
    const cam = c.length >= 3 && c.every(Number.isFinite) ? { yaw: c[0]!, pitch: c[1]!, distance: c[2]!, target: [0.05, c[3] ?? 0.52, 0] as [number, number, number] } : undefined;
    return new RexLabScene({ view, size, timeScale, debug, cam });
  }, [view]);
  const phoneRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<SVGPolygonElement>(null);
  const hideUi = search.get('ui') === '0';

  useEffect(() => controller.setParams({ size, timeScale, debug }), [controller, size, timeScale, debug]);

  // The mock HUD's rects, handed to the scene's placement (the flow measures its real HUD the same way).
  useEffect(() => {
    controller.setHudProvider(() => {
      const phone = phoneRef.current;
      const canvas = phone?.querySelector('canvas');
      if (!phone || !canvas) return null;
      const cr = canvas.getBoundingClientRect();
      const k = cr.height / PHONE.h || 1;
      const top = rectIn(phone.querySelector('[data-rex-hud="top"]'), cr, k);
      const bottom = rectIn(phone.querySelector('[data-rex-hud="bottom"]'), cr, k);
      return {
        safe: { top: PHONE.safeTop, right: 0, bottom: PHONE.safeBottom, left: 0 },
        hudTop: top ? top.bottom : PHONE.safeTop + 60,
        hudBottom: bottom ? bottom.top : PHONE.h - 180,
        lineBox: rectIn(phone.querySelector('[data-rex-hud="line"]'), cr, k),
        actions: rectIn(phone.querySelector('[data-rex-hud="actions"]'), cr, k),
      };
    });
    return () => controller.setHudProvider(null);
  }, [controller]);

  // Stats for the info line (4 Hz) and the bubble tail (every frame, straight into CSS variables).
  useEffect(() => {
    const id = window.setInterval(() => setStats(controller.getStats()), 250);
    let raf = 0;
    const tick = () => {
      const s = controller.getStats();
      const tail = tailRef.current;
      const phone = phoneRef.current;
      const bubble = phone?.querySelector('[data-rex-hud="line"]');
      if (tail && phone && bubble) {
        const pr = phone.getBoundingClientRect();
        const br = bubble.getBoundingClientRect();
        tail.setAttribute('points', s.anchor ? tailPoints(s.anchor, { left: br.left - pr.left, right: br.right - pr.left, top: br.top - pr.top }) : '');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [controller]);

  // `?anim=` plays once REX is up (screenshots).
  useEffect(() => {
    const anim = search.get('anim');
    if (!anim) return;
    const id = window.setTimeout(() => {
      const a = ACTIONS.find((x) => x.test === anim);
      if (a) controller.play(a.id, a.arg);
      else if (anim === 'talk') controller.play('talk', text);
    }, Number(search.get('delay') ?? 1400));
    return () => window.clearTimeout(id);
  }, [controller]);

  const play = (a: RexLabAction, arg?: string) => {
    if (a === 'talk') {
      setLine(arg ?? text);
      controller.play('talk', arg ?? text);
    } else controller.play(a, arg);
  };

  const pl = stats?.placement ?? null;
  const spot = stats?.spot ?? null;
  const info = stats
    ? `REX · ${stats.vertices} Vertices · ${stats.bones} Knochen · 1 Mesh (+1 Schattenscheibe) · Aktion ${stats.action}${stats.hidden ? ' · versteckt' : ''}` +
      (pl ? ` · Karte: ${pl.side === 'left' ? 'links' : 'rechts'} ${pl.stance === 'corner' ? 'Ecke' : 'auf der Box'}, Rand ${Math.round(pl.rimY)} px, sichtbar ${Math.round(pl.visible)} px` : '') +
      (spot ? ` · Level: ${spot.kind} ${spot.side === 'left' ? 'links' : 'rechts'}` : '')
    : '…';

  const phone = view !== 'wiese';
  const canvas = <CanvasHost controller={controller} />;
  return (
    <div className="rex-lab" data-view={view} data-ui={hideUi ? 'off' : 'on'} data-testid="rex-lab">
      <LabFrame
        title="P7 REX-Lab · der Guide"
        peek={
          hideUi
            ? undefined
            : ACTIONS.map((a) => (
                <button key={a.test} type="button" className="rex-btn rex-btn--act" data-active={stats?.action === a.id && a.id !== 'idle'} onClick={() => play(a.id, a.arg)} data-testid={`rex-act-${a.test}`}>
                  {a.label}
                </button>
              ))
        }
        controls={
          hideUi ? undefined : (
            <>
              <p className="rex-info" data-testid="rex-lab-info">
                {info}
              </p>
              <div className="rex-row" role="group" aria-label="Ansicht">
                {VIEWS.map((v) => (
                  <button key={v.id} type="button" className="rex-btn" data-active={view === v.id} onClick={() => setView(v.id)} data-testid={`rex-view-${v.id}`}>
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="rex-row rex-row--talk">
                <input className="rex-text" list="rex-lines" value={text} onChange={(e) => setText(e.target.value)} aria-label="REX-Zeile" data-testid="rex-text" />
                <datalist id="rex-lines">
                  {LINES.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
                <button type="button" className="rex-btn rex-btn--act" onClick={() => play('talk')} data-testid="rex-act-talk">
                  Sprechen
                </button>
                <Range label="Größe" testId="rex-size" value={size} min={0.6} max={1.6} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={setSize} />
                <Range label="Tempo" testId="rex-speed" value={timeScale} min={0.25} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={setTimeScale} />
                <label className="earle-ctl earle-ctl--toggle">
                  <span>Platzierung</span>
                  <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
                </label>
              </div>
            </>
          )
        }
      >
        {phone ? (
          <div className="rex-stage">
            <div className="rex-phone" ref={phoneRef} style={{ width: PHONE.w, height: PHONE.h }} data-testid="rex-phone">
              {canvas}
              <PhoneHud view={view} line={line} />
              <svg className="rex-tail" width={PHONE.w} height={PHONE.h} aria-hidden="true">
                <defs>
                  <linearGradient id="rex-tail-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff77ae" />
                    <stop offset="1" stopColor="#b668d9" />
                  </linearGradient>
                </defs>
                <polygon ref={tailRef} points="" fill="url(#rex-tail-grad)" />
              </svg>
              {debug ? <PlacementOverlay stats={stats} /> : null}
            </div>
          </div>
        ) : (
          canvas
        )}
      </LabFrame>
    </div>
  );
}

/** Mock of the flow's glass HUD in the phone frame (same insets as flow.css), REX line as a speech bubble. */
function PhoneHud({ view, line }: { view: RexLabView; line: string }) {
  return (
    <div className="rex-phone-hud" data-view={view}>
      <div className="rex-status" aria-hidden="true">
        <span>9:41</span>
        <i className="rex-island" />
        <span>●●● ▮</span>
      </div>
      <header className="rex-pill" data-rex-hud="top">
        <h1>
          <small>{view === 'map' ? 'Tjorizo · Level 6' : 'Tjorizo · Level 1'}</small>
          {view === 'map' ? 'Fels im Weg' : 'Zwei werden eins'}
        </h1>
        <div className="rex-pill-stat">
          <b>{view === 'map' ? '14' : '∞'}</b>
          <span>Züge</span>
        </div>
        <span className="rex-pill-goal">Stufe 8</span>
      </header>
      <footer className="rex-bottom" data-rex-hud="bottom">
        <div className="rex-bubble" data-rex-hud="line" data-testid="rex-bubble">
          <div className="rex-bubble-in">
            <span className="rex-bubble-name">REX</span> {line}
          </div>
        </div>
        <div className="rex-actions" data-rex-hud="actions">
          {view === 'map' ? (
            <button type="button" className="rex-glass-btn rex-glass-btn--primary">
              Spielen ▶
            </button>
          ) : (
            <>
              <button type="button" className="rex-glass-btn">⟲ Zurück</button>
              <button type="button" className="rex-glass-btn">↻ Neu</button>
              <button type="button" className="rex-glass-btn">◀ Map</button>
            </>
          )}
        </div>
      </footer>
      <i className="rex-home" aria-hidden="true" />
    </div>
  );
}

/** Lab-only overlay: rim line, REX's visible box, the circles he must not cover, the speech anchor. */
function PlacementOverlay({ stats }: { stats: RexLabStats | null }) {
  if (!stats) return null;
  const pl = stats.placement;
  const sp = stats.spot;
  return (
    <div className="rex-debug" aria-hidden="true">
      {stats.avoid.map((a, i) => (
        <i key={i} className="rex-debug-avoid" style={{ left: a.x - a.r, top: a.y - a.r, width: a.r * 2, height: a.r * 2 }} />
      ))}
      {pl ? (
        <>
          <i className="rex-debug-rim" style={{ top: pl.rimY }} />
          <i className="rex-debug-box" style={{ left: pl.x - (pl.visible * 0.92) / 2, top: pl.rimY - pl.visible, width: pl.visible * 0.92, height: pl.visible }} />
        </>
      ) : null}
      {sp ? <i className="rex-debug-box" style={{ left: sp.rect.left, top: sp.rect.top, width: sp.rect.right - sp.rect.left, height: sp.rect.bottom - sp.rect.top }} /> : null}
      {stats.anchor ? <i className="rex-debug-anchor" style={{ left: stats.anchor.x - 4, top: stats.anchor.y - 4 }} /> : null}
    </div>
  );
}
