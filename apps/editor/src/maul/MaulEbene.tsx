// Maul-Tab (Versuch 12.10.): Lippenlinien in den 2D-Ansichten zeichnen und bearbeiten.
// Florians Ablauf: Start auf der Spiegelachse (Front/Top) bzw. der Außenkontur (Seite), dann Punkte bis zum Mundwinkel
// (Enter beendet). Kiefer gleich = türkis, getrennt = rot (Oberkiefer) und blau (Unterkiefer), Mundwinkel schwarz.
// Editor-Tab = Maul zu, Fressen-Tab = Maul auf. Jeder Knoten ist ein 3D-Punkt; die Ansicht bearbeitet zwei Koordinaten.

import type { Ansicht, Dokument, Lippen, Linie3, V2, V3T } from '@ee/shape';
import { bewegeKnoten, maulAnfangBewegen, maulMitMarken } from '@ee/shape';
import { abtasten3, ausAnsicht2, einfuegen3, griffZiehen3, inAnsicht2, knotenBei, knotenVerschieben3, linieDurch, loeschen3, maulAnfaengeEinbauen, maulAnfangIndizes, mundwinkelVerbinden, naechsterInAnsicht, offenVorschlag } from '@ee/shape/versuch';
import { gekoppeltBerechnen } from '../editing/gekoppelt';
import { poseSeite, poseSeiteSetzen, poseSpaltIndizes } from './fressenForm';
import { useEffect } from 'react';
import { type Modus, useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { punktAufFlaeche, startPunkt } from './maulFlaeche';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';

export const MAUL_FARBEN = { tuerkis: '#3fd6c0', rot: '#e0306a', blau: '#1832e6', ecke: '#000000' } as const;
const PUNKT_R = 5;
const GRIFF = 6;

export type Zustand = 'zu' | 'auf';
export type LinienName = 'oben' | 'unten';

export function zustandVon(modus: Modus): Zustand {
  return modus === 'editor' ? 'zu' : 'auf';
}

/** Lippen im aktuellen Zustand; offen ohne eigene Linien = Vorschlag aus „zu“ (noch nicht gespeichert). */
export function aktuelleLippen(dok: Dokument, modus: Modus): { lippen: Lippen | null; zustand: Zustand; vorschlag: boolean } {
  const zustand = zustandVon(modus);
  if (!dok.maul) return { lippen: null, zustand, vorschlag: false };
  if (zustand === 'zu') return { lippen: mundwinkelVerbinden(dok.maul.zu), zustand, vorschlag: false };
  if (dok.maul.auf) return { lippen: mundwinkelVerbinden(dok.maul.auf), zustand, vorschlag: false };
  return { lippen: offenVorschlag(dok.maul.zu), zustand, vorschlag: true };
}

/** Bauweise Kern (Phase 2): Die Maullinien sind frei — kein Einbau der Anfänge als Umrissknoten (Versuch 12.10., Loft). */
const kernBauweise = () => useUi.getState().bauweise === 'kern';

/**
 * Lippen setzen; der Mundwinkel bleibt ein gemeinsamer Punkt beider Kiefer (Florian 12.10.). Bauweise Kern, geschlossen
 * (14.10., Florian: „Rot und Blau gehen von der Seite direkt in die schwarze Linie über“): Die Lippenanfänge sind
 * markierte Knoten des Seitenumrisses (`maulMitMarken`: einfügen, trennen, vereinen; Linienanfänge exakt auf den Knoten).
 */
export function setzeLippen(zustand: Zustand, lippen: Lippen) {
  const ed = useEditor.getState();
  const maul = ed.dok.maul;
  const vorher = zustand === 'zu' ? maul?.zu : (maul?.auf ?? null);
  const verbunden = mundwinkelVerbinden(lippen, vorher);
  if (zustand === 'zu' && kernBauweise()) ed.setzeDokument(maulMitMarken(ed.dok, verbunden));
  else if (zustand === 'zu') ed.setzeMaul({ ...(maul ?? {}), zu: verbunden });
  else if (maul) ed.setzeMaul({ ...maul, auf: verbunden });
}

/**
 * Bauweise Kern: Lippenanfang ziehen = den markierten Knoten der schwarzen Linie mitbewegen (ein Zustand, ein Bau). Wie ein
 * Zug am Umriss gekoppelt (Front/Top folgen der Ausdehnung am entsprechenden Punkt), gerechnet vom Gestenanfang.
 */
function setzeLippenMitAnfang(lippen: Lippen, rolle: LinienName, anfang: V2, basis: Dokument['profile']) {
  const ed = useEditor.getState();
  const verbunden = mundwinkelVerbinden(lippen, ed.dok.maul?.zu);
  const seite = maulAnfangBewegen(basis.seite, rolle, anfang);
  const profile = gekoppeltBerechnen('seite', seite, basis, useUi.getState().auswahl).profile;
  ed.setzeDokument(maulMitMarken({ ...ed.dok, profile }, verbunden));
}

/**
 * Geschlossene Lippen setzen und ihre Anfänge in den Seitenumriss einbauen (Florian 12.10. abends: „Das Maul muss an
 * der Umrisslinie direkt sitzen“): Die Anfänge werden Knoten des Umrisses, ein Undo-Schritt für beides.
 */
export function setzeLippenImUmriss(lippen: Lippen) {
  const ed = useEditor.getState();
  const maul = ed.dok.maul;
  const verbunden = mundwinkelVerbinden(lippen, maul?.zu);
  const r = maulAnfaengeEinbauen(ed.dok.profile.seite, verbunden);
  ed.setzeDokument({ ...ed.dok, profile: { ...ed.dok.profile, seite: r.seite }, maul: { ...(maul ?? {}), zu: r.zu } });
}

function farbe(zustand: Zustand, lippen: Lippen, name: LinienName): string {
  if (zustand === 'zu' && !lippen.unten) return MAUL_FARBEN.tuerkis;
  return name === 'oben' ? MAUL_FARBEN.rot : MAUL_FARBEN.blau;
}

/** Linien, Punkte und Griffe des Mauls in einer Ansicht. */
export function MaulZeichnung({ ansicht, bild, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  const auswahl = useUi((s) => s.maulAuswahl);
  const zeichnen = useUi((s) => s.maulZeichnen);
  const { lippen, zustand } = aktuelleLippen(dok, modus);
  // Bauweise Kern, geschlossen, Front/Top: die wirksamen Lippenlinien aus dem Kern (Breite auf der Haut × Verhältnis der
  // Knoten) — so liegen Rot und Blau genau auf der Lippenkante, auch zwischen den Knoten (14.10.)
  useNetzStand((s) => s.version);
  const wirk = kernBauweise() && zustand === 'zu' && ansicht !== 'seite' ? aktuellesNetz()?.netz.maul?.linien : undefined;
  const wirkPunkte = (name: LinienName): V3T[] | null => {
    const flach = wirk?.[name];
    if (!flach || flach.length < 6) return null;
    const sk = dok.skalierung || 1;
    const out: V3T[] = [];
    for (let i = 0; i + 2 < flach.length; i += 3) out.push([flach[i]! / sk, flach[i + 1]! / sk, flach[i + 2]! / sk]);
    return out;
  };
  const zug = (pts: V3T[], spiegel = false) =>
    pts
      .map((p, k) => {
        const q = bild(inAnsicht2(spiegel ? [p[0], p[1], -p[2]] : p, ansicht));
        return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      })
      .join('');
  const linien: [LinienName, Linie3][] = lippen ? [['oben', lippen.oben], ...(lippen.unten ? [['unten', lippen.unten] as [LinienName, Linie3]] : [])] : [];

  return (
    <g className={aktiv ? 'maul aktiv' : 'maul'} pointerEvents={aktiv ? 'auto' : 'none'}>
      {lippen &&
        linien.map(([name, l]) => {
          const f = farbe(zustand, lippen, name);
          const pts = wirkPunkte(name) ?? abtasten3(l, 16);
          return (
            <g key={name}>
              {ansicht !== 'seite' && <path d={zug(pts, true)} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.85} />}
              <path d={zug(pts)} fill="none" stroke={f} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              {aktiv && <path data-maullinie={name} d={zug(pts)} fill="none" stroke="transparent" strokeWidth={14} />}
            </g>
          );
        })}
      {lippen &&
        aktiv &&
        linien.map(([name, l]) => {
          const f = farbe(zustand, lippen, name);
          const gewaehlt = auswahl?.linie === name ? auswahl.indizes : [];
          return (
            <g key={`k-${name}`}>
              {gewaehlt.map((i) => {
                const k = l.knoten[i];
                if (!k) return null;
                const p = bild(inAnsicht2(k.p, ansicht));
                return (['ein', 'aus'] as const).map((seite) => {
                  const rel = k[seite];
                  if (Math.hypot(...rel) < 1e-6) return null;
                  const q = bild(inAnsicht2([k.p[0] + rel[0], k.p[1] + rel[1], k.p[2] + rel[2]], ansicht));
                  return (
                    <g key={`${i}-${seite}`} data-maulgriff={`${name}:${i}:${seite}`} className="griff">
                      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={f} strokeWidth={1} />
                      <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />
                      <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill={f} />
                    </g>
                  );
                });
              })}
              {l.knoten.map((k, i) => {
                const q = bild(inAnsicht2(k.p, ansicht));
                const ecke = i === l.knoten.length - 1;
                // gemeinsamer Mundwinkel: nur einmal zeichnen (gehört der Oberlinie)
                if (ecke && name === 'unten' && !gewaehlt.includes(i)) return null;
                return (
                  <g key={i} data-maulknoten={`${name}:${i}`} className={gewaehlt.includes(i) ? 'knoten gewaehlt' : 'knoten'}>
                    <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
                    <circle className="maul-punkt" cx={q.x} cy={q.y} r={PUNKT_R} fill={ecke ? MAUL_FARBEN.ecke : f} stroke={gewaehlt.includes(i) ? '#ffffff' : 'none'} strokeWidth={2} />
                  </g>
                );
              })}
            </g>
          );
        })}
      {zeichnen && zeichnen.length > 0 && (
        <g className="maul-zeichnen" pointerEvents="none">
          <path d={zug(zeichnen)} fill="none" stroke={MAUL_FARBEN.tuerkis} strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" />
          {zeichnen.map((p, i) => {
            const q = bild(inAnsicht2(p, ansicht));
            return <circle key={i} cx={q.x} cy={q.y} r={PUNKT_R} fill={i === 0 ? MAUL_FARBEN.tuerkis : MAUL_FARBEN.tuerkis} />;
          })}
        </g>
      )}
    </g>
  );
}

export type Ebene2DKontext = {
  ansicht: Ansicht;
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
};

/** Zeichnen beenden: Linie aus den gesetzten Punkten (glatt, letzter Punkt = Mundwinkel). */
export function maulZeichnenBeenden(abbrechen = false) {
  const ui = useUi.getState();
  const pts = ui.maulZeichnen;
  if (!pts) return;
  ui.setzeMaulZeichnen(null);
  if (abbrechen || pts.length < 2) return;
  if (kernBauweise()) setzeLippen('zu', { oben: linieDurch(pts) }); // Anfang wird markierter Knoten der schwarzen Linie
  else setzeLippenImUmriss({ oben: linieDurch(pts) });
  ui.setzeWerkzeug('auswahl');
  ui.setzeMaulAuswahl({ linie: 'oben', indizes: [pts.length - 1] });
}

/** Zeigereingabe im Maul-Tab; true = verarbeitet. */
export function maulZeiger(e: React.PointerEvent, ctx: Ebene2DKontext): boolean {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const { lippen, zustand, vorschlag } = aktuelleLippen(ed.dok, ed.modus);
  const q = ctx.lokal(e.clientX, e.clientY);
  const ziel = e.target as Element;

  // Zeichenstift: neue Maullinie (nur im geschlossenen Zustand und in Seite/Front)
  if (ui.maulZeichnen || (!lippen && zustand === 'zu')) {
    if (ctx.ansicht === 'top') {
      ui.zeigeHinweis('Die Maullinie in der Seite oder der Front zeichnen');
      return true;
    }
    const pts = ui.maulZeichnen ?? [];
    const letzter = pts[pts.length - 1];
    if (letzter && e.detail >= 2) {
      maulZeichnenBeenden();
      return true;
    }
    const p = pts.length === 0 ? startPunkt(ed.dok, ctx.ansicht, q) : punktAufFlaeche(ed.dok, ctx.ansicht, q) ?? ausAnsicht2(letzter!, ctx.ansicht, q);
    ui.setzeMaulZeichnen([...pts, p]);
    return true;
  }
  if (!lippen) {
    ui.zeigeHinweis('Zuerst im Editor-Tab die geschlossene Maullinie zeichnen');
    return true;
  }
  const knotenEl = ziel.closest('[data-maulknoten]');
  const griffEl = ziel.closest('[data-maulgriff]');
  const linieEl = ziel.closest('[data-maullinie]');
  const linieVon = (n: LinienName): Linie3 => (n === 'oben' ? lippen.oben : lippen.unten ?? lippen.oben);
  const mit = (n: LinienName, l: Linie3): Lippen => (n === 'oben' ? { ...lippen, oben: l } : { ...lippen, unten: l });

  if (ui.werkzeug !== 'auswahl' && !e.metaKey) {
    if (knotenEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'minus')) {
      const [n, i] = knotenEl.getAttribute('data-maulknoten')!.split(':') as [LinienName, string];
      const l = linieVon(n);
      const neu = loeschen3(l, Number(i));
      if (neu === l) ui.zeigeHinweis('Start und Mundwinkel bleiben');
      else setzeLippen(zustand, mit(n, neu));
    } else if (!knotenEl && linieEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
      const n = linieEl.getAttribute('data-maullinie') as LinienName;
      const t = naechsterInAnsicht(linieVon(n), ctx.ansicht, q);
      if (t) {
        const r = einfuegen3(linieVon(n), t.segment, t.t);
        setzeLippen(zustand, mit(n, r.linie));
        ui.setzeMaulAuswahl({ linie: n, indizes: [r.index] });
      }
    }
    return true;
  }

  if (griffEl) {
    const [n, iStr, seite] = griffEl.getAttribute('data-maulgriff')!.split(':') as [LinienName, string, 'ein' | 'aus'];
    const i = Number(iStr);
    let brechen = e.altKey;
    ed.beginGeste();
    if (vorschlag) setzeLippen(zustand, lippen);
    ctx.ziehen(
      e,
      (ev) => {
        brechen ||= ev.altKey;
        const aktuell = aktuelleLippen(useEditor.getState().dok, useEditor.getState().modus).lippen!;
        const l = n === 'oben' ? aktuell.oben : aktuell.unten ?? aktuell.oben;
        const neu = griffZiehen3(l, i, seite, ctx.ansicht, ctx.lokal(ev.clientX, ev.clientY), brechen);
        setzeLippen(zustand, n === 'oben' ? { ...aktuell, oben: neu } : { ...aktuell, unten: neu });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (knotenEl) {
    const [n, iStr] = knotenEl.getAttribute('data-maulknoten')!.split(':') as [LinienName, string];
    const i = Number(iStr);
    const bisher = ui.maulAuswahl?.linie === n ? ui.maulAuswahl.indizes : [];
    const sel = e.shiftKey ? (bisher.includes(i) ? bisher.filter((x) => x !== i) : [...bisher, i]) : bisher.includes(i) ? bisher : [i];
    ui.setzeMaulAuswahl({ linie: n, indizes: sel });
    if (!sel.includes(i)) return true;
    const start = q;
    // Maulanfang im geschlossenen Zustand (Seite oder Front): Er ist ein Knoten des Seitenumrisses. Ziehen bewegt diesen
    // Knoten, der Umriss geht mit (Unterbiss, Überbiss), der Anfang folgt ihm genau (Florian 12.10. abends).
    // Bauweise Kern: nicht so — der Anfang ist ein freier Linienpunkt (eigener Anfang des kürzeren Kiefers, auch innen);
    // der Kern setzt den Schlitzanfang selbst auf die Kontur. Ein eingebauter Umrissknoten zog beim Ziehen einen neuen
    // Silhouettenpunkt statt der Linie (Florian 15.10. nachts: „unmöglich, Über- oder Unterbiss zu erstellen“).
    if (zustand === 'zu' && sel.length === 1 && i === 0 && ctx.ansicht !== 'top' && !kernBauweise()) {
      if (knotenBei(ed.dok.profile.seite, { x: linieVon(n).knoten[0]!.p[0], y: linieVon(n).knoten[0]!.p[1] }) === null) setzeLippenImUmriss(lippen);
      const dok0 = useEditor.getState().dok;
      const ind = maulAnfangIndizes(dok0.profile.seite, dok0.maul!.zu);
      const k = n === 'oben' || !dok0.maul!.zu.unten ? ind.oben : ind.unten;
      // Kiefer gleich mit gespeicherter Pose: zwei deckungsgleiche Anfänge, sie wandern zusammen
      const paar = !dok0.maul!.zu.unten ? ind.unten : null;
      if (k !== null) {
        const basisProfile = dok0.profile;
        const p0 = basisProfile.seite.knoten[k]!.p;
        ed.beginGeste();
        ctx.ziehen(
          e,
          (ev) => {
            const p = ctx.lokal(ev.clientX, ev.clientY);
            // Seite: x und y; Front: nur die Höhe (der Anfang liegt auf der Achse)
            const ziel = ctx.ansicht === 'seite' ? { x: p0.x + p.x - start.x, y: p0.y + p.y - start.y } : { x: p0.x, y: p0.y + p.y - start.y };
            const eins = bewegeKnoten(basisProfile.seite, k, ziel);
            const neu = paar !== null ? bewegeKnoten(eins, paar, ziel) : eins;
            useEditor.getState().setzeProfile(gekoppeltBerechnen('seite', neu, basisProfile, useUi.getState().auswahl).profile);
          },
          () => useEditor.getState().endeGeste(),
        );
        return true;
      }
    }
    // offener Maulanfang (Fressen, Seite): Punkt der Pose-Form, Ziehen bewegt ihn, der Anfang folgt (gemeinsamer Punkt)
    if (zustand === 'auf' && sel.length === 1 && i === 0 && ctx.ansicht === 'seite') {
      const pose0 = poseSeite(ed.dok);
      const s0 = linieVon(n).knoten[0]!.p;
      const ind = poseSpaltIndizes(ed.dok);
      const k = ind ? (n === 'oben' ? ind.oben : ind.unten) : knotenBei(pose0, { x: s0[0], y: s0[1] });
      if (k !== null) {
        const p0 = pose0.knoten[k]!.p;
        ed.beginGeste();
        ctx.ziehen(
          e,
          (ev) => {
            const p = ctx.lokal(ev.clientX, ev.clientY);
            poseSeiteSetzen(bewegeKnoten(pose0, k, { x: p0.x + p.x - start.x, y: p0.y + p.y - start.y }));
          },
          () => useEditor.getState().endeGeste(),
        );
        return true;
      }
    }
    const basis = linieVon(n);
    // Bauweise Kern: Der Lippenanfang ist ein markierter Knoten der schwarzen Linie (14.10.); ihn ziehen bewegt Knoten und
    // Linie zusammen, die Kurve folgt wie bei einem Illustrator-Punkt, es entsteht kein neuer Knoten
    const mitAnfang = kernBauweise() && zustand === 'zu' && sel.includes(0) && ctx.ansicht !== 'top';
    const basisProfile = ed.dok.profile;
    ed.beginGeste();
    if (vorschlag) setzeLippen(zustand, lippen);
    ctx.ziehen(
      e,
      (ev) => {
        const p = ctx.lokal(ev.clientX, ev.clientY);
        const aktuell = aktuelleLippen(useEditor.getState().dok, useEditor.getState().modus).lippen!;
        // der Anfang bleibt auf der Spiegelebene: in der Front nur die Höhe
        const dx = kernBauweise() && sel.includes(0) && ctx.ansicht === 'front' ? 0 : p.x - start.x;
        const neu = knotenVerschieben3(basis, sel, ctx.ansicht, { x: dx, y: p.y - start.y });
        const lippenNeu = n === 'oben' ? { ...aktuell, oben: neu } : { ...aktuell, unten: neu };
        if (mitAnfang) setzeLippenMitAnfang(lippenNeu, n, { x: neu.knoten[0]!.p[0], y: neu.knoten[0]!.p[1] }, basisProfile);
        else setzeLippen(zustand, lippenNeu);
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }
  ui.setzeMaulAuswahl(null);
  return true;
}

/** Enter beendet die neue Linie, Esc bricht ab (bei weniger als zwei Punkten) oder beendet sie. */
export function useMaulTasten() {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      if (!ui.maulZeichnen) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        maulZeichnenBeenden();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        maulZeichnenBeenden((ui.maulZeichnen?.length ?? 0) < 2);
      }
    };
    window.addEventListener('keydown', taste, true);
    return () => window.removeEventListener('keydown', taste, true);
  }, []);
}
