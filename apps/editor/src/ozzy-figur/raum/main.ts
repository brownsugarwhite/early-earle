// Ozzy im Raum (Beweis 3D, Plan docs/plans/2026-11-19-ozzy-figur-3d.md): Seite ozzy-raum.html. Ozzy steht, Körper und Kopf drehen
// sich von 0° bis 360°; an den Schlüsselwinkeln liegt Florians Zeichnung auf Wunsch rot darüber. Prüfhaken window.__ozzyRaum.
import backSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_back.svg?raw';
import frontSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_front.svg?raw';
import lieg1Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown01.svg?raw';
import lieg2Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown02.svg?raw';
import logoSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand01_logo.svg?raw';
import profilSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand02.svg?raw';
import sitz1Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_sit01.svg?raw';
import sitz2Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_st02.svg?raw';
import viertelSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_viertel.svg?raw';
import { abflachen, verschieben } from '../form';
import { koerperUrsprung } from '../raster';
import { ANSICHTEN, type AnsichtName, importieren } from '../vorlagen/import';
import type { Bau } from './bau';
import { type Rahmen, RaumZeichner } from './zeichner';

const TEXTE: Record<string, string> = {
  'ozzy_front.svg': frontSvg,
  'ozzy_back.svg': backSvg,
  'ozzy_stand01_logo.svg': logoSvg,
  'ozzy_stand02.svg': profilSvg,
  'ozzy_laydown01.svg': lieg1Svg,
  'ozzy_laydown02.svg': lieg2Svg,
  'ozzy_viertel.svg': viertelSvg,
  'ozzy_sit01.svg': sitz1Svg,
  'ozzy_st02.svg': sitz2Svg,
};
const daten = importieren(TEXTE);

/** Florians Zeichnung zu einem Winkel (Körperkoordinaten wie das Bild; 270° ist die Seite gespiegelt) */
const VORLAGE_BEI: [number, AnsichtName, boolean][] = [
  [0, 'front', false],
  [45, 'viertel', false],
  [90, 'profil', false],
  [180, 'back', false],
  [270, 'profil', true],
];

const adresse = new URLSearchParams(location.search);
const zustand = { psi: Number(adresse.get('psi') ?? 30), laeuft: false, vorlage: adresse.get('vorlage') === '1', tempo: 45 };
const figur = document.getElementById('figur') as HTMLCanvasElement;
const oben = document.getElementById('oben') as HTMLCanvasElement;
const leiste = document.getElementById('leiste')!;
const tempoText = document.getElementById('tempo')!;

let zeichner: RaumZeichner | null = null;
let bau: Bau | null = null;
let rahmen: Rahmen = { cx: 0, cy: -200, hb: 250, hh: 250 };

leiste.innerHTML = `
  <h2>Drehung</h2>
  <label class="regler"><span>Winkel</span><input type="range" id="winkel" min="0" max="360" step="0.5" value="${zustand.psi}"><output for="winkel"></output></label>
  <div class="knoepfe">
    <button type="button" class="knopf" id="spielen">Drehen ▶</button>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((w) => `<button type="button" class="knopf" data-psi="${w}">${w}°</button>`).join('')}
  </div>
  <label class="schalter"><input type="checkbox" id="vorlage" ${zustand.vorlage ? 'checked' : ''}> Florians Zeichnung rot darüber (0°, 45°, 90°, 180°, 270°)</label>
  <p class="hinweis">Beweis 3D: Jedes Teil ist ein Körper aus Florians Front und Seite, das Weiß kommt aus seinen Zeichnungen (Front, Seite, Rücken). Zwischen zwei Ansichten wird es gemischt. Beim Blick von der Seite schauen die fernen Beine und das ferne Ohr vor, wie gezeichnet.</p>
  <h2>Bau</h2>
  <p class="hinweis" id="bauText">Ozzy wird gebaut …</p>
`;
const winkel = document.getElementById('winkel') as HTMLInputElement;
const winkelAus = leiste.querySelector('output[for="winkel"]') as HTMLOutputElement;

function groesse(): { b: number; h: number; dpr: number } {
  const r = figur.getBoundingClientRect();
  return { b: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)), dpr: Math.min(2, window.devicePixelRatio || 1) };
}

