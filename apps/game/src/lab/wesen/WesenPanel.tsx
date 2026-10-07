import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useWesenStore } from './wesenStore';
import { TABS, formatWert, gruppenDesTabs, leseWert, tabGeaendert, wahlName, wertVon, type FarbRegler, type Regler, type ReglerGruppe, type TabId, type WahlRegler, type ZahlRegler, type ZufallRegler } from './regler';
import { WesenIcon } from './icons';
import type { WesenLabScene } from './WesenLabScene';

/**
 * Reglerpanel des Grundformen-Labs: Tabs mit gruppierten Reglern (Label, Live-Wert, kleiner Hinweis), je Regler ein
 * Schloss, je Tab Würfel und Zurücksetzen. Jeder Regler hört nur auf seinen eigenen Wert (zustand-Selektor): ein Zug am
 * Regler rendert eine Zeile, nicht das Panel. Touch: Ziele ≥ 44 px, keine Konturen, Versatzschatten in Sonnenrichtung.
 */

const st = () => useWesenStore.getState();

function setze(r: Regler, v: unknown): void {
  if (r.ziel === 'stil') st().setzeStilWert(r.key, v);
  else st().setzeBauplanWert(r.key, v);
}

/** Ein Regler auf den Stand der Vorlage (bzw. Stil-Vorgabe) — Doppelklick auf die Beschriftung. */
function aufBasis(r: Regler): void {
  const s = st();
  const v = leseWert(r.ziel === 'stil' ? s.stilVorgabe : s.basis, r.key);
  if (v !== undefined) setze(r, v);
}

const SchlossKnopf = memo(function SchlossKnopf({ r }: { r: Regler }) {
  const zu = useWesenStore((s) => !!s.schloss[r.id]);
  return (
    <button
      type="button"
      className="wl-schloss"
      data-zu={zu}
      aria-pressed={zu}
      aria-label={zu ? `${r.label}: Schloss öffnen (wieder würfeln)` : `${r.label}: sperren (Würfel lässt ihn stehen)`}
      title={zu ? 'Gesperrt: der Würfel lässt diesen Wert stehen' : 'Sperren: vom Würfel ausnehmen'}
      onClick={() => st().schalteSchloss(r.id)}
      data-testid={`wl-schloss-${r.id}`}
    >
      <WesenIcon name={zu ? 'schloss' : 'schlossOffen'} size={18} />
    </button>
  );
});

const ReglerZahl = memo(function ReglerZahl({ r }: { r: ZahlRegler }) {
  const v = useWesenStore((s) => Number(wertVon(r, s.bauplan, s.stil)));
  const id = useId();
  const ende = () => st().endeGeste();
  return (
    <div className="wl-regler" data-testid={`wl-regler-${r.id}`}>
      <label className="wl-regler-kopf" htmlFor={id} onDoubleClick={() => aufBasis(r)} title="Doppelklick: zurück auf die Vorlage">
        <span className="wl-label">{r.label}</span>
        <output className="wl-wert" htmlFor={id}>
          {formatWert(r, v)}
        </output>
      </label>
      <div className="wl-regler-zeile">
        <input
          id={id}
          type="range"
          min={r.min}
          max={r.max}
          step={r.step}
          value={Number.isFinite(v) ? v : r.min}
          onPointerDown={() => st().beginGeste()}
          onPointerUp={ende}
          onPointerCancel={ende}
          onLostPointerCapture={ende}
          onChange={(e) => setze(r, Number(e.target.value))}
        />
        <SchlossKnopf r={r} />
      </div>
      {r.hinweis ? <small className="wl-hinweis">{r.hinweis}</small> : null}
    </div>
  );
});

const ReglerWahl = memo(function ReglerWahl({ r }: { r: WahlRegler }) {
  const v = useWesenStore((s) => wertVon(r, s.bauplan, s.stil) as string | number);
  return (
    <div className="wl-regler wl-regler--wahl" data-testid={`wl-regler-${r.id}`}>
      <div className="wl-regler-kopf">
        <span className="wl-label">{r.label}</span>
        <SchlossKnopf r={r} />
      </div>
      <div className="wl-chips" role="radiogroup" aria-label={r.label}>
        {r.optionen.map((o) => (
          <button key={String(o)} type="button" role="radio" aria-checked={o === v} className="wl-chip" data-active={o === v} onClick={() => setze(r, o)} data-testid={`wl-wahl-${r.id}-${o}`}>
            {wahlName(o)}
          </button>
        ))}
      </div>
      {r.hinweis ? <small className="wl-hinweis">{r.hinweis}</small> : null}
    </div>
  );
});

