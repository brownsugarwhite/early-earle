// Stufe „Posen & Leben“, Abschnitt Rig (Plan 5.2, 14.10. spätnachts): Kiefergelenk, Kieferlinie und Übergang als Griffe
// in der Seite (Plan 9: Griffe statt Regler).
// - Gelenk (pinker Punkt): Drehpunkt des Unterkiefers; Automatik = Mundwinkel (hohler Kreis).
// - Kieferlinie (äußerer Kreis, Griff auf dem mittleren Strahl): so weit reicht der Unterkiefer; Hals und Kehle bleiben.
//   Der gestrichelte innere Kreis ist der Beginn des Auslaufs.
// - Übergang (zwei Strahlen, Griffe auf dem inneren Kreis): bis zum ersten Strahl dreht die Haut voll mit, ab dem zweiten
//   nicht mehr (0° zur Schnauze, 90° nach unten).
// - Schädelgelenk (dunkler Punkt an der Basis des Schädelknochens): Drehpunkt des Schädels.
// Alles wirkt ohne Umbau des Käfigs (Pose-Optionen), die Bühne folgt beim Ziehen.
import type { Ansicht, V2 } from '@ee/shape';
import { useNetzStand } from '../kern/netzStand';
import type { Ebene2DKontext } from '../maul/MaulEbene';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { type KieferGriff, type Rig, aktuellesRig, amGelenk, griffZug, istKnochenGriff, knochenBei } from './knochen';
import { setzeMaulOptionen } from './kieferOptionen';

const FARBE = '#ff2e9a';

