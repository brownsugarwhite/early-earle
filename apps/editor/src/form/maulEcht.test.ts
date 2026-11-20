// Das Maul als echte Form (20.11.2026): Aus einer Linie in der Seitenebene wird ein Maul, das Haut und Linien der Form ist. Die Haut
// bleibt geschlossen, die Spiegelpaare genau, kein Punkt liegt auf einem anderen, die Lippen sind Zwillinge, die Rechnung kommt
// danach zur Ruhe.
import {
  type Haut,
  type Loop,
  LoopZug,
  griffeAnlegen,
  hatPfad,
  hautAus,
  hautSeiten,
  istMaulLinie,
  knochenDrehen,
  kreuzungenZwischen,
  loopAusSchnitt,
  loopEinsetzen,
  mittlereKante,
  nadelnZusammenlegen,
  pfadAbweichung,
  pfadLagen,
  punktEinfuegen,
  rundAusSeite,
  zwillinge,
  zwillingsFehler,
} from '@ee/shape/dicht';
import { describe, expect, it } from 'vitest';
import { KIEFER_MAX, MAUL_HAAR, kieferSeiten, kieferTropfenRuhe, kieferWinkel, maulEchtAmLoop, maulLage, maulSchneidenMit } from './maulEcht';
import { Profil } from '../maulstudie/schnitt';
import { leereBemalung } from '../ozzy/farbe/bemalung';
import { type Saat, flaechenRechnen } from '../ozzy/farbe/flaechen';
import { kettenAller } from '../ozzy/farbe/ketten';
import { MAUL_EBENE, maulEbeneBauen } from '../ozzy/farbe/maulEbene';
import { karteVon, ortGespiegelt } from '../ozzy/farbe/ort';
import { ZAEHNE_ANFANG, eigenSetzen, formNetzGemischt, mitAnzahl, partner, sitzGrenzen, zaehneNetz, zaehnePaar, zahnPlaetze, zahnRahmen } from '../ozzy/zaehne';
import { manifoldLaden } from './naht';

const R = 150;
/** eine gespiegelte Kugel mit drei Linien (Ring waagerecht, Mitte, Ring senkrecht), ihre Kreuzungen als Punkte, mit Griffen */
function kugel(): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: 1500 },
  );
  let h = hautAus(n.positionen, n.indizes);
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
  for (const l of loops) griffeAnlegen(l, l.ruhe, true);
  return { h, loops };
}
const IDS = { naechsteId: 100, naechsteKreuzung: 1000 };

/** offene Kanten und Kanten mit mehr als zwei Dreiecken */
function kantenFehler(h: Haut): number {
  const zahl = new Map<number, number>();
  for (let t = 0; t < h.tri.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = h.tri[t + e]!;
      const b = h.tri[t + ((e + 1) % 3)]!;
      const k = Math.min(a, b) * h.n + Math.max(a, b);
      zahl.set(k, (zahl.get(k) ?? 0) + 1);
    }
  let schlecht = 0;
  for (const n of zahl.values()) if (n !== 2) schlecht++;
  return schlecht;
}
/** Punkte ohne sauberen Spiegelpartner (er zeigt nicht zurück, oder liegt nicht gespiegelt) */
function paarFehler(h: Haut): number {
  let schlecht = 0;
  for (let v = 0; v < h.n; v++) {
    const s = h.spiegel[v]!;
    if (s < 0 || h.spiegel[s] !== v) {
      schlecht++;
      continue;
    }
    const d = Math.hypot(h.pos[3 * v]! - h.pos[3 * s]!, h.pos[3 * v + 1]! - h.pos[3 * s + 1]!, h.pos[3 * v + 2]! + h.pos[3 * s + 2]!);
    if (d > 1e-9) schlecht++;
  }
  return schlecht;
}
/** Punkte, die der Kern beim Neulesen der Paare nicht auseinanderhalten könnte (gleiche auf 0,001 gerundete Lage) */
function amSelbenOrt(h: Haut): number {
  const gesehen = new Set<string>();
  let doppelt = 0;
  for (let v = 0; v < h.n; v++) {
    const k = `${Math.round(h.pos[3 * v]! * 1e3)},${Math.round(h.pos[3 * v + 1]! * 1e3)},${Math.round(h.pos[3 * v + 2]! * 1e3)}`;
    if (gesehen.has(k)) doppelt++;
    gesehen.add(k);
  }
  return doppelt;
}
/** die Rechnung von heute bis zur Ruhe: Linien auf ihre Pfade, dann Runden; zurück: Runden, und ob sie steht */
function rechnen(h: Haut, loops: readonly Loop[], ende = 120): { runden: number; steht: boolean } {
  const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', {});
  const versch = loops.map((l) => {
    const p = pfadLagen(l) ?? Float64Array.from(l.ruhe);
    return Float64Array.from(p, (x, k) => x - l.ruhe[k]!);
  });
  for (let s = 1; s <= 10; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / 10)), 2);
  for (let r = 0; r < ende; r++) {
    const vor = Float64Array.from(h.pos);
    z.schritt(versch, 1);
    let w = 0;
    for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
    if (!Number.isFinite(w)) throw new Error('die Haut ist nicht endlich');
    if (w < 0.02) return { runden: r + 1, steht: true };
  }
  return { runden: ende, steht: false };
}

