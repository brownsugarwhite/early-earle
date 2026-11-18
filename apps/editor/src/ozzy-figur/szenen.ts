// Ozzy-Figur: Szenen für den Renderer. Etappe B: Florians sechs Vorlagen genau, dazu zwei Prüfszenen für die Regeln
// (Kopf dreht Logo → Profil; Körper dreht Front → Logo). Das Raster aller Drehungen kommt mit Etappe C.
import { type Form, kasten, morphen, type MorphArt, schwerpunkt, verschieben } from './form';
import type { Fluessig, Gruppe, Ohrspalt, RenderTeil, Szene, Verdecker } from './renderer';
import { type AnsichtName, type FigurAnsicht, type FigurDaten, type TeilName, teilVon } from './vorlagen/import';

/** Mindestrand des Beinfensters im Gips und des Schwanz-Inneren (Figur-Einheiten; die Vorlagen haben 16,7 bzw. 13,7) */
export const FENSTER_RAND = 8;
export const SCHWANZ_RAND = 6;

export interface Regeln {
  /** größter Rand auf der abgewandten Seite des Kopfs (bei 45°), Figur-Einheiten */
  verdecken: number;
  spaltBreite: number;
  spaltAuslauf: number;
  /** Morph der Kopfteile */
  art: MorphArt;
}
export const REGELN: Regeln = { verdecken: 16, spaltBreite: 6, spaltAuslauf: 10, art: 'winkel' };

export function gruppeVon(name: TeilName): Gruppe {
  if (name === 'bohne') return 'bohne';
  if (name.startsWith('bein') || name.startsWith('keil')) return 'bein';
  if (name === 'schwanz') return 'schwanz';
  if (name === 'kopfA' || name === 'kopfB') return 'kopf';
  if (name === 'ohrA') return 'ohrA';
  if (name === 'ohrB') return 'ohrB';
  if (name === 'nase') return 'nase';
  return 'sonst';
}

interface Roh {
  name: TeilName;
  weiss: boolean;
  form: Form;
}
/** Klemme eines Fensters, das nicht wandert: so weit außerhalb seines Gipses (Florians Fenster ragen bis 6 darüber) */
const KLEMME_AUSSEN = 6.5;

/**
 * Liste in Malreihenfolge → Renderteile mit Gruppe, Träger und Rand. Fenster ragen in Florians Front über ihren Gips hinaus;
 * geklemmt werden sie darum nur, wenn sie wandern (`wandern`: Teil → 0 … 1, 0 = wie gezeichnet, 1 = ganz geklemmt).
 */
export function renderTeile(liste: Roh[], wandern: Partial<Record<TeilName, number>> = {}): RenderTeil[] {
  const index = new Map(liste.map((t, i) => [t.name, i]));
  return liste.map((t) => {
    const r: RenderTeil = { name: t.name, weiss: t.weiss, gruppe: gruppeVon(t.name), form: t.form };
    const w = wandern[t.name];
    if (t.name.startsWith('fenster') && w !== undefined) {
      const bein = index.get(t.name.replace('fenster', 'bein') as TeilName);
      if (bein !== undefined) {
        r.traeger = bein;
        // wie gezeichnet: Klemme knapp außerhalb (wirkt nicht); beim Gleiten wandert sie mit bis auf den Gipsrand
        r.rand = -KLEMME_AUSSEN + (FENSTER_RAND + KLEMME_AUSSEN) * w;
      }
    } else if (t.name === 'schwanzW') {
      const s = index.get('schwanz');
      if (s !== undefined) {
        r.traeger = s;
        r.rand = SCHWANZ_RAND;
      }
    }
    return r;
  });
}

export function vorlageSzene(d: FigurDaten, a: AnsichtName, fl: Fluessig): Szene {
  return { teile: renderTeile(d.ansichten[a].teile), fluessig: fl, verdecker: [], ohrspalt: null };
}

const form = (a: FigurAnsicht, n: TeilName): Form => {
  const t = teilVon(a, n);
  if (!t) throw new Error(`${n} fehlt in ${a.name}`);
  return t.form;
};
const KOPF_TEILE: TeilName[] = ['ohrB', 'ohrA', 'kopfB', 'kopfA', 'bartA', 'bartB', 'nase'];