const ReglerFarbe = memo(function ReglerFarbe({ r }: { r: FarbRegler }) {
  const v = useWesenStore((s) => String(wertVon(r, s.bauplan, s.stil)));
  const id = useId();
  const ende = () => st().endeGeste();
  return (
    <div className="wl-farbe" data-testid={`wl-regler-${r.id}`}>
      <input
        id={id}
        type="color"
        value={v}
        onPointerDown={() => st().beginGeste()}
        onBlur={ende}
        onChange={(e) => setze(r, e.target.value)}
        aria-label={`Farbe ${r.label}`}
      />
      <label htmlFor={id} className="wl-farbe-text">
        <span className="wl-label">{r.label}</span>
        <output className="wl-wert">{v}</output>
      </label>
      {r.wuerfeln ? <SchlossKnopf r={r} /> : <span className="wl-farbe-fest" title="Feste Farbrolle (Look-Vertrag): der Würfel lässt sie stehen">fest</span>}
    </div>
  );
});

const ReglerZufall = memo(function ReglerZufall({ r }: { r: ZufallRegler }) {
  const v = useWesenStore((s) => Number(wertVon(r, s.bauplan, s.stil)));
  return (
    <div className="wl-regler wl-regler--zufall" data-testid={`wl-regler-${r.id}`}>
      <div className="wl-regler-kopf">
        <span className="wl-label">{r.label}</span>
        <output className="wl-wert">{v}</output>
      </div>
      <div className="wl-regler-zeile">
        <button type="button" className="wl-btn wl-btn--klein" onClick={() => setze(r, 1 + Math.floor(Math.random() * 9999))} aria-label={`${r.label}: neue Zufallszahl`}>
          <WesenIcon name="wuerfel" size={18} />
          <span>neu</span>
        </button>
        {r.hinweis ? <small className="wl-hinweis wl-hinweis--zeile">{r.hinweis}</small> : null}
        <SchlossKnopf r={r} />
      </div>
    </div>
  );
});

function ReglerZeile({ r }: { r: Regler }) {
  switch (r.art) {
    case 'zahl':
      return <ReglerZahl r={r} />;
    case 'wahl':
      return <ReglerWahl r={r} />;
    case 'farbe':
      return <ReglerFarbe r={r} />;
    case 'zufall':
      return <ReglerZufall r={r} />;
  }
}