/** Knochen wie in Blender: Raute von der Basis zur Spitze (breiteste Stelle bei 15 %). */
function rautenPfad(a: V2, b: V2): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const w = Math.min(14, 0.1 * l);
  const m = { x: a.x + 0.15 * dx, y: a.y + 0.15 * dy };
  const n = { x: (-dy / l) * w, y: (dx / l) * w };
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${(m.x + n.x).toFixed(1)} ${(m.y + n.y).toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}L${(m.x - n.x).toFixed(1)} ${(m.y - n.y).toFixed(1)}Z`;
}

/** Strecke vom Gelenk G zum Bildpunkt q auf das Blatt kürzen (Rand 14 px); `ab` = gekürzt. */
function imBlatt(G: V2, q: V2, w: number, h: number): { p: V2; ab: boolean } {
  const r = 14;
  let t = 1;
  const dx = q.x - G.x;
  const dy = q.y - G.y;
  if (q.x < r && dx < 0) t = Math.min(t, (r - G.x) / dx);
  if (q.x > w - r && dx > 0) t = Math.min(t, (w - r - G.x) / dx);
  if (q.y < r && dy < 0) t = Math.min(t, (r - G.y) / dy);
  if (q.y > h - r && dy > 0) t = Math.min(t, (h - r - G.y) / dy);
  t = Math.max(0, t);
  return { p: { x: G.x + dx * t, y: G.y + dy * t }, ab: t < 1 };
}

export function KieferZeichnung({ ansicht, bild, w, h }: { ansicht: Ansicht; bild: (p: V2) => V2; w: number; h: number }) {
  useNetzStand((s) => s.version);
  const oeffnung = useUi((s) => s.oeffnung);
  const skal = useEditor((s) => s.dok.skalierung);
  const m = ansicht === 'seite' ? aktuellesRig() : null;
  if (!m) return null;
  // Netz-Koordinaten sind Welt (wie der Saum), `bild` erwartet Profil-Einheiten
  const B = (p: V2) => bild({ x: p.x / skal, y: p.y / skal });
  const { rig, laenge: L } = m;
  const G = B(rig.gelenk);
  const W = B(rig.mundwinkel);
  const pix = (r: number) => {
    const q = B({ x: rig.gelenk.x + r, y: rig.gelenk.y });
    return Math.hypot(q.x - G.x, q.y - G.y);
  };
  const r1 = rig.kieferReichweite[0] * L;
  const r2 = rig.kieferReichweite[1] * L;
  const [a1, a2] = rig.kieferWinkel;
  // Übergangsfächer zwischen den Strahlen (bis zur Kieferlinie)
  const faecher = (() => {
    if (!rig.winkel) return '';
    const n = 24;
    let d = `M${G.x.toFixed(1)} ${G.y.toFixed(1)}`;
    for (let i = 0; i <= n; i++) {
      const q = B(amGelenk(m, r2, a1 + ((a2 - a1) * i) / n));
      d += `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }
    return `${d}Z`;
  })();
  // Griffe außerhalb des Blatts rücken auf ihrem Strahl an den Rand (Raute = die Linie geht weiter); Ziehen setzt weiter
  // den Abstand bzw. Winkel zum Gelenk
  const griff = (p: V2, art: string, titel: string) => {
    const { p: q, ab } = imBlatt(G, B(p), w, h);
    return (
      <rect key={art} data-kiefergriff={art} data-am-rand={ab ? '' : undefined} x={q.x - 5} y={q.y - 5} width={10} height={10} fill="#fff" stroke={FARBE} strokeWidth={2} transform={ab ? `rotate(45 ${q.x} ${q.y})` : undefined} style={{ cursor: 'grab' }}>
        <title>{titel}</title>
      </rect>
    );
  };
  return (
    <g className="kiefer-ebene" data-kiefer-ebene="">
      {faecher && <path d={faecher} fill={FARBE} fillOpacity={0.08} stroke="none" pointerEvents="none" />}
      {rig.winkel && (
        <>
          <circle cx={G.x} cy={G.y} r={pix(r2)} fill="none" stroke={FARBE} strokeOpacity={0.75} strokeWidth={1.5} pointerEvents="none" data-kieferlinie="" />
          <circle cx={G.x} cy={G.y} r={pix(r1)} fill="none" stroke={FARBE} strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="4 4" pointerEvents="none" />
          {[a1, a2].map((a) => {
            const q = B(amGelenk(m, r2, a));
            return <line key={a} x1={G.x} y1={G.y} x2={q.x} y2={q.y} stroke={FARBE} strokeOpacity={0.75} strokeWidth={1.5} pointerEvents="none" />;
          })}
        </>
      )}
      {Math.hypot(G.x - W.x, G.y - W.y) > 2 && <line x1={W.x} y1={W.y} x2={G.x} y2={G.y} stroke="#19232b" strokeOpacity={0.5} strokeDasharray="3 3" pointerEvents="none" />}
      <circle cx={W.x} cy={W.y} r={5} fill="none" stroke="#19232b" strokeOpacity={0.6} strokeWidth={1.5} pointerEvents="none" data-mundwinkel="" />
      {/* Kieferlinie auf dem mittleren Strahl: auf dem ersten lag sie bei großer Reichweite mit „voll bis“ am selben Randpunkt */}
      {rig.winkel && griff(amGelenk(m, r2, 0.5 * (a1 + a2)), 'weite', 'Kieferlinie: so weit reicht der Unterkiefer')}
      {rig.winkel && griff(amGelenk(m, r1, a1), 'w1', `voll bis ${Math.round(a1)}°`)}
      {rig.winkel && griff(amGelenk(m, r1, a2), 'w2', `frei ab ${Math.round(a2)}°`)}
      {/* Knochen der Fressen-Pose (Plan 5.2; Florian: „Bones selbst bewegen und rotieren“): Spitze drehen, Mitte ziehen */}
      {(() => {
        const kn = knochenBei(m, oeffnung);
        const kb = B(kn.kieferBasis);
        const ks = B(kn.kieferSpitze);
        const sb = B(kn.schaedelBasis);
        const ss = B(kn.schaedelSpitze);
        const km = { x: kb.x + 0.5 * (ks.x - kb.x), y: kb.y + 0.5 * (ks.y - kb.y) };
        return (
          <g data-knochen="">
            <path d={rautenPfad(sb, ss)} fill="#ffffff" fillOpacity={0.55} stroke="#19232b" strokeWidth={1.5} pointerEvents="none" />
            <path d={rautenPfad(kb, ks)} fill="#ffffff" fillOpacity={0.75} stroke="#19232b" strokeWidth={1.5} pointerEvents="none" />
            <circle data-kiefergriff="schaedel-dreh" cx={ss.x} cy={ss.y} r={6} fill="#fff" stroke="#19232b" strokeWidth={2} style={{ cursor: 'grab' }}>
              <title>Schädel drehen (Fressen-Pose)</title>
            </circle>
            {/* Schädelgelenk (Plan 5.2): Drehpunkt des Schädels als Griff; die Automatik liegt hinter dem Mundwinkel */}
            <circle data-kiefergriff="schaedel-gelenk" cx={sb.x} cy={sb.y} r={6} fill="#19232b" stroke="#fff" strokeWidth={2} style={{ cursor: 'move' }}>
              <title>Schädelgelenk (Rig)</title>
            </circle>
            {m.knochen.kippen && (
              <circle data-kiefergriff="kiefer-dreh" cx={ks.x} cy={ks.y} r={7} fill="#fff" stroke="#19232b" strokeWidth={2} style={{ cursor: 'grab' }}>
                <title>Unterkiefer drehen (Fressen-Pose)</title>
              </circle>
            )}
            {m.knochen.kippen && (
              <rect data-kiefergriff="kiefer-zug" x={km.x - 5} y={km.y - 5} width={10} height={10} fill="#19232b" stroke="#fff" strokeWidth={1.5} style={{ cursor: 'move' }}>
                <title>Unterkiefer verschieben (Fressen-Pose)</title>
              </rect>
            )}
          </g>
        );
      })()}
      <circle data-kiefergriff="gelenk" cx={G.x} cy={G.y} r={7} fill={FARBE} stroke="#fff" strokeWidth={2} style={{ cursor: 'move' }}>
        <title>Kiefergelenk (Rig)</title>
      </circle>
    </g>
  );
}

