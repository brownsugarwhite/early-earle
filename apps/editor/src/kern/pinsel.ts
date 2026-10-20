// Phase 1 / M3: Pinsel auf der Bühne (Plan 4.3, Blender-Gefühl): G ziehen (weich, Radius [ ]), I aufblasen, ⇧ beim
// Ziehen glättet, immer gespiegelt. Die Pinsel wirken auf Käfigpunkte; ihre Versätze stehen als `kaefig.deltas`
// (Grundform, nur Vorlagenpunkte) bzw. in einer Pose als ihre Form (B3: Ruhe-Deltas vor den Knochen, alle Punkte, mit
// Bezugs-Käfig; posierte Zuwächse werden mit der Drehung je Punkt zurückgedreht) — ein Undo-Schritt je Strich.

import type { KaefigDelta, Pose } from '@ee/shape';
import { type M3, type PoseBearbeitung, type Stencil, ankerVon, baryzentrisch, bezugAus, deltaKarte, deltaListe, formAusFeld, genauerVersatz, kaefigNachbarn, kaefigNormalen, pinselGewichte, poseWirkung, spiegelIndex, spiegelWirkung, stencilGewichte, verstaerkung, verstaerkungTraegt, zugGrenze } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { szene } from '../three/instanz';
import { aktuellesNetz, kernStencil, werkzeugGesperrt } from './kernBau';
import { useTreffer } from './treffer';

type V3 = [number, number, number];

function schnittMitEbene(strahl: { o: V3; d: V3 } | null, mitte: V3, normale: V3): V3 | null {
  if (!strahl) return null;
  const nenner = strahl.d[0] * normale[0] + strahl.d[1] * normale[1] + strahl.d[2] * normale[2];
  if (Math.abs(nenner) < 1e-9) return null;
  const t = ((mitte[0] - strahl.o[0]) * normale[0] + (mitte[1] - strahl.o[1]) * normale[1] + (mitte[2] - strahl.o[2]) * normale[2]) / nenner;
  if (t < 0) return null;
  return [strahl.o[0] + strahl.d[0] * t, strahl.o[1] + strahl.d[1] * t, strahl.o[2] + strahl.d[2] * t];
}

function ziehen(e: React.PointerEvent, el: HTMLElement, bewegen: (ev: PointerEvent) => void, ende: () => void): void {
  el.setPointerCapture(e.pointerId);
  const auf = () => {
    window.removeEventListener('pointermove', bewegen);
    window.removeEventListener('pointerup', auf);
    window.removeEventListener('pointercancel', auf);
    ende();
  };
  window.addEventListener('pointermove', bewegen);
  window.addEventListener('pointerup', auf);
  window.addEventListener('pointercancel', auf);
}

/** Normale des getroffenen Dreiecks (Mittel der drei Eckennormalen), Welt. */
function dreiecksNormale(normalen: Float32Array, dreieck: number): V3 {
  const o = 9 * dreieck;
  const n: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    n[0] += normalen[o + 3 * k]!;
    n[1] += normalen[o + 3 * k + 1]!;
    n[2] += normalen[o + 3 * k + 2]!;
  }
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/**
 * Stufe, in der der Pinsel wirkt: Körper immer; „Posen & Leben“ in Fressen und den weiteren Posen (Florian 15.10.: der
 * Blendshape der Pose wird dort geformt, zusammen mit den Knochen).
 */
export function pinselStufe(): boolean {
  const ebene = useUi.getState().ebene;
  return ebene === 'form' || (ebene === 'posen' && useEditor.getState().modus !== 'editor');
}

