import type { AudioGraph } from './graph';
import { speak, type Onset, type VoiceStyle, type VoiceSyllable } from './voice';

/**
 * REX's voice: charming gibberish that follows the line's own syllables. The timing mirrors REX's jaw
 * schedule (packages/render/src/rex/rexSyllables.ts: vowel groups ≈ syllables, 0.17 s each, 0.05 s word
 * gaps, pauses at punctuation), so voice and mouth move together; each syllable keeps its vowel (formants)
 * and its onset consonant, the melody comes from the mood (happy / neutral / worried) and the punctuation.
 */

export type RexMood = 'happy' | 'neutral' | 'worried';
export type RexChirp = 'yay' | 'ohno' | 'wow' | 'hmm';

const VOWELS = 'aeiouyäöüàáâéèêíìîóòôúùû';
const DIPHTHONGS = ['ei', 'ie', 'au', 'eu', 'äu', 'ai', 'ou'];
const SYLLABLE_S = 0.17;
const WORD_GAP_S = 0.05;
/** Babble stops (fades) after this long, however long the line is. */
export const BABBLE_MAX_S = 3.2;

export interface RexSyllable {
  t0: number;
  t1: number;
  vowel: string;
  onset: Onset;
  stress: boolean;
  /** Index of the syllable inside its word. */
  inWord: number;
}

export interface RexSchedule {
  syllables: RexSyllable[];
  duration: number;
  question: boolean;
  exclaim: boolean;
  trailing: boolean;
}

function onsetOf(cluster: string): Onset {
  const c = cluster.toLowerCase();
  if (!c) return 'none';
  if (c.endsWith('sch') || c.endsWith('ch')) return 'fricative';
  const ch = c[c.length - 1] ?? '';
  if ('pbtdkgq'.includes(ch)) return 'plosive';
  if ('fvszßwjhxc'.includes(ch)) return 'fricative';
  if ('mn'.includes(ch)) return 'nasal';
  if ('lr'.includes(ch)) return 'liquid';
  return 'none';
}

/** Vowel groups of a word with the consonant cluster before each (the onset). */
export function wordSyllables(word: string): Array<{ vowel: string; onset: Onset }> {
  const w = word.toLowerCase();
  const out: Array<{ vowel: string; onset: Onset }> = [];
  let i = 0;
  let cluster = '';
  while (i < w.length) {
    const ch = w[i]!;
    if (!VOWELS.includes(ch)) {
      if (/[a-zß]/.test(ch)) cluster += ch;
      i++;
      continue;
    }
    const pair = w.slice(i, i + 2);
    let vowel: string;
    if (DIPHTHONGS.includes(pair)) {
      vowel = pair;
      i += 2;
    } else {
      vowel = ch;
      i += 1;
    }
    while (i < w.length && w[i] === ch) i++;
    // Inside a word only the last consonant (or "ch"/"sch") leads into the next vowel.
    const lead = out.length === 0 ? cluster : cluster.endsWith('sch') ? 'sch' : cluster.endsWith('ch') ? 'ch' : cluster.slice(-1);
    out.push({ vowel, onset: onsetOf(lead) });
    cluster = '';
  }
  return out;
}

/** The syllable timeline of a line (same timing as REX's jaw). */
export function rexSchedule(text: string): RexSchedule {
  const syllables: RexSyllable[] = [];
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
    const groups = wordSyllables(tok);
    const n = Math.max(1, groups.length);
    for (let k = 0; k < n; k++) {
      const g = groups[k] ?? { vowel: 'e', onset: 'nasal' as Onset };
      const long = g.vowel.length > 1 || /[aou]h/.test(tok.toLowerCase());
      const d = SYLLABLE_S * (long ? 1.25 : 1) * (trailing ? 1.2 : 1);
      syllables.push({ t0: t, t1: t + d, vowel: g.vowel, onset: g.onset, stress: k === 0 || exclaim, inWord: k });
      t += d;
    }
  }
  return { syllables, duration: t + 0.12, question, exclaim, trailing };
}

/** Mood from the text alone (the wiring knows the trigger and passes a better one when it can). */
export function moodForText(text: string): RexMood {
  const s = text.trim();
  if (/!\s*$/.test(s) || /(ja|juhu|weiter|super|toll|schön|leuchten|ehren)/i.test(s)) return 'happy';
  if (/(…|\.\.\.)\s*$/.test(s) || /(macht nichts|fast|schade|oh|knifflig|nochmal)/i.test(s)) return 'worried';
  return 'neutral';
}

const REX_BASE_HZ = 300;

interface MoodShape {
  base: number;
  bounce: number;
  declination: number;
  glide: number;
  style: VoiceStyle;
}

