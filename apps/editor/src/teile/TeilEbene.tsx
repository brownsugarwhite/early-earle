// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“ (nur Anzeige): die Teile, die der Worker aus den drei
// Zeichnungen liest (`WesenNetz.teile`), in jedem Blatt — Flächen je Teil (blass, unter allem), verdeckte Teilumrisse
// gestrichelt (die Bauchlinien unter der Nase im Top), Wirbelsäulen dünn mit Knoten. Zeiger über einer Wirbelsäule hebt
// das Teil in allen Blättern und in der Tafel hervor. Profil-Einheiten wie das Liniennetz (`bild` nimmt sie direkt).
import type { Ansicht, Blick, Knoten, TeilKurve, V2 } from '@ee/shape';
import { type TeilAnzeige, teilKurveAus, teilKurveKnoten, teilKurveMitKnoten, teilKurveStuecke } from '@ee/shape/kern';
import { inAnsicht2 } from '@ee/shape/versuch';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { blickVon, useUi } from '../state/uiStore';

/** Farbe je Teil (Rumpf grau, dann kräftige, gut unterscheidbare Töne) */
/**
 * Teilfarben warm (Plan 20.10., V2): Blau, Lila und Türkis heißen im Blatt nur noch „Umriss von Seite, Front, Top“; der
 * Rumpf bleibt grau.
 */
export const TEIL_FARBE = ['#8e9aa6', '#e4572e', '#e8a33d', '#a0522d', '#c97b2a', '#c0392b', '#b8860b', '#7a5230'];
export const teilFarbe = (i: number) => TEIL_FARBE[i % TEIL_FARBE.length]!;

/** Teile des aktuellen Netzes, wenn sie gezeigt werden sollen (Bauweise Kern, Grundform, Stufe Körper, Schalter an). */
export function useTeile(): TeilAnzeige | null {
  useNetzStand((s) => s.version);
  const modus = useEditor((s) => s.modus);
  const bauweise = useUi((s) => s.bauweise);
  const ebene = useUi((s) => s.ebene);
  const sicht = useUi((s) => s.teileSicht);
  if (bauweise !== 'kern' || modus !== 'editor' || ebene !== 'form' || sicht === 'aus') return null;
  return aktuellesNetz()?.netz.teile ?? null;
}

/** Name der Ansicht in den Teil-Ansichten (Front/Back, Top/Bottom nach dem Blick des Blatts). */
function ansichtName(ansicht: Ansicht, blick: Blick): 'seite' | 'front' | 'hinten' | 'top' | 'unten' {
  if (ansicht === 'seite') return 'seite';
  return blick === 'hinten' ? 'hinten' : blick === 'unten' ? 'unten' : ansicht === 'front' ? 'front' : 'top';
}

