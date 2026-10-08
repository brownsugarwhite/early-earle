import { useRef } from 'react';
import { bezierWert, linieAusReglern } from '@ee/creature';
import { useWesenStore } from './wesenStore';

/**
 * Maul-Editor (Tab Maul): zwei Schemazeichnungen mit Griffen statt Regler — **Seite** (Kopf als Oval, Maullinie von der
 * Schnauze zum Mundwinkel: Griff vorn = Maulhöhe, Griff am Winkel = Winkel nach hinten und Neigung, Griff dazwischen =
 * Schwung) und **Vorn** (Maullinie von Winkel zu Winkel: Griff an der Spitze = ω-Höhe/W-Form, Griffe an den Winkeln =
 * Breite, Griff in der Mitte = Öffnungsweite). Die Griffe setzen dieselben Bauplan-Werte wie die Regler darunter.
 */
const W = 300, H = 220;
const st = () => useWesenStore.getState();
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

function nutzeZug(key: string, aufWert: (dx: number, dy: number, start: { x: number; y: number }) => Array<[string, unknown]>) {
  return (e: React.PointerEvent<SVGCircleElement>, svg: SVGSVGElement | null, start: { x: number; y: number }) => {
    e.preventDefault();
    if (!svg) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    st().beginGeste();
    const move = (ev: PointerEvent) => {
      const m = svg.getScreenCTM();
      if (!m) return;
      const x = (ev.clientX - m.e) / m.a, y = (ev.clientY - m.f) / m.d;
      // Zahlen gerundet, Listen (gezeichnete Linie) unverändert — `Math.round` auf ein Array ergab NaN, der Zug verpuffte
      for (const [k, v] of aufWert(x - start.x, y - start.y, start)) st().setzeBauplanWert(k, typeof v === 'number' ? Math.round(v * 1000) / 1000 : Array.isArray(v) ? v.map((x) => Math.round(Number(x) * 1000) / 1000) : v, key);
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
}

export function MaulEditor() {
  const m = useWesenStore((s) => s.bauplan.maul);
  const seite = useRef<SVGSVGElement>(null);
  const vorn = useRef<SVGSVGElement>(null);
  if (!m.sichtbar) return null;
  // --- Seite: Kopf als Oval (Schnauze rechts), Maullinie aus Höhe, Neigung, Schwung, Winkel ---
  const cx = 150, cy = 110, rx = 120, ry = 85;
  const hoehe = clamp(m.hoehe, 0, 1);
  const yLip = cy + ry - hoehe * 2 * ry; // 0 unten … 1 oben
  const xFront = cx + rx * Math.sqrt(Math.max(0, 1 - Math.pow((yLip - cy) / ry, 2)));
  const winkel = clamp(m.winkel, 0, 1);
  const xCorner = cx + rx * (0.55 - 1.05 * winkel); // 0: vorn, 1: weit hinten
  const yCorner = yLip - m.neigung * 0.22 * 2 * ry;
  const schwung = clamp(m.schwung, -1, 1);
  // Gezeichnete Linie: Bézier-Kontrollwerte (Kopfhöhen über der Grundlinie); ohne Linie die Regler-Form (Neigung, Schwung)
  const linieAn = !!m.linie && m.linie.length >= 2;
  const nP = 5;
  const ctrl: number[] = linieAn ? m.linie!.slice() : Array.from({ length: nP }, (_v, i) => linieAusReglern(m, i / (nP - 1)));
  const hoeheBei = (u: number): number => (linieAn ? bezierWert(ctrl, u) : linieAusReglern(m, u));
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const x = xFront + (xCorner - xFront) * u;
    const y = yLip - hoeheBei(u) * 2 * ry;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  // Punkte der gezeichneten Linie: senkrecht ziehen; der erste Zug übernimmt die Regler-Form als Startwerte
  const zugPunkt = (i: number) =>
    nutzeZug('maul.linie', (_dx, dy, s0) => {
      const neu = ctrl.slice();
      neu[i] = clamp((yLip - (s0.y + dy)) / (2 * ry), -0.8, 0.8);
      return [['maul.linie', neu]];
    });
  const uMid = 0.36;
  const xMid = xFront + (xCorner - xFront) * uMid;
  const yMid = yLip + (yCorner - yLip) * uMid * uMid + schwung * 0.12 * 2 * ry * Math.pow(Math.sin(Math.PI * uMid / 0.72), 1.5);
  const zugHoehe = nutzeZug('maul.hoehe', (_dx, dy, s0) => [['maul.hoehe', clamp((cy + ry - (s0.y + dy)) / (2 * ry), 0, 1)]]);
  const zugWinkel = nutzeZug('maul.winkel', (dx, dy, s0) => {
    const werte: Array<[string, unknown]> = [['maul.winkel', clamp((0.55 - (s0.x + dx - cx) / rx) / 1.05, 0, 1)]];
    if (linieAn) {
      const neu = ctrl.slice();
      neu[neu.length - 1] = clamp((yLip - (s0.y + dy)) / (2 * ry), -0.8, 0.8);
      werte.push(['maul.linie', neu]);
    } else werte.push(['maul.neigung', clamp(-(s0.y + dy - yLip) / (0.22 * 2 * ry), -1, 1)]);
    return werte;
  });
  const zugSchwung = nutzeZug('maul.schwung', (_dx, dy, s0) => [['maul.schwung', clamp(schwung + dy / (0.12 * 2 * ry * 0.9), -1, 1) - 0 * s0.y]]);
  // --- Vorn: Maullinie von Winkel zu Winkel, ω-Spitze, Öffnung ---
  const breite = clamp(m.breite, 0.2, 1);
  const halb = 40 + 95 * breite;
  const yL = 120;
  const wF = clamp(m.wForm, 0, 1) * clamp(m.form, 0, 1);
  const linie: string[] = [];
  for (let i = -24; i <= 24; i++) {
    const u = Math.abs(i) / 24;
    const x = cx + (i / 24) * halb;
    const w = wF * 60 * (0.15 * Math.exp(-Math.pow(u / 0.08, 2)) - 0.1 * Math.exp(-Math.pow((u - 0.24) / 0.14, 2)) + 0.05 * (u > 0.45 ? Math.min(1, (u - 0.45) / 0.55) : 0));
    const rise = m.neigung * 0.22 * 60 * u * u;
    linie.push(`${x.toFixed(1)},${(yL - w - rise).toFixed(1)}`);
  }
  const oeff = clamp(m.oeffnung, 0, 1);
  const yOeff = yL + 10 + oeff * 70;
  const zugSpitze = nutzeZug('maul.wForm', (_dx, dy, s0) => [['maul.wForm', clamp((yL - (s0.y + dy)) / (60 * 0.15), 0, 1)]]);
  const zugBreite = nutzeZug('maul.breite', (dx, _dy, s0) => [['maul.breite', clamp((Math.abs(s0.x + dx - cx) - 40) / 95, 0.2, 1)]]);
  const zugOeffnung = nutzeZug('maul.oeffnung', (_dx, dy, s0) => [['maul.oeffnung', clamp((s0.y + dy - yL - 10) / 70, 0, 1)]]);
  const griff = (key: string, x: number, y: number, svg: React.RefObject<SVGSVGElement | null>, zug: ReturnType<typeof nutzeZug>, titel: string, r = 8) => (
    <circle key={key} cx={x} cy={y} r={r} className="wl-sp-punkt" onPointerDown={(e) => zug(e, svg.current, { x, y })} data-testid={`wl-maul-${key}`}>
      <title>{titel}</title>
    </circle>
  );
  return (
    <section className="wl-gruppe wl-sp" data-testid="wl-maul-editor">
      <h3 className="wl-gruppe-titel">Maul zeichnen · Seite</h3>
      <svg ref={seite} viewBox={`0 0 ${W} ${H}`} className="wl-sp-svg" role="img" aria-label="Maul von der Seite: Höhe, Winkel, Neigung, Schwung">
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} className="wl-sp-koerper" />
        <polyline points={pts.join(' ')} className="wl-maul-linie" />
        {griff('hoehe', xFront, yLip, seite, zugHoehe, 'Maulhöhe (senkrecht ziehen)')}
        {griff('winkel', xCorner, yCorner, seite, zugWinkel, 'Mundwinkel: waagerecht = nach hinten, senkrecht = Neigung')}
        {!linieAn && griff('schwung', xMid, yMid, seite, zugSchwung, 'Schwung der Linie (senkrecht ziehen)')}
        {ctrl.map((c, i) => (i === 0 || i === ctrl.length - 1 ? null : griff(`linie-${i}`, xFront + (xCorner - xFront) * (i / (ctrl.length - 1)), yLip - c * 2 * ry, seite, zugPunkt(i), `Linienpunkt ${i} (senkrecht ziehen): Form der Maullinie`, 5)))}
        <text x={cx + rx - 4} y={cy - ry + 14} className="wl-sp-text" textAnchor="end">Schnauze →</text>
      </svg>
      {linieAn && (
        <button type="button" className="wl-btn wl-btn--klein" onClick={() => st().setzeBauplanWert('maul.linie', undefined as unknown as number, 'maul.linie')} data-testid="wl-maul-linie-weg">
          Linie zurück auf Regler
        </button>
      )}
      <h3 className="wl-gruppe-titel">Maul zeichnen · Vorn</h3>
      <svg ref={vorn} viewBox={`0 0 ${W} ${H}`} className="wl-sp-svg" role="img" aria-label="Maul von vorn: Breite, W-Form, Öffnung">
        <polyline points={linie.join(' ')} className="wl-maul-linie" />
        <polyline points={`${cx - halb},${yL + 2} ${cx - halb * 0.5},${yOeff} ${cx},${yOeff + 4} ${cx + halb * 0.5},${yOeff} ${cx + halb},${yL + 2}`} className="wl-maul-unten" />
        {griff('wform', cx, yL - wF * 60 * 0.15, vorn, zugSpitze, 'W-Form der Oberlippe (senkrecht ziehen)')}
        {griff('breite-l', cx - halb, yL, vorn, zugBreite, 'Maulbreite')}
        {griff('breite-r', cx + halb, yL, vorn, zugBreite, 'Maulbreite')}
        {griff('oeffnung', cx, yOeff + 4, vorn, zugOeffnung, 'Öffnungsweite (senkrecht ziehen)')}
      </svg>
      <small className="wl-hinweis">Griffe ziehen; die Regler darunter zeigen dieselben Werte. Nase und Kieferbreite bleiben Regler.</small>
    </section>
  );
}
