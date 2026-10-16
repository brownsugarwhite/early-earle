// S5 Vorbereitung: wo weicht der Körper (S3-Standard) von Front/Top ab? Größte Saumstellen je Blatt (px-Koordinaten).
// Umgebung: KOERPER (Komma-Liste). Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/s5-saum.ts
import { neuesDokument } from '../../../../packages/shape/src/dokument';
import { GLATTE_HAUT, ableiten } from '../../../../packages/shape/src/kern/ableiten';
import { blattAbweichungen } from '../../../../packages/shape/src/kern/abweichung';
import { feinesNetz, mitStationenVon } from '../../../../packages/shape/src/kern/pruefstand';
import { teilSatzDokument } from '../../../../packages/shape/src/kern/pruefen/teilsatz';

const PX = 461;
const kugel = neuesDokument();
for (const name of (process.env.KOERPER ?? 'langhals,vase').split(',')) {
  const dok = mitStationenVon(teilSatzDokument(name), kugel);
  const abl = ableiten(dok, { ...GLATTE_HAUT, fuelle: 'mittel', ...(dok.kaefig?.stationen ? { stationen: dok.kaefig.stationen } : {}) });
  const { punkte, flaechen } = feinesNetz(abl);
  const ab = blattAbweichungen(punkte, flaechen, dok);
  for (const a of ['seite', 'front', 'top'] as const) {
    const s = ab[a].saum;
    const pts: { x: number; y: number; d: number }[] = [];
    for (let i = 0; i + 2 < s.length; i += 3) if (Number.isFinite(s[i]!)) pts.push({ x: s[i]! * PX, y: s[i + 1]! * PX, d: s[i + 2]! });
    pts.sort((p, q) => q.d - p.d);
    // Häufungen: die größten, mindestens 8 px auseinander
    const auswahl: typeof pts = [];
    for (const p of pts) if (auswahl.length < 5 && auswahl.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 8)) auswahl.push(p);
    console.log(`${name} ${a.padEnd(5)} max ${ab[a].max.toFixed(1)} px: ${auswahl.map((p) => `(${p.x.toFixed(0)},${p.y.toFixed(0)}) ${p.d.toFixed(1)}`).join('  ')}`);
  }
}
