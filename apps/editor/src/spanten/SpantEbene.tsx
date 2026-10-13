// Spanten (Versuch 12.10. nachmittags, Florian: „Ja, mach das mit den Spanten mal“): Querschnitte an gewählten Stellen
// wie im Spantenriss. Seite und Top zeigen die Spantlinien (S1 … Sn, vorn türkis, hinten koralle) und den Hauptspant H
// (= Front an der dicksten Stelle). Front zeigt die vorderen Spanten, Back die hinteren; der gewählte Spant wird dort
// bearbeitet wie ein Profil. Alle Spanten haben die Punktstruktur der Front: Ein Punkt kommt und geht in allen.

import {
  type Ansicht,
  type Dokument,
  type GriffSeite,
  type Kubik,
  type Profil,
  type Spant,
  type V2,
  bewegeGriff,
  editierbarerGriff,
  gespiegelteSegmente,
  hauptspantStelle,
  istAchsKnoten,
  naechsterAufProfil,
  segmente,
  spantEinfuegen,
  spantKasten,
  spantNachWelt,
  spantRichtungNachWelt,
  spantenPunktEinfuegen,
  spantenPunktLoeschen,
  stelleVon,
  umwandeln,
  verschiebeKnoten,
  weltNachSpant,
} from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export const SPANT_VORN = '#0b7a5c';
export const SPANT_HINTEN = '#bd4522';
const PUNKT_R = 5;
const GRIFF = 6;

const farbeVon = (dok: Dokument, f: number) => (f <= hauptspantStelle(dok) + 1e-9 ? SPANT_VORN : SPANT_HINTEN);
export const spantName = (i: number) => `S${i + 1}`;

/** Spantlinie in Seite (senkrecht, Höhe aus der Seite) bzw. Top (Breite aus dem Top), in Ansichtskoordinaten. */
function linie(dok: Dokument, ansicht: Ansicht, f: number): [V2, V2] {
  const k = spantKasten(dok, f);
  return ansicht === 'seite'
    ? [
        { x: k.x, y: k.yLo },
        { x: k.x, y: k.yHi },
      ]
    : [
        { x: k.x, y: -k.w },
        { x: k.x, y: k.w },
      ];
}

