// Ozzy Figur (Etappe A und B): Florians Vorlagen exakt oder flüssig, zwei Prüfszenen für die Regeln, Tempoanzeige.
// Die SVGs werden beim Laden aus docs/look/ozzy-figur/vorlagen gelesen: Tauscht Florian eine Datei aus, zeigt die Seite sie nach
// dem Neuladen (der Import prüft und meldet im Abschnitt „Import“).
import backSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_back.svg?raw';
import frontSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_front.svg?raw';
import lieg1Svg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown01.svg?raw';
import lieg2Svg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown02.svg?raw';
import logoSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand01_logo.svg?raw';
import profilSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand02.svg?raw';
import sitz1Svg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_sit01.svg?raw';
import sitz2Svg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_st02.svg?raw';
import viertelSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_viertel.svg?raw';
import { abflachen, type Form } from './form';
import { pruefhakenAnlegen } from './pruefen';
import { type Ansicht, type Diagnose, EXAKT, FigurRenderer, FLUESSIG, type Fluessig, type Szene } from './renderer';
import { drehLage, drehSzene, type Drehung, rasterVon, REGELN, type Regeln, szenenKasten, vorlageSzene } from './szenen';
import { ANSICHTEN, type AnsichtName, importieren } from './vorlagen/import';

export const SVG_TEXTE: Record<string, string> = {
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
const daten = importieren(SVG_TEXTE);

export type SzenenName = AnsichtName | Drehung;
const istDrehung = (n: SzenenName): n is Drehung => n === 'drehen' || n === 'kopf' || n === 'koerper';
const SZENEN: { name: SzenenName; titel: string }[] = [
  { name: 'logo', titel: 'Logo' },
  { name: 'profil', titel: 'Profil' },
  { name: 'front', titel: 'Front' },
  { name: 'back', titel: 'Rücken' },
  { name: 'viertel', titel: '3/4' },
  { name: 'lieg1', titel: 'Liegen 1' },
  { name: 'lieg2', titel: 'Liegen 2' },
  { name: 'sitz1', titel: 'Sitzen 1' },
  { name: 'sitz2', titel: 'Sitzen 2' },
  { name: 'drehen', titel: 'Ozzy dreht sich' },
  { name: 'kopf', titel: 'Kopf dreht' },
  { name: 'koerper', titel: 'Körper dreht' },
];

export function szeneBauen(name: SzenenName, t: number, fl: Fluessig, regeln: Regeln = REGELN): Szene {
  if (istDrehung(name)) return drehSzene(daten, name, t, fl, regeln);
  return vorlageSzene(daten, name, fl);
}

/** Florians Vorlage an der Stelle der Szene (Drehungen: nur an den Schlüsselwinkeln), für die rote Linie darüber */
export function vorlageFuer(name: SzenenName, t: number): Form[] | null {
  if (!istDrehung(name)) return daten.ansichten[name].teile.map((x) => x.form);
  return rasterVon(daten).vorlage(drehLage(name, t))?.formen ?? null;
}

/** fester Rahmen je Szene (Vereinigung über beide Enden), damit beim Drehen nichts springt */
export function rahmen(name: SzenenName): [number, number, number, number] {
  const ks = (istDrehung(name) ? [0, 0.5, 1] : [0]).map((t) => szenenKasten(szeneBauen(name, t, EXAKT)));
  return [Math.min(...ks.map((k) => k[0])), Math.min(...ks.map((k) => k[1])), Math.max(...ks.map((k) => k[2])), Math.max(...ks.map((k) => k[3]))];
}

export function einpassen(name: SzenenName, w: number, h: number, oben: number, rand: number): Ansicht {
  const [x0, y0, x1, y1] = rahmen(name);
  const s = Math.min((w - 2 * rand) / (x1 - x0), (h - oben - 2 * rand) / (y1 - y0));
  return { massstab: s, x0: (x0 + x1) / 2 - w / 2 / s, y0: (y0 + y1) / 2 - (h + oben) / 2 / s };
}

// ---- Seite --------------------------------------------------------------------------------------------------------------
const leinwand = document.getElementById('figur') as HTMLCanvasElement;
const oben = document.getElementById('oben') as HTMLCanvasElement;
const tempoFeld = document.getElementById('tempo')!;
const leiste = document.getElementById('leiste')!;
const renderer = new FigurRenderer(leinwand);
const ctx = oben.getContext('2d')!;

const adresse = new URLSearchParams(location.search);
const zustand = {
  szene: (adresse.get('szene') as SzenenName) || 'logo',
  t: Number(adresse.get('t') ?? 0.5),
  fluessig: adresse.get('modus') !== 'exakt',
  fl: { ...FLUESSIG } as Fluessig,
  regeln: { ...REGELN } as Regeln,
  vorlage: adresse.get('vorlage') === '1',
  diagnose: 0 as Diagnose,
  laeuft: false,
  dauer: false,
};

function aufbauen(): void {
  const knoepfe = SZENEN.map((s) => `<button type="button" class="knopf" data-szene="${s.name}">${s.titel}</button>`).join('');
  const regler = (id: string, titel: string, max: number, wert: number, schritt = 0.5): string =>
    `<label class="regler"><span>${titel}</span><input type="range" id="${id}" min="0" max="${max}" step="${schritt}" value="${wert}"><output for="${id}">${wert}</output></label>`;
  leiste.innerHTML = `
    <h2>Ansicht</h2>
    <div class="knoepfe" id="szenen">${knoepfe}</div>
    <div id="drehen">
      <label class="regler"><span>Winkel</span><input type="range" id="winkel" min="0" max="90" step="0.5" value="${zustand.t * 90}"><output for="winkel"></output></label>
      <div class="knoepfe"><button type="button" class="knopf" id="spielen">Drehen ▶</button></div>
    </div>
    <h2>Look</h2>
    <div class="knoepfe"><button type="button" class="knopf" id="exakt">exakt</button><button type="button" class="knopf" id="fluessig">flüssig</button></div>
    <div id="fluessigRegler">
      ${regler('bohneBein', 'Bohne – Bein', 30, zustand.fl.bohneBein)}
      ${regler('bohneSchwanz', 'Bohne – Schwanz', 30, zustand.fl.bohneSchwanz)}
      ${regler('bohneKopf', 'Bohne – Kopf', 30, zustand.fl.bohneKopf)}
      ${regler('kopfOhr', 'Kopf – Ohr', 30, zustand.fl.kopfOhr)}
      ${regler('ohrOhr', 'Ohr – Ohr', 30, zustand.fl.ohrOhr)}
      ${regler('kopfNase', 'Kopf – Nase', 30, zustand.fl.kopfNase)}
      ${regler('klemme', 'Klemme weich', 12, zustand.fl.klemme)}
    </div>
    <div id="regelRegler">
      ${regler('verdecken', 'Verdecken', 30, zustand.regeln.verdecken)}
      <label class="schalter"><input type="checkbox" id="bohnenenden" ${zustand.regeln.bohnenenden ? 'checked' : ''}> Bohnenenden an den Beinen</label>
    </div>
    <h2>Prüfen</h2>
    <label class="schalter"><input type="checkbox" id="vorlage" ${zustand.vorlage ? 'checked' : ''}> Vorlage rot darüber</label>
    <label class="schalter"><input type="checkbox" id="draussen"> Weiß ohne Schwarz darunter rot</label>
    <label class="schalter"><input type="checkbox" id="spalt"> Ohrspalt blau</label>
    <label class="schalter"><input type="checkbox" id="dauer"> Dauerlauf (Tempo messen)</label>
    <p class="hinweis">Werte in Einheiten deiner SVGs. „exakt“ zeichnet deine Vorlage genau; „flüssig“ verschmilzt die Paare.</p>
    <h2>Import</h2>
    <ul id="bericht">${daten.bericht.map((b) => `<li>${b.art === 'fehler' ? '✗' : b.art === 'warnung' ? '!' : b.art === 'abgleich' ? '↔' : '·'} ${b.text}</li>`).join('')}</ul>`;
  leiste.querySelectorAll<HTMLButtonElement>('[data-szene]').forEach((b) =>
    b.addEventListener('click', () => {
      zustand.szene = b.dataset.szene as SzenenName;
      neu();
    }),
  );
  const winkel = document.getElementById('winkel') as HTMLInputElement;
  winkel.addEventListener('input', () => {
    zustand.t = Number(winkel.value) / 90;
    zustand.laeuft = false;
    neu();
  });
  document.getElementById('spielen')!.addEventListener('click', () => {
    zustand.laeuft = !zustand.laeuft;
    neu();
  });
  document.getElementById('exakt')!.addEventListener('click', () => {
    zustand.fluessig = false;
    neu();
  });
  document.getElementById('fluessig')!.addEventListener('click', () => {
    zustand.fluessig = true;
    neu();
  });
  for (const k of Object.keys(zustand.fl) as (keyof Fluessig)[]) {
    const el = document.getElementById(k) as HTMLInputElement | null;
    el?.addEventListener('input', () => {
      zustand.fl[k] = Number(el.value);
      neu();
    });
  }
  {
    const el = document.getElementById('verdecken') as HTMLInputElement;
    el.addEventListener('input', () => {
      zustand.regeln.verdecken = Number(el.value);
      neu();
    });
    const b = document.getElementById('bohnenenden') as HTMLInputElement;
    b.addEventListener('change', () => {
      zustand.regeln.bohnenenden = b.checked;
      neu();
    });
  }
  const schalter = (id: string, f: (an: boolean) => void): void => {
    const el = document.getElementById(id) as HTMLInputElement;
    el.addEventListener('change', () => {
      f(el.checked);
      neu();
    });
  };
  schalter('vorlage', (an) => (zustand.vorlage = an));
  schalter('draussen', (an) => {
    zustand.diagnose = an ? 1 : 0;
    (document.getElementById('spalt') as HTMLInputElement).checked = false;
  });
  schalter('spalt', (an) => {
    zustand.diagnose = an ? 2 : 0;
    (document.getElementById('draussen') as HTMLInputElement).checked = false;
  });
  schalter('dauer', (an) => (zustand.dauer = an));
}

function anzeigen(): void {
  leiste.querySelectorAll<HTMLButtonElement>('[data-szene]').forEach((b) => b.classList.toggle('an', b.dataset.szene === zustand.szene));
  const dreht = istDrehung(zustand.szene);
  document.getElementById('drehen')!.style.display = dreht ? '' : 'none';
  document.getElementById('regelRegler')!.style.display = dreht ? '' : 'none';
  document.getElementById('fluessigRegler')!.style.opacity = zustand.fluessig ? '1' : '0.4';
  document.getElementById('exakt')!.classList.toggle('an', !zustand.fluessig);
  document.getElementById('fluessig')!.classList.toggle('an', zustand.fluessig);
  document.getElementById('spielen')!.textContent = zustand.laeuft ? 'Anhalten ■' : 'Drehen ▶';
  (document.getElementById('winkel') as HTMLInputElement).value = String(zustand.t * 90);
  leiste.querySelectorAll('output').forEach((o) => {
    const el = document.getElementById(o.htmlFor.value) as HTMLInputElement | null;
    if (el) o.textContent = el.id === 'winkel' ? `${Math.round(zustand.t * 90)}°` : el.value;
  });
}

let ansicht: Ansicht = { massstab: 1, x0: 0, y0: 0 };
function zeichnen(): void {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = leinwand.clientWidth * dpr;
  const h = leinwand.clientHeight * dpr;
  renderer.groesse(w, h);
  if (oben.width !== renderer.breite || oben.height !== renderer.hoehe) {
    oben.width = renderer.breite;
    oben.height = renderer.hoehe;
  }
  ansicht = einpassen(zustand.szene, renderer.breite, renderer.hoehe, 56 * dpr, 24 * dpr);
  const szene = szeneBauen(zustand.szene, zustand.t, zustand.fluessig ? zustand.fl : EXAKT, zustand.regeln);
  renderer.zeichne(szene, ansicht, zustand.diagnose);
  ctx.clearRect(0, 0, oben.width, oben.height);
  const vorlage = zustand.vorlage ? vorlageFuer(zustand.szene, zustand.t) : null;
  if (vorlage) {
    ctx.strokeStyle = 'rgba(230, 30, 30, 0.85)';
    ctx.lineWidth = Math.max(1, dpr * 0.75);
    for (const f of vorlage) {
      const p = abflachen(f, (q) => [(q[0] - ansicht.x0) * ansicht.massstab, (q[1] - ansicht.y0) * ansicht.massstab], 2);
      ctx.beginPath();
      for (let k = 0; k < p.length; k += 2) (k ? ctx.lineTo : ctx.moveTo).call(ctx, p[k]!, p[k + 1]!);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

// Tempo: gleitend über die letzten Bilder
const messung = { cpu: [] as number[], gpu: [] as number[], abstand: [] as number[], zuletzt: 0, anzeige: 0 };
function tempoZeigen(jetzt: number): void {
  const fortlaufend = zustand.dauer || zustand.laeuft;
  if (messung.zuletzt && fortlaufend) messung.abstand.push(jetzt - messung.zuletzt);
  messung.zuletzt = jetzt;
  messung.cpu.push(renderer.letzte.cpuMs);
  // Zeit der Grafikkarte nur im Dauerlauf (einzelne Bilder enthalten das Übersetzen der Shader und Aufwachen)
  if (fortlaufend && Number.isFinite(renderer.letzte.gpuMs)) messung.gpu.push(renderer.letzte.gpuMs);
  for (const a of [messung.cpu, messung.gpu, messung.abstand]) if (a.length > 90) a.shift();
  if (jetzt - messung.anzeige < 400) return;
  messung.anzeige = jetzt;
  const median = (a: number[]): number => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
  const bps = messung.abstand.length ? 1000 / median(messung.abstand) : 0;
  const zeilen = [
    `${fortlaufend && messung.abstand.length > 10 ? `${bps.toFixed(0)} Bilder/s · ` : ''}Prozessor ${median(messung.cpu).toFixed(1)} ms${messung.gpu.length > 10 ? ` · Grafik ${median(messung.gpu).toFixed(1)} ms` : ''}`,
    `${renderer.breite}×${renderer.hoehe} · ${renderer.letzte.strecken} Kanten · ${renderer.halbFloat ? 'Half-Float' : '8 Bit'}`,
  ];
  tempoFeld.textContent = zeilen.join('\n');
}

let wartet = false;
let tStart = 0;
function neu(): void {
  anzeigen();
  if (!wartet) {
    wartet = true;
    requestAnimationFrame(bild);
  }
}
function bild(jetzt: number): void {
  wartet = false;
  if (zustand.laeuft) {
    if (!tStart) tStart = jetzt - zustand.t * 2000;
    const u = ((jetzt - tStart) / 2000) % 2;
    zustand.t = u < 1 ? u : 2 - u;
    anzeigen();
  } else tStart = 0;
  zeichnen();
  tempoZeigen(jetzt);
  if (zustand.laeuft || zustand.dauer) {
    wartet = true;
    requestAnimationFrame(bild);
  } else {
    messung.zuletzt = 0;
    messung.abstand.length = 0;
    messung.gpu.length = 0;
  }
}

aufbauen();
window.addEventListener('resize', neu);
neu();
pruefhakenAnlegen({ daten, renderer, svgTexte: SVG_TEXTE, szeneBauen, vorlageFuer, einpassen, ansichtsDateien: Object.fromEntries(Object.entries(ANSICHTEN).map(([k, v]) => [k, v.datei])) });
