import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type V3, hautAus } from './kurven';
import {
  type GriffVersatz,
  type Loop,
  LoopZug,
  bereichUm,
  eckenAuto,
  festlegen,
  formAusZeichnung,
  griffeAbbilden,
  griffeAusrichten,
  griffeBei,
  griffZiehen,
  haerteAn,
  istEcke,
  kantenGewichte,
  knickWinkel,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  ringEnde,
  stelleBei,
  verschiebungLaengs,
} from './loops';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const kugel = () => {
  const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
  return hautAus(netz.positionen, netz.indizes);
};
const ausmass = (pos: Float64Array) => {
  const m = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (let v = 0; v < pos.length / 3; v++) {
    for (let c = 0; c < 3; c++) {
      m[2 * c] = Math.min(m[2 * c]!, pos[3 * v + c]!);
      m[2 * c + 1] = Math.max(m[2 * c + 1]!, pos[3 * v + c]!);
    }
  }
  return m;
};
const schiefe = (h: ReturnType<typeof kugel>) => {
  let m = 0;
  for (let v = 0; v < h.n; v++) {
    const w = h.spiegel[v]!;
    if (w >= 0) m = Math.max(m, Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! + h.pos[3 * w + 2]!));
  }
  return m;
};

/** die drei Achsen-Loops der Kugel, ihre Kreuzungen als Punkte */
function dreiLoops(h: ReturnType<typeof kugel>) {
  const fang = 8;
  const quer = loopAusSchnitt(h, 'seite', [0, 200], [0, -200], 1, fang)!;
  const waag = loopAusSchnitt(h, 'front', [-200, 0], [200, 0], 2, fang)!;
  const mitte = loopAusSchnitt(h, 'top', [-200, 0], [200, 0], 3, fang)!;
  const loops: Loop[] = [quer, waag, mitte];
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  const kreuzungen: number[] = [];
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      const funde = kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol);
      kreuzungen.push(funde.length);
      for (const f of funde) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
    }
  }
  return { loops, quer, waag, mitte, kreuzungen };
}

