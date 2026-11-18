// Plan 20.10., V3: Wo steht der Zeiger? Tastendrücke tragen keine Lage — G/S/R beginnen am Zeiger, deshalb merkt sich das
// Fenster die letzte Zeigerlage. Dazu die Umrechnung Fensterpunkt → Blatt-Koordinaten (Profil-Einheiten), auch wenn der
// Zeiger das Blatt verlässt (G/S/R rechnen weiter in dem Blatt, in dem sie begannen).

import type { Ansicht, V2 } from '@ee/shape';
import { useEffect } from 'react';
import { useEditor } from '../../state/editorStore';
import { blickVon, useUi } from '../../state/uiStore';
import { spiegeln2, zuBild, zuWelt } from '../../viewports/ansicht2d';

/** Letzte Zeigerlage im Fenster (clientX/Y). */
export const zeiger = { x: 0, y: 0, bekannt: false };

/** Merkt die Zeigerlage fensterweit (passiv, vor allen anderen Empfängern). */
export function useZeigerMerker() {
  useEffect(() => {
    const merken = (e: PointerEvent) => {
      zeiger.x = e.clientX;
      zeiger.y = e.clientY;
      zeiger.bekannt = true;
    };
    window.addEventListener('pointermove', merken, { capture: true, passive: true });
    window.addEventListener('pointerdown', merken, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointermove', merken, { capture: true });
      window.removeEventListener('pointerdown', merken, { capture: true });
    };
  }, []);
}

/** SVG eines Blatts (Seite, Front, Top). */
export const blattSvg = (ansicht: Ansicht) => document.querySelector<SVGSVGElement>(`.vp-ober[data-view="${ansicht}"] svg.view2d`);

/** Fensterpunkt → Blatt-Koordinaten (Profil-Einheiten) wie `lokal` im Blatt; null, wenn das Blatt nicht da ist. */
export function blattLokal(ansicht: Ansicht, clientX: number, clientY: number): V2 | null {
  const svg = blattSvg(ansicht);
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  const ui = useUi.getState();
  const s = useEditor.getState().dok.skalierung;
  const p = spiegeln2(blickVon(ansicht, ui.blick), zuWelt(ui.ansichten[ansicht], r.width, r.height, { x: clientX - r.left, y: clientY - r.top }));
  return { x: p.x / s, y: p.y / s };
}

/** Blatt-Koordinaten → Fensterpunkt (Umkehrung von `blattLokal`). */
export function blattFenster(ansicht: Ansicht, p: V2): V2 | null {
  const svg = blattSvg(ansicht);
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  const ui = useUi.getState();
  const s = useEditor.getState().dok.skalierung;
  const q = zuBild(ui.ansichten[ansicht], r.width, r.height, spiegeln2(blickVon(ansicht, ui.blick), { x: p.x * s, y: p.y * s }));
  return { x: q.x + r.left, y: q.y + r.top };
}
