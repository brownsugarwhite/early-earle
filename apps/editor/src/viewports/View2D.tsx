// 2D-Viewport (Seite, Front, Top): Profilkurve wie in Illustrator, Kachel, Spiegelachse.
// Griffe und Linien haben bei jedem Zoom dieselbe Größe (gezeichnet in Bildpunkten).

import {
  type Ansicht,
  type GriffSeite,
  type Kubik,
  type Profil,
  type V2,
  MAX_SEGMENT,
  autoTeilen,
  bewegeGriff,
  bewegeKnoten,
  editierbarerGriff,
  einfuegen,
  gespiegelteSegmente,
  glaetten,
  istAchsKnoten,
  kannLoeschen,
  loeschen,
  minus,
  naechsterAufProfil,
  plus,
  segmentAnzahl,
  segmente,
  spiegeln,
} from '@ee/shape';
import { useEffect, useRef } from 'react';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { radFaktor, verschieben, zoomUm, zuBild, zuWelt } from './ansicht2d';

const PUNKT_R = 5; // Ø 10 px (Florian, 11.10.)
const GRIFF = 6; // 6-px-Quadrate
const KONTUR = 3;

type Props = { ansicht: Ansicht; w: number; h: number };

export function View2D({ ansicht, w, h }: Props) {
  const profil = useEditor((s) => s.dok.profile[ansicht]);
  const skal = useEditor((s) => s.dok.skalierung);
  const view = useUi((s) => s.ansichten[ansicht]);
  const auswahl = useUi((s) => s.auswahl);
  const svgRef = useRef<SVGSVGElement>(null);
  const gewaehlt = auswahl?.ansicht === ansicht ? auswahl.index : -1;

  // Rad: nicht-passiv, sonst zoomt die Seite beim Trackpad-Pinch mit
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const ui = useUi.getState();
      ui.setzeAnsicht(ansicht, zoomUm(ui.ansichten[ansicht], r.width, r.height, { x: e.clientX - r.left, y: e.clientY - r.top }, radFaktor(e)));
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

  const ziehen = (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: () => void) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    const los = () => {
      window.removeEventListener('pointermove', bewegen);
      window.removeEventListener('pointerup', los);
      window.removeEventListener('pointercancel', los);
      ende?.();
    };
    window.addEventListener('pointermove', bewegen);
    window.addEventListener('pointerup', los);
    window.addEventListener('pointercancel', los);
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

    if (griffEl) {
      const [iStr, seite] = griffEl.getAttribute('data-griff')!.split(':') as [string, GriffSeite];
      let index = Number(iStr);
      const kn = aktuell().knoten[index]!;
      const versatz = minus(lokal(e.clientX, e.clientY), plus(kn.p, kn[seite]));
      let brechen = e.altKey;
      editor.beginGeste();
      ziehen(
        e,
        (ev) => {
          brechen ||= ev.altKey;
          const z = minus(lokal(ev.clientX, ev.clientY), versatz);
          const r = autoTeilen(bewegeGriff(aktuell(), index, seite, z, brechen), MAX_SEGMENT, index);
          index = r.folge;
          useEditor.getState().setzeProfil(ansicht, r.profil);
          useUi.getState().waehle({ ansicht, index });
        },
        () => useEditor.getState().endeGeste(),
      );
      return;
    }

    if (knotenEl) {
      let index = Number(knotenEl.getAttribute('data-knoten'));
      const kn = aktuell().knoten[index]!;
      const versatz = minus(lokal(e.clientX, e.clientY), kn.p);
      ui.waehle({ ansicht, index });
      editor.beginGeste();
      ziehen(
        e,
        (ev) => {
          const z = minus(lokal(ev.clientX, ev.clientY), versatz);
          const r = autoTeilen(bewegeKnoten(aktuell(), index, z), MAX_SEGMENT, index);
          index = r.folge;
          useEditor.getState().setzeProfil(ansicht, r.profil);
          useUi.getState().waehle({ ansicht, index });
        },
        () => useEditor.getState().endeGeste(),
      );
      return;
    }

    ui.waehle(null);
  };

  const kontext = (e: React.MouseEvent) => {
    e.preventDefault();
    const ui = useUi.getState();
    const editor = useEditor.getState();
    const ziel = e.target as Element;
    const knotenEl = ziel.closest('[data-knoten]');
    const kurveEl = ziel.closest('[data-kurve]');
    const setze = (p: Profil, index: number | null) => {
      editor.setzeProfil(ansicht, p);
      ui.waehle(index === null ? null : { ansicht, index });
    };
    if (knotenEl) {
      const i = Number(knotenEl.getAttribute('data-knoten'));
      const pr = aktuell();
      ui.waehle({ ansicht, index: i });
      const s = i < segmentAnzahl(pr) ? i : i - 1;
      ui.oeffneMenue({
        x: e.clientX,
        y: e.clientY,
        eintraege: [
          {
            label: 'Punkt einfügen',
            aktion: () => {
              const r = einfuegen(aktuell(), s, 0.5);
              setze(r.profil, r.index);
            },
          },
          { label: 'Punkt löschen', aus: !kannLoeschen(pr, i), aktion: () => setze(loeschen(aktuell(), i), null) },
          { label: 'Punkt glätten', aus: pr.knoten[i]!.art !== 'ecke', aktion: () => setze(glaetten(aktuell(), i), i) },
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
              setze(r.profil, r.index);
            },
          },
        ],
      });
      return;
    }
    ui.oeffneMenue({ x: e.clientX, y: e.clientY, eintraege: [{ label: 'Ansicht zurücksetzen', aktion: () => useUi.getState().ansichtZuruecksetzen(ansicht) }] });
  };

  // ---------- Griffe des gewählten Punkts ----------
  const griffe: React.ReactNode[] = [];
  const kn = gewaehlt >= 0 ? profil.knoten[gewaehlt] : undefined;
  if (kn) {
    const p = bild(kn.p);
    const erlaubt = editierbarerGriff(profil, gewaehlt);
    const zeige = (seite: GriffSeite, editierbar: boolean, rel: V2) => {
      if (Math.hypot(rel.x, rel.y) < 1e-6) return;
      const q = bild(plus(kn.p, rel));
      const farbe = editierbar ? 'var(--punkt)' : '#ffffff';
      griffe.push(
        <g key={`${seite}-${editierbar}`} className={editierbar ? 'griff' : 'griff spiegel'} {...(editierbar ? { 'data-griff': `${gewaehlt}:${seite}` } : {})}>
          <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={farbe} strokeWidth={1} />
          {editierbar && <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />}
          <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill={farbe} />
        </g>,
      );
    };
    if (profil.art === 'halb' && istAchsKnoten(profil, gewaehlt)) {
      const seite = erlaubt === 'ein' ? 'ein' : 'aus';
      zeige(seite, true, kn[seite]);
      zeige(seite === 'ein' ? 'aus' : 'ein', false, spiegeln(kn[seite], profil.achse));
    } else {
      zeige('ein', true, kn.ein);
      zeige('aus', true, kn.aus);
    }
  }

  return (
    <svg ref={svgRef} className="view2d" width={w} height={h} viewBox={`0 0 ${w} ${h}`} onPointerDown={unten} onContextMenu={kontext} onAuxClick={(e) => e.preventDefault()}>
      <defs>
        <linearGradient id={verlaufId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <rect className="kachel" x={k0.x} y={k0.y} width={k1.x - k0.x} height={k1.y - k0.y} fill={seitlich ? `url(#${verlaufId})` : 'rgba(0,0,0,0.1)'} />
      {achse && profil.art === 'halb' && (profil.achse === 'senkrecht' ? <line className="achse" x1={achse.x} y1={0} x2={achse.x} y2={h} /> : <line className="achse" x1={0} y1={achse.y} x2={w} y2={achse.y} />)}
      {profil.art === 'halb' && <path d={pfad(gespiegelteSegmente(profil), false)} fill="none" stroke="#ffffff" strokeWidth={KONTUR} strokeLinejoin="round" />}
      <path d={pfad(segmente(profil), profil.art === 'geschlossen')} fill="none" stroke="#000000" strokeWidth={KONTUR} strokeLinejoin="round" strokeLinecap="round" />
      <path data-kurve="" d={pfad(segmente(profil), profil.art === 'geschlossen')} fill="none" stroke="transparent" strokeWidth={14} />
      {griffe}
      {profil.knoten.map((k, i) => {
        const q = bild(k.p);
        return (
          <g key={i} data-knoten={i} className={i === gewaehlt ? 'knoten gewaehlt' : 'knoten'}>
            <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
            <circle className="knoten-punkt" cx={q.x} cy={q.y} r={PUNKT_R} fill="var(--punkt)" />
          </g>
        );
      })}
    </svg>
  );
}