describe('Nur Loops: Griffe an Kreuzungen', () => {
  it('Kugel ohne Loops: drei Schnitte (Seite quer, Front waagerecht, Top Mitte) geben 5 gespeicherte Kreuzungen (6 mit Spiegel)', () => {
    const h = kugel();
    const vorher = Float64Array.from(h.pos);
    const { quer, waag, mitte, kreuzungen } = dreiLoops(h);
    log(
      `Arten ${quer.art}/${waag.art}/${mitte.art}, Längen ${quer.laenge.toFixed(0)}/${waag.laenge.toFixed(0)}/${mitte.laenge.toFixed(0)}, ` +
        `Kreuzungen quer×waag ${kreuzungen[0]}, quer×mitte ${kreuzungen[1]}, waag×mitte ${kreuzungen[2]}`,
    );
    expect([quer.art, waag.art, mitte.art]).toEqual(['ring', 'ring', 'mitte']);
    expect(Math.abs(quer.laenge - Math.PI * 150)).toBeLessThan(6);
    expect(Math.abs(mitte.laenge - 2 * Math.PI * 150)).toBeLessThan(10);
    expect(kreuzungen).toEqual([1, 2, 2]);
    // Schneiden ändert die Haut nicht
    expect(Math.max(...vorher.map((x, i) => Math.abs(x - h.pos[i]!)))).toBe(0);
  });

  it('Kreuzung quer × waagerecht von 150 auf 100: von oben und vorn schmaler, Höhe und Länge bleiben, spiegelgleich', () => {
    const h = kugel();
    const { loops } = dreiLoops(h);
    const zentren = loops.slice(0, 2).flatMap((l) => Array.from({ length: l.proben.length }, (_, i) => ({ x: l.ruhe[3 * i]!, y: l.ruhe[3 * i + 1]!, z: l.ruhe[3 * i + 2]! })));
    const t0 = Date.now();
    const zug = new LoopZug(h, loops, bereichUm(h, zentren, 120, []));
    const tz = Date.now() - t0;
    const t1 = Date.now();
    for (let s = 1; s <= 5; s++) {
      const versch = loops.map((l) => verschiebungLaengs(l, l.punkte.map((p) => (p.kreuzung === 1 ? { x: 0, y: 0, z: -10 * s } : { x: 0, y: 0, z: 0 }))));
      zug.schritt(versch, 2);
    }
    const ms = (Date.now() - t1) / 5;
    zug.schritt(
      loops.map((l) => verschiebungLaengs(l, l.punkte.map((p) => (p.kreuzung === 1 ? { x: 0, y: 0, z: -50 } : { x: 0, y: 0, z: 0 })))),
      4,
    );
    const m = ausmass(h.pos);
    let mitteZ = 0;
    for (let v = 0; v < h.n; v++) if (Math.abs(h.pos[3 * v]!) < 15 && Math.abs(h.pos[3 * v + 1]!) < 15) mitteZ = Math.max(mitteZ, h.pos[3 * v + 2]!);
    log(`schmaler: Mitte z ${mitteZ.toFixed(1)}, x ${m[0]!.toFixed(1)}…${m[1]!.toFixed(1)}, y ${m[2]!.toFixed(1)}…${m[3]!.toFixed(1)}, z max ${m[5]!.toFixed(1)}, schief ${schiefe(h).toExponential(1)}, zerlegen ${tz} ms, ${ms.toFixed(1)} ms je Zug`);
    expect(Math.abs(mitteZ - 100)).toBeLessThan(4);
    expect(Math.abs(m[1]! - 150)).toBeLessThan(2);
    expect(Math.abs(m[3]! - 150)).toBeLessThan(2);
    expect(schiefe(h)).toBeLessThan(1e-6);
    loops.forEach((l) => festlegen(h, l));
    expect(Math.abs(loops[0]!.punkte.find((p) => p.kreuzung === 1)!.ref.z - 100)).toBeLessThan(2);
  });

  it('Form auf der Seite (Kreis um ein Auge): liegt auf der Haut, ein Punkt hinausgezogen hebt nur dort', () => {
    const h = kugel();
    const uv: [number, number][] = Array.from({ length: 64 }, (_, i) => [-60 + 35 * Math.cos((2 * Math.PI * i) / 64), 40 + 35 * Math.sin((2 * Math.PI * i) / 64)]);
    const knoten = Array.from({ length: 8 }, (_, i) => 8 * i);
    const auge = formAusZeichnung(h, 'seite', uv, knoten, 9)!;
    expect(auge.art).toBe('paar');
    expect(auge.punkte.length).toBe(8);
    punktEinfuegen(auge, auge.laenge / 3);
    expect(auge.punkte.length).toBe(9);
    auge.punkte.splice(4, 1);
    expect(auge.punkte.length).toBe(8);
    const vorher = Float64Array.from(h.pos);
    // Punkt 0 nach außen (längs seiner Lage von der Mitte weg) um 12
    const p0 = auge.punkte[0]!.ref;
    const r = Math.hypot(p0.x, p0.y, p0.z);
    const D = auge.punkte.map((_, i) => (i === 0 ? { x: (12 * p0.x) / r, y: (12 * p0.y) / r, z: (12 * p0.z) / r } : { x: 0, y: 0, z: 0 }));
    const versch = verschiebungLaengs(auge, D);
    const zentren = Array.from({ length: auge.proben.length }, (_, i) => ({ x: auge.ruhe[3 * i]!, y: auge.ruhe[3 * i + 1]!, z: auge.ruhe[3 * i + 2]! }));
    const zug = new LoopZug(h, [auge], bereichUm(h, zentren, 60, []));
    zug.schritt([versch], 6);
    let hebung = 0;
    let fern = 0;
    for (let v = 0; v < h.n; v++) {
      const d = Math.hypot(h.pos[3 * v]! - vorher[3 * v]!, h.pos[3 * v + 1]! - vorher[3 * v + 1]!, h.pos[3 * v + 2]! - vorher[3 * v + 2]!);
      const naheP0 = Math.hypot(vorher[3 * v]! - p0.x, vorher[3 * v + 1]! - p0.y, vorher[3 * v + 2]! - p0.z) < 8;
      if (naheP0) hebung = Math.max(hebung, d);
      if (vorher[3 * v]! > 60) fern = Math.max(fern, d);
    }
    log(`Auge: ${auge.proben.length} Proben, Hebung am Punkt ${hebung.toFixed(1)}, hinten ${fern}`);
    expect(hebung).toBeGreaterThan(9);
    expect(fern).toBe(0);
  });

  it('Braue: Augen-Form oben hart (3) und hinausgezogen gibt einen Knick, weich (0) eine runde Wulst', () => {
    const lauf = (hart: number) => {
      const h0 = kugel();
      const uv: [number, number][] = Array.from({ length: 64 }, (_, i) => [-60 + 35 * Math.cos((2 * Math.PI * i) / 64), 40 + 35 * Math.sin((2 * Math.PI * i) / 64)]);
      // die Form wird eine Kette von Kanten des Netzes (sonst kann sie sich nicht knicken)
      const r = loopEinsetzen(h0, [formAusZeichnung(h0, 'seite', uv, Array.from({ length: 8 }, (_, i) => 8 * i), 9)!], 0)!;
      const h = r.haut;
      const auge = r.loops[0]!;
      // obere Hälfte hart, die oberen drei Punkte 10 nach außen
      for (const p of auge.punkte) p.haerte = p.ref.y > 45 ? hart : 0;
      const D = auge.punkte.map((p) => {
        if (p.ref.y <= 60) return { x: 0, y: 0, z: 0 };
        const r = Math.hypot(p.ref.x, p.ref.y, p.ref.z);
        return { x: (10 * p.ref.x) / r, y: (10 * p.ref.y) / r, z: (10 * p.ref.z) / r };
      });
      const versch = verschiebungLaengs(auge, D);
      const zentren = Array.from({ length: auge.proben.length }, (_, i) => ({ x: auge.ruhe[3 * i]!, y: auge.ruhe[3 * i + 1]!, z: auge.ruhe[3 * i + 2]! }));
      const zug = new LoopZug(h, [auge], bereichUm(h, zentren, 30, []));
      for (let s = 1; s <= 4; s++) zug.schritt([versch.map((x) => (x * s) / 4)], 2);
      zug.schritt([versch], 4);
      festlegen(h, auge);
      const kn = knickWinkel(h, auge);
      let oben = 0;
      let unten = 0;
      for (let j = 0; j < auge.proben.length; j++) {
        const y = auge.ruhe[3 * j + 1]!;
        if (y > 65) oben = Math.max(oben, kn[j]!);
        if (y < 20) unten = Math.max(unten, kn[j]!);
      }
      return { oben, unten, kanten: kantenGewichte(h, [auge]).size };
    };
    const hart = lauf(3);
    const weich = lauf(0);
    log(
      `Braue: hart oben ${hart.oben.toFixed(1)}° (unten ${hart.unten.toFixed(1)}°, ${hart.kanten} harte Kanten), ` +
        `weich oben ${weich.oben.toFixed(1)}° (unten ${weich.unten.toFixed(1)}°)`,
    );
    expect(hart.oben).toBeGreaterThan(weich.oben + 8);
    expect(hart.unten).toBeLessThan(hart.oben / 2);
  });

  it('Einsetzen: Ring, Mitte und Form werden Ketten von Kanten, spiegelgleich, die Länge bleibt', () => {
    const h0 = kugel();
    const faelle: [string, Loop][] = [
      ['Ring', loopAusSchnitt(h0, 'seite', [0, 200], [0, -200], 1, 8)!],
      ['Mitte', loopAusSchnitt(h0, 'top', [-200, 0], [200, 0], 2, 8)!],
      [
        'Form',
        formAusZeichnung(
          h0,
          'seite',
          Array.from({ length: 64 }, (_, i): [number, number] => [-60 + 35 * Math.cos((2 * Math.PI * i) / 64), 40 + 35 * Math.sin((2 * Math.PI * i) / 64)]),
          Array.from({ length: 8 }, (_, i) => 8 * i),
          3,
        )!,
      ],
      // schmale Form über die Mitte (Front) bzw. vorn über den Umriss (Seite): ein Ring, die Spiegelhälfte gespiegelt eingesetzt
      ...(['front', 'seite'] as const).map((a): [string, Loop] => [
        `Form über die Mitte (${a})`,
        formAusZeichnung(
          h0,
          a,
          Array.from({ length: 64 }, (_, i): [number, number] =>
            a === 'front' ? [90 * Math.cos((2 * Math.PI * i) / 64), -20 + 10 * Math.sin((2 * Math.PI * i) / 64)] : [-115 + 60 * Math.cos((2 * Math.PI * i) / 64), -20 + 9 * Math.sin((2 * Math.PI * i) / 64)],
          ),
          Array.from({ length: 8 }, (_, i) => 8 * i),
          4,
        )!,
      ]),
    ];
    for (const [name, l] of faelle) {
      expect(l, name).toBeTruthy();
      const r = loopEinsetzen(h0, [l], 0)!;
      expect(r, name).not.toBeNull();
      const ln = r.loops[0]!;
      let ohne = 0;
      for (let v = 0; v < r.haut.n; v++) if (r.haut.spiegel[v]! < 0) ohne++;
      log(`${name}: ${h0.n} → ${r.haut.n} Punkte, ${ln.proben.length} Proben, Länge ${l.laenge.toFixed(1)} → ${ln.laenge.toFixed(1)}`);
      expect(ohne).toBe(0);
      expect(ln.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])).toBe(true);
      // die Kette läuft gerade durch die Dreiecke: an der Spitze einer schmalen Form etwas kürzer
      expect(Math.abs(ln.laenge - l.laenge)).toBeLessThan(Math.max(1, 0.01 * l.laenge));
    }
  });

  it('Mitte als Ganzes in der Höhe auf 1,2 skaliert: die Kugel wird ein Ei, Länge bleibt', () => {
    const h = kugel();
    const { loops, mitte } = dreiLoops(h);
    const versch = loops.map((l) => {
      if (l !== mitte) return null;
      const d = new Float64Array(l.ruhe.length);
      for (let i = 0; i < l.proben.length; i++) d[3 * i + 1] = 0.2 * l.ruhe[3 * i + 1]!;
      return d;
    });
    // die Punkte der anderen Loops an den Kreuzungen mit der Mitte gehen mit
    const mitKreuz = loops.map((l, li) => {
      if (l === mitte) return versch[li]!;
      return verschiebungLaengs(
        l,
        l.punkte.map((p) => {
          const q = mitte.punkte.find((m) => m.kreuzung === p.kreuzung);
          return q ? { x: 0, y: 0.2 * q.ref.y, z: 0 } : { x: 0, y: 0, z: 0 };
        }),
      );
    });
    const zug = new LoopZug(h, loops, null);
    for (let s = 1; s <= 4; s++) zug.schritt(mitKreuz.map((d) => d.map((x) => (x * s) / 4)), 2);
    zug.schritt(mitKreuz, 4);
    const m = ausmass(h.pos);
    log(`Ei: x ${m[0]!.toFixed(1)}…${m[1]!.toFixed(1)}, y ${m[2]!.toFixed(1)}…${m[3]!.toFixed(1)}, z ${m[4]!.toFixed(1)}…${m[5]!.toFixed(1)}`);
    expect(Math.abs(m[3]! - 180)).toBeLessThan(3);
    expect(Math.abs(m[1]! - 150)).toBeLessThan(3);
    expect(schiefe(h)).toBeLessThan(1e-6);
  });
});

