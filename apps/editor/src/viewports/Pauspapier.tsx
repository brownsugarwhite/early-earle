// Plan 9.8 / M4.1: Pauspapier — Florians Bogen (PNG) hinter einem Blatt, 40 % Deckkraft, in Welt-Einheiten gelegt
// (zoomt und schiebt mit der Ansicht), nicht anklickbar. Drag & Drop eines Bildes auf ein Blatt oder „Bogen hinlegen“
// in der Tafel; Breite, Versatz und Deckkraft dort; ⌥B blendet den Bogen aus und ein.

import type { Ansicht } from '@ee/shape';
import { useUi } from '../state/uiStore';
import { spiegeln2, zuBild } from './ansicht2d';

/** Bild aus einer Datei als Pauspapier auf das Blatt legen (Seitenverhältnis aus dem Bild). */
export function pauspapierAusDatei(datei: File, blatt: Ansicht): void {
  const url = URL.createObjectURL(datei);
  const bild = new Image();
  bild.onload = () => {
    const alt = useUi.getState().pauspapier;
    useUi.getState().setzePauspapier({
      blatt,
      url,
      name: datei.name,
      deckkraft: alt?.deckkraft ?? 0.4,
      mitte: alt?.mitte ?? { x: 0, y: blatt === 'top' ? 0 : 0.42 },
      breite: alt?.breite ?? 1.2,
      seitenverhaeltnis: bild.naturalHeight / Math.max(1, bild.naturalWidth),
      sichtbar: true,
    });
  };
  bild.src = url;
}

export function Pauspapier({ ansicht, w, h }: { ansicht: Ansicht; w: number; h: number }) {
  const p = useUi((s) => s.pauspapier);
  const view = useUi((s) => s.ansichten[ansicht]);
  const blick = useUi((s) => (ansicht === 'front' ? s.blick.front : ansicht === 'top' ? s.blick.top : 'seite'));
  if (!p || p.blatt !== ansicht || !p.sichtbar) return null;
  const hoehe = p.breite * p.seitenverhaeltnis;
  // zwei Ecken durch die Blatt-Abbildung (mit Spiegelung von Back/Bottom); gespiegelte Achsen kippen das Bild
  const a = zuBild(view, w, h, spiegeln2(blick, { x: p.mitte.x - p.breite / 2, y: p.mitte.y + hoehe / 2 }));
  const b = zuBild(view, w, h, spiegeln2(blick, { x: p.mitte.x + p.breite / 2, y: p.mitte.y - hoehe / 2 }));
  const links = Math.min(a.x, b.x);
  const oben = Math.min(a.y, b.y);
  const sx = b.x < a.x ? -1 : 1;
  const sy = b.y < a.y ? -1 : 1;
  return (
    <img
      className="pauspapier"
      data-pauspapier={ansicht}
      src={p.url}
      alt=""
      draggable={false}
      style={{ left: links, top: oben, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), opacity: p.deckkraft, transform: sx < 0 || sy < 0 ? `scale(${sx}, ${sy})` : undefined }}
    />
  );
}
