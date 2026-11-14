// Rig-Tab (Versuch 12.10.): vorgeschlagene Kiefergelenke und -knochen in den 2D-Ansichten (nur Anzeige).
// Gelenk = Schraubachse aus „zu“ und „offen“; Knochen vom Gelenk zum Kinn (Unterkiefer) bzw. zur Schnauze (Oberkiefer).

import type { Ansicht, V2 } from '@ee/shape';
import { inAnsicht2 } from '@ee/shape/versuch';
import { useMaulInfo } from './maulKoerper';

const ORANGE = '#ff7a00';

function Knochen({ von, bis, farbe }: { von: V2; bis: V2; farbe: string }) {
  // Blender-artiger Knochen: Raute vom Gelenk zum Ende
  const dx = bis.x - von.x;
  const dy = bis.y - von.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const b = Math.min(10, l * 0.12);
  const m = { x: von.x + dx * 0.18, y: von.y + dy * 0.18 };
  const d = `M${von.x} ${von.y}L${m.x + nx * b} ${m.y + ny * b}L${bis.x} ${bis.y}L${m.x - nx * b} ${m.y - ny * b}Z`;
  return <path d={d} fill={farbe} fillOpacity={0.35} stroke={farbe} strokeWidth={2} strokeLinejoin="round" />;
}

export function RigZeichnung({ ansicht, bild }: { ansicht: Ansicht; bild: (p: V2) => V2 }) {
  const info = useMaulInfo((s) => s.info);
  if (!info || ansicht === 'top') return null;
  const p = (v: [number, number, number]) => bild(inAnsicht2(v, ansicht));
  const gU = p(info.gelenkUnten);
  const gO = p(info.gelenkOben);
  return (
    <g className="rig" pointerEvents="none">
      <Knochen von={gO} bis={p(info.schnauze)} farbe="#e0306a" />
      <Knochen von={gU} bis={p(info.kinn)} farbe="#1832e6" />
      {[gO, gU].map((g, i) => (
        <g key={i}>
          <circle cx={g.x} cy={g.y} r={8} fill={ORANGE} />
          <circle cx={g.x} cy={g.y} r={3} fill="#19232b" />
        </g>
      ))}
    </g>
  );
}
