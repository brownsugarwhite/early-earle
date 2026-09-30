import { defaultAllowedOrigins, type Plugin, type ViteDevServer } from 'vite';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatJson } from '../../../tools/levels/format.ts';

/**
 * Dev-Only-Endpunkt für die In-App-Editoren (Browser auf dem Mac, Safari auf dem iPhone, die iOS-App):
 *   GET  /__content                   → Ping { ok, app, host, dirs } (Verbindungstest der Werkstatt)
 *   GET  /__content/<dir>             → Liste der JSON-Dateien
 *   GET  /__content/<dir>/<file>.json → Datei
 *   PUT  /__content/<dir>/<file>.json → validieren, atomar schreiben (tmp + rename)
 *   DELETE /__content/<dir>/_<file>.json → nur Dateien mit Unterstrich-Präfix (Entwürfe, Testdateien)
 * `<dir>` darf ein erlaubtes Unterverzeichnis sein (z. B. `zones/worlds`). Pfade sind auf content/<dir> begrenzt;
 * Validatoren pro Verzeichnis sind steckbar.
 *
 * Die iOS-App lädt von `capacitor://localhost` und spricht den Mac im WLAN an (HTTP, Port 5174): Vites
 * CORS-Middleware läuft vor den Plugin-Middlewares, deshalb erweitert `config()` deren Origin-Liste um genau die
 * App-Origins (plus Vites Standard: localhost). Andere Websites bekommen weiterhin kein CORS — ein fremder Tab im
 * WLAN kann nicht in content/ schreiben.
 */
export interface ContentApiOptions {
  contentDir: string;
  validators?: Record<string, (json: unknown) => { ok: true } | { ok: false; issues: unknown }>;
  allowedDirs?: string[];
}

const DEFAULT_DIRS = ['zones', 'zones/worlds', 'levels', 'genome', 'rex'];

/** Origins of the Capacitor shells (iOS: capacitor://localhost; Android: http(s)://localhost without a port). */
export const APP_ORIGINS = ['capacitor://localhost', 'ionic://localhost', 'https://localhost', 'http://localhost'];

export function contentApi(opts: ContentApiOptions): Plugin {
  const allowed = new Set(opts.allowedDirs ?? DEFAULT_DIRS);
  const root = path.resolve(opts.contentDir);

  function resolveSafe(dir: string, file?: string): string | null {
    if (!allowed.has(dir)) return null;
    if (file !== undefined && !/^[a-zA-Z0-9_.-]+\.json$/.test(file)) return null;
    const p = path.resolve(root, dir, file ?? '');
    if (!p.startsWith(root + path.sep)) return null;
    return p;
  }

  async function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    return Buffer.concat(chunks).toString('utf8');
  }

  return {
    name: 'ee-content-api',
    apply: 'serve',
    config(userConfig) {
      // Respect an explicit cors setting in vite.config; otherwise: Vite's default origins + the app origins.
      if (userConfig.server?.cors !== undefined) return;
      return { server: { cors: { origin: [defaultAllowedOrigins, ...APP_ORIGINS] } } };
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__content', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        try {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            return res.end();
          }
          const url = new URL(req.url ?? '/', 'http://localhost');
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length === 0) {
            if (req.method !== 'GET') return send(405, { error: 'Methode nicht erlaubt' });
            return send(200, { ok: true, app: 'early-earle', host: os.hostname().replace(/\.local$/, ''), dirs: [...allowed] });
          }
          // Last segment ending in .json is the file, the rest the (possibly nested) directory.
          const last = parts[parts.length - 1]!;
          const hasFile = last.endsWith('.json');
          const dir = (hasFile ? parts.slice(0, -1) : parts).join('/');
          const file = hasFile ? last : undefined;
          if (!dir) return send(400, { error: 'dir fehlt' });
          const target = resolveSafe(dir, file);
          if (!target) return send(400, { error: 'ungültiger Pfad' });

          if (req.method === 'GET' && !file) {
            const names = (await fs.readdir(target)).filter((n) => n.endsWith('.json')).sort();
            return send(200, { dir, files: names });
          }
          if (req.method === 'GET' && file) {
            const txt = await fs.readFile(target, 'utf8');
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            return res.end(txt);
          }
          if (req.method === 'PUT' && file) {
            const raw = await readBody(req);
            let json: unknown;
            try {
              json = JSON.parse(raw);
            } catch (e) {
              return send(400, { error: 'kein gültiges JSON', detail: String(e) });
            }
            if (typeof json !== 'object' || json === null || !('schemaVersion' in json)) {
              return send(400, { error: 'schemaVersion fehlt' });
            }
            const validate = opts.validators?.[dir];
            if (validate) {
              const r = validate(json);
              if (!r.ok) return send(400, { error: 'Validierung fehlgeschlagen', issues: r.issues });
            }
            // Level-Dateien mit dem stabilen Formatierer der Werkzeuge schreiben (kompakte Koordinaten, saubere Diffs)
            const pretty = (dir === 'levels' ? formatJson(json) : JSON.stringify(json, null, 2)) + '\n';
            // One tmp file per request: two PUTs of the same file at once must not rename each other's tmp away.
            const tmp = `${target}.tmp-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(tmp, pretty, 'utf8');
            await fs.rename(tmp, target);
            return send(200, { ok: true, path: path.relative(root, target) });
          }
          if (req.method === 'DELETE' && file) {
            if (!file.startsWith('_')) return send(403, { error: 'nur _-Dateien löschbar' });
            await fs.unlink(target);
            return send(200, { ok: true });
          }
          return send(405, { error: 'Methode nicht erlaubt' });
        } catch (e) {
          const err = e as NodeJS.ErrnoException;
          if (err.code === 'ENOENT') return send(404, { error: 'nicht gefunden' });
          return send(500, { error: String(e) });
        }
      });
    },
  };
}
