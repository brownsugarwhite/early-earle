// Stufe „Posen & Leben“, Abschnitt Rig (Plan 5.2, 14.10. spätnachts): Kiefergelenk, Kieferlinie und Übergang als Griffe
// in der Seite (Plan 9: Griffe statt Regler).
// - Gelenk (pinker Punkt): Drehpunkt des Unterkiefers; Automatik = Mundwinkel (hohler Kreis).
// - Kieferlinie (äußerer Kreis, Griff auf dem ersten Strahl): so weit reicht der Unterkiefer; Hals und Kehle bleiben.
//   Der gestrichelte innere Kreis ist der Beginn des Auslaufs.
// - Übergang (zwei Strahlen, Griffe auf dem inneren Kreis): bis zum ersten Strahl dreht die Haut voll mit, ab dem zweiten
//   nicht mehr (0° zur Schnauze, 90° nach unten).
// Alles wirkt ohne Umbau des Käfigs (Pose-Optionen), die Bühne folgt beim Ziehen.
import type { Ansicht, V2 } from '@ee/shape';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import type { Ebene2DKontext } from '../maul/MaulEbene';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { setzeMaulOptionen } from './kieferOptionen';

const FARBE = '#ff2e9a';
const GRAD = Math.PI / 180;

type Rig = NonNullable<NonNullable<ReturnType<typeof aktuellesNetz>>['netz']['maul']>;

/** Rig des zuletzt gebauten Netzes (nur Bauweise Kern mit Maul). */
function aktuellesRig(): Rig | null {
  if (useUi.getState().bauweise !== 'kern') return null;
  return aktuellesNetz()?.netz.maul ?? null;
}

/** Punkt (Welt) beim Radius r und Winkel θ (Grad; 0° zur Schnauze, 90° nach unten) um das Gelenk. */
function bei(m: Rig, r: number, th: number): V2 {
  const g = m.rig.gelenk;
  return { x: g.x + r * m.rig.vorn * Math.cos(th * GRAD), y: g.y - r * Math.sin(th * GRAD) };
}

/** Winkel (Grad) eines Weltpunkts um das Gelenk, wie im Kern (−90 … 270). */
function winkelVon(m: Rig, p: V2): number {
  const g = m.rig.gelenk;
  let th = Math.atan2(-(p.y - g.y), (p.x - g.x) * m.rig.vorn) / GRAD;
  if (th < -90) th += 360;
  return th;
}

const rund = (x: number, s = 1000) => Math.round(x * s) / s;

/** Punkt p um c drehen (Bogenmaß, gegen den Uhrzeigersinn). */
function drehen(p: V2, c: V2, a: number): V2 {
  const co = Math.cos(a);
  const si = Math.sin(a);
  return { x: c.x + (p.x - c.x) * co - (p.y - c.y) * si, y: c.y + (p.x - c.x) * si + (p.y - c.y) * co };
}

/** Vorzeichenbehafteter Winkel (Grad) von a nach b, gegen den Uhrzeigersinn positiv. */
function winkelZwischen(a: V2, b: V2): number {
  return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) / GRAD;
}

/**
 * Knochen der Fressen-Pose bei Öffnung o (wie `maulPose`): Unterkiefer dreht um das Gelenk (−vorn · o · Winkel) und zieht
 * (o · Zug · Maullänge), der Schädel dreht um sein Gelenk hinten (vorn · o · Winkel).
 */
function knochenBei(m: Rig, o: number) {
  const k = m.knochen;
  const v = m.rig.vorn;
  const g = m.rig.gelenk;
  const zug = { x: o * k.zug[0] * m.laenge * v, y: o * k.zug[1] * m.laenge };
  const aU = k.kippen ? -v * o * k.winkelUnten * GRAD : 0;
  const s = drehen(k.kieferSpitze, g, aU);
  return {
    kieferBasis: { x: g.x + zug.x, y: g.y + zug.y },
    kieferSpitze: { x: s.x + zug.x, y: s.y + zug.y },
    schaedelBasis: k.schaedel,
    schaedelSpitze: drehen(k.schaedelSpitze, k.schaedel, v * o * k.winkelOben * GRAD),
  };
}

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
      const q = B(bei(m, r2, a1 + ((a2 - a1) * i) / n));
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
            const q = B(bei(m, r2, a));
            return <line key={a} x1={G.x} y1={G.y} x2={q.x} y2={q.y} stroke={FARBE} strokeOpacity={0.75} strokeWidth={1.5} pointerEvents="none" />;
          })}
        </>
      )}
      {Math.hypot(G.x - W.x, G.y - W.y) > 2 && <line x1={W.x} y1={W.y} x2={G.x} y2={G.y} stroke="#19232b" strokeOpacity={0.5} strokeDasharray="3 3" pointerEvents="none" />}
      <circle cx={W.x} cy={W.y} r={5} fill="none" stroke="#19232b" strokeOpacity={0.6} strokeWidth={1.5} pointerEvents="none" data-mundwinkel="" />
      {rig.winkel && griff(bei(m, r2, a1), 'weite', 'Kieferlinie: so weit reicht der Unterkiefer')}
      {rig.winkel && griff(bei(m, r1, a1), 'w1', `voll bis ${Math.round(a1)}°`)}
      {rig.winkel && griff(bei(m, r1, a2), 'w2', `frei ab ${Math.round(a2)}°`)}
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
            <circle cx={sb.x} cy={sb.y} r={4} fill="#19232b" pointerEvents="none" />
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

