// Werkzeug-Matrix (Plan Teil H0): Ausgangslage, ob die Werkzeuge harmonieren — Florians Ablauf aus seinem Bild
// (Kugel → Aufblasen/Ziehen → Knoten in Seite und Front → Maul → Ziehen am Maul → Maulanfang), alle Paare von
// Handlungen auf drei Körpern und Zufallsgänge. Nach jedem Schritt: Δ je Blatt und Lippen-px wie im Titel, Verschiebung
// fern der bearbeiteten Stelle. Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/werkzeug-matrix.ts
//   START=<Startwert> GAENGE=<Anzahl Zufallsgänge> NUR=florian|paare|gaenge
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { abgleichen } from '../../../../packages/shape/src/kopplung';
import { bewegeKnoten } from '../../../../packages/shape/src/profil';
import { type Handlung, HANDLUNGEN, type Schritt, bauen, schrittAusfuehren, startZustand } from '../../../../packages/shape/src/kern/pruefen/werkzeuge';
import type { KoerperArt } from '../../../../packages/shape/src/kern/pruefen/koerper';
import { zufall } from '../../../../packages/shape/src/kern/pruefen/zufall';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
const START = Number(process.env.START ?? 20261015);
const GAENGE = Number(process.env.GAENGE ?? 30);
const nur = process.env.NUR;
const f1 = (x: number | null) => (x === null ? '–' : Number.isFinite(x) ? x.toFixed(1) : '∞');
const zeile = (s: Schritt) => `Δ ${f1(s.messung.delta.seite)}/${f1(s.messung.delta.front)}/${f1(s.messung.delta.top)} · Lippe ${f1(s.messung.lippe)} · fern ${f1(s.messung.fern)} (gesamt ${f1(s.messung.gesamt)}) px${s.folgen ? ' · Formen folgen' : ''}`;
const ergebnis: Record<string, unknown> = { start: START };