const MOODS: Readonly<Record<RexMood, MoodShape>> = {
  happy: { base: 1.12, bounce: 0.1, declination: -0.06, glide: 0.06, style: { size: 1.18, breath: 0.12, vibrato: 12, growl: 0, gain: 0.55, bright: 0.55 } },
  neutral: { base: 1, bounce: 0.06, declination: -0.1, glide: 0.0, style: { size: 1.15, breath: 0.14, vibrato: 9, growl: 0, gain: 0.5, bright: 0.4 } },
  worried: { base: 0.9, bounce: 0.035, declination: -0.16, glide: -0.05, style: { size: 1.12, breath: 0.3, vibrato: 24, growl: 0, gain: 0.46, bright: 0.25 } },
};

/** Stable per-line variation (the same line always sounds the same). */
function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Turns the schedule into sung syllables: pitch contour by mood and punctuation. */
export function babbleSyllables(text: string, mood: RexMood): VoiceSyllable[] {
  const sch = rexSchedule(text);
  const m = MOODS[mood];
  const n = sch.syllables.length;
  const h = hashText(text);
  const out: VoiceSyllable[] = [];
  const base = REX_BASE_HZ * m.base * (0.97 + ((h & 0xff) / 255) * 0.06);
  sch.syllables.forEach((y, i) => {
    if (y.t0 > BABBLE_MAX_S) return;
    const u = n > 1 ? i / (n - 1) : 0;
    const wobble = ((h >>> (i % 24)) & 1 ? 1 : -1) * m.bounce * (y.inWord === 0 ? 1 : 0.6);
    let pitch = base * (1 + m.declination * u + wobble + (y.stress ? 0.05 : 0));
    let glide = m.glide;
    const lastOne = i === n - 1;
    if (lastOne) {
      if (sch.question) glide = 0.32;
      else if (sch.exclaim) {
        pitch *= 1.1;
        glide = 0.12;
      } else if (sch.trailing) glide = -0.15;
      else glide = mood === 'happy' ? -0.04 : -0.12;
    }
    out.push({ t0: y.t0, t1: y.t1, vowel: y.vowel, onset: y.onset, stress: y.stress, pitch, glide, amp: sch.exclaim ? 1 : 0.9 });
  });
  return out;
}

/** REX says a line. Returns the end time (context seconds). */
export function babble(g: AudioGraph, t: number, text: string, mood: RexMood = moodForText(text)): number {
  const syl = babbleSyllables(text, mood);
  const last = syl[syl.length - 1];
  const fade = last && last.t1 > BABBLE_MAX_S ? BABBLE_MAX_S - 0.3 : undefined;
  return speak(g, t, syl, MOODS[mood].style, fade === undefined ? { prio: 2 } : { prio: 2, fadeFrom: fade });
}

/** Short wordless reactions: "yay!", "oh no…", "wow!", "hmm?". */
export function chirp(g: AudioGraph, t: number, kind: RexChirp): number {
  const b = REX_BASE_HZ;
  let syl: VoiceSyllable[];
  let style: VoiceStyle;
  switch (kind) {
    case 'yay':
      syl = [
        { t0: 0, t1: 0.12, vowel: 'a', onset: 'none', stress: false, pitch: b * 1.05, glide: 0.12, amp: 0.8 },
        { t0: 0.12, t1: 0.42, vowel: 'ei', onset: 'none', stress: true, pitch: b * 1.3, glide: 0.18, amp: 1 },
      ];
      style = { ...MOODS.happy.style, gain: MOODS.happy.style.gain * 0.7 };
      break;
    case 'ohno':
      syl = [
        { t0: 0, t1: 0.18, vowel: 'o', onset: 'none', stress: true, pitch: b * 1.12, glide: -0.05, amp: 0.9 },
        { t0: 0.24, t1: 0.56, vowel: 'o', onset: 'nasal', stress: true, pitch: b * 1.0, glide: -0.24, amp: 0.85 },
      ];
      style = MOODS.worried.style;
      break;
    case 'wow':
      syl = [{ t0: 0, t1: 0.4, vowel: 'au', onset: 'none', stress: true, pitch: b * 1.05, glide: 0.32, amp: 1 }];
      style = { ...MOODS.happy.style, gain: MOODS.happy.style.gain * 0.5 };
      break;
    default:
      syl = [{ t0: 0, t1: 0.34, vowel: 'u', onset: 'nasal', stress: true, pitch: b * 0.95, glide: 0.16, amp: 0.8 }];
      style = MOODS.neutral.style;
      break;
  }
  return speak(g, t, syl, style, { prio: 2 });
}
