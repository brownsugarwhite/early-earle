import type { Plugin, ViteDevServer } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { formatJson } from '../../../tools/levels/format.ts';

/**
 * Dev-Only-Endpunkt für die In-App-Editoren (auch vom Handy):
 *   GET  /__content/<dir>            → Liste der JSON-Dateien
 *   GET  /__content/<dir>/<file>.json → Datei
 *   PUT  /__content/<dir>/<file>.json → validieren, atomar schreiben (tmp + rename)
 *   DELETE /__content/<dir>/_<file>.json → nur Dateien mit Unterstrich-Präfix (Entwürfe, Testdateien)
 * Pfade sind auf content/<dir> begrenzt; Validatoren pro Verzeichnis sind steckbar.
 */
export interface ContentApiOptions {
  contentDir: string;
  validators?: Record<string, (json: unknown) => { ok: true } | { ok: false; issues: unknown }>;
  allowedDirs?: string[];
}

const DEFAULT_DIRS = ['zones', 'levels', 'genome', 'rex'];

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
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__content', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        try {
          const url = new URL(req.url ?? '/', 'http://localhost');
          const parts = url.pathname.split('/').filter(Boolean);
          const [dir, file] = parts;
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
            const tmp = target + '.tmp-' + process.pid;
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
