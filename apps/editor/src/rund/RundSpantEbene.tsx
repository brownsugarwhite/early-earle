// Versuch 13.10. nachmittags, Meilenstein 2: Spanten der Bauweise „rund“ in den 2D-Ansichten.
//
// - Seite: Spantlinien R1 … Rn (Strecke quer über ein Teil, die Enden liegen auf dem Umriss). Werkzeug S: Klick setzt
//   einen Spant quer über das Teil (kürzeste Sehne), eine gezogene Linie über mehrere Teile gibt je Teil einen Spant.
//   Linie ziehen verschiebt den Spant, Klick wählt ihn.
// - Front: Der gewählte Spant wird an seiner Höhe als Schnitt gezeigt und bearbeitet wie ein Profil (Punkte, Griffe,
//   ⌥ = Ecke, Zeichenstift/+/− = Punkt in allen Spanten). Breite 1 = runder Körper an der dicksten Stelle. Schräge
//   Strecken werden aufgerichtet gezeigt (Länge der Strecke senkrecht, Mitte auf ihrer mittleren Höhe).
// - Punkte bleiben auf ihrer Hälfte (die Achse hält sie), eine Acht über die Achse gibt es nicht.

import {
  type Ansicht,
  type Dokument,
  type GriffSeite,
  type Kubik,
  type Profil,
  type V2,
  bewegeGriff,
  editierbarerGriff,
  einfuegen,
  gespiegelteSegmente,
  istAchsKnoten,
  kannLoeschen,
  loeschen,
  naechsterAufProfil,
  pfadAbtasten,
  segmente,
  umwandeln,
  verschiebeKnoten,
  vollerPfad,
} from '@ee/shape';
import { type RundSpant, type Strecke, rundKoerper, rundSpantNeu, spantStrecke, spantenAusLinie } from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { rundZuletzt, useRundAnzeige } from './rundBau';

export const RUND_SPANT = '#6d34b8';
const PUNKT_R = 5;
const GRIFF = 6;

export const rundSpantName = (i: number) => `R${i + 1}`;

const umrisse = new WeakMap<Dokument['profile'], V2[]>();
/** Seitenumriss als Polygon (gemerkt je Profile). */
export function seitenUmriss(dok: Dokument): V2[] {
  let u = umrisse.get(dok.profile);
  if (!u) {
    u = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
    umrisse.set(dok.profile, u);
  }
  return u;
}

export function rundStrecke(dok: Dokument, sp: RundSpant): Strecke | null {
  return spantStrecke(seitenUmriss(dok), sp.p, sp.richtung);
}

/** Breite des runden Körpers an der dicksten Stelle des Spants (u = 1), aus dem letzten Bau. */
function breiteVon(dok: Dokument, i: number, s: Strecke): number {
  const bau = rundZuletzt();
  const z = bau?.spantZMax?.[i];
  if (z && bau.spanten.length === (dok.rundSpanten?.length ?? 0)) return z;
  if (bau) {
    let m = 0;
    for (let k = 1; k < 32; k++) m = Math.max(m, bau.dickeRundBei({ x: s.a.x + (k / 32) * (s.b.x - s.a.x), y: s.a.y + (k / 32) * (s.b.y - s.a.y) }));
    if (m > 0) return m;
  }
  return 0.5 * s.laenge;
}

/** Abbildung des Spant-Profils (u, v) in die Front (z, y): aufgerichtet an der mittleren Höhe der Strecke. */
function abbildung(s: Strecke, zMax: number) {
  const yc = (s.a.y + s.b.y) / 2;
  return {
    welt: (q: V2): V2 => ({ x: q.x * zMax, y: yc + (q.y - 0.5) * s.laenge }),
    richtung: (d: V2): V2 => ({ x: d.x * zMax, y: d.y * s.laenge }),
    norm: (p: V2): V2 => ({ x: p.x / zMax, y: (p.y - yc) / s.laenge + 0.5 }),
  };
}

const aktivIn = (bauweise: string, ebene: string) => bauweise === 'rund' && ebene === 'form';

