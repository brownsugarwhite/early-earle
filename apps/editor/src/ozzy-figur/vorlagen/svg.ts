// Ozzy-Figur: SVG aus Illustrator lesen (ohne DOM, läuft im Browser und in Tests).
// Gelesen werden path, polyline und polygon in Dateireihenfolge; die Füllfarbe kommt aus den Klassen im <style> oder aus fill.
// Illustrator schließt Pfade oft mit einer winzigen Linie zurück zum Start (0,01): Die wird mit dem Startanker verschmolzen.
import type { Anker, Form, Punkt } from '../form';

export interface SvgTeil {
  /** Reihenfolge in der Datei */
  index: number;
  art: 'path' | 'polyline' | 'polygon';
  weiss: boolean;
  form: Form;
  /** Länge der verschmolzenen Schlusslinie (0, wenn keine) */
  schlusslinie: number;
}
export interface SvgDatei {
  viewBox: [number, number, number, number];
  teile: SvgTeil[];
}

/** kürzer als das gilt eine Schlusslinie als Rest des Exports und wird verschmolzen */
export const SCHLUSS_TOLERANZ = 0.1;

interface Stueck {
  p: [Punkt, Punkt, Punkt, Punkt];
  schluss?: boolean;
}

function zahlen(d: string): (string | number)[] {
  const re = /([MmCcSsLlHhVvZzQqTtAa])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  const out: (string | number)[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push(m[1] ?? parseFloat(m[2]!));
  return out;
}

/** Pfad-Daten in Unterpfade aus kubischen Stücken (Linien als Kubik mit Griffen auf einem Drittel) */
export function pfadLesen(d: string): Stueck[][] {
  const t = zahlen(d);
  let i = 0;
  let cmd = 'M';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lcx: number | null = null;
  let lcy = 0;
  const unter: Stueck[][] = [];
  let cur: Stueck[] | null = null;
  const num = (): number => {
    const v = t[i++];
    if (typeof v !== 'number') throw new Error(`Zahl erwartet in Pfad bei ${i}`);
    return v;
  };
  const linie = (nx: number, ny: number, schluss = false): void => {
    const s: Stueck = { p: [[x, y], [x + (nx - x) / 3, y + (ny - y) / 3], [x + (2 * (nx - x)) / 3, y + (2 * (ny - y)) / 3], [nx, ny]] };
    if (schluss) s.schluss = true;
    cur!.push(s);
    x = nx;
    y = ny;
  };
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++] as string;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      x = (rel ? x : 0) + num();
      y = (rel ? y : 0) + num();
      sx = x;
      sy = y;
      cur = [];
      unter.push(cur);
      cmd = rel ? 'l' : 'L';
      lcx = null;
    } else if (C === 'Z') {
      if (Math.hypot(x - sx, y - sy) > 1e-9) linie(sx, sy, true);
      lcx = null;
    } else if (C === 'C' || C === 'S') {
      let a: Punkt;
      if (C === 'C') a = [(rel ? x : 0) + num(), 0];
      else a = lcx === null ? [x, y] : [2 * x - lcx, 2 * y - lcy];
      if (C === 'C') a[1] = (rel ? y : 0) + num();
      const b: Punkt = [(rel ? x : 0) + num(), 0];
      b[1] = (rel ? y : 0) + num();
      const e: Punkt = [(rel ? x : 0) + num(), 0];
      e[1] = (rel ? y : 0) + num();
      cur!.push({ p: [[x, y], a, b, e] });
      lcx = b[0];
      lcy = b[1];
      x = e[0];
      y = e[1];
    } else if (C === 'L') {
      const nx = (rel ? x : 0) + num();
      const ny = (rel ? y : 0) + num();
      linie(nx, ny);
      lcx = null;
    } else if (C === 'H') {
      linie((rel ? x : 0) + num(), y);
      lcx = null;
    } else if (C === 'V') {
      linie(x, (rel ? y : 0) + num());
      lcx = null;
    } else throw new Error(`Pfadbefehl ${cmd} wird nicht gelesen (nur M, C, S, L, H, V, Z)`);
  }
  return unter;
}

