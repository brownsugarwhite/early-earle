import { useMemo, useState } from 'react';
import { ZONES, ZONE_LABEL, cellKey, moundCells, type LevelDraft, type ZoneId } from '../draft';
import { useEditorStore } from '../editorStore';
import { TEMPLATES, buildTemplate, type TemplateId } from '../templates';
import { BlobGlyph, C, CracksOrnament, CurrentOrnament, OilOrnament, PortalRing, SporeOrnament, ToolGlyph, UiIcon, floorFill } from '../icons';
import { ZONE_COLOR, de } from '../chain';
import { Row, Section } from '../ui';
import { IS_NATIVE, useContentTarget } from '../../content/target';

/** Mini-Brett als Vorschau einer Vorlage (gleiche Glyphen wie das große Brett, stark verkleinert). */
function MiniBoard({ level }: { level: LevelDraft }) {
  const { w, h, mask } = level.grid;
  const P = 112;
  const items = new Map<string, React.ReactNode>();
  for (const s of level.start) items.set(cellKey(s.at), <BlobGlyph blob={s.blob} scale={0.9} />);
  for (const b of level.blockers) {
    if (b.kind === 'scrapMound') {
      for (const c of moundCells(b.at)) items.set(cellKey(c), <ToolGlyph tool="scrap" />);
    } else items.set(cellKey(b.at), <ToolGlyph tool={b.kind} />);
  }
  for (const t of level.threats) items.set(cellKey(t.at), <ToolGlyph tool={t.kind} />);
  const floors = new Map(level.floors.map((f) => [cellKey(f.at), f] as const));
  const floorArt = (key: string) => {
    const f = floors.get(key);
    if (!f) return null;
    switch (f.kind) {
      case 'portal':
        return <PortalRing big />;
      case 'current':
        return <CurrentOrnament dir={f.dir} />;
      case 'spore':
        return <SporeOrnament />;
      case 'oil':
        return <OilOrnament />;
      default:
        return <CracksOrnament deep={f.kind === 'deepWithered'} />;
    }
  };
  return (
    <svg className="ft-mini" viewBox={`-8 -8 ${w * P + 4} ${h * P + 4}`} aria-hidden="true">
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => {
          const ch = mask[y]?.charAt(x);
          const key = cellKey([x, y]);
          return (
            <g key={key} transform={`translate(${x * P} ${y * P})`}>
              <rect width={100} height={100} fill={ch === '#' ? C.ink : ch === 'P' ? C.pillar : floorFill(floors.get(key)?.kind)} />
              {ch === '.' ? floorArt(key) : null}
              {ch === '.' ? items.get(key) : null}
            </g>
          );
        }),
      )}
    </svg>
  );
}

function TemplatePicker() {
  const draft = useEditorStore((s) => s.draft);
  const files = useEditorStore((s) => s.files);
  const newFromTemplate = useEditorStore((s) => s.newFromTemplate);
  const createNew = useEditorStore((s) => s.createNew);
  const setSheet = useEditorStore((s) => s.setSheet);
  const [zone, setZone] = useState<ZoneId>(draft?.zone ?? 'tjorizo');
  const nextNo = files.reduce((m, f) => Math.max(m, /^\d{3}\.json$/.test(f.file) ? Number(f.file.slice(0, 3)) : 0), 0) + 1;
  const previews = useMemo(() => {
    const out = new Map<TemplateId, LevelDraft | null>();
    for (const t of TEMPLATES) {
      try {
        out.set(t.id, buildTemplate(zone, t.id, nextNo, 0));
      } catch {
        out.set(t.id, null);
      }
    }
    return out;
  }, [zone, nextNo]);

  return (
    <Section title="Neu aus Vorlage">
      <div className="ed-seg" role="radiogroup" aria-label="Zone">
        {ZONES.map((z) => (
          <button key={z} type="button" role="radio" aria-checked={zone === z} className="ed-chip ft-zone" data-active={zone === z} onClick={() => setZone(z)} data-testid={`template-zone-${z}`}>
            <i style={{ background: ZONE_COLOR[z] }} aria-hidden="true" />
            {ZONE_LABEL[z]}
          </button>
        ))}
      </div>
      <div className="ft-templates">
        {TEMPLATES.map((t) => {
          const lvl = previews.get(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className="ft-card"
              onClick={() => {
                newFromTemplate(t.id, zone);
                setSheet('peek');
              }}
              data-testid={`template-${t.id}`}
            >
              {lvl ? <MiniBoard level={lvl} /> : <span className="ft-mini" />}
              <b>{t.label}</b>
              <span>{t.blurb}</span>
              <small>Band {lvl ? `${de(lvl.difficulty.targetAttempts[0], 1)}–${de(lvl.difficulty.targetAttempts[1], 1)}` : t.band}</small>
            </button>
          );
        })}
        <button
          type="button"
          className="ft-card ft-card-empty"
          onClick={() => {
            createNew();
            setSheet('peek');
          }}
          data-testid="new-btn"
        >
          <span className="ft-mini ft-empty-icon">
            <UiIcon name="plus" size={30} />
          </span>
          <b>Leer</b>
          <span>4×4, nur zwei Blobs</span>
          <small>Band 1,2–1,4</small>
        </button>
      </div>
      <p className="ed-hint">Landet als Entwurf (_neu-…) — erst „Sichern“ schreibt die Datei. Nochmal tippen würfelt neu.</p>
    </Section>
  );
}

