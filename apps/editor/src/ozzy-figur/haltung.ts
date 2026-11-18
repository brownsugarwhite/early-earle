// Ozzy-Figur, Etappe D1: Haltungen in der Seite (Stehen 0, Sitzen 1, Liegen 2) aus Florians sechs Seitenvorlagen (Logo/Profil,
// sit01/st02, laydown01/02). Jedes Körperteil hängt an einem Knochen: Drehpunkt (Hüfte oder Schulter am oberen Ende des Beins,
// Schwanzwurzel, Mitte der Bohne), Winkel und Lage des Drehpunkts je Haltung. Was nach der starren Bewegung zu seiner Zeichnung
// fehlt, ist eine Korrekturform im Knochen (sie dreht mit). Gemischt werden Winkel, Lage und Korrektur (PCHIP über die Haltung):
// An den Haltungen steht genau seine Zeichnung, dazwischen klappen die Beine um Hüfte und Schulter, statt sich geradlinig zu
// verziehen. Fenster und Keile gehen mit ihrem Bein, das Schwanzweiß mit dem Schwanz.
// Der Kopf hat in allen Haltungen dieselbe Form; er wandert nur (Versatz je Haltung, vorn und im Profil), dazu kleine Korrekturen
// (Maske im Liegen).
// Lage der Haltungen zueinander: Beim Hinsetzen bleiben die Vorderpfoten stehen (Vorderbein rechts deckt sich), beim Hinlegen
// bleibt das Hinterteil liegen (Ende der Bohne hinten deckt sich), alle auf dem Boden.
import { type Form, kasten, pchip, type Punkt, schwerpunkt } from './form';
import { type AnsichtName, type FigurDaten, type TeilName, teilVon } from './vorlagen/import';

/** Haltungen mit ihren Vorlagen (Kopf vorn, Kopf im Profil) */
export const HALTUNGEN: { h: number; vorn: AnsichtName; profil: AnsichtName }[] = [
  { h: 0, vorn: 'logo', profil: 'profil' },
  { h: 1, vorn: 'sitz1', profil: 'sitz2' },
  { h: 2, vorn: 'lieg1', profil: 'lieg2' },
];

const KOPFTEILE: TeilName[] = [
  'ohrB',
  'ohrSpalt',
  'ohrA',
  'kopfB',
  'kopfA',
  'bartA',
  'bartB',
  'nase',
];
/** Teile, die am Knochen eines anderen hängen */
const ELTER: Partial<Record<TeilName, TeilName>> = {
  fensterRV: 'beinRV',
  fensterRH: 'beinRH',
  fensterLV: 'beinLV',
  fensterLH: 'beinLH',
  keilV: 'beinRV',
  keilH: 'beinRH',
  schwanzW: 'schwanz',
};

interface Knochen {
  /** Drehpunkt in der stehenden Form */
  dreh: Punkt;
  winkel: number[];
  lage: Punkt[];
}
interface Teilhaltung {
  knochen: TeilName;
  /** Korrektur je Haltung: je Punkt (Anker, Griff ein, Griff aus) dx, dy im Knochen */
  rest: number[][];
}

const punkte = (f: Form): Punkt[] => f.flatMap((a) => [a.p, a.i, a.o]);
const mitte = (ps: Punkt[]): Punkt => {
  let x = 0;
  let y = 0;
  for (const p of ps) {
    x += p[0];
    y += p[1];
  }
  return [x / ps.length, y / ps.length];
};
const drehen = (v: Punkt, w: number): Punkt => [
  Math.cos(w) * v[0] - Math.sin(w) * v[1],
  Math.sin(w) * v[0] + Math.cos(w) * v[1],
];