/** Spantlinien in der Seite. */
export function RundSpantLinien({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const dok = useEditor((s) => s.dok);
  const bauweise = useUi((s) => s.bauweise);
  const ebene = useUi((s) => s.ebene);
  const auswahl = useUi((s) => s.rundSpantAuswahl);
  if (ansicht !== 'seite' || bauweise !== 'rund' || !dok.rundSpanten?.length) return null;
  const aktiv = aktivIn(bauweise, ebene);
  return (
    <g className="rund-spanten" pointerEvents={aktiv ? 'auto' : 'none'}>
      {dok.rundSpanten.map((sp, i) => {
        const s = rundStrecke(dok, sp);
        if (!s) return null;
        const a = bild(s.a);
        const b = bild(s.b);
        const sel = auswahl?.spant === i;
        const oben = a.y < b.y ? a : b;
        return (
          <g key={i} data-rundspant={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={RUND_SPANT} strokeWidth={sel ? 3.5 : 2} strokeLinecap="round" />
            {aktiv && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} />}
            <text className="spant-name" x={oben.x + 5} y={oben.y - 6} fill={RUND_SPANT}>
              {rundSpantName(i)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function pfad(segs: readonly Kubik[], f: (p: V2) => V2): string {
  if (!segs.length) return '';
  const t = (p: V2) => {
    const q = f(p);
    return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  };
  let d = `M${t(segs[0]![0])}`;
  for (const s of segs) d += `C${t(s[1])} ${t(s[2])} ${t(s[3])}`;
  return d;
}

/** Der gewählte Spant als Schnitt in der Front, mit Punkten und Griffen. */
export function RundSpantSchnitt({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const dok = useEditor((s) => s.dok);
  const bauweise = useUi((s) => s.bauweise);
  const ebene = useUi((s) => s.ebene);
  const auswahl = useUi((s) => s.rundSpantAuswahl);
  useRundAnzeige((s) => s.stand);
  if (ansicht !== 'front' || bauweise !== 'rund' || !auswahl) return null;
  const sp = dok.rundSpanten?.[auswahl.spant];
  if (!sp) return null;
  const s = rundStrecke(dok, sp);
  if (!s) return null;
  const ab = abbildung(s, breiteVon(dok, auswahl.spant, s));
  const welt = (p: V2) => bild(ab.welt(p));
  const aktiv = aktivIn(bauweise, ebene);
  const pr = sp.profil;
  return (
    <g className="rund-spant-schnitt" pointerEvents={aktiv ? 'auto' : 'none'} data-rundschnitt={auswahl.spant}>
      <path d={pfad(gespiegelteSegmente(pr), welt)} fill="none" stroke={RUND_SPANT} strokeWidth={1.5} strokeOpacity={0.35} />
      <path d={pfad(segmente(pr), welt)} fill="none" stroke={RUND_SPANT} strokeWidth={3} strokeLinejoin="round" data-rundschnittkurve="" />
      {aktiv && <path d={pfad(segmente(pr), welt)} fill="none" stroke="transparent" strokeWidth={12} data-rundschnittkurve="" />}
      {aktiv &&
        auswahl.knoten.map((j) => {
          const kn = pr.knoten[j];
          if (!kn) return null;
          const p = welt(kn.p);
          const erlaubt = editierbarerGriff(pr, j);
          return (['ein', 'aus'] as const).map((seite: GriffSeite) => {
            const rel = kn[seite];
            if (Math.hypot(rel.x, rel.y) < 1e-6) return null;
            if (istAchsKnoten(pr, j) && erlaubt !== 'beide' && erlaubt !== seite) return null;
            const d = ab.richtung(rel);
            const w = ab.welt(kn.p);
            const q = bild({ x: w.x + d.x, y: w.y + d.y });
            return (
              <g key={`${j}-${seite}`} data-rundgriff={`${j}:${seite}`} className="griff">
                <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={RUND_SPANT} strokeWidth={1} />
                <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />
                <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill={RUND_SPANT} />
              </g>
            );
          });
        })}
      {aktiv &&
        pr.knoten.map((kn, j) => {
          const q = welt(kn.p);
          const sel = auswahl.knoten.includes(j);
          return (
            <g key={j} data-rundknoten={j} className={sel ? 'knoten gewaehlt' : 'knoten'}>
              <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
              <circle cx={q.x} cy={q.y} r={PUNKT_R} fill={RUND_SPANT} stroke={sel ? '#ffffff' : 'none'} strokeWidth={2} />
            </g>
          );
        })}
    </g>
  );
}

// ---------- Bedienung ----------

type Kontext = {
  ansicht: Ansicht;
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
};

const liste = (): RundSpant[] => useEditor.getState().dok.rundSpanten ?? [];
function setze(i: number, sp: RundSpant) {
  const l = liste().slice();
  l[i] = sp;
  useEditor.getState().setzeRundSpanten(l);
}

/** Neue Spanten an der Stelle bzw. entlang der Linie (formneutral: Profil = Querschnitt des Körpers dort). */
function neueSpanten(a: V2, b: V2 | null): number[] {
  const ed = useEditor.getState();
  const dok = ed.dok;
  const umriss = seitenUmriss(dok);
  let bau = rundZuletzt();
  if (!bau || bau.spanten.length !== (dok.rundSpanten?.length ?? 0)) bau = rundKoerper(dok);
  const knoten = dok.rundSpanten?.[0]?.profil.knoten.length ?? 3;
  const orte = b ? spantenAusLinie(umriss, a, b) : [{ p: a, richtung: null as V2 | null }];
  const neu: RundSpant[] = [];
  for (const o of orte) {
    const sp = rundSpantNeu(umriss, bau.dickeBei, o.p, o.richtung, knoten, bau.dickeRundBei);
    if (!sp) continue;
    // gleiche Punktstruktur wie die vorhandenen Spanten
    neu.push(sp);
  }
  if (!neu.length) return [];
  const alt = liste();
  ed.setzeRundSpanten([...alt, ...neu]);
  return neu.map((_, k) => alt.length + k);
}

/** Zeiger für die Spanten der Bauweise „rund“; true = verarbeitet. */
export function rundSpantZeiger(e: React.PointerEvent, ctx: Kontext): boolean {
  const ui = useUi.getState();
  if (!aktivIn(ui.bauweise, ui.ebene)) return false;
  const ed = useEditor.getState();
  const ziel = e.target as Element;
  const q = ctx.lokal(e.clientX, e.clientY);

  if (ctx.ansicht === 'seite') {
    const spEl = ziel.closest('[data-rundspant]');
    if (spEl) {
      const i = Number(spEl.getAttribute('data-rundspant'));
      ui.setzeRundSpantAuswahl({ spant: i, knoten: [] });
      const sp0 = liste()[i];
      if (!sp0) return true;
      ed.beginGeste();
      ctx.ziehen(
        e,
        (ev) => {
          const p = ctx.lokal(ev.clientX, ev.clientY);
          const jetzt = liste()[i];
          if (!jetzt) return;
          // nur quer zur Strecke verschieben (entlang der Körperachse); die Enden suchen sich den Umriss neu
          const d = sp0.richtung;
          const n = { x: -d.y, y: d.x };
          const w = (p.x - q.x) * n.x + (p.y - q.y) * n.y;
          const neu = { ...jetzt, p: { x: sp0.p.x + w * n.x, y: sp0.p.y + w * n.y } };
          if (spantStrecke(seitenUmriss(useEditor.getState().dok), neu.p, neu.richtung)) setze(i, neu);
        },
        () => useEditor.getState().endeGeste(),
      );
      return true;
    }
    if (ui.werkzeug === 'spant') {
      const start = { x: e.clientX, y: e.clientY };
      ctx.ziehen(
        e,
        () => {},
        (ev) => {
          const weit = Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6;
          const idx = neueSpanten(q, weit ? ctx.lokal(ev.clientX, ev.clientY) : null);
          if (idx.length) {
            ui.setzeRundSpantAuswahl({ spant: idx[idx.length - 1]!, knoten: [] });
            ui.setzeWerkzeug('auswahl');
            if (idx.length > 1) ui.zeigeHinweis(`${idx.length} Spanten: einer je Teil, das die Linie kreuzt`);
          } else ui.zeigeHinweis('Spanten liegen im Körper: in der Seite in ein Teil klicken oder eine Linie quer darüber ziehen');
        },
      );
      return true;
    }
    return false;
  }

  if (ctx.ansicht !== 'front') return false;
  const sel = ui.rundSpantAuswahl;
  if (!sel) return false;
  const sp = liste()[sel.spant];
  if (!sp) return false;
  const s = rundStrecke(ed.dok, sp);
  if (!s) return false;
  const ab = abbildung(s, breiteVon(ed.dok, sel.spant, s));
  const pNorm = ab.norm(q);
  const kurveEl = ziel.closest('[data-rundschnittkurve]');
  const knotenEl = ziel.closest('[data-rundknoten]');
  const griffEl = ziel.closest('[data-rundgriff]');

  // Zeichenstift, + und −: Punkte gelten für alle Spanten (gleiche Punktstruktur)
  if (ui.werkzeug !== 'auswahl' && ui.werkzeug !== 'breite' && ui.werkzeug !== 'spant' && !e.metaKey) {
    if (knotenEl) {
      const j = Number(knotenEl.getAttribute('data-rundknoten'));
      if (ui.werkzeug === 'stift' && e.altKey) {
        setze(sel.spant, { ...sp, profil: umwandeln(sp.profil, j) });
        ui.setzeRundSpantAuswahl({ spant: sel.spant, knoten: [j] });
      } else if (ui.werkzeug === 'stift' || ui.werkzeug === 'minus') {
        if (kannLoeschen(sp.profil, j)) {
          ed.setzeRundSpanten(liste().map((x) => ({ ...x, profil: loeschen(x.profil, j) })));
          ui.setzeRundSpantAuswahl({ spant: sel.spant, knoten: [] });
        } else ui.zeigeHinweis('Achspunkte bleiben – sie halten die Spiegelung');
      }
      return true;
    }
    if (kurveEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
      const t = naechsterAufProfil(sp.profil, pNorm);
      if (t) {
        ed.setzeRundSpanten(liste().map((x) => ({ ...x, profil: einfuegen(x.profil, t.segment, t.t).profil })));
        ui.setzeRundSpantAuswahl({ spant: sel.spant, knoten: [t.segment + 1] });
        ui.zeigeHinweis('Punkt in allen Spanten eingefügt (gleiche Punktstruktur)');
      }
      return true;
    }
    return !!kurveEl;
  }

  if (griffEl) {
    const [jS, seite] = griffEl.getAttribute('data-rundgriff')!.split(':') as [string, GriffSeite];
    const j = Number(jS);
    const kn = sp.profil.knoten[j]!;
    const versatz = { x: pNorm.x - (kn.p.x + kn[seite].x), y: pNorm.y - (kn.p.y + kn[seite].y) };
    let brechen = e.altKey;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        brechen ||= ev.altKey;
        const jetzt = liste()[sel.spant];
        if (!jetzt) return;
        const pn = ab.norm(ctx.lokal(ev.clientX, ev.clientY));
        setze(sel.spant, { ...jetzt, profil: bewegeGriff(jetzt.profil, j, seite, { x: pn.x - versatz.x, y: pn.y - versatz.y }, brechen) });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (knotenEl) {
    const j = Number(knotenEl.getAttribute('data-rundknoten'));
    const auswahl = e.shiftKey ? (sel.knoten.includes(j) ? sel.knoten.filter((x) => x !== j) : [...sel.knoten, j]) : sel.knoten.includes(j) ? sel.knoten : [j];
    ui.setzeRundSpantAuswahl({ spant: sel.spant, knoten: auswahl });
    if (!auswahl.includes(j)) return true;
    const basis: Profil = sp.profil;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        const pn = ab.norm(ctx.lokal(ev.clientX, ev.clientY));
        const jetzt = liste()[sel.spant];
        if (jetzt) setze(sel.spant, { ...jetzt, profil: verschiebeKnoten(basis, auswahl, { x: pn.x - pNorm.x, y: pn.y - pNorm.y }) });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (kurveEl) {
    ui.setzeRundSpantAuswahl({ spant: sel.spant, knoten: [] });
    return true;
  }
  return false;
}

/** Entf: gewählte Punkte in allen Spanten löschen, ohne Punktwahl den Spant selbst. true = erledigt. */
export function rundSpantLoeschen(): boolean {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const sel = ui.rundSpantAuswahl;
  if (ui.bauweise !== 'rund' || !sel || !liste()[sel.spant]) return false;
  if (sel.knoten.length) {
    let l = liste();
    for (const j of [...sel.knoten].sort((a, b) => b - a)) {
      if (!l.every((x) => kannLoeschen(x.profil, j))) continue;
      l = l.map((x) => ({ ...x, profil: loeschen(x.profil, j) }));
    }
    ed.setzeRundSpanten(l);
    ui.setzeRundSpantAuswahl({ spant: sel.spant, knoten: [] });
    return true;
  }
  ed.setzeRundSpanten(liste().filter((_, k) => k !== sel.spant));
  ui.setzeRundSpantAuswahl(null);
  return true;
}
