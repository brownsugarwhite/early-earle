import { useEffect, useRef, type ReactNode } from 'react';

/** Touch-Bedienelemente des Editors: ≥ 44 px, keine Konturen, Versatzschatten in Sonnenrichtung. */

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  testId?: string;
  compact?: boolean;
}

/** −/+ mit Auto-Wiederholung beim Gedrückthalten. */
export function Stepper({ label, value, min, max, step = 1, onChange, format, testId, compact }: StepperProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const bump = (dir: 1 | -1) => {
    const next = Math.round((latest.current + dir * step) * 1000) / 1000;
    if (next < min || next > max) return false;
    onChange(next);
    latest.current = next;
    return true;
  };
  const start = (dir: 1 | -1) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!bump(dir)) return;
    let delay = 420;
    const tick = () => {
      if (!bump(dir)) return stop();
      delay = Math.max(70, delay * 0.8);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };
  const text = format ? format(value) : String(value);
  return (
    <div className={`ed-stepper${compact ? ' compact' : ''}`} data-testid={testId}>
      <span className="ed-label">{label}</span>
      <div className="ed-stepper-ctl">
        <button type="button" className="ed-btn ed-btn-sq" aria-label={`${label} verringern`} disabled={value - step < min - 1e-9} onPointerDown={start(-1)} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}>
          −
        </button>
        <output className="ed-stepper-val" data-testid={testId ? `${testId}-value` : undefined}>{text}</output>
        <button type="button" className="ed-btn ed-btn-sq" aria-label={`${label} erhöhen`} disabled={value + step > max + 1e-9} onPointerDown={start(1)} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}>
          +
        </button>
      </div>
    </div>
  );
}

interface SegProps<T extends string> {
  label?: string;
  value: T;
  options: readonly { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  testIdPrefix?: string;
}

/** Segmentierte Auswahl (Chips). */
export function Seg<T extends string>({ label, value, options, onChange, testIdPrefix }: SegProps<T>) {
  return (
    <div className="ed-seg-wrap">
      {label ? <span className="ed-label">{label}</span> : null}
      <div className="ed-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className="ed-chip"
            data-active={o.value === value}
            title={o.title}
            data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, on, onChange, testId }: { label: string; on: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <button type="button" className="ed-chip ed-toggle" data-active={on} aria-pressed={on} onClick={() => onChange(!on)} data-testid={testId}>
      <span className="ed-toggle-box" aria-hidden="true" />
      {label}
    </button>
  );
}

export function TextField({ label, value, onChange, testId, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; testId?: string; placeholder?: string; mono?: boolean }) {
  return (
    <label className="ed-field">
      <span className="ed-label">{label}</span>
      <input className={`ed-input${mono ? ' mono' : ''}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testId} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
    </label>
  );
}

export function Row({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return <div className={`ed-row${wrap ? ' wrap' : ''}`}>{children}</div>;
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="ed-section">
      <header className="ed-section-head">
        <h3 className="ed-h3">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}