/** Griffe des Kiefergelenks und der Knochen in der Seite ziehen; true, wenn ein Griff getroffen wurde. Ein Undo-Schritt je Zug. */
export function kieferZeiger(e: React.PointerEvent, ctx: Ebene2DKontext): boolean {
  if (ctx.ansicht !== 'seite') return false;
  const el = (e.target as Element).closest('[data-kiefergriff]');
  const m: Rig | null = aktuellesRig();
  if (!el || !m) return false;
  const art = el.getAttribute('data-kiefergriff') as KieferGriff;
  e.preventDefault();
  e.stopPropagation();
  const skal = useEditor.getState().dok.skalierung;
  const welt = (ev: { clientX: number; clientY: number }): V2 => {
    const q = ctx.lokal(ev.clientX, ev.clientY);
    return { x: q.x * skal, y: q.y * skal };
  };
  // Knochen greifen bearbeitet die Fressen-Pose bei voller Öffnung (wie der Pinsel in der Pose)
  // Knochen gehören zur Fressen-Pose (B1): im Editor-Tab erst in den Fressen-Tab wechseln, statt still die Öffnung zu setzen
  if (istKnochenGriff(art)) {
    const ed = useEditor.getState();
    if (ed.modus === 'editor') ed.setzeZiel('fressen');
    else useUi.getState().setzeOeffnung(1);
  }
  const zug = griffZug(m, art, welt(e.nativeEvent));
  useEditor.getState().beginGeste();
  ctx.ziehen(
    e,
    (ev) => setzeMaulOptionen(zug(welt(ev))),
    () => useEditor.getState().endeGeste(),
  );
  return true;
}