/** Radiusring am Zeiger zeigen (Pinselwerkzeug aktiv, Treffer vorhanden) oder ausblenden. */
export function pinselRing(_px: number, _py: number): void {
  const r = szene.aktuell;
  const ui = useUi.getState();
  const n = aktuellesNetz();
  const t = useTreffer.getState();
  if (!r) return;
  if (!n || ui.bauweise !== 'kern' || !pinselStufe() || (ui.werkzeug !== 'ziehen' && ui.werkzeug !== 'aufblasen') || !t.treffer || t.feld !== 'creation') return r.setzeRadiusRing(null);
  r.setzeRadiusRing(t.treffer.punkt, dreiecksNormale(n.netz.normalen, t.treffer.dreieck), ui.pinselRadius * n.netz.hoehe * n.skalierung);
}

/**
 * Ziel des Strichs: Grundform (Vorlagenpunkte) oder die Pose des Tabs (alle Punkte). Eine Pose wird nur ganz gezeigt
 * geformt (Gewicht 1): Dann liefert der Bau ihre Bearbeitungsdaten (Ruhe-Käfig, Drehung je Punkt, Form als Ruhe-Deltas).
 */
function pinselZiel(): { pose: PoseBearbeitung | null; nMax: number; baum: boolean } | null {
  const n = aktuellesNetz();
  const tr = n?.netz.treffer;
  if (!n || !tr) return null;
  const modus = useEditor.getState().modus;
  // S7.3: Baum-Körper — Pinsel auf seinem Käfig (eigene Deltas der Grundform bzw. Form der Pose auf dem Baum)
  if (n.netz.koerperBaum) {
    if (modus !== 'editor') {
      const b = n.netz.pose;
      if (!b || b.id !== modus) {
        useEditor.getState().setzeZiel(modus);
        useUi.getState().zeigeHinweis('Pose wieder ganz gezeigt — jetzt formen');
        return null;
      }
      return { pose: b, nMax: tr.kaefig.n, baum: true };
    }
    return { pose: null, nMax: tr.kaefig.n, baum: true };
  }
  if (modus !== 'editor') {
    const b = n.netz.pose;
    if (!b || b.id !== modus) {
      // Vorschau (z. B. Kieferknopf bei 40 %): erst die Pose ganz zeigen, dann formen
      useEditor.getState().setzeZiel(modus);
      useUi.getState().zeigeHinweis('Pose wieder ganz gezeigt — jetzt formen');
      return null;
    }
    return { pose: b, nMax: tr.kaefig.n, baum: false };
  }
  return { pose: null, nMax: Math.min(tr.vorlage.n, tr.kaefig.n), baum: false };
}

/**
 * Pose-Form aus einem Strich (B3): posierte Zuwächse ΔX je Punkt (rechte Hälfte und Naht) → Ruhe-Deltas Rᵀ·ΔX zur Form,
 * die der Bau für die aktuelle Grundform geliefert hat (Bearbeitungsdaten vom Gestenbeginn); gespeichert mit dem
 * aktuellen Ruhe-Käfig als Bezug. Maulpunkte tragen ihren Anker (Rolle, Reihe, Anteil): die Form überlebt eine neue
 * Maultopologie.
 */