/** starre Anpassung a → b (Drehung um die Mitte, dann Verschiebung): Winkel und beide Mitten */
function starr(a: Punkt[], b: Punkt[]): { w: number; ca: Punkt; cb: Punkt } {
  const ca = mitte(a);
  const cb = mitte(b);
  let sxx = 0;
  let sxy = 0;
  a.forEach((p, i) => {
    const u: Punkt = [p[0] - ca[0], p[1] - ca[1]];
    const v: Punkt = [b[i]![0] - cb[0], b[i]![1] - cb[1]];
    sxx += u[0] * v[0] + u[1] * v[1];
    sxy += u[0] * v[1] - u[1] * v[0];
  });
  return { w: Math.atan2(sxy, sxx), ca, cb };
}

export class Haltungen {
  private readonly hs = HALTUNGEN.map((x) => x.h);
  /** Knochen und Korrekturen je Reihe: Kopf vorn (Logo, sit01, laydown01) und im Profil (stand02, st02, laydown02) */
  private readonly knochen = {
    vorn: new Map<TeilName, Knochen>(),
    profil: new Map<TeilName, Knochen>(),
  };
  private readonly teile = {
    vorn: new Map<TeilName, Teilhaltung>(),
    profil: new Map<TeilName, Teilhaltung>(),
  };
  private readonly stand = new Map<TeilName, Form>();
  /** Versatz des Kopfs je Haltung (vorn und im Profil) gegen das Stehen */
  private readonly kopfVorn: Punkt[] = [];
  private readonly kopfProfil: Punkt[] = [];
  /** Korrekturen der Kopfteile je Haltung (vorn, Profil): dx, dy je Punkt */
  private readonly kopfRest = new Map<TeilName, { vorn: number[][]; profil: number[][] }>();
  /** Malreihenfolge je Haltung (vorn, Profil) */
  private readonly reihen: { vorn: TeilName[]; profil: TeilName[] }[] = [];
  /** Verschiebung jeder Haltungsvorlage in Körperkoordinaten */
  readonly versatz = new Map<AnsichtName, Punkt>();