/** Kreis um ein Auge auf der Seite der Kugel, acht Punkte */
const augenForm = (h: ReturnType<typeof kugel>) =>
  formAusZeichnung(
    h,
    'seite',
    Array.from({ length: 64 }, (_, i): [number, number] => [-60 + 35 * Math.cos((2 * Math.PI * i) / 64), 40 + 35 * Math.sin((2 * Math.PI * i) / 64)]),
    Array.from({ length: 8 }, (_, i) => 8 * i),
    9,
  )!;
const betrag = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
/**
 * Sprung der Steigung von `d` (3 je Probe, nach s) an der Probe j eines geschlossenen Loops: Steigung je Seite aus der Parabel
 * durch die Probe und ihre zwei Nachbarn dieser Seite, dann der Abstand beider.
 */
const steigungsSprung = (l: Loop, d: Float64Array, j: number) => {
  const n = l.proben.length;
  const s = (k: number) => l.s[((k % n) + n) % n]! + Math.floor(k / n) * l.laenge;
  const seite = (r: 1 | -1) => {
    const x1 = s(j + r) - s(j);
    const x2 = s(j + 2 * r) - s(j);
    return [0, 1, 2].map((c) => {
      const f = (k: number) => d[3 * ((((j + k) % n) + n) % n) + c]!;
      return (f(0) * (-x1 - x2)) / (x1 * x2) + (f(r) * x2) / (x1 * (x2 - x1)) - (f(2 * r) * x1) / (x2 * (x2 - x1));
    });
  };
  const a = seite(1);
  const b = seite(-1);
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
};

