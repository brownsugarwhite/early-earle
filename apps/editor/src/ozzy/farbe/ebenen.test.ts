import { describe, expect, it } from 'vitest';
import { type Farbe, type Farblinie, aktiveEbene, alsDatei, ausDatei, ebeneLoeschen, ebeneNeu, ebeneOrdnen, kopie, leereBemalung, sichtUebernehmen, EBENEN_HOECHSTENS } from './bemalung';
import { FarbWerk, type HautJetzt } from './farbwerk';
import { naechsterAuf } from './naechster';
import { type Netz, type Ort, karteVon, ortIn } from './ort';

// ---------- Prüfnetz: eine Kugel aus einem unterteilten Oktaeder (spiegelgleich an z = 0), wie in `weich.test.ts` ----------

function kugel(stufen: number, r = 100): Netz & { spiegel: Int32Array; pos: Float64Array; tri: Uint32Array } {
  const P: number[][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  let T: number[][] = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  for (let s = 0; s < stufen; s++) {
    const mitte = new Map<string, number>();
    const m = (a: number, b: number): number => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      let i = mitte.get(k);
      if (i === undefined) {
        const x = [(P[a]![0]! + P[b]![0]!) / 2, (P[a]![1]! + P[b]![1]!) / 2, (P[a]![2]! + P[b]![2]!) / 2];
        const l = Math.hypot(x[0]!, x[1]!, x[2]!);
        i = P.length;
        P.push([x[0]! / l, x[1]! / l, x[2]! / l]);
        mitte.set(k, i);
      }
      return i;
    };
    const N: number[][] = [];
    for (const [a, b, c] of T as [number, number, number][]) {
      const ab = m(a, b), bc = m(b, c), ca = m(c, a);
      N.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    T = N;
  }
  const n = P.length;
  const pos = new Float64Array(3 * n);
  P.forEach((p, i) => {
    pos[3 * i] = r * p[0]!;
    pos[3 * i + 1] = r * p[1]!;
    pos[3 * i + 2] = Math.abs(p[2]!) < 1e-12 ? 0 : r * p[2]!;
  });
  const schl = (x: number, y: number, z: number): string => `${Math.round(x * 1e6)},${Math.round(y * 1e6)},${Math.round(z * 1e6)}`;
  const wo = new Map<string, number>();
  for (let i = 0; i < n; i++) wo.set(schl(pos[3 * i]!, pos[3 * i + 1]!, pos[3 * i + 2]!), i);
  const spiegel = new Int32Array(n);
  for (let i = 0; i < n; i++) spiegel[i] = wo.get(schl(pos[3 * i]!, pos[3 * i + 1]!, -pos[3 * i + 2]!)) ?? -1;
  return { pos, tri: Uint32Array.from(T.flat()), n, spiegel };
}

const BLAU: Farbe = [0.2, 0.4, 0.8];
const GELB: Farbe = [0.95, 0.8, 0.2];
const ROT: Farbe = [0.9, 0.2, 0.1];

describe('Farbe, Etappe 5: Ebenen im Modell', () => {
  it('eine neue Ebene liegt über der aktiven und wird die aktive; ihr Name zählt weiter', () => {
    const b = leereBemalung();
    expect(b.ebenen.map((e) => e.name)).toEqual(['Ebene 1']);
    const zwei = ebeneNeu(b)!;
    expect(zwei.name).toBe('Ebene 2');
    expect(b.aktiv).toBe(zwei.id);
    expect(b.ebenen.map((e) => e.id)).toEqual([1, zwei.id]);
    // an der unteren weitergemalt: Die nächste liegt über ihr, unter der zweiten
    b.aktiv = 1;
    const drei = ebeneNeu(b)!;
    expect(drei.name).toBe('Ebene 3');
    expect(b.ebenen.map((e) => e.name)).toEqual(['Ebene 1', 'Ebene 3', 'Ebene 2']);
    expect(aktiveEbene(b).id).toBe(drei.id);
    // die Kennungen sind die der Bemalung (keine doppelt mit Farblinien und Füllungen)
    expect(new Set(b.ebenen.map((e) => e.id)).size).toBe(3);
    expect(b.naechste).toBeGreaterThan(Math.max(...b.ebenen.map((e) => e.id)));
  });

  it('mehr als die Höchstzahl geht nicht', () => {
    const b = leereBemalung();
    for (let i = 1; i < EBENEN_HOECHSTENS; i++) expect(ebeneNeu(b)).not.toBeNull();
    expect(b.ebenen.length).toBe(EBENEN_HOECHSTENS);
    expect(ebeneNeu(b)).toBeNull();
    expect(b.ebenen.length).toBe(EBENEN_HOECHSTENS);
  });

  it('ordnen legt eine Ebene an einen anderen Platz; die aktive bleibt dieselbe', () => {
    const b = leereBemalung();
    const zwei = ebeneNeu(b)!.id;
    const drei = ebeneNeu(b)!.id;
    expect(b.ebenen.map((e) => e.id)).toEqual([1, zwei, drei]);
    expect(ebeneOrdnen(b, drei, 0)).toBe(true);
    expect(b.ebenen.map((e) => e.id)).toEqual([drei, 1, zwei]);
    expect(b.aktiv).toBe(drei);
    // (derselbe Platz: nichts geschieht; ein Platz außerhalb: an den Rand)
    expect(ebeneOrdnen(b, drei, 0)).toBe(false);
    expect(ebeneOrdnen(b, 1, 99)).toBe(true);
    expect(b.ebenen.map((e) => e.id)).toEqual([drei, zwei, 1]);
    expect(ebeneOrdnen(b, 4711, 0)).toBe(false);
  });

  it('löschen nimmt die Ebene mit allem darauf; die letzte bleibt; war sie die aktive, wird es die darunter', () => {
    const b = leereBemalung();
    expect(ebeneLoeschen(b, 1)).toBe(false);
    const zwei = ebeneNeu(b)!.id;
    const drei = ebeneNeu(b)!.id;
    expect(ebeneLoeschen(b, drei)).toBe(true);
    expect(b.ebenen.map((e) => e.id)).toEqual([1, zwei]);
    expect(b.aktiv).toBe(zwei);
    // die unterste gelöscht, während sie aktiv ist: Aktiv wird, was jetzt unten liegt
    b.aktiv = 1;
    expect(ebeneLoeschen(b, 1)).toBe(true);
    expect(b.ebenen.map((e) => e.id)).toEqual([zwei]);
    expect(b.aktiv).toBe(zwei);
    expect(ebeneLoeschen(b, zwei)).toBe(false);
  });

  it('eine Kopie trägt, was ausgeblendet ist; was man sieht und wo man malt, geht in einen früheren Stand über', () => {
    const b = leereBemalung();
    const zwei = ebeneNeu(b)!.id;
    const frueher = kopie(b);
    // seitdem: die untere ausgeblendet, an ihr gemalt, eine dritte angelegt
    b.ebenen[0]!.aus = true;
    b.aktiv = 1;
    const k = kopie(b);
    expect(k.ebenen[0]!.aus).toBe(true);
    expect(k.ebenen[1]!.aus).toBeUndefined();
    ebeneNeu(b);
    b.aktiv = 1;
    sichtUebernehmen(b, frueher);
    expect(frueher.ebenen.map((e) => e.id)).toEqual([1, zwei]);
    expect(frueher.ebenen[0]!.aus).toBe(true);
    expect(frueher.aktiv).toBe(1);
    // (die aktive Ebene gibt es im früheren Stand nicht: Dort gilt, was damals aktiv war)
    const nochFrueher = leereBemalung();
    const mitDrei = kopie(b);
    mitDrei.aktiv = mitDrei.ebenen[1]!.id;
    sichtUebernehmen(mitDrei, nochFrueher);
    expect(nochFrueher.aktiv).toBe(1);
  });
});

describe('Farbe, Etappe 5: Ebenen auf der Haut', () => {
  // (Stufe 4: 1026 Punkte; hier zählt, welche Ebene deckt, nicht die Feinheit)
  const netz = kugel(4);
  const nah = naechsterAuf(netz);
  const ortBei = (x: number, y: number, z: number): Ort => {
    const r = nah(x, y, z);
    return ortIn(netz, r.t, r.wa, r.wb, r.wc);
  };
  const haut = (): HautJetzt => ({ haut: netz, gespiegelt: false, netz: null, stufen: 0, version: 1, f: 1, mitte: { x: 0, y: 0 } });
  /** ein Breitenkreis (Höhe z0) als Farblinie */
  const kreis = (z0: number, id: number): Farblinie => {
    const rho = Math.sqrt(1e4 - z0 * z0);
    const stuetzen = Array.from({ length: 96 }, (_, j) => ortBei(rho * Math.cos((2 * Math.PI * j) / 96), rho * Math.sin((2 * Math.PI * j) / 96), z0));
    return { id, zu: true, stuetzen, punkte: [0, 24, 48, 72].map((i) => ({ i, ein: null, aus: null, knick: false })) };
  };
  const pol = ortBei(0, 0, 100);
  const bauch = ortBei(100, 0, 0);
  /** unten alles blau, darüber eine gelbe Kappe um den Pol */
  const zweiEbenen = (): { fw: FarbWerk; h: HautJetzt; oben: number } => {
    const fw = new FarbWerk(naechsterAuf);
    const h = haut();
    fw.fuellen(h, bauch, BLAU);
    const oben = fw.ebeneNeu(h)!;
    fw.merken(h);
    aktiveEbene(fw.bemalung).linien.push(kreis(60, fw.bemalung.naechste++));
    fw.geaendert();
    fw.fuellen(h, pol, GELB);
    fw.schritt(h);
    return { fw, h, oben };
  };

  it('oben deckt unten: Zu sehen ist die Farbe der obersten Ebene, die dort eine Füllung hat', () => {
    const { fw, h } = zweiEbenen();
    expect(fw.farbeBei(h, pol)).toEqual(GELB);
    // (wo die obere nichts hat, scheint die untere durch)
    expect(fw.farbeBei(h, bauch)).toEqual(BLAU);
    expect(fw.ebenenStand().map((e) => [e.name, e.aktiv, e.aus, e.leer, e.farben])).toEqual([
      ['Ebene 2', true, false, false, [GELB]],
      ['Ebene 1', false, false, false, [BLAU]],
    ]);
  });

  it('ausgeblendet zeigt eine Ebene nichts; eingeblendet ist sie wieder da', () => {
    const { fw, h, oben } = zweiEbenen();
    expect(fw.ebeneZeigen(oben, false)).toBe(true);
    expect(fw.ebeneZeigen(oben, false)).toBe(false);
    expect(fw.farbeBei(h, pol)).toEqual(BLAU);
    expect(fw.ebeneZeigen(1, false)).toBe(true);
    expect(fw.farbeBei(h, pol)).toBeNull();
    expect(fw.ebeneZeigen(oben, true)).toBe(true);
    expect(fw.farbeBei(h, pol)).toEqual(GELB);
    expect(fw.farbeBei(h, bauch)).toBeNull();
  });

  it('ordnen: Liegt die Ebene mit der Kappe unten, deckt die andere sie zu', () => {
    const { fw, h, oben } = zweiEbenen();
    expect(fw.ebeneOrdnen(h, oben, 0)).toBe(true);
    expect(fw.bemalung.ebenen.map((e) => e.id)).toEqual([oben, 1]);
    expect(fw.farbeBei(h, pol)).toEqual(BLAU);
    // ⌘Z: die Reihenfolge von vorher
    expect(fw.zurueck(h)).toBe(true);
    expect(fw.bemalung.ebenen.map((e) => e.id)).toEqual([1, oben]);
    expect(fw.farbeBei(h, pol)).toEqual(GELB);
  });

  it('gemalt wird auf der aktiven Ebene; die anderen bleiben, wie sie sind, und werden nicht neu gerechnet', () => {
    const { fw, h, oben } = zweiEbenen();
    const unten = fw.bemalung.ebenen[0]!;
    const vorher = { linien: unten.linien.length, fuellungen: unten.fuellungen.length };
    // eine zweite Füllung auf der oberen Ebene (außerhalb der Kappe: Sie deckt dort das Blau)
    fw.fuellen(h, bauch, ROT);
    fw.schritt(h);
    expect(fw.abgeleitet).toBe(1);
    expect({ linien: unten.linien.length, fuellungen: unten.fuellungen.length }).toEqual(vorher);
    expect(fw.bemalung.ebenen[1]!.fuellungen.length).toBe(2);
    expect(fw.farbeBei(h, bauch)).toEqual(ROT);
    expect(fw.farbeBei(h, pol)).toEqual(GELB);
    // an der unteren weitergemalt: Dort kommt die Füllung an, zu sehen ist weiter die obere
    expect(fw.ebeneWaehlen(1)).toBe(true);
    expect(fw.ebeneWaehlen(1)).toBe(false);
    fw.fuellen(h, pol, ROT);
    fw.schritt(h);
    expect(fw.abgeleitet).toBe(1);
    expect(unten.fuellungen.length).toBe(vorher.fuellungen + 1);
    expect(fw.farbeBei(h, pol)).toEqual(GELB);
    // (das sagt die Meldung beim Füllen: Die obere Ebene deckt hier; an der oberen selbst deckt nichts)
    expect(fw.deckerUeber(h, pol)).toBe('Ebene 2');
    fw.ebeneWaehlen(oben);
    expect(fw.deckerUeber(h, pol)).toBeNull();
    fw.ebeneWaehlen(1);
    expect(fw.ebeneZeigen(oben, false)).toBe(true);
    expect(fw.farbeBei(h, pol)).toEqual(ROT);
    // (bedient werden nur die Farblinien der aktiven Ebene)
    expect(fw.bedienbar.length).toBe(0);
    fw.ebeneWaehlen(oben);
    expect(fw.bedienbar.length).toBe(0);
    fw.ebeneZeigen(oben, true);
    expect(fw.bedienbar.length).toBe(1);
  });

  it('wer an einer ausgeblendeten Ebene malt, blendet sie ein', () => {
    const { fw, h, oben } = zweiEbenen();
    fw.ebeneZeigen(oben, false);
    expect(fw.ebenenStand()[0]!.aus).toBe(true);
    fw.fuellen(h, bauch, ROT);
    expect(fw.ebenenStand()[0]!.aus).toBe(false);
    expect(fw.farbeBei(h, bauch)).toEqual(ROT);
  });

  it('⌘Z nimmt Anlegen und Löschen zurück; was man sieht und wo man malt, bleibt dabei', () => {
    const { fw, h, oben } = zweiEbenen();
    const n = fw.schrittZahl;
    const drei = fw.ebeneNeu(h)!;
    expect(fw.schrittZahl).toBe(n + 1);
    expect(fw.bemalung.ebenen.map((e) => e.id)).toEqual([1, oben, drei]);
    expect(fw.zurueck(h)).toBe(true);
    expect(fw.bemalung.ebenen.map((e) => e.id)).toEqual([1, oben]);
    expect(aktiveEbene(fw.bemalung).id).toBe(oben);
    // löschen, dann unten weitermalen und die untere ausblenden; ⌘Z zweimal: Die Kappe ist wieder da, die Sicht bleibt
    expect(fw.ebeneLoeschen(h, oben)).toBe(true);
    expect(fw.farbeBei(h, pol)).toEqual(BLAU);
    expect(aktiveEbene(fw.bemalung).id).toBe(1);
    fw.fuellen(h, pol, ROT);
    fw.ebeneZeigen(1, false);
    expect(fw.zurueck(h)).toBe(true);
    expect(fw.zurueck(h)).toBe(true);
    expect(fw.bemalung.ebenen.map((e) => e.id)).toEqual([1, oben]);
    expect(fw.bemalung.ebenen[0]!.aus).toBe(true);
    expect(aktiveEbene(fw.bemalung).id).toBe(1);
    expect(fw.farbeBei(h, pol)).toEqual(GELB);
    expect(fw.farbeBei(h, bauch)).toBeNull();
    // die letzte Ebene bleibt
    fw.ebeneLoeschen(h, oben);
    expect(fw.ebeneLoeschen(h, 1)).toBe(false);
  });

  it('Sichern und Laden: die Ebenen in ihrer Reihenfolge, was ausgeblendet ist, wo gemalt wird', () => {
    const { fw, h, oben } = zweiEbenen();
    fw.ebeneOrdnen(h, oben, 0);
    fw.ebeneZeigen(1, false);
    const d = alsDatei(fw.bemalung);
    expect(d.version).toBe(3);
    const zurueck = ausDatei(karteVon(netz), JSON.parse(JSON.stringify(d, (_k, v) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v))))!;
    expect(zurueck.ebenen.map((e) => [e.id, e.name, !!e.aus, e.linien.length, e.fuellungen.length])).toEqual([
      [oben, 'Ebene 2', false, 1, 1],
      [1, 'Ebene 1', true, 0, 1],
    ]);
    expect(zurueck.aktiv).toBe(oben);
    // eine Datei aus Etappe 4 (eine Ebene, ohne das Feld): zu sehen
    const alt = alsDatei(leereBemalung());
    expect(ausDatei(karteVon(netz), alt)!.ebenen[0]!.aus).toBeUndefined();
  });
});
