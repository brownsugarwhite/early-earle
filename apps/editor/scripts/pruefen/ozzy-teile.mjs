// Gemeinsame Teile für Proben und Messungen an Ozzy (17.11.2026, Plan „Ozzy stabil und schnell“): Testbrowser mit Grafikkarte, eine
// Seite, die Haken von `window.__ozzy`, Warten auf Ruhe, Klicken und Ziehen wie von Hand („erst zeigen, dann drücken“). Dazu Flicken:
// Ein Versuch kann ein ausgeliefertes Modul für diesen einen Lauf ändern (Suchen und Ersetzen im Text, den der Server schickt), ohne
// dass eine Datei im Arbeitsbaum angefasst wird. So lässt sich vorher und nachher messen, während Florians Fenster bleibt, wie es ist.
import { chromium } from '@playwright/test';

export const BASIS = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
export const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

/**
 * Flicken für eine Seite anlegen (vor dem Laden): { '<Muster der Adresse des Moduls>': [[suchen, ersetzen], …] }. Ohne Angabe gilt die
 * Umgebungsvariable FLICKEN (JSON). Passt ein Flicken nicht auf den Text, den der Server schickt, steht das in `fehler`.
 */
export async function flickenAnlegen(s, flicken = process.env.FLICKEN ? JSON.parse(process.env.FLICKEN) : {}, fehler = []) {
  for (const [muster, liste] of Object.entries(flicken)) {
    await s.route(muster, async (route) => {
      const r = await route.fetch();
      let t = await r.text();
      for (const [suchen, ersetzen] of liste) {
        if (!t.includes(suchen)) fehler.push(`Flicken passt nicht (${muster}): ${suchen.slice(0, 60)}`);
        t = t.split(suchen).join(ersetzen);
      }
      await route.fulfill({ response: r, body: t });
    });
  }
}

/**
 * Eine Seite öffnen. `form`: gesicherte Form laden; `dichte`: Pixeldichte; `extra`: weitere Schalter der Adresse;
 * `flicken`: { '<Muster der Adresse des Moduls>': [[suchen, ersetzen], …] } für diesen Lauf (auch für Module, die der Hintergrund
 * lädt). Ohne Angabe gilt die Umgebungsvariable FLICKEN (JSON): So läuft jede Probe unverändert gegen eine geflickte Fassung.
 */
export async function auf({ form = '', dichte = 2, b = 1440, h = 900, extra = '', flicken = process.env.FLICKEN ? JSON.parse(process.env.FLICKEN) : {} } = {}) {
  const browser = await chromium.launch({ args: GPU_ARGS });
  const s = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: dichte });
  const fehler = [];
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await flickenAnlegen(s, flicken, fehler);
  const q = [form ? `form=${encodeURIComponent(form)}` : '', extra].filter(Boolean).join('&');
  await s.goto(`${BASIS}${q ? `?${q}` : ''}`);
  await s.waitForFunction(() => !!window.__ozzy);
  const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
  /** das Werk rechnet nicht mehr, kein Griff wartet */
  const ruhig = async (t = 90000) => {
    await s.waitForTimeout(300);
    await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: t });
    await s.waitForTimeout(250);
  };
  /** die Haut des Werks ist zu sehen und steht */
  const geladen = async () => {
    await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
    await ruhig();
  };
  const klick = async (x, y, o = {}) => {
    await s.mouse.move(x, y, { steps: 3 });
    await s.waitForTimeout(o.vor ?? 300);
    await s.mouse.down();
    await s.waitForTimeout(60);
    await s.mouse.up();
    await s.waitForTimeout(o.nach ?? 250);
  };
  const ziehen = async (x0, y0, x1, y1, o = {}) => {
    await s.mouse.move(x0, y0, { steps: 3 });
    await s.waitForTimeout(o.vor ?? 300);
    await s.mouse.down();
    const n = o.schritte ?? 12;
    for (let k = 1; k <= n; k++) {
      await s.mouse.move(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
      await s.waitForTimeout(o.takt ?? 25);
    }
    await s.waitForTimeout(60);
    await s.mouse.up();
    await s.waitForTimeout(o.nach ?? 250);
  };
  return { browser, s, O, ruhig, geladen, klick, ziehen, fehler };
}

/**
 * In der Seite: `n` Bilder hintereinander rechnen und nach jedem einen Bildpunkt beider Zeichenflächen zurücklesen (das wartet, bis die
 * Grafikkarte fertig ist). Zurück: Median der Zeit von `bild()` allein (Prozessor) und samt Warten (ms). Das Zurücklesen selbst kostet
 * rund 1 bis 2 ms: Die Zahlen sind obere Grenzen, die Unterschiede zwischen Fassungen stimmen.
 */
export const mitKarte = (s, n = 40) =>
  s.evaluate(async (N) => {
    const o = window.__ozzy;
    o.film(true);
    await new Promise((r) => setTimeout(r, 120));
    const gh = document.getElementById('haut').getContext('webgl2');
    const gl = document.getElementById('linien').getContext('webgl2');
    const px = new Uint8Array(4);
    const warten = () => {
      gh.bindFramebuffer(gh.FRAMEBUFFER, null);
      gh.readPixels(0, 0, 1, 1, gh.RGBA, gh.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    };
    for (let i = 0; i < 8; i++) {
      o.bild(1 / 60);
      warten();
    }
    const rechnen = [];
    const gesamt = [];
    for (let i = 0; i < N; i++) {
      const t0 = performance.now();
      o.bild(1 / 60);
      const t1 = performance.now();
      warten();
      rechnen.push(t1 - t0);
      gesamt.push(performance.now() - t0);
    }
    const med = (A) => [...A].sort((a, b) => a - b)[Math.floor(A.length / 2)];
    o.film(false);
    return { rechnen: med(rechnen), gesamt: med(gesamt) };
  }, n);

export const z1 = (x) => (Number.isFinite(x) ? x.toFixed(1).replace('.', ',') : '–');
export const quantil = (A, p) => {
  const B = [...A].sort((a, b) => a - b);
  return B.length ? B[Math.min(B.length - 1, Math.floor(p * B.length))] : NaN;
};
