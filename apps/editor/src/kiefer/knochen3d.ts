// Bühne (Plan 5.2: „Gelenklage als Griff im 3D verschiebbar“; Plan 9: Blender auf der Bühne): Gelenke und Knochen der
// Pose im Tab, Stufe „Posen & Leben“. Knochen als Linien (immer sichtbar wie Blenders Knochen im Röntgen), Griffe als
// Perlen. B3b (Florians Entscheidung 10, Knochen in 3D): Die Spitze zieht man auf einer Kugel um das Gelenk (Winkel und
// Gieren), der türkise Seitengriff rollt den Knochen um seine Achse, die Mitte verschiebt den Unterkiefer in der Bildebene
// (auch seitlich). Die Gelenke (Rig) wirken wie bisher in der Seite (x, y). Ein Undo-Schritt je Zug, ohne Umbau.
import type { V2 } from '@ee/shape';
import { aktuellesNetz } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import type { Renderer3D } from '../three/Renderer3D';
import { szene } from '../three/instanz';
import { griffSetzen, poseKnochen, setzePoseKnochen } from './kieferOptionen';
import { type KieferGriff, aktuellesRig, griffZug, istKnochenGriff, knochenRichtung, rund, winkelAusRichtung } from './knochen';
import { useKernAnzeige } from '../kern/kernBau';

type V3 = [number, number, number];
const FANG = 12;
type Griff3 = { art: KieferGriff; pos: V3; perle: 'gelenk' | 'spitze' | 'zug' | 'rolle' };
/** Anteil der Schädellänge, an dem sein Drehgriff sitzt (die Spitze teilt er sonst mit dem Unterkiefer) */
const SCHAEDEL_GRIFF = 0.82;

/** Griff unter dem Zeiger (für Farbe und Mauszeiger) */
let schwebend: KieferGriff | null = null;

/** Griffe und Knochenlinien (Szene-Koordinaten) aus den posierten Knochen des Kerns, nur Stufe „Posen & Leben“, mit Maul. */
function griffe3d(): { griffe: Griff3[]; linien: number[] } | null {
  const ui = useUi.getState();
  const m = aktuellesRig();
  const n = aktuellesNetz();
  const p = m?.knochen.posiert;
  if (!m || !n || !p || ui.ebene !== 'posen') return null;
  const sk = n.skalierung;
  const s3 = (v: V3): V3 => [v[0] * sk, v[1] * sk, v[2] * sk];
  // Unterkiefer zuerst: bei gleich langen Kiefern liegen die Spitzen geschlossen aufeinander, dann gewinnt beim Greifen
  // der Unterkiefer; der Schädelgriff sitzt bei SCHAEDEL_GRIFF seines Knochens (nicht auf der Spitze)
  const griffe: Griff3[] = [];
  const linien: number[] = [];
  if (m.knochen.kippen) {
    griffe.push({ art: 'kiefer-dreh', pos: s3(p.kieferSpitze), perle: 'spitze' }, { art: 'kiefer-zug', pos: s3(p.kieferMitte), perle: 'zug' }, { art: 'kiefer-roll', pos: s3(p.kieferRolle), perle: 'rolle' });
    linien.push(...s3(p.kieferBasis), ...s3(p.kieferSpitze), ...s3(p.kieferMitte), ...s3(p.kieferRolle));
  }
  const sGriff: V3 = [p.schaedelBasis[0] + SCHAEDEL_GRIFF * (p.schaedelSpitze[0] - p.schaedelBasis[0]), p.schaedelBasis[1] + SCHAEDEL_GRIFF * (p.schaedelSpitze[1] - p.schaedelBasis[1]), p.schaedelBasis[2] + SCHAEDEL_GRIFF * (p.schaedelSpitze[2] - p.schaedelBasis[2])];
  griffe.push({ art: 'gelenk', pos: [m.rig.gelenk.x * sk, m.rig.gelenk.y * sk, 0], perle: 'gelenk' }, { art: 'schaedel-gelenk', pos: s3(p.schaedelBasis), perle: 'gelenk' }, { art: 'schaedel-dreh', pos: s3(sGriff), perle: 'spitze' }, { art: 'schaedel-roll', pos: s3(p.schaedelRolle), perle: 'rolle' });
  linien.push(...s3(p.schaedelBasis), ...s3(p.schaedelSpitze), ...s3(p.schaedelMitte), ...s3(p.schaedelRolle));
  return { griffe, linien };
}

