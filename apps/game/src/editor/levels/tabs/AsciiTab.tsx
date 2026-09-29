import { useMemo, useState } from 'react';
import { asciiTiers } from '@ee/core';
import { LEGEND, draftSummary, draftToAscii } from '../ascii';
import { useEditorStore } from '../editorStore';
import { usePreviewStore } from '../previewStore';
import { Row, Section } from '../ui';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function AsciiTab() {
  const draft = useEditorStore((s) => s.draft);
  const showToast = useEditorStore((s) => s.showToast);
  const state = usePreviewStore((s) => s.state);
  const mode = usePreviewStore((s) => s.mode);
  const attempt = usePreviewStore((s) => s.attempt);
  const [showLegend, setShowLegend] = useState(false);
  const board = useMemo(() => (draft ? draftToAscii(draft) : ''), [draft]);
  const summary = useMemo(() => (draft ? draftSummary(draft) : ''), [draft]);
  if (!draft) return null;
  const live = mode === 'play' && state ? asciiTiers(state) : null;
  const report = `${summary}\n\n${board}${live ? `\n\nAktueller Stand (Versuch ${attempt}, ${state?.movesLeft} Züge übrig):\n${live}` : ''}\n`;
  const copy = async () => showToast((await copyText(report)) ? 'In die Zwischenablage kopiert' : 'Kopieren fehlgeschlagen', 'ok');

  return (
    <>
      <Section
        title="ASCII"
        aside={
          <Row>
            <button type="button" className="ed-btn ed-btn-small" onClick={() => setShowLegend(!showLegend)}>
              Legende
            </button>
            <button type="button" className="ed-btn ed-btn-small ed-btn-primary" onClick={() => void copy()} data-testid="ascii-copy">
              Kopieren
            </button>
          </Row>
        }
      >
        <pre className="ed-pre" data-testid="ascii-board">
          {summary}
          {'\n\n'}
          {board}
        </pre>
        {live ? (
          <>
            <h4 className="ed-h4">Aktueller Stand (Versuch {attempt})</h4>
            <pre className="ed-pre">{live}</pre>
          </>
        ) : null}
        <p className="ed-hint">Token-Format von <code>levelFromAscii</code> — ein kopiertes Brett lässt sich direkt in einen Test übernehmen.</p>
        {showLegend ? (
          <dl className="ed-legend">
            {LEGEND.map(([tok, text]) => (
              <div key={tok}>
                <dt>
                  <code>{tok}</code>
                </dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Section>
    </>
  );
}
