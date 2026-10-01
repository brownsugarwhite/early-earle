import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from '../../../content/levels';
import { ZONES, ZONE_LABEL, levelNumber, type ZoneId } from '../draft';
import { useEditorStore } from '../editorStore';
import { useSolverStore } from '../solverStore';
import { buildChain, de, VERDICT_SHORT, ZONE_COLOR, ZONE_TICKS, type ChainRow } from '../chain';
import { C, KindIcon, UiIcon } from '../icons';
import { CURVE_TYPE_LABEL } from '../validation';

/**
 * Kette: alle Level als Schwierigkeitskurve (Band je Level schattiert, gestrichelt die Soll-Kurve aus `curveSpec`,
 * gemessene Versuche als Linie, Ausreißer markiert — der Sägezahn wird sichtbar) und als Liste zum Öffnen. Die Achse
 * trägt die Zonengrenzen der Kurve (1, 15, 27 … 184). Entwürfe stehen oben.
 */

type Filter = 'alle' | 'ausreisser' | ZoneId;

const Y_MIN = 1;
const Y_MAX = 5;
const Y_TICKS = [1, 2, 3, 4, 5];

function measuredText(r: ChainRow): string {
  if (r.measured === undefined) return '—';
  if (r.measured === null) return '∞';
  return de(r.measured);
}

