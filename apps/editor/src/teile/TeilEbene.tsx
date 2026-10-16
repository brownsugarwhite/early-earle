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
export const TEIL_FARBE = ['#8e9aa6', '#e4572e', '#1f9e9e', '#e8a33d', '#7b5ea7', '#3f88c5', '#d64f9a', '#5aa469'];
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

/** Flächen der sichtbaren Teile und verdeckte Teilumrisse (unter dem Liniennetz und der schwarzen Linie). */
export function TeilFlaechen({ ansicht, bild, umriss, aktiv }: { ansicht: Ansicht; bild: (p: V2) => V2; umriss: string; aktiv: boolean }) {
  const t = useTeile();
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const hover = useUi((s) => s.teilHover);
  const werkzeug = useUi((s) => s.werkzeug);
  const dokTeile = useEditor((s) => s.dok.teile);
  if (!t) return null;
  const a = t.ansichten[ansichtName(ansicht, blick)];
  const clipId = `teile-clip-${ansicht}`;
  const idVon = (i: number) => t.teile[i]?.id ?? '';
  // geratene verdeckte Stücke sind anklickbar (Auswahlwerkzeug in der Stufe Körper): eine eigene Kurve ersetzt sie
  const klickbar = aktiv && werkzeug === 'auswahl';
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
      {a.verdeckt.map((v) => {
        const id = idVon(v.teil);
        if (eigeneKurven(dokTeile, id, ansicht).length) return null;
        return zuegeVon(v.zuege).map((zug, k) => {
          const d = zug.map((p, i) => {
            const q = bild(p);
            return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
          }).join('');
          return (
            <g key={`v${v.teil}.${k}`} data-teil-verdeckt={id} data-teil-stueck={`${id}:${k}`}>
              {klickbar && (
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={9}
                  pointerEvents="stroke"
                  style={{ cursor: 'copy' }}
                  onPointerEnter={() => useUi.getState().setzeTeilHover(id)}
                  onPointerLeave={() => useUi.getState().teilHover === id && useUi.getState().setzeTeilHover(null)}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    kurveAnlegen(ansicht, id, zug);
                  }}
                >
                  <title>Klick: als eigene Kurve übernehmen</title>
                </path>
              )}
              <path d={d} fill="none" stroke={teilFarbe(v.teil)} strokeWidth={hover === id ? 2 : 1.25} strokeOpacity={hover === id ? 0.9 : 0.55} strokeDasharray="4 4" strokeLinecap="round" pointerEvents="none" />
            </g>
          );
        });
      })}
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

/** Wirbelsäulen der Teile (über der schwarzen Linie, unter den Knoten): dünn, mit Knoten; Paare in Front/Top beidseitig. */
export function TeilWirbelsaeulen({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const t = useTeile();
  const hover = useUi((s) => s.teilHover);
  if (!t) return null;
  const setze = useUi.getState().setzeTeilHover;
  return (
    <g className="teil-achsen">
      {t.teile.map((teil, i) => {
        const seiten = teil.art === 'paar' && ansicht !== 'seite' ? [1, -1] : [1];
        const an = hover === teil.id;
        return seiten.map((s) => {
          const p = (arr: Float32Array, k: number) => bild(inAnsicht2([arr[k]!, arr[k + 1]!, arr[k + 2]! * s], ansicht));
          let d = '';
          for (let k = 0; k + 2 < teil.achse.length; k += 3) {
            const q = p(teil.achse, k);
            d += `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
          }
          const knoten: V2[] = [];
          for (let k = 0; k + 2 < teil.knoten.length; k += 3) knoten.push(p(teil.knoten, k));
          return (
            <g key={`${teil.id}${s}`} data-teil-achse={teil.id} onPointerEnter={() => setze(teil.id)} onPointerLeave={() => useUi.getState().teilHover === teil.id && setze(null)}>
              <path d={d} fill="none" stroke="transparent" strokeWidth={10} />
              {/* heller Saum, damit die Wirbelsäule über dem Körper lesbar bleibt */}
              <path d={d} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={an ? 5 : 4} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
              <path d={d} fill="none" stroke={teilFarbe(i)} strokeWidth={an ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
              {knoten.map((q, k) => (
                <circle key={k} cx={q.x} cy={q.y} r={an ? 4 : 3} fill={teilFarbe(i)} stroke="#fff" strokeWidth={1.5} pointerEvents="none" />
              ))}
            </g>
          );
        });
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
