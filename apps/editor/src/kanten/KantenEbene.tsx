// Kanten (Versuch 12.10. mittags, Florian): Linien überall in den 2D-Ansichten, im Form-Tab mit denselben Werkzeugen
// wie die Silhouetten (Zeichenstift auf freier Fläche beginnt eine Kante).
// - 1 px gestrichelt = mögliche Kante, Übergang ganz glatt; je härter, desto breiter und dunkler; schwarz 3 px = scharf.
// - Die Härte verläuft entlang der Linie; das Breitenwerkzeug ⇧W ändert sie direkt an der Linie (wie in Illustrator).
// - Knoten liegen auf der Fläche und bleiben beim Ziehen darauf, in jeder Ansicht.
// - Die rechte Seite (z ≥ 0) ist dunkel, die gespiegelte weiß (wie bei den Profilen); verdeckte Teile blass.

import type { Ansicht, Blick, Dokument, Kante, V2, V3T } from '@ee/shape';
import { ausAnsicht2, eckKanten, einfuegen3, glatteLinie, griffZiehen3, inAnsicht2, naechsterInAnsicht } from '@ee/shape/versuch';
import { useEffect } from 'react';
import { useEditor } from '../state/editorStore';
import { blickVon, useUi } from '../state/uiStore';
import { haerteBei, kantenProben, kantenPunkt, kantenPunktStetig, sichtbar } from './kantenFlaeche';

const PUNKT_R = 5;
const GRIFF = 6;
/** unter dieser Härte gilt die Kante als glatt: gestrichelt 1 px */
export const GLATT = 0.03;
/** Breitenwerkzeug: so viele Bildpunkte Abstand zur Linie entsprechen 100 % Härte */
const BREITE_PX = 28;

export const strichBreite = (h: number) => 1 + 2 * h;
/** Grau → Schwarz (rechte Seite) */
export const dunkel = (h: number) => {
  const v = Math.round(112 * (1 - h));
  return `rgb(${v},${v + 8},${v + 14})`;
};
const weiss = (h: number) => `rgba(255,255,255,${(0.5 + 0.5 * h).toFixed(2)})`;

const spiegel = (p: V3T): V3T => [p[0], p[1], -p[2]];
const prozent = (h: number) => `${Math.round(h * 100)} %`;

/** Proben gemerkt je Linie (Objektidentität). */
const probenSpeicher = new WeakMap<Kante, ReturnType<typeof kantenProben>>();
const proben = (k: Kante) => {
  let p = probenSpeicher.get(k);
  if (!p) {
    p = kantenProben(k);
    probenSpeicher.set(k, p);
  }
  return p;
};

type Strich = { a: V2; b: V2; h: number; sichtbar: boolean; rechts: boolean };

function striche(dok: Dokument, k: Kante | readonly { p: V3T; h: number }[], ansicht: Ansicht, blick: Blick, bild: (p: V2) => V2, gespiegelt: boolean): Strich[] {
  const roh = 'knoten' in k ? proben(k) : k;
  const ps = roh.map(({ p, h }) => {
    const pp = gespiegelt ? spiegel(p) : p;
    return { q: bild(inAnsicht2(pp, ansicht)), h, vis: sichtbar(dok, blick, pp), z: pp[2] };
  });
  const out: Strich[] = [];
  for (let i = 0; i + 1 < ps.length; i++) {
    const a = ps[i]!;
    const b = ps[i + 1]!;
    out.push({ a: a.q, b: b.q, h: (a.h + b.h) / 2, sichtbar: a.vis && b.vis, rechts: a.z + b.z >= -2e-4 });
  }
  return out;
}

/**
 * Strichmuster nach Härte (Recherche 12.10.: Muster in Bildschirm-Pixeln, zoomfest; „längere Striche = sicherer“):
 * 0 % gestrichelt 6/3, mit wachsender Härte längere Striche und kürzere Lücken, ab 25 % durchgezogen.
 */
export function strichMuster(h: number): string | undefined {
  if (h < GLATT) return '6 3';
  if (h < 0.12) return '10 2.5';
  if (h < 0.25) return '18 1.5';
  return undefined;
}

/**
 * Striche zeichnen: Läufe mit gleichem Muster, gleicher Sichtbarkeit und Seite als ein Pfad (durchgehendes Muster),
 * je Abschnitt Breite (1 → 3 px) und Grauwert nach der Härte.
 */