// 1) Florians Ablauf (Bild 15.10.): feste Handlungen auf der Startkugel
if (!nur || nur === 'florian') {
  const r = zufall(START);
  let z = startZustand('kugel', r);
  const fest = (name: string, f: (d: Dokument) => Dokument, pinsel = false, ort: [number, number, number] | null = null, radius = 0): Handlung => ({ name, anwenden: (zz) => ({ dok: f(zz.dok), ort, radius, pinsel }) });
  const pinselAuf = (mitte: [number, number, number], radius: number, versatz: (n: [number, number, number]) => [number, number, number]) => (d: Dokument): Dokument => {
    const h = HANDLUNGEN.find((x) => x.name === 'aufblasen')!;
    void h;
    // gleicher Pinsel wie die Matrix, aber an fester Stelle: über eine Handlung mit fester Mitte
    const abl = z.stand!.abl;
    const xyz = abl.kaefig.xyz;
    const n0 = Math.min(abl.vorlage.kaefig.n, abl.kaefig.n);
    const karte = new Map<number, [number, number, number]>((d.kaefig?.deltas ?? []).map((x) => [x.punkt, [...x.d] as [number, number, number]]));
    // Normalen grob aus der Lage zur Körpermitte (Kugel)
    for (let p = 0; p < n0; p++) {
      const x = xyz[3 * p]!, y = xyz[3 * p + 1]!, zz = xyz[3 * p + 2]!;
      if (zz < -1e-9) continue;
      const w = Math.max(0, 1 - Math.hypot(x - mitte[0], y - mitte[1], zz - mitte[2]) / radius);
      const ws = Math.max(0, 1 - Math.hypot(x - mitte[0], y - mitte[1], zz + mitte[2]) / radius);
      const g = w * w * (3 - 2 * w) + ws * ws * (3 - 2 * ws);
      if (g <= 1e-9) continue;
      const l = Math.hypot(x, y - 0.265, zz) || 1;
      const v = versatz([x / l, (y - 0.265) / l, zz / l]);
      const a = karte.get(p) ?? [0, 0, 0];
      karte.set(p, [a[0] + g * v[0], a[1] + g * v[1], Math.abs(zz) < 1e-9 ? 0 : a[2] + g * v[2]]);
    }
    return { ...d, kaefig: { ...(d.kaefig ?? { deltas: [] }), deltas: [...karte].map(([punkt, dd]) => ({ punkt, d: dd })) } };
  };
  const seiteZiehen = (i: number, dx: number, dy: number) => (d: Dokument): Dokument => {
    const k = d.profile.seite.knoten[i]!;
    return { ...d, profile: abgleichen({ ...d.profile, seite: bewegeKnoten(d.profile.seite, i, { x: k.p.x + dx, y: k.p.y + dy }) }, 'seite', d.profile) };
  };
  const frontZiehen = (i: number, dx: number, dy: number) => (d: Dokument): Dokument => {
    const k = d.profile.front.knoten[i]!;
    return { ...d, profile: abgleichen({ ...d.profile, front: bewegeKnoten(d.profile.front, i, { x: k.p.x + dx, y: k.p.y + dy }) }, 'front', d.profile) };
  };
  const ablauf: Handlung[] = [
    fest('Aufblasen an der Wange', pinselAuf([-0.05, 0.3, 0.2], 0.14, (n) => [0.03 * n[0], 0.03 * n[1], 0.03 * n[2]]), true, [-0.05, 0.3, 0.2], 0.21),
    fest('Ziehen an der Schnauze nach vorn', pinselAuf([-0.25, 0.25, 0], 0.12, () => [-0.05, -0.01, 0]), true, [-0.25, 0.25, 0], 0.18),
    fest('Seite: Scheitel 20 px hoch', seiteZiehen(0, 0, 20 / 461), false, [0, 0.53, 0], 0.15),
    fest('Front: Seitenpunkt 15 px nach außen (wirkt überall)', frontZiehen(1, 15 / 461, 0)),
    HANDLUNGEN.find((x) => x.name === 'maul-zeichnen')!,
    fest('Ziehen am Maul (ohne Folgen, wie im Editor)', pinselAuf([-0.2, 0.22, 0.1], 0.1, () => [0, -0.02, 0.01]), true, [-0.2, 0.22, 0.1], 0.15),
    HANDLUNGEN.find((x) => x.name === 'maul-anfang')!,
  ];
  const schritte: { handlung: string; zeile: string; messung: Schritt['messung'] }[] = [];
  console.log('Florians Ablauf (Startkugel):');
  for (const h of ablauf) {
    const s = schrittAusfuehren(z, h, r, 'kugel');
    if (!s) {
      console.log(`  ${h.name.padEnd(44)} (nicht anwendbar)`);
      continue;
    }
    z = s.z;
    schritte.push({ handlung: h.name, zeile: zeile(s.schritt), messung: s.schritt.messung });
    console.log(`  ${h.name.padEnd(44)} ${zeile(s.schritt)}`);
  }
  ergebnis.florian = { schritte, dok: z.dok };
}

// 2) Alle Paare von Handlungen auf drei Körpern: A, dann B; gemessen nach B
if (!nur || nur === 'paare') {
  const koerper: KoerperArt[] = ['kugel', 'birne', 'rex'];
  const paare: { koerper: string; a: string; b: string; nachA: Schritt['messung']; nachB: Schritt['messung'] }[] = [];
  for (const k of koerper) {
    for (const ha of HANDLUNGEN) {
      for (const hb of HANDLUNGEN) {
        const r = zufall(START).ableger(`${k}:${ha.name}:${hb.name}`);
        let z = startZustand(k, r);
        // Maul-Handlungen brauchen ein Maul: vorher eines zeichnen
        if ((ha.name.startsWith('maul-') && ha.name !== 'maul-zeichnen') || ha.name === 'getrennt') {
          const s0 = schrittAusfuehren(z, HANDLUNGEN.find((x) => x.name === 'maul-zeichnen')!, r, k);
          if (!s0) continue;
          z = s0.z;
        }
        const sa = schrittAusfuehren(z, ha, r, k);
        if (!sa) continue;
        const sb = schrittAusfuehren(sa.z, hb, r, k);
        if (!sb) continue;
        paare.push({ koerper: k, a: ha.name, b: hb.name, nachA: sa.schritt.messung, nachB: sb.schritt.messung });
      }
    }
    console.log(`Paare ${k}: ${paare.filter((p) => p.koerper === k).length}`);
  }
  ergebnis.paare = paare;
}

