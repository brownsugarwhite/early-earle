// Ozzy, Zähne je Pose (Plan „Maul, Zähne, Zunge“, Etappe 8, Scheibe 4, 21.11.2026).
// Florian (Konzept 4.10): „Gespeichert wird je Pose der Versatz gegen die Grundform; neu ist nur, was dazukommt: die Lage jedes
// Zahns.“ Die Zähne der Form stehen am Maul (`werk.MaulZaehne`); eine Pose merkt sich nur, was sie daran anders hat.
//
// Die Regel der Posen gilt auch hier: Eine Pose ist dieselbe Form in einer anderen Lage, mit denselben Teilen.
//   - Was die Zähne SIND, gehört der Form und gilt für alle Posen: Anzahl, Reichweite, Lücken, Form (Vorlage oder eigene Linien),
//     Farbe.
//   - Wie sie STEHEN und wie groß sie sind, kann eine Pose anders haben: je Reihe Größe, Neigung, Verlauf, Sitz; je Zahn gerückt
//     (längs, zur Tiefe) und sein Faktor der Größe. Gemerkt ist der Unterschied (dazugezählt), wie der Versatz der Punkte: Was
//     die Grundform später ändert, ändert sich in jeder Pose mit.
// Ohne DOM, ohne Werk: reine Werte. Nichts wird am Ort geändert.
import type { MaulZaehne, ZahnEigen, ZahnReihe } from './werk';

/** was ein einzelner Zahn in einer Pose anders steht als in der Grundform (dazugezählt; fehlt: wie dort) */
export type ZahnEigenVersatz = { ds?: number; dz?: number; faktor?: number };
/** was eine Reihe in einer Pose anders hat als in der Grundform (dazugezählt), und dasselbe für einzelne Zähne (je Nummer) */
export type ZahnReiheVersatz = { groesse?: number; neigung?: number; verlauf?: number; sitz?: number; eigen?: Record<number, ZahnEigenVersatz> };
/** die Zähne einer Pose: ihr Versatz gegen die der Grundform */
export type PoseZaehne = { oben?: ZahnReiheVersatz; unten?: ZahnReiheVersatz };

/** die Zahlen einer Reihe, die eine Pose anders haben kann */
const WERTE = ['groesse', 'neigung', 'verlauf', 'sitz'] as const;
/** die Zahlen eines Zahns, die eine Pose anders haben kann, mit dem Wert, der ohne Eintrag gilt */
const EIGEN = [
  ['ds', 0],
  ['dz', 0],
  ['faktor', 1],
] as const;
/** kleinere Unterschiede sind keine (Rundung beim Hin und Zurück) */
const KLEIN = 1e-9;
const KIEFER = ['oben', 'unten'] as const;

/** dieselben Werte (Dinge mit denselben Einträgen, gleich in welcher Reihenfolge; ein fehlender Eintrag ist wie `undefined`) */
function gleich(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const A = a as Record<string, unknown>;
  const B = b as Record<string, unknown>;
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (!gleich(A[k], B[k])) return false;
  return true;
}

function reiheMit(r: ZahnReihe, v: ZahnReiheVersatz | undefined): ZahnReihe {
  if (!v) return r;
  const out: ZahnReihe = { ...r };
  for (const k of WERTE) if (v[k]) out[k] = r[k] + v[k];
  let eigen: Record<number, ZahnEigen> | null = null;
  for (const [nr, d] of Object.entries(v.eigen ?? {})) {
    const i = Number(nr);
    const e = r.eigen?.[i];
    // (einen Zahn, den es nicht gibt oder der gezogen ist, rückt nichts)
    if (!(i >= 0 && i < r.anzahl) || e?.weg) continue;
    const neu: ZahnEigen = { ...e };
    for (const [k, ohne] of EIGEN) if (d[k]) neu[k] = (e?.[k] ?? ohne) + d[k];
    (eigen ??= { ...r.eigen })[i] = neu;
  }
  if (eigen) out.eigen = eigen;
  return out;
}

/** Die Zähne einer Pose: die der Grundform plus ihr Versatz. Ohne Versatz: die der Grundform selbst (dasselbe Ding). */
export function zaehneMitVersatz(g: MaulZaehne, v: PoseZaehne | null | undefined): MaulZaehne {
  if (!v || (!v.oben && !v.unten)) return g;
  return { ...g, oben: reiheMit(g.oben, v.oben), unten: reiheMit(g.unten, v.unten) };
}

