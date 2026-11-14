// Nachzeichnen (Plan 9.8, M4.1b): den Bogen des Pauspapiers in den Seitenumriss übersetzen — Silhouette aus dem Bild
// (größte Figur), Schneider-Anpassung (Fehler ≤ Höhe/300, mindestens 1,5 px), in die Lage des Pauspapiers gelegt und
// auf den Boden gestellt (tiefster Punkt bei y = 0; der Bogen rückt mit). Erste Stufe: nur das Blatt Seite.

import { type Profil, achsenRegeln, angleichen } from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { type Pauspapier, useUi } from '../state/uiStore';
import { knotenNachWelt, profilGeschlossen, profilHalb } from './fit';
import { halbUmriss } from './umriss';
import { silhouette } from './umriss-test-helfer';

export type NachzeichnenErgebnis = { knoten: number; flaechePx: number; fehlerPx: number; hoehePx: number };

/** Bild des Pauspapiers als Pixel laden (Canvas), bei großen Bögen auf höchstens 1600 px Breite verkleinert. */
async function pixel(url: string): Promise<{ rgba: Uint8ClampedArray; w: number; h: number; skala: number }> {
  const bild = new Image();
  bild.src = url;
  await bild.decode();
  const skala = Math.min(1, 1600 / Math.max(1, bild.naturalWidth));
  const w = Math.max(1, Math.round(bild.naturalWidth * skala));
  const h = Math.max(1, Math.round(bild.naturalHeight * skala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Kein 2D-Kontext');
  ctx.drawImage(bild, 0, 0, w, h);
  return { rgba: ctx.getImageData(0, 0, w, h).data, w, h, skala };
}

/**
 * Umriss aus dem Pauspapier ins Dokument übernehmen: Seite als geschlossenes Profil (Boden = tiefster Punkt), Front und
 * Top als Halbprofil (Achse = Mitte der Figur; Front steht auch auf dem Boden). Front und Top bzw. Seite werden danach
 * angeglichen.
 */
export async function nachzeichnenBlatt(p: Pauspapier): Promise<NachzeichnenErgebnis> {
  if (p.blatt === 'seite') return nachzeichnenSeite(p);
  const { rgba, w, h } = await pixel(p.url);
  const sil = silhouette(rgba, w, h);
  if (sil.punkte.length < 12) throw new Error('Keine Figur im Bogen gefunden (dunkle Linien oder Flächen auf hellem Grund nötig)');
  const err = Math.max(2, sil.hoehePx / 100);
  const senkrecht = p.blatt === 'front';
  const { halb, achse } = halbUmriss(sil.punkte, senkrecht);
  if (halb.length < 6) throw new Error('Figur zu klein für ein Halbprofil');
  const kn = profilHalb(halb, err, senkrecht);
  const welt = p.breite / w;
  // Front: waagerecht = z (Achse 0), senkrecht = y aus dem Pauspapier; Top: waagerecht = x aus dem Pauspapier, senkrecht = z (Achse 0)
  const abb = (q: [number, number]): { x: number; y: number } =>
    senkrecht ? { x: q[0] * welt, y: p.mitte.y - (h * welt) / 2 + q[1] * welt } : { x: p.mitte.x - p.breite / 2 + (q[0] - 0) * welt, y: q[1] * welt };
  let knoten = knotenNachWelt(kn, abb, welt);
  if (senkrecht) {
    let yMin = Infinity;
    for (const k of knoten) yMin = Math.min(yMin, k.p.y, k.p.y + k.ein.y, k.p.y + k.aus.y);
    if (Number.isFinite(yMin) && Math.abs(yMin) > 1e-9) {
      knoten = knoten.map((k) => ({ ...k, p: { x: k.p.x, y: k.p.y - yMin } }));
      useUi.getState().pauspapierAendern({ mitte: { x: p.mitte.x, y: p.mitte.y - yMin } });
    }
  }
  void achse;
  const ed = useEditor.getState();
  const sk = ed.dok.skalierung;
  const profil: Profil = achsenRegeln({ art: 'halb', achse: senkrecht ? 'senkrecht' : 'waagerecht', knoten: knoten.map((k) => ({ ...k, p: { x: k.p.x / sk, y: k.p.y / sk }, ein: { x: k.ein.x / sk, y: k.ein.y / sk }, aus: { x: k.aus.x / sk, y: k.aus.y / sk } })) });
  ed.setzeProfile(angleichen({ ...ed.dok.profile, [p.blatt]: profil }));
  return { knoten: profil.knoten.length, flaechePx: sil.flaeche, fehlerPx: err, hoehePx: sil.hoehePx };
}

/** Seitenumriss aus dem Pauspapier (Blatt Seite) ins Dokument übernehmen; Boden = tiefster Punkt. */
export async function nachzeichnenSeite(p: Pauspapier): Promise<NachzeichnenErgebnis> {
  const { rgba, w, h, skala } = await pixel(p.url);
  const sil = silhouette(rgba, w, h);
  if (sil.punkte.length < 12) throw new Error('Keine Figur im Bogen gefunden (dunkle Linien oder Flächen auf hellem Grund nötig)');
  // Fehlerschranke ≈ 1 % der Figurhöhe (wenige Knoten, Florian setzt Punkte lieber selbst nach), mindestens 2 px
  const err = Math.max(2, sil.hoehePx / 100);
  const kn = profilGeschlossen(sil.punkte, err);
  // Pixel (verkleinert, y nach oben) → Welt: Bildbreite = p.breite, Mitte = p.mitte
  const welt = p.breite / w;
  const abb = (q: [number, number]): { x: number; y: number } => ({ x: p.mitte.x - p.breite / 2 + q[0] * welt, y: p.mitte.y - (h * welt) / 2 + q[1] * welt });
  let knoten = knotenNachWelt(kn, abb, welt);
  // auf den Boden stellen: tiefster Kurvenpunkt (Knoten genügen hier) auf y = 0; der Bogen rückt mit
  let yMin = Infinity;
  for (const k of knoten) yMin = Math.min(yMin, k.p.y, k.p.y + k.ein.y, k.p.y + k.aus.y);
  if (Number.isFinite(yMin) && Math.abs(yMin) > 1e-9) {
    knoten = knoten.map((k) => ({ ...k, p: { x: k.p.x, y: k.p.y - yMin } }));
    useUi.getState().pauspapierAendern({ mitte: { x: p.mitte.x, y: p.mitte.y - yMin } });
  }
  const ed = useEditor.getState();
  const sk = ed.dok.skalierung;
  const profil: Profil = achsenRegeln({ art: 'geschlossen', knoten: knoten.map((k) => ({ ...k, p: { x: k.p.x / sk, y: k.p.y / sk }, ein: { x: k.ein.x / sk, y: k.ein.y / sk }, aus: { x: k.aus.x / sk, y: k.aus.y / sk } })) });
  // Front und Top an die neue Seite angleichen (wie beim Laden nachgezogener Bögen), sonst schneidet die kleinere
  // Breite den Körper vorn und hinten ab
  ed.setzeProfile(angleichen({ ...ed.dok.profile, seite: profil }));
  void skala;
  return { knoten: profil.knoten.length, flaechePx: sil.flaeche, fehlerPx: err, hoehePx: sil.hoehePx };
}
