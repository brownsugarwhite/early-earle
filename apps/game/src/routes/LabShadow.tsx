import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_SHADOW_PARAMS, ShadowLabScene, type ShadowLabMode, type ShadowLabParams, type ShadowLabStats, type ShadowLabView } from '../lab/shadow/ShadowLabScene';
import '../lab/earle/earle-lab.css';
import '../lab/shadow/shadow-lab.css';

/** Startparameter aus der URL: `?view=iphone&mode=split&sun=10&az=70&mag=0.5,0.55&debug=1&cascades=mobil&taps=4`. */
function paramsFromUrl(search: URLSearchParams): Partial<ShadowLabParams> {
  const out: Partial<ShadowLabParams> = {};
  const num = (k: string): number | null => {
    const v = search.get(k);
    return v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  };
  const mode = search.get('mode');
  if (mode === 'neu' || mode === 'alt' || mode === 'split') out.mode = mode;
  const view = search.get('view');
  if (view === 'iphone' || view === 'earle' || view === 'uebersicht' || view === 'nah' || view === 'oben') out.view = view;
  const sun = num('sun');
  if (sun !== null) out.sunElevation = Math.max(4, Math.min(30, sun));
  const az = num('az');
  if (az !== null) out.sunAzimuth = Math.max(-180, Math.min(180, az));
  const c = search.get('cascades');
  if (c === 'hoch' || c === 'mobil' || c === 'ultra') out.cascades = c;
  const taps = num('taps');
  if (taps === 0 || taps === 1 || taps === 4 || taps === 9) out.taps = taps;
  const debug = num('debug');
  if (debug === 0 || debug === 1 || debug === 2) out.debug = debug;
  const mag = search.get('mag');
  if (mag === '0') out.magnifier = false;
  else if (mag) {
    const [x, y] = mag.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      out.magX = Math.max(0, Math.min(1, x!));
      out.magY = Math.max(0, Math.min(1, y!));
    }
  }
  const rotate = num('rotate');
  if (rotate !== null) out.rotate = rotate;
  const q = search.get('q');
  if (q === 'hoch' || q === 'mobil') out.quality = q;
  const node = num('node');
  if (node !== null) out.node = Math.max(0, Math.round(node));
  const spin = num('spin');
  if (spin !== null) out.spin = spin;
  const lambda = num('lambda');
  if (lambda !== null) out.lambda = Math.max(0, Math.min(1, lambda));
  const slope = num('slope');
  if (slope !== null) out.slopeBias = Math.max(0, slope);
  const graz = num('graz');
  if (graz !== null) out.grazingBias = Math.max(0, graz);
  const smooth = search.get('smooth');
  if (smooth === '0' || smooth === '1') out.smoothCasters = smooth === '1';
  const repeat = num('repeat');
  if (repeat !== null) out.repeat = Math.max(1, Math.min(40, Math.round(repeat)));
  return out;
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

const VIEW_LABELS: Record<ShadowLabView, string> = { iphone: 'iPhone (Flow-Karte)', earle: 'Earle-Komposition', uebersicht: 'Übersicht', nah: 'Nah am Hang', oben: 'Draufsicht (Diagnose)' };
const MODE_LABELS: Record<ShadowLabMode, string> = { neu: 'Neu', alt: 'Alt', split: 'Alt | Neu' };

function fmt(v: number, d = 1): string {
  return Number.isFinite(v) ? v.toFixed(d) : '–';
}

/**
 * P2e Schatten-Lab: Shadows v2 im Vergleich. Links alt (eine Karte über den ganzen geladenen Planeten, 1 Tap), rechts
 * neu (kamera-gefittete, nicht-quadratische Kaskaden, B-Spline-Kante, 1-px-Schnitt). 4×-Lupe auf eine Kante
 * (Klick mit ⌥/Alt setzt die Lupe), Kaskaden-/Texel-Debug, Sonnenregler, Drehung für den Stabilitätstest.
 */
