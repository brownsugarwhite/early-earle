import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { KlassikFormat } from '@ee/core';
import { useFlowStore } from '../flow/flowStore';
import { nativeGlassLayout } from '../native/liquidGlass';
import { useProgress } from '../state/progress';
import { KLASSIK_FORMATS, formatOpen } from './formats';
import { startKlassik } from './session';
import { useKlassik } from './store';
import './klassik.css';

/** Kartenfarben der Formate (Juwelentöne aus tokens.css, flach). */
const TONES = ['var(--sky-1)', 'var(--pink)', 'var(--neon)', 'var(--khaki)', 'var(--sky-2)', 'var(--violet)', 'var(--teal)'];

/** Kleine Zeichnung des Rasters: spielbare Zellen als Kästchen, Pfeiler hell, Risse leer. */
function MiniGrid({ format }: { format: KlassikFormat }) {
  const { w, h, mask } = format.grid;
  const cells: string[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push(mask[y]?.charAt(x) ?? '#');
  return (
    <div className="kl-mini" style={{ '--w': w, '--h': h } as CSSProperties} aria-hidden="true">
      {cells.map((c, i) => (
        <span key={i} data-cell={c === '.' ? 'open' : c === 'P' ? 'pillar' : 'void'} />
      ))}
    </div>
  );
}

/** Stern vor dem Bestwert (gefüllte Form, keine Kontur). */
function Star() {
  return (
    <svg className="kl-star" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z" />
    </svg>
  );
}

/** Das Format-Blatt auf der Karte: offene Formate mit Bestwert, gesperrte grau mit „ab Level N“. */
function KlassikSheet() {
  const open = useKlassik((s) => s.sheetOpen);
  const slots = useKlassik((s) => s.slots);
  const close = useKlassik((s) => s.closeSheet);
  const mode = useProgress((s) => s.mode);
  const reached = useProgress((s) => s.reached);
  const phase = useFlowStore((s) => s.phase);
  const panel = useRef<HTMLDivElement>(null);
  const shown = open && phase === 'map';

  useEffect(() => {
    if (shown) panel.current?.focus({ preventScroll: true });
  }, [shown]);

  if (!shown) return null;
  // In der App liegt die native Aktionszeile über der Webansicht: das Blatt endet darüber.
  const nativeBottom = nativeGlassLayout()?.bottom ?? 0;
  const best = slots[mode].best;
  // Tasten bleiben im Blatt (die Karte startet sonst mit Enter das Level); Escape schließt.
  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
  };
  return (
    <div className="kl-sheet-wrap" onKeyDown={onKeyDown}>
      <div className="kl-backdrop" onClick={close} data-testid="klassik-backdrop" />
      <div
        className="kl-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Klassik"
        tabIndex={-1}
        ref={panel}
        data-testid="klassik-sheet"
        style={nativeBottom > 0 ? { bottom: `${nativeBottom + 12}px` } : undefined}
      >
        <header className="kl-head">
          <h2 className="kl-title">Klassik</h2>
          <button className="kl-close" onClick={close} aria-label="Schließen" data-testid="klassik-close">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="kl-cards">
          {KLASSIK_FORMATS.map((f, i) => {
            const unlocked = formatOpen(f, mode, reached);
            const score = best[f.id] ?? 0;
            const label = unlocked ? `${f.name}${score > 0 ? `, Bestwert ${score}` : ''}` : `${f.name}, ab Level ${f.unlockAfterLevel}`;
            return (
              <button
                key={f.id}
                className="kl-card"
                data-locked={!unlocked}
                data-testid={`klassik-format-${f.id}`}
                style={{ '--tone': TONES[i % TONES.length] } as CSSProperties}
                disabled={!unlocked}
                aria-label={label}
                onClick={() => startKlassik(f.id)}
              >
                <MiniGrid format={f} />
                {unlocked ? (
                  <>
                    <span className="kl-name">{f.name}</span>
                    <span className="kl-best" data-testid={`klassik-best-${f.id}`}>
                      {score > 0 ? (
                        <>
                          <Star />
                          {score}
                        </>
                      ) : (
                        '–'
                      )}
                    </span>
                  </>
                ) : (
                  <span className="kl-lock">
                    ab Level <b>{f.unlockAfterLevel}</b>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** „Bestwert!“-Stempel: erscheint bei jeder Erhöhung des Zählers einmal. */
function BestStamp() {
  const stamp = useKlassik((s) => s.stamp);
  const [visible, setVisible] = useState<number | null>(null);
  useEffect(() => {
    if (stamp === 0) return;
    setVisible(stamp);
    const t = setTimeout(() => setVisible(null), 1900);
    return () => clearTimeout(t);
  }, [stamp]);
  if (visible === null) return null;
  return (
    <div key={visible} className="kl-stamp" role="status" data-testid="klassik-stamp">
      Bestwert!
    </div>
  );
}

function KlassikLayer() {
  return (
    <>
      <KlassikSheet />
      <BestStamp />
    </>
  );
}

/** Hängt die Klassik-Ebene (eigene React-Wurzel über der Szene) an; liefert das Abhängen. */
export function mountKlassikLayer(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const host = document.createElement('div');
  host.className = 'klassik-layer';
  host.dataset.testid = 'klassik-layer';
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  root.render(<KlassikLayer />);
  return () => {
    root.unmount();
    host.remove();
  };
}