  /**
   * @param standKoerper Körperteile im Stehen (Körperkoordinaten, wie das Raster bei ψ = 90)
   * @param standKopf Kopfteile im Stehen, vorn (Logo) und im Profil, in Körperkoordinaten
   */
  constructor(
    d: FigurDaten,
    standKoerper: Map<TeilName, Form>,
    standKopf: { vorn: Map<TeilName, Form>; profil: Map<TeilName, Form> },
  ) {
    for (const [n, f] of standKoerper) this.stand.set(n, f);
    // Lage jeder Haltungsvorlage in Körperkoordinaten
    const versatz = this.versatz;
    const roh = (a: AnsichtName, n: TeilName): Form | undefined => teilVon(d.ansichten[a], n)?.form;
    const um = (f: Form, o: Punkt): Form =>
      f.map((x) => ({
        p: [x.p[0] + o[0], x.p[1] + o[1]],
        i: [x.i[0] + o[0], x.i[1] + o[1]],
        o: [x.o[0] + o[0], x.o[1] + o[1]],
      }));
    const mitteVon = (f: Form): Punkt => mitte(punkte(f));
    const imKoerper = (a: AnsichtName, n: TeilName): Form | undefined => {
      const f = roh(a, n);
      const o = versatz.get(a);
      return f && o ? um(f, o) : undefined;
    };
    {
      // Stehen: wie das Raster (Bohnenmitte, Boden)
      const logoBein = roh('logo', 'beinRV')!;
      const o: Punkt = [
        mitteVon(standKoerper.get('beinRV')!)[0] - mitteVon(logoBein)[0],
        mitteVon(standKoerper.get('beinRV')!)[1] - mitteVon(logoBein)[1],
      ];
      versatz.set('logo', o);
      const pBohne = roh('profil', 'bohne')!;
      versatz.set('profil', [
        mitteVon(standKoerper.get('bohne')!)[0] - mitteVon(pBohne)[0],
        mitteVon(standKoerper.get('bohne')!)[1] - mitteVon(pBohne)[1],
      ]);
      // je Reihe: Sitzen mit stehenden Vorderpfoten (Vorderbein rechts deckt sich), Liegen mit liegendem Hinterteil (hinteres Ende
      // der Bohne wie im Sitzen), auf dem Boden
      for (const [sitz, lieg] of [
        ['sitz1', 'lieg1'],
        ['sitz2', 'lieg2'],
      ] as [AnsichtName, AnsichtName][]) {
        const sBein = roh(sitz, 'beinRV')!;
        versatz.set(sitz, [
          mitteVon(standKoerper.get('beinRV')!)[0] - mitteVon(sBein)[0],
          mitteVon(standKoerper.get('beinRV')!)[1] - mitteVon(sBein)[1],
        ]);
        const hintenSitz = kasten(imKoerper(sitz, 'bohne')!)[0];
        versatz.set(lieg, [hintenSitz - kasten(roh(lieg, 'bohne')!)[0], -d.ansichten[lieg].boden]);
      }
    }
    // Knochen: Drehpunkte in der stehenden Form
    const drehpunkt = (n: TeilName, f: Form): Punkt => {
      if (n.startsWith('bein')) {
        const [x0, y0, x1, y1] = kasten(f);
        return [(x0 + x1) / 2, y0 + 0.15 * (y1 - y0)];
      }
      if (n === 'schwanz') {
        const c = mitteVon(standKoerper.get('bohne')!);
        let best = f[0]!.p;
        let bd = Infinity;
        for (const a of f) {
          const e = Math.hypot(a.p[0] - c[0], a.p[1] - c[1]);
          if (e < bd) {
            bd = e;
            best = a.p;
          }
        }
        return [best[0], best[1]];
      }
      return mitteVon(f);
    };
    for (const reihe of ['vorn', 'profil'] as const)
      for (const [n, f0] of standKoerper) {
        if (ELTER[n]) continue;
        const dreh = drehpunkt(n, f0);
        const winkel: number[] = [];
        const lage: Punkt[] = [];
        for (const x of HALTUNGEN) {
          const fk = x.h === 0 ? f0 : imKoerper(x[reihe], n);
          if (!fk || fk.length !== f0.length) {
            winkel.push(winkel.length ? winkel[winkel.length - 1]! : 0);
            lage.push(lage.length ? lage[lage.length - 1]! : dreh);
            continue;
          }
          const { w, ca, cb } = starr(punkte(f0), punkte(fk));
          const r = drehen([dreh[0] - ca[0], dreh[1] - ca[1]], w);
          let ww = w;
          if (winkel.length) {
            const vor = winkel[winkel.length - 1]!;
            while (ww - vor > Math.PI) ww -= 2 * Math.PI;
            while (ww - vor < -Math.PI) ww += 2 * Math.PI;
          }
          winkel.push(ww);
          lage.push([cb[0] + r[0], cb[1] + r[1]]);
        }
        this.knochen[reihe].set(n, { dreh, winkel, lage });
      }
    // Korrekturen je Teil im Knochen (Kinder hängen am Knochen ihres Elters)
    for (const reihe of ['vorn', 'profil'] as const)
      for (const [n, f0] of standKoerper) {
        const kn = ELTER[n] && this.knochen[reihe].has(ELTER[n]!) ? ELTER[n]! : n;
        const k = this.knochen[reihe].get(kn);
        if (!k) continue;
        const p0 = punkte(f0);
        const rest = HALTUNGEN.map((x, i) => {
          const fk = i === 0 ? f0 : imKoerper(x[reihe], n);
          const out: number[] = [];
          if (!fk || fk.length !== f0.length) {
            // fehlt in dieser Haltung: am Drehpunkt verschwinden (Schwarz in Schwarz, Weiß unter den Beinen)
            for (const p of p0) out.push(-(p[0] - k.dreh[0]) * 0.99, -(p[1] - k.dreh[1]) * 0.99);
            return out;
          }
          const pk = punkte(fk);
          p0.forEach((p, j) => {
            const v = drehen([pk[j]![0] - k.lage[i]![0], pk[j]![1] - k.lage[i]![1]], -k.winkel[i]!);
            out.push(v[0] - (p[0] - k.dreh[0]), v[1] - (p[1] - k.dreh[1]));
          });
          return out;
        });
        this.teile[reihe].set(n, { knochen: kn, rest });
      }
    // Kopf: Versatz und Korrekturen je Haltung
    const kopfMitte = (formen: (Form | undefined)[]): Punkt =>
      schwerpunkt(formen.filter((f): f is Form => !!f).flat());
    const sv = kopfMitte([standKopf.vorn.get('kopfA'), standKopf.vorn.get('kopfB')]);
    const sp = kopfMitte([standKopf.profil.get('kopfA'), standKopf.profil.get('kopfB')]);
    for (const { vorn, profil } of HALTUNGEN) {
      const mv = kopfMitte([imKoerper(vorn, 'kopfA'), imKoerper(vorn, 'kopfB')]);
      const mp = kopfMitte([imKoerper(profil, 'kopfA'), imKoerper(profil, 'kopfB')]);
      this.kopfVorn.push([mv[0] - sv[0], mv[1] - sv[1]]);
      this.kopfProfil.push([mp[0] - sp[0], mp[1] - sp[1]]);
    }
    for (const n of KOPFTEILE) {
      const korrektur = (stand: Form | undefined, a: AnsichtName, v: Punkt): number[] => {
        const f = imKoerper(a, n);
        if (!stand || !f || f.length !== stand.length)
          return stand ? new Array(stand.length * 6).fill(0) : [];
        const ps = punkte(stand);
        const pf = punkte(f);
        const out: number[] = [];
        ps.forEach((p, j) => out.push(pf[j]![0] - v[0] - p[0], pf[j]![1] - v[1] - p[1]));
        return out;
      };
      const vorn = HALTUNGEN.map((x, i) =>
        korrektur(standKopf.vorn.get(n), x.vorn, this.kopfVorn[i]!),
      );
      const profil = HALTUNGEN.map((x, i) =>
        korrektur(standKopf.profil.get(n), x.profil, this.kopfProfil[i]!),
      );
      if ([...vorn, ...profil].some((r) => r.some((v) => Math.abs(v) > 1e-6)))
        this.kopfRest.set(n, { vorn, profil });
    }
    for (const { vorn, profil } of HALTUNGEN)
      this.reihen.push({
        vorn: d.ansichten[vorn].def.teile.slice(),
        profil: d.ansichten[profil].def.teile.slice(),
      });
  }