/** Prüfszene: Kopf dreht vom Logo (0°) ins Profil (90°), Körper wie im Logo. t = 0 … 1 */
export function kopfDrehung(d: FigurDaten, t: number, fl: Fluessig, regeln: Regeln = REGELN): Szene {
  const logo = d.ansichten.logo;
  const profil = d.ansichten.profil;
  const kl = kasten(form(logo, 'bohne'));
  const kp = kasten(form(profil, 'bohne'));
  const dx = kl[0] - kp[0];
  const dy = kl[1] - kp[1];
  const kopf = new Map<TeilName, Form>(KOPF_TEILE.map((n) => [n, morphen(form(logo, n), verschieben(form(profil, n), dx, dy), t, n.startsWith('ohr') ? 'aehnlich' : regeln.art)]));
  // Malreihenfolge des Logos, die Ohren wie im Profil (fernes zuerst)
  const reihe: TeilName[] = ['schwanz', 'bohne', 'schwanzW', 'beinLH', 'beinLV', 'beinRV', 'beinRH', 'fensterRH', 'keilV', 'keilH', 'ohrB', 'ohrA', 'kopfB', 'kopfA', 'fensterRV', 'bartA', 'bartB', 'nase'];
  const liste: Roh[] = reihe.map((n) => ({ name: n, weiss: teilVon(logo, n)!.weiss, form: kopf.get(n) ?? form(logo, n) }));
  const masken = [...kopf.get('kopfA')!, ...kopf.get('kopfB')!];
  const verdecker: Verdecker[] = [{ mitte: schwerpunkt(masken), richtung: [1, 0], radius: 130, staerke: regeln.verdecken * Math.sin(Math.PI * t) }];
  const ohrspalt: Ohrspalt = { nah: reihe.indexOf('ohrA'), fern: reihe.indexOf('ohrB'), breite: regeln.spaltBreite, auslauf: regeln.spaltAuslauf };
  return { teile: renderTeile(liste), fluessig: fl, verdecker, ohrspalt };
}

const smooth = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/**
 * Prüfszene: Körper dreht von der Front (0°) in die Seite (Logo, 90°), der Kopf schaut zu uns. Beine als Punkte im Raum (Breite aus
 * der Front, Länge aus der Seite), Fenster wandern: das linke vordere gleitet nach rechts hinter den Gipsrand, das rechte hintere
 * kommt von links. t = 0 … 1; das Logo liegt an seiner Stelle, die Front um die Bohnenmitte verschoben.
 */