function StrichBild({ s }: { s: Strich[] }) {
  const teile: React.ReactNode[] = [];
  let lauf: Strich[] = [];
  const lauffertig = () => {
    if (!lauf.length) return;
    const f = lauf[0]!;
    const muster = strichMuster(f.h);
    if (muster) {
      // gestrichelt: ein Pfad, Breite und Grau aus der mittleren Härte des Laufs
      const h = lauf.reduce((a, x) => a + x.h, 0) / lauf.length;
      const d = `M${f.a.x.toFixed(1)} ${f.a.y.toFixed(1)}` + lauf.map((x) => `L${x.b.x.toFixed(1)} ${x.b.y.toFixed(1)}`).join('');
      teile.push(<path key={`g${teile.length}`} d={d} fill="none" stroke={f.rechts ? dunkel(h) : weiss(h)} strokeWidth={strichBreite(h)} strokeDasharray={muster} opacity={f.sichtbar ? 1 : 0.25} />);
    } else {
      for (const x of lauf) {
        teile.push(
          <line
            key={`h${teile.length}`}
            x1={x.a.x}
            y1={x.a.y}
            x2={x.b.x}
            y2={x.b.y}
            stroke={x.rechts ? dunkel(x.h) : weiss(x.h)}
            strokeWidth={strichBreite(x.h)}
            strokeLinecap="round"
            opacity={x.sichtbar ? 1 : 0.25}
          />,
        );
      }
    }
    lauf = [];
  };
  for (const x of s) {
    const f = lauf[0];
    if (f && (strichMuster(f.h) !== strichMuster(x.h) || f.sichtbar !== x.sichtbar || f.rechts !== x.rechts)) lauffertig();
    lauf.push(x);
  }
  lauffertig();
  return <>{teile}</>;
}

/** Kante aus einer Ecke einer Silhouette (abgeleitet, nicht einzeln bearbeitbar): 3D-Punkte der rechten Hälfte. */
export type EckKante = { quelle: { ansicht: Ansicht; knoten: number }; punkte: readonly V3T[]; haerte: readonly number[] };

let eckZuletzt: { profile: Dokument['profile']; spanten: Dokument['spanten']; haupt: number | undefined; kanten: EckKante[] } | null = null;
/** Ecken-Kanten des Dokuments (Geometrie-Versuch `eckKanten`, ≈ 1 ms), gemerkt je Profile und Spanten. */
export function eckKantenVon(dok: Dokument): EckKante[] {
  if (eckZuletzt?.profile !== dok.profile || eckZuletzt.spanten !== dok.spanten || eckZuletzt.haupt !== dok.hauptspant) {
    eckZuletzt = { profile: dok.profile, spanten: dok.spanten, haupt: dok.hauptspant, kanten: eckKanten(dok) };
  }
  return eckZuletzt.kanten;
}

/**
 * Ecken der Silhouetten als Kanten in den anderen Ansichten (Florian 12.10.: „Wenn ich mit den Handles der Silhouetten
 * eine Ecke bilde, sollte diese als Kante in den anderen Ansichten erkennbar sein“). Ein Klick wählt die Ecke in ihrer
 * Ansicht.
 */
