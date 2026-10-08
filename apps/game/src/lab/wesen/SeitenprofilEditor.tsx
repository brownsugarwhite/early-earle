import { useId, useRef } from 'react';
import type { Bauplan } from '@ee/creature';
import { useWesenStore } from './wesenStore';
import { leseWert } from './regler';

/**
 * Seitenprofil-Editor (Tab Körper): die Silhouette des Rumpfs von der Seite als zwei Bézier-Kurven (vorn, hinten) über
 * der Höhe, mit ziehbaren Kontrollpunkten — Florian zeichnet die Earle-Kurve selbst gegen sein Referenzbild (Ansicht
 * „Seite“ + Overlay), statt Regler zu drehen. Kontrollwerte sind Anteile der Rumpfhöhe; die Kreiskappe (`scheitel`)
 * schließt den Kopf rund. Ohne Profil gelten Bauch/Buckel/Querschnitte.
 */
type Profil = NonNullable<Bauplan['koerper']['seitenprofil']>;

const K = 8;
const W = 300, H = 260, AXIS = 150, SCALE = 95, TOP = 18, BOTTOM = 242;
const STANDARD: Profil = { vorn: [0.46, 0.5, 0.5, 0.47, 0.44, 0.4, 0.36, 0.3], hinten: [0.46, 0.5, 0.5, 0.47, 0.44, 0.4, 0.36, 0.3], scheitel: 0.75 };

function bezier(c: readonly number[], t: number): number {
  const a = c.slice();
  for (let k = a.length - 1; k > 0; k--) for (let i = 0; i < k; i++) a[i] = a[i]! + (a[i + 1]! - a[i]!) * t;
  return a[0]!;
}
const kappe = (t: number, c0: number): number => (t <= c0 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((t - c0) / (1 - c0), 2))));
const yOf = (t: number): number => BOTTOM - t * (BOTTOM - TOP);
const st = () => useWesenStore.getState();

function setzeProfil(p: Profil | undefined, opKey = 'seitenprofil'): void {
  st().setzeBauplanWert('koerper.seitenprofil', p, opKey);
}