describe('Bézier-Griffe und Ecken', () => {
  it('Ein Griff biegt nur sein Stück wie eine Bézier-Strecke (größter Ausschlag 4/9 bei t = 1/3), die Punkte bleiben', () => {
    const auge = augenForm(kugel());
    const i = 2;
    const s0 = auge.punkte[i]!.s;
    const s1 = auge.punkte[i + 1]!.s;
    const griffe = auge.punkte.map((_, k) => (k === i ? { aus: { x: 0, y: 9, z: 0 } } : undefined));
    const d = verschiebungLaengs(auge, auge.punkte.map(() => ({ x: 0, y: 0, z: 0 })), griffe);
    let ausserhalb = 0;
    let groesst = 0;
    let wo = 0;
    for (let j = 0; j < auge.proben.length; j++) {
      const v = Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!);
      const s = auge.s[j]!;
      if (s <= s0 + 1e-9 || s >= s1 - 1e-9) ausserhalb = Math.max(ausserhalb, v);
      else if (v > groesst) {
        groesst = v;
        wo = (s - s0) / (s1 - s0);
      }
    }
    log(`Griff 9 nach oben: außerhalb des Stücks ${ausserhalb}, größter Ausschlag ${groesst.toFixed(2)} bei t = ${wo.toFixed(2)}`);
    expect(ausserhalb).toBeLessThan(1e-9);
    expect(Math.abs(groesst - 4)).toBeLessThan(0.15);
    expect(Math.abs(wo - 1 / 3)).toBeLessThan(0.1);
  });

  it('Griffe ablesen und ziehen: glatt bleibt der andere Griff gegenüber (gleiche Länge), an einer Ecke bleibt er stehen', () => {
    const auge = augenForm(kugel());
    const g = griffeBei(auge, auge.ruhe, 2);
    // Richtung längs der Linie, Länge ⅓ des Wegs zum Nachbarpunkt
    const ds = auge.punkte[3]!.s - auge.punkte[2]!.s;
    const zuNachbar = stelleBei(auge, auge.ruhe, auge.punkte[3]!.s);
    const p = auge.punkte[2]!.ref;
    const sehne = { x: zuNachbar.x - p.x, y: zuNachbar.y - p.y, z: zuNachbar.z - p.z };
    const cosSehne = (g.aus!.x * sehne.x + g.aus!.y * sehne.y + g.aus!.z * sehne.z) / (betrag(g.aus!) * betrag(sehne));
    expect(Math.abs(betrag(g.aus!) - ds / 3)).toBeLessThan(0.05 * ds);
    expect(cosSehne).toBeGreaterThan(0.85);
    const delta = { x: 0, y: 6, z: 0 };
    const glatt = griffZiehen(auge, auge.ruhe, 2, 'aus', delta);
    const aus = { x: g.aus!.x + glatt.aus!.x, y: g.aus!.y + glatt.aus!.y, z: g.aus!.z + glatt.aus!.z };
    const ein = { x: g.ein!.x + glatt.ein!.x, y: g.ein!.y + glatt.ein!.y, z: g.ein!.z + glatt.ein!.z };
    const kreuz = betrag({ x: aus.y * ein.z - aus.z * ein.y, y: aus.z * ein.x - aus.x * ein.z, z: aus.x * ein.y - aus.y * ein.x });
    expect(kreuz / (betrag(aus) * betrag(ein))).toBeLessThan(1e-9);
    expect(aus.x * ein.x + aus.y * ein.y + aus.z * ein.z).toBeLessThan(0);
    expect(Math.abs(betrag(ein) - betrag(g.ein!))).toBeLessThan(1e-9);
    auge.punkte[2]!.ecke = true;
    const ecke = griffZiehen(auge, auge.ruhe, 2, 'aus', delta);
    expect(ecke.ein).toBeUndefined();
    expect(ecke.aus).toEqual(delta);
  });

  it('Punkt ziehen wie in Illustrator: nur die zwei Stücke bis zu den Nachbarpunkten, die Richtung am Punkt bleibt', () => {
    const auge = augenForm(kugel());
    const i = 2;
    const p = auge.punkte[i]!.ref;
    const D = auge.punkte.map((_, k) => (k === i ? { x: 0, y: 12, z: 0 } : { x: 0, y: 0, z: 0 }));
    const d = verschiebungLaengs(auge, D);
    const s0 = auge.punkte[i - 1]!.s;
    const s1 = auge.punkte[i + 1]!.s;
    let jenseits = 0;
    for (let j = 0; j < auge.proben.length; j++) {
      if (auge.s[j]! > s0 + 1e-9 && auge.s[j]! < s1 - 1e-9) continue;
      jenseits = Math.max(jenseits, Math.hypot(d[3 * j]!, d[3 * j + 1]!, d[3 * j + 2]!));
    }
    const j = auge.s.findIndex((s) => Math.abs(s - auge.punkte[i]!.s) < 1e-9);
    const L = Float64Array.from(auge.ruhe, (x, k) => x + d[k]!);
    const vorher = griffeBei(auge, auge.ruhe, i);
    const nachher = griffeBei(auge, L, i);
    log(`Punkt 12 hoch: jenseits der Nachbarn ${jenseits}, am Punkt ${Math.hypot(d[3 * j]!, d[3 * j + 1]! - 12, d[3 * j + 2]!)}, p ${JSON.stringify(p)}`);
    expect(jenseits).toBeLessThan(1e-9);
    expect(Math.abs(d[3 * j + 1]! - 12)).toBeLessThan(1e-9);
    // die Griffe gehen mit: gleiche Richtung vorher und nachher
    const c = (vorher.aus!.x * nachher.aus!.x + vorher.aus!.y * nachher.aus!.y + vorher.aus!.z * nachher.aus!.z) / (betrag(vorher.aus!) * betrag(nachher.aus!));
    expect((Math.acos(Math.min(1, c)) * 180) / Math.PI).toBeLessThan(1.5);
  });

  it('Skalieren über die Punkte: die Griffe skalieren mit (griffeAbbilden), die Form wird genau größer', () => {
    const auge = augenForm(kugel());
    const c = { x: -60, y: 40, z: 0 };
    const f = (q: { x: number; y: number; z: number }) => ({ x: c.x + 1.3 * (q.x - c.x), y: c.y + 1.3 * (q.y - c.y), z: q.z });
    const D = auge.punkte.map((p) => {
      const q = f(p.ref);
      return { x: q.x - p.ref.x, y: q.y - p.ref.y, z: 0 };
    });
    const g = auge.punkte.map((_, i) => griffeAbbilden(auge, auge.ruhe, i, f));
    const mit = verschiebungLaengs(auge, D, g);
    const ohne = verschiebungLaengs(auge, D);
    let fehlerMit = 0;
    let fehlerOhne = 0;
    for (let j = 0; j < auge.proben.length; j++) {
      const q = { x: auge.ruhe[3 * j]!, y: auge.ruhe[3 * j + 1]!, z: auge.ruhe[3 * j + 2]! };
      const soll = f(q);
      fehlerMit = Math.max(fehlerMit, Math.hypot(q.x + mit[3 * j]! - soll.x, q.y + mit[3 * j + 1]! - soll.y));
      fehlerOhne = Math.max(fehlerOhne, Math.hypot(q.x + ohne[3 * j]! - soll.x, q.y + ohne[3 * j + 1]! - soll.y));
    }
    log(`Form ums Auge × 1,3 über ihre 8 Punkte: Abweichung mit Griffen ${fehlerMit.toFixed(2)}, ohne ${fehlerOhne.toFixed(2)} (Radius 35 → 45,5)`);
    expect(fehlerMit).toBeLessThan(0.6);
    expect(fehlerOhne).toBeGreaterThan(3 * fehlerMit);
  });

  it('Ecke: von Hand behält sie ihre Griffe, von selbst (an einem harten Loop) knickt sie hinausgezogen; Ausrichten macht wieder glatt', () => {
    const h = kugel();
    const auge = augenForm(h);
    const i = 2;
    const j = auge.s.findIndex((s) => Math.abs(s - auge.punkte[i]!.s) < 1e-9);
    const p = auge.punkte[i]!.ref;
    const r = Math.hypot(p.x - -60, p.y - 40);
    const D = auge.punkte.map((_, k) => (k === i ? { x: (10 * (p.x + 60)) / r, y: (10 * (p.y - 40)) / r, z: 0 } : { x: 0, y: 0, z: 0 }));
    const glatt = steigungsSprung(auge, verschiebungLaengs(auge, D), j);
    auge.punkte[i]!.ecke = true;
    const vonHand = steigungsSprung(auge, verschiebungLaengs(auge, D), j);
    delete auge.punkte[i]!.ecke;
    auge.punkte[i]!.autoEcke = true;
    const ecke = steigungsSprung(auge, verschiebungLaengs(auge, D), j);
    log(`Sprung der Steigung am gezogenen Punkt: glatt ${glatt.toFixed(3)}, Ecke von Hand ${vonHand.toFixed(3)}, Ecke von selbst ${ecke.toFixed(3)}`);
    expect(glatt).toBeLessThan(0.1);
    expect(vonHand).toBeLessThan(0.1);
    expect(ecke).toBeGreaterThan(0.4);
    expect(ecke).toBeGreaterThan(5 * glatt);
    // eine Ecke mit Knick: Lage = Ruhe + Verschiebung; Ausrichten gibt Griffe auf einer Geraden
    const L = Float64Array.from(auge.ruhe, (x, k) => x + verschiebungLaengs(auge, D)[k]!);
    const v = griffeAusrichten(auge, L, i)!;
    expect(v).not.toBeNull();
    const g = griffeBei(auge, L, i, true);
    const ein = { x: g.ein!.x + v.ein!.x, y: g.ein!.y + v.ein!.y, z: g.ein!.z + v.ein!.z };
    const aus = { x: g.aus!.x + v.aus!.x, y: g.aus!.y + v.aus!.y, z: g.aus!.z + v.aus!.z };
    const cos = -(ein.x * aus.x + ein.y * aus.y + ein.z * aus.z) / (betrag(ein) * betrag(aus));
    expect(cos).toBeGreaterThan(1 - 1e-9);
    // ohne Knick nichts zu tun, auch nicht auf der eingesetzten Form (die Kette ist im Netz selbst gezackt): Umschalten lässt
    // glatte Linien in Ruhe
    expect(griffeAusrichten(auge, auge.ruhe, 5)).toBeNull();
    const eingesetzt = loopEinsetzen(h, [augenForm(h)], 0)!.loops[0]!;
    const schein = eingesetzt.punkte.map((_, k) => {
      const g = griffeBei(eingesetzt, eingesetzt.ruhe, k, true);
      const c = -(g.ein!.x * g.aus!.x + g.ein!.y * g.aus!.y + g.ein!.z * g.aus!.z) / (betrag(g.ein!) * betrag(g.aus!));
      return (Math.acos(Math.min(1, c)) * 180) / Math.PI;
    });
    log(`Knick je Punkt der eingesetzten Form (Zacken des Netzes): ${schein.map((x) => x.toFixed(1)).join(' ')}°`);
    expect(eingesetzt.punkte.every((_, k) => griffeAusrichten(eingesetzt, eingesetzt.ruhe, k) === null)).toBe(true);
  });

  it('Härte läuft durch Kreuzungen; die Kreuzung mit einem harten Loop wird von selbst eine Ecke, weich wieder glatt', () => {
    const h = kugel();
    const { loops, quer, waag, mitte } = dreiLoops(h);
    const k1 = quer.punkte.find((p) => p.kreuzung !== undefined && waag.punkte.some((q) => q.kreuzung === p.kreuzung))!;
    const w1 = waag.punkte.find((p) => p.kreuzung === k1.kreuzung)!;
    // zwei gesetzte harte Punkte links und rechts der Kreuzung: die Kreuzung dazwischen bleibt hart
    for (const ds of [-25, 25]) punktEinfuegen(waag, w1.s + ds).haerte = 3;
    expect(haerteAn(waag, w1.s)).toBeCloseTo(3, 9);
    eckenAuto(loops);
    expect(istEcke(k1)).toBe(true);
    expect(istEcke(w1)).toBe(false);
    // ein eingefügter Punkt behält die Härte des Verlaufs
    const neu = punktEinfuegen(waag, w1.s + 12);
    expect(neu.haerte).toBeCloseTo(3, 9);
    // weich: wieder glatt; von Hand gesetzt gilt vor
    for (const p of waag.punkte) p.haerte = 0;
    eckenAuto(loops);
    expect(istEcke(k1)).toBe(false);
    k1.ecke = true;
    eckenAuto(loops);
    expect(istEcke(k1)).toBe(true);
    // die Mitte kreuzt den weichen Ring: glatt
    expect(mitte.punkte.every((p) => !istEcke(p))).toBe(true);
  });

  it('Harter Ring als Ganzes hinausgeschoben: der kreuzende Ring folgt dem Grat mit einer Ecke, glatt flacht er ihn ab', () => {
    const lauf = (ecke: boolean) => {
      const h0 = kugel();
      const r1 = loopEinsetzen(h0, [loopAusSchnitt(h0, 'front', [-200, 0], [200, 0], 1, 8)!], 0)!;
      const r2 = loopEinsetzen(r1.haut, [...r1.loops, loopAusSchnitt(r1.haut, 'seite', [0, 200], [0, -200], 2, 8)!], 1)!;
      const h = r2.haut;
      const [waag, quer] = r2.loops as [Loop, Loop];
      const funde = kreuzungenZwischen(waag, waag.ruhe, quer, quer.ruhe, 0.25 * mittlereKante(h));
      expect(funde.length).toBe(1);
      punktEinfuegen(waag, funde[0]!.sa, 1);
      const kq = punktEinfuegen(quer, funde[0]!.sb, 1);
      waag.haerte = 3;
      eckenAuto([waag, quer]);
      expect(istEcke(kq)).toBe(true);
      if (!ecke) kq.ecke = false;
      // der harte Ring wird in x und z um 15 % größer, der Punkt des anderen an der Kreuzung geht mit
      const dw = new Float64Array(waag.ruhe.length);
      for (let j = 0; j < waag.proben.length; j++) {
        dw[3 * j] = 0.15 * waag.ruhe[3 * j]!;
        dw[3 * j + 2] = 0.15 * waag.ruhe[3 * j + 2]!;
      }
      const dq = verschiebungLaengs(quer, quer.punkte.map((p) => (p === kq ? { x: 0.15 * p.ref.x, y: 0, z: 0.15 * p.ref.z } : { x: 0, y: 0, z: 0 })));
      const zug = new LoopZug(h, [waag, quer], null);
      for (let s = 1; s <= 4; s++) zug.schritt([dw.map((x) => (x * s) / 4), dq.map((x) => (x * s) / 4)], 2);
      zug.schritt([dw, dq], 6);
      festlegen(h, waag);
      festlegen(h, quer);
      const kn = knickWinkel(h, waag);
      const jk = waag.s.reduce((b, s, j) => (Math.abs(s - funde[0]!.sa) < Math.abs(waag.s[b]! - funde[0]!.sa) ? j : b), 0);
      const sonst = [...kn].filter((_, j) => Math.abs(waag.s[j]! - funde[0]!.sa) > 60 && j > 3 && j < kn.length - 4).sort((a, b) => a - b);
      return { anKreuzung: kn[jk]!, sonst: sonst[sonst.length >> 1]! };
    };
    const mit = lauf(true);
    const ohne = lauf(false);
    log(
      `Grat des harten Rings an der Kreuzung: Ecke ${mit.anKreuzung.toFixed(1)}° (sonst ${mit.sonst.toFixed(1)}°), ` +
        `glatt ${ohne.anKreuzung.toFixed(1)}° (sonst ${ohne.sonst.toFixed(1)}°)`,
    );
    expect(mit.anKreuzung).toBeGreaterThan(ohne.anKreuzung + 3);
    expect(mit.anKreuzung).toBeGreaterThan(0.6 * mit.sonst);
  });

  it('Spiegelpunkt (Ende eines Rings auf der Mittelebene): beide Griffe, frei ziehbar mit Knick spiegelgleich, Ausrichten macht ihn rund', () => {
    const h0 = kugel();
    const r1 = loopEinsetzen(h0, [loopAusSchnitt(h0, 'seite', [-200, 0], [200, 0], 1, 8)!], 0)!;
    const r2 = loopEinsetzen(r1.haut, [...r1.loops, loopAusSchnitt(r1.haut, 'top', [-200, 0], [200, 0], 2, 8)!], 1)!;
    const h = r2.haut;
    const [ring, mitte] = r2.loops as [Loop, Loop];
    expect([ring.art, mitte.art]).toEqual(['ring', 'mitte']);
    let k = 1;
    for (const f of kreuzungenZwischen(ring, ring.ruhe, mitte, mitte.ruhe, 0.25 * mittlereKante(h))) {
      punktEinfuegen(ring, f.sa, k);
      punktEinfuegen(mitte, f.sb, k++);
    }
    // die Spitze vorn: Ende des Rings, Kreuzung mit der Mitte
    const i = ring.punkte.findIndex((p) => p.ref.x < -100);
    const rand = ringEnde(ring, i);
    expect(rand).not.toBeNull();
    const innen = rand === 'anfang' ? 'aus' : 'ein';
    const aussen = innen === 'aus' ? 'ein' : 'aus';
    const weg = (a: V3 | undefined | null, b: V3) => (a ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z)) : Infinity);
    const knick = () => {
      const g = griffeBei(ring, ring.ruhe, i);
      const c = -(g.ein!.x * g.aus!.x + g.ein!.y * g.aus!.y + g.ein!.z * g.aus!.z) / (betrag(g.ein!) * betrag(g.aus!));
      return { g, grad: (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI };
    };
    const tip = ring.punkte[i]!.ref;
    const loesen = (v: GriffVersatz) => {
      const d = verschiebungLaengs(
        ring,
        ring.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
        ring.punkte.map((_, j) => (j === i ? v : undefined)),
      );
      for (let j = 0; j < ring.proben.length; j++) d[3 * j + 2] = Math.max(d[3 * j + 2]!, -ring.ruhe[3 * j + 2]!);
      const zug = new LoopZug(h, [ring, mitte], bereichUm(h, [tip], 160, []));
      for (let s = 1; s <= 3; s++) zug.schritt([d.map((x) => (x * s) / 3), null], 2);
      zug.schritt([d, null], 6);
      festlegen(h, ring);
      festlegen(h, mitte);
    };
    // beide Griffe: der innere zeigt in die gespeicherte Hälfte, der andere ist sein Spiegelbild; an der Kugel ohne Knick
    const vorher = knick();
    const gi = vorher.g[innen]!;
    expect(gi.z).toBeGreaterThan(0);
    expect(weg(vorher.g[aussen], { x: gi.x, y: gi.y, z: -gi.z })).toBe(0);
    // frei: seitlich gezogen geht der Griff mit (vorher nur längs z), sein Spiegelbild ebenso; am Spiegelbild gezogen dasselbe
    const v = griffZiehen(ring, ring.ruhe, i, innen, { x: 40, y: 0, z: 0 });
    expect(weg(v[innen], { x: 40, y: 0, z: 0 })).toBe(0);
    expect(weg(v[aussen], { x: 40, y: 0, z: 0 })).toBe(0);
    expect(weg(griffZiehen(ring, ring.ruhe, i, aussen, { x: 40, y: 0, z: -10 })[innen], { x: 40, y: 0, z: 10 })).toBe(0);
    // nicht durch die Mittelebene: höchstens bis in sie hinein
    expect(gi.z + griffZiehen(ring, ring.ruhe, i, innen, { x: 0, y: 0, z: -1000 })[innen]!.z).toBeCloseTo(0, 9);
    // gezogen und gelöst: die Linie knickt an der Spitze spiegelgleich
    loesen(v);
    const geknickt = knick();
    const schiefGeknickt = schiefe(h);
    // Ausrichten: Griff senkrecht zur Mittelebene, Länge bleibt; gelöst läuft die Linie rund durch die Spitze
    const a = griffeAusrichten(ring, ring.ruhe, i)!;
    expect(a).not.toBeNull();
    const g2 = geknickt.g[innen]!;
    const neu = { x: g2.x + a[innen]!.x, y: g2.y + a[innen]!.y, z: g2.z + a[innen]!.z };
    expect(Math.hypot(neu.x, neu.y)).toBeLessThan(1e-9);
    expect(neu.z).toBeCloseTo(betrag(g2), 9);
    expect(weg(a[aussen], { x: a[innen]!.x, y: a[innen]!.y, z: -a[innen]!.z })).toBe(0);
    loesen(a);
    const rund = knick();
    // Drehen über die Punkte: das Spiegelbild des Griffs dreht spiegelgleich mit
    const dreh = griffeAbbilden(ring, ring.ruhe, i, (p) => ({ x: p.x * Math.cos(0.3) + p.z * Math.sin(0.3), y: p.y, z: -p.x * Math.sin(0.3) + p.z * Math.cos(0.3) }));
    expect(weg(dreh[aussen], { x: dreh[innen]!.x, y: dreh[innen]!.y, z: -dreh[innen]!.z })).toBe(0);
    // Soll: der Griff steht nach dem Zug um atan(40 / Länge) schräg, die Linie knickt um das Doppelte (Griff und Spiegelbild)
    const soll = (2 * Math.atan2(40, gi.z) * 180) / Math.PI;
    log(
      `Spiegelpunkt: Knick an der Kugel ${vorher.grad.toFixed(1)}°, Griff (Länge ${betrag(gi).toFixed(0)}) 40 seitlich gezogen ` +
        `${geknickt.grad.toFixed(1)}° (Soll ${soll.toFixed(1)}°, schief ${schiefGeknickt.toExponential(1)}), ausgerichtet ` +
        `${rund.grad.toFixed(1)}° (schief ${schiefe(h).toExponential(1)})`,
    );
    expect(vorher.grad).toBeLessThan(4);
    expect(Math.abs(geknickt.grad - soll)).toBeLessThan(3);
    expect(rund.grad).toBeLessThan(2);
    expect(schiefGeknickt).toBeLessThan(1e-6);
    expect(schiefe(h)).toBeLessThan(1e-6);
  });
});

