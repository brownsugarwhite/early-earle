// B7 (Plan Teil B, Entwurf Posen §6): Geist und Zwischenbilder in den Blättern (Stufe „Posen & Leben“). Im Editor-Tab der
// Umriss der gewählten Pose gestrichelt (in einer Pose zeigt das Blatt die Grundlinie gestrichelt, B4), dazu mit
// „Zwischenbilder“ die Umrisse des Überblendens bei 20/40/60/80 % als Zwiebelschale. Die Umrisse rechnet der Worker
// (`Bauplan.umrisse`, gemerkt), gezeichnet wird in Kern-Koordinaten wie die Linie der Pose.
import type { Ansicht, V2 } from '@ee/shape';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { useUi } from '../state/uiStore';

const FARBE_GEIST = '#ff2e9a';

export function UmrisseZeichnung({ ansicht, bild, skal }: { ansicht: Ansicht; bild: (p: V2) => V2; skal: number }) {
  useNetzStand((s) => s.version);
  const ebene = useUi((s) => s.ebene);
  if (ebene !== 'posen' || (ansicht !== 'seite' && ansicht !== 'front' && ansicht !== 'top')) return null;
  const liste = aktuellesNetz()?.netz.umrisse;
  if (!liste?.length) return null;
  void skal;
  const pfad = (u: Float32Array) => {
    let d = '';
    for (let k = 0; k + 1 < u.length; k += 2) {
      // Kern in Profil-Einheiten (S1, 16.10.): `bild` nimmt sie direkt
      const q = bild({ x: u[k]!, y: u[k + 1]! });
      d += `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }
    return d ? `${d}Z` : '';
  };
  return (
    <g data-umrisse="" pointerEvents="none">
      {liste.map((u) => {
        const d = pfad(u[ansicht]);
        if (!d) return null;
        if (u.id === 'geist') return <path key={u.id} data-geist="" d={d} fill="none" stroke={FARBE_GEIST} strokeOpacity={0.85} strokeWidth={2} strokeDasharray="7 5" strokeLinejoin="round" />;
        // Zwischenbilder: dünn, je weiter zur Zielpose, desto kräftiger
        const t = Number(u.id.slice(1)) || 0.5;
        return <path key={u.id} data-zwischenbild={u.id} d={d} fill="none" stroke={FARBE_GEIST} strokeOpacity={0.25 + 0.5 * t} strokeWidth={1} strokeDasharray="2 3" strokeLinejoin="round" />;
      })}
    </g>
  );
}