/** Stücke eines geschlossenen Unterpfads in Anker; die winzige Schlusslinie verschmilzt mit dem Start */
export function ausStuecken(stuecke: Stueck[]): { form: Form; schlusslinie: number } {
  const s = stuecke.slice();
  let schlusslinie = 0;
  const letzt = s[s.length - 1];
  if (letzt?.schluss) {
    const l = Math.hypot(letzt.p[3][0] - letzt.p[0][0], letzt.p[3][1] - letzt.p[0][1]);
    if (l < SCHLUSS_TOLERANZ) {
      s.pop();
      schlusslinie = l;
    }
  }
  const n = s.length;
  const form: Form = [];
  for (let k = 0; k < n; k++) {
    const st = s[k]!;
    const vor = s[(k - 1 + n) % n]!;
    const a: Anker = { p: [st.p[0][0], st.p[0][1]], i: [vor.p[2][0], vor.p[2][1]], o: [st.p[1][0], st.p[1][1]] };
    form.push(a);
  }
  // Der letzte Anker endete knapp neben dem Start: Start bleibt, wie Florian ihn gesetzt hat
  return { form, schlusslinie };
}

function attribut(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1]! : null;
}

function istHell(farbe: string): boolean {
  const f = farbe.trim().toLowerCase();
  if (f === 'white') return true;
  const h = f.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!h) return false;
  const x = h[1]!.length === 3 ? h[1]!.split('').map((c) => c + c).join('') : h[1]!;
  const r = parseInt(x.slice(0, 2), 16);
  const g = parseInt(x.slice(2, 4), 16);
  const b = parseInt(x.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
}

export function svgLesen(text: string): SvgDatei {
  const vb = text.match(/viewBox="([^"]+)"/);
  if (!vb) throw new Error('SVG ohne viewBox');
  const viewBox = vb[1]!.trim().split(/[\s,]+/).map(Number) as [number, number, number, number];
  // Klassen → Füllung
  const klassen = new Map<string, string>();
  for (const st of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
    for (const r of st[1]!.matchAll(/((?:\.[\w-]+\s*,?\s*)+)\{([^}]*)\}/g)) {
      const fill = r[2]!.match(/fill\s*:\s*([^;]+);?/);
      if (!fill) continue;
      for (const k of r[1]!.split(',')) klassen.set(k.trim().replace(/^\./, ''), fill[1]!.trim());
    }
  const teile: SvgTeil[] = [];
  const ohneMeta = text.replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  for (const m of ohneMeta.matchAll(/<(path|polyline|polygon)\b[^>]*>/g)) {
    const tag = m[0];
    const art = m[1] as SvgTeil['art'];
    const klasse = attribut(tag, 'class');
    const fill = attribut(tag, 'fill') ?? (klasse ? (klasse.split(/\s+/).map((k) => klassen.get(k)).find((v) => v) ?? null) : null) ?? '#000';
    let d: string;
    if (art === 'path') d = attribut(tag, 'd') ?? '';
    else {
      const z = (attribut(tag, 'points') ?? '').trim().split(/[\s,]+/).map(Number);
      const pk: string[] = [];
      for (let k = 0; k + 1 < z.length; k += 2) pk.push(`${z[k]},${z[k + 1]}`);
      d = `M${pk.join('L')}Z`;
    }
    const unter = pfadLesen(d);
    if (unter.length !== 1) throw new Error(`Teil ${teile.length} (${art}) hat ${unter.length} Unterpfade; erwartet wird einer je Teil`);
    const { form, schlusslinie } = ausStuecken(unter[0]!);
    teile.push({ index: teile.length, art, weiss: istHell(fill), form, schlusslinie });
  }
  return { viewBox, teile };
}