/** Züge (x, y; NaN trennt) als SVG-Pfad. */
function zugPfad(z: Float32Array, bild: (p: V2) => V2, zu: boolean): string {
  let d = '';
  let neu = true;
  for (let i = 0; i + 1 < z.length; i += 2) {
    const x = z[i]!;
    if (!Number.isFinite(x)) {
      if (!neu && zu) d += 'Z';
      neu = true;
      continue;
    }
    const q = bild({ x, y: z[i + 1]! });
    d += `${neu ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    neu = false;
  }
  if (!neu && zu) d += 'Z';
  return d;
}

/** Bedienung aus dem Blatt (wie beim Liniennetz). */
export type TeilKontext = {
  lokal: (clientX: number, clientY: number) => V2;
  ziehen: (e: React.PointerEvent, bewegen: (ev: PointerEvent) => void, ende?: (ev: PointerEvent) => void) => void;
};

/** Züge (x, y; NaN trennt) als einzelne Punktlisten. */
function zuegeVon(z: Float32Array): V2[][] {
  const out: V2[][] = [];
  let lauf: V2[] = [];
  for (let i = 0; i + 1 < z.length; i += 2) {
    if (!Number.isFinite(z[i]!)) {
      if (lauf.length) out.push(lauf);
      lauf = [];
      continue;
    }
    lauf.push({ x: z[i]!, y: z[i + 1]! });
  }
  if (lauf.length) out.push(lauf);
  return out;
}

/** Die Ansicht der Zeichnung, in der eine eigene Kurve gespeichert wird (Back/Bottom zeigen Front/Top). */
const zeichnungVon = (ansicht: Ansicht): TeilKurve['ansicht'] => (ansicht === 'seite' ? 'seite' : ansicht === 'front' ? 'front' : 'top');

/** Hat das Teil in dieser Ansicht eine eigene Kurve? (dann ersetzt sie das geratene verdeckte Stück) */
function eigeneKurven(teile: readonly TeilKurve[] | undefined, id: string, ansicht: Ansicht): TeilKurve[] {
  return (teile ?? []).filter((k) => k.teil === id && k.ansicht === zeichnungVon(ansicht));
}

/** Klick auf ein geratenes verdecktes Stück: eigene Kurve anlegen (ein Undo-Schritt). */
function kurveAnlegen(ansicht: Ansicht, id: string, zug: V2[]) {
  const st = useEditor.getState();
  const k = teilKurveAus(st.dok, id, zeichnungVon(ansicht), zug);
  if (!k) return;
  st.setzeDokument({ ...st.dok, teile: [...(st.dok.teile ?? []), k] });
}

/** Verdeckte Stücke (geraten) je Teil als Bildpfade; ohne Teile mit eigener Kurve in dieser Ansicht. */
function verdecktePfade(t: TeilAnzeige, ansicht: Ansicht, blick: Blick, bild: (p: V2) => V2, dokTeile: readonly TeilKurve[] | undefined): { teil: number; id: string; k: number; zug: V2[]; d: string }[] {
  const a = t.ansichten[ansichtName(ansicht, blick)];
  const out: { teil: number; id: string; k: number; zug: V2[]; d: string }[] = [];
  for (const v of a.verdeckt) {
    const id = t.teile[v.teil]?.id ?? '';
    if (eigeneKurven(dokTeile, id, ansicht).length) continue;
    zuegeVon(v.zuege).forEach((zug, k) => {
      const d = zug.map((p, i) => {
        const q = bild(p);
        return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      }).join('');
      out.push({ teil: v.teil, id, k, zug, d });
    });
  }
  return out;
}

/** Wirbelsäulen je Teil als Bildpfade (Paare in Front/Top beidseitig) mit ihren Knoten. */
function achsenPfade(t: TeilAnzeige, ansicht: Ansicht, bild: (p: V2) => V2): { teil: number; id: string; s: number; d: string; knoten: V2[] }[] {
  const out: { teil: number; id: string; s: number; d: string; knoten: V2[] }[] = [];
  t.teile.forEach((teil, i) => {
    const seiten = teil.art === 'paar' && ansicht !== 'seite' ? [1, -1] : [1];
    for (const s of seiten) {
      const p = (arr: Float32Array, k: number) => bild(inAnsicht2([arr[k]!, arr[k + 1]!, arr[k + 2]! * s], ansicht));
      let d = '';
      for (let k = 0; k + 2 < teil.achse.length; k += 3) {
        const q = p(teil.achse, k);
        d += `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      }
      const knoten: V2[] = [];
      for (let k = 0; k + 2 < teil.knoten.length; k += 3) knoten.push(p(teil.knoten, k));
      out.push({ teil: i, id: teil.id, s, d, knoten });
    }
  });
  return out;
}

/** Flächen der sichtbaren Teile und verdeckte Teilumrisse (unter dem Liniennetz und der schwarzen Linie; nur Anzeige). */
export function TeilFlaechen({ ansicht, bild, umriss }: { ansicht: Ansicht; bild: (p: V2) => V2; umriss: string }) {
  const t = useTeile();
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const hover = useUi((s) => s.teilHover);
  const dokTeile = useEditor((s) => s.dok.teile);
  if (!t) return null;
  const a = t.ansichten[ansichtName(ansicht, blick)];
  const clipId = `teile-clip-${ansicht}`;
  const idVon = (i: number) => t.teile[i]?.id ?? '';
  return (
    <g className="teile" data-teile={t.teile.length} pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <path d={umriss} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {a.flaechen.map((f) => {
          const an = hover === idVon(f.teil);
          // Rumpf kaum getönt, Teile kräftig mit farbigem Rand (lesbar über dem gerenderten Körper im Blatt)
          return f.teil === 0 ? (
            <path key={`f${f.teil}`} data-teil-flaeche={idVon(f.teil)} d={zugPfad(f.zuege, bild, true)} fill={teilFarbe(0)} fillOpacity={an ? 0.3 : 0.08} fillRule="evenodd" />
          ) : (
            <path key={`f${f.teil}`} data-teil-flaeche={idVon(f.teil)} d={zugPfad(f.zuege, bild, true)} fill={teilFarbe(f.teil)} fillOpacity={an ? 0.55 : 0.34} fillRule="evenodd" stroke={teilFarbe(f.teil)} strokeOpacity={0.9} strokeWidth={an ? 2.5 : 1.5} strokeLinejoin="round" />
          );
        })}
      </g>
      {verdecktePfade(t, ansicht, blick, bild, dokTeile).map(({ teil, id, k, d }) => (
        <path key={`v${teil}.${k}`} data-teil-verdeckt={id} data-teil-stueck={`${id}:${k}`} d={d} fill="none" stroke={teilFarbe(teil)} strokeWidth={hover === id ? 2 : 1.25} strokeOpacity={hover === id ? 0.9 : 0.55} strokeDasharray="4 4" strokeLinecap="round" pointerEvents="none" />
      ))}
    </g>
  );
}

