import { useEffect, useState } from 'react';
import type { EarleLabScene } from './EarleLabScene';
import { runEarleBench, type BenchReport } from './bench';
import type { ResolvedQuality } from './quality';

/** Bench-Overlay für `/lab/earle?bench=1[&presets=mobil,hoch]`: läuft automatisch, zeigt die Ergebnistabelle groß und konturlos. */
export function BenchPanel({ controller, presets }: { controller: EarleLabScene; presets?: ResolvedQuality[] }) {
  const [status, setStatus] = useState('Start …');
  const [report, setReport] = useState<BenchReport | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    runEarleBench(controller, { onProgress: setStatus, isCancelled: () => cancelled, ...(presets && presets.length > 0 ? { presets } : {}) }).then((r) => {
      if (!cancelled && r) {
        setReport(r);
        setStatus('Fertig');
      }
    });
    return () => {
      cancelled = true;
      controller.setAutoRotate(0);
    };
  }, [controller, run, presets]);

  return (
    <section className="earle-bench" data-testid="earle-bench" data-done={report ? '1' : '0'}>
      <h2 className="earle-bench__title">Earle-Bench</h2>
      {report ? (
        <>
          <table className="earle-bench__table">
            <thead>
              <tr>
                <th>Preset</th>
                <th>Modus</th>
                <th>fps</th>
                <th>p99 ms</th>
                <th>dc</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={`${r.preset}-${r.mode}`}>
                  <td>{r.preset === 'hoch' ? 'Hoch' : 'Mobil'}</td>
                  <td>{r.mode === 'idle' ? 'Leerlauf' : 'rotierend'}</td>
                  <td>{r.fps}</td>
                  <td>{r.p99}</td>
                  <td>{r.drawCalls}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="earle-bench__info">
            <dt>Backend</dt>
            <dd>{report.info.backend === 'webgpu' ? 'WebGPU' : report.info.backend === 'webgl2' ? 'WebGL2' : '?'}</dd>
            <dt>DPR</dt>
            <dd>
              Gerät {report.info.deviceDpr} ·{' '}
              {(['hoch', 'mobil'] as const)
                .map((p) => report.rows.find((r) => r.preset === p))
                .filter((r): r is NonNullable<typeof r> => Boolean(r))
                .map((r) => `${r.preset === 'hoch' ? 'Hoch' : 'Mobil'} ${r.dpr} (${r.canvas[0]} × ${r.canvas[1]} px)`)
                .join(' · ')}
            </dd>
            <dt>CSS</dt>
            <dd>
              {report.info.css[0]} × {report.info.css[1]} px
            </dd>
            <dt>Dauer</dt>
            <dd>{(report.durationMs / 1000).toFixed(1)} s</dd>
          </dl>
          <p className="earle-bench__ua">{report.info.ua}</p>
          <button type="button" className="earle-bench__button" onClick={() => setRun((n) => n + 1)}>
            Nochmal
          </button>
        </>
      ) : (
        <p className="earle-bench__status">{status}</p>
      )}
    </section>
  );
}
