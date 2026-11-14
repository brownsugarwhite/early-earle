// Versuch 13.10.: Bauweise „Schnitte“ in den 2D-Ansichten. Alle Ansichten zeigen den Umriss des 3D-Körpers gestrichelt
// (Vergleich mit der Zeichnung). In Front bzw. Back zeigt ein gewählter Spant zusätzlich den echten Schnitt an seiner
// Stelle (gestrichelt, leicht gefüllt): Florian 13.10.: „Was wenn Spanten wirklich die Form darstellen würden?“

import type { Ansicht, V2 } from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { SPANT_HINTEN, SPANT_VORN, spantSichtbar } from '../spanten/SpantEbene';
import { hauptspantStelle } from '@ee/shape';
import { schnittEcht, useSchnittAnzeige } from './schnittKoerper';

export const SCHNITT_UMRISS = '#1d3f8f';

export function SchnittZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const bauweise = useUi((s) => s.bauweise);
  const umrisse = useSchnittAnzeige((s) => s.umrisse);
  useSchnittAnzeige((s) => s.stand);
  const auswahl = useUi((s) => s.spantAuswahl);
  const blick = useUi((s) => s.blick.front);
  const dok = useEditor((s) => s.dok);
  if (bauweise !== 'schnitte') return null;
  const zug = (pts: readonly V2[]) =>
    pts
      .map((p, k) => {
        const q = bild(p);
        return `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      })
      .join('') + 'Z';
  const um = umrisse?.[ansicht] ?? [];
  const sp = auswahl ? dok.spanten?.[auswahl.spant] : undefined;
  const echt = ansicht === 'front' && sp && spantSichtbar(dok, sp.f, blick) ? schnittEcht(sp.f) : null;
  const farbe = sp && sp.f <= hauptspantStelle(dok) + 1e-9 ? SPANT_VORN : SPANT_HINTEN;
  return (
    <g className="schnitt-ebene" pointerEvents="none" data-schnitt={ansicht}>
      {um.map((z, i) => (
        <path key={i} d={zug(z)} fill="none" stroke={SCHNITT_UMRISS} strokeWidth={1.5} strokeDasharray="6 4" data-schnittumriss="" />
      ))}
      {echt && (
        <g data-schnitt-echt={echt.teile} data-schnitt-loecher={echt.loecher}>
          <path d={echt.umrisse.map(zug).join('')} fill={farbe} fillOpacity={0.14} fillRule="evenodd" stroke="none" />
          {echt.umrisse.map((z, i) => (
            <path key={i} d={zug(z)} fill="none" stroke={farbe} strokeWidth={2} strokeDasharray="4 4" />
          ))}
        </g>
      )}
    </g>
  );
}
