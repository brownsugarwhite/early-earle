// 2D-Viewport (Seite, Front, Top): Profilkurve wie in Illustrator, Kachel, Spiegelachse.
// Griffe und Linien haben bei jedem Zoom dieselbe Größe (gezeichnet in Bildpunkten).

import {
  type Ansicht,
  type GriffSeite,
  type Kubik,
  type Profil,
  type Profile,
  type V2,
  bewegeGriff,
  editierbarerGriff,
  einfuegen,
  gespiegelteSegmente,
  glaetten,
  istAchsKnoten,
  kannLoeschen,
  loeschen,
  loeschenMehrere,
  minus,
  naechsterAufProfil,
  plus,
  segmentAnzahl,
  segmente,
  spiegeln,
  umwandeln,
  verschiebeKnoten,
} from '@ee/shape';
import { useEffect, useRef, useState } from 'react';
import { type Auswahl, gekoppeltBerechnen, setzeGekoppelt } from '../editing/gekoppelt';
import { useEditor } from '../state/editorStore';
import { useUeberlagerung } from '../versuch/ueberlagerung';
import { useUi } from '../state/uiStore';
import { istTrackpad, radFaktor, verschieben, zoomUm, zuBild, zuWelt } from './ansicht2d';

const PUNKT_R = 5; // Ø 10 px (Florian, 11.10.)
const GRIFF = 6; // 6-px-Quadrate
const KONTUR = 3;

type Props = { ansicht: Ansicht; w: number; h: number };

