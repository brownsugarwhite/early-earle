// Ozzy-Figur: Szenen für den Renderer. Florians neun Vorlagen genau (Etappe A/B) und die Drehungen aus dem Schlüsselformen-Raster
// (Etappe C, raster.ts): „Ozzy dreht sich“ (Körper und Kopf zusammen: Front → 3/4 → Profil), „Kopf dreht“ (Seite, Kopf vorn → Profil),
// „Körper dreht“ (Kopf schaut zu uns, Körper vorn → Seite).
import type { Form } from './form';
import { ABLAEUFE, type AblaufName, ablaufBei, type AnkerOrt, dauerVon } from './ablauf';
import type { HaltungName } from './haltung';
import { FigurRaster, type Lage } from './raster';
import type { Fluessig, Gruppe, RenderTeil, Szene } from './renderer';
import type { AnsichtName, FigurDaten, TeilName } from './vorlagen/import';

/** Mindestrand des Schwanz-Inneren (Figur-Einheiten; die Vorlagen haben 13,7) */
export const SCHWANZ_RAND = 6;

export interface Regeln {
  /** Rand auf der abgewandten Kopfseite zwischen den Schlüsseln (Figur-Einheiten, 0 = aus) */
  verdecken: number;
  /** Bohnenenden an den äußeren Beinkanten */
  bohnenenden: boolean;
}
/** Verdecken 8 (19.11.): zwischen den Schlüsselwinkeln behält die abgewandte Wange ihren schwarzen Rand (an den Schlüsseln ohne Wirkung) */
export const REGELN: Regeln = { verdecken: 8, bohnenenden: true };

export function gruppeVon(name: TeilName): Gruppe {
  if (name === 'bohne') return 'bohne';
  if (name.startsWith('bein') || name.startsWith('keil') || name.startsWith('sohle')) return 'bein';
  if (name === 'schwanz') return 'schwanz';
  if (name === 'kopfA' || name === 'kopfB') return 'kopf';
  if (name === 'ohrA') return 'ohrA';
  if (name === 'ohrB') return 'ohrB';
  if (name === 'nase') return 'nase';
  return 'sonst';
}

/** Weiß, das verschmilzt (Florian, 18.11.): der Bart mit den Fenstern der Vorderbeine; die Hinterbeine bleiben, wie gezeichnet */
export function weissGruppeVon(name: TeilName): 'bart' | 'fenster' | undefined {
  if (name === 'bartA' || name === 'bartB') return 'bart';
  if (name === 'fensterRV' || name === 'fensterLV') return 'fenster';
  return undefined;
}

interface Roh {
  name: TeilName;
  weiss: boolean;
  form: Form;
}
/** Liste in Malreihenfolge → Renderteile (Vorlagen: Fenster ungeklemmt, sie ragen in der Front über den Gips) */
export function renderTeile(liste: Roh[]): RenderTeil[] {
  const index = new Map(liste.map((t, i) => [t.name, i]));
  return liste.map((t) => {
    const r: RenderTeil = { name: t.name, weiss: t.weiss, gruppe: gruppeVon(t.name), form: t.form };
    const wg = weissGruppeVon(t.name);
    if (wg) r.weissGruppe = wg;
    if (t.name === 'schwanzW') {
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

/** Abläufe als Szenen (t = 0 … 1 über ihre ganze Dauer, ohne Feder), mit der Haltung, in der sie beginnen */
export const ABLAUF_START: Record<AblaufName, HaltungName> = {
  hinsetzen: 'stehen',
  huepfer: 'stehen',
  rutschen: 'stehen',
  gemuetlich: 'stehen',
  umlegen: 'sitzen',
  aufsetzen: 'liegen',
  aufstehen: 'liegen',
  aufstehenSitz: 'sitzen',
};
export type Drehung = 'drehen' | 'kopf' | 'kopf360' | 'koerper' | 'haltung' | 'haltungP' | AblaufName;
export const istAblauf = (n: string): n is AblaufName => n in ABLAEUFE;
/**
 * Lage einer Drehung bei t = 0 … 1. Haltungen: „haltung“/„haltungP“ die Kette Stehen (0) – Sitzen (0,5) – Liegen (1), Kopf vorn bzw.
 * im Profil; die Abläufe (ablauf.ts) über ihre ganze Dauer mit Zusatzbewegungen
 */
export function drehLage(art: Drehung, t: number, anker?: AnkerOrt): Lage {
  const w = t * 90;
  if (art === 'drehen') return { psi: w, theta: w };
  if (art === 'kopf') return { psi: 90, theta: w };
  // nur der Kopf, einmal ganz herum (0° vorn, 90° Profil, 180° Rücken, 270° Profil nach links)
  if (art === 'kopf360') return { psi: 90, theta: t * 360, nurKopf: true };
  if (art === 'haltung') return { psi: 90, theta: 0, haltung: 2 * t };
  if (art === 'haltungP') return { psi: 90, theta: 90, haltung: 2 * t };
  if (istAblauf(art)) {
    const a = ABLAEUFE[art];
    const l = ablaufBei(a, { [ABLAUF_START[art]]: 1 }, Math.max(0, Math.min(1, t)) * dauerVon(a), anker);
    return { psi: 90, theta: 0, posen: l.gewichte, effekte: l.effekte };
  }
  return { psi: w, theta: 0 };
}

const raster = new WeakMap<FigurDaten, FigurRaster>();
/** Ort dessen, was in einem Abschnitt stehen bleibt, aus dem Raster der Figur (Kopf vorn) */
export function ankerVon(d: FigurDaten): AnkerOrt {
  const r = rasterVon(d);
  return (g, anker) => r.ankerX(g, 0, anker);
}
export function rasterVon(d: FigurDaten): FigurRaster {
  let r = raster.get(d);
  if (!r) raster.set(d, (r = new FigurRaster(d)));
  return r;
}

export function drehSzene(d: FigurDaten, art: Drehung, t: number, fl: Fluessig, regeln: Regeln = REGELN): Szene {
  return rasterVon(d).szene(drehLage(art, t, ankerVon(d)), fl, { verdecken: regeln.verdecken }, regeln.bohnenenden);
}

/** Kasten einer Szene in Figur-Einheiten (für das Einpassen ins Bild) */
export function szenenKasten(sz: Szene): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of sz.teile)
    for (const a of t.form)
      for (const q of [a.p, a.i, a.o]) {
        x0 = Math.min(x0, q[0]);
        y0 = Math.min(y0, q[1]);
        x1 = Math.max(x1, q[0]);
        y1 = Math.max(y1, q[1]);
      }
  return [x0, y0, x1, y1];
}
