// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S4 „Teile erkennen“ (nur Anzeige): die Teile, die der Worker aus den drei
// Zeichnungen liest (`WesenNetz.teile`), in jedem Blatt — Flächen je Teil (blass, unter allem), verdeckte Teilumrisse
// gestrichelt (die Bauchlinien unter der Nase im Top), Wirbelsäulen dünn mit Knoten. Zeiger über einer Wirbelsäule hebt
// das Teil in allen Blättern und in der Tafel hervor. Profil-Einheiten wie das Liniennetz (`bild` nimmt sie direkt).
import type { Ansicht, Blick, V2 } from '@ee/shape';
import type { TeilAnzeige } from '@ee/shape/kern';
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

/** Flächen der sichtbaren Teile und verdeckte Teilumrisse (unter dem Liniennetz und der schwarzen Linie). */
export function TeilFlaechen({ ansicht, bild, umriss }: { ansicht: Ansicht; bild: (p: V2) => V2; umriss: string }) {
  const t = useTeile();
  const blick = useUi((s) => blickVon(ansicht, s.blick));
  const hover = useUi((s) => s.teilHover);
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
      {a.verdeckt.map((v) => (
        <path key={`v${v.teil}`} data-teil-verdeckt={idVon(v.teil)} d={zugPfad(v.zuege, bild, false)} fill="none" stroke={teilFarbe(v.teil)} strokeWidth={hover === idVon(v.teil) ? 2 : 1.25} strokeOpacity={hover === idVon(v.teil) ? 0.9 : 0.55} strokeDasharray="4 4" strokeLinecap="round" />
      ))}
    </g>
  );
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