export function LabShadow() {
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => ({ ...DEFAULT_SHADOW_PARAMS, ...paramsFromUrl(searchParams) }), [searchParams]);
  const [params, setParams] = useState<ShadowLabParams>(initial);
  const [stats, setStats] = useState<ShadowLabStats | null>(null);
  const [placing, setPlacing] = useState(false);
  const [, setTick] = useState(0);
  const controller = useMemo(() => new ShadowLabScene(initial), [initial]);
  const frameRef = useRef<HTMLDivElement>(null);
  // ?ui=0 blendet Regler und Kennzahlen aus (Screenshots), ?ui=info nur die Regler
  const uiParam = searchParams.get('ui');
  const hideUi = uiParam === '0' || uiParam === 'info';
  const hideInfo = uiParam === '0';

  useEffect(() => controller.subscribe((p) => setParams(p)), [controller]);
  useEffect(() => {
    const id = window.setInterval(() => {
      setStats(controller.getStats());
      setTick((t) => t + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [controller]);

  const set = (patch: Partial<ShadowLabParams>) => controller.setParams(patch);

  // Lupe setzen: ⌥/Alt-Klick oder „Lupe setzen“ + Klick
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.altKey || placing)) return;
      const canvas = el.querySelector('canvas');
      if (!canvas || e.target !== canvas) return;
      const r = canvas.getBoundingClientRect();
      controller.setParams({ magX: (e.clientX - r.left) / r.width, magY: (e.clientY - r.top) / r.height, magnifier: true });
      setPlacing(false);
    };
    el.addEventListener('click', onClick, true);
    return () => el.removeEventListener('click', onClick, true);
  }, [controller, placing]);

  const rects = controller.isMounted && params.magnifier ? controller.magnifierRects() : null;
  const cs = stats?.cascades ?? null;

  return (
    <div ref={frameRef} className="shadow-lab" data-mode={params.mode}>
      <LabFrame
        title="P2e Schatten-Lab · Shadows v2"
        controls={
          hideUi ? undefined : (
            <>
              <div className="shadow-seg" role="group" aria-label="Modus" data-testid="shadow-mode">
                {(['alt', 'split', 'neu'] as ShadowLabMode[]).map((m) => (
                  <button key={m} type="button" className={params.mode === m ? 'is-on' : ''} onClick={() => set({ mode: m })} data-testid={`mode-${m}`}>
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
              <label className="earle-ctl earle-ctl--select" data-testid="shadow-view">
                <span>Ansicht</span>
                <output>{VIEW_LABELS[params.view]}</output>
                <select value={params.view} onChange={(e) => set({ view: e.target.value as ShadowLabView })}>
                  {(Object.keys(VIEW_LABELS) as ShadowLabView[]).map((v) => (
                    <option key={v} value={v}>
                      {VIEW_LABELS[v]}
                    </option>
                  ))}
                </select>
              </label>
              <Range label="Sonne Höhe" testId="shadow-sun" value={params.sunElevation} min={4} max={30} step={0.5} format={(v) => `${v}°`} onChange={(v) => set({ sunElevation: v })} />
              <Range label="Sonne Azimut" testId="shadow-az" value={params.sunAzimuth} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => set({ sunAzimuth: v })} />
              <label className="earle-ctl earle-ctl--select" data-testid="shadow-cascades">
                <span>Kaskaden</span>
                <output>{cs ? cs.cascades.map((c) => `${c.width}×${c.height}`).join(' · ') : '–'}</output>
                <select value={params.cascades} onChange={(e) => set({ cascades: e.target.value as ShadowLabParams['cascades'] })}>
                  <option value="hoch">Hoch · 3 Kaskaden</option>
                  <option value="mobil">Mobil · 2 Kaskaden</option>
                  <option value="ultra">Ultra · 3 große</option>
                </select>
              </label>
              <label className="earle-ctl earle-ctl--select" data-testid="shadow-taps">
                <span>Kante</span>
                <output>{(() => { const t = controller.effectiveTaps; return t === 1 ? 'bilinear' : t === 4 ? 'B-Spline 3' : t === 9 ? 'B-Spline 5' : '–'; })()}</output>
                <select value={params.taps} onChange={(e) => set({ taps: Number(e.target.value) as ShadowLabParams['taps'] })}>
                  <option value={0}>Automatisch (9 Hoch · 4 Mobil)</option>
                  <option value={1}>1 Tap · bilinear (alt)</option>
                  <option value={4}>4 Taps · kubischer B-Spline</option>
                  <option value={9}>9 Taps · quintischer B-Spline</option>
                </select>
              </label>
              <label className="earle-ctl earle-ctl--select" data-testid="shadow-debug">
                <span>Debug</span>
                <output>{['aus', 'Kaskaden', 'Texel'][params.debug]}</output>
                <select value={params.debug} onChange={(e) => set({ debug: Number(e.target.value) as ShadowLabParams['debug'] })}>
                  <option value={0}>aus</option>
                  <option value={1}>Kaskaden (schlicht · Diagonalen · Kreuz)</option>
                  <option value={2}>Texelgitter</option>
                </select>
              </label>
              <Range label="Drehung" testId="shadow-rotate" value={params.rotate} min={0} max={20} step={0.5} format={(v) => (v ? `${v}°/s` : 'aus')} onChange={(v) => set({ rotate: v })} />
              <Range label="Knoten" value={params.node} min={0} max={99} step={1} onChange={(v) => set({ node: v })} />
              <Range label="Werfer-Versatz" value={params.slopeBias} min={0} max={0.2} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => set({ slopeBias: v })} />
              <Range label="Terminator-Bias" value={params.grazingBias} min={0} max={0.03} step={0.001} format={(v) => v.toFixed(3)} onChange={(v) => set({ grazingBias: v })} />
              <Range label="Aufteilung" value={params.lambda} min={0} max={1} step={0.02} format={(v) => `λ ${v.toFixed(2)}`} onChange={(v) => set({ lambda: v })} />
              <label className="earle-ctl earle-ctl--select">
                <span>Welt-Qualität</span>
                <output>{params.quality === 'mobil' ? 'Mobil' : 'Hoch'}</output>
                <select value={params.quality} onChange={(e) => set({ quality: e.target.value as ShadowLabParams['quality'] })}>
                  <option value="hoch">Hoch</option>
                  <option value="mobil">Mobil</option>
                </select>
              </label>
              <label className="earle-ctl earle-ctl--toggle">
                <span>Glatte Werfer</span>
                <input type="checkbox" checked={params.smoothCasters} onChange={(e) => set({ smoothCasters: e.target.checked })} data-testid="shadow-smooth" />
              </label>
              <label className="earle-ctl earle-ctl--toggle">
                <span>Lupe 4×</span>
                <input type="checkbox" checked={params.magnifier} onChange={(e) => set({ magnifier: e.target.checked })} data-testid="shadow-mag" />
              </label>
              <button type="button" className={`shadow-btn${placing ? ' is-on' : ''}`} onClick={() => setPlacing((p) => !p)} data-testid="shadow-mag-place">
                {placing ? 'Klick auf eine Kante …' : 'Lupe setzen'}
              </button>
              <p className="earle-hint">
                Ziehen rollt den Planeten, ⌥/Alt-Klick setzt die Lupe. Links alt (eine 2048²/1024²-Karte über den geladenen Planeten, 1 Tap), rechts neu
                (Kaskaden an der Kamera, B-Spline-Kante, 1-px-Schnitt). <code>?view=iphone&amp;mode=split&amp;mag=0.5,0.6&amp;debug=1</code>
              </p>
            </>
          )
        }
      >
        <CanvasHost controller={controller} />
        {params.mode === 'split' ? (
          <div className="shadow-split" aria-hidden="true">
            <span className="shadow-split__tag shadow-split__tag--alt">Alt</span>
            <span className="shadow-split__tag shadow-split__tag--neu">Neu</span>
          </div>
        ) : null}
        {rects ? (
          <>
            <div className="shadow-mag-src" style={{ left: rects.src.x, top: rects.src.y, width: rects.src.w, height: rects.src.h }} aria-hidden="true" />
            {rects.insets.map((r) => (
              <div key={r.label} className="shadow-mag-inset" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} data-testid="shadow-mag-inset">
                <span>{r.label}</span>
              </div>
            ))}
          </>
        ) : null}
        {hideInfo ? null : (
          <aside className="shadow-info" data-testid="shadow-info">
            {cs ? (
              <>
                <strong>Kaskaden</strong>
                {cs.cascades.map((c, i) => (
                  <span key={i} data-testid={`shadow-cascade-${i}`}>
                    K{i + 1} {c.width}×{c.height} · {c.active ? `${fmt(c.pxPerTexel)} px/Texel` : 'leer'} · bis {fmt(c.split)} m
                  </span>
                ))}
                <span>
                  ψ {fmt(cs.psiDeg, 0)}° · Tiefe {fmt(cs.dMin)}–{fmt(cs.dMax)} · Refits {cs.refits} · Pässe {stats?.passes ?? 0}
                </span>
              </>
            ) : (
              <span>Einzelkarte (keine Kamera gebunden)</span>
            )}
            <span>
              {stats?.backend ?? '…'} · {stats ? `${stats.canvas[0]}×${stats.canvas[1]}` : ''} · DPR {fmt(stats?.dpr ?? 0, 2)} · CPU {fmt(stats?.cpuMs ?? 0, 2)} ms · Chunks {stats?.chunks ?? 0}
            </span>
          </aside>
        )}
      </LabFrame>
    </div>
  );
}