function reiheTeilen(g: ZahnReihe, z: ZahnReihe): { grund: ZahnReihe; versatz: ZahnReiheVersatz | null } {
  // (mit der Anzahl meinen die Nummern andere Zähne: Was einzelne Zähne eigen hatten, ist in `z` schon gefallen)
  const andere = z.anzahl !== g.anzahl;
  const v: ZahnReiheVersatz = {};
  for (const k of WERTE) {
    const d = z[k] - g[k];
    if (Math.abs(d) > KLEIN) v[k] = d;
  }
  const eigenG: Record<number, ZahnEigen> = {};
  const eigenV: Record<number, ZahnEigenVersatz> = {};
  const nummern = new Set([...Object.keys(z.eigen ?? {}), ...(andere ? [] : Object.keys(g.eigen ?? {}))].map(Number));
  for (const i of [...nummern].sort((a, b) => a - b)) {
    if (!(i >= 0 && i < z.anzahl)) continue;
    const ze = z.eigen?.[i];
    const ge = andere ? undefined : g.eigen?.[i];
    // (ein gezogener Zahn ist für alle Posen gezogen, und er hat nichts Eigenes mehr)
    if (ze?.weg) {
      eigenG[i] = { weg: true };
      continue;
    }
    // der Zahn der Grundform: seine Zahlen bleiben, was er ist (eigene Form), kommt aus `z`
    const e: ZahnEigen = {};
    const d: ZahnEigenVersatz = {};
    for (const [k, ohne] of EIGEN) {
      // (war er in der Grundform gezogen und ist es jetzt nicht mehr, beginnt er an seinem Platz)
      const vorher = ge?.weg ? undefined : ge?.[k];
      if (vorher !== undefined) e[k] = vorher;
      const u = (ze?.[k] ?? ohne) - (vorher ?? ohne);
      if (Math.abs(u) > KLEIN) d[k] = u;
    }
    if (ze?.form !== undefined) e.form = ze.form;
    if (ze?.gestalt) e.gestalt = ze.gestalt;
    if (Object.keys(e).length) eigenG[i] = e;
    if (Object.keys(d).length) eigenV[i] = d;
  }
  if (Object.keys(eigenV).length) v.eigen = eigenV;
  const grund: ZahnReihe = {
    anzahl: z.anzahl,
    groesse: g.groesse,
    neigung: g.neigung,
    verlauf: g.verlauf,
    bis: z.bis,
    sitz: g.sitz,
    form: z.form,
    ...(z.gestalt ? { gestalt: z.gestalt } : {}),
    ...(Object.keys(eigenG).length ? { eigen: eigenG } : {}),
  };
  return { grund: gleich(grund, g) ? g : grund, versatz: Object.keys(v).length ? v : null };
}

/**
 * Was in einer Pose an den Zähnen gestellt wurde, teilen: `z` sind die Zähne, wie sie in der Pose jetzt sein sollen, `g` die der
 * Grundform. Zurück: die Grundform danach (was die Zähne sind, aus `z`; ihre Zahlen wie bisher; dasselbe Ding, wenn sich an ihr
 * nichts ändert) und der Versatz der Pose (null: keiner). Es gilt `zaehneMitVersatz(grund, versatz)` = `z` bis auf Rundung.
 */
export function zaehneTeilen(g: MaulZaehne, z: MaulZaehne): { grund: MaulZaehne; versatz: PoseZaehne | null } {
  const o = reiheTeilen(g.oben, z.oben);
  const u = reiheTeilen(g.unten, z.unten);
  const grund: MaulZaehne = o.grund === g.oben && u.grund === g.unten && g.farbe === z.farbe ? g : { oben: o.grund, unten: u.grund, ...(z.farbe !== undefined ? { farbe: z.farbe } : {}) };
  const versatz: PoseZaehne = { ...(o.versatz ? { oben: o.versatz } : {}), ...(u.versatz ? { unten: u.versatz } : {}) };
  return { grund, versatz: versatz.oben || versatz.unten ? versatz : null };
}

/**
 * Der Versatz einer Pose, nachdem sich die Zähne der Form geändert haben (`vorher` → `jetzt`; fehlt eines: Es gibt dort keine
 * Zähne): Mit der Anzahl einer Reihe fällt, was einzelne Zähne anders hatten (ihre Nummern meinen dann andere Zähne), ohne Zähne
 * alles. Ändert sich nichts: dasselbe Ding zurück.
 */
export function versatzPassend(v: PoseZaehne | null | undefined, vorher: MaulZaehne | null | undefined, jetzt: MaulZaehne | null | undefined): PoseZaehne | null {
  if (!v || !vorher || !jetzt) return null;
  let out: PoseZaehne = v;
  for (const k of KIEFER) {
    const r = v[k];
    if (!r?.eigen || vorher[k].anzahl === jetzt[k].anzahl) continue;
    const { eigen: _weg, ...rest } = r;
    void _weg;
    const { [k]: _alt, ...ohne } = out;
    void _alt;
    out = Object.keys(rest).length ? { ...ohne, [k]: rest } : ohne;
  }
  return out.oben || out.unten ? out : null;
}

/** Sind zwei Versätze dieselben (auch: beide keiner)? */
export const versatzGleich = (a: PoseZaehne | null | undefined, b: PoseZaehne | null | undefined): boolean => gleich(a ?? null, b ?? null);

/** Der Versatz einer Pose aus einer Datei: nur, was eine endliche Zahl an einer bekannten Stelle ist (null: nichts davon) */
export function versatzAusDatei(x: unknown): PoseZaehne | null {
  if (!x || typeof x !== 'object') return null;
  const zahl = (w: unknown): w is number => typeof w === 'number' && Number.isFinite(w) && Math.abs(w) > KLEIN;
  const out: PoseZaehne = {};
  for (const k of KIEFER) {
    const r = (x as Record<string, unknown>)[k];
    if (!r || typeof r !== 'object') continue;
    const q = r as Record<string, unknown>;
    const v: ZahnReiheVersatz = {};
    for (const w of WERTE) if (zahl(q[w])) v[w] = q[w];
    const eigen: Record<number, ZahnEigenVersatz> = {};
    if (q.eigen && typeof q.eigen === 'object') {
      for (const [nr, e] of Object.entries(q.eigen as Record<string, unknown>)) {
        const i = Number(nr);
        if (!Number.isInteger(i) || i < 0 || !e || typeof e !== 'object') continue;
        const d: ZahnEigenVersatz = {};
        for (const [w] of EIGEN) {
          const wert = (e as Record<string, unknown>)[w];
          if (zahl(wert)) d[w] = wert;
        }
        if (Object.keys(d).length) eigen[i] = d;
      }
    }
    if (Object.keys(eigen).length) v.eigen = eigen;
    if (Object.keys(v).length) out[k] = v;
  }
  return out.oben || out.unten ? out : null;
}
