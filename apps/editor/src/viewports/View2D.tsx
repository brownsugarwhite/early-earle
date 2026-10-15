// 2D-Viewport (Seite, Front, Top): Profilkurve wie in Illustrator, Kachel, Spiegelachse.
// Griffe und Linien haben bei jedem Zoom dieselbe Größe (gezeichnet in Bildpunkten).

import {
  vollerPfad,
  type Ansicht,
  type Dokument,
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
  maulGetrenntImUmriss,
  maulKnotenIndex,
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
import { aktiveProfile, aktivesProfil, setzeAktiv, uebernehmenAktiv } from '../editing/aktiv';
import { istPose, poseSeite, poseSeiteSetzen, poseSpaltIndizes } from '../maul/fressenForm';
import { useEditor } from '../state/editorStore';
import { useUeberlagerung } from '../versuch/ueberlagerung';
import { blickVon, useUi } from '../state/uiStore';
import { MaulZeichnung, aktuelleLippen, maulZeiger, setzeLippen, setzeLippenImUmriss } from '../maul/MaulEbene';
import { KieferZeichnung, kieferZeiger } from '../kiefer/KieferEbene';
import { RigZeichnung } from '../maul/RigZeichnung';
import { ZahnZeichnung, zahnZeiger } from '../maul/ZahnEbene';
import { RundmaulZeichnung, rundmaulZeiger } from '../maul/RundmaulEbene';
import { zahnZeiger as kernZahnZeiger } from '../kern/zahnGriffe';
import { useRahmen } from '../layout/animation';
import { useMaulInfo } from '../maul/maulKoerper';
import { offenerUmriss } from '../maul/offenerUmriss';
import { BreitenKreis, EckKantenZeichnung, KantenZeichnung, breiteZiehen, kantenZeiger } from '../kanten/KantenEbene';
import { SpantLinien, SpantQuerschnitte, spantZeiger } from '../spanten/SpantEbene';
import { WirbelPunkte, WirbelZeichnung, wirbelBearbeitbar, wirbelZeiger } from '../wirbel/WirbelEbene';
import { SchnittZeichnung } from '../schnitte/SchnittEbene';
import { RundZeichnung } from '../rund/RundEbene';
import { RundSpantLinien, RundSpantSchnitt, rundSpantZeiger } from '../rund/RundSpantEbene';
import { istTrackpad, radFaktor, spiegeln2, verschieben, zoomUm, zuBild, zuWelt } from './ansicht2d';
import { aktuellesNetz, useKernAnzeige } from '../kern/kernBau';

/** Saum ab dieser Abweichung (px bei 461 px je Kachel; Plan 9.8) */
const SAUM_AB = 2;
import { abtasten3, maulAnfangIndizes, umrissMitSpalt, versetzt3 } from '@ee/shape/versuch';

const PUNKT_R = 5; // Ø 10 px (Florian, 11.10.)
const GRIFF = 6; // 6-px-Quadrate
const KONTUR = 3;

type Props = { ansicht: Ansicht; w: number; h: number };

/** Knotennummern der geschlossenen Maulanfänge (beide gefunden), sonst null. Bauweise Kern: die markierten Knoten. */
function spaltIndizesZu(seite: Profil, zu: NonNullable<Dokument['maul']>['zu']): { oben: number; unten: number } | null {
  if (maulGetrenntImUmriss(seite)) return { oben: maulKnotenIndex(seite, 'oben'), unten: maulKnotenIndex(seite, 'unten') };
  const i = maulAnfangIndizes(seite, zu);
  return i.oben !== null && i.unten !== null ? { oben: i.oben, unten: i.unten } : null;
}

export function View2D({ ansicht, w, h }: Props) {
  // im Fressen-Tab bearbeitet die Seite die Pose-Form (gespeichert oder dem Kiefer folgend)
  const profil = useEditor((s) => (istPose(s.modus, ansicht) ? poseSeite(s.dok) : s.dok.profile[ansicht]));
  const skal = useEditor((s) => s.dok.skalierung);
  const view = useUi((s) => s.ansichten[ansicht]);
  const gewaehlt = useUi((s) => s.auswahl[ansicht]);
  const [rahmen, setRahmen] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const werkzeug = useUi((s) => s.werkzeug);
  const ebene = useUi((s) => s.ebene);
  // Back ist waagerecht, Bottom senkrecht gespiegelt (Florian 12.10.); die Silhouette ist dieselbe, die Fläche die abgewandte
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const hatMaul = useEditor((s) => !!s.dok.maul);
  const bauweise = useUi((s) => s.bauweise);
  const ueber = useUeberlagerung((s) => s[ansicht]);
  /** Profile nur im Form-Tab bearbeitbar; in den anderen Tabs sind sie Kontext. */
  // Fressen mit Maul: Der Körper folgt dem Kiefer (Florian 12.10.: „Kiefer wirklich mit dem Shape verbunden“). Die
  // Ansichten zeigen den geöffneten Umriss aus dem 3D; die Grundform wird im Tab Editor bearbeitet.
  const modus = useEditor((s) => s.modus);
  useMaulInfo((s) => s.info);
  // Bauweise Kern (Fressen wie Editor, 15.10.): die Blätter zeigen die Griffe der Pose (Sicht des Speichers), kein offener Umriss
  const offenerKoerper = modus === 'fressen' && hatMaul && bauweise !== 'kern';
  // Front und Top zeigen im Fressen-Tab den Umriss des geöffneten Körpers; die Seite ist die bearbeitbare Pose-Form
  const offen = offenerKoerper && ansicht !== 'seite' ? offenerUmriss(useEditor.getState().dok, ansicht) : null;
  // Geschlossen mit getrennten Kiefern: Der Seitenumriss zeigt den Maulspalt (Florian 12.10. abends: „wie bei der
  // Fressen-Pose“). Die Maulanfänge sind Umrissknoten; zwischen ihnen läuft der Umriss an den Lippen entlang.
  const maulDok = useEditor((s) => s.dok.maul);
  const maulZu = ansicht === 'seite' && maulDok ? (offenerKoerper ? aktuelleLippen(useEditor.getState().dok, 'fressen').lippen ?? undefined : maulDok.zu) : undefined;
  // Spalt über die Knotennummern der Maulanfänge (geschlossen aus dem Umriss, die Pose-Form hat dieselben)
  // Bauweise Kern: „Formen folgen“ macht die Lippenanfänge zu Umrissknoten (Spalt dazwischen); solange sie es nicht sind, bleibt der Umriss ganz
  const spalt = maulZu?.unten ? umrissMitSpalt(profil, maulZu, offenerKoerper ? poseSpaltIndizes(useEditor.getState().dok) : maulDok ? spaltIndizesZu(profil, maulDok.zu) : null) : null;
  const formAktiv = ebene === 'form' && (!offenerKoerper || ansicht === 'seite');
  const svgRef = useRef<SVGSVGElement>(null);
  // Saum (Schritt 4): Silhouette des Körpers, wo sie > 2 px von der Kurve abweicht (Welt-Koordinaten des Blatts)
  const saum = useKernAnzeige((s) => (s.info?.blatt ? (aktuellesNetz()?.netz.saum?.[ansicht] ?? null) : null));
  const saumPfad = (() => {
    if (!saum || saum.length < 6) return '';
    let d = '';
    let offen = false;
    for (let i = 0; i + 2 < saum.length; i += 3) {
      const x = saum[i]!;
      if (!Number.isFinite(x) || saum[i + 2]! <= SAUM_AB) {
        offen = false;
        continue;
      }
      const q = zuBild(view, w, h, spiegeln2(blick, { x, y: saum[i + 1]! }));
      d += `${offen ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      offen = true;
    }
    return d;
  })();
  // Umweg der schwarzen Linie über einen breiteren Kiefer (14.10. nachts, Florian: „Der schwarze Shape sollte sich bei
  // viel breiterem Kiefer an die Kieferlinie heften“): Front/Top, Teil der Linie — eigene Hälfte schwarz, Spiegel weiß
  const umweg = useKernAnzeige((s) => (s.info?.blatt && ansicht !== 'seite' ? (aktuellesNetz()?.netz.umweg?.[ansicht] ?? null) : null));
  const umwegPfade = (() => {
    const out = { eigen: '', spiegel: '' };
    if (!umweg || umweg.length < 4) return out;
    let offen: 'eigen' | 'spiegel' | null = null;
    for (let i = 0; i + 1 < umweg.length; i += 2) {
      const x = umweg[i]!;
      const y = umweg[i + 1]!;
      if (!Number.isFinite(x)) {
        offen = null;
        continue;
      }
      const seite = (ansicht === 'front' ? x : y) >= 0 ? 'eigen' : 'spiegel';
      const q = zuBild(view, w, h, spiegeln2(blick, { x, y }));
      out[seite] += `${offen === seite ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      offen = seite;
    }
    return out;
  })();

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

  const bild = (p: V2) => zuBild(view, w, h, spiegeln2(blick, { x: p.x * skal, y: p.y * skal }));
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
    const p = spiegeln2(blickVon(ansicht, useUi.getState().blick), zuWelt(v, r.width, r.height, { x: clientX - r.left, y: clientY - r.top }));
    return { x: p.x / s, y: p.y / s };
  };
  const aktuell = (): Profil => aktivesProfil(ansicht);
  /** Zug übernehmen: die anderen Ansichten folgen, gerechnet vom Stand am Gestenbeginn (in der Pose nur die Seite). */
  const uebernehmen = (neu: Profil, indizes: number[], basis: Profile, auswahlBasis: Record<Ansicht, number[]>) => uebernehmenAktiv(ansicht, neu, indizes, basis, auswahlBasis);

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
      const q = zuBild(v, w, h, spiegeln2(blick, { x: k.p.x * s, y: k.p.y * s }));
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
    if (ui.ebene === 'maul') {
      // Rundmaul (Phase 2 M6): Ring und Mitte als Griffe vor dem Zeichnen einer Maullinie
      if (rundmaulZeiger(e, { ansicht, lokal, ziehen })) return;
      maulZeiger(e, { ansicht, lokal, ziehen });
      return;
    }
    if (ui.ebene === 'zaehne') {
      // Bauweise Kern (Phase 2 M4): das Blatt zeigt dieselbe Szene orthografisch — Zahn per Strahl wählen und ziehen
      if (ui.bauweise === 'kern') {
        const rc = useRahmen.getState().rects?.[ansicht];
        if (!(rc && svgRef.current && kernZahnZeiger(e, e.clientX - rc.x, e.clientY - rc.y, svgRef.current, ansicht))) ui.setzeZahnAuswahl(null);
        return;
      }
      zahnZeiger(e, { ansicht, lokal, ziehen });
      return;
    }
    // Stufe „Posen & Leben“, Abschnitt Rig (Plan 5.2): Kiefergelenk, Kieferlinie, Übergang
    if (ui.ebene === 'posen' && kieferZeiger(e, { ansicht, lokal, ziehen })) return;
    if (ui.ebene !== 'form') return;
    // Wirbelsäule (Versuch 12.10. nachts): selbst zeichnen, Punkte ziehen, einfügen, löschen
    if (wirbelBearbeitbar(ansicht) && wirbelZeiger(e, { lokal, ziehen })) return;
    // Spanten der Bauweise „rund“ (Versuch 13.10. nachmittags): quer über ein Teil, in der Front bearbeiten
    if (rundSpantZeiger(e, { ansicht, lokal, ziehen })) return;
    // Spanten (Versuch 12.10. nachmittags): Werkzeug S, Spantlinien ziehen, gewählten Spant bearbeiten
    if (spantZeiger(e, { ansicht, lokal, ziehen })) return;
    // Kanten (Versuch 12.10. mittags): Zeichenstift auf freier Fläche, Kantenknoten, Breitenwerkzeug
    if (kantenZeiger(e, { ansicht, lokal, ziehen, bild })) return;
    const ziel = e.target as Element;
    const griffEl = ziel.closest('[data-griff]');
    const knotenEl = ziel.closest('[data-knoten]');
    const kurveEl = ziel.closest('[data-kurve]');

    // Zeichenstift, + und − (wie Illustrator); ⌘ hält vorübergehend die Direktauswahl
    // Breitenwerkzeug an einer Ecke der Silhouette: Härte der Ecke (die Ecke ist im 3D eine Kante)
    if (ui.werkzeug === 'breite') {
      const i = knotenEl ? Number(knotenEl.getAttribute('data-knoten')) : -1;
      const kn = aktuell().knoten[i];
      if (!kn) return;
      if (kn.art !== 'ecke') {
        ui.zeigeHinweis('Härte haben Ecken: ⌥-Klick mit dem Zeichenstift macht aus dem Punkt eine Ecke');
        return;
      }
      ui.waehle(ansicht, [i]);
      editor.beginGeste();
      breiteZiehen(e, { ansicht, lokal, ziehen, bild }, kn.p, kn.haerte ?? 1, (h) => {
        const pr = aktuell();
        const neu = { ...pr, knoten: pr.knoten.map((k, j) => (j === i ? { ...k, haerte: h } : k)) };
        if (istPose(useEditor.getState().modus, ansicht)) poseSeiteSetzen(neu);
        else useEditor.getState().setzeProfil(ansicht, neu);
      });
      return;
    }
    if (ui.werkzeug !== 'auswahl' && !e.metaKey) {
      const i = knotenEl ? Number(knotenEl.getAttribute('data-knoten')) : -1;
      if (knotenEl && ui.werkzeug === 'stift' && e.altKey) {
        setzeAktiv(ansicht, umwandeln(aktuell(), i), [i]);
      } else if (knotenEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'minus')) {
        if (kannLoeschen(aktuell(), i)) setzeAktiv(ansicht, loeschen(aktuell(), i), []);
        else ui.zeigeHinweis('Achspunkte bleiben – sie halten die Spiegelung');
      } else if (!knotenEl && kurveEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
        const t = naechsterAufProfil(aktuell(), lokal(e.clientX, e.clientY));
        if (t) {
          const r = einfuegen(aktuell(), t.segment, t.t);
          setzeAktiv(ansicht, r.profil, [r.index]);
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
      const basis = aktiveProfile();
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
      const basis = aktiveProfile();
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
    if (ui.ebene === 'maul') {
      const ed = useEditor.getState();
      const { lippen, zustand } = aktuelleLippen(ed.dok, ed.modus);
      const eintraege: { label: string; aktion: () => void; aus?: boolean }[] = [];
      if (lippen && zustand === 'zu') {
        eintraege.push(
          lippen.unten
            ? { label: 'Kiefer gleich (eine Linie)', aktion: () => setzeLippen('zu', { oben: lippen.oben }) }
            : { label: 'Kiefer getrennt (Ober- und Unterkiefer)', aktion: () => setzeLippenImUmriss({ oben: lippen.oben, unten: versetzt3(lippen.oben, -0.012) }) },
        );
      }
      if (lippen) eintraege.push({ label: 'Maul löschen', aktion: () => useEditor.getState().setzeMaul(null) });
      eintraege.push({ label: 'Ansicht zurücksetzen', aktion: () => useUi.getState().ansichtZuruecksetzen(ansicht) });
      ui.oeffneMenue({ x: e.clientX, y: e.clientY, eintraege });
      return;
    }
    if (ui.ebene !== 'form') {
      ui.oeffneMenue({ x: e.clientX, y: e.clientY, eintraege: [{ label: 'Ansicht zurücksetzen', aktion: () => useUi.getState().ansichtZuruecksetzen(ansicht) }] });
      return;
    }
    const ziel = e.target as Element;
    const knotenEl = ziel.closest('[data-knoten]');
    const kurveEl = ziel.closest('[data-kurve]');
    const setze = (p: Profil, indizes: number[]) => setzeAktiv(ansicht, p, indizes);
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
    <svg ref={svgRef} className={`view2d werkzeug-${werkzeug} ebene-${ebene}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} onPointerDown={unten} onContextMenu={kontext} onAuxClick={(e) => e.preventDefault()}>
      <defs>
        <linearGradient id={verlaufId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <rect className="kachel" x={Math.min(k0.x, k1.x)} y={Math.min(k0.y, k1.y)} width={Math.abs(k1.x - k0.x)} height={Math.abs(k1.y - k0.y)} fill={seitlich ? `url(#${verlaufId})` : 'rgba(0,0,0,0.1)'} />
      {achse && profil.art === 'halb' && (profil.achse === 'senkrecht' ? <line className="achse" x1={achse.x} y1={0} x2={achse.x} y2={h} /> : <line className="achse" x1={0} y1={achse.y} x2={w} y2={achse.y} />)}
      {ueber?.bild && (() => {
        const a = bild({ x: ueber.bild.x0, y: ueber.bild.y0 });
        const b = bild({ x: ueber.bild.x1, y: ueber.bild.y1 });
        return <image href={ueber.bild.url} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} preserveAspectRatio="none" pointerEvents="none" />;
      })()}
      {offen ? (
        <g className="offener-umriss" data-offener-umriss={offen.length}>
          {/* geschlossene Grundform blass dahinter, davor der Umriss des geöffneten Körpers */}
          <path d={pfad(vollerPfad(profil), true)} fill="none" stroke="var(--kurve-spiegel)" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="5 4" />
          {offen.map((z, i) => (
            <path key={i} d={z.map((p, k) => { const q = bild(p); return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join('') + 'Z'} fill="none" stroke="var(--kurve)" strokeWidth={KONTUR} strokeLinejoin="round" />
          ))}
        </g>
      ) : (
        <>
          {profil.art === 'halb' && <path d={pfad(gespiegelteSegmente(profil), false)} fill="none" stroke="var(--kurve-spiegel)" strokeWidth={KONTUR} strokeLinejoin="round" />}
          {spalt && maulZu?.unten ? (
            <g data-maulspalt="">
              <path d={pfad(spalt.segmente, false)} fill="none" stroke="var(--kurve)" strokeWidth={KONTUR} strokeLinejoin="round" strokeLinecap="round" />
              {[maulZu.oben, maulZu.unten].map((l, i) => (
                <path
                  key={i}
                  d={abtasten3(l, 16).map((p, k) => { const q = bild({ x: p[0], y: p[1] }); return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join('')}
                  fill="none"
                  stroke="var(--kurve)"
                  strokeWidth={KONTUR}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            </g>
          ) : (
            <path d={pfad(segmente(profil), profil.art === 'geschlossen')} fill="none" stroke="var(--kurve)" strokeWidth={KONTUR} strokeLinejoin="round" strokeLinecap="round" />
          )}
        </>
      )}
      {umwegPfade.spiegel && <path data-umweg="spiegel" d={umwegPfade.spiegel} fill="none" stroke="var(--kurve-spiegel)" strokeWidth={KONTUR} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
      {umwegPfade.eigen && <path data-umweg="eigen" d={umwegPfade.eigen} fill="none" stroke="var(--kurve)" strokeWidth={KONTUR} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
      {saumPfad && <path className="saum" data-saum="" d={saumPfad} fill="none" stroke="var(--saum)" strokeWidth={3} strokeOpacity={0.8} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
      {formAktiv && <path data-kurve="" d={pfad(segmente(profil), profil.art === 'geschlossen')} fill="none" stroke="transparent" strokeWidth={14} />}
      <WirbelZeichnung ansicht={ansicht} bild={bild} />
      <SchnittZeichnung ansicht={ansicht} bild={bild} />
      <RundZeichnung ansicht={ansicht} bild={bild} />
      <EckKantenZeichnung ansicht={ansicht} bild={bild} aktiv={formAktiv} />
      <KantenZeichnung ansicht={ansicht} bild={bild} aktiv={formAktiv} />
      <SpantQuerschnitte ansicht={ansicht} bild={bild} aktiv={formAktiv} />
      <SpantLinien ansicht={ansicht} bild={bild} aktiv={formAktiv} />
      <RundSpantLinien ansicht={ansicht} bild={bild} />
      {formAktiv && griffe}
      <WirbelPunkte ansicht={ansicht} bild={bild} />
      {formAktiv && profil.knoten.map((k, i) => {
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
      {(hatMaul || ebene === 'maul') && <MaulZeichnung ansicht={ansicht} bild={bild} aktiv={ebene === 'maul'} />}
      {ebene === 'maul' && <RundmaulZeichnung ansicht={ansicht} bild={bild} />}
      {ebene === 'posen' && <RigZeichnung ansicht={ansicht} bild={bild} />}
      {ebene === 'posen' && <KieferZeichnung ansicht={ansicht} bild={bild} w={w} h={h} />}
      {ebene === 'zaehne' && <ZahnZeichnung ansicht={ansicht} bild={bild} />}
      <BreitenKreis ansicht={ansicht} bild={bild} />
      {/* gewählter Spant der Bauweise „rund“ als Schnitt: über allem, damit seine Punkte greifbar bleiben */}
      <RundSpantSchnitt ansicht={ansicht} bild={bild} />
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