/** Griffe des Kiefergelenks in der Seite ziehen; true, wenn ein Griff getroffen wurde. Ein Undo-Schritt je Zug. */
export function kieferZeiger(e: React.PointerEvent, ctx: Ebene2DKontext): boolean {
  if (ctx.ansicht !== 'seite') return false;
  const el = (e.target as Element).closest('[data-kiefergriff]');
  const m = aktuellesRig();
  if (!el || !m) return false;
  const art = el.getAttribute('data-kiefergriff');
  e.preventDefault();
  e.stopPropagation();
  const skal = useEditor.getState().dok.skalierung;
  const welt = (ev: { clientX: number; clientY: number }): V2 => {
    const q = ctx.lokal(ev.clientX, ev.clientY);
    return { x: q.x * skal, y: q.y * skal };
  };
  // Stand am Gestenbeginn: Länge, Richtung, Mundwinkel und Optionen ändern sich beim Ziehen nicht (kein Umbau)
  const { rig, laenge: L, knochen: kn } = m;
  const [r10, r20] = rig.kieferReichweite;
  const [a10, a20] = rig.kieferWinkel;
  const knochen = art === 'kiefer-dreh' || art === 'kiefer-zug' || art === 'schaedel-dreh';
  // Knochen greifen bearbeitet die Fressen-Pose bei voller Öffnung (wie der Pinsel in der Pose)
  if (knochen) useUi.getState().setzeOeffnung(1);
  const p0 = welt(e.nativeEvent);
  useEditor.getState().beginGeste();
  ctx.ziehen(
    e,
    (ev) => {
      const p = welt(ev);
      if (art === 'gelenk') {
        // Versatz gegen den Mundwinkel in Maullängen (x nach hinten, y nach oben), wie `kieferGelenk` im Kern
        setzeMaulOptionen({ gelenk: [rund((rig.mundwinkel.x - p.x) / (rig.vorn * L)), rund((p.y - rig.mundwinkel.y) / L)] });
      } else if (art === 'weite') {
        const r2 = Math.max(0.3, Math.hypot(p.x - rig.gelenk.x, p.y - rig.gelenk.y) / L);
        setzeMaulOptionen({ kieferReichweite: [rund((r2 * r10) / r20), rund(r2)] });
      } else if (art === 'w1') {
        setzeMaulOptionen({ kieferWinkel: [rund(Math.max(0, Math.min(a20 - 20, winkelVon(m, p))), 10), a20] });
      } else if (art === 'w2') {
        setzeMaulOptionen({ kieferWinkel: [a10, rund(Math.min(200, Math.max(a10 + 20, winkelVon(m, p))), 10)] });
      } else if (art === 'kiefer-dreh') {
        // relativ zum Griff (kein Sprung, wenn die Öffnung beim Greifen auf 100 % springt): Drehung des Zeigers um das
        // gezogene Gelenk seit dem Greifen; in `maulPose` dreht der Kiefer um −vorn · Winkel
        const basis = { x: rig.gelenk.x + kn.zug[0] * L * rig.vorn, y: rig.gelenk.y + kn.zug[1] * L };
        const phi = winkelZwischen({ x: p0.x - basis.x, y: p0.y - basis.y }, { x: p.x - basis.x, y: p.y - basis.y });
        setzeMaulOptionen({ winkelUnten: rund(Math.max(-20, Math.min(120, kn.winkelUnten - rig.vorn * phi)), 10) });
      } else if (art === 'kiefer-zug') {
        // Zug in Maullängen (x zur Schnauze, y nach oben), vom Stand am Gestenbeginn
        setzeMaulOptionen({ kieferZug: [rund(kn.zug[0] + ((p.x - p0.x) * rig.vorn) / L), rund(kn.zug[1] + (p.y - p0.y) / L)] });
      } else if (art === 'schaedel-dreh') {
        const phi = winkelZwischen({ x: p0.x - kn.schaedel.x, y: p0.y - kn.schaedel.y }, { x: p.x - kn.schaedel.x, y: p.y - kn.schaedel.y });
        setzeMaulOptionen({ winkelOben: rund(Math.max(-20, Math.min(60, kn.winkelOben + rig.vorn * phi)), 10) });
      }
    },
    () => useEditor.getState().endeGeste(),
  );
  return true;
}
