import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { WesenLabScene } from '../lab/wesen/WesenLabScene';
import { sichereEntwurfJetzt, starteWesenLab, useWesenStore, vorschauOeffnung, type WesenAnsicht } from '../lab/wesen/wesenStore';
import { DateiBereich, VorlagenChips, VorlagenWahl } from '../lab/wesen/DateiBereich';
import { gebuendelterStil, gebuendelteVorlagen, ladeStilVorgabe } from '../lab/wesen/content';
import { useVorlagenDateien } from '../lab/wesen/vorlagenDateien';
import { stilGleich } from '../lab/wesen/regler';
import { InfoZeile, MeldungZeile, RueckgaengigKnoepfe, TabInhalt, TabLeiste } from '../lab/wesen/WesenPanel';
import { ReferenzBereich, ReferenzOverlay } from '../lab/wesen/ReferenzOverlay';
import type { TurntableAnsicht } from '../lab/wesen/turntable';
import { WesenIcon } from '../lab/wesen/icons';
import '../lab/earle/earle-lab.css';
import '../lab/wesen/wesen-lab.css';

const st = () => useWesenStore.getState();

/** Ansicht des Labs → feste Kamera des Drehtellers (Referenzmodus = Bögen-Kamera). */
const KAMERA: Record<WesenAnsicht, TurntableAnsicht> = { held: 'held', referenz: 'boegen', brett: 'brett', seite: 'seite' };

/** Zieht die Szene am Store mit (ohne React-Render): Bauplan, Stil, Boden, Drehen, Öffnung. */
function useSzeneAmStore(controller: WesenLabScene): void {
  useEffect(() => {
    const s = st();
    controller.setBauplan(s.bauplan, { neu: true });
    controller.setStil(s.stil);
    controller.setBoden(s.boden);
    controller.setSpin(s.spin);
    controller.setOpenness(vorschauOeffnung(s));
    controller.setAnsicht(KAMERA[s.ansicht]);
    return useWesenStore.subscribe((n, p) => {
      if (n.bauplan !== p.bauplan) controller.setBauplan(n.bauplan, { neu: n.basis !== p.basis || n.quelle !== p.quelle });
      if (n.stil !== p.stil) controller.setStil(n.stil);
      if (n.boden !== p.boden) controller.setBoden(n.boden);
      if (n.spin !== p.spin) controller.setSpin(n.spin);
      if (vorschauOeffnung(n) !== vorschauOeffnung(p)) controller.setOpenness(vorschauOeffnung(n));
      if (n.ansicht !== p.ansicht) controller.setAnsicht(KAMERA[n.ansicht]);
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
  const ansicht = useWesenStore((s) => s.ansicht);
  const umschalten = (a: WesenAnsicht) => st().setAnsicht(ansicht === a ? 'held' : a);
  return (
    <>
      <RueckgaengigKnoepfe />
      <button type="button" className="wl-btn" data-active={ansicht === 'referenz'} aria-pressed={ansicht === 'referenz'} onClick={() => umschalten('referenz')} data-testid="wl-referenz" title="Weißer Grund, Bögen-Kamera, Referenzbild darüber">
        <WesenIcon name="bild" size={20} />
        <span>Referenz</span>
      </button>
      <button type="button" className="wl-btn" data-active={ansicht === 'brett'} aria-pressed={ansicht === 'brett'} onClick={() => umschalten('brett')} data-testid="wl-brett" title="Kamera wie auf dem Spielfeld (≈ 65° von oben), Wesen in Brettgröße">
        <WesenIcon name="brett" size={20} />
        <span>Brett</span>
      </button>
      <button type="button" className="wl-btn" data-active={ansicht === 'seite'} aria-pressed={ansicht === 'seite'} onClick={() => umschalten('seite')} data-testid="wl-seite" title="Reine Seitenansicht auf Augenhöhe: Profil gegen die Bögen">
        <WesenIcon name="brett" size={20} />
        <span>Seite</span>
      </button>
      <button type="button" className="wl-btn wl-btn--icon" onClick={() => controller.setAnsicht(KAMERA[ansicht])} aria-label="Kamera einpassen" title="Kamera zurück in die feste Ansicht" data-testid="wl-einpassen">
        <WesenIcon name="kamera" size={20} />
      </button>
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
 * Adresse: `?vorlage=<id>&boden=weiss|wiese&ansicht=held|referenz|brett|seite&spin=1&res=120` (plus `sheet`/`panel` des Rahmens).
 */
export function LabWesen() {
  const [search] = useSearchParams();
  // Vor dem ersten Bild: Entwurf/Stil aus dem Browser-Speicher, `?vorlage=` hat Vorrang.
  useState(() => {
    const stil = gebuendelterStil();
    starteWesenLab({
      vorlage: search.get('vorlage'),
      ansicht: search.get('ansicht'),
      boden: search.get('boden'),
      spin: search.get('spin'),
      dateien: gebuendelteVorlagen(),
      stilVorgabe: stil ? { stil, quelle: 'App' } : null,
    });
    return true;
  });
  const controller = useMemo(() => {
    const c = new WesenLabScene({ standbild: search.get('standbild') === '1' });
    // `res`: feine Auflösung (32 … 160) für Qualitätsvergleiche im Harness, z. B. dünne Hälse
    const res = Number(search.get('res'));
    if (Number.isFinite(res) && res >= 32 && res <= 160) c.highRes = Math.round(res);
    return c;
  }, []);
  const ansicht = useWesenStore((s) => s.ansicht);
  const boden = useWesenStore((s) => s.boden);
  useSzeneAmStore(controller);
  useTastenkuerzel();

  // Gespeicherte Vorlagen und Stil-Vorgabe vom Mac (sonst Bündel/lokal); ein unberührter Stil folgt der Vorgabe.
  useEffect(() => {
    void useVorlagenDateien.getState().laden();
    void ladeStilVorgabe().then((v) => {
      if (!v) return;
      const s = st();
      const unberuehrt = stilGleich(s.stil, s.stilVorgabe);
      s.setStilVorgabe(v.stil, v.quelle);
      if (unberuehrt && !stilGleich(s.stil, v.stil)) useWesenStore.setState({ stil: v.stil });
    });
  }, []);

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
    <div className="wesen-lab" data-testid="wesen-lab" data-boden={boden} data-ansicht={ansicht}>
      <LabFrame
        title="Wesen-Lab · Grundformen"
        peek={<SchnellAktionen controller={controller} />}
        controls={
          <div className="wl-panel">
            <InfoZeile controller={controller} />
            <VorlagenWahl />
            <VorlagenChips />
            <DateiBereich />
            <MeldungZeile />
            {ansicht === 'referenz' ? <ReferenzBereich onKamera={() => controller.setAnsicht('boegen')} /> : null}
            <TabBereich />
          </div>
        }
      >
        <CanvasHost controller={controller} />
        <ReferenzOverlay />
      </LabFrame>
    </div>
  );
}