function poseSchreiben(b: PoseBearbeitung, zuwachs: Map<number, V3>, anker: Parameters<typeof ankerVon>[0], baum = false): void {
  const n = b.ruhe.length / 3;
  const form = new Float64Array(b.form);
  // B3b: Zuwächse beider Hälften je Punkt mit seiner eigenen Drehung zurück (Rᵀ, 3×3), gespiegelt erst in der Ruhe — in
  // einer schiefen Pose (gerollter Kiefer) sind die Drehungen links und rechts verschieden. Naht: beide Hälften (× 2, z 0).
  const spiegel = spiegelIndex(b.ruhe, n);
  const R = b.dreh;
  const add = (i: number, x: number, y: number, z: number) => {
    form[3 * i] = form[3 * i]! + x;
    form[3 * i + 1] = form[3 * i + 1]! + y;
    form[3 * i + 2] = form[3 * i + 2]! + z;
  };
  for (const [i, d] of zuwachs) {
    if (i >= n) continue;
    const o = 9 * i;
    const x = R[o]! * d[0] + R[o + 3]! * d[1] + R[o + 6]! * d[2];
    const y = R[o + 1]! * d[0] + R[o + 4]! * d[1] + R[o + 7]! * d[2];
    const z = R[o + 2]! * d[0] + R[o + 5]! * d[1] + R[o + 8]! * d[2];
    const rz = b.ruhe[3 * i + 2]!;
    const q = spiegel[i]!;
    if (Math.abs(rz) < 1e-9 || q === i) add(i, 2 * x, 2 * y, 0);
    else if (rz > 0) add(i, x, y, z);
    else if (q >= 0) add(q, x, y, -z);
  }
  const bezug = bezugAus(b.ruhe);
  if (baum) {
    // Körper aus Teilen: Form der Pose auf dem Baum-Käfig, je Delta die Ruhelage (übersteht einen Umbau des Baums)
    const deltasB: KaefigDelta[] = formAusFeld(b.ruhe, n, form).map((d) => ({ ...d, lage: [b.ruhe[3 * d.punkt]!, b.ruhe[3 * d.punkt + 1]!, b.ruhe[3 * d.punkt + 2]!] }));
    useEditor.getState().poseSetzen(b.id, (p: Pose) => {
      if (!deltasB.length && !p.baum?.form.length) return p;
      return { ...p, baum: { form: deltasB, bezug } };
    });
    return;
  }
  const deltas: KaefigDelta[] = formAusFeld(b.ruhe, n, form).map((d) => {
    const a = ankerVon(anker, d.punkt);
    return a ? { ...d, anker: a } : d;
  });
  useEditor.getState().poseSetzen(b.id, (p: Pose) => {
    // ohne Form vorher und nachher nichts schreiben (sonst ein Bezug ohne Wirkung, Befund B6)
    if (!deltas.length && !p.form.length) return p;
    const neu: Pose = { ...p, form: deltas, bezug };
    delete neu.formAlt;
    return neu;
  });
}

/**
 * Genauer Zug (Plan 2026-10-20): Verstärkung A des Strichs — bewegt der Pinselversatz D jeden Käfigpunkt i um Wᵢ·D, wandert
 * der Hautpunkt um A·D (Stencil aus dem Worker). Grundform: gespiegelter Pinsel wᵢ·D + wsᵢ·M·D (rechte Hälfte und Naht,
 * links gespiegelt); Pose: posierte Zuwächse wᵢ·D, in der Ruhe gespiegelt und mit der Drehung des Partners posiert.
 */
function zugVerstaerkung(st: Stencil, gewichte: readonly { punkt: number; w: number; wSpiegel: number }[], pose: PoseBearbeitung | null): M3 {
  const g = new Map(gewichte.map((x) => [x.punkt, x] as const));
  if (!pose) {
    return verstaerkung(st, (i) => {
      const x = g.get(i);
      return x ? spiegelWirkung(x.w, x.wSpiegel) : null;
    });
  }
  const n = pose.ruhe.length / 3;
  const spiegel = spiegelIndex(pose.ruhe, n);
  return verstaerkung(st, (i) => {
    if (i >= n) return null;
    const q = spiegel[i]!;
    const naht = q === i || Math.abs(pose.ruhe[3 * i + 2]!) < 1e-9;
    return poseWirkung(pose.dreh, i, naht ? i : q, g.get(i)?.w ?? 0, q >= 0 && !naht ? (g.get(q)?.w ?? 0) : 0);
  });
}

/**
 * Pinselstrich auf dem Körper: Treffer → Gewichte der Käfigpunkte um den Treffer und sein Spiegelbild → je Bewegung
 * neue Deltas aus der Basis des Gestenbeginns (ziehen: Versatz in der Ebene zur Kamera; aufblasen: entlang der
 * Punktnormalen, Zug nach rechts/oben = nach außen; ⇧: Glätten zum Nachbarmittel, Schritte aus dem Zugweg). Die Lagen
 * des posierten Käfigs enthalten die bisherigen Deltas schon; gespeichert wird Basis + Zuwachs (Pose: zurückgedreht).
 * true = Geste läuft.
 */