export function koerperDrehung(d: FigurDaten, t: number, fl: Fluessig): Szene {
  const front = d.ansichten.front;
  const logo = d.ansichten.logo;
  const kf = kasten(form(front, 'bohne'));
  const kl = kasten(form(logo, 'bohne'));
  const cF = (kf[0] + kf[2]) / 2;
  const cL = (kl[0] + kl[2]) / 2;
  const dyF = logo.boden - front.boden;
  const relF = (f: Form): Form => verschieben(f, -cF, dyF);
  const relL = (f: Form): Form => verschieben(f, -cL, 0);
  const psi = (t * Math.PI) / 2;
  const c = Math.cos(psi);
  const s = Math.sin(psi);
  const liste: Roh[] = [];
  const zu = (f: Form): Form => verschieben(f, cL, 0);
  // Schwanz: hinten verdeckt, in der Seite am Hinterteil
  const zS = schwerpunkt(relL(form(logo, 'schwanz')))[0];
  for (const n of ['schwanz', 'schwanzW'] as TeilName[]) liste.push({ name: n, weiss: n === 'schwanzW', form: zu(verschieben(relL(form(logo, n)), zS * s - zS, 0)) });
  liste.push({ name: 'bohne', weiss: false, form: zu(morphen(relF(form(front, 'bohne')), relL(form(logo, 'bohne')), t)) });
  // Beine
  const beine = (['beinRV', 'beinRH', 'beinLV', 'beinLH'] as TeilName[]).map((n) => {
    const af = relF(form(front, n));
    const al = relL(form(logo, n));
    const X = schwerpunkt(af)[0];
    const Z = schwerpunkt(al)[0];
    const x = X * c + Z * s;
    // Nähe zur Kamera: vorn sind die Vorderbeine nah, in der Seite (nach rechts) Ozzys rechte Beine
    const nah = 70 * (n.endsWith('V') ? 1 : -1) * c + 50 * (n.startsWith('beinR') ? 1 : -1) * s;
    return { n, X, Z, x, nah, form: zu(verschieben(morphen(verschieben(af, -X, 0), verschieben(al, -Z, 0), t), x, 0)) };
  });
  for (const b of [...beine].sort((u, v) => u.nah - v.nah)) liste.push({ name: b.n, weiss: false, form: b.form });
  const bein = (n: TeilName) => beine.find((b) => b.n === n)!;
  // Keile: vorderer aus dem Mittelkeil der Front, hinterer hängt zwischen den Hinterbeinen (vorn verdeckt)
  const rv = bein('beinRV');
  const lv = bein('beinLV');
  const rh = bein('beinRH');
  const lh = bein('beinLH');
  const kvF = relF(form(front, 'keilMitte'));
  const kvL = relL(form(logo, 'keilV'));
  const mitteV = (rv.x + lv.x) / 2;
  const mvF = (rv.X + lv.X) / 2;
  const mvL = (rv.Z + lv.Z) / 2;
  liste.push({ name: 'keilV', weiss: false, form: zu(verschieben(morphen(verschieben(kvF, -mvF, 0), verschieben(kvL, -mvL, 0), t), mitteV, 0)) });
  const mhL = (rh.Z + lh.Z) / 2;
  liste.push({ name: 'keilH', weiss: false, form: zu(verschieben(relL(form(logo, 'keilH')), (rh.x + lh.x) / 2 - mhL, 0)) });
  // Fenster
  const fRV = morphen(verschieben(relF(form(front, 'fensterRV')), -rv.X, 0), verschieben(relL(form(logo, 'fensterRV')), -rv.Z, 0), t);
  const wegLV = smooth(0.1, 0.7, t);
  const wegRH = 1 - smooth(0.3, 0.9, t);
  const fLV = verschieben(relF(form(front, 'fensterLV')), -lv.X + lv.x + 70 * wegLV, 0);
  const fRH = verschieben(relL(form(logo, 'fensterRH')), -rh.Z + rh.x - 70 * wegRH, 0);
  if (t < 0.999) liste.push({ name: 'fensterLV', weiss: true, form: zu(fLV) });
  if (t > 0.001) liste.push({ name: 'fensterRH', weiss: true, form: zu(fRH) });
  // Kopf schaut zu uns: Frontkopf an der Halsstelle (Punkt im Raum); vor dem Fenster RV wie in der Front, dahinter wie im Logo
  const hX = schwerpunkt(relF(form(front, 'kopfA')))[0];
  const hZ = schwerpunkt(relL(form(logo, 'kopfA')))[0];
  const kx = hX * c + hZ * s;
  const kopfForm = (n: TeilName): Form => zu(verschieben(relL(form(logo, n)), kx - hZ, dyF * (1 - t)));
  const fenster = { name: 'fensterRV' as TeilName, weiss: true, form: zu(verschieben(fRV, rv.x, 0)) };
  if (t < 0.5) liste.push(fenster);
  for (const n of ['ohrA', 'ohrB', 'kopfB', 'kopfA'] as TeilName[]) liste.push({ name: n, weiss: false, form: kopfForm(n) });
  if (t >= 0.5) liste.push(fenster);
  for (const n of ['bartA', 'bartB', 'nase'] as TeilName[]) liste.push({ name: n, weiss: n !== 'nase', form: kopfForm(n) });
  // Klemme wächst mit dem Weg: wie gezeichnet ungeklemmt, beim Gleiten bleibt der Gipsrand stehen
  // Die Klemme erreicht den Gipsrand schon nach einem Sechstel des Wegs: so ragt kein gleitendes Fenster über den Gips hinaus
  return { teile: renderTeile(liste, { fensterLV: Math.min(1, wegLV * 6), fensterRH: Math.min(1, wegRH * 6) }), fluessig: fl, verdecker: [], ohrspalt: null };
}

/** Kasten einer Szene in Figur-Einheiten (für das Einpassen ins Bild) */
export function szenenKasten(sz: Szene): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of sz.teile) {
    const k = kasten(t.form);
    x0 = Math.min(x0, k[0]);
    y0 = Math.min(y0, k[1]);
    x1 = Math.max(x1, k[2]);
    y1 = Math.max(y1, k[3]);
  }
  return [x0, y0, x1, y1];
}