/** Knochen und Griffe zeigen (nach jedem Bau, bei Stufenwechsel und Hover) oder ausblenden. */
export function knochen3dAnzeigen(r: Renderer3D): void {
  const g = griffe3d();
  const n = aktuellesNetz();
  if (!g || !n) return r.setzeRig(null, null);
  r.setzeRig(Float32Array.from(g.linien), g.griffe.map((x) => ({ pos: x.pos, art: x.perle, aktiv: x.art === schwebend })), n.netz.hoehe * n.skalierung);
}

/** Griffe in Feldpixeln der Bühne (E2E und Trefferprüfung): Art, px, py; hinter der Kamera fehlt der Griff. */
export function knochen3dPixel(): { art: KieferGriff; px: number; py: number }[] {
  const r = szene.aktuell;
  const g = griffe3d();
  if (!r || !g) return [];
  const pp = r.projizierenViele('creation', Float32Array.from(g.griffe.flatMap((x) => x.pos)));
  const out: { art: KieferGriff; px: number; py: number }[] = [];
  g.griffe.forEach((x, i) => {
    if (pp[3 * i + 2]! > 0) out.push({ art: x.art, px: pp[3 * i]!, py: pp[3 * i + 1]! });
  });
  return out;
}

/** Nächster Griff unter dem Zeiger (≤ 12 px), sonst null. */
export function knochen3dUnter(px: number, py: number): KieferGriff | null {
  let best: KieferGriff | null = null;
  let bd = FANG;
  for (const g of knochen3dPixel()) {
    const d = Math.hypot(g.px - px, g.py - py);
    if (d < bd) {
      bd = d;
      best = g.art;
    }
  }
  return best;
}