export function pinselZeiger(e: React.PointerEvent, px: number, py: number, el: HTMLElement): boolean {
  const ui = useUi.getState();
  const werkzeug = ui.werkzeug;
  if (werkzeug !== 'ziehen' && werkzeug !== 'aufblasen') return false;
  // B7: während einer Vorschau beendet der Druck nur sie; der Strich rechnete sonst auf dem Körper der Vorschau
  if (pinselStufe() && werkzeugGesperrt()) return true;
  const r = szene.aktuell;
  const n = aktuellesNetz();
  const tr = n?.netz.treffer;
  const ziel = pinselZiel();
  if (!r || !n || !tr || !ziel) return false;
  const h = r.treffen('creation', px, py);
  if (!h) return false;
  const sk = n.skalierung;
  const xyz = tr.kaefig.xyz;
  const nMax = ziel.nMax;
  const mitte: V3 = [h.punkt[0] / sk, h.punkt[1] / sk, h.punkt[2] / sk];
  const radius = ui.pinselRadius * n.netz.hoehe;
  const gewichte = pinselGewichte(xyz, nMax, mitte, radius);
  // ohne Käfigpunkt im Radius zieht nur „genau“ (der Stencil wird der Pinsel), weich startet wie bisher nicht
  if (!gewichte.length && !(werkzeug === 'ziehen' && ui.pinselGenau)) return false;
  const ed = useEditor.getState();
  // Grundform: gespeicherte Deltas (Baum: seine eigenen); Pose: keine Karte (Zuwächse posiert, Form aus den Bearbeitungsdaten)
  const basis = deltaKarte(ziel.pose ? [] : ziel.baum ? ed.dok.kaefig?.baumDeltas : ed.dok.kaefig?.deltas);
  const spiegel = spiegelIndex(xyz, nMax);
  const normalen = werkzeug === 'aufblasen' ? kaefigNormalen(xyz, tr.kaefig.fStart, tr.kaefig.fVerts, nMax) : null;
  const nachbarn = kaefigNachbarn(tr.kaefig.fStart, tr.kaefig.fVerts, nMax);
  const blick = r.blickrichtung('creation') ?? [0, 0, 1];
  const ebene: V3 = [-blick[0], -blick[1], -blick[2]];
  const rr = el.getBoundingClientRect();
  const x0 = e.clientX;
  const y0 = e.clientY;
  const pos = (p: number): V3 => [xyz[3 * p]!, xyz[3 * p + 1]!, xyz[3 * p + 2]!];
  const rechts = (p: number) => xyz[3 * p + 2]! >= -1e-9;
  // Genauer Zug: Stencil des Treffers aus dem Worker (einmal je Strich); bis er da ist, zieht der Pinsel weich, danach
  // rechnet der letzte Zug genau nach. Ohne Stencil (angesetzte Teile, Höhle, Rundmaul offen) bleibt er weich und sagt es.
  let A: M3 | null = null;
  // Gewichte des Zugs: die des Radius, beim Rückfall „kleinste Beule“ die des Stencils (Glätten und Aufblasen bleiben beim Radius)
  let zugGewichte = gewichte;
  let grenze = zugGrenze(gewichte);
  let letzte: PointerEvent | null = null;
  let laeuft = true;
  let gemeldet = false;
  ed.beginGeste();
  const bewegen = (ev: PointerEvent) => {
    letzte = ev;
    const karte = new Map<number, V3>();
    for (const [k, v] of basis) karte.set(k, [v[0], v[1], v[2]]);
    // Pose (B3b): Zuwächse aller getroffenen Punkte beider Hälften, posiert; gespiegelt wird erst in der Ruhe
    const alle = new Map<number, V3>();
    const zuPose = (p: number, d: V3) => {
      const a = alle.get(p) ?? [0, 0, 0];
      alle.set(p, [a[0] + d[0], a[1] + d[1], a[2] + d[2]]);
    };
    // Zuwachs eines Punkts (Welt, unskaliert) in die Karte: rechte Hälfte und Naht direkt, linke gespiegelt beim Partner
    const zuwachs = (p: number, d: V3) => {
      const q = rechts(p) ? p : spiegel[p]!;
      if (q < 0) return;
      const dd: V3 = rechts(p) ? d : [d[0], d[1], -d[2]];
      const a = karte.get(q) ?? [0, 0, 0];
      karte.set(q, [a[0] + dd[0], a[1] + dd[1], a[2] + dd[2]]);
    };
    if (ev.shiftKey) {
      // Glätten: Laplace-Entspannung im Radius, Schritte aus dem Zugweg (bis 12), jeder Schritt auf dem vorigen
      const schritte = Math.min(12, Math.ceil(Math.hypot(ev.clientX - x0, ev.clientY - y0) / 10));
      const lagen = new Map<number, V3>();
      const lageJetzt = (p: number): V3 => lagen.get(p) ?? pos(p);
      for (let s = 0; s < schritte; s++) {
        const neu = new Map<number, V3>();
        for (const g of gewichte) {
          const w = Math.max(g.w, g.wSpiegel) * 0.5;
          const nb = nachbarn[g.punkt]!;
          if (w <= 0 || !nb.length) continue;
          const p0 = lageJetzt(g.punkt);
          const m: V3 = [0, 0, 0];
          for (const q of nb) {
            const l = lageJetzt(q);
            m[0] += l[0] / nb.length;
            m[1] += l[1] / nb.length;
            m[2] += l[2] / nb.length;
          }
          neu.set(g.punkt, [p0[0] + w * (m[0] - p0[0]), p0[1] + w * (m[1] - p0[1]), p0[2] + w * (m[2] - p0[2])]);
        }
        for (const [k, v] of neu) lagen.set(k, v);
      }
      for (const g of gewichte) {
        const l = lagen.get(g.punkt);
        if (!l) continue;
        const p0 = pos(g.punkt);
        if (ziel.pose) zuPose(g.punkt, [l[0] - p0[0], l[1] - p0[1], l[2] - p0[2]]);
        else if (rechts(g.punkt)) zuwachs(g.punkt, [l[0] - p0[0], l[1] - p0[1], l[2] - p0[2]]);
      }
    } else if (werkzeug === 'ziehen') {
      const hit = schnittMitEbene(r.strahlFuer('creation', ev.clientX - rr.left, ev.clientY - rr.top), h.punkt, ebene);
      if (!hit) return;
      const d: V3 = [(hit[0] - h.punkt[0]) / sk, (hit[1] - h.punkt[1]) / sk, (hit[2] - h.punkt[2]) / sk];
      // genau: D so verstärkt, dass der Hautpunkt um d wandert (Richtungen, die der gespiegelte Körper nicht kann, bleiben)
      const gv = A ? genauerVersatz(A, d, { grenze }) : null;
      const D: V3 = gv ? gv.D : d;
      if (gv && !gemeldet && (gv.begrenzt || gv.gesperrt) && Math.hypot(...d) > 1e-6) {
        gemeldet = true;
        ui.zeigeHinweis(gv.gesperrt ? 'Auf der Mittelnaht geht der Punkt nicht zur Seite (Spiegel)' : 'Radius klein gegen den Käfig — der Punkt folgt nur zum Teil (mehr Ringe: Loops)');
      }
      if (ziel.pose) {
        for (const g of zugGewichte) if (g.w > 0) zuPose(g.punkt, [g.w * D[0], g.w * D[1], g.w * D[2]]);
      } else for (const g of zugGewichte) if (rechts(g.punkt)) zuwachs(g.punkt, [(g.w + g.wSpiegel) * D[0], (g.w + g.wSpiegel) * D[1], (g.w - g.wSpiegel) * D[2]]);
    } else {
      const betrag = ((ev.clientX - x0 - (ev.clientY - y0)) / 300) * radius;
      for (const g of gewichte) {
        if (ziel.pose) {
          if (g.w > 0) zuPose(g.punkt, [g.w * betrag * normalen![3 * g.punkt]!, g.w * betrag * normalen![3 * g.punkt + 1]!, g.w * betrag * normalen![3 * g.punkt + 2]!]);
          continue;
        }
        if (!rechts(g.punkt)) continue;
        const w = (g.w + g.wSpiegel) * betrag;
        zuwachs(g.punkt, [w * normalen![3 * g.punkt]!, w * normalen![3 * g.punkt + 1]!, w * normalen![3 * g.punkt + 2]!]);
      }
    }
    const s = useEditor.getState();
    if (ziel.pose) {
      poseSchreiben(ziel.pose, alle, n.netz.anker, ziel.baum);
      return;
    }
    const kaefig = s.dok.kaefig ?? { deltas: [] };
    if (ziel.baum) {
      // Ruhelage je Punkt (Lage ohne die bisherigen Deltas): nach einem Umbau des Baums trifft das Delta den Punkt dort
      const ruhe = (p: number): V3 => {
        const b0 = basis.get(p) ?? [0, 0, 0];
        return [xyz[3 * p]! - b0[0], xyz[3 * p + 1]! - b0[1], xyz[3 * p + 2]! - b0[2]];
      };
      s.setzeDokument({ ...s.dok, kaefig: { ...kaefig, baumDeltas: deltaListe(karte).map((d) => ({ ...d, lage: ruhe(d.punkt) })) } });
      return;
    }
    s.setzeDokument({ ...s.dok, kaefig: { ...kaefig, deltas: deltaListe(karte) } });
  };
  if (werkzeug === 'ziehen' && ui.pinselGenau) {
    const f = tr.dreieckFlaeche[h.dreieck] ?? -1;
    const P = n.netz.positionen;
    const o = 9 * h.dreieck;
    if (f >= 0 && o + 8 < P.length) {
      const bary = baryzentrisch(h.punkt, [P[o]!, P[o + 1]!, P[o + 2]!], [P[o + 3]!, P[o + 4]!, P[o + 5]!], [P[o + 6]!, P[o + 7]!, P[o + 8]!]);
      kernStencil(h.dreieck, f, bary, (st) => {
        if (!st) {
          ui.zeigeHinweis('Genauer Zug hier nicht möglich — der Pinsel zieht weich');
          return;
        }
        A = zugVerstaerkung(st, gewichte, ziel.pose);
        if (!gewichte.length || !verstaerkungTraegt(A, { grenze })) {
          // Radius kleiner, als der Käfig hier auflöst: der Stencil selbst als Pinsel (kleinster Käfigzug, Punkt genau)
          const sp = ziel.pose ? spiegelIndex(ziel.pose.ruhe, ziel.pose.ruhe.length / 3) : spiegel;
          zugGewichte = stencilGewichte(st, sp, nMax);
          grenze = zugGrenze(zugGewichte);
          A = zugVerstaerkung(st, zugGewichte, ziel.pose);
          ui.zeigeHinweis('Pinsel kleiner als der Käfig: kleinste Beule, die der Käfig hier kann (feiner mit mehr Ringen)');
        }
        if (laeuft && letzte && !letzte.shiftKey) bewegen(letzte);
      });
    } else ui.zeigeHinweis('Genauer Zug auf angesetzten Teilen nicht möglich — der Pinsel zieht weich');
  }
  ziehen(e, el, bewegen, () => {
    laeuft = false;
    useEditor.getState().endeGeste(); // Grundform: „Formen folgen“ hängt am Gestenende (kernBau); Pose: Deltas der Pose
  });
  return true;
}