describe('Krümmung folgt den Loops', () => {
  /** Loops nacheinander einsetzen wie im Fenster, dann alle Kreuzungen als Punkte */
  const aufbauen = (schnitte: [Parameters<typeof loopAusSchnitt>[1], [number, number], [number, number]][]) => {
    let h = kugel();
    let loops: Loop[] = [];
    schnitte.forEach(([a, p, q], i) => {
      const r = loopEinsetzen(h, [...loops, loopAusSchnitt(h, a, p, q, i + 1, 8)!], loops.length)!;
      h = r.haut;
      loops = r.loops;
    });
    let k = 1;
    for (let i = 0; i < loops.length; i++)
      for (let j = i + 1; j < loops.length; j++)
        for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, 0.25 * mittlereKante(h))) {
          punktEinfuegen(loops[i]!, f.sa, k);
          punktEinfuegen(loops[j]!, f.sb, k);
          k++;
        }
    return { h, loops };
  };
  /** ein Zug wie im Fenster: in Stufen, am Ende tragen die Loops ihre Krümmung weiter und liegen fest */
  const ziehen = (h: ReturnType<typeof kugel>, loops: Loop[], versch: Float64Array[], bereich: Uint8Array | null, kr: boolean) => {
    const z = new LoopZug(h, loops, bereich, kr);
    for (let s = 1; s <= 4; s++) z.schritt(versch.map((d) => d.map((x) => (x * s) / 4)), 2);
    z.schritt(versch, 6);
    z.kruemmungFestlegen(loops);
    loops.forEach((l) => festlegen(h, l));
  };

  it('Boden in zwei Zügen (Mittelpunkt hoch, dann die Arme gerade in die Ebene des harten Rings): flach, gleich in welcher Folge', () => {
    const Y0 = -105;
    const lauf = (kr: boolean) => {
      const { h, loops } = aufbauen([
        ['seite', [-200, Y0], [200, Y0]],
        ['seite', [0, 200], [0, -200]],
        ['top', [-200, 0], [200, 0]],
      ]);
      loops[0]!.haerte = 3;
      eckenAuto(loops);
      let tiefst: { k: number; y: number } | null = null;
      for (const l of loops) for (const p of l.punkte) if (p.kreuzung !== undefined && (!tiefst || p.ref.y < tiefst.y)) tiefst = { k: p.kreuzung, y: p.ref.y };
      const bereich = Uint8Array.from({ length: h.n }, (_, v) => (h.pos[3 * v + 1]! < -40 ? 1 : 0));
      // 1. Mittelpunkt auf die Höhe des Rings: die Arme werden S-förmig (die Ecken am Ring behalten die Richtung der Kugel)
      ziehen(h, loops, loops.map((l) => verschiebungLaengs(l, l.punkte.map((p) => ({ x: 0, y: p.kreuzung === tiefst!.k ? Y0 - tiefst!.y : 0, z: 0 })))), bereich, kr);
      // 2. Arme gerade in die Ebene
      ziehen(
        h,
        loops,
        loops.map((l, li) => Float64Array.from({ length: l.ruhe.length }, (_, k) => (li > 0 && k % 3 === 1 && l.ruhe[k]! < Y0 ? Y0 - l.ruhe[k]! : 0))),
        bereich,
        kr,
      );
      let tief = 0;
      for (let v = 0; v < h.n; v++) tief = Math.max(tief, Y0 - h.pos[3 * v + 1]!);
      return { tief, schief: schiefe(h) };
    };
    const alt = lauf(false);
    const neu = lauf(true);
    log(`Boden in zwei Zügen: tiefster Punkt unter der Ebene, Krümmung aus den Loops ${neu.tief.toFixed(2)}, wie beim Anfassen ${alt.tief.toFixed(2)}`);
    expect(neu.tief).toBeLessThan(0.6);
    expect(alt.tief).toBeGreaterThan(2);
    expect(neu.schief).toBeLessThan(1e-6);
  });

  it('harter Ring um den Äquator ×1,15: die Kuppen folgen dem kreuzenden Ring (fast ein abgeplattetes Ellipsoid)', () => {
    const { h, loops } = aufbauen([
      ['front', [-200, 0], [200, 0]],
      ['seite', [0, 200], [0, -200]],
    ]);
    const [waag, quer] = loops as [Loop, Loop];
    waag.haerte = 3;
    eckenAuto(loops);
    const kq = quer.punkte.find((p) => p.kreuzung !== undefined)!;
    const dw = Float64Array.from(waag.ruhe, (x, k) => (k % 3 === 1 ? 0 : 0.15 * x));
    const dq = verschiebungLaengs(quer, quer.punkte.map((p) => (p === kq ? { x: 0.15 * p.ref.x, y: 0, z: 0.15 * p.ref.z } : { x: 0, y: 0, z: 0 })));
    ziehen(h, loops, [dw, dq], null, true);
    // Höhe der oberen Kuppe bei Radius r (auf der x-Achse) gegen das Ellipsoid mit Halbachsen 172,5 (Rand) und 150 (Pol)
    const abw: number[] = [];
    for (const r of [160, 140, 120, 100, 60]) {
      let best = Infinity;
      let y = 0;
      for (let v = 0; v < h.n; v++) {
        if (h.pos[3 * v + 1]! < 0) continue;
        const d = Math.abs(h.pos[3 * v]! - r) + Math.abs(h.pos[3 * v + 2]!);
        if (d < best) {
          best = d;
          y = h.pos[3 * v + 1]!;
        }
      }
      abw.push(y - 150 * Math.sqrt(1 - (r / 172.5) ** 2));
    }
    log(`Ring ×1,15: Kuppe gegen das abgeplattete Ellipsoid ${abw.map((x) => x.toFixed(1)).join(' ')}`);
    expect(Math.max(...abw.map(Math.abs))).toBeLessThan(4);
  });
});