/** Hover: Griff unter dem Zeiger merken und gelb zeichnen; true, wenn einer getroffen ist (Mauszeiger). */
export function knochen3dSchweben(px: number, py: number): boolean {
  const neu = useUi.getState().ebene === 'posen' ? knochen3dUnter(px, py) : null;
  if (neu !== schwebend) {
    schwebend = neu;
    const r = szene.aktuell;
    if (r) knochen3dAnzeigen(r);
  }
  return neu !== null;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Strahl ∩ Ebene (Punkt q, Normale nv), sonst null. */
function ebenenSchnitt(o: V3, d: V3, q: V3, nv: V3): V3 | null {
  const nen = dot(d, nv);
  if (Math.abs(nen) < 1e-9) return null;
  const t = dot(sub(q, o), nv) / nen;
  return [o[0] + t * d[0], o[1] + t * d[1], o[2] + t * d[2]];
}
/** Strahl ∩ Kugel (Mitte c, Radius r): vorderer Schnitt, sonst der Punkt der Kugel, der dem Strahl am nächsten liegt. */
function kugelSchnitt(o: V3, d0: V3, c: V3, r: number): V3 {
  const d = norm(d0);
  const oc = sub(o, c);
  const b = dot(oc, d);
  const disc = b * b - (dot(oc, oc) - r * r);
  if (disc >= 0) {
    let t = -b - Math.sqrt(disc);
    if (t < 0) t = -b + Math.sqrt(disc);
    return [o[0] + t * d[0], o[1] + t * d[1], o[2] + t * d[2]];
  }
  const q: V3 = [o[0] - b * d[0], o[1] - b * d[1], o[2] - b * d[2]];
  const v = norm(sub(q, c));
  return [c[0] + r * v[0], c[1] + r * v[1], c[2] + r * v[2]];
}

/** Griff auf der Bühne fassen und ziehen; true, wenn ein Griff getroffen wurde. */
export function knochen3dZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const m = aktuellesRig();
  const art = knochen3dUnter(px, py);
  const g = art ? griffe3d()?.griffe.find((x) => x.art === art) : undefined;
  if (!r || !n || !m || !art || !g) return false;
  const start = r.strahlFuer('creation', px, py);
  if (!start) return false;
  const sk = n.skalierung;
  e.preventDefault();
  const ed = useEditor.getState();
  // B3: Knochen gehören zur Pose im Tab (Stellung je Pose); sie wird dafür ganz gezeigt (im Editor-Tab: Fressen)
  if (istKnochenGriff(art)) ed.setzeZiel(ed.modus === 'editor' ? 'fressen' : ed.modus);
  const ziel = useEditor.getState().modus;
  const rect = el.getBoundingClientRect();
  // Strahl in Kern-Koordinaten (Szene / Skalierung)
  const strahl = (qx: number, qy: number): { o: V3; d: V3 } | null => {
    const s = r.strahlFuer('creation', qx, qy);
    return s ? { o: [s.o[0] / sk, s.o[1] / sk, s.o[2] / sk], d: [s.d[0], s.d[1], s.d[2]] } : null;
  };
  let bewegen: (ev: PointerEvent) => void;
  if (art === 'gelenk' || art === 'schaedel-gelenk') {
    // Rig: in der Bildebene durch den Griff, wirksam ist die Lage in der Seite (x, y) wie in der Seite (`griffZug`)
    const nrm = start.d;
    const schnitt = (qx: number, qy: number): V2 | null => {
      const s = r.strahlFuer('creation', qx, qy);
      if (!s) return null;
      const nen = s.d[0] * nrm[0] + s.d[1] * nrm[1] + s.d[2] * nrm[2];
      if (Math.abs(nen) < 1e-6) return null;
      const t = ((g.pos[0] - s.o[0]) * nrm[0] + (g.pos[1] - s.o[1]) * nrm[1] + (g.pos[2] - s.o[2]) * nrm[2]) / nen;
      return { x: (s.o[0] + t * s.d[0]) / sk, y: (s.o[1] + t * s.d[1]) / sk };
    };
    const p0 = schnitt(px, py);
    if (!p0) return false;
    const zug = griffZug(m, art, p0);
    bewegen = (ev) => {
      const p = schnitt(ev.clientX - rect.left, ev.clientY - rect.top);
      if (p) griffSetzen(zug(p), m.knochen);
    };
  } else {
    // Knochen der Pose: aus der vollen Stellung der Zielpose rechnen (die Anzeige kann noch eine Vorschau zeigen)
    const dok = useEditor.getState().dok;
    const k0 = poseKnochen(dok, useKernAnzeige.getState().maul, ziel);
    const L = m.laenge;
    const vorn = m.rig.vorn;
    const unten = art.startsWith('kiefer');
    const H = m.rig.gelenk;
    const spitze = m.knochen.kieferSpitze;
    const S = m.knochen.schaedel;
    const sSpitze = m.knochen.schaedelSpitze;
    // Gelenk (nach dem Zug), Ruheachse, Länge und Vorzeichen des Winkels je Knochen
    const J: V3 = unten ? [H.x + k0.kieferZug[0] * L * vorn, H.y + k0.kieferZug[1] * L, k0.seitUnten * L] : [S.x, S.y, 0];
    const tip0: V2 = unten ? spitze : sSpitze;
    const basis0: V2 = unten ? H : S;
    const laenge = Math.hypot(tip0.x - basis0.x, tip0.y - basis0.y);
    const radius = unten ? laenge : SCHAEDEL_GRIFF * laenge;
    const dRuhe = norm([tip0.x - basis0.x, tip0.y - basis0.y, 0]);
    const vz = unten ? -vorn : vorn;
    const winkel0 = unten ? k0.winkelUnten : k0.winkelOben;
    const gieren0 = unten ? k0.gierenUnten : k0.gierenOben;
    const rollen0 = unten ? k0.rollenUnten : k0.rollenOben;
    const achse0 = knochenRichtung(dRuhe, vz, winkel0, gieren0);
    const setze = (patch: Parameters<typeof setzePoseKnochen>[1]) => setzePoseKnochen(ziel, patch, k0);
    const s0 = strahl(px, py);
    if (!s0) return false;
    if (art === 'kiefer-dreh' || art === 'schaedel-dreh') {
      // Spitze auf der Kugel um das Gelenk: neue Richtung → Winkel und Gieren (Rollen bleibt)
      bewegen = (ev) => {
        const s = strahl(ev.clientX - rect.left, ev.clientY - rect.top);
        if (!s) return;
        const p = kugelSchnitt(s.o, s.d, J, radius);
        const w = winkelAusRichtung(dRuhe, vz, norm(sub(p, J)));
        const winkel = rund(Math.max(-20, Math.min(unten ? 120 : 60, w.winkel)), 10);
        const gieren = rund(Math.max(-60, Math.min(60, w.gieren)), 10);
        setze(unten ? { winkelUnten: winkel, gierenUnten: gieren } : { winkelOben: winkel, gierenOben: gieren });
      };
    } else if (art === 'kiefer-roll' || art === 'schaedel-roll') {
      // Rollen um die Knochenachse: ½° je Pixel Zeigerweg entlang der Bildschirm-Richtung, in die sich der Griff beim
      // Rollen bewegt (aus der Projektion; schaut man fast längs dieser Richtung, rollt der Zug senkrecht). Vorher
      // gemessen zu empfindlich: Schnitt mit der Ebene senkrecht zur Achse 45 px → 61°, Rad-Umrechnung in der Schrägsicht
      // (verkürzte Tangente) 45 px → 66°.
      const p3 = m.knochen.posiert;
      if (!p3) return false;
      const Hc: V3 = unten ? p3.kieferRolle : p3.schaedelRolle;
      const Cc: V3 = unten ? p3.kieferMitte : p3.schaedelMitte;
      const ax = norm(sub(unten ? p3.kieferSpitze : p3.schaedelSpitze, unten ? p3.kieferBasis : p3.schaedelBasis));
      const T = kreuz(ax, sub(Hc, Cc));
      const dt = 0.02;
      const pp = r.projizierenViele('creation', Float32Array.from([Hc[0] * sk, Hc[1] * sk, Hc[2] * sk, (Hc[0] + dt * T[0]) * sk, (Hc[1] + dt * T[1]) * sk, (Hc[2] + dt * T[2]) * sk]));
      const tx = (pp[3]! - pp[0]!) / dt;
      const ty = (pp[4]! - pp[1]!) / dt;
      const t2 = tx * tx + ty * ty;
      const x0 = e.clientX;
      const y0 = e.clientY;
      bewegen = (ev) => {
        const dx = ev.clientX - x0;
        const dy = ev.clientY - y0;
        const dphi = t2 >= 4 ? (0.5 * (dx * tx + dy * ty)) / Math.sqrt(t2) : -0.5 * dy;
        const rollen = rund(Math.max(-90, Math.min(90, rollen0 + dphi)), 10);
        setze(unten ? { rollenUnten: rollen } : { rollenOben: rollen });
      };
    } else {
      // Mitte des Unterkiefers: Verschieben in der Bildebene durch den Griff → Zug vor/hoch und seitlich (Maullängen)
      const M: V3 = [J[0] + 0.5 * laenge * achse0[0], J[1] + 0.5 * laenge * achse0[1], J[2] + 0.5 * laenge * achse0[2]];
      const nv = norm(s0.d);
      const q0 = ebenenSchnitt(s0.o, s0.d, M, nv);
      if (!q0) return false;
      bewegen = (ev) => {
        const s = strahl(ev.clientX - rect.left, ev.clientY - rect.top);
        const q = s ? ebenenSchnitt(s.o, s.d, M, nv) : null;
        if (!q) return;
        const d = sub(q, q0);
        setze({ kieferZug: [rund(k0.kieferZug[0] + d[0] / (L * vorn)), rund(k0.kieferZug[1] + d[1] / L)], seitUnten: rund(k0.seitUnten + d[2] / L) });
      };
    }
  }
  useEditor.getState().beginGeste();
  el.setPointerCapture(e.pointerId);
  const auf = () => {
    window.removeEventListener('pointermove', bewegen);
    window.removeEventListener('pointerup', auf);
    window.removeEventListener('pointercancel', auf);
    useEditor.getState().endeGeste();
  };
  window.addEventListener('pointermove', bewegen);
  window.addEventListener('pointerup', auf);
  window.addEventListener('pointercancel', auf);
  return true;
}