describe('das Maul als echte Form', () => {
  it('aus einer Linie: geschlossene Haut, genaue Spiegelpaare, kein Punkt auf einem anderen, Lippen als Zwillinge', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    // vom Mundwinkel (in der Kugel) nach vorn links hinaus; kreuzt den waagerechten Ring und die Mitte
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    expect(kantenFehler(r.haut)).toBe(0);
    expect(paarFehler(r.haut)).toBe(0);
    expect(amSelbenOrt(r.haut)).toBe(0);
    // die Mittelkante trennt das Netz weiter in zwei Hälften (daran liest die Anzeige, welche Hälfte vorn liegt)
    const seiten = hautSeiten(r.haut);
    expect(seiten).not.toBeNull();
    let vorn = 0;
    let hinten = 0;
    let mitteZahl = 0;
    for (let v = 0; v < r.haut.n; v++) {
      if (seiten![v] === 1) vorn++;
      else if (seiten![v] === -1) hinten++;
      else mitteZahl++;
    }
    expect(vorn).toBe(hinten);
    expect(mitteZahl).toBeGreaterThan(10);
    // die Lippe: der letzte Loop, hart, ein Maul aus einer Linie mit dem Haarspalt, ihr Mundwinkel in der Mitte ihrer Punkte
    const lippe = r.loops[r.loops.length - 1]!;
    expect(lippe.id).toBe(r.lippe);
    expect(lippe.kante).toBe(true);
    expect(istMaulLinie(lippe)).toBe(true);
    expect(lippe.maulLinie).toBe(MAUL_HAAR);
    const zw = zwillinge(lippe);
    expect(zw).not.toBeNull();
    expect(zw!.paare.length).toBeGreaterThanOrEqual(1);
    expect(zwillingsFehler(lippe, 'erste')!).toBeLessThan(1e-9);
    // im Maul: die Rachenlinie (hart) und die Mitte von Gaumen und Boden (in der Spiegelebene); jede Linie hat ihren Pfad
    expect(r.loops.filter((l) => l.kante && l !== lippe).length).toBe(1);
    for (const l of r.loops) {
      expect(hatPfad(l)).toBe(true);
      expect(pfadAbweichung(l)).toBeLessThan(1);
    }
    // die Linien der Form, die das Maul kreuzen, sind an der Lippe geschnitten
    expect(r.geschnitten).toBeGreaterThanOrEqual(2);
    expect(r.loops.length).toBeGreaterThan(d.loops.length + 3);
    // welcher Kiefer: Die Tasche ist in Gaumen und Boden getrennt, beide Seiten kommen vor
    const profil = new Profil([...linie]);
    const sk = kieferSeiten(r.haut, r.loops, r.lippe, { profil, C: linie[0]! });
    expect(sk.getrennt).toBe(true);
    let innenLinks = 0;
    let innenRechts = 0;
    for (let v = 0; v < r.haut.n; v++) {
      if (sk.aussen[v]) continue;
      if (sk.seite[v]! > 0) innenLinks++;
      else innenRechts++;
    }
    expect(innenLinks).toBeGreaterThan(5);
    expect(innenRechts).toBeGreaterThan(5);
  });

  it('danach: Nadeln weg, die Rechnung kommt zur Ruhe, die Kugel bleibt eine Kugel', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    const n = nadelnZusammenlegen(r.haut, r.loops, mk);
    const h = n ? n.haut : r.haut;
    const loops = n ? n.loops : r.loops;
    expect(kantenFehler(h)).toBe(0);
    expect(paarFehler(h)).toBe(0);
    const e = rechnen(h, loops);
    expect(e.steht).toBe(true);
    expect(paarFehler(h)).toBe(0);
    // außen bleibt die Kugel: kein Punkt weiter als 4 vom Radius (ohne Maul liegt die gerechnete Kugel bis rund 2 daneben)
    const profil = new Profil([...linie]);
    const lippe = loops.find((l) => istMaulLinie(l))!;
    const sk = kieferSeiten(h, loops, lippe.id, { profil, C: linie[0]! });
    let weit = 0;
    for (let v = 0; v < h.n; v++) {
      if (!sk.aussen[v]) continue;
      weit = Math.max(weit, Math.abs(Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - R));
    }
    expect(weit).toBeLessThan(4);
    // die Lippen sind nach dem Rechnen noch Zwillinge
    expect(zwillingsFehler(lippe, 'erste')!).toBeLessThan(1e-9);
  });

  it('die Kiefer: Lippen und Tasche drehen starr mit ihrem Kiefer, nichts faltet, die Drehung ist spiegelgleich', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    const h = r.haut;
    const lippe = r.loops[r.loops.length - 1]!;
    // die Probe am Mundwinkel (wie `mundwinkelVon` im Werk)
    const sW = lippe.punkte.find((p) => p.mundwinkel)!.s;
    let ecke = 1;
    for (let j = 1; j < lippe.proben.length - 1; j++) if (Math.abs(lippe.s[j]! - sW) < Math.abs(lippe.s[ecke]! - sW)) ecke = j;
    const L = maulLage(h, lippe, ecke)!;
    expect(L).not.toBeNull();
    // das Scharnier ist der Mundwinkel der Zeichnung, die Lippe läuft nach vorn links unten: Der Unterkiefer liegt links von ihr
    expect(Math.hypot(L.C.x - linie[0]!.x, L.C.y - linie[0]!.y)).toBeLessThan(1);
    expect(L.unten.lang).toBeGreaterThan(80);
    expect(Math.abs(L.oben.lang - L.unten.lang)).toBeLessThan(1);
    expect(L.untenLinks).toBe(true);
    expect(L.unten.links).toBe(true);
    expect(L.oben.links).toBe(false);
    // die Tropfen sitzen vor der Kieferspitze, oben über unten
    expect(kieferTropfenRuhe(L.oben).y).toBeGreaterThan(kieferTropfenRuhe(L.unten).y);
    const m = maulEchtAmLoop(h, r.loops, lippe, ecke)!;
    expect(m).not.toBeNull();
    expect(m.drehsinn).toBe(1);
    expect(m.offen.every((x) => x === 0)).toBe(true);
    // (im Zug gilt das Ergebnis für dieselbe Haut weiter)
    expect(maulEchtAmLoop(h, r.loops, lippe, ecke, { wieVorher: m })).toBe(m);
    const sk = kieferSeiten(h, r.loops, lippe.id, { profil: (L.ersteUnten ? L.unten : L.oben).profil, C: L.C });
    // (welche Hälfte welcher Kiefer ist, liest `maulLage` am Netz neben der Lippe, `kieferSeiten` an der Haut außen: beide gleich)
    expect(sk.ersteSeite > 0 === L.untenLinks).toBe(L.ersteUnten);
    const innen = (v: number): boolean => !sk.aussen[v] || sk.lippe.has(v);
    const a0 = lippe.proben[0]!.ecken[0];
    const a1 = lippe.proben[lippe.proben.length - 1]!.ecken[0];
    const ab = (P: ArrayLike<number>, a: number, b: number): number => Math.hypot(P[3 * a]! - P[3 * b]!, P[3 * a + 1]! - P[3 * b + 1]!, P[3 * a + 2]! - P[3 * b + 2]!);
    const normale = (P: ArrayLike<number>, t: number): [number, number, number] => {
      const [a, b, c] = [3 * h.tri[t]!, 3 * h.tri[t + 1]!, 3 * h.tri[t + 2]!];
      const [ux, uy, uz] = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
      const [vx, vy, vz] = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
      return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    };
    // zu: Der Unterkiefer schließt um den Haarspalt. Die zwei Enden der Lippe vorn rücken zusammen (längs der Lippe liegen sie am
    // Netz ein Zehntel nebeneinander: Die Lippen sind verschieden unterteilt), weiter schließt er nicht
    {
      const zu = kieferWinkel(m, { kiefer: -MAUL_HAAR, schaedel: 0 }, MAUL_HAAR)!;
      const Z = knochenDrehen(h.pos, zu, m.gelenk);
      expect(ab(Z, a0, a1)).toBeLessThan(ab(h.pos, a0, a1));
      expect(ab(Z, a0, a1)).toBeLessThan(0.15);
      const weiter = kieferWinkel(m, { kiefer: -5, schaedel: 0 }, MAUL_HAAR)!;
      for (let v = 0; v < h.n; v++) expect(weiter[v]).toBe(zu[v]);
    }
    for (const [kiefer, schaedel] of [
      [34, 8],
      [KIEFER_MAX.unten, KIEFER_MAX.oben],
    ] as const) {
      const theta = kieferWinkel(m, { kiefer, schaedel }, MAUL_HAAR)!;
      // spiegelgleich
      for (let v = 0; v < h.n; v++) expect(theta[h.spiegel[v]!]).toBe(theta[v]);
      const Z = knochenDrehen(h.pos, theta, m.gelenk);
      // die Lippen stehen vorn so weit auseinander, wie die zwei Winkel zusammen öffnen
      const rSpitze = Math.hypot(h.pos[3 * a0]! - L.C.x, h.pos[3 * a0 + 1]! - L.C.y);
      const soll = 2 * rSpitze * Math.sin((((kiefer + schaedel) * Math.PI) / 180) / 2);
      expect(Math.abs(ab(Z, a0, a1) - soll)).toBeLessThan(0.03 * soll);
      // Lippen und Tasche drehen starr: Keine Kante zwischen zwei ihrer Punkte ändert ihre Länge
      let starr = 0;
      for (let v = 0; v < h.n; v++) {
        if (!innen(v)) continue;
        for (const u of h.nachbarn[v]!) if (u > v && innen(u)) starr = Math.max(starr, Math.abs(ab(Z, u, v) - ab(h.pos, u, v)));
      }
      expect(starr).toBeLessThan(1e-6);
      // nichts faltet: Jede Normale zeigt nach dem Drehen noch auf die Seite ihrer Ruhe (diese um den mittleren Winkel der Ecken mitgedreht)
      let gefaltet = 0;
      for (let t = 0; t < h.tri.length; t += 3) {
        const n0 = normale(h.pos, t);
        if (Math.hypot(n0[0], n0[1], n0[2]) < 1e-3) continue;
        const w = (theta[h.tri[t]!]! + theta[h.tri[t + 1]!]! + theta[h.tri[t + 2]!]!) / 3;
        const n1 = normale(Z, t);
        if ((Math.cos(w) * n0[0] - Math.sin(w) * n0[1]) * n1[0] + (Math.sin(w) * n0[0] + Math.cos(w) * n0[1]) * n1[1] + n0[2] * n1[2] < 0) gefaltet++;
      }
      expect(gefaltet).toBe(0);
      // genau hinter dem Mundwinkel dreht nichts: der Punkt der Kugel hinten auf der Geraden durch das Scharnier
      let hinten = -1;
      let best = Infinity;
      for (let v = 0; v < h.n; v++) {
        const dx = h.pos[3 * v]! - L.C.x;
        const dy = h.pos[3 * v + 1]! - L.C.y;
        if (dx * L.t0.x + dy * L.t0.y >= 0) continue;
        const quer = Math.abs(L.t0.x * dy - L.t0.y * dx) + Math.abs(h.pos[3 * v + 2]!);
        if (quer < best) {
          best = quer;
          hinten = v;
        }
      }
      expect(Math.abs(theta[hinten]!)).toBeLessThan(0.01);
    }
  });

  it('getrennte Lippen: die Unterlippe kürzer gezogen, jeder Kiefer liest seine eigene Lippe, die Rechnung kommt zur Ruhe', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    const nd = nadelnZusammenlegen(r.haut, r.loops, mk);
    const h = nd ? nd.haut : r.haut;
    const loops = nd ? nd.loops : r.loops;
    expect(rechnen(h, loops).steht).toBe(true);
    const lippe = loops.find((l) => istMaulLinie(l))!;
    const eckeVon = (): number => {
      const sW = lippe.punkte.find((p) => p.mundwinkel)!.s;
      let e = 1;
      for (let j = 1; j < lippe.proben.length - 1; j++) if (Math.abs(lippe.s[j]! - sW) < Math.abs(lippe.s[e]! - sW)) e = j;
      return e;
    };
    const vorher = maulLage(h, lippe, eckeVon())!;
    // trennen: Die Punkte gelten nicht mehr für beide Lippen
    delete lippe.maulLinie;
    expect(zwillinge(lippe)).toBeNull();
    // die Unterlippe ein Fünftel kürzer: jeder ihrer Punkte (und was an ihm hängt) zum Mundwinkel hin, ihre Griffe im selben Maß
    const iW = lippe.punkte.findIndex((p) => p.mundwinkel);
    const W = lippe.punkte[iW]!.ref;
    const f = 0.8;
    const untere = lippe.punkte.map((_, i) => i).filter((i) => (vorher.ersteUnten ? i < iW : i > iW));
    for (const i of untere) {
      const p = lippe.punkte[i]!;
      const neu = { x: W.x + (p.ref.x - W.x) * f, y: W.y + (p.ref.y - W.y) * f, z: p.ref.z };
      p.ref = neu;
      p.cur = { ...neu };
      if (p.ein) p.ein = { x: p.ein.x * f, y: p.ein.y * f, z: p.ein.z };
      if (p.aus) p.aus = { x: p.aus.x * f, y: p.aus.y * f, z: p.aus.z };
      if (p.kreuzung === undefined) continue;
      for (const o of loops)
        for (const q of o.punkte)
          if (o !== lippe && q.kreuzung === p.kreuzung) {
            q.ref = { ...neu };
            q.cur = { ...neu };
          }
    }
    {
      // (der Griff des Mundwinkels zur Unterlippe hin geht mit)
      const w = lippe.punkte[iW]!;
      const zurUnteren = vorher.ersteUnten ? w.ein : w.aus;
      if (zurUnteren) {
        zurUnteren.x *= f;
        zurUnteren.y *= f;
      }
    }
    const e = rechnen(h, loops);
    expect(e.steht).toBe(true);
    expect(kantenFehler(h)).toBe(0);
    expect(paarFehler(h)).toBe(0);
    const ecke = eckeVon();
    // welche Hälfte die Unterlippe ist, steht seit dem Schneiden fest und wird mitgegeben: Aus der Lage gelesen kippt es hier (die
    // Haut des gekürzten Unterkiefers liegt in der Seite über seiner Lippe)
    expect(maulLage(h, lippe, ecke)!.ersteUnten).not.toBe(vorher.ersteUnten);
    const L = maulLage(h, lippe, ecke, vorher.ersteUnten)!;
    expect(L.ersteUnten).toBe(vorher.ersteUnten);
    expect(L.unten.lang).toBeLessThan(0.9 * vorher.unten.lang);
    expect(Math.abs(L.oben.lang - vorher.oben.lang)).toBeLessThan(0.03 * vorher.oben.lang);
    expect(kieferTropfenRuhe(L.oben).y).toBeGreaterThan(kieferTropfenRuhe(L.unten).y);
    // die Kiefer: nichts faltet, die Drehung ist spiegelgleich
    const m = maulEchtAmLoop(h, loops, lippe, ecke, { ersteUnten: vorher.ersteUnten })!;
    expect(m).not.toBeNull();
    // der Unterkiefer öffnet zu seiner Seite: Die Spitze der Unterlippe geht nach unten, die der Oberlippe nach oben
    const theta = kieferWinkel(m, { kiefer: 34, schaedel: 8 })!;
    {
      const spU = lippe.proben[vorher.ersteUnten ? 0 : lippe.proben.length - 1]!.ecken[0];
      const spO = lippe.proben[vorher.ersteUnten ? lippe.proben.length - 1 : 0]!.ecken[0];
      const Zs = knochenDrehen(h.pos, theta, m.gelenk);
      expect(Zs[3 * spU + 1]!).toBeLessThan(h.pos[3 * spU + 1]! - 5);
      expect(Zs[3 * spO + 1]!).toBeGreaterThan(h.pos[3 * spO + 1]! + 1);
    }
    for (let v = 0; v < h.n; v++) expect(theta[h.spiegel[v]!]).toBe(theta[v]);
    const Z = knochenDrehen(h.pos, theta, m.gelenk);
    const normale = (P: ArrayLike<number>, t: number): [number, number, number] => {
      const [a, b, c] = [3 * h.tri[t]!, 3 * h.tri[t + 1]!, 3 * h.tri[t + 2]!];
      const [ux, uy, uz] = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
      const [vx, vy, vz] = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
      return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    };
    let gefaltet = 0;
    for (let t = 0; t < h.tri.length; t += 3) {
      const n0 = normale(h.pos, t);
      if (Math.hypot(n0[0], n0[1], n0[2]) < 1e-3) continue;
      const w = (theta[h.tri[t]!]! + theta[h.tri[t + 1]!]! + theta[h.tri[t + 2]!]!) / 3;
      const n1 = normale(Z, t);
      if ((Math.cos(w) * n0[0] - Math.sin(w) * n0[1]) * n1[0] + (Math.sin(w) * n0[0] + Math.cos(w) * n0[1]) * n1[1] + n0[2] * n1[2] < 0) gefaltet++;
    }
    expect(gefaltet).toBe(0);
  });

  it('die Ebene „Maul“: eine Zahnfleischlinie und zwei Füllungen, die Farbe bleibt in der Tasche', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    const h = r.haut;
    const lippe = r.loops[r.loops.length - 1]!;
    const sW = lippe.punkte.find((p) => p.mundwinkel)!.s;
    let ecke = 1;
    for (let j = 1; j < lippe.proben.length - 1; j++) if (Math.abs(lippe.s[j]! - sW) < Math.abs(lippe.s[ecke]! - sW)) ecke = j;
    const L = maulLage(h, lippe, ecke)!;
    const erste = L.ersteUnten ? L.unten : L.oben;
    const sk = kieferSeiten(h, r.loops, lippe.id, { profil: erste.profil, C: L.C }, erste.links ? 1 : -1);
    const innen = Uint8Array.from({ length: h.n }, (_, v) => (!sk.aussen[v] || sk.lippe.has(v) ? 1 : 0));
    const k = karteVon(h);
    const b = leereBemalung();
    const ebene = maulEbeneBauen(b, k, { innen, lippe: lippe.proben.map((q) => q.ecken[0]), lang: L.unten.lang });
    if ('fehler' in ebene) throw new Error(ebene.fehler);
    expect(ebene.name).toBe(MAUL_EBENE);
    expect(b.ebenen[b.ebenen.length - 1]).toBe(ebene);
    expect(b.aktiv).toBe(1);
    expect(ebene.linien.length).toBe(1);
    expect(ebene.fuellungen.length).toBe(2);
    // die Zahnfleischlinie beginnt und endet in der Mittelebene (ihr Spiegelbild schließt sie)
    const zf = ebene.linien[0]!;
    for (const o of [zf.stuetzen[0]!, zf.stuetzen[zf.stuetzen.length - 1]!]) expect(Math.abs(o.w[0] * h.pos[3 * o.e[0] + 2]! + o.w[1] * h.pos[3 * o.e[1] + 2]! + o.w[2] * h.pos[3 * o.e[2] + 2]!)).toBeLessThan(1e-9);
    // die Flächen, wie das Farbwerk sie rechnet: mit der Tasche als Gebiet
    const { ketten, fehl } = kettenAller(k, ebene.linien, true);
    expect(fehl.length).toBe(0);
    const saaten: Saat[] = [];
    ebene.fuellungen.forEach((f, nr) => {
      saaten.push({ ort: f.saat, farbe: nr });
      const g = ortGespiegelt(k, f.saat);
      if (g) saaten.push({ ort: g, farbe: nr });
    });
    const gebiet = Uint8Array.from({ length: k.T }, (_, t) => (innen[h.tri[3 * t]!] && innen[h.tri[3 * t + 1]!] && innen[h.tri[3 * t + 2]!] ? 1 : 0));
    const fl = flaechenRechnen(k, ketten, saaten, gebiet);
    const zahl = [0, 0];
    let aussen = 0;
    for (let t = 0; t < k.T; t++) {
      const f = fl.ganz[t]!;
      if (f < 0) continue;
      if (gebiet[t]) zahl[f]!++;
      else aussen++;
    }
    // beide Farben stehen in der Tasche, außen keine; jedes Dreieck, durch das die Zahnfleischlinie läuft, liegt in der Tasche
    expect(aussen).toBe(0);
    expect(zahl[0]!).toBeGreaterThan(3);
    expect(zahl[1]!).toBeGreaterThan(3);
    for (const q of fl.rand) expect(gebiet[q.t]).toBe(1);
    // ohne das Gebiet liefe das Zahnfleisch über die Lippe auf die ganze Form (darum gibt es das Gebiet)
    const ohne = flaechenRechnen(k, ketten, saaten);
    let ausgelaufen = 0;
    for (let t = 0; t < k.T; t++) if (!gebiet[t] && ohne.ganz[t]! >= 0) ausgelaufen++;
    expect(ausgelaufen).toBeGreaterThan(100);
  });

  it('die Zähne: oben zwölf, unten elf, spiegelgleich; zu stecken sie im Maul, offen zeigen sie zum anderen Kiefer; die Werte der Linse; einzelne Zähne', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const linie = [
      { x: -50, y: 20 },
      { x: -100, y: 0 },
      { x: -150, y: -18 },
      { x: -190, y: -30 },
    ];
    const r = maulSchneidenMit(wasm, { haut: d.h, loops: d.loops }, linie, { ...IDS, mk });
    if ('fehler' in r) throw new Error(r.fehler);
    const h = r.haut;
    const lippe = r.loops[r.loops.length - 1]!;
    const sW = lippe.punkte.find((p) => p.mundwinkel)!.s;
    let ecke = 1;
    for (let j = 1; j < lippe.proben.length - 1; j++) if (Math.abs(lippe.s[j]! - sW) < Math.abs(lippe.s[ecke]! - sW)) ecke = j;
    const L = maulLage(h, lippe, ecke)!;
    const erste = L.ersteUnten ? L.unten : L.oben;
    const sk = kieferSeiten(h, r.loops, lippe.id, { profil: erste.profil, C: L.C }, erste.links ? 1 : -1);
    // die Tasche, wie das Werk sie nennt (`werk.maulTasche`)
    const innen = new Uint8Array(h.n);
    const kiefer = new Int8Array(h.n);
    const unten = L.untenLinks ? 1 : -1;
    for (let v = 0; v < h.n; v++) {
      if (sk.aussen[v] && !sk.lippe.has(v)) continue;
      innen[v] = 1;
      if (!sk.rachen.has(v) && v !== sk.winkel && v !== h.spiegel[sk.winkel]) kiefer[v] = sk.seite[v] === unten ? 1 : -1;
    }
    expect(sk.rachen.size).toBeGreaterThan(2);
    const k = karteVon(h);
    const plaetze = zahnPlaetze(k, { innen, lippe: lippe.proben.map((q) => q.ecken[0]), lang: L.unten.lang, kiefer }, L.C, ZAEHNE_ANFANG);
    expect(plaetze.filter((q) => !q.unten).length).toBe(12);
    expect(plaetze.filter((q) => q.unten).length).toBe(11);
    // oben sechs Paare, unten fünf Paare und ein Zahn an der Spitze; vorn sind sie größer als hinten
    expect(plaetze.filter((q) => q.gespiegelt).length).toBe(11);
    const vorn = plaetze.filter((q) => q.vorn > 0.8);
    const hinten = plaetze.filter((q) => q.vorn < 0.2);
    expect(Math.min(...vorn.map((q) => q.mass))).toBeGreaterThan(Math.max(...hinten.map((q) => q.mass)));
    // die unteren stehen in den Lücken der oberen: Von jedem unteren Zahn aus sind die zwei nächsten oberen etwa gleich weit weg
    // (stünde er einem oberen gegenüber, wäre der nächste viel näher als der übernächste)
    const fussVon = (q: (typeof plaetze)[number]): number[] => {
      const p = (o: { e: readonly number[]; w: readonly number[] }): number[] => [0, 1, 2].map((x) => o.w[0]! * h.pos[3 * o.e[0]! + x]! + o.w[1]! * h.pos[3 * o.e[1]! + x]! + o.w[2]! * h.pos[3 * o.e[2]! + x]!);
      const a = p(q.a);
      const b = p(q.b);
      const ort = a.map((x, i) => x + q.u * (b[i]! - x));
      return q.gespiegelt ? [ort[0]!, ort[1]!, -ort[2]!] : ort;
    };
    const versatzVon = (pl: typeof plaetze): number => {
      const obere = pl.filter((q) => !q.unten).map(fussVon);
      let versatz = Infinity;
      for (const q of pl.filter((q2) => q2.unten)) {
        const f = fussVon(q);
        const weiten = obere.map((o) => Math.hypot(o[0]! - f[0]!, o[1]! - f[1]!, o[2]! - f[2]!)).sort((x, y) => x - y);
        versatz = Math.min(versatz, weiten[0]! / weiten[1]!);
      }
      return versatz;
    };
    expect(versatzVon(plaetze)).toBeGreaterThan(0.6);
    // die Linse stellt beide Reihen zusammen (`zaehnePaar`): unten immer einer weniger, und sie greifen bei jeder Anzahl ineinander
    const tasche = { innen, lippe: lippe.proben.map((q) => q.ecken[0]), lang: L.unten.lang, kiefer };
    for (const anzahl of [3, 5, 8, 17]) {
      const paar = zaehnePaar(ZAEHNE_ANFANG, anzahl);
      expect(paar.oben.anzahl).toBe(anzahl);
      expect(paar.unten.anzahl).toBe(anzahl - 1);
      expect(paar.oben.bis).toBe(ZAEHNE_ANFANG.oben.bis);
      const pl = zahnPlaetze(k, tasche, L.C, paar);
      expect(pl.filter((q) => !q.unten).length).toBe(anzahl);
      expect(pl.filter((q) => q.unten).length).toBe(anzahl - 1);
      expect(versatzVon(pl)).toBeGreaterThan(0.6);
    }
    // ein Zahn oben, keiner unten: Die untere Reihe ist leer
    expect(zahnPlaetze(k, tasche, L.C, zaehnePaar(ZAEHNE_ANFANG, 1)).map((q) => q.unten)).toEqual([false]);
    // der Sitz: Zwischen seinen Grenzen ändert er die Plätze, darüber nicht mehr
    const sitz = sitzGrenzen(k, tasche)!;
    expect(sitz.max).toBeGreaterThan(sitz.min);
    const mitSitz = (w: number): number[] => zahnPlaetze(k, tasche, L.C, { oben: { ...ZAEHNE_ANFANG.oben, sitz: w }, unten: { ...ZAEHNE_ANFANG.unten, sitz: w } }).flatMap(fussVon);
    const amRand = mitSitz(sitz.max);
    const darueber = mitSitz(sitz.max + 1);
    expect(Math.max(...amRand.map((x, i) => Math.abs(x - darueber[i]!)))).toBeLessThan(1e-9);
    const innenDrin = mitSitz((sitz.min + sitz.max) / 2);
    expect(Math.max(...amRand.map((x, i) => Math.abs(x - innenDrin[i]!)))).toBeGreaterThan(0.1);
    // zu (kein Spalt): Jeder Zahn steckt im Maul, er hat keine Ausdehnung
    const je = (n: { pos: Float32Array }, nr: number): { min: number[]; max: number[] } => {
      const m = n.pos.length / 3 / plaetze.length;
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = nr * m; i < (nr + 1) * m; i++)
        for (let x = 0; x < 3; x++) {
          min[x] = Math.min(min[x]!, n.pos[3 * i + x]!);
          max[x] = Math.max(max[x]!, n.pos[3 * i + x]!);
        }
      return { min, max };
    };
    const zu = zaehneNetz(plaetze, h.pos, 1, { x: 0, y: 0 }, () => 0, () => 1)!;
    expect(zu.pos.every((x) => Number.isFinite(x))).toBe(true);
    for (let q = 0; q < plaetze.length; q++) {
      const b = je(zu, q);
      expect(Math.hypot(b.max[0]! - b.min[0]!, b.max[1]! - b.min[1]!, b.max[2]! - b.min[2]!)).toBeLessThan(1e-6);
    }
    // offen (der Spalt reicht jedem): Die Zähne des Oberkiefers hängen nach unten, die des Unterkiefers stehen nach oben
    const offen = zaehneNetz(plaetze, h.pos, 1, { x: 0, y: 0 }, () => 1e6, () => 1)!;
    expect(offen.pos.length).toBe(zu.pos.length);
    expect(offen.pos.every((x) => Number.isFinite(x))).toBe(true);
    for (let q = 0; q < plaetze.length; q++) {
      const fuss = je(zu, q).min;
      const b = je(offen, q);
      const lang = Math.max(b.max[1]! - fuss[1]!, fuss[1]! - b.min[1]!);
      expect(lang).toBeGreaterThan(0.5 * plaetze[q]!.mass);
      // (die Kugel steht gerade: „zum anderen Kiefer“ ist hier im Wesentlichen nach unten oder nach oben)
      if (plaetze[q]!.unten) expect(b.max[1]! - fuss[1]!).toBeGreaterThan(fuss[1]! - b.min[1]!);
      else expect(fuss[1]! - b.min[1]!).toBeGreaterThan(b.max[1]! - fuss[1]!);
    }
    // ---- einzelne Zähne (dritte Scheibe): eigene Werte an der Reihe ----
    const R0 = ZAEHNE_ANFANG.oben;
    expect(partner(R0, 2)).toBe(9);
    expect(partner(ZAEHNE_ANFANG.unten, 5)).toBe(5);
    const mit = (r: typeof R0): typeof plaetze => zahnPlaetze(k, tasche, L.C, { oben: r, unten: ZAEHNE_ANFANG.unten }).filter((q) => !q.unten);
    const ohne = mit(R0);
    const platzVon = (pl: typeof plaetze, i: number): (typeof plaetze)[number] => pl.find((q) => q.i === i)!;
    expect(ohne.map((q) => q.i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(ohne.every((q) => q.ds === 0 && q.dz === 0 && q.form === 0)).toBe(true);
    // gezogen: Dort ist eine Lücke, die anderen stehen, wo sie standen
    const luecke = mit(eigenSetzen(R0, [2, 9], () => ({ weg: true })));
    expect(luecke.map((q) => q.i)).toEqual([0, 1, 3, 4, 5, 6, 7, 8, 10, 11]);
    expect(Math.hypot(...fussVon(platzVon(luecke, 3)).map((x, j) => x - fussVon(platzVon(ohne, 3))[j]!))).toBeLessThan(1e-9);
    // gerückt längs der Reihe nach hinten: weiter von der Spitze, der Nachbar bleibt; das Spiegelbild rückt genauso
    const spitze = [0, 1, 2].map((j) => (fussVon(platzVon(ohne, 5))[j]! + fussVon(platzVon(ohne, 6))[j]!) / 2);
    const weit = (q: (typeof plaetze)[number]): number => Math.hypot(...fussVon(q).map((x, j) => x - spitze[j]!));
    const gerueckt = mit(eigenSetzen(R0, [4, 7], (e) => ({ ...e, ds: 0.1 })));
    expect(platzVon(gerueckt, 4).ds).toBeCloseTo(0.1, 6);
    expect(weit(platzVon(gerueckt, 4))).toBeGreaterThan(weit(platzVon(ohne, 4)) + 0.05 * platzVon(ohne, 4).lang);
    expect(weit(platzVon(gerueckt, 7))).toBeCloseTo(weit(platzVon(gerueckt, 4)), 6);
    expect(Math.hypot(...fussVon(platzVon(gerueckt, 3)).map((x, j) => x - fussVon(platzVon(ohne, 3))[j]!))).toBeLessThan(1e-9);
    // (Größe und Sprießen bleiben die seines Platzes)
    expect(platzVon(gerueckt, 4).mass).toBeCloseTo(platzVon(ohne, 4).mass, 9);
    expect(platzVon(gerueckt, 4).vorn).toBeCloseTo(platzVon(ohne, 4).vorn, 9);
    // weit über das Ende hinaus: Er bleibt auf seiner Wand, sein Versatz ist der, der gilt
    const zuWeit = platzVon(mit(eigenSetzen(R0, [4], (e) => ({ ...e, ds: 5 }))), 4);
    expect(zuWeit.ds).toBeGreaterThan(0.1);
    expect(zuWeit.ds).toBeLessThan(1);
    const vorDieSpitze = platzVon(mit(eigenSetzen(R0, [4], (e) => ({ ...e, ds: -5 }))), 4);
    expect(weit(vorDieSpitze)).toBeLessThan(weit(platzVon(ohne, 5)));
    expect(fussVon(vorDieSpitze).every((x) => Number.isFinite(x))).toBe(true);
    // gerückt zur Tiefe des Mauls: auf der Linie eines anderen Sitzes, festgehalten in der Tasche
    const tiefer = platzVon(mit(eigenSetzen(R0, [4], (e) => ({ ...e, dz: 0.3 }))), 4);
    expect(tiefer.dz).toBeGreaterThan(0.05);
    expect(tiefer.dz).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(Math.hypot(...fussVon(tiefer).map((x, j) => x - fussVon(platzVon(ohne, 4))[j]!))).toBeGreaterThan(0.02 * tiefer.breit);
    expect(platzVon(mit(eigenSetzen(R0, [4], (e) => ({ ...e, dz: 50 }))), 4).dz).toBeLessThan(sitz.max);
    // eigene Größe und eigene Vorlage
    const eigen = mit(eigenSetzen(R0, [4], (e) => ({ ...e, faktor: 1.5, form: 7 })));
    expect(platzVon(eigen, 4).mass / platzVon(ohne, 4).mass).toBeCloseTo(1.5, 9);
    expect(platzVon(eigen, 4).form).toBe(7);
    expect(platzVon(eigen, 7).form).toBe(0);
    // `eigenSetzen` ändert nichts am Ort; ohne Eigenes bleibt kein leerer Eintrag; mit der Anzahl fällt das Eigene
    const mitEigen = eigenSetzen(R0, [4], (e) => ({ ...e, ds: 0.1 }));
    expect(R0.eigen).toBeUndefined();
    expect(eigenSetzen(mitEigen, [4], () => ({})).eigen).toBeUndefined();
    expect(mitAnzahl(mitEigen, 12)).toBe(mitEigen);
    expect(mitAnzahl(mitEigen, 13).eigen).toBeUndefined();
    expect(zaehnePaar({ oben: mitEigen, unten: ZAEHNE_ANFANG.unten }, 14).oben.eigen).toBeUndefined();
    // der Rahmen eines Zahns an der Haut: sein Fuß, längs und zur Lippe stehen in der Wand; das Spiegelbild ist gespiegelt
    const qa = platzVon(ohne, 2);
    const qb = platzVon(ohne, 9);
    expect(qa.gespiegelt).not.toBe(qb.gespiegelt);
    const Ra = zahnRahmen(qa, h.pos);
    const Rb = zahnRahmen(qb, h.pos);
    const punkt = (u: number[], v: number[]): number => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
    expect(Math.hypot(...Ra.x)).toBeCloseTo(1, 6);
    expect(Math.abs(punkt(Ra.x, Ra.n))).toBeLessThan(1e-6);
    expect(Math.abs(punkt(Ra.zl, Ra.n))).toBeLessThan(1e-6);
    expect(Math.hypot(Ra.ort[0] - Rb.ort[0], Ra.ort[1] - Rb.ort[1], Ra.ort[2] + Rb.ort[2])).toBeLessThan(1e-6);
    expect(Math.hypot(Ra.x[0] - Rb.x[0], Ra.x[1] - Rb.x[1], Ra.x[2] + Rb.x[2])).toBeLessThan(1e-6);
    // (längs zeigt von der Spitze nach hinten: Ein Schritt in dieser Richtung führt weiter von der Spitze weg)
    expect(Math.hypot(...Ra.ort.map((x, j) => x + 0.5 * Ra.x[j]! - spitze[j]!))).toBeGreaterThan(Math.hypot(...Ra.ort.map((x, j) => x - spitze[j]!)));
    // der weiche Wechsel der Vorlage: Das Netz dazwischen hat dieselben Punkte und Dreiecke; am Anfang ist es die alte, am Ende die neue Form
    const halb = zaehneNetz(plaetze, h.pos, 1, { x: 0, y: 0 }, () => 1e6, () => 1, null, () => formNetzGemischt(0, 2, 0.5))!;
    expect(halb.pos.length).toBe(offen.pos.length);
    expect(halb.index.length).toBe(offen.index.length);
    expect(halb.pos.every((x) => Number.isFinite(x))).toBe(true);
    const alt = zaehneNetz(plaetze, h.pos, 1, { x: 0, y: 0 }, () => 1e6, () => 1, null, () => formNetzGemischt(0, 2, 0))!;
    expect(Math.max(...Array.from(alt.pos, (x, i) => Math.abs(x - offen.pos[i]!)))).toBeLessThan(1e-6);
    expect(formNetzGemischt(0, 2, 1).laenge).toBeCloseTo(2.7, 6);
    expect(formNetzGemischt(0, 2, 0.5).laenge).toBeCloseTo((1.35 + 2.7) / 2, 6);
    // spiegelgleich: zu jedem Punkt eines gespiegelten Zahns gibt es den seines Zwillings bei −z
    const nr = plaetze.findIndex((q) => q.gespiegelt);
    const zw = plaetze.findIndex((q) => !q.gespiegelt && q.unten === plaetze[nr]!.unten && Math.abs(q.vorn - plaetze[nr]!.vorn) < 1e-9 && q.vorn < 0.99);
    expect(zw).toBeGreaterThanOrEqual(0);
    const A = je(offen, nr);
    const B = je(offen, zw);
    expect(Math.abs(A.min[2]! + B.max[2]!)).toBeLessThan(1e-4);
    expect(Math.abs(A.max[0]! - B.max[0]!)).toBeLessThan(1e-4);
  });

  it('sagt, warum es nicht geht: die Linie trifft die Form nicht', async () => {
    const wasm = await manifoldLaden();
    const d = kugel();
    const mk = mittlereKante(d.h);
    const r = maulSchneidenMit(
      wasm,
      { haut: d.h, loops: d.loops },
      [
        { x: -300, y: 0 },
        { x: -400, y: 0 },
      ],
      { ...IDS, mk },
    );
    expect('fehler' in r).toBe(true);
  });
});
