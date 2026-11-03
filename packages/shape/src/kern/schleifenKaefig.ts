// Prüfplan P1 „Ansichten als Illustration“, Tag 2–3 (zweiter Anlauf, 03.11.2026) und Tag 4–5: der Käfig aus den Schleifen.
//
// Einstieg für den Wesen-Bau: Einteiler (eine Schleife je Ansicht, kein erkanntes Teil) werden aus ihren drei Schleifen
// gebaut (`schleifenKern.ts`); Zeichnungen mit Teilen — mehrere Schleifen in einer Ansicht oder ein Teil des S4-Teilbaums —
// als Rumpf mit Kindern über Fenster (`schleifenTeile.ts`). Ohne die Option im Bauplan bleibt der Körper bitgleich.
import type { Dokument } from '../dokument';
import type { Kaefig } from '../kaefig/halbkanten';
import { grenzLoeser } from '../loeser/grenzflaeche';
import { unterteilung } from '../subdivision/catmullClark';
import type { Ableitung } from './ableiten';
import { type Blatt, type KaefigAchse, type KaefigBericht, type KaefigOptionen, STANDARD, achseWaehlen, eckenKnoten, einteilZiele, faltenAnwenden, jetzt, kaefigLoesen, kaefigMasse, leer, rahmenFuer, tiefeNeu } from './schleifenKern';
import { schleifenTeile, teileFinden } from './schleifenTeile';
import type { UmrissPlan } from './umrissPlan';

export * from './schleifenKern';
export { teileFinden } from './schleifenTeile';
export type { Kind, TeileFund } from './schleifenTeile';

/**
 * Käfig aus den Umrissschleifen: Einteiler aus den drei Schleifen; mit Teilen (mehrere Schleifen in einer Ansicht oder ein
 * Teil des Teilbaums) der Rumpf mit Kindern über Fenster. Gibt die Ableitung mit neuem Käfig (Lagen, Falten, Unterteilung,
 * Grenzlöser) zurück, bei nicht baubaren Zeichnungen die Eingabe unverändert mit dem Grund im Bericht.
 */
export function schleifenKaefig(abl: Ableitung, plan: UmrissPlan, dok: Dokument, optionen: KaefigOptionen = {}): { abl: Ableitung; bericht: KaefigBericht } {
  const t0 = jetzt();
  const opt = { ...STANDARD, ...optionen };
  const je = (a: Blatt) => plan.schleifen.filter((s) => s.ansicht === a);
  const seite = je('seite');
  const front = je('front');
  const top = je('top');
  const v = abl.vorlage;
  const k = abl.kaefig;
  const n = k.n;
  if (n !== v.kaefig.n) return leer(abl, 'Käfig mit Maul oder Beinen', t0);
  const mehrteilig = seite.length !== 1 || front.length !== 1 || top.length !== 1;
  if (opt.teile) {
    const fund = teileFinden(dok, plan, abl.gefroren);
    if (fund.kinder.length) return schleifenTeile(abl, plan, dok, opt, fund);
    if (mehrteilig) return leer(abl, `mehrteilig ohne erkanntes Teil (Seite ${seite.length}, Front ${front.length}, Top ${top.length} Schleifen${fund.ausgelassen.length ? `; ${fund.ausgelassen.map((a) => `${a.name}: ${a.grund}`).join(', ')}` : ''})`, t0);
  } else if (mehrteilig) return leer(abl, `mehrteilig: Seite ${seite.length}, Front ${front.length}, Top ${top.length} Schleifen`, t0);
  const { R, N } = v;
  const sl = seite[0]!.proben.map((p) => p.p);
  const achse: KaefigAchse = opt.achse === 'auto' ? achseWaehlen(sl, opt.achseAb) : opt.achse;
  const rahmen = rahmenFuer(achse);
  const reihenAnsicht: Blatt = achse === 'x' ? 'top' : 'front';
  const ringAnsicht: Blatt = achse === 'x' ? 'front' : 'top';
  const schleifeVon = (a: Blatt) => {
    const s0 = plan.schleifen.find((x) => x.ansicht === a)!;
    return opt.tiefe === 'glatt' ? tiefeNeu(s0) : s0;
  };
  const erg = einteilZiele(
    { seite: sl, reihe: schleifeVon(reihenAnsicht).proben.map((p) => p.p), ring: schleifeVon(ringAnsicht).proben.map((p) => p.p), rahmen, R, N, ecken: { seite: eckenKnoten(dok, 'seite'), reihe: eckenKnoten(dok, reihenAnsicht), ring: eckenKnoten(dok, ringAnsicht) }, opt },
    v,
  );
  if ('grund' in erg) return leer(abl, erg.grund, t0, achse);
  // ---- Falten, Unterteilung, Grenzlöser ----
  const tU = jetzt();
  const eSchaerfe = new Float64Array(k.nE);
  const vSchaerfe = new Float64Array(k.n);
  const eckenNeu = faltenAnwenden(k, v, erg, opt.schaerfe, eSchaerfe, vSchaerfe);
  const k2: Kaefig = { ...k, xyz: Float64Array.from(k.xyz), eSchaerfe, vSchaerfe };
  const L = abl.unterteilung.stufen.length;
  const u2 = unterteilung(k2, L);
  const loeser2 = grenzLoeser(u2.grenze, n);
  const msUnterteilung = jetzt() - tU;
  // ---- harte Punkte: Schleifen und Falten ----
  const hart = new Uint8Array(n);
  for (const p of erg.naht) hart[p] = 1;
  for (const b of erg.reihe) hart[b.p] = 1;
  for (const b of erg.ringB) hart[b.p] = 1;
  for (let e = 0; e < k2.nE; e++) {
    if (!(eSchaerfe[e]! > 0)) continue;
    hart[k2.eA[e]!] = 1;
    hart[k2.eB[e]!] = 1;
  }
  const baender = [...erg.reihe, ...erg.ringB];
  const l = kaefigLoesen({ k: k2, u: u2, ziele: erg.ziele, hart, baender, kappe: R * N, opt });
  const masse = kaefigMasse(k2, l.fein, erg.ziele, hart, baender, abl.breiten, { R, N, ringPunkt: v.ringPunkt, K: rahmen.K });
  const bericht: KaefigBericht = {
    ok: true,
    achse,
    ringF: erg.ringF,
    schritte: erg.schritte,
    bogen: erg.bogen,
    kreuzungen: erg.kreuzungen,
    punkte: { naht: erg.naht.length, reihe: erg.reihe.length, ring: erg.ringB.length },
    ...masse,
    falten: { ringe: [...erg.faltenRinge.keys()].sort((a, b) => a - b), kappen: erg.faltenKappen.size, reihen: erg.reihenFalten, spitzen: erg.spitzen },
    dichte: erg.dichte,
    unbekannte: 3 * n,
    huelle: l.huelle,
    ms: jetzt() - t0,
    msUnterteilung,
    msLoeser: l.ms,
  };
  const kaefig: Kaefig = { ...k2, xyz: l.xyz };
  return { abl: { ...abl, kaefig, unterteilung: u2, loeser: loeser2, fein: l.fein, ziele: erg.ziele, ecken: eckenNeu, spitzen: { vorn: erg.spitzen.includes('vorn'), hinten: erg.spitzen.includes('hinten') } }, bericht };
}
