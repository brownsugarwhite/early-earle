import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { APP_ORIGINS, contentApi } from './contentApi';

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/** Mounts the plugin on a fake dev server and returns its `/__content` handler (read-only calls only). */
function mount(): Handler {
  let handler: Handler | null = null;
  const plugin = contentApi({ contentDir: fileURLToPath(new URL('../../../content', import.meta.url)) });
  const server = { middlewares: { use: (_path: string, h: Handler) => (handler = h) } } as unknown as ViteDevServer;
  (plugin.configureServer as (s: ViteDevServer) => void)(server);
  return handler!;
}

async function call(h: Handler, method: string, url: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const req = Object.assign(Readable.from([]), { method, url }) as unknown as IncomingMessage;
  let status = 0;
  let text = '';
  const res = {
    set statusCode(v: number) {
      status = v;
    },
    get statusCode() {
      return status;
    },
    setHeader: () => undefined,
    end: (t?: string) => {
      text = t ?? '';
    },
  } as unknown as ServerResponse;
  await h(req, res);
  return { status, body: text ? (JSON.parse(text) as Record<string, unknown>) : {} };
}

describe('contentApi (Dev-Endpunkt der Editoren)', () => {
  it('lets the iOS app (capacitor://localhost) through CORS, next to Vite’s localhost default', () => {
    const cfg = (contentApi({ contentDir: '/tmp' }).config as (c: object) => { server: { cors: { origin: unknown[] } } } | undefined)({});
    const origins = cfg!.server.cors.origin;
    expect(origins).toContain('capacitor://localhost');
    expect(origins.some((o) => o instanceof RegExp && o.test('http://localhost:5173'))).toBe(true);
    expect(origins.some((o) => o instanceof RegExp && o.test('https://evil.example'))).toBe(false);
    expect(APP_ORIGINS).not.toContain('*');
    // An explicit cors setting in vite.config wins.
    expect((contentApi({ contentDir: '/tmp' }).config as (c: object) => unknown)({ server: { cors: false } })).toBeUndefined();
  });

  it('answers the Werkstatt ping and lists nested world files', async () => {
    const h = mount();
    const ping = await call(h, 'GET', '/');
    expect(ping.status).toBe(200);
    expect(ping.body).toMatchObject({ ok: true, app: 'early-earle' });
    expect(ping.body.dirs).toContain('zones/worlds');
    const worlds = await call(h, 'GET', '/zones/worlds');
    expect(worlds.status).toBe(200);
    expect(worlds.body.files).toContain('01.json');
    const zones = await call(h, 'GET', '/zones');
    expect(zones.body.files).toContain('tjorizo.json');
    expect(zones.body.files).not.toContain('worlds');
  });

  it('serves the Wesen-Werkstatt folders; an allowed folder that does not exist yet is an empty list', async () => {
    const h = mount();
    const ping = await call(h, 'GET', '/');
    expect(ping.body.dirs).toEqual(expect.arrayContaining(['creatures', 'creatures/vorlagen']));
    const vorlagen = await call(h, 'GET', '/creatures/vorlagen');
    expect(vorlagen.status).toBe(200);
    expect(Array.isArray(vorlagen.body.files)).toBe(true);
    const creatures = await call(h, 'GET', '/creatures');
    expect(creatures.status).toBe(200);
    expect(creatures.body.files).not.toContain('README.md');
    expect((await call(h, 'GET', '/creatures/vorlagen/..%2F..%2Fpackage.json')).status).toBe(400);
  });

  it('refuses unknown directories, traversal and bad file names', async () => {
    const h = mount();
    expect((await call(h, 'GET', '/secrets')).status).toBe(400);
    expect((await call(h, 'GET', '/zones/secret/01.json')).status).toBe(400);
    expect((await call(h, 'GET', '/levels/..%2F..%2Fpackage.json')).status).toBe(400);
    expect((await call(h, 'GET', '/levels/no-such-level.json')).status).toBe(404);
    expect((await call(h, 'OPTIONS', '/levels/001.json')).status).toBe(204);
  });
});