function vorlageZeichnen(): void {
  const { b, h, dpr } = groesse();
  oben.width = Math.round(b * dpr);
  oben.height = Math.round(h * dpr);
  const ctx = oben.getContext('2d')!;
  ctx.clearRect(0, 0, oben.width, oben.height);
  if (!zustand.vorlage) return;
  const p = ((zustand.psi % 360) + 360) % 360;
  const v = VORLAGE_BEI.find(([w]) => Math.abs(w - p) < 0.6);
  if (!v) return;
  const a = daten.ansichten[v[1]];
  const u = koerperUrsprung(a);
  const sx = (x: number): number => ((x - rahmen.cx) / rahmen.hb + 1) * 0.5 * oben.width;
  const sy = (y: number): number => ((y - rahmen.cy) / rahmen.hh + 1) * 0.5 * oben.height;
  ctx.strokeStyle = 'rgba(230, 40, 40, 0.85)';
  ctx.lineWidth = Math.max(1, dpr);
  for (const t of a.teile) {
    const pts = abflachen(verschieben(t.form, -u[0], -u[1]), (q) => [sx(v[2] ? -q[0] : q[0]), sy(q[1])], 1);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i]!, pts[i + 1]!);
    ctx.closePath();
    ctx.stroke();
  }
}

function zeichnen(): void {
  winkel.value = String(zustand.psi);
  winkelAus.value = `${Math.round(zustand.psi * 10) / 10}°`;
  if (!zeichner) return;
  const { b, h, dpr } = groesse();
  zeichner.groesse(b, h, dpr);
  rahmen = zeichner.rahmenFuer(b, h);
  zeichner.zeichne(zustand.psi, rahmen);
  vorlageZeichnen();
}

let letzte = 0;
const abstaende: number[] = [];
function schleife(jetzt: number): void {
  if (!zustand.laeuft) return;
  if (letzte) {
    const dt = Math.min(0.1, (jetzt - letzte) / 1000);
    zustand.psi = (zustand.psi + zustand.tempo * dt) % 360;
    abstaende.push(jetzt - letzte);
    if (abstaende.length > 60) abstaende.shift();
    const mittel = abstaende.reduce((s, x) => s + x, 0) / abstaende.length;
    tempoText.textContent = `${(1000 / mittel).toFixed(0)} Bilder/s`;
  }
  letzte = jetzt;
  zeichnen();
  requestAnimationFrame(schleife);
}

winkel.addEventListener('input', () => {
  zustand.psi = Number(winkel.value);
  zeichnen();
});
document.getElementById('spielen')!.addEventListener('click', (e) => {
  zustand.laeuft = !zustand.laeuft;
  (e.currentTarget as HTMLElement).classList.toggle('an', zustand.laeuft);
  letzte = 0;
  if (zustand.laeuft) requestAnimationFrame(schleife);
});
for (const k of leiste.querySelectorAll<HTMLButtonElement>('[data-psi]'))
  k.addEventListener('click', () => {
    zustand.psi = Number(k.dataset.psi);
    zeichnen();
  });
document.getElementById('vorlage')!.addEventListener('change', (e) => {
  zustand.vorlage = (e.currentTarget as HTMLInputElement).checked;
  zeichnen();
});
window.addEventListener('resize', zeichnen);

// ---- Bau im Hintergrund ----
const bereit = new Promise<void>((fertig) => {
  const w = new Worker(new URL('./bau.worker.ts', import.meta.url), { type: 'module' });
  const t0 = performance.now();
  w.onmessage = (e: MessageEvent<Bau>) => {
    bau = e.data;
    zeichner = new RaumZeichner(figur, bau);
    zeichner.weiss = adresse.get('weiss') !== '0';
    zeichner.bunt = adresse.get('bunt') === '1';
    zeichner.sicht = adresse.get('sicht') !== '0';
    zeichner.fest = adresse.get('weissArt') === 'fest';
    const z = bau.zeiten;
    document.getElementById('bauText')!.textContent = `${(bau.netz.lagen.length / 3 / 1000).toFixed(0)} Tsd. Ecken, ${(bau.netz.dreiecke.length / 3 / 1000).toFixed(0)} Tsd. Dreiecke; gebaut in ${((performance.now() - t0) / 1000).toFixed(1)} s (Netz ${(z.netz! / 1000).toFixed(1)} s).`;
    w.terminate();
    zeichnen();
    fertig();
  };
  w.postMessage({ texte: TEXTE, h: Number(adresse.get('h') ?? 2.5), k: Number(adresse.get('k') ?? 3) });
});