  /** Körperteile bei Haltung h (0 … 2) und Kopfwinkel θ (Reihe vorn → Profil gemischt), Körperkoordinaten wie bei ψ = 90 */
  koerper(h: number, theta = 0): Map<TeilName, Form> {
    const s = Math.max(0, Math.min(1, theta / 90));
    if (s <= 1e-6) return this.koerperReihe('vorn', h);
    if (s >= 1 - 1e-6) return this.koerperReihe('profil', h);
    const a = this.koerperReihe('vorn', h);
    const b = this.koerperReihe('profil', h);
    const out = new Map<TeilName, Form>();
    const mix = (p: Punkt, q: Punkt): Punkt => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
    for (const [n, f] of a) {
      const g = b.get(n)!;
      out.set(
        n,
        f.map((x, i) => ({ p: mix(x.p, g[i]!.p), i: mix(x.i, g[i]!.i), o: mix(x.o, g[i]!.o) })),
      );
    }
    return out;
  }

  private koerperReihe(reihe: 'vorn' | 'profil', h: number): Map<TeilName, Form> {
    const out = new Map<TeilName, Form>();
    const m = (ys: number[]): number => pchip(this.hs, ys, h);
    const zustand = new Map<TeilName, { w: number; p: Punkt; k: Knochen }>();
    for (const [n, k] of this.knochen[reihe])
      zustand.set(n, {
        w: m(k.winkel),
        p: [m(k.lage.map((q) => q[0])), m(k.lage.map((q) => q[1]))],
        k,
      });
    for (const [n, t] of this.teile[reihe]) {
      const f0 = this.stand.get(n)!;
      const z = zustand.get(t.knochen)!;
      const ps = punkte(f0);
      const q = ps.map((p, j): Punkt => {
        const r: Punkt = [
          p[0] - z.k.dreh[0] + m(t.rest.map((x) => x[2 * j]!)),
          p[1] - z.k.dreh[1] + m(t.rest.map((x) => x[2 * j + 1]!)),
        ];
        const v = drehen(r, z.w);
        return [z.p[0] + v[0], z.p[1] + v[1]];
      });
      out.set(
        n,
        f0.map((_, a) => ({ p: q[3 * a]!, i: q[3 * a + 1]!, o: q[3 * a + 2]! })),
      );
    }
    return out;
  }