// 3) Zufallsgänge: je Gang ein Körper, acht zufällige Handlungen
if (!nur || nur === 'gaenge') {
  const koerper: KoerperArt[] = ['kugel', 'ei', 'birne', 'wurst', 'rex', 'langhals', 'kasten'];
  const gaenge: { koerper: string; schritte: Schritt[] }[] = [];
  for (let g = 0; g < GAENGE; g++) {
    const r = zufall(START).ableger(`gang${g}`);
    const k = r.wahl(koerper);
    let z = startZustand(k, r);
    const schritte: Schritt[] = [];
    for (let i = 0; i < 8; i++) {
      const h = r.wahl(HANDLUNGEN);
      const s = schrittAusfuehren(z, h, r, k);
      if (!s) continue;
      z = s.z;
      schritte.push(s.schritt);
    }
    gaenge.push({ koerper: k, schritte });
  }
  ergebnis.gaenge = gaenge;
}

// Zusammenfassung je Handlung (alle Schritte aus Paaren und Gängen): Δ nach dem Schritt, Lippe, Verschiebung fern
const alle: Schritt[] = [];
for (const p of (ergebnis.paare as { a: string; b: string; nachA: Schritt['messung']; nachB: Schritt['messung'] }[] | undefined) ?? []) {
  alle.push({ handlung: p.a, messung: p.nachA, folgen: false }, { handlung: p.b, messung: p.nachB, folgen: false });
}
for (const g of (ergebnis.gaenge as { schritte: Schritt[] }[] | undefined) ?? []) alle.push(...g.schritte);
if (alle.length) {
  console.log('\nje Handlung (Median / Max): Δ größtes Blatt · Lippe · Verschiebung fern');
  const med = (w: number[]) => (w.length ? [...w].sort((a, b) => a - b)[Math.floor((w.length - 1) / 2)]! : NaN);
  const zus: Record<string, unknown> = {};
  for (const h of HANDLUNGEN) {
    const s = alle.filter((x) => x.handlung === h.name);
    if (!s.length) continue;
    const d = s.map((x) => Math.max(x.messung.delta.seite, x.messung.delta.front, x.messung.delta.top)).filter(Number.isFinite);
    const l = s.map((x) => x.messung.lippe).filter((x): x is number => x !== null && Number.isFinite(x));
    const f = s.map((x) => x.messung.fern).filter(Number.isFinite);
    zus[h.name] = { n: s.length, delta: [med(d), Math.max(...d)], lippe: l.length ? [med(l), Math.max(...l)] : null, fern: [med(f), Math.max(...f)] };
    console.log(`  ${h.name.padEnd(16)} n ${String(s.length).padStart(4)} · Δ ${f1(med(d))} / ${f1(Math.max(...d))} · Lippe ${l.length ? `${f1(med(l))} / ${f1(Math.max(...l))}` : '–'} · fern ${f1(med(f))} / ${f1(Math.max(...f))} px`);
  }
  ergebnis.zusammenfassung = zus;
}
void bauen;
mkdirSync(AUSGABE, { recursive: true });
const datei = resolve(AUSGABE, `werkzeug-matrix-${START}.json`);
writeFileSync(datei, JSON.stringify(ergebnis));
console.log(`\n→ ${datei}`);