// ---- Prüfhaken ----
async function svgBild(text: string, r: Rahmen, b: number, h: number): Promise<Uint8ClampedArray> {
  const ohneMeta = text.replace(/<\?xml[^>]*>/, '').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  const svg = ohneMeta.replace(/viewBox="[^"]+"/, `viewBox="${r.cx - r.hb} ${r.cy - r.hh} ${2 * r.hb} ${2 * r.hh}" width="${b}" height="${h}" preserveAspectRatio="none"`);
  const bild = new Image();
  await new Promise<void>((ok, fehler) => {
    bild.onload = () => ok();
    bild.onerror = () => fehler(new Error('SVG lädt nicht'));
    bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = b;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, b, h);
  c.drawImage(bild, 0, 0, b, h);
  return c.getImageData(0, 0, b, h).data;
}

function figurBild(b: number, h: number): Uint8ClampedArray {
  const cv = document.createElement('canvas');
  cv.width = b;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.drawImage(figur, 0, 0, b, h);
  return c.getImageData(0, 0, b, h).data;
}

declare global {
  interface Window {
    __ozzyRaum: unknown;
  }
}
window.__ozzyRaum = {
  bereit: () => bereit,
  zeiten: () => bau?.zeiten,
  /** zeichnet bei ψ in b × h (ohne Pixeldichte), gibt den Rahmen zurück */
  zeigen(psi: number, b = 800, h = 800): Rahmen {
    figur.style.width = `${b}px`;
    figur.style.height = `${h}px`;
    zeichner!.groesse(b, h, 1);
    rahmen = zeichner!.rahmenFuer(b, h);
    zeichner!.zeichne(psi, rahmen);
    return rahmen;
  },
  bild: (): string => figur.toDataURL('image/png'),
  /** Deckung des Schwarz mit Florians Zeichnung bei ψ: Anteil gemeinsam / vereinigt, nur 3D, nur Zeichnung; dazu ein Unterschiedsbild */
  async vergleich(psi: number, ansicht: AnsichtName, b = 800, h = 800, spiegeln = false, mitZeichnung = false) {
    const r = (window.__ozzyRaum as { zeigen: (p: number, b: number, h: number) => Rahmen }).zeigen(psi, b, h);
    const a = figurBild(b, h);
    const u = koerperUrsprung(daten.ansichten[ansicht]);
    const vr: Rahmen = spiegeln ? { ...r, cx: -r.cx } : r;
    let v = await svgBild(TEXTE[ANSICHTEN[ansicht].datei]!, { ...vr, cx: vr.cx + u[0], cy: vr.cy + u[1] }, b, h);
    if (spiegeln) {
      const m = new Uint8ClampedArray(v.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) for (let k = 0; k < 4; k++) m[(y * b + x) * 4 + k] = v[(y * b + (b - 1 - x)) * 4 + k]!;
      v = m;
    }
    let beide = 0;
    let oder = 0;
    let nur3D = 0;
    let nurVorlage = 0;
    const diff = new Uint8ClampedArray(a.length);
    for (let i = 0; i < a.length; i += 4) {
      const sa = a[i]! < 128;
      const sv = v[i]! < 128;
      if (sa && sv) beide++;
      if (sa || sv) oder++;
      if (sa && !sv) nur3D++;
      if (sv && !sa) nurVorlage++;
      const g = sa && sv ? 40 : sa ? 0 : sv ? 0 : 255;
      diff.set(sa && !sv ? [230, 40, 40, 255] : sv && !sa ? [40, 90, 230, 255] : [g, g, g, 255], i);
    }
    const cv = document.createElement('canvas');
    cv.width = b;
    cv.height = h;
    const c = cv.getContext('2d')!;
    let zeichnung: string | null = null;
    if (mitZeichnung) {
      c.putImageData(new ImageData(new Uint8ClampedArray(v), b, h), 0, 0);
      zeichnung = cv.toDataURL('image/png');
    }
    c.putImageData(new ImageData(diff, b, h), 0, 0);
    return { deckung: beide / Math.max(1, oder), nur3D, nurVorlage, bild: cv.toDataURL('image/png'), zeichnung };
  },
  /** Zeit je Bild (Zeichnen und auf die Grafikkarte warten), Median und 95 % in ms */
  tempo(n = 120, b = 1000, h = 1000) {
    const gl = zeichner!.renderer.getContext();
    const px = new Uint8Array(4);
    const z: number[] = [];
    zeichner!.groesse(b, h, 1);
    const r = zeichner!.rahmenFuer(b, h);
    for (let i = 0; i < n; i++) {
      const t = performance.now();
      zeichner!.zeichne((i * 3) % 360, r);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      z.push(performance.now() - t);
    }
    z.sort((x, y) => x - y);
    return { median: z[Math.floor(n / 2)], p95: z[Math.floor(n * 0.95)] };
  },
};