function CurveChart({ rows, current, selected, onSelect }: { rows: ChainRow[]; current: string | null; selected: number | null; onSelect: (i: number) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [scrub, setScrub] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(240, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const H = 176;
  const left = 30;
  const right = 6;
  const top = 10;
  const stripH = 18;
  const bottom = stripH + 18;
  const plotW = width - left - right;
  const plotH = H - top - bottom;
  const n = rows.length;
  const dx = plotW / Math.max(1, n);
  const x = (i: number) => left + dx * (i + 0.5);
  const y = (v: number) => top + plotH * (1 - (Math.min(Y_MAX, Math.max(Y_MIN, v)) - Y_MIN) / (Y_MAX - Y_MIN));

  // Linie der gemessenen Versuche (Lücken bei fehlender Messung).
  const segments: string[] = [];
  let seg = '';
  rows.forEach((r, i) => {
    if (r.measured === undefined) {
      if (seg) segments.push(seg);
      seg = '';
      return;
    }
    const v = r.measured === null ? Y_MAX : r.measured;
    seg += `${seg ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
  });
  if (seg) segments.push(seg);

  // Zusammenhängende Läufe gleicher Spielzone (Luzz und Wooding kehren ab Level 125 wieder)
  const zoneSpans: { z: ZoneId; a: number; b: number }[] = [];
  rows.forEach((r, i) => {
    const last = zoneSpans[zoneSpans.length - 1];
    if (last && last.z === r.zone) last.b = i;
    else zoneSpans.push({ z: r.zone, a: i, b: i });
  });

  // Soll-Kurve: Mitte des Kurvenbands je Level (Lücke hinter Level 184)
  const curvePath = rows
    .map((r, i) => (r.curve ? `${i > 0 && rows[i - 1]!.curve ? 'L' : 'M'}${x(i).toFixed(1)} ${y((r.curve[0] + r.curve[1]) / 2).toFixed(1)}` : ''))
    .join('');

  // Zonengrenzen der Kurve als Achsenticks; Beschriftung nur, wo sie Platz hat (Handybreite: jede zweite)
  const ticks: { no: number; i: number; label: boolean; end: boolean }[] = [];
  let lastLabelX = -Infinity;
  ZONE_TICKS.forEach((no, k) => {
    const i = rows.findIndex((r) => r.no === no);
    if (i < 0) return;
    const end = k === ZONE_TICKS.length - 1;
    const label = x(i) - lastLabelX >= 26;
    if (label) lastLabelX = x(i);
    ticks.push({ no, i, label, end });
  });

  const indexAt = (clientX: number): number => {
    const r = wrapRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, Math.floor((clientX - r.left - left) / dx)));
  };
  const shown = scrub ?? selected;
  const shownRow = shown !== null ? rows[shown] : undefined;
  const currentIdx = current ? rows.findIndex((r) => r.id === current) : -1;

  return (
    <div className="ch-chart">
      <div className="ch-readout" aria-live="polite">
        {shownRow ? (
          <>
            <b>
              {shownRow.no} · {shownRow.name}
            </b>
            <span>
              {shownRow.type ? `${CURVE_TYPE_LABEL[shownRow.type]} · ` : ''}Band {de(shownRow.band[0])}–{de(shownRow.band[1])} · gemessen {measuredText(shownRow)}
              {shownRow.verdict ? ` · ${VERDICT_SHORT[shownRow.verdict]}` : ''}
            </span>
          </>
        ) : (
          <span>Versuche pro Level (Anfänger-Bot) gegen das Ziel-Band — antippen oder darüberwischen.</span>
        )}
      </div>
      <div ref={wrapRef} className="ch-plot">
        <svg
          width={width}
          height={H}
          className="ch-svg"
          data-testid="chain-chart"
          role="img"
          aria-label="Schwierigkeitskurve der Level-Kette"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setScrub(indexAt(e.clientX));
          }}
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType !== 'mouse') {
              if (scrub !== null) setScrub(indexAt(e.clientX));
            } else setScrub(indexAt(e.clientX));
          }}
          onPointerUp={(e) => {
            const i = indexAt(e.clientX);
            setScrub(null);
            onSelect(i);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setScrub(null);
          }}
          onPointerCancel={() => setScrub(null)}
        >
          {Y_TICKS.map((v) => (
            <g key={v}>
              <rect x={left} y={y(v)} width={plotW} height={1} fill={C.khakiDeep} opacity={0.35} />
              <text x={left - 5} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize={10} fill={C.khakiDeep} fontWeight={700}>
                {de(v, 1)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => (
            <rect key={`b${i}`} x={x(i) - dx / 2 + 0.5} y={y(r.band[1])} width={Math.max(1, dx - 1)} height={Math.max(2, y(r.band[0]) - y(r.band[1]))} fill={ZONE_COLOR[r.zone]} opacity={0.4} />
          ))}
          {ticks
            .filter((t) => t.i > 0 && !t.end)
            .map((t) => (
              <rect key={`g${t.no}`} x={x(t.i) - dx / 2} y={top} width={1} height={plotH} fill={C.khakiDeep} opacity={0.35} />
            ))}
          {curvePath ? <path d={curvePath} fill="none" stroke={C.violet} strokeWidth={1.5} strokeDasharray="3 2" data-testid="chain-curve" /> : null}
          {currentIdx >= 0 ? <rect x={x(currentIdx) - 1.5} y={top} width={3} height={plotH} fill={C.neon} /> : null}
          {segments.map((d, k) => (
            <path key={k} d={d} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {rows.map((r, i) =>
            r.outlier ? (
              <g key={`o${i}`}>
                <circle cx={x(i)} cy={y(r.measured === null || r.measured === undefined ? Y_MAX : r.measured)} r={4.5} fill={r.verdict === 'easier' ? C.sky1 : C.rust} />
              </g>
            ) : null,
          )}
          {shown !== null ? <rect x={x(shown) - 0.5} y={top} width={1} height={plotH} fill={C.ink} /> : null}
          {shownRow && shownRow.measured !== undefined ? <circle cx={x(shown!)} cy={y(shownRow.measured === null ? Y_MAX : shownRow.measured)} r={5} fill={C.ink} /> : null}
          {zoneSpans.map(({ z, a, b }) => {
            const w = x(b) - x(a) + dx - 1;
            // Beschriftung immer: der Name, wo er passt, sonst der Anfangsbuchstabe (Farbe nie allein)
            const name = ZONE_LABEL[z];
            const label = w >= 8 + 6.4 * name.length ? name : w >= 14 ? name.charAt(0) : '';
            return (
              <g key={`${z}${a}`}>
                <rect x={x(a) - dx / 2} y={H - stripH} width={w} height={stripH} fill={ZONE_COLOR[z]} />
                {label ? (
                  <text x={x(a) - dx / 2 + 4} y={H - stripH / 2} dominantBaseline="central" fontSize={11} fontWeight={900} fill={C.ink}>
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {ticks
            .filter((t) => t.label)
            .map((t) => (
              <text key={t.no} x={x(t.i)} y={H - stripH - 6} textAnchor={t.end ? 'end' : t.i === 0 ? 'start' : 'middle'} fontSize={10} fill={C.khakiDeep} fontWeight={700}>
                {t.no}
              </text>
            ))}
        </svg>
      </div>
      <div className="ch-legend" aria-hidden="true">
        <span>
          <i className="ch-sw-band" /> Ziel-Band
        </span>
        <span>
          <i className="ch-sw-line" style={{ background: `repeating-linear-gradient(90deg, ${C.violet} 0 3px, transparent 3px 5px)` }} /> Soll-Kurve
        </span>
        <span>
          <i className="ch-sw-line" /> gemessen
        </span>
        <span>
          <i className="ch-sw-out" /> zu schwer / nie gelöst
        </span>
        <span>
          <i className="ch-sw-easy" /> zu leicht
        </span>
      </div>
    </div>
  );
}

export function ChainTab() {
  const files = useEditorStore((s) => s.files);
  const draft = useEditorStore((s) => s.draft);
  const targetFile = useEditorStore((s) => s.targetFile);
  const openFile = useEditorStore((s) => s.openFile);
  const setSheet = useEditorStore((s) => s.setSheet);
  const openTab = useEditorStore((s) => s.openTab);
  const fresh = useSolverStore((s) => s.fresh);
  const [filter, setFilter] = useState<Filter>('alle');
  const [selected, setSelected] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => buildChain(LEVELS, fresh), [fresh]);
  const outliers = rows.filter((r) => r.outlier || r.doubleHard).length;
  const drafts = files.filter((f) => f.file.startsWith('_') || f.localOnly);
  const visible = rows.filter((r) => (filter === 'alle' ? true : filter === 'ausreisser' ? r.outlier || r.doubleHard : r.zone === filter));
  const currentId = draft && /^\d{3}\.json$/.test(targetFile) ? (LEVELS[levelNumber(targetFile.replace('.json', '')) - 1]?.id ?? null) : null;
  const hasDraft = new Set(files.filter((f) => f.hasDraft).map((f) => f.file));
  const localSaved = new Set(files.filter((f) => f.local).map((f) => f.file));

  const open = async (file: string) => {
    await openFile(file);
    setSheet('peek');
  };

  useEffect(() => {
    if (selected === null) return;
    const row = rows[selected];
    if (!row) return;
    if (filter !== 'alle' && !visible.includes(row)) setFilter('alle');
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-no="${row.no}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }, [selected]);

  return (
    <>
      <CurveChart rows={rows} current={currentId} selected={selected} onSelect={setSelected} />
      <div className="ch-filters" role="radiogroup" aria-label="Filter">
        {(['alle', 'ausreisser', ...ZONES] as Filter[]).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} className="ed-chip" data-active={filter === f} onClick={() => setFilter(f)} data-testid={`chain-filter-${f}`}>
            {f === 'alle' ? `Alle ${rows.length}` : f === 'ausreisser' ? `Ausreißer ${outliers}` : ZONE_LABEL[f]}
          </button>
        ))}
      </div>

      <section className="ch-drafts">
        <header className="ed-section-head">
          <h3 className="ed-h3">Entwürfe</h3>
          <button type="button" className="ed-btn ed-btn-small ed-btn-primary" onClick={() => openTab('datei', 'full')} data-testid="chain-new">
            <UiIcon name="plus" size={16} /> Neu aus Vorlage
          </button>
        </header>
        {drafts.length ? (
          <div className="ch-list">
            {drafts.map((f) => (
              <button key={f.file} type="button" className="ch-row ch-row-draft" data-current={f.file === targetFile} onClick={() => void open(f.file)} data-testid={`chain-draft-${f.file.replace(/\.json$/, '')}`}>
                <span className="ch-no" style={{ background: C.paper }}>
                  <UiIcon name="edit" size={16} />
                </span>
                <span className="ch-name">
                  <b>{f.name}</b>
                  <small>
                    {f.file}
                    {f.hasDraft ? ' · ungesichert' : f.local ? ' · lokal gespeichert' : f.localOnly ? ' · nur lokal' : ''}
                  </small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="ed-hint">Noch keine Entwürfe. Vorlagen und Kopien landen hier.</p>
        )}
      </section>

      <div className="ch-list" ref={listRef} data-testid="chain-list">
        {visible.map((r) => {
          const i = rows.indexOf(r);
          return (
            <button
              key={r.id}
              type="button"
              className="ch-row"
              data-no={r.no}
              data-current={r.file === targetFile}
              data-selected={selected === i}
              data-outlier={r.outlier || r.doubleHard ? 'true' : undefined}
              onClick={() => void open(r.file)}
              data-testid={`chain-row-${r.file.replace(/\.json$/, '')}`}
            >
              <span className="ch-no" style={{ background: ZONE_COLOR[r.zone] }}>
                {r.no}
              </span>
              <span className="ch-name">
                <b>
                  {r.name}
                  {hasDraft.has(r.file) ? <i className="ch-unsaved" role="img" aria-label="ungesichert" /> : localSaved.has(r.file) ? <i className="ch-unsaved ch-local" role="img" aria-label="lokal gespeichert" /> : null}
                </b>
                <span className="ch-kinds">
                  {r.kinds.length ? r.kinds.map((k) => <KindIcon key={k} kind={k} size={20} />) : <small>reines Verschmelzen</small>}
                </span>
              </span>
              <span className="ch-band">
                {de(r.band[0], 1)}–{de(r.band[1], 1)}
                {r.marker ? <em data-marker={r.marker}>{r.marker}</em> : null}
              </span>
              <span className="ch-measured" data-verdict={r.verdict ?? 'none'} data-source={r.source ?? 'none'}>
                {measuredText(r)}
                <small>{r.source === 'frisch' ? 'frisch' : r.source === 'veraltet' ? 'alt' : r.verdict ? VERDICT_SHORT[r.verdict] : ''}</small>
              </span>
              {r.doubleHard ? (
                <span className="ch-warn">Zwei harte Level hintereinander</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