export function SeitenprofilEditor() {
  const profil = useWesenStore((s) => leseWert(s.bauplan, 'koerper.seitenprofil') as Profil | undefined);
  const svg = useRef<SVGSVGElement>(null);
  const svgVorn = useRef<SVGSVGElement>(null);
  const id = useId();
  if (!profil) {
    return (
      <section className="wl-gruppe wl-sp" data-testid="wl-seitenprofil">
        <h3 className="wl-gruppe-titel">Seitenprofil (Silhouette)</h3>
        <button type="button" className="wl-btn" onClick={() => setzeProfil(STANDARD, 'seitenprofil-anlegen')} data-testid="wl-sp-anlegen">
          Silhouette zeichnen
        </button>
        <small className="wl-hinweis">Zwei Kurven (vorn, hinten) über der Höhe mit ziehbaren Punkten — am besten in der Ansicht „Seite“ mit dem Referenzbild darüber. Ersetzt Bauch, Buckel und Querschnitte.</small>
      </section>
    );
  }
  const vorn = profil.vorn.length === K ? profil.vorn : Array.from({ length: K }, (_, i) => bezier(profil.vorn, i / (K - 1)));
  const hinten = profil.hinten.length === K ? profil.hinten : Array.from({ length: K }, (_, i) => bezier(profil.hinten, i / (K - 1)));
  // Vorderansicht: eigene Breitenkurve oder das Mittel aus vorn und hinten (Standard)
  const breiteEigen = profil.breite && profil.breite.length === K ? profil.breite : null;
  const breite = breiteEigen ?? Array.from({ length: K }, (_, i) => 0.5 * (vorn[i]! + hinten[i]!));
  const c0 = profil.scheitel ?? 0.75;
  // Umriss: vorn rechts, hinten links, Kappe oben
  const n = 48;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(`${(AXIS + bezier(vorn, t) * SCALE * kappe(t, c0)).toFixed(1)},${yOf(t).toFixed(1)}`);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    pts.push(`${(AXIS - bezier(hinten, t) * SCALE * kappe(t, c0)).toFixed(1)},${yOf(t).toFixed(1)}`);
  }
  const vornPts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    vornPts.push(`${(AXIS + bezier(breite, t) * SCALE * kappe(t, c0)).toFixed(1)},${yOf(t).toFixed(1)}`);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    vornPts.push(`${(AXIS - bezier(breite, t) * SCALE * kappe(t, c0)).toFixed(1)},${yOf(t).toFixed(1)}`);
  }
  const drag = (seite: 'vorn' | 'hinten' | 'breite', i: number, elRef: React.RefObject<SVGSVGElement | null> = svg) => (e: React.PointerEvent<SVGCircleElement>) => {
    e.preventDefault();
    const el = elRef.current;
    if (!el) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    st().beginGeste();
    const move = (ev: PointerEvent) => {
      const m = el.getScreenCTM();
      if (!m) return;
      const x = (ev.clientX - m.e) / m.a;
      // Vorderansicht ist symmetrisch: Abstand zur Achse, egal auf welcher Seite gezogen wird
      const v = seite === 'vorn' ? (x - AXIS) / SCALE : seite === 'hinten' ? (AXIS - x) / SCALE : Math.abs(x - AXIS) / SCALE;
      const cur = (leseWert(st().bauplan, 'koerper.seitenprofil') as Profil | undefined) ?? profil;
      const basis = seite === 'breite' ? (cur.breite && cur.breite.length === K ? cur.breite : breite) : cur[seite].length === K ? cur[seite] : seite === 'vorn' ? vorn : hinten;
      const arr = basis.slice();
      arr[i] = Math.min(2, Math.max(0.02, Math.round(v * 1000) / 1000));
      setzeProfil({ ...cur, [seite]: arr });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      st().endeGeste();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  return (
    <section className="wl-gruppe wl-sp" data-testid="wl-seitenprofil">
      <h3 className="wl-gruppe-titel">Seitenprofil (Silhouette)</h3>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="wl-sp-svg" role="img" aria-label="Seitenprofil: vorn rechts, hinten links, unten Standfläche">
        <line x1={AXIS} y1={TOP - 6} x2={AXIS} y2={BOTTOM + 6} className="wl-sp-achse" />
        <line x1={20} y1={BOTTOM} x2={W - 20} y2={BOTTOM} className="wl-sp-boden" />
        <line x1={20} y1={yOf(c0)} x2={W - 20} y2={yOf(c0)} className="wl-sp-scheitel" />
        <polygon points={pts.join(' ')} className="wl-sp-koerper" />
        <polyline points={vorn.map((v, i) => `${AXIS + v * SCALE},${yOf(i / (K - 1))}`).join(' ')} className="wl-sp-polygon" />
        <polyline points={hinten.map((v, i) => `${AXIS - v * SCALE},${yOf(i / (K - 1))}`).join(' ')} className="wl-sp-polygon" />
        {vorn.map((v, i) => (
          <circle key={`v${i}`} cx={AXIS + v * SCALE} cy={yOf(i / (K - 1))} r={7} className="wl-sp-punkt" onPointerDown={drag('vorn', i)} data-testid={`wl-sp-vorn-${i}`} />
        ))}
        {hinten.map((v, i) => (
          <circle key={`h${i}`} cx={AXIS - v * SCALE} cy={yOf(i / (K - 1))} r={7} className="wl-sp-punkt" onPointerDown={drag('hinten', i)} data-testid={`wl-sp-hinten-${i}`} />
        ))}
        <text x={W - 22} y={BOTTOM - 6} className="wl-sp-text" textAnchor="end">vorn</text>
        <text x={22} y={BOTTOM - 6} className="wl-sp-text">hinten</text>
      </svg>
      <h3 className="wl-gruppe-titel">Vorderansicht (Breite)</h3>
      <svg ref={svgVorn} viewBox={`0 0 ${W} ${H}`} className="wl-sp-svg" role="img" aria-label="Vorderansicht: Breite über der Höhe, symmetrisch">
        <line x1={AXIS} y1={TOP - 6} x2={AXIS} y2={BOTTOM + 6} className="wl-sp-achse" />
        <line x1={20} y1={BOTTOM} x2={W - 20} y2={BOTTOM} className="wl-sp-boden" />
        <line x1={20} y1={yOf(c0)} x2={W - 20} y2={yOf(c0)} className="wl-sp-scheitel" />
        <polygon points={vornPts.join(' ')} className="wl-sp-koerper" data-eigen={!!breiteEigen} />
        <polyline points={breite.map((v, i) => `${AXIS + v * SCALE},${yOf(i / (K - 1))}`).join(' ')} className="wl-sp-polygon" />
        {breite.map((v, i) => (
          <circle key={`b${i}`} cx={AXIS + v * SCALE} cy={yOf(i / (K - 1))} r={7} className="wl-sp-punkt" onPointerDown={drag('breite', i, svgVorn)} data-testid={`wl-sp-breite-${i}`} />
        ))}
        <text x={W - 22} y={BOTTOM - 6} className="wl-sp-text" textAnchor="end">{breiteEigen ? 'eigene Breite' : 'Mittel aus vorn/hinten'}</text>
      </svg>
      <div className="wl-regler">
        <label className="wl-regler-kopf" htmlFor={id}>
          <span className="wl-label">Scheitel (runder Kopf)</span>
          <output className="wl-wert" htmlFor={id}>{c0.toFixed(2)}</output>
        </label>
        <div className="wl-regler-zeile">
          <input id={id} type="range" min={0.5} max={0.98} step={0.01} value={c0} onPointerDown={() => st().beginGeste()} onPointerUp={() => st().endeGeste()} onChange={(e) => setzeProfil({ ...profil, scheitel: Number(e.target.value) }, 'scheitel')} />
        </div>
      </div>
      <div className="wl-sp-knoepfe">
        <button type="button" className="wl-btn" onClick={() => setzeProfil({ ...profil, hinten: (profil.vorn.length === K ? profil.vorn : vorn).slice() }, 'seitenprofil-spiegeln')} title="Hinten wie vorn">
          Spiegeln
        </button>
        <button type="button" className="wl-btn" disabled={!breiteEigen} onClick={() => { const { breite: _b, ...rest } = profil; void _b; setzeProfil(rest as Profil, 'breite-mittel'); }} title="Breite wieder aus vorn und hinten mitteln">
          Breite = Mittel
        </button>
        <button type="button" className="wl-btn" onClick={() => setzeProfil(undefined, 'seitenprofil-entfernen')} data-testid="wl-sp-entfernen" title="Zurück zu Bauch, Buckel und Querschnitten">
          Profil entfernen
        </button>
      </div>
      <small className="wl-hinweis">Punkte waagerecht ziehen (Anteile der Rumpfhöhe). Vorderansicht: erst ein Zug macht die Breite eigenständig, sonst folgt sie dem Mittel aus vorn und hinten (mal „Breite“).</small>
    </section>
  );
}