/** Spantlinien und Hauptspant in Seite und Top; im Form-Tab greifbar (ziehen = verschieben, Klick = wählen). */
export function SpantLinien({ ansicht, bild, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  const dok = useEditor((s) => s.dok);
  const auswahl = useUi((s) => s.spantAuswahl);
  const werkzeug = useUi((s) => s.werkzeug);
  const rund = useUi((s) => s.bauweise === 'rund');
  // Bauweise „rund“ hat eigene Spanten (quer über ein Teil, rund/RundSpantEbene.tsx)
  if (rund || ansicht === 'front' || (!dok.spanten?.length && werkzeug !== 'spant')) return null;
  const fH = hauptspantStelle(dok);
  const strich = (f: number) => {
    const [a, b] = linie(dok, ansicht, f);
    return [bild(a), bild(b)] as const;
  };
  const [ha, hb] = strich(fH);
  return (
    <g className="spanten" pointerEvents={aktiv ? 'auto' : 'none'}>
      <g data-hauptspant="">
        <line x1={ha.x} y1={ha.y} x2={hb.x} y2={hb.y} stroke="#19232b" strokeWidth={1.5} strokeDasharray="6 4" />
        {aktiv && <line x1={ha.x} y1={ha.y} x2={hb.x} y2={hb.y} stroke="transparent" strokeWidth={12} />}
        <text className="spant-name" x={ha.x + 5} y={Math.min(ha.y, hb.y) - 6} fill="#19232b">
          H
        </text>
      </g>
      {(dok.spanten ?? []).map((sp, i) => {
        const [a, b] = strich(sp.f);
        const farbe = farbeVon(dok, sp.f);
        const sel = auswahl?.spant === i;
        return (
          <g key={i} data-spant={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={farbe} strokeWidth={sel ? 3.5 : 2} strokeLinecap="round" />
            {aktiv && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} />}
            <text className="spant-name" x={a.x + 5} y={Math.min(a.y, b.y) - 6} fill={farbe}>
              {spantName(i)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Pfad eines normierten Spant-Profils in der Front (Welt über den Kasten an seiner Stelle). */
function spantPfad(dok: Dokument, sp: Spant, bild: (p: V2) => V2, gespiegelt: boolean): string {
  const k = spantKasten(dok, sp.f);
  const segs: Kubik[] = gespiegelt ? gespiegelteSegmente(sp.profil) : segmente(sp.profil);
  const f = (p: V2) => {
    const q = bild(spantNachWelt(k, p));
    return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  };
  if (!segs.length) return '';
  let d = `M${f(segs[0]![0])}`;
  for (const s of segs) d += `C${f(s[1])} ${f(s[2])} ${f(s[3])}`;
  return d;
}

/** Sichtbar in dieser Blickrichtung? Front = vordere Spanten, Back = hintere (wie im Spantenriss). */
export function spantSichtbar(dok: Dokument, f: number, blick: 'front' | 'hinten'): boolean {
  const fH = hauptspantStelle(dok);
  return blick === 'front' ? f <= fH + 1e-9 : f >= fH - 1e-9;
}

/** Querschnitte der Spanten in Front bzw. Back; der gewählte mit Punkten und Griffen. */
export function SpantQuerschnitte({ ansicht, bild, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  const dok = useEditor((s) => s.dok);
  const blick = useUi((s) => s.blick.front);
  const auswahl = useUi((s) => s.spantAuswahl);
  const rund = useUi((s) => s.bauweise === 'rund');
  if (rund || ansicht !== 'front' || !dok.spanten?.length) return null;
  return (
    <g className="spant-querschnitte" pointerEvents={aktiv ? 'auto' : 'none'}>
      {dok.spanten.map((sp, i) => {
        if (!spantSichtbar(dok, sp.f, blick)) return null;
        const farbe = farbeVon(dok, sp.f);
        const sel = auswahl?.spant === i;
        return (
          <g key={i} data-spantkurve={i}>
            <path d={spantPfad(dok, sp, bild, true)} fill="none" stroke={farbe} strokeWidth={sel ? 2 : 1.5} strokeOpacity={0.4} />
            <path d={spantPfad(dok, sp, bild, false)} fill="none" stroke={farbe} strokeWidth={sel ? 3 : 1.5} strokeOpacity={sel ? 1 : 0.75} strokeLinejoin="round" />
            {aktiv && <path d={spantPfad(dok, sp, bild, false)} fill="none" stroke="transparent" strokeWidth={12} />}
          </g>
        );
      })}
      {aktiv && auswahl && dok.spanten[auswahl.spant] && spantSichtbar(dok, dok.spanten[auswahl.spant]!.f, blick) && (
        <SpantPunkte dok={dok} i={auswahl.spant} knoten={auswahl.knoten} bild={bild} />
      )}
    </g>
  );
}

function SpantPunkte({ dok, i, knoten, bild }: { dok: Dokument; i: number; knoten: number[]; bild: (p: V2) => V2 }) {
  const sp = dok.spanten![i]!;
  const k = spantKasten(dok, sp.f);
  const farbe = farbeVon(dok, sp.f);
  const welt = (p: V2) => bild(spantNachWelt(k, p));
  return (
    <g className="spant-punkte">
      {knoten.map((j) => {
        const kn = sp.profil.knoten[j];
        if (!kn) return null;
        const p = welt(kn.p);
        const erlaubt = editierbarerGriff(sp.profil, j);
        return (['ein', 'aus'] as const).map((seite: GriffSeite) => {
          const rel = kn[seite];
          if (Math.hypot(rel.x, rel.y) < 1e-6) return null;
          if (istAchsKnoten(sp.profil, j) && erlaubt !== 'beide' && erlaubt !== seite) return null;
          const d = spantRichtungNachWelt(k, rel);
          const q = bild({ x: spantNachWelt(k, kn.p).x + d.x, y: spantNachWelt(k, kn.p).y + d.y });
          return (
            <g key={`${j}-${seite}`} data-spantgriff={`${i}:${j}:${seite}`} className="griff">
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={farbe} strokeWidth={1} />
              <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />
              <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill={farbe} />
            </g>
          );
        });
      })}
      {sp.profil.knoten.map((kn, j) => {
        const q = welt(kn.p);
        const sel = knoten.includes(j);
        return (
          <g key={j} data-spantknoten={`${i}:${j}`} className={sel ? 'knoten gewaehlt' : 'knoten'}>
            <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
            <circle cx={q.x} cy={q.y} r={PUNKT_R} fill={farbe} stroke={sel ? '#ffffff' : 'none'} strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

// ---------- Bedienung ----------

export type SpantKontext = {
  ansicht: Ansicht;
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
};

const dokument = () => useEditor.getState().dok;
const spanten = () => dokument().spanten ?? [];
function setzeSpant(i: number, sp: Spant) {
  const liste = spanten().slice();
  liste[i] = sp;
  useEditor.getState().setzeSpanten(liste);
}

/** Spant wählen; die Front-Ansicht schaltet auf die Hälfte, in der er liegt (vorn = Front, hinten = Back). */
export function spantWaehlen(i: number | null, knoten: number[] = []) {
  const ui = useUi.getState();
  if (i === null) return ui.setzeSpantAuswahl(null);
  const sp = spanten()[i];
  if (!sp) return;
  ui.setzeSpantAuswahl({ spant: i, knoten });
  const blick = spantSichtbar(dokument(), sp.f, ui.blick.front) ? ui.blick.front : sp.f <= hauptspantStelle(dokument()) ? 'front' : 'hinten';
  if (blick !== ui.blick.front) ui.setzeBlick('front', blick);
}

/** Spanten nach f sortieren (nach dem Verschieben); die Auswahl wandert mit. */
export function sortieren(gewaehlt: number) {
  const liste = spanten();
  const sp = liste[gewaehlt];
  const sortiert = liste.slice().sort((a, b) => a.f - b.f);
  if (sortiert.every((x, k) => x === liste[k])) return;
  useEditor.getState().setzeSpanten(sortiert);
  if (sp) useUi.getState().setzeSpantAuswahl({ spant: sortiert.indexOf(sp), knoten: [] });
}

/**
 * Zeiger für Spanten; true = verarbeitet. Seite/Top: Werkzeug S setzt einen Spant, Spantlinie bzw. Hauptspant ziehen
 * verschiebt. Front/Back: gewählten Spant bearbeiten wie ein Profil (Punkte, Griffe, ⌥, P, +, −).
 */
export function spantZeiger(e: React.PointerEvent, ctx: SpantKontext): boolean {
  const ui = useUi.getState();
  if (ui.bauweise === 'rund') return false;
  const ed = useEditor.getState();
  const ziel = e.target as Element;
  const q = ctx.lokal(e.clientX, e.clientY);

  if (ctx.ansicht !== 'front') {
    const spEl = ziel.closest('[data-spant]');
    const hEl = ziel.closest('[data-hauptspant]');
    if (ui.werkzeug === 'spant' && !spEl && !hEl) {
      const f = stelleVon(ed.dok, q.x);
      if (f > 0.01 && f < 0.99) {
        const r = spantEinfuegen(ed.dok, f);
        ed.setzeSpanten(r.spanten);
        spantWaehlen(r.index);
        ui.setzeWerkzeug('auswahl');
      } else ui.zeigeHinweis('Spanten liegen innerhalb des Körpers');
      return true;
    }
    if (spEl || hEl) {
      const i = spEl ? Number(spEl.getAttribute('data-spant')) : -1;
      if (i >= 0) spantWaehlen(i);
      ed.beginGeste();
      ctx.ziehen(
        e,
        (ev) => {
          const f = Math.min(0.98, Math.max(0.02, stelleVon(useEditor.getState().dok, ctx.lokal(ev.clientX, ev.clientY).x)));
          if (i >= 0) {
            const sp = spanten()[i];
            if (sp) setzeSpant(i, { ...sp, f });
          } else useEditor.getState().setzeHauptspant(f);
        },
        () => {
          if (i >= 0) sortieren(i);
          useEditor.getState().endeGeste();
        },
      );
      return true;
    }
    return false;
  }

  // Front/Back
  const kurveEl = ziel.closest('[data-spantkurve]');
  const knotenEl = ziel.closest('[data-spantknoten]');
  const griffEl = ziel.closest('[data-spantgriff]');
  const sel = ui.spantAuswahl;
  if (!sel || (kurveEl && Number(kurveEl.getAttribute('data-spantkurve')) !== sel.spant && !knotenEl && !griffEl)) {
    if (kurveEl) {
      spantWaehlen(Number(kurveEl.getAttribute('data-spantkurve')));
      return true;
    }
    return false;
  }
  const sp = spanten()[sel.spant];
  if (!sp) return false;
  const k = spantKasten(ed.dok, sp.f);
  const norm = (p: V2) => weltNachSpant(k, p);
  const pNorm = norm(q);

  // Zeichenstift, + und −: Punkte gelten für alle Querschnitte (gleiche Punktstruktur)
  if (ui.werkzeug !== 'auswahl' && ui.werkzeug !== 'breite' && !e.metaKey) {
    if (knotenEl) {
      const j = Number(knotenEl.getAttribute('data-spantknoten')!.split(':')[1]);
      if (ui.werkzeug === 'stift' && e.altKey) {
        setzeSpant(sel.spant, { ...sp, profil: umwandeln(sp.profil, j) });
        ui.setzeSpantAuswahl({ spant: sel.spant, knoten: [j] });
      } else if (ui.werkzeug === 'stift' || ui.werkzeug === 'minus') {
        const d = spantenPunktLoeschen(ed.dok, j);
        if (d) {
          ed.setzeDokument(d);
          ui.setzeSpantAuswahl({ spant: sel.spant, knoten: [] });
        } else ui.zeigeHinweis('Achspunkte bleiben – sie halten die Spiegelung');
      }
      return true;
    }
    if (kurveEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
      const t = naechsterAufProfil(sp.profil, pNorm);
      if (t) {
        const r = spantenPunktEinfuegen(ed.dok, t.segment, t.t);
        ed.setzeDokument(r.dok);
        ui.setzeSpantAuswahl({ spant: sel.spant, knoten: [r.index] });
        ui.zeigeHinweis('Punkt in allen Spanten und in der Front eingefügt (gleiche Punktstruktur)');
      }
      return true;
    }
    return !!kurveEl;
  }

  if (griffEl) {
    const [, jS, seite] = griffEl.getAttribute('data-spantgriff')!.split(':') as [string, string, GriffSeite];
    const j = Number(jS);
    const kn = sp.profil.knoten[j]!;
    const versatz = { x: pNorm.x - (kn.p.x + kn[seite].x), y: pNorm.y - (kn.p.y + kn[seite].y) };
    let brechen = e.altKey;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        brechen ||= ev.altKey;
        const jetzt = spanten()[sel.spant];
        if (!jetzt) return;
        const pn = norm(ctx.lokal(ev.clientX, ev.clientY));
        setzeSpant(sel.spant, { ...jetzt, profil: bewegeGriff(jetzt.profil, j, seite, { x: pn.x - versatz.x, y: pn.y - versatz.y }, brechen) });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (knotenEl) {
    const j = Number(knotenEl.getAttribute('data-spantknoten')!.split(':')[1]);
    const auswahl = e.shiftKey ? (sel.knoten.includes(j) ? sel.knoten.filter((x) => x !== j) : [...sel.knoten, j]) : sel.knoten.includes(j) ? sel.knoten : [j];
    ui.setzeSpantAuswahl({ spant: sel.spant, knoten: auswahl });
    if (!auswahl.includes(j)) return true;
    const basis: Profil = sp.profil;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        const pn = norm(ctx.lokal(ev.clientX, ev.clientY));
        const jetzt = spanten()[sel.spant];
        if (jetzt) setzeSpant(sel.spant, { ...jetzt, profil: verschiebeKnoten(basis, auswahl, { x: pn.x - pNorm.x, y: pn.y - pNorm.y }) });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (kurveEl) {
    ui.setzeSpantAuswahl({ spant: sel.spant, knoten: [] });
    return true;
  }
  // freie Fläche oder Front-Profil: Spant abwählen, die Profil-Bedienung übernimmt
  ui.setzeSpantAuswahl(null);
  return false;
}

/** Entf: gewählte Punkte des Spants in allen Querschnitten löschen, ohne Punktwahl den Spant selbst. true = erledigt. */
export function spantLoeschen(): boolean {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const sel = ui.spantAuswahl;
  if (!sel || !spanten()[sel.spant]) return false;
  if (sel.knoten.length) {
    let d: Dokument | null = ed.dok;
    for (const j of [...sel.knoten].sort((a, b) => b - a)) d = d ? spantenPunktLoeschen(d, j) : null;
    if (d) ed.setzeDokument(d);
    else ui.zeigeHinweis('Achspunkte bleiben – sie halten die Spiegelung');
    ui.setzeSpantAuswahl({ spant: sel.spant, knoten: [] });
    return true;
  }
  ed.setzeSpanten(spanten().filter((_, k) => k !== sel.spant));
  ui.setzeSpantAuswahl(null);
  return true;
}
