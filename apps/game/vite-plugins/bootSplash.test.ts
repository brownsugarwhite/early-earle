import { describe, expect, it } from 'vitest';
import { bootSplash } from './bootSplash';
import { bootInline } from '../src/boot/bootInline';

const HTML = '<!doctype html><html><head><title>t</title></head><body>\n<div id="root"></div></body></html>';

function transform(html: string): string {
  const plugin = bootSplash();
  const hook = plugin.transformIndexHtml as { handler: (html: string) => string };
  return hook.handler(html);
}

describe('bootSplash (index.html)', () => {
  it('setzt Markup vor #root, CSS in den Kopf und genau ein Inline-Skript', () => {
    const out = transform(HTML);
    expect(out).toContain('<style id="ee-splash-css">');
    expect(out.indexOf('id="ee-splash"')).toBeLessThan(out.indexOf('id="root"'));
    expect(out).toContain('data-testid="splash"');
    expect(out).toContain('data-progress="0"');
    expect((out.match(/<script>/g) ?? []).length).toBe(1);
    // erstes Bild ohne Skript: Stamm-Streifen und Schatten sind schon im Markup
    expect(out).toMatch(/id="ee-sh-stem" d="M[^"]+"/);
    expect(out).toMatch(/id="ee-sh-label" d="M[^"]+"/);
    expect(out).toContain('scaleY(0.04)');
    // idempotent
    expect(transform(out)).toBe(out);
  });

  it('das Inline-Skript ist in sich geschlossen und läuft ohne #ee-splash leer durch', () => {
    const out = transform(HTML);
    const script = out.slice(out.indexOf('<script>') + 8, out.indexOf('</script>'));
    expect(script.length).toBeGreaterThan(500);
    // Größe: Code (minifiziert) klein, Daten (Glyphenringe) überschaubar, ganzes Markup unter 40 KB
    const code = script.slice(0, script.lastIndexOf('})(') + 2);
    console.info(`[bootSplash] HTML-Zuwachs ${out.length - HTML.length} B, Skript ${script.length} B (Code ${code.length} B)`);
    expect(code.length).toBeLessThan(4500);
    expect(out.length - HTML.length).toBeLessThan(40000);
    // eigene Globale: kein Element → nichts passiert, kein ReferenceError
    const fakeWindow = {} as Record<string, unknown>;
    const run = new Function('window', 'document', 'localStorage', 'location', 'requestAnimationFrame', 'getComputedStyle', 'performance', script);
    expect(() => run(fakeWindow, { getElementById: () => null }, { getItem: () => null }, { search: '' }, () => 0, () => ({}), { now: () => 0 })).not.toThrow();
    // auch der Quelltext der Funktion allein
    const fn = new Function(`return (${bootInline.toString()})`)();
    expect(typeof fn).toBe('function');
  });
});