export function EckKantenZeichnung({ ansicht, bild, aktiv: aktivTab }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  const dok = useEditor((s) => s.dok);
  const kanten = eckKantenVon(dok);
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const sicht = useUi((s) => s.kantenSicht);
  const aktiv = aktivTab && sicht === 'zeigen';
  const eigene = kanten.map((e, i) => ({ e, i })).filter(({ e }) => e.quelle.ansicht !== ansicht);
  if (!eigene.length || sicht === 'aus') return null;
  return (
    <g className="eckkanten" opacity={sicht === 'blass' ? 0.35 : 1}>
      {eigene.map(({ e, i }) => {
        const pr = e.punkte.map((p, j) => ({ p: [...p] as V3T, h: e.haerte[j] ?? 1 }));
        return (
          <g key={i} data-eckkante={i}>
            <g pointerEvents="none">
              {ansicht !== 'seite' && <StrichBild s={striche(dok, pr, ansicht, blick, bild, true)} />}
              <StrichBild s={striche(dok, pr, ansicht, blick, bild, false)} />
            </g>
            {aktiv && (
              <path
                d={pr.map(({ p }, j) => { const q = bild(inAnsicht2(p, ansicht)); return `${j ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join('')}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                onPointerDown={(ev) => {
                  // Ecke in ihrer Ansicht wählen (Härte dort über Regler oder ⇧W)
                  ev.stopPropagation();
                  useUi.getState().waehle(e.quelle.ansicht, [e.quelle.knoten]);
                  useUi.getState().zeigeHinweis('Kante aus einer Ecke: Härte über die Seitenleiste oder ⇧W an der Ecke');
                }}
              >
                <title>Kante aus einer Ecke der Ansicht „{e.quelle.ansicht}“</title>
              </path>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Größte Tiefe im Regler (Kachel), ±14 px in der Grundansicht. */
export const TIEFE_MAX = 0.03;

/**
 * Tiefe einer Kante als Licht und Schatten: Ein Grat (+) fängt Licht (heller Hof), eine Rinne (−) liegt im Schatten
 * (dunkler Hof). Stärke nach dem Betrag.
 */
function TiefenHof({ k, ansicht, bild }: { k: Kante; ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const t = k.tiefe ?? 0;
  const a = Math.min(1, Math.abs(t) / TIEFE_MAX);
  const kopien = ansicht === 'seite' ? [false] : [false, true];
  return (
    <>
      {kopien.map((sp) => (
        <path
          key={String(sp)}
          d={proben(k)
            .map(({ p }, i) => {
              const q = bild(inAnsicht2(sp ? spiegel(p) : p, ansicht));
              return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
            })
            .join('')}
          fill="none"
          stroke={t > 0 ? '#ffffff' : '#19232b'}
          strokeOpacity={0.25 + 0.4 * a}
          strokeWidth={4 + 6 * a}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

/** Tiefe der gewählten Kante setzen (0 = auf der Fläche). */
export function tiefeSetzen(t: number) {
  const a = useUi.getState().kantenAuswahl;
  const k = a ? kanten()[a.kante] : undefined;
  if (!a || !k) return;
  const v = Math.max(-TIEFE_MAX, Math.min(TIEFE_MAX, t));
  const neu: Kante = { ...k };
  if (Math.abs(v) < 1e-5) delete neu.tiefe;
  else neu.tiefe = v;
  setzeKante(a.kante, neu);
}

/** Kantenlinien einer Ansicht; im Form-Tab mit Knoten, Griffen und Trefferflächen. */
export function KantenZeichnung({ ansicht, bild, aktiv: aktivTab }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  const dok = useEditor((s) => s.dok);
  // Ebenenschalter: blass = nur zur Orientierung (nicht greifbar), aus = verborgen (außer beim Zeichnen)
  const sicht = useUi((s) => s.kantenSicht);
  const aktiv = aktivTab && sicht === 'zeigen';
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const auswahl = useUi((s) => s.kantenAuswahl);
  const zeichnen = useUi((s) => s.kanteZeichnen);
  // beim Breitenwerkzeug zeigt der Kreis die Zahl
  const breite = useUi((s) => s.breitenAnzeige?.ansicht === ansicht);
  const kanten = sicht === 'aus' ? [] : (dok.kanten ?? []);
  if (!kanten.length && !zeichnen) return null;
  const zug = (pts: V2[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join('');
  return (
    <g className={aktiv ? 'kanten aktiv' : 'kanten'} pointerEvents={aktiv ? 'auto' : 'none'} opacity={sicht === 'blass' ? 0.35 : 1}>
      {kanten.map((k, ki) => (
        <g key={ki} data-kante={ki} pointerEvents="none">
          {k.tiefe ? <TiefenHof k={k} ansicht={ansicht} bild={bild} /> : null}
          {ansicht !== 'seite' && <StrichBild s={striche(dok, k, ansicht, blick, bild, true)} />}
          <StrichBild s={striche(dok, k, ansicht, blick, bild, false)} />
        </g>
      ))}
      {aktiv &&
        kanten.map((k, ki) => {
          const pts = proben(k);
          const sichtbarAnteil = pts.filter(({ p }) => sichtbar(dok, blick, p)).length / pts.length;
          if (sichtbarAnteil < 0.5) return null;
          return <path key={`t${ki}`} data-kantenlinie={ki} d={zug(pts.map(({ p }) => bild(inAnsicht2(p, ansicht))))} fill="none" stroke="transparent" strokeWidth={12} />;
        })}
      {aktiv &&
        kanten.map((k, ki) => {
          const gewaehlt = auswahl?.kante === ki ? auswahl.indizes : [];
          return (
            <g key={`k${ki}`}>
              {gewaehlt.map((i) => {
                const kn = k.knoten[i];
                if (!kn) return null;
                const p = bild(inAnsicht2(kn.p, ansicht));
                return (['ein', 'aus'] as const).map((seite) => {
                  const rel = kn[seite];
                  if (Math.hypot(...rel) < 1e-6) return null;
                  const q = bild(inAnsicht2([kn.p[0] + rel[0], kn.p[1] + rel[1], kn.p[2] + rel[2]], ansicht));
                  return (
                    <g key={`${i}-${seite}`} data-kantengriff={`${ki}:${i}:${seite}`} className="griff">
                      <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--punkt)" strokeWidth={1} />
                      <rect x={q.x - 8} y={q.y - 8} width={16} height={16} fill="transparent" />
                      <rect x={q.x - GRIFF / 2} y={q.y - GRIFF / 2} width={GRIFF} height={GRIFF} fill="var(--punkt)" />
                    </g>
                  );
                });
              })}
              {k.knoten.map((kn, i) => {
                const q = bild(inAnsicht2(kn.p, ansicht));
                const vis = sichtbar(dok, blick, kn.p);
                const sel = gewaehlt.includes(i);
                // Härte als Zahl: an einzeln gewählten Punkten; ganze Linie gewählt: einmal in der Mitte
                const ganz = gewaehlt.length === k.knoten.length && k.knoten.length > 2;
                const zeigeWert = sel && !breite && (!ganz || i === Math.floor((k.knoten.length - 1) / 2));
                if (!vis) return <circle key={i} cx={q.x} cy={q.y} r={3} fill="var(--punkt)" opacity={0.3} pointerEvents="none" />;
                return (
                  <g key={i} data-kantenknoten={`${ki}:${i}`} className={sel ? 'knoten gewaehlt' : 'knoten'}>
                    <circle cx={q.x} cy={q.y} r={10} fill="transparent" />
                    <circle className="kanten-punkt" cx={q.x} cy={q.y} r={PUNKT_R} fill="var(--punkt)" stroke={sel ? '#ffffff' : 'none'} strokeWidth={2} />
                    {zeigeWert && (
                      <text className="kanten-wert" x={q.x + 9} y={q.y - 9}>
                        {prozent(k.haerte[i] ?? 0)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      {zeichnen && zeichnen.ansicht === ansicht && zeichnen.blick === blick && zeichnen.knoten.length > 0 && (
        <g className="kante-zeichnen" pointerEvents="none">
          <path d={zug(zeichnen.knoten.map((p) => bild(inAnsicht2(p, ansicht))))} fill="none" stroke={dunkel(0)} strokeWidth={1} strokeDasharray="6 3" />
          {zeichnen.knoten.map((p, i) => {
            const q = bild(inAnsicht2(p, ansicht));
            return <circle key={i} cx={q.x} cy={q.y} r={PUNKT_R} fill="var(--punkt)" />;
          })}
        </g>
      )}
    </g>
  );
}

// ---------- Bedienung ----------

export type KantenKontext = {
  ansicht: Ansicht;
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
  /** Bildpunkt aus Weltpunkt (für Abstände in px beim Breitenwerkzeug) */
  bild: (p: V2) => V2;
};

const kanten = () => useEditor.getState().dok.kanten ?? [];
function setzeKante(i: number, k: Kante) {
  const liste = kanten().slice();
  liste[i] = k;
  useEditor.getState().setzeKanten(liste);
}

/** Neue Linie abschließen (mindestens zwei Punkte): glatt durch die Punkte, Härte 0 = mögliche Kante. */
export function kanteZeichnenBeenden(abbrechen = false) {
  const ui = useUi.getState();
  const z = ui.kanteZeichnen;
  if (!z) return;
  ui.setzeKanteZeichnen(null);
  if (abbrechen || z.knoten.length < 2) return;
  const k: Kante = { ...glatteLinie(z.knoten), haerte: z.knoten.map(() => 0), blick: z.blick };
  const liste = [...kanten(), k];
  useEditor.getState().setzeKanten(liste);
  ui.setzeKantenAuswahl({ kante: liste.length - 1, indizes: k.knoten.map((_, i) => i) });
}

/** Gewählte Knoten löschen; bleibt weniger als zwei, verschwindet die Linie. true = es gab eine Auswahl. */
export function kantenKnotenLoeschen(): boolean {
  const ui = useUi.getState();
  const a = ui.kantenAuswahl;
  if (!a) return false;
  const liste = kanten().slice();
  const k = liste[a.kante];
  if (!k) return false;
  const bleiben = k.knoten.map((_, i) => i).filter((i) => !a.indizes.includes(i));
  if (bleiben.length < 2) liste.splice(a.kante, 1);
  else liste[a.kante] = { ...k, knoten: bleiben.map((i) => k.knoten[i]!), haerte: bleiben.map((i) => k.haerte[i] ?? 0) };
  useEditor.getState().setzeKanten(liste);
  ui.setzeKantenAuswahl(null);
  return true;
}

/** Härte der gewählten Knoten setzen (ganze Linie gewählt = alle Knoten). */
export function haerteSetzen(h: number) {
  const a = useUi.getState().kantenAuswahl;
  const k = a ? kanten()[a.kante] : undefined;
  if (!a || !k) return;
  const v = Math.min(1, Math.max(0, h));
  setzeKante(a.kante, { ...k, haerte: k.haerte.map((x, i) => (a.indizes.includes(i) ? v : x)) });
}

/** Kante weich auslaufen lassen: Enden 0, innen die bisherige höchste Härte. */
export function kanteAuslaufen() {
  const a = useUi.getState().kantenAuswahl;
  const k = a ? kanten()[a.kante] : undefined;
  if (!a || !k) return;
  const n = k.knoten.length;
  const h = Math.max(...k.haerte, 0.6);
  setzeKante(a.kante, { ...k, haerte: k.knoten.map((_, i) => (i === 0 || i === n - 1 ? 0 : h)) });
}

/**
 * Zeiger im Form-Tab für die Kanten; true = verarbeitet (sonst übernimmt die Profil-Bedienung).
 * Reihenfolge wie in Illustrator: laufender Zeichenstift, Breitenwerkzeug, Stift/+/− an Kanten, Direktauswahl.
 */
export function kantenZeiger(e: React.PointerEvent, ctx: KantenKontext): boolean {
  const ui = useUi.getState();
  const ed = useEditor.getState();
  const blick = blickVon(ctx.ansicht, ui.blick);
  const q = ctx.lokal(e.clientX, e.clientY);
  const ziel = e.target as Element;
  const profilZiel = !!ziel.closest('[data-knoten],[data-griff],[data-kurve]');
  // Ebenenschalter: blass oder aus = Kanten gesperrt
  if (ui.kantenSicht !== 'zeigen' && !ui.kanteZeichnen) {
    if (ui.werkzeug === 'stift' && !profilZiel) ui.zeigeHinweis('Kanten sind gesperrt (Seitenleiste: Kanten zeigen)');
    return ui.werkzeug === 'stift' && !profilZiel;
  }

  // laufender Zeichenstift: jeder Klick ein Punkt auf der Fläche, Doppelklick beendet
  if (ui.kanteZeichnen) {
    if (ui.kanteZeichnen.ansicht !== ctx.ansicht || ui.kanteZeichnen.blick !== blick) {
      ui.zeigeHinweis('Die Kante in derselben Ansicht beenden (Enter)');
      return true;
    }
    if (e.detail >= 2) {
      kanteZeichnenBeenden();
      return true;
    }
    const p = kantenPunkt(ed.dok, blick, q);
    if (p) ui.setzeKanteZeichnen({ ...ui.kanteZeichnen, knoten: [...ui.kanteZeichnen.knoten, p] });
    return true;
  }

  const knotenEl = ziel.closest('[data-kantenknoten]');
  const griffEl = ziel.closest('[data-kantengriff]');
  const linieEl = ziel.closest('[data-kantenlinie]');

  // Breitenwerkzeug: Punkt greifen und ziehen; der Abstand zum Punkt ist die Härte (Kreis zeigt sie), wie ein Band,
  // das man aufzieht. Zwischen Knoten entsteht ein neuer Knoten.
  if (ui.werkzeug === 'breite') {
    const ki = knotenEl ? Number(knotenEl.getAttribute('data-kantenknoten')!.split(':')[0]) : linieEl ? Number(linieEl.getAttribute('data-kantenlinie')) : -1;
    const k = kanten()[ki];
    if (!k) {
      if (!profilZiel) ui.zeigeHinweis('Breitenwerkzeug: an einer Kante oder Ecke ziehen');
      return !profilZiel;
    }
    const t = naechsterInAnsicht(k, ctx.ansicht, q);
    if (!t) return true;
    let linie = k;
    let index = t.t < 0.12 ? t.segment : t.t > 0.88 ? t.segment + 1 : -1;
    if (index < 0) {
      const r = einfuegen3(k, t.segment, t.t);
      const haerte = k.haerte.slice();
      haerte.splice(r.index, 0, haerteBei(k, t.segment, t.t));
      linie = { ...k, knoten: r.linie.knoten, haerte };
      index = r.index;
    }
    ed.beginGeste();
    setzeKante(ki, linie);
    ui.setzeKantenAuswahl({ kante: ki, indizes: [index] });
    const mitte = inAnsicht2(linie.knoten[index]!.p, ctx.ansicht);
    breiteZiehen(e, ctx, mitte, linie.haerte[index] ?? 0, (h) => {
      const jetzt = kanten()[ki];
      if (jetzt) setzeKante(ki, { ...jetzt, haerte: jetzt.haerte.map((x, i) => (i === index ? h : x)) });
    });
    return true;
  }

  // Zeichenstift, + und − an Kanten; Stift auf freier Fläche beginnt eine neue Kante
  if (ui.werkzeug !== 'auswahl' && !e.metaKey) {
    if (knotenEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'minus')) {
      const [ki, i] = knotenEl.getAttribute('data-kantenknoten')!.split(':').map(Number) as [number, number];
      ui.setzeKantenAuswahl({ kante: ki, indizes: [i] });
      kantenKnotenLoeschen();
      return true;
    }
    if (!knotenEl && linieEl && (ui.werkzeug === 'stift' || ui.werkzeug === 'plus')) {
      const ki = Number(linieEl.getAttribute('data-kantenlinie'));
      const k = kanten()[ki];
      const t = k ? naechsterInAnsicht(k, ctx.ansicht, q) : null;
      if (k && t) {
        const r = einfuegen3(k, t.segment, t.t);
        const haerte = k.haerte.slice();
        haerte.splice(r.index, 0, haerteBei(k, t.segment, t.t));
        setzeKante(ki, { ...k, knoten: r.linie.knoten, haerte });
        ui.setzeKantenAuswahl({ kante: ki, indizes: [r.index] });
      }
      return true;
    }
    if (ui.werkzeug === 'stift' && !profilZiel && !knotenEl && !linieEl) {
      const p = kantenPunkt(ed.dok, blick, q);
      if (p) {
        ui.auswahlLeeren();
        ui.setzeKanteZeichnen({ ansicht: ctx.ansicht, blick, knoten: [p] });
      }
      return true;
    }
    return false;
  }

  if (profilZiel) {
    if (ui.kantenAuswahl) ui.setzeKantenAuswahl(null);
    return false;
  }

  if (griffEl) {
    const [kiS, iS, seite] = griffEl.getAttribute('data-kantengriff')!.split(':') as [string, string, 'ein' | 'aus'];
    const ki = Number(kiS);
    const i = Number(iS);
    let brechen = e.altKey;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        brechen ||= ev.altKey;
        const k = kanten()[ki];
        if (k) setzeKante(ki, { ...k, knoten: griffZiehen3(k, i, seite, ctx.ansicht, ctx.lokal(ev.clientX, ev.clientY), brechen).knoten });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (knotenEl || linieEl) {
    // Knoten: Klick wählt (⇧ schaltet um); Linie: Klick wählt die ganze Linie. Ziehen bewegt die Auswahl auf der Fläche.
    let ki: number;
    let sel: number[];
    if (knotenEl) {
      const [kk, i] = knotenEl.getAttribute('data-kantenknoten')!.split(':').map(Number) as [number, number];
      ki = kk;
      const bisher = ui.kantenAuswahl?.kante === ki ? ui.kantenAuswahl.indizes : [];
      sel = e.shiftKey ? (bisher.includes(i) ? bisher.filter((x) => x !== i) : [...bisher, i]) : bisher.includes(i) ? bisher : [i];
    } else {
      ki = Number(linieEl!.getAttribute('data-kantenlinie'));
      sel = (kanten()[ki]?.knoten ?? []).map((_, i) => i);
    }
    ui.auswahlLeeren();
    ui.setzeKantenAuswahl(sel.length ? { kante: ki, indizes: sel } : null);
    const basis = kanten()[ki];
    if (!basis || !sel.length) return true;
    const start = q;
    ed.beginGeste();
    ctx.ziehen(
      e,
      (ev) => {
        const p = ctx.lokal(ev.clientX, ev.clientY);
        const d = { x: p.x - start.x, y: p.y - start.y };
        const dok = useEditor.getState().dok;
        const knoten = basis.knoten.map((kn, i) => {
          if (!sel.includes(i)) return kn;
          const z2 = inAnsicht2(kn.p, ctx.ansicht);
          const ziel2 = { x: z2.x + d.x, y: z2.y + d.y };
          const neu = kantenPunktStetig(dok, ctx.ansicht, ziel2, kn.p) ?? ausAnsicht2(kn.p, ctx.ansicht, ziel2);
          return { ...kn, p: neu };
        });
        setzeKante(ki, { ...basis, knoten });
      },
      () => useEditor.getState().endeGeste(),
    );
    return true;
  }

  if (ui.kantenAuswahl) ui.setzeKantenAuswahl(null);
  return false;
}

/**
 * Breitenwerkzeug ziehen (Kanten und Ecken): Nach den ersten Bildpunkten gilt der Abstand vom Punkt als Härte
 * (0 am Punkt, 100 % bei BREITE_PX); ein Kreis um den Punkt zeigt sie. Ohne Bewegung bleibt die Härte.
 */
export function breiteZiehen(e: React.PointerEvent, ctx: KantenKontext, mitte: V2, h0: number, setzen: (h: number) => void) {
  const ui = useUi.getState();
  const rahmen = (e.currentTarget as Element).getBoundingClientRect();
  const qm = ctx.bild(mitte);
  const start = { x: e.clientX, y: e.clientY };
  let bewegt = false;
  ui.setzeBreitenAnzeige({ ansicht: ctx.ansicht, mitte, h: h0 });
  ctx.ziehen(
    e,
    (ev) => {
      if (!bewegt && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 3) return;
      bewegt = true;
      const d = Math.hypot(ev.clientX - rahmen.left - qm.x, ev.clientY - rahmen.top - qm.y);
      const h = Math.min(1, Math.max(0, d / BREITE_PX));
      setzen(h);
      useUi.getState().setzeBreitenAnzeige({ ansicht: ctx.ansicht, mitte, h });
    },
    () => {
      useUi.getState().setzeBreitenAnzeige(null);
      useEditor.getState().endeGeste();
    },
  );
}

/** Kreis des Breitenwerkzeugs: Radius = Härte (bis BREITE_PX), mit Prozentzahl. */
export function BreitenKreis({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const b = useUi((s) => s.breitenAnzeige);
  if (!b || b.ansicht !== ansicht) return null;
  const q = bild(b.mitte);
  const r = Math.max(2, b.h * BREITE_PX);
  return (
    <g className="breiten-kreis" pointerEvents="none">
      <circle cx={q.x} cy={q.y} r={BREITE_PX} fill="none" stroke="#19232b" strokeOpacity={0.25} strokeDasharray="2 3" />
      <circle cx={q.x} cy={q.y} r={r} fill="rgba(25,35,43,0.10)" stroke={dunkel(b.h)} strokeWidth={strichBreite(b.h)} strokeDasharray={strichMuster(b.h)} />
      <text className="kanten-wert" x={q.x + BREITE_PX + 4} y={q.y + 4}>
        {prozent(b.h)}
      </text>
    </g>
  );
}

/** Enter beendet eine neue Kante, Esc bricht ab (weniger als zwei Punkte) oder beendet sie. */
export function useKantenTasten() {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      if (!ui.kanteZeichnen) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        kanteZeichnenBeenden();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        kanteZeichnenBeenden((ui.kanteZeichnen?.knoten.length ?? 0) < 2);
      }
    };
    window.addEventListener('keydown', taste, true);
    return () => window.removeEventListener('keydown', taste, true);
  }, []);
}

/** Gewählte Kante mit Auswahl (Seitenleiste). */
export function useGewaehlteKante() {
  const a = useUi((s) => s.kantenAuswahl);
  const k = useEditor((s) => (a ? s.dok.kanten?.[a.kante] : undefined));
  return a && k ? { a, k } : null;
}
