import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { WesenLabScene } from '../lab/wesen/WesenLabScene';
import { WESEN_VORLAGEN } from '../lab/wesen/presets';
import { sichereEntwurfJetzt, starteWesenLab, useWesenStore, vorlageBauplan } from '../lab/wesen/wesenStore';
import { InfoZeile, MeldungZeile, RueckgaengigKnoepfe, TabInhalt, TabLeiste } from '../lab/wesen/WesenPanel';
import { WesenIcon } from '../lab/wesen/icons';
import '../lab/earle/earle-lab.css';
import '../lab/wesen/wesen-lab.css';

const st = () => useWesenStore.getState();

/** Zieht die Szene am Store mit (ohne React-Render): Bauplan, Stil, Boden, Drehen, Öffnung. */
function useSzeneAmStore(controller: WesenLabScene): void {
  useEffect(() => {
    const s = st();
    controller.setBauplan(s.bauplan, { neu: true });
    controller.setStil(s.stil);
    controller.setBoden(s.boden);
    controller.setSpin(s.spin);
    controller.setOpenness(s.offen);
    return useWesenStore.subscribe((n, p) => {
      if (n.bauplan !== p.bauplan) controller.setBauplan(n.bauplan, { neu: n.basis !== p.basis || n.quelle !== p.quelle });
      if (n.stil !== p.stil) controller.setStil(n.stil);
      if (n.boden !== p.boden) controller.setBoden(n.boden);
      if (n.spin !== p.spin) controller.setSpin(n.spin);
      if (n.offen !== p.offen) controller.setOpenness(n.offen);
    });
  }, [controller]);
}

/** ⌘Z / Strg+Z rückgängig, ⇧⌘Z / Strg+Y wiederholen — nicht in Textfeldern (dort gilt das Rückgängig des Felds). */
function useTastenkuerzel(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['range', 'color', 'checkbox', 'button'].includes((t as HTMLInputElement).type)))) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) st().undo();
      else if ((k === 'z' && e.shiftKey) || k === 'y') st().redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Vorlagen aus presets.ts: Auswahl plus Blättern (◀ ▶). */
function VorlagenWahl() {
  const quelle = useWesenStore((s) => s.quelle);
  const wert = quelle.art === 'vorlage' ? quelle.id : '';
  const lade = (id: string) => {
    const b = vorlageBauplan(id);
    if (b) st().ladeBauplan(b, { art: 'vorlage', id });
  };
  const idx = WESEN_VORLAGEN.findIndex((v) => v.id === wert);
  const blaettern = (d: number) => {
    const n = WESEN_VORLAGEN.length;
    const next = WESEN_VORLAGEN[((idx < 0 ? (d > 0 ? -1 : 0) : idx) + d + n) % n]!;
    lade(next.id);
  };
  return (
    <div className="wl-vorlage">
      <button type="button" className="wl-btn wl-btn--icon" onClick={() => blaettern(-1)} aria-label="Vorige Vorlage" data-testid="wl-vorlage-zurueck">
        <WesenIcon name="links" />
      </button>
      <label className="wl-vorlage-wahl">
        <span className="wl-sr">Vorlage</span>
        <select value={wert} onChange={(e) => lade(e.target.value)} data-testid="wesen-vorlage">
          {wert === '' ? <option value="">{quelle.art === 'datei' ? quelle.id : 'eigener Entwurf'}</option> : null}
          {WESEN_VORLAGEN.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="wl-btn wl-btn--icon" onClick={() => blaettern(1)} aria-label="Nächste Vorlage" data-testid="wl-vorlage-weiter">
        <WesenIcon name="rechts" />
      </button>
    </div>
  );
}

/** Tabs bleiben beim Scrollen oben; ein Tabwechsel springt zurück an den Anfang der Regler. */
function TabBereich() {
  const tab = useWesenStore((s) => s.tab);
  const anker = useRef<HTMLDivElement>(null);
  const erst = useRef(true);
  useEffect(() => {
    if (erst.current) {
      erst.current = false;
      return;
    }
    const el = anker.current;
    const box = el?.closest('.lab-sheet-body');
    if (!el || !box) return;
    // Lage des Ankers im scrollenden Kasten (offsetTop bezöge sich auf das ganze Sheet samt Kopfleiste)
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (box.scrollTop > top) box.scrollTop = top;
    box.querySelector<HTMLElement>('.wl-tab[data-active="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tab]);
  return (
    <div className="wl-tabbereich">
      <div ref={anker} className="wl-anker" />
      <div className="wl-tabs-sticky">
        <TabLeiste />
      </div>
      <TabInhalt />
    </div>
  );
}

function SchnellAktionen({ controller }: { controller: WesenLabScene }) {
  const spin = useWesenStore((s) => s.spin);
  const boden = useWesenStore((s) => s.boden);
  return (
    <>
      <RueckgaengigKnoepfe />
      <button type="button" className="wl-btn wl-btn--akt" onClick={() => st().setOffen(1)} data-testid="wesen-maul-auf">
        Maul auf
      </button>
      <button type="button" className="wl-btn wl-btn--akt" onClick={() => st().setOffen(0)} data-testid="wesen-maul-zu">
        Maul zu
      </button>
      <button type="button" className="wl-btn wl-btn--akt" onClick={() => controller.play('blinzeln')} data-testid="wesen-blinzeln">
        Blinzeln
      </button>
      <button type="button" className="wl-btn" data-active={spin} aria-pressed={spin} onClick={() => st().setSpin(!spin)} data-testid="wl-drehen">
        <WesenIcon name="drehen" size={20} />
        <span>Drehen</span>
      </button>
      <button type="button" className="wl-btn" data-active={boden === 'weiss'} aria-pressed={boden === 'weiss'} onClick={() => st().setBoden(boden === 'weiss' ? 'wiese' : 'weiss')} data-testid="wl-weiss">
        Weißer Grund
      </button>
    </>
  );
}

/**
 * Grundformen-Lab (Phase 1 der Wesen-Werkstatt): alle Regler des Bauplans live in Tabs, Vorlagen, Licht und Stil nach
 * dem Look-Vertrag, Würfel/Schloss/Zurücksetzen, Rückgängig/Wiederholen, Verben Maul auf/zu und Blinzeln.
 * Adresse: `?vorlage=<id>&boden=weiss|wiese&ansicht=held|referenz|brett&spin=1` (plus `sheet`/`panel` des Rahmens).
 */
export function LabWesen() {
  const [search] = useSearchParams();
  // Vor dem ersten Bild: Entwurf/Stil aus dem Browser-Speicher, `?vorlage=` hat Vorrang.
  useState(() => {
    starteWesenLab({ vorlage: search.get('vorlage'), ansicht: search.get('ansicht'), boden: search.get('boden'), spin: search.get('spin') });
    return true;
  });
  const controller = useMemo(() => new WesenLabScene(), []);
  useSzeneAmStore(controller);
  useTastenkuerzel();

  useEffect(() => {
    const flush = () => sichereEntwurfJetzt();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    if (import.meta.env.DEV) (window as unknown as { __wesenLab?: unknown }).__wesenLab = { store: useWesenStore, controller };
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [controller]);

  return (
    <div className="wesen-lab" data-testid="wesen-lab">
      <LabFrame
        title="Wesen-Lab · Grundformen"
        peek={<SchnellAktionen controller={controller} />}
        controls={
          <div className="wl-panel">
            <InfoZeile controller={controller} />
            <VorlagenWahl />
            <MeldungZeile />
            <TabBereich />
          </div>
        }
      >
        <CanvasHost controller={controller} />
      </LabFrame>
    </div>
  );
}
