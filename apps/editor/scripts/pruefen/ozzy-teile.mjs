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

/**
 * Eine frische Kugel mit drei Linien (18.11., Proben zum Spiegel): ein Kreis auf dem Blatt (Halbmesser 150), aufgeblasen, mit der
 * Linie der Mitte (die Seite muss mit `extra: 'ohneLinie=0'` geöffnet sein); dann in der Seite zwei Striche mit P quer über die Form
 * (zwei Ringe, wie im Prüffenster). Zurück im Raum, bei den Punkten (A). `t`: was `auf` zurückgibt.
 */
export async function kugelMitRingen(t) {
  const { s, O, geladen, ruhig, klick } = t;
  const [cx, cy, R, k] = [720, 450, 150, 0.5523 * 150];
  await O('form', [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await geladen();
  await s.keyboard.press('1');
  await s.waitForTimeout(1600);
  await ruhig();
  for (const [A, B] of [
    [
      [-250, 0],
      [250, 0],
    ],
    [
      [10, -250],
      [10, 250],
    ],
  ]) {
    await s.keyboard.press('p');
    const a = await O('flaecheHin', 'seite', A[0], A[1]);
    const b = await O('flaecheHin', 'seite', B[0], B[1]);
    await klick(a.x, a.y);
    await klick(b.x, b.y);
    await s.keyboard.press('Enter');
    await ruhig();
    await s.keyboard.press('a');
    await s.waitForTimeout(200);
  }
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await ruhig();
}

/**
 * Einen Punkt des Werks (Loop-Kennung, Nummer) im Raum an der Wand des Tops ziehen, bis er im Werk bei z = `zielZ` liegt (x bleibt).
 * `halten`: nach dem Weg so lange gedrückt bleiben (ms). Zurück: ob er zu greifen war.
 */
export async function punktAnDerWandZiehen(t, p, zielZ, { loslassen = true, halten = 600 } = {}) {
  const { s, O } = t;
  const a = (await O('ankerImBild', p.id, p.i, 'top')).filter((x) => !x.m && x.sichtbar)[0];
  const ziel = await O('flaecheHin', 'top', p.x, zielZ);
  if (!a || !ziel) return false;
  await s.mouse.move(a.x, a.y, { steps: 3 });
  await s.waitForTimeout(400);
  await s.mouse.down();
  const N = 40;
  for (let k = 1; k <= N; k++) {
    await s.mouse.move(a.x + ((ziel.x - a.x) * k) / N, a.y + ((ziel.y - a.y) * k) / N);
    await s.waitForTimeout(20);
  }
  await s.waitForTimeout(halten);
  if (loslassen) await s.mouse.up();
  return true;
}

/** der sichtbare Punkt einer Linie neben der Mitte, der am weitesten von ihr liegt, auf der Seite `seite` (+1: z > 0); aus `werkLinienDaten` */
export async function seitenPunkt(t, seite = 0) {
  let p = null;
  for (const l of await t.O('werkLinienDaten')) {
    if (l.art === 'mitte') continue;
    for (const q of l.punkte) if (q.sichtbar && (seite === 0 || Math.sign(q.z) === seite) && (!p || Math.abs(q.z) > Math.abs(p.z))) p = { ...q, id: l.id };
  }
  return p;
}

/**
 * Der sichtbare Punkt einer Linie neben der Mitte, der am weitesten von ihr liegt, und ein Zug an ihm an der Wand des Tops bis
 * `tief` hinter die Mitte (im Raum). Zurück: der Punkt.
 */
export async function ueberDieMitteZiehen(t, tief = 40, wie = {}) {
  const p = await seitenPunkt(t);
  if (!p || !(await punktAnDerWandZiehen(t, p, -Math.sign(p.z) * tief, wie))) return null;
  return p;
}

export const z1 = (x) => (Number.isFinite(x) ? x.toFixed(1).replace('.', ',') : '–');
export const quantil = (A, p) => {
  const B = [...A].sort((a, b) => a - b);
  return B.length ? B[Math.min(B.length - 1, Math.floor(p * B.length))] : NaN;
};