function Gruppe({ g, aktiv }: { g: ReglerGruppe; aktiv: boolean }) {
  const farben = g.regler.every((r) => r.art === 'farbe');
  return (
    <section className="wl-gruppe" data-aktiv={aktiv} aria-label={g.titel}>
      <h3 className="wl-gruppe-titel">{g.titel}</h3>
      {aktiv ? (
        <div className={farben ? 'wl-farben' : 'wl-gruppe-regler'}>
          {g.regler.map((r) => (
            <ReglerZeile key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <p className="wl-inaktiv">{g.inaktiv ?? 'wirkt hier gerade nicht'}</p>
      )}
    </section>
  );
}

/** Vorschau der Kieferöffnung (Animationsziel, nicht Teil des Bauplans: kein Verlauf, kein Würfel). */
function VorschauOeffnung() {
  const offen = useWesenStore((s) => s.offen);
  const id = useId();
  return (
    <section className="wl-gruppe" aria-label="Vorschau">
      <h3 className="wl-gruppe-titel">Vorschau</h3>
      <div className="wl-regler wl-regler--vorschau" data-testid="wl-vorschau-oeffnung">
        <label className="wl-regler-kopf" htmlFor={id}>
          <span className="wl-label">Öffnung (Animation)</span>
          <output className="wl-wert">{offen.toFixed(2)}</output>
        </label>
        <div className="wl-regler-zeile">
          <input id={id} type="range" min={0} max={1} step={0.01} value={offen} onChange={(e) => st().setOffen(Number(e.target.value))} />
        </div>
        <small className="wl-hinweis">nur die Ansicht: der Bauplan behält seine Öffnung</small>
      </div>
    </section>
  );
}

export function TabLeiste() {
  const tab = useWesenStore((s) => s.tab);
  return (
    <div className="wl-tabs" role="tablist" aria-label="Regler-Gruppen">
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="wl-tab" data-active={tab === t.id} onClick={() => st().setTab(t.id)} data-testid={`wl-tab-${t.id}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TabKopf({ tab }: { tab: TabId }) {
  const geaendert = useWesenStore((s) => tabGeaendert(tab, s.bauplan, s.stil, s.basis, s.stilVorgabe));
  const label = TABS.find((t) => t.id === tab)!.label;
  return (
    <div className="wl-tabkopf">
      <h2 className="wl-tabtitel">{label}</h2>
      <button type="button" className="wl-btn" onClick={() => st().wuerfeln(tab)} data-testid="wl-wuerfeln" title={tab === 'licht' ? 'Würfelt im Bereich des Look-Vertrags' : 'Würfelt alle offenen Regler dieses Tabs'}>
        <WesenIcon name="wuerfel" size={20} />
        <span>Würfeln</span>
      </button>
      <button type="button" className="wl-btn" disabled={!geaendert} onClick={() => st().zuruecksetzen(tab)} data-testid="wl-zuruecksetzen" title={tab === 'licht' ? 'Zurück auf die Stil-Vorgabe' : 'Zurück auf die geladene Vorlage'}>
        <WesenIcon name="zurueck" size={20} />
        <span>Zurücksetzen</span>
      </button>
    </div>
  );
}

export function TabInhalt() {
  const tab = useWesenStore((s) => s.tab);
  const gruppen = useMemo(() => gruppenDesTabs(tab), [tab]);
  // Nur das Muster „welche Gruppen wirken“ abonnieren, nicht jeden Wert: Ziehen rendert die Liste nicht neu.
  const aktivMuster = useWesenStore((s) => gruppen.map((g) => (g.aktiv && !g.aktiv(s.bauplan) ? '0' : '1')).join(''));
  const body = useRef<HTMLDivElement>(null);
  return (
    <div className="wl-tabinhalt" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)!.label} ref={body} data-testid={`wl-tabinhalt-${tab}`}>
      <TabKopf tab={tab} />
      {tab === 'maul' ? <VorschauOeffnung /> : null}
      {gruppen.map((g, i) => (
        <Gruppe key={`${tab}-${g.titel}`} g={g} aktiv={aktivMuster[i] !== '0'} />
      ))}
    </div>
  );
}

/** Statuszeile mit Vertices, Dreiecken, Knochen, Zähnen und Bauzeit (ändert sich nur, wenn sich die Zahlen ändern). */
export function InfoZeile({ controller }: { controller: WesenLabScene }) {
  const [text, setText] = useState('…');
  const [fehler, setFehler] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const s = controller.getStats();
      setFehler(s.fehler);
      setText(s.vertices > 0 ? `${s.vertices} Vertices · ${s.triangles} Dreiecke · ${s.bones} Knochen · ${s.teeth} Zähne · ${s.resolution}³ in ${s.buildMs} ms${s.pending ? ' · fein folgt …' : ''}` : s.pending ? 'baut …' : '…');
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [controller]);
  return (
    <p className="wl-info" data-testid="wesen-lab-info" data-fehler={fehler ? 'true' : undefined} aria-live="off">
      {fehler ? `Bau fehlgeschlagen: ${fehler}` : text}
    </p>
  );
}

/** Kurze Rückmeldung (Speichern, Laden, Fehler) im Panel; liest Screenreader vor. */
export function MeldungZeile() {
  const m = useWesenStore((s) => s.meldung);
  return (
    <p className="wl-meldung" data-art={m?.art} role="status" aria-live="polite" data-testid="wl-meldung">
      {m?.text ?? ''}
    </p>
  );
}

export function RueckgaengigKnoepfe() {
  const kannZurueck = useWesenStore((s) => s.past.length > 0);
  const kannVor = useWesenStore((s) => s.future.length > 0);
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <>
      <button type="button" className="wl-btn wl-btn--icon" disabled={!kannZurueck} onClick={() => st().undo()} aria-label="Rückgängig" title={`Rückgängig (${mac ? '⌘Z' : 'Strg+Z'})`} data-testid="wl-undo">
        <WesenIcon name="undo" />
      </button>
      <button type="button" className="wl-btn wl-btn--icon" disabled={!kannVor} onClick={() => st().redo()} aria-label="Wiederholen" title={`Wiederholen (${mac ? '⇧⌘Z' : 'Strg+Umschalt+Z'})`} data-testid="wl-redo">
        <WesenIcon name="redo" />
      </button>
    </>
  );
}
