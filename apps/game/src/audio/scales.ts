/**
 * Musical material per story zone. Every zone plays on one anhemitonic pentatonic (no half steps), so merge
 * notes, stingers and the generative music can overlap freely without ever clashing; the chords are stacks
 * of the same five pitch classes (open, quartal, Earle-calm). The merge chain climbs the pentatonic from
 * the zone root: tier 2 = root, tier 7 (128) = root an octave up, tier 12 = two octaves up.
 */

export type ZoneKey = 'tjorizo' | 'syrup' | 'luzz' | 'wooding';
export const ZONE_KEYS: readonly ZoneKey[] = ['tjorizo', 'syrup', 'luzz', 'wooding'];

export type LeadInstrument = 'marimba' | 'vibes' | 'celesta' | 'kalimba';

export interface ZoneMusic {
  label: string;
  /** MIDI note of the tonal centre (chords and melodies gravitate here). */
  root: number;
  /** MIDI note where the merge chain starts (a member of the set, ≈ 220–350 Hz). */
  chainRoot: number;
  /** Pitch-class offsets of the pentatonic (semitones from the root). */
  set: readonly number[];
  bpm: number;
  lead: LeadInstrument;
  /** Chords as MIDI notes (all inside the zone's pitch set); the progression cycles. */
  chords: readonly (readonly number[])[];
  /** Mood words for the lab. */
  mood: string;
}

export const ZONE_MUSIC: Readonly<Record<ZoneKey, ZoneMusic>> = {
  // D Ritsusen (D E G A B): pastoral, hopeful, open — the rust valley that starts to breathe again.
  tjorizo: {
    label: 'Tjorizo',
    root: 62,
    chainRoot: 62,
    set: [0, 2, 5, 7, 9],
    bpm: 72,
    lead: 'marimba',
    chords: [
      [50, 57, 64, 69], // D A E A
      [43, 50, 59, 64], // G D B E (G6)
      [52, 59, 62, 67], // E B D G (Em7)
      [45, 52, 62, 64], // A E D E (Asus4)
    ],
    mood: 'D-Ritsusen · Marimba · 72 BPM',
  },
  // F major pentatonic (F G A C D): warm, sweet, viscous — amber syrup, slow vibes with tremolo.
  syrup: {
    label: 'Syrup',
    root: 65,
    chainRoot: 65,
    set: [0, 2, 4, 7, 9],
    bpm: 64,
    lead: 'vibes',
    chords: [
      [41, 53, 57, 62], // F F A D (F6)
      [50, 57, 60, 65], // D A C F (Dm7)
      [48, 55, 62, 69], // C G D A (Csus2/9)
      [43, 50, 57, 60], // G D A C (G9sus)
    ],
    mood: 'F-Dur-Pentatonik · Vibes · 64 BPM',
  },
  // A minor pentatonic (A C D E G): misty, calm, a little mysterious — glowing fog, celesta and breath.
  luzz: {
    label: 'Luzz',
    root: 57,
    chainRoot: 57,
    set: [0, 3, 5, 7, 10],
    bpm: 56,
    lead: 'celesta',
    chords: [
      [45, 52, 55, 60], // A E G C (Am7)
      [48, 55, 62, 64], // C G D E (Cadd9)
      [50, 57, 60, 67], // D A C G (Dm7sus4)
      [52, 57, 62, 67], // E A D G (quartal)
    ],
    mood: 'A-Moll-Pentatonik · Celesta · 56 BPM',
  },
  // G "Egyptian" pentatonic (G A C D F): folk, earthy, woody — the forest grows back, kalimba and marimba.
  wooding: {
    label: 'Wooding',
    root: 55,
    chainRoot: 62,
    set: [0, 2, 5, 7, 10],
    bpm: 80,
    lead: 'kalimba',
    chords: [
      [43, 50, 57, 60], // G D A C (Gsus)
      [41, 48, 55, 57], // F C G A (Fadd9)
      [48, 55, 62, 65], // C G D F (Csus/9)
      [50, 57, 60, 65], // D A C F (Dm7)
    ],
    mood: 'G-Pentatonik (ägyptisch) · Kalimba · 80 BPM',
  },
};

export function isZoneKey(z: unknown): z is ZoneKey {
  return z === 'tjorizo' || z === 'syrup' || z === 'luzz' || z === 'wooding';
}

export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** True when the MIDI note's pitch class belongs to the zone's pentatonic. */
export function inSet(zone: ZoneKey, midi: number): boolean {
  const m = ZONE_MUSIC[zone];
  const pc = (((midi - m.root) % 12) + 12) % 12;
  return m.set.includes(pc);
}

/** All MIDI notes of the zone's set in [lo, hi] (ascending). */
export function setNotes(zone: ZoneKey, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let n = Math.ceil(lo); n <= hi; n++) if (inSet(zone, n)) out.push(n);
  return out;
}

/** MIDI note `deg` pentatonic steps above (or below, negative) a set member `from`. */
export function stepFrom(zone: ZoneKey, from: number, deg: number): number {
  let n = from;
  let k = deg;
  while (k > 0) {
    n++;
    if (inSet(zone, n)) k--;
  }
  while (k < 0) {
    n--;
    if (inSet(zone, n)) k++;
  }
  return n;
}

/** MIDI note of pentatonic degree `deg` counted from the tonal root (0 = root, 5 = root + octave). */
export function degreeNote(zone: ZoneKey, deg: number): number {
  return stepFrom(zone, ZONE_MUSIC[zone].root, deg);
}

/** The merge chain as a scale: tier 2 = chain root, each tier one pentatonic step higher (tier 1 one below). */
export function chainNote(zone: ZoneKey, tier: number): number {
  return stepFrom(zone, ZONE_MUSIC[zone].chainRoot, Math.max(-2, Math.min(14, Math.round(tier) - 2)));
}

/** Nearest pitch of the zone's set to a MIDI note (snaps free melodies into the key). */
export function snapToSet(zone: ZoneKey, midi: number): number {
  const m = ZONE_MUSIC[zone];
  let best = midi;
  let bestD = Infinity;
  for (let o = -1; o <= 1; o++) {
    for (const pc of m.set) {
      const base = m.root + pc + 12 * (Math.round((midi - m.root) / 12) + o);
      const d = Math.abs(base - midi);
      if (d < bestD) {
        bestD = d;
        best = base;
      }
    }
  }
  return best;
}