/**
 * Trefferflächen der Teile (Plan 20.10., V0): direkt unter der schwarzen Linie, den P-Linien und allen Knoten. Vorher lagen
 * die Wirbelsäulen mit einem unsichtbaren 10-px-Streifen über allem: An Teilspitzen setzte der Stift keinen Punkt, sondern
 * begann eine neue P-Linie, und ⇧W griff nicht. Zeiger über einer Wirbelsäule hebt das Teil hervor; ein geratenes verdecktes
 * Stück übernimmt ein Klick (Auswahlwerkzeug, Stufe Körper) als eigene Kurve.
 */
export function TeilTreffer({ ansicht, bild, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean }) {
  const t = useTeile();
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const werkzeug = useUi((s) => s.werkzeug);
  const dokTeile = useEditor((s) => s.dok.teile);
  if (!t) return null;
  const setze = useUi.getState().setzeTeilHover;
  const weg = (id: string) => useUi.getState().teilHover === id && setze(null);
  return (
    <g className="teil-treffer">
      {achsenPfade(t, ansicht, bild).map(({ id, s, d }) => (
        <path key={`a${id}${s}`} data-teil-achse-treffer={id} d={d} fill="none" stroke="transparent" strokeWidth={10} onPointerEnter={() => setze(id)} onPointerLeave={() => weg(id)} />
      ))}
      {aktiv &&
        werkzeug === 'auswahl' &&
        verdecktePfade(t, ansicht, blick, bild, dokTeile).map(({ id, k, zug, d }) => (
          <path
            key={`v${id}.${k}`}
            data-teil-verdeckt-treffer={`${id}:${k}`}
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={9}
            pointerEvents="stroke"
            style={{ cursor: 'copy' }}
            onPointerEnter={() => setze(id)}
            onPointerLeave={() => weg(id)}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              kurveAnlegen(ansicht, id, zug);
            }}
          >
            <title>Klick: als eigene Kurve übernehmen</title>
          </path>
        ))}
    </g>
  );
}

/** Pfad einer Kurve aus Knoten (Bézier), optional gespiegelt (Front: x, Top: y). */
function kurvenPfad(kn: readonly Knoten[], zu: boolean, bild: (p: V2) => V2, spiegel: (p: V2) => V2): string {
  const st = teilKurveStuecke(kn, zu);
  if (!st.length) return '';
  const q = (p: V2) => bild(spiegel(p));
  const f = (p: V2) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  return `M${f(q(st[0]![0]))}` + st.map(([, b, c, d]) => `C${f(q(b))} ${f(q(c))} ${f(q(d))}`).join('') + (zu ? 'Z' : '');
}

/**
 * Eigene Kurven der Teile (über der schwarzen Linie): die gezeichnete Hälfte mit Knoten (ziehen = ein Undo-Schritt), in
 * Front/Top dazu das Spiegelbild. Die Enden liegen auf den Stoßstellen mit der schwarzen Linie bzw. auf der Spiegelachse.
 */