export function View2D({ ansicht, w, h }: Props) {
  const profil = useEditor((s) => s.dok.profile[ansicht]);
  const skal = useEditor((s) => s.dok.skalierung);
  const view = useUi((s) => s.ansichten[ansicht]);
  const gewaehlt = useUi((s) => s.auswahl[ansicht]);
  const [rahmen, setRahmen] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const werkzeug = useUi((s) => s.werkzeug);
  const ueber = useUeberlagerung((s) => s[ansicht]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Rad: nicht-passiv, sonst zoomt die Seite beim Trackpad-Pinch mit
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const ui = useUi.getState();
      const v = ui.ansichten[ansicht];
      // Trackpad: zwei Finger verschieben (wie Illustrator), Pinch und Mausrad zoomen zum Cursor
      if (istTrackpad(e)) ui.setzeAnsicht(ansicht, verschieben(v, r.width, r.height, -e.deltaX, -e.deltaY));
      else ui.setzeAnsicht(ansicht, zoomUm(v, r.width, r.height, { x: e.clientX - r.left, y: e.clientY - r.top }, radFaktor(e)));
    };
    el.addEventListener('wheel', rad, { passive: false });
    return () => el.removeEventListener('wheel', rad);
  }, [ansicht]);

  if (w < 2 || h < 2) return null;

  const bild = (p: V2) => zuBild(view, w, h, { x: p.x * skal, y: p.y * skal });
  const pfad = (segs: readonly Kubik[], zu: boolean) => {
    if (!segs.length) return '';
    const f = (p: V2) => {
      const q = bild(p);
      return `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
    };
    let d = `M${f(segs[0]![0])}`;
    for (const s of segs) d += `C${f(s[1])} ${f(s[2])} ${f(s[3])}`;
    return zu ? `${d}Z` : d;
  };

  // ---------- Kachel und Achse ----------
  const seitlich = ansicht !== 'top';
  const k0 = bild({ x: -0.5 / skal, y: (seitlich ? 1 : 0.5) / skal });
  const k1 = bild({ x: 0.5 / skal, y: (seitlich ? 0 : -0.5) / skal });
  const achse = profil.art === 'halb' ? bild({ x: 0, y: 0 }) : null;
  const verlaufId = `kachel-${ansicht}`;

  // ---------- Eingabe ----------
  const lokal = (clientX: number, clientY: number): V2 => {
    const el = svgRef.current!;
    const r = el.getBoundingClientRect();
    const v = useUi.getState().ansichten[ansicht];
    const s = useEditor.getState().dok.skalierung;
    const p = zuWelt(v, r.width, r.height, { x: clientX - r.left, y: clientY - r.top });
    return { x: p.x / s, y: p.y / s };
  };
  const aktuell = (): Profil => useEditor.getState().dok.profile[ansicht];
  /** Zug übernehmen: die anderen Ansichten folgen, gerechnet vom Stand am Gestenbeginn. */
  const uebernehmen = (neu: Profil, indizes: number[], basis: Profile, auswahlBasis: Auswahl) => {
    const g = gekoppeltBerechnen(ansicht, neu, basis, auswahlBasis);
    useEditor.getState().setzeProfile(g.profile);
    useUi.getState().setzeAuswahl({ ...g.auswahl, [ansicht]: indizes }, ansicht);
  };

  const ziehen = (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    const los = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', bewegen);
      window.removeEventListener('pointerup', los);
      window.removeEventListener('pointercancel', los);
      ende?.(ev);
    };
    window.addEventListener('pointermove', bewegen);
    window.addEventListener('pointerup', los);
    window.addEventListener('pointercancel', los);
  };

  /** Knotenpositionen im SVG (für das Auswahlrechteck). */
  const knotenImRechteck = (r: { x0: number; y0: number; x1: number; y1: number }): number[] => {
    const v = useUi.getState().ansichten[ansicht];
    const s = useEditor.getState().dok.skalierung;
    const xa = Math.min(r.x0, r.x1);
    const xb = Math.max(r.x0, r.x1);
    const ya = Math.min(r.y0, r.y1);
    const yb = Math.max(r.y0, r.y1);
    const drin: number[] = [];
    aktuell().knoten.forEach((k, i) => {
      const q = zuBild(v, w, h, { x: k.p.x * s, y: k.p.y * s });
      if (q.x >= xa && q.x <= xb && q.y >= ya && q.y <= yb) drin.push(i);
    });
    return drin;
  };

  const unten = (e: React.PointerEvent) => {
    const editor = useEditor.getState();
    const ui = useUi.getState();
    if (e.button === 1) {
      e.preventDefault();
      let lx = e.clientX;
      let ly = e.clientY;
      ziehen(e, (ev) => {
        const r = svgRef.current!.getBoundingClientRect();
        const u = useUi.getState();
        u.setzeAnsicht(ansicht, verschieben(u.ansichten[ansicht], r.width, r.height, ev.clientX - lx, ev.clientY - ly));
        lx = ev.clientX;
        ly = ev.clientY;
      });
      return;
    }
    if (e.button !== 0) return;
    const ziel = e.target as Element;
    const griffEl = ziel.closest('[data-griff]');
    const knotenEl = ziel.closest('[data-knoten]');
    const kurveEl = ziel.closest('[data-kurve]');

    // Zeichenstift, + und − (wie Illustrator); ⌘ hält vorübergehend die Direktauswahl
    if (ui.werkzeug !== 'auswahl' && !e.metaKey) {
      const i = knotenEl ? Number(knotenEl.getAttribute('data-knoten')) : -1;
      if (knotenEl && ui.werkzeug === 'stift' && e.altKey) {
        setzeGekoppelt(ansicht, umwandeln(aktuell(), i), [i]);
      } else if (knotenEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'minus')) {
        if (kannLoeschen(aktuell(), i)) setzeGekoppelt(ansicht, loeschen(aktuell(), i), []);
        else ui.zeigeHinweis('Achspunkte bleiben – sie halten die Spiegelung');
      } else if (!knotenEl && kurveEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
        const t = naechsterAufProfil(aktuell(), lokal(e.clientX, e.clientY));
        if (t) {
          const r = einfuegen(aktuell(), t.segment, t.t);
          setzeGekoppelt(ansicht, r.profil, [r.index]);
        }
      }
      return;
    }

    if (griffEl) {
      const [iStr, seite] = griffEl.getAttribute('data-griff')!.split(':') as [string, GriffSeite];
      const index = Number(iStr);
      const kn = aktuell().knoten[index]!;
      const versatz = minus(lokal(e.clientX, e.clientY), plus(kn.p, kn[seite]));
      let brechen = e.altKey;
      const basis = editor.dok.profile;
      const auswahlBasis = ui.auswahl;
      editor.beginGeste();
      ziehen(
        e,
        (ev) => {
          brechen ||= ev.altKey;
          const z = minus(lokal(ev.clientX, ev.clientY), versatz);
          uebernehmen(bewegeGriff(aktuell(), index, seite, z, brechen), auswahlBasis[ansicht], basis, auswahlBasis);
        },
        () => useEditor.getState().endeGeste(),
      );
      return;
    }

    if (knotenEl) {
      // Klick wählt, ⇧-Klick schaltet um; gewählte Punkte ziehen gemeinsam (wie Illustrator)
      const i = Number(knotenEl.getAttribute('data-knoten'));
      const bisher = ui.auswahl[ansicht];
      let sel: number[];
      if (e.shiftKey) sel = bisher.includes(i) ? bisher.filter((x) => x !== i) : [...bisher, i];
      else sel = bisher.includes(i) ? bisher : [i];
      ui.waehle(ansicht, sel);
      if (!sel.includes(i)) return;
      const start = lokal(e.clientX, e.clientY);
      const basis = editor.dok.profile;
      const auswahlBasis = useUi.getState().auswahl;
      editor.beginGeste();
      ziehen(
        e,
        (ev) => {
          const d = minus(lokal(ev.clientX, ev.clientY), start);
          uebernehmen(verschiebeKnoten(basis[ansicht], sel, d), sel, basis, auswahlBasis);
        },
        () => useEditor.getState().endeGeste(),
      );
      return;
    }

    // freie Fläche (oder Kurve): Auswahlrechteck aufziehen; ⇧ schaltet Punkte um, Klick ohne Ziehen hebt auf
    const svg = svgRef.current!.getBoundingClientRect();
    const x0 = e.clientX - svg.left;
    const y0 = e.clientY - svg.top;
    const anfang = ui.auswahl[ansicht];
    const umschalten = e.shiftKey;
    const neueAuswahl = (r: { x0: number; y0: number; x1: number; y1: number }) => {
      const drin = knotenImRechteck(r);
      return umschalten ? [...anfang.filter((x) => !drin.includes(x)), ...drin.filter((x) => !anfang.includes(x))] : drin;
    };
    let gezogen = false;
    ziehen(
      e,
      (ev) => {
        const r = { x0, y0, x1: ev.clientX - svg.left, y1: ev.clientY - svg.top };
        if (!gezogen && Math.abs(r.x1 - x0) + Math.abs(r.y1 - y0) < 3) return;
        gezogen = true;
        setRahmen(r);
        useUi.getState().waehle(ansicht, neueAuswahl(r));
      },
      () => {
        setRahmen(null);
        if (!gezogen && !umschalten) useUi.getState().waehle(ansicht, []);
      },
    );
  };

  const kontext = (e: React.MouseEvent) => {
    e.preventDefault();
    const ui = useUi.getState();
    const ziel = e.target as Element;
    const knotenEl = ziel.closest('[data-knoten]');
    const kurveEl = ziel.closest('[data-kurve]');
    const setze = (p: Profil, indizes: number[]) => setzeGekoppelt(ansicht, p, indizes);
    if (knotenEl) {
      const i = Number(knotenEl.getAttribute('data-knoten'));
      const pr = aktuell();
      const sel = ui.auswahl[ansicht].includes(i) ? ui.auswahl[ansicht] : [i];
      ui.waehle(ansicht, sel);
      const s = i < segmentAnzahl(pr) ? i : i - 1;
      const loeschbar = sel.filter((x) => kannLoeschen(pr, x));
      const ecken = sel.filter((x) => pr.knoten[x]?.art === 'ecke');
      ui.oeffneMenue({
        x: e.clientX,
        y: e.clientY,
        eintraege: [
          {
            label: 'Punkt einfügen',
            aktion: () => {
              const r = einfuegen(aktuell(), s, 0.5);
              setze(r.profil, [r.index]);
            },
          },
          { label: sel.length > 1 ? `${sel.length} Punkte löschen` : 'Punkt löschen', aus: loeschbar.length === 0, aktion: () => setze(loeschenMehrere(aktuell(), sel), []) },
          {
            label: ecken.length > 1 ? `${ecken.length} Punkte glätten` : 'Punkt glätten',
            aus: ecken.length === 0,
            aktion: () => setze(ecken.reduce((p, x) => glaetten(p, x), aktuell()), sel),
          },
        ],
      });
      return;
    }
    if (kurveEl) {
      const p = lokal(e.clientX, e.clientY);
      ui.oeffneMenue({
        x: e.clientX,
        y: e.clientY,
        eintraege: [
          {
            label: 'Punkt hier einfügen',
            aktion: () => {
              const t = naechsterAufProfil(aktuell(), p);
              if (!t) return;
              const r = einfuegen(aktuell(), t.segment, t.t);
              setze(r.profil, [r.index]);
            },
          },
        ],
      });
      return;
    }
    ui.oeffneMenue({ x: e.clientX, y: e.clientY, eintraege: [{ label: 'Ansicht zurücksetzen', aktion: () => useUi.getState().ansichtZuruecksetzen(ansicht) }] });
  };

  // ---------- Griffe der gewählten Punkte ----------
  const griffe: React.ReactNode[] = [];
  for (const gi of gewaehlt) {
    const kn = profil.knoten[gi];
    if (!kn) continue;
    const p = bild(kn.p);
    const erlaubt = editierbarerGriff(profil, gi);
    const zeige = (seite: GriffSeite, editierbar: boolean, rel: V2) => {
      if (Math.hypot(rel.x, rel.y) < 1e-6) return;
      const q = bild(plus(kn.p, rel));
      const farbe = editierbar ? 'var(--punkt)' : '#ffffff';
      griffe.push(
        <g key={`${gi}-${seite}-${editierbar}`} className={editierbar ? 'griff' : 'griff spiegel'} {...(editierbar ? { 'data-griff': `${gi}:${seite}` } : {})}>
          <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={farbe} strokeWidth={1} />
          {editierbar && <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />}
          <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill={farbe} />
        </g>,
      );
    };
    if (profil.art === 'halb' && istAchsKnoten(profil, gi)) {
      const seite = erlaubt === 'ein' ? 'ein' : 'aus';
      zeige(seite, true, kn[seite]);
      zeige(seite === 'ein' ? 'aus' : 'ein', false, spiegeln(kn[seite], profil.achse));
    } else {
      zeige('ein', true, kn.ein);
      zeige('aus', true, kn.aus);
    }
  }

  return (
    <svg ref={svgRef} className={`view2d werkzeug-${werkzeug}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} onPointerDown={unten} onContextMenu={kontext} onAuxClick={(e) => e.preventDefault()}>
      <defs>
        <linearGradient id={verlaufId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <rect className="kachel" x={k0.x} y={k0.y} width={k1.x - k0.x} height={k1.y - k0.y} fill={seitlich ? `url(#${verlaufId})` : 'rgba(0,0,0,0.1)'} />
      {achse && profil.art === 'halb' && (profil.achse === 'senkrecht' ? <line className="achse" x1={achse.x} y1={0} x2={achse.x} y2={h} /> : <line className="achse" x1={0} y1={achse.y} x2={w} y2={achse.y} />)}
      {ueber?.bild && (() => {
        const a = bild({ x: ueber.bild.x0, y: ueber.bild.y0 });
        const b = bild({ x: ueber.bild.x1, y: ueber.bild.y1 });
        return <image href={ueber.bild.url} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} preserveAspectRatio="none" pointerEvents="none" />;
      })()}
      {profil.art === 'halb' && <path d={pfad(gespiegelteSegmente(profil), false)} fill="none" stroke="#ffffff" strokeWidth={KONTUR} strokeLinejoin="round" />}
      <path d={pfad(segmente(profil), profil.art === 'geschlossen')} fill="none" stroke="#000000" strokeWidth={KONTUR} strokeLinejoin="round" strokeLinecap="round" />
      <path data-kurve="" d={pfad(segmente(profil), profil.art === 'geschlossen')} fill="none" stroke="transparent" strokeWidth={14} />
      {griffe}
      {profil.knoten.map((k, i) => {
        const q = bild(k.p);
        return (
          <g key={i} data-knoten={i} className={gewaehlt.includes(i) ? 'knoten gewaehlt' : 'knoten'}>
            <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
            <circle className="knoten-punkt" cx={q.x} cy={q.y} r={PUNKT_R} fill="var(--punkt)" />
          </g>
        );
      })}
      {ueber?.linien?.map((l, i) => (
        <path
          key={`l${i}`}
          d={l.punkte.map((p, k) => { const q = bild(p); return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join('') + (l.zu ? 'Z' : '')}
          fill="none"
          stroke={l.farbe}
          strokeWidth={l.breite}
          strokeDasharray={l.strich}
          strokeLinejoin="round"
          pointerEvents="none"
        />
      ))}
      {ueber && ueber.punkte.length > 0 && (
        <g className="maulpunkte" pointerEvents="none">
          {ueber.punkte.slice(1).map((p, i) => {
            const a = bild(ueber.punkte[i]!);
            const b = bild(p);
            const f = [ueber.punkte[i]!.farbe, p.farbe];
            const farbe = f.includes('rot') ? '#e0306a' : f.includes('blau') ? '#1832e6' : '#19232b';
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={farbe} strokeWidth={2} />;
          })}
          {ueber.punkte.map((p, i) => {
            const q = bild(p);
            const farbe = { tuerkis: '#5ad3c0', schwarz: '#000000', rot: '#e0306a', blau: '#1832e6' }[p.farbe];
            return <circle key={i} cx={q.x} cy={q.y} r={PUNKT_R} fill={farbe} />;
          })}
        </g>
      )}
      {rahmen && (
        <rect
          className="auswahlrahmen"
          x={Math.min(rahmen.x0, rahmen.x1)}
          y={Math.min(rahmen.y0, rahmen.y1)}
          width={Math.abs(rahmen.x1 - rahmen.x0)}
          height={Math.abs(rahmen.y1 - rahmen.y0)}
        />
      )}
    </svg>
  );
}
