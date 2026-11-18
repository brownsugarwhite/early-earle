// Florians Ablauf im Kern (16.10.): Startkugel bauen (Stationen samt Enden eingefroren), dann Schnabel mit Kerbe (zwei
// Knoten mehr) ohne und mit Unterbiss-Maul (ohne Marken, wie im Editor gezeichnet), und Vase mit Hals aus der Kugel.
// Aufruf: kern-lauf.sh <commit|HEAD> apps/editor/scripts/pruefen/vergleich/ablauf-kern.ts
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HAUPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ROOT = process.env.ROOT ?? HAUPT;
const { neuesDokument } = await import(`${ROOT}/packages/shape/src/dokument.ts`);
const { ableiten } = await import(`${ROOT}/packages/shape/src/kern/ableiten.ts`);
const ps = await import(`${ROOT}/packages/shape/src/kern/pruefstand.ts`);
const { blattAbweichungen } = await import(`${ROOT}/packages/shape/src/kern/abweichung.ts`);
const K = 0.146;
const r = 0.265;
const kn = (x: number, y: number, ex: number, ey: number, ax: number, ay: number, art: 'glatt' | 'ecke' = 'glatt') => ({ p: { x, y }, ein: { x: ex, y: ey }, aus: { x: ax, y: ay }, art });
const schnabel = { art: 'geschlossen' as const, knoten: [kn(0, 2 * r, -K, 0, K, 0), kn(r, r, 0, K, 0, -K), kn(0, 0, K, 0, -K, 0), kn(-0.3975, 0.1405, 0.1, -0.08, 0.06, 0.02, 'ecke'), kn(-0.255, 0.1935, -0.05, -0.015, -0.03, 0.1, 'ecke')] };
const vase = { art: 'geschlossen' as const, knoten: [kn(-0.12, 0.95, 0, -0.08, 0.08, 0, 'ecke'), kn(0.13, 0.95, -0.08, 0, 0, -0.1, 'ecke'), kn(0.11, 0.55, 0, 0.1, 0, -0.08), kn(0.27, 0.27, 0, 0.1, 0, -0.14), kn(0, 0, K, 0, -K, 0), kn(-0.26, 0.32, 0, -0.14, 0, 0.1), kn(-0.12, 0.6, -0.02, -0.08, 0, 0.1)] };
const start = neuesDokument('kugel');
const g0 = ableiten(start, { stufen: 2 }).gefroren;
const zeile = (name: string, dok: Parameters<typeof ableiten>[0]) => {
  const a = ableiten(dok, { stufen: 2, stationen: g0 });
  const { punkte, flaechen } = ps.feinesNetz(a);
  const d = blattAbweichungen(punkte, flaechen, dok);
  const f = ps.faltenMass(a);
  const l = a.altLeiter;
  console.log(`${name}: Δ ${d.seite.max.toFixed(1)}/${d.front.max.toFixed(1)}/${d.top.max.toFixed(1)} px · Falten ${f.max.toFixed(1)}° (>20°: ${f.ueber20}) · Enden (${l.ruecken[0].x.toFixed(3)}, ${l.ruecken[0].y.toFixed(3)}) → (${l.ruecken[l.ruecken.length - 1].x.toFixed(3)}, ${l.ruecken[l.ruecken.length - 1].y.toFixed(3)})`);
};
const florian = ps.kugelMaulDokument('florian', false);
zeile('Schnabel ohne Maul', { ...start, profile: { ...start.profile, seite: schnabel, top: florian.profile.top }, kaefig: { deltas: [], stationen: g0 } });
const mit = { ...florian, profile: { ...florian.profile, seite: schnabel }, kaefig: { deltas: [], stationen: g0 } };
const m = ps.pruefenMaul(mit);
console.log(`Schnabel mit Unterbiss: Δ ${m.delta.seite.toFixed(1)}/${m.delta.front.toFixed(1)}/${m.delta.top.toFixed(1)} px · Haut ${m.faltenOffen.map((o: { haut: { max: number } }) => o.haut.max.toFixed(1)).join('/')}° · Paare ${m.paare.map((p: { paare: number }) => p.paare).join('/')}`);
zeile('Vase aus der Kugel', { ...start, profile: { ...start.profile, seite: vase }, kaefig: { deltas: [], stationen: g0 } });