  /** Versatz des Kopfs bei Haltung h und Kopfwinkel θ (0 vorn … 90 Profil) gegen das Stehen */
  kopfVersatz(h: number, theta: number): Punkt {
    const s = Math.max(0, Math.min(1, theta / 90));
    const m = (q: Punkt[], i: 0 | 1): number =>
      pchip(
        this.hs,
        q.map((x) => x[i]),
        h,
      );
    return [
      m(this.kopfVorn, 0) * (1 - s) + m(this.kopfProfil, 0) * s,
      m(this.kopfVorn, 1) * (1 - s) + m(this.kopfProfil, 1) * s,
    ];
  }

  /** Korrektur eines Kopfteils bei Haltung h (an der Form im Stehen, schon am Ort) */
  kopfKorrektur(n: TeilName, form: Form, h: number, theta: number): Form {
    const r = this.kopfRest.get(n);
    if (!r || h <= 0) return form;
    const s = Math.max(0, Math.min(1, theta / 90));
    const ps = punkte(form);
    const q = ps.map((p, j): Punkt => {
      const dx =
        pchip(
          this.hs,
          r.vorn.map((x) => x[2 * j] ?? 0),
          h,
        ) *
          (1 - s) +
        pchip(
          this.hs,
          r.profil.map((x) => x[2 * j] ?? 0),
          h,
        ) *
          s;
      const dy =
        pchip(
          this.hs,
          r.vorn.map((x) => x[2 * j + 1] ?? 0),
          h,
        ) *
          (1 - s) +
        pchip(
          this.hs,
          r.profil.map((x) => x[2 * j + 1] ?? 0),
          h,
        ) *
          s;
      return [p[0] + dx, p[1] + dy];
    });
    return form.map((_, a) => ({ p: q[3 * a]!, i: q[3 * a + 1]!, o: q[3 * a + 2]! }));
  }

  /** Malreihenfolge der nächsten Haltungsvorlage; fehlende Teile hinter die Beine (Körper) bzw. zu den Ohren (Ohrspalt) */
  reihe(h: number, theta: number, alle: TeilName[]): TeilName[] {
    const i = Math.max(0, Math.min(HALTUNGEN.length - 1, Math.round(h)));
    const r = theta < 45 ? this.reihen[i]!.vorn : this.reihen[i]!.profil;
    const out = r.filter((n) => alle.includes(n));
    for (const n of alle) {
      if (out.includes(n)) continue;
      if (n === 'ohrSpalt') {
        // vorn liegt der Ohrspalt unter dem nahen Ohr: direkt davor malen
        const j = out.indexOf('ohrA');
        out.splice(j >= 0 ? j : 0, 0, n);
      } else {
        const j = out.indexOf('bohne');
        out.splice(j >= 0 ? j + 1 : 0, 0, n);
      }
    }
    return out;
  }

  /** Vorlage an einer Haltung (h ganzzahlig, θ 0 oder 90), sonst null */
  vorlageBei(h: number, theta: number): AnsichtName | null {
    const i = Math.round(h);
    if (Math.abs(h - i) > 1e-3 || i < 1 || i >= HALTUNGEN.length) return null;
    if (Math.abs(theta) < 0.6) return HALTUNGEN[i]!.vorn;
    if (Math.abs(theta - 90) < 0.6) return HALTUNGEN[i]!.profil;
    return null;
  }
}
