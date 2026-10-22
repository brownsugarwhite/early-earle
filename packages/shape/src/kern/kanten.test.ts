// Phase 1 / M3 Punkt 2: freie Kantenlinien → Falten auf der nächsten Kantenschleife des Käfigs, gespiegelt, sauber.
import { describe, expect, it } from 'vitest';
import { type Kante, neuesDokument } from '../dokument';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { alleFlaechen } from '../kaefig/halbkanten';
import { ableiten } from './ableiten';
import { kanteAbtasten } from './kanten';
import { wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };

const gerade = (a: [number, number, number], b: [number, number, number], h: [number, number]): Kante => ({
  knoten: [
    { p: a, ein: [0, 0, 0], aus: [0, 0, 0], art: 'ecke' },
    { p: b, ein: [0, 0, 0], aus: [0, 0, 0], art: 'ecke' },
  ],
  haerte: h,
  blick: 'seite',
});

function scharfeKanten(abl: ReturnType<typeof ableiten>): { laengs: number; quer: number; alle: number } {
  const k = abl.kaefig;
  const { N, R } = abl.vorlage;
  let laengs = 0;
  let quer = 0;
  let alle = 0;
  for (let e = 0; e < k.nE; e++) {
    if (k.eSchaerfe[e]! <= 0) continue;
    alle++;
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    if (a < R * N && b < R * N) {
      if (Math.floor(a / N) === Math.floor(b / N)) quer++;
      else laengs++;
    }
  }
  return { laengs, quer, alle };
}

describe('M3 Kantenlinien → Falten', () => {
  const kugel = neuesDokument('Kugel');

  it('Abtasten: Punkte und Härte je Punkt, Maßstab angewendet', () => {
    const l = kanteAbtasten(gerade([-0.2, 0.3, 0.2], [0.2, 0.3, 0.2], [0, 1]), 2, 4);
    expect(l.punkte.length).toBe(5);
    expect(l.punkte[0]).toEqual([-0.4, 0.6, 0.4]);
    expect(l.punkte[4]).toEqual([0.4, 0.6, 0.4]);
    expect(l.haerte[2]).toBeCloseTo(0.5, 9);
  });

  it('Längslinie an der Flanke der Kugel: Längskanten einer Schleife werden scharf, gespiegelt; Sauberkeit bleibt', () => {
    const ohne = scharfeKanten(ableiten(kugel));
    const dok = { ...kugel, kanten: [gerade([-0.2, 0.3, 0.22], [0.2, 0.3, 0.22], [1, 1])] };
    const abl = ableiten(dok, { stufen: 2 });
    const mit = scharfeKanten(abl);
    console.log(`Kugel ohne Kante: ${ohne.alle} scharfe Kanten; mit Längslinie: längs ${mit.laengs}, quer ${mit.quer}, gesamt ${mit.alle}`);
    expect(mit.laengs).toBeGreaterThanOrEqual(12);
    expect(mit.laengs % 2).toBe(0); // gespiegelt: rechts und links gleich viele
    expect(mit.alle).toBeGreaterThan(ohne.alle);
    const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
    const punkte: [number, number, number][] = [];
    for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
    expect(selbstDurchdringungen({ punkte, flaechen: alleFlaechen(letzte), schaerfe: new Map() }, 1e-4).paare).toBe(0);
  });

  it('Querlinie (Bogen in der Front) wird eine Ringfalte; Härte 0 setzt nichts', () => {
    const bogen: Kante = { ...gerade([0, 0.5, 0.05], [0, 0.1, 0.05], [1, 1]), knoten: [{ p: [0, 0.5, 0.05], ein: [0, 0, 0], aus: [0, 0, 0.3], art: 'glatt' }, { p: [0, 0.1, 0.05], ein: [0, 0, 0.3], aus: [0, 0, 0], art: 'glatt' }], blick: 'front' };
    const mit = scharfeKanten(ableiten({ ...kugel, kanten: [bogen] }));
    console.log(`Kugel mit Querbogen: längs ${mit.laengs}, quer ${mit.quer}`);
    expect(mit.quer).toBeGreaterThanOrEqual(6);
    const weich = scharfeKanten(ableiten({ ...kugel, kanten: [gerade([-0.2, 0.3, 0.22], [0.2, 0.3, 0.22], [0, 0])] }));
    expect(weich.alle).toBe(scharfeKanten(ableiten(kugel)).alle);
  });

  it('wesenBauen: Kanten im Dokument ändern das Netz und den Cache-Schlüssel', () => {
    const a = wesenBauen(kugel, { earle: false }, null);
    const b = wesenBauen({ ...kugel, kanten: [gerade([-0.2, 0.3, 0.22], [0.2, 0.3, 0.22], [1, 1])] }, { earle: false }, a.stand);
    expect(b.netz.info.ableitung).toBeGreaterThan(0);
    let diff = 0;
    for (let i = 0; i < a.netz.positionen.length; i++) diff = Math.max(diff, Math.abs(a.netz.positionen[i]! - b.netz.positionen[i]!));
    expect(diff).toBeGreaterThan(0.002);
  });
});
