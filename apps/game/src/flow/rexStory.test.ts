import { afterEach, describe, expect, it } from 'vitest';
import { bus, type BusEvents } from '../state/bus';
import { RexStory, storyLineSeconds, type StoryHost } from './rexStory';

const LINES = ['Schau, es bleibt bei uns.', 'Die Erde ist zerbrochen.', 'Jeder Stein heilt ein Stück.'];

function host(visible = { value: false }) {
  const said: string[] = [];
  const ended: Array<{ id: string; completed: boolean }> = [];
  const h: StoryHost = {
    say: (line) => said.push(line),
    rexVisible: () => visible.value,
    end: (id, completed) => ended.push({ id, completed }),
  };
  return { h, said, ended, visible };
}

/** Advances the scene clock in 1/60-s frames. */
function run(story: RexStory, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) story.update(1 / 60);
}

const events: Array<BusEvents['flow/story']> = [];
const onStory = (e: BusEvents['flow/story']) => events.push(e);
bus.on('flow/story', onStory);
afterEach(() => {
  events.length = 0;
});

describe('RexStory', () => {
  it('waits for REX (at most 1.2 s), then runs through its lines on its own', () => {
    const { h, said, ended, visible } = host();
    const story = new RexStory(h);
    story.start('afterLevel1', LINES);
    expect(story.active).toBe(true);
    run(story, 0.5);
    expect(said).toEqual([]);
    visible.value = true;
    story.update(1 / 60);
    expect(said).toEqual([LINES[0]]);
    run(story, storyLineSeconds(LINES[0]!) + 0.05);
    expect(said).toEqual(LINES.slice(0, 2));
    run(story, storyLineSeconds(LINES[1]!) + storyLineSeconds(LINES[2]!) + 0.1);
    expect(said).toEqual(LINES);
    expect(ended).toEqual([{ id: 'afterLevel1', completed: true }]);
    expect(story.active).toBe(false);
    expect(events.map((e) => e.state)).toEqual(['start', 'line', 'line', 'line', 'end']);
  });

  it('starts without REX after the longest wait', () => {
    const { h, said } = host();
    const story = new RexStory(h);
    story.start('afterLevel1', LINES);
    run(story, 1.25);
    expect(said).toEqual([LINES[0]]);
  });

  it('turns the page on a tap and ends after the last line', () => {
    const { h, said, ended } = host({ value: true });
    const story = new RexStory(h);
    expect(story.tap()).toBe(false);
    story.start('afterLevel1', LINES);
    expect(story.tap()).toBe(true);
    expect(said).toEqual([LINES[0]]);
    expect(story.lineIndex).toBe(0);
    story.tap();
    story.tap();
    expect(said).toEqual(LINES);
    expect(story.active).toBe(true);
    story.tap();
    expect(story.active).toBe(false);
    expect(ended).toEqual([{ id: 'afterLevel1', completed: true }]);
    expect(story.tap()).toBe(false);
  });

  it('keeps each line at least 2.4 s and longer lines longer', () => {
    expect(storyLineSeconds('Ja.')).toBe(2.4);
    expect(storyLineSeconds('x'.repeat(40))).toBeCloseTo(3.9);
  });

  it('can be finished early (counts as ended, not completed)', () => {
    const { h, ended } = host({ value: true });
    const story = new RexStory(h);
    story.start('afterLevel1', LINES);
    story.update(0.1);
    story.finishNow();
    expect(ended).toEqual([{ id: 'afterLevel1', completed: false }]);
    expect(story.active).toBe(false);
    expect(events.at(-1)).toEqual({ id: 'afterLevel1', state: 'end' });
  });

  it('ends right away without lines', () => {
    const { h, ended } = host();
    const story = new RexStory(h);
    story.start('empty', ['  ']);
    expect(story.active).toBe(false);
    expect(ended).toEqual([{ id: 'empty', completed: true }]);
  });
});
