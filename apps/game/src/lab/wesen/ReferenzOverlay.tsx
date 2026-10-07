import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { bildAusDaten, useReferenz } from './referenzStore';
import { useWesenStore } from './wesenStore';
import { WesenIcon } from './icons';

/**
 * Referenzmodus im Wesen-Lab (Look-Vertrag Regel 15): das Referenzbild liegt als `<img>` über dem Canvas. Normal lässt
 * es alle Zeiger durch (die Kamera dreht wie immer); im Modus „Bild bewegen“ verschiebt ein Finger bzw. die Maus das
 * Bild, zwei Finger bzw. das Mausrad skalieren es. Bilder kommen per Datei, Drag-and-drop oder Einfügen (⌘V).
 */

const ref = () => useReferenz.getState();

/** Bild übernehmen und in den Referenzmodus wechseln. */
async function uebernimm(file: File | Blob, name?: string): Promise<void> {
  const ok = await ref().ladeDatei(file, name);
  if (!ok) {
    useWesenStore.getState().melde('Das ist kein Bild.', 'fehler');
    return;
  }
  useWesenStore.getState().setAnsicht('referenz');
  useWesenStore.getState().melde('Referenzbild geladen (bleibt nur in diesem Browser).', 'ok');
}

/** Overlay über der Bühne: Bild, Hinweis ohne Bild, Ablage-Zone. Liegt in `.lab-stage` neben dem Canvas. */
export function ReferenzOverlay() {
  const aktiv = useWesenStore((s) => s.ansicht === 'referenz');
  const r = useReferenz();
  const root = useRef<HTMLDivElement>(null);
  const [ueber, setUeber] = useState(false);
  const zeiger = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);

  // Bild aus dem Browser-Speicher zurückholen
  useEffect(() => {
    void ref().wiederherstellen();
  }, []);

  // Ablegen auf der ganzen Bühne (auch außerhalb des Referenzmodus: wechselt dann hinein)
  useEffect(() => {
    const stage = root.current?.closest('.lab-stage') as HTMLElement | null;
    if (!stage) return;
    const hatBild = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const over = (e: DragEvent) => {
      if (!hatBild(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setUeber(true);
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget && stage.contains(e.relatedTarget as Node)) return;
      setUeber(false);
    };
    const drop = (e: DragEvent) => {
      if (!hatBild(e)) return;
      e.preventDefault();
      setUeber(false);
      const f = bildAusDaten(e.dataTransfer);
      if (f) void uebernimm(f, f.name);
      else useWesenStore.getState().melde('Kein Bild in der Ablage.', 'fehler');
    };
    stage.addEventListener('dragover', over);
    stage.addEventListener('dragleave', leave);
    stage.addEventListener('drop', drop);
    return () => {
      stage.removeEventListener('dragover', over);
      stage.removeEventListener('dragleave', leave);
      stage.removeEventListener('drop', drop);
    };
  }, []);

  // Einfügen (⌘V) eines Bildes aus der Zwischenablage
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && (t as HTMLInputElement).type !== 'range') return;
      const f = bildAusDaten(e.clipboardData);
      if (!f) return;
      e.preventDefault();
      void uebernimm(f, 'eingefügt');
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, []);

  const buehne = () => root.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1);
  const abstand = () => {
    const [a, b] = [...zeiger.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const mitte = () => {
    const ps = [...zeiger.current.values()];
    return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
  };

  const down = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (!r.bewegen) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (zeiger.current.size === 2) pinch.current = abstand();
  };
  const move = (e: ReactPointerEvent<HTMLImageElement>) => {
    const p = zeiger.current.get(e.pointerId);
    if (!p || !r.bewegen) return;
    const box = buehne();
    const m0 = mitte();
    p.x = e.clientX;
    p.y = e.clientY;
    const m1 = mitte();
    const s = ref();
    const patch: { x: number; y: number; s?: number } = { x: s.x + (m1.x - m0.x) / box.width, y: s.y + (m1.y - m0.y) / box.height };
    if (zeiger.current.size >= 2) {
      const d = abstand();
      if (pinch.current > 0 && d > 0) patch.s = Math.min(20, Math.max(0.05, s.s * (d / pinch.current)));
      pinch.current = d;
    }
    s.setze(patch);
  };
  const up = (e: ReactPointerEvent<HTMLImageElement>) => {
    zeiger.current.delete(e.pointerId);
    if (zeiger.current.size < 2) pinch.current = 0;
  };
  const wheel = (e: ReactWheelEvent<HTMLImageElement>) => {
    if (!r.bewegen) return;
    const box = buehne();
    const s = ref();
    const k = Math.exp(-e.deltaY * 0.0015);
    const ns = Math.min(20, Math.max(0.05, s.s * k));
    const f = ns / s.s;
    // Punkt unter dem Zeiger bleibt stehen
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    s.setze({ s: ns, x: px - (px - s.x) * f, y: py - (py - s.y) * f });
  };

  const sichtbar = aktiv && r.url;
  return (
    <div ref={root} className="wl-ref" data-bewegen={r.bewegen && !!sichtbar} data-ueber={ueber} data-testid="wl-ref-overlay">
      {sichtbar ? (
        <img
          className="wl-ref-bild"
          src={r.url!}
          alt={r.name ? `Referenz: ${r.name}` : 'Referenzbild'}
          draggable={false}
          style={{ opacity: r.deckkraft, left: `${50 + r.x * 100}%`, top: `${50 + r.y * 100}%`, transform: `translate(-50%, -50%) scale(${r.s}) scaleX(${r.spiegeln ? -1 : 1})` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={wheel}
          data-testid="wl-ref-bild"
        />
      ) : null}
      {aktiv && !r.url ? <p className="wl-ref-hinweis">Referenzbild hierher ziehen, einfügen (⌘V) oder „Bild laden“</p> : null}
      {ueber ? <div className="wl-ref-drop">Bild loslassen: wird Referenz</div> : null}
    </div>
  );
}

/** Regler des Referenzmodus im Panel: Bild laden, Deckkraft, Spiegeln, Bild bewegen, Einpassen, Entfernen. */
export function ReferenzBereich({ onKamera }: { onKamera: () => void }) {
  const r = useReferenz();
  const id = useId();
  const deckId = useId();
  return (
    <section className="wl-referenz" aria-label="Referenzbild" data-testid="wl-referenz-bereich">
      <h3 className="wl-gruppe-titel">Referenz · Bögen-Ansicht</h3>
      <div className="wl-knopfreihe">
        <label className="wl-btn wl-btn--haupt" htmlFor={id}>
          <WesenIcon name="bild" size={20} />
          <span>{r.url ? 'Anderes Bild' : 'Bild laden'}</span>
        </label>
        <input
          id={id}
          className="wl-sr"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void uebernimm(f, f.name);
          }}
          data-testid="wl-ref-datei"
        />
        <button type="button" className="wl-btn" data-active={r.spiegeln} aria-pressed={r.spiegeln} disabled={!r.url} onClick={() => r.setze({ spiegeln: !r.spiegeln })} data-testid="wl-ref-spiegeln">
          <WesenIcon name="spiegeln" size={20} />
          <span>Spiegeln</span>
        </button>
        <button type="button" className="wl-btn" data-active={r.bewegen} aria-pressed={r.bewegen} disabled={!r.url} onClick={() => r.setBewegen(!r.bewegen)} data-testid="wl-ref-bewegen" title="Ein Finger/Maus verschiebt, zwei Finger/Mausrad skalieren das Bild">
          <WesenIcon name="bewegen" size={20} />
          <span>Bild bewegen</span>
        </button>
        <button type="button" className="wl-btn" disabled={!r.url} onClick={() => r.einpassen()} data-testid="wl-ref-einpassen">
          Bild einpassen
        </button>
        <button type="button" className="wl-btn" onClick={onKamera} data-testid="wl-ref-kamera" title="Kamera zurück in die Bögen-Ansicht">
          <WesenIcon name="kamera" size={20} />
          <span>Bögen-Ansicht</span>
        </button>
        <button type="button" className="wl-btn" disabled={!r.url} onClick={() => void r.entfernen()} aria-label="Referenzbild entfernen" data-testid="wl-ref-entfernen">
          <WesenIcon name="weg" size={18} />
          <span>Entfernen</span>
        </button>
      </div>
      <div className="wl-regler" data-testid="wl-ref-deckkraft">
        <label className="wl-regler-kopf" htmlFor={deckId}>
          <span className="wl-label">Deckkraft</span>
          <output className="wl-wert">{Math.round(r.deckkraft * 100)} %</output>
        </label>
        <div className="wl-regler-zeile">
          <input id={deckId} type="range" min={0} max={1} step={0.01} value={r.deckkraft} onChange={(e) => r.setze({ deckkraft: Number(e.target.value) })} />
        </div>
        <small className="wl-hinweis">{r.url ? (r.bewegen ? 'Bild bewegen: ein Finger verschiebt, zwei Finger skalieren (Maus: ziehen, Rad)' : `${r.name ?? 'Bild'} · bleibt nur in diesem Browser`) : 'Weißer Grund, Bögen-Kamera: Dreiviertel von rechts vorn, leicht von oben'}</small>
      </div>
    </section>
  );
}