export function FileTab() {
  const draft = useEditorStore((s) => s.draft);
  const activeFile = useEditorStore((s) => s.activeFile);
  const targetFile = useEditorStore((s) => s.targetFile);
  const dirty = useEditorStore((s) => s.dirty);
  const busy = useEditorStore((s) => s.busy);
  const endpoint = useEditorStore((s) => s.endpoint);
  const savedJson = useEditorStore((s) => s.savedJson);
  const validation = useEditorStore((s) => s.validation);
  const files = useEditorStore((s) => s.files);
  const save = useEditorStore((s) => s.save);
  const revert = useEditorStore((s) => s.revert);
  const duplicate = useEditorStore((s) => s.duplicate);
  const deleteFile = useEditorStore((s) => s.deleteFile);
  const download = useEditorStore((s) => s.download);
  const share = useEditorStore((s) => s.share);
  const setTargetFile = useEditorStore((s) => s.setTargetFile);
  const macHost = useContentTarget((s) => s.host);
  if (!draft) return null;
  const file = activeFile ?? targetFile;
  const entry = files.find((f) => f.file === file);
  const deletable = file.startsWith('_') || !!entry?.localOnly || (activeFile === null && !files.some((f) => f.file === targetFile && !f.localOnly));
  // In der App teilt das iOS-Blatt (AirDrop, Dateien …); im Browser, wo es die Web-Share-API gibt.
  const canShare = IS_NATIVE || (typeof navigator !== 'undefined' && typeof (navigator as Navigator & { share?: unknown }).share === 'function');
  const offline = endpoint !== 'ok';
  const status =
    activeFile === null
      ? 'Entwurf · noch nie gesichert'
      : dirty
        ? 'Ungesicherte Änderungen (lokal gemerkt)'
        : offline
          ? entry?.local
            ? 'Lokal gespeichert · geht mit Verbindung auf den Mac'
            : 'Stand der App (ohne Mac)'
          : 'Gespeichert auf dem Mac';

  return (
    <>
      <Section
        title="Diese Datei"
        aside={
          <span className="ed-endpoint" data-state={endpoint} data-testid="save-target">
            {endpoint === 'ok' ? `Mac${macHost ? ` · ${macHost}` : ''}` : endpoint === 'offline' ? 'Lokal' : '…'}
          </span>
        }
      >
        <p className="ft-status" data-dirty={dirty || activeFile === null}>
          <i aria-hidden="true" />
          {status}
        </p>
        <label className="ed-field">
          <span className="ed-label">Dateiname</span>
          <input className="ed-input mono" value={targetFile} onChange={(e) => setTargetFile(e.target.value)} data-testid="file-name" spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Dateiname" />
        </label>
        <Row>
          <button type="button" className="ed-btn ed-btn-primary" onClick={() => void save()} disabled={!validation.ok || busy} data-testid="file-save-btn">
            <UiIcon name="save" size={18} /> {busy ? 'Sichert …' : offline ? 'Lokal sichern' : 'Auf den Mac sichern'}
          </button>
          <button type="button" className="ed-btn" onClick={duplicate} data-testid="duplicate-btn">
            <UiIcon name="copy" size={18} /> Als Entwurf duplizieren
          </button>
        </Row>
        <Row>
          <button type="button" className="ed-btn ed-btn-small" onClick={revert} disabled={!dirty || savedJson === null} data-testid="revert-btn">
            <UiIcon name="undo" size={16} /> Zurücksetzen
          </button>
          {IS_NATIVE ? null : (
            <button type="button" className="ed-btn ed-btn-small" onClick={download} data-testid="download-btn">
              <UiIcon name="download" size={16} /> JSON
            </button>
          )}
          {canShare ? (
            <button type="button" className="ed-btn ed-btn-small" onClick={() => void share()} data-testid="share-btn">
              <UiIcon name="share" size={16} /> Teilen
            </button>
          ) : null}
          <button type="button" className="ed-btn ed-btn-small ed-btn-danger" onClick={() => void deleteFile()} disabled={!deletable} data-testid="delete-btn">
            <UiIcon name="trash" size={16} /> Löschen
          </button>
        </Row>
        <p className="ed-hint">
          {offline ? 'Mac nicht erreichbar: „Lokal sichern“ behält den Stand auf dem Gerät, „Teilen“ schickt die JSON-Datei weiter. ' : ''}
          {deletable ? 'Entwürfe lassen sich löschen.' : 'Nummerierte Level lassen sich nicht löschen — erst duplizieren.'} Zurücksetzen lässt sich rückgängig machen.
        </p>
      </Section>
      <TemplatePicker />
    </>
  );
}
