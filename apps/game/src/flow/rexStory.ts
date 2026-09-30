import { bus } from '../state/bus';

/**
 * REX erzählt eine kleine Szene auf der Map (Iteration 4, Punkt 3: nach Level 1 „erklärt REX die Situation“).
 * Reine Ablaufsteuerung auf der Szenenuhr (FlowScene ruft `update(dt)`), ohne three.js:
 *
 * 1. `start(id, lines)` — wartet, bis REX oben ist (Mund sichtbar), höchstens `maxWait` s;
 * 2. jede Zeile bleibt `storyLineSeconds(line)` s stehen, ein Tipp blättert sofort weiter;
 * 3. nach der letzten Zeile (oder `finishNow`) meldet `host.end` das Ende.
 *
 * Auf dem Bus: `flow/story` mit `start`, jeder `line` und `end`.
 */
export interface StoryHost {
  /** Zeile zeigen (Web-Box, natives RexLine; REX spricht sie). */
  say(line: string, index: number): void;
  /** REX ist oben und sichtbar. */
  rexVisible(): boolean;
  /** Ende der Szene; `completed` = bis zur letzten Zeile gelaufen (sonst abgebrochen). */
  end(id: string, completed: boolean): void;
}

/** Standzeit einer Zeile: mindestens 2,4 s, sonst 0,9 s + 0,075 s je Zeichen. */
export function storyLineSeconds(line: string): number {
  return Math.max(2.4, 0.9 + 0.075 * line.length);
}

export class RexStory {
  private id: string | null = null;
  private lines: string[] = [];
  private index = -1;
  private clock = 0;
  private waiting = false;

  constructor(
    private readonly host: StoryHost,
    /** Längstes Warten auf REX, bevor die erste Zeile trotzdem kommt. */
    private readonly maxWait = 1.2,
  ) {}

  get active(): boolean {
    return this.id !== null;
  }

  /** Laufende Szene (oder null). */
  get storyId(): string | null {
    return this.id;
  }

  /** Index der gezeigten Zeile (−1 = wartet noch auf REX). */
  get lineIndex(): number {
    return this.index;
  }

  start(id: string, lines: readonly string[]): void {
    if (this.id) this.finish(false);
    const clean = lines.filter((l) => l.trim().length > 0);
    if (clean.length === 0) {
      this.host.end(id, true);
      return;
    }
    this.id = id;
    this.lines = [...clean];
    this.index = -1;
    this.clock = 0;
    this.waiting = true;
    bus.emit('flow/story', { id, state: 'start' });
  }

  update(dt: number): void {
    if (!this.id) return;
    this.clock += Math.max(0, dt);
    if (this.waiting) {
      if (this.host.rexVisible() || this.clock >= this.maxWait) this.show(0);
      return;
    }
    if (this.clock >= storyLineSeconds(this.lines[this.index] ?? '')) this.advance();
  }

  /** Ein Tipp: nächste Zeile (bzw. die erste sofort). `false`, wenn keine Szene läuft (der Tipp gehört dann der Karte). */
  tap(): boolean {
    if (!this.id) return false;
    if (this.waiting) this.show(0);
    else this.advance();
    return true;
  }

  /** Sofort beenden (Level-Start, Sprung auf die Map, Abbau): zählt als gesehen. */
  finishNow(): void {
    if (this.id) this.finish(false);
  }

  private show(i: number): void {
    const line = this.lines[i];
    if (line === undefined || !this.id) return;
    this.waiting = false;
    this.index = i;
    this.clock = 0;
    this.host.say(line, i);
    bus.emit('flow/story', { id: this.id, state: 'line', line: i });
  }

  private advance(): void {
    if (this.index + 1 < this.lines.length) this.show(this.index + 1);
    else this.finish(true);
  }

  private finish(completed: boolean): void {
    const id = this.id;
    if (!id) return;
    this.id = null;
    this.lines = [];
    this.index = -1;
    this.waiting = false;
    this.host.end(id, completed);
    bus.emit('flow/story', { id, state: 'end' });
  }
}
