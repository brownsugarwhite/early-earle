import { useSyncExternalStore, type CSSProperties } from 'react';
import { useAppStore } from '../state/store';
import { resetQualityGovernor } from '../canvas/qualityGovernor';
import { dismissMapBench, fmtDpr, getMapBenchStatus, subscribeMapBench, type MapBenchRow, type MapBenchStatus } from '../flow/mapBench';

/** Zeigt Backend (WebGPU/WebGL2), FPS, Frametime-p99 und Draw Calls. Pflicht in jedem Lab. */
export function PerfBadge() {
  const backend = useAppStore((s) => s.backend);
  const fps = useAppStore((s) => s.fps);
  const p99 = useAppStore((s) => s.frameP99Ms);
  const dc = useAppStore((s) => s.drawCalls);
  const pref = useAppStore((s) => s.qualityPref);
  const eff = useAppStore((s) => s.effectiveQuality);
  const setPref = useAppStore((s) => s.setQualityPref);
  const bench = useSyncExternalStore(subscribeMapBench, getMapBenchStatus, getMapBenchStatus);
  const cycle = () => {
    const next = pref === 'auto' ? 'hoch' : pref === 'hoch' ? 'mobil' : 'auto';
    setPref(next);
    if (next === 'auto') resetQualityGovernor(); // explizit Auto gewählt → wieder bei Hoch starten
  };
  const qLabel = (pref === 'auto' ? 'Auto·' : '') + (eff === 'hoch' ? 'Hoch' : 'Mobil');
  const label = backend === 'webgpu' ? 'WebGPU' : backend === 'webgl2' ? 'WebGL2' : '…';
  return (
    <>
      <div className="perf-badge" data-backend={backend} data-testid="perf-badge">
        <span className="perf-backend">{label}</span>
        <span>{fps} fps</span>
        <span>p99 {p99} ms</span>
        <span>{dc} dc</span>
        <button type="button" className="perf-quality" onClick={cycle} title="Qualität: Auto → Hoch → Mobil" data-testid="perf-quality">{qLabel}</button>
      </div>
      {bench.visible ? <MapBenchTable status={bench} /> : null}
    </>
  );
}

// --- Karten-Bench (`/play?bench=karte`): kompakte Tabelle fürs Bildschirmfoto auf dem Telefon, konturlos -------------

const PANEL: CSSProperties = {
  position: 'fixed',
  top: 'calc(env(safe-area-inset-top) + 8px)',
  left: 8,
  right: 8,
  maxHeight: '78vh',
  overflow: 'auto',
  zIndex: 60,
  padding: '8px 10px',
  background: 'var(--ink)',
  color: 'var(--paper)',
  font: '9.5px/1.3 ui-monospace, Menlo, monospace',
  pointerEvents: 'auto',
};
const TABLE: CSSProperties = { borderCollapse: 'collapse', width: '100%', marginTop: 6 };
const CELL: CSSProperties = { padding: '1px 4px', textAlign: 'right', whiteSpace: 'nowrap' };
const HEAD: CSSProperties = { ...CELL, color: 'var(--neon)', fontWeight: 700 };
const FIRST: CSSProperties = { ...CELL, textAlign: 'left' };
const LABEL: CSSProperties = { ...FIRST, whiteSpace: 'normal' };
/** Welt-Index (0-basiert) als Kürzel wie in content/zones (8 → w09). */
const worldTag = (i: number) => `w${String(i + 1).padStart(2, '0')}`;

const SZENE_KURZ: Record<MapBenchRow['szene'], string> = { leerlauf: 'Ruhe', 'schwenken-kalt': 'Schw kalt', schwenken: 'Schw' };
const VARIANTE_KURZ: Record<MapBenchRow['variante'], string> = { alles: 'alles', 'ohne-schatten': '−Schatten', 'ohne-punkte': '−Punkte', 'ohne-vegetation': '−Veg' };

function MapBenchTable({ status }: { status: MapBenchStatus }) {
  const r = status.report;
  return (
    <section style={PANEL} data-testid="map-bench" data-done={r ? '1' : '0'}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <strong style={{ color: 'var(--neon)' }}>Karten-Bench</strong>
        <span style={{ flex: 1 }}>
          {r
            ? `${r.preset} · Level ${r.node + 1} · ${worldTag(r.world)} · ${r.viewport.join('×')} · ${Math.round(r.durationMs / 1000)} s`
            : `${status.row}/${status.rows} ${status.step}${status.running ? ' — bitte nicht berühren' : ''}`}
        </span>
        {status.running ? null : (
          <button type="button" onClick={dismissMapBench} style={{ font: 'inherit', background: 'var(--paper)', color: 'var(--ink)', border: 0, padding: '2px 6px' }}>
            ×
          </button>
        )}
      </div>
      {r ? (
        <>
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={{ ...HEAD, textAlign: 'left' }}>Reihe</th>
                <th style={HEAD}>DPR</th>
                <th style={HEAD}>Bild med/p99</th>
                <th style={HEAD}>CPU</th>
                <th style={HEAD}>GPU</th>
                <th style={HEAD}>dc</th>
                <th style={HEAD}>P/s</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row, i) => (
                <tr key={i}>
                  <td style={FIRST}>
                    {SZENE_KURZ[row.szene]} {VARIANTE_KURZ[row.variante]}
                    {row.kontrolle ? ' ktr' : ''}
                  </td>
                  <td style={CELL}>{fmtDpr(row.dpr)}</td>
                  <td style={CELL}>
                    {row.bild.med.toFixed(1)}/{row.bild.p99.toFixed(1)}
                  </td>
                  <td style={CELL}>{row.cpu.med.toFixed(1)}</td>
                  <td style={CELL}>{row.gpu === null ? '–' : row.gpu.toFixed(1)}</td>
                  <td style={CELL}>{row.drawCalls.med}</td>
                  <td style={CELL}>{Math.round(row.schattenPaesseProS)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={{ ...HEAD, textAlign: 'left' }}>Posten (A/B, ms)</th>
                <th style={HEAD}>GPU</th>
                <th style={HEAD}>Bild</th>
                <th style={HEAD}>CPU</th>
              </tr>
            </thead>
            <tbody>
              {r.posten.map((p, i) => (
                <tr key={i}>
                  <td style={LABEL}>
                    {p.szene === 'leerlauf' ? 'Ruhe' : 'Schw'} {p.posten.replace(/ \(.*\)$/, '')}
                  </td>
                  <td style={CELL}>{p.gpu === null ? '–' : p.gpu.toFixed(2)}</td>
                  <td style={CELL}>{p.bild.toFixed(2)}</td>
                  <td style={CELL}>{p.cpu.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
