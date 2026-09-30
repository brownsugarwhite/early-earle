/**
 * Talk timing: a German line → a deterministic syllable schedule for REX's jaw (vowel groups ≈ syllables,
 * diphthongs count once), with pauses at punctuation and emphasis on the first syllable of a word and on "!".
 */

export interface Syllable {
  /** Start and end in seconds (timeScale 1). */
  t0: number;
  t1: number;
  /** Jaw opening 0..1 (a > o/u > e/i). */
  open: number;
  /** Stressed (first syllable of a word, or the line is shouted). */
  stress: boolean;
}

export interface SyllableSchedule {
  syllables: Syllable[];
  duration: number;
  /** Line ends with "?" (head tilt) / "!" (bigger, a small hop) / "…" (drowsy). */
  question: boolean;
  exclaim: boolean;
  trailing: boolean;
}

const VOWELS = 'aeiouyäöüàáâéèêíìîóòôúùû';
const DIPHTHONGS = ['ei', 'ie', 'au', 'eu', 'äu', 'ai', 'ou'];
const SYLLABLE_S = 0.17;
const WORD_GAP_S = 0.05;

function openFor(v: string): number {
  const c = v[0] ?? 'e';
  if ('aàáâä'.includes(c)) return 1;
  if ('oòóôöuùúûü'.includes(c)) return 0.72;
  return 0.52;
}

/** Vowel groups of a word (each one syllable). */
export function vowelGroups(word: string): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  let i = 0;
  while (i < w.length) {
    const ch = w[i]!;
    if (!VOWELS.includes(ch)) {
      i++;
      continue;
    }
    const pair = w.slice(i, i + 2);
    if (DIPHTHONGS.includes(pair)) {
      out.push(pair);
      i += 2;
    } else {
      out.push(ch);
      i += 1;
    }
    // A double vowel ("aa", "ee", "oo") is one long syllable.
    while (i < w.length && w[i] === ch) i++;
  }
  return out;
}

/** Builds the jaw schedule for a line (words without vowels, e.g. "Hm", still get one short syllable). */
export function syllableSchedule(text: string): SyllableSchedule {
  const syllables: Syllable[] = [];
  const trimmed = text.trim();
  const exclaim = /!\s*$/.test(trimmed);
  const question = /\?\s*$/.test(trimmed);
  const trailing = /(…|\.\.\.)\s*$/.test(trimmed);
  let t = 0.04;
  const tokens = trimmed.split(/(\s+|[.,!?;:…]+)/).filter((s) => s.length > 0);
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      t += WORD_GAP_S;
      continue;
    }
    if (/^[.,!?;:…]+$/.test(tok)) {
      t += tok.includes(',') ? 0.14 : tok.includes('…') ? 0.42 : 0.3;
      continue;
    }
    const groups = vowelGroups(tok);
    const n = Math.max(1, groups.length);
    for (let k = 0; k < n; k++) {
      const g = groups[k] ?? 'e';
      const long = g.length > 1 || /[aou]h/.test(tok.toLowerCase());
      const d = SYLLABLE_S * (long ? 1.25 : 1) * (trailing ? 1.2 : 1);
      syllables.push({ t0: t, t1: t + d, open: openFor(g) * (exclaim ? 1.1 : 1), stress: k === 0 || exclaim });
      t += d;
    }
  }
  return { syllables, duration: t + 0.12, question, exclaim, trailing };
}

/** Jaw opening of a schedule at time t (0..1): a quick attack and a softer release per syllable. */
export function jawAt(s: SyllableSchedule, t: number): number {
  let v = 0;
  for (const syl of s.syllables) {
    if (t < syl.t0 || t > syl.t1) continue;
    const x = (t - syl.t0) / (syl.t1 - syl.t0);
    const env = x < 0.35 ? Math.sin((x / 0.35) * (Math.PI / 2)) : Math.cos(((x - 0.35) / 0.65) * (Math.PI / 2));
    v = Math.max(v, env * syl.open * (syl.stress ? 1 : 0.8));
  }
  return v;
}