export function TeilKurvenZeichnung({ ansicht, bild, aktiv, ctx }: { ansicht: Ansicht; bild: (p: V2) => V2; aktiv: boolean; ctx: TeilKontext }) {
  const t = useTeile();
  const dok = useEditor((s) => s.dok);
  const hover = useUi((s) => s.teilHover);
  if (!t || !dok.teile?.length) return null;
  const zeichnung = zeichnungVon(ansicht);
  const spiegeln = (p: V2): V2 => (zeichnung === 'front' ? { x: -p.x, y: p.y } : zeichnung === 'top' ? { x: p.x, y: -p.y } : p);
  const gleich = (p: V2) => p;
  return (
    <g className="teil-kurven">
      {dok.teile.map((k, ki) => {
        if (k.ansicht !== zeichnung) return null;
        const i = t.teile.findIndex((x) => x.id === k.teil);
        if (i < 0) return null;
        const farbe = teilFarbe(i);
        const kn = teilKurveKnoten(dok, k);
        const an = hover === k.teil;
        const ziehbar = (j: number) => aktiv && (k.zu || !k.a || (j > 0 && j < kn.length - 1));
        return (
          <g key={`k${ki}`} data-teil-kurve={k.teil} data-teil-kurve-ansicht={k.ansicht}>
            {zeichnung !== 'seite' && <path d={kurvenPfad(kn, !!k.zu, bild, spiegeln)} fill="none" stroke={farbe} strokeOpacity={0.55} strokeWidth={1.5} pointerEvents="none" />}
            <path d={kurvenPfad(kn, !!k.zu, bild, gleich)} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={an ? 5 : 4} pointerEvents="none" />
            <path d={kurvenPfad(kn, !!k.zu, bild, gleich)} fill="none" stroke={farbe} strokeWidth={an ? 3 : 2} pointerEvents="none" />
            {kn.map((q, j) => {
              const b = bild(q.p);
              return ziehbar(j) ? (
                <circle
                  key={j}
                  data-teil-kurve-knoten={j}
                  cx={b.x}
                  cy={b.y}
                  r={4.5}
                  fill={farbe}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'move' }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    const st = useEditor.getState();
                    st.beginGeste();
                    const basis = teilKurveKnoten(st.dok, k);
                    const start = ctx.lokal(e.clientX, e.clientY);
                    ctx.ziehen(
                      e,
                      (ev) => {
                        const p = ctx.lokal(ev.clientX, ev.clientY);
                        const neu = basis.map((x, m) => (m === j ? { ...x, p: { x: x.p.x + p.x - start.x, y: x.p.y + p.y - start.y } } : x));
                        const d = useEditor.getState().dok;
                        // die Liste behält während der Geste ihre Reihenfolge: dieselbe Stelle ersetzen
                        const liste = (d.teile ?? []).map((x, m) => (m === ki ? teilKurveMitKnoten(d, k, neu) : x));
                        useEditor.getState().setzeDokument({ ...d, teile: liste });
                      },
                      () => useEditor.getState().endeGeste(),
                    );
                  }}
                />
              ) : (
                <circle key={j} cx={b.x} cy={b.y} r={2.5} fill={farbe} pointerEvents="none" />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

/** „Automatisch“: die eigenen Kurven eines Teils entfernen (ein Undo-Schritt). */
export function teilKurvenEntfernen(id: string) {
  const st = useEditor.getState();
  const rest = (st.dok.teile ?? []).filter((k) => k.teil !== id);
  const d = { ...st.dok };
  if (rest.length) d.teile = rest;
  else delete d.teile;
  st.setzeDokument(d);
}

/**
 * Wirbelsäulen der Teile (über der schwarzen Linie, unter den Knoten): dünn, mit Knoten; Paare in Front/Top beidseitig. Nur
 * Anzeige — die Trefferflächen liegen in `TeilTreffer` unter der schwarzen Linie.
 */
export function TeilWirbelsaeulen({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const t = useTeile();
  const hover = useUi((s) => s.teilHover);
  if (!t) return null;
  return (
    <g className="teil-achsen" pointerEvents="none">
      {achsenPfade(t, ansicht, bild).map(({ teil, id, s, d, knoten }) => {
        const an = hover === id;
        return (
          <g key={`${id}${s}`} data-teil-achse={id}>
            {/* heller Saum, damit die Wirbelsäule über dem Körper lesbar bleibt */}
            <path d={d} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={an ? 5 : 4} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={teilFarbe(teil)} strokeWidth={an ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
            {knoten.map((q, k) => (
              <circle key={k} cx={q.x} cy={q.y} r={an ? 4 : 3} fill={teilFarbe(teil)} stroke="#fff" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Lesbarer Name eines Teils (Tafel, Hinweise). */
export function teilName(art: string, richtung: string): string {
  if (art === 'rumpf') return 'Rumpf';
  const r: Record<string, string> = { oben: 'nach oben', unten: 'nach unten', vorn: 'nach vorn', hinten: 'nach hinten', seitlich: 'zur Seite' };
  return `${art === 'paar' ? 'Paar' : 'Mitte'} ${r[richtung] ?? richtung}`;
}
