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
import { ABLAEUFE, type Art, dauerVon } from './ablauf';
import { HALTUNGEN, type HaltungName } from './haltung';
import { pruefhakenAnlegen } from './pruefen';
import type { Lage } from './raster';
import { type Ansicht, type Diagnose, EXAKT, FigurRenderer, FLUESSIG, type Fluessig, type Szene } from './renderer';
import { HaltungsSteuerung } from './steuerung';
import { ankerVon, drehLage, drehSzene, type Drehung, istAblauf, rasterVon, REGELN, type Regeln, szenenKasten, vorlageSzene } from './szenen';
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

/** „steuern“: Ozzy per Knopf (Stehen, Sitzen, Liegen, je in Florians Arten) und Kopfwinkel, weich ineinander (steuerung.ts) */
export type SzenenName = AnsichtName | Drehung | 'steuern';
const istDrehung = (n: SzenenName): n is Drehung => ['drehen', 'kopf', 'kopf360', 'koerper', 'haltung', 'haltungP'].includes(n) || istAblauf(n);
const SZENEN: { name: SzenenName; titel: string }[] = [
  { name: 'steuern', titel: 'Ozzy steuern' },
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
  { name: 'kopf360', titel: 'Kopf dreht 360°' },
  { name: 'koerper', titel: 'Körper dreht' },
  { name: 'hinsetzen', titel: 'Hinsetzen' },
  { name: 'huepfer', titel: 'Hinsetzen mit Hüpfer' },
  { name: 'rutschen', titel: 'Hinlegen: auf den Bauch rutschen' },
  { name: 'gemuetlich', titel: 'Gemütlich hinlegen' },
  { name: 'umlegen', titel: 'Vom Sitzen hinlegen' },
  { name: 'aufsetzen', titel: 'Vom Liegen aufsetzen' },
  { name: 'aufstehen', titel: 'Vom Liegen aufstehen' },
  { name: 'aufstehenSitz', titel: 'Vom Sitzen aufstehen' },
  { name: 'haltung', titel: 'Sitzen, dann Liegen' },
  { name: 'haltungP', titel: 'Sitzen, dann Liegen (Profil)' },
];

const steuerung = new HaltungsSteuerung('stehen', undefined, ankerVon(daten));
/** Knöpfe der Steuerung (Tasten 1 bis 5) */
const STEUER_KNOEPFE: { haltung: HaltungName; art: Art; titel: string }[] = [
  { haltung: 'stehen', art: 'normal', titel: 'Stehen' },
  { haltung: 'sitzen', art: 'normal', titel: 'Sitzen' },
  { haltung: 'sitzen', art: 'huepfer', titel: 'Sitzen mit Hüpfer' },
  { haltung: 'liegen', art: 'normal', titel: 'Liegen (rutschen)' },
  { haltung: 'liegen', art: 'gemuetlich', titel: 'Liegen gemütlich' },
];
const steuerLage = (): Lage => ({ psi: 90, theta: steuerung.kopfWinkel, posen: steuerung.gewichte(), effekte: steuerung.effekte() });

export function szeneBauen(name: SzenenName, t: number, fl: Fluessig, regeln: Regeln = REGELN): Szene {
  if (name === 'steuern') return rasterVon(daten).szene(steuerLage(), fl, { verdecken: regeln.verdecken, durchbruch: regeln.durchbruch }, regeln.bohnenenden);
  if (istDrehung(name)) return drehSzene(daten, name, t, fl, regeln);
  return vorlageSzene(daten, name, fl);
}

/** Florians Vorlage an der Stelle der Szene (Drehungen: nur an den Schlüsselwinkeln), für die rote Linie darüber */
export function vorlageFuer(name: SzenenName, t: number): Form[] | null {
  if (name === 'steuern') return rasterVon(daten).vorlage(steuerLage())?.formen ?? null;
  if (!istDrehung(name)) return daten.ansichten[name].teile.map((x) => x.form);
  return rasterVon(daten).vorlage(drehLage(name, t, ankerVon(daten)))?.formen ?? null;
}

/** fester Rahmen je Szene (Vereinigung über beide Enden bzw. alle Haltungen mit Kopf vorn und im Profil), damit nichts springt */
const rahmenSpeicher = new Map<SzenenName, [number, number, number, number]>();
export function rahmen(name: SzenenName): [number, number, number, number] {
  const fertig = rahmenSpeicher.get(name);
  if (fertig) return fertig;
  const ks =
    name === 'steuern'
      ? HALTUNGEN.flatMap((h) => [0, 90].map((theta) => szenenKasten(rasterVon(daten).szene({ psi: 90, theta, posen: { [h.name]: 1 } }, EXAKT))))
      : (name === 'kopf360' ? Array.from({ length: 49 }, (_, i) => i / 48) : istAblauf(name) ? [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] : istDrehung(name) ? [0, 0.5, 1] : [0]).map((t) => szenenKasten(szeneBauen(name, t, EXAKT)));
  const k: [number, number, number, number] = [Math.min(...ks.map((x) => x[0])), Math.min(...ks.map((x) => x[1])), Math.max(...ks.map((x) => x[2])), Math.max(...ks.map((x) => x[3]))];
  rahmenSpeicher.set(name, k);
  return k;
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
  const haltungKnoepfe = STEUER_KNOEPFE.map(
    (k, i) => `<button type="button" class="knopf" data-haltung="${k.haltung}" data-art="${k.art}" title="Taste ${i + 1}">${k.titel}</button>`,
  ).join('');
  leiste.innerHTML = `
    <h2>Ansicht</h2>
    <div class="knoepfe" id="szenen">${knoepfe}</div>
    <div id="steuern">
      <div class="knoepfe">${haltungKnoepfe}</div>
      ${regler('kopfwinkel', 'Kopf', 90, 0, 1)}
      ${regler('steuerTempo', 'Tempo', 3, steuerung.tempo.tempo, 0.1)}
      <p class="hinweis">Hinsetzen: Hinterbeine biegen sich, bis der Hintern am Boden ist, dann streckt sich das Hinterbein nach vorn; oder mit Hüpfer auf den Hintern. Hinlegen: auf den Bauch rutschen oder gemütlich über den Diener. Vom Sitzen ins Liegen vorn runtergleiten, dann rutschen die Hinterbeine nach hinten. Jeder Knopf wirkt auch mitten im Wechsel (Tasten 1 bis 5).</p>
    </div>
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
      ${regler('weissWeiss', 'Weiß – Weiß', 60, zustand.fl.weissWeiss)}
      ${regler('weissSchwarz', 'Weiß – Schwarz', 30, zustand.fl.weissSchwarz)}
      ${regler('klemme', 'Klemme weich', 12, zustand.fl.klemme)}
    </div>
    <div id="regelRegler">
      ${regler('verdecken', 'Verdecken', 30, zustand.regeln.verdecken)}
      ${regler('durchbruch', 'Durchbruch', 30, zustand.regeln.durchbruch)}
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
  const haltungSetzen = (h: HaltungName, art: Art): void => {
    zustand.szene = 'steuern';
    steuerung.setzen(h, art);
    neu();
  };
  leiste
    .querySelectorAll<HTMLButtonElement>('[data-haltung]')
    .forEach((b) => b.addEventListener('click', () => haltungSetzen(b.dataset.haltung as HaltungName, (b.dataset.art as Art) ?? 'normal')));
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = STEUER_KNOEPFE[Number(e.key) - 1];
    if (k) haltungSetzen(k.haltung, k.art);
  });
  const kopfwinkel = document.getElementById('kopfwinkel') as HTMLInputElement;
  kopfwinkel.addEventListener('input', () => {
    steuerung.kopfZiel(Number(kopfwinkel.value));
    neu();
  });
  const steuerTempo = document.getElementById('steuerTempo') as HTMLInputElement;
  steuerTempo.min = '0.4';
  steuerTempo.addEventListener('input', () => {
    steuerung.tempo.tempo = Number(steuerTempo.value);
    neu();
  });
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
    const du = document.getElementById('durchbruch') as HTMLInputElement;
    du.addEventListener('input', () => {
      zustand.regeln.durchbruch = Number(du.value);
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
  leiste.querySelectorAll<HTMLButtonElement>('[data-haltung]').forEach((b) => b.classList.toggle('an', b.dataset.haltung === steuerung.ziel && b.dataset.art === steuerung.art));
  const dreht = istDrehung(zustand.szene);
  const steuert = zustand.szene === 'steuern';
  document.getElementById('steuern')!.style.display = steuert ? '' : 'none';
  document.getElementById('drehen')!.style.display = dreht ? '' : 'none';
  document.getElementById('regelRegler')!.style.display = dreht || steuert ? '' : 'none';
  document.getElementById('fluessigRegler')!.style.opacity = zustand.fluessig ? '1' : '0.4';
  document.getElementById('exakt')!.classList.toggle('an', !zustand.fluessig);
  document.getElementById('fluessig')!.classList.toggle('an', zustand.fluessig);
  document.getElementById('spielen')!.textContent = zustand.laeuft ? 'Anhalten ■' : 'Drehen ▶';
  (document.getElementById('winkel') as HTMLInputElement).value = String(zustand.t * 90);
  leiste.querySelectorAll('output').forEach((o) => {
    const el = document.getElementById(o.htmlFor.value) as HTMLInputElement | null;
    if (el) o.textContent = el.id === 'winkel' ? (zustand.szene.startsWith('haltung') ? `${(zustand.t * 2).toFixed(2)} (0 Stehen, 1 Sitzen, 2 Liegen)` : istAblauf(zustand.szene) ? `${Math.round(zustand.t * 100)} %` : `${Math.round(zustand.t * 90)}°`) : el.id === 'kopfwinkel' ? `${el.value}°` : el.value;
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
  // Steuerung: Das Bild folgt Ozzys Lage in der Welt (er verschiebt sich, damit Pfoten und Hintern stehen bleiben)
  if (zustand.szene === 'steuern') ansicht = { ...ansicht, x0: ansicht.x0 + kamera.x };
  const szene = szeneBauen(zustand.szene, zustand.t, zustand.fluessig ? zustand.fl : EXAKT, zustand.regeln);
  renderer.zeichne(szene, ansicht, zustand.diagnose);
  ctx.clearRect(0, 0, oben.width, oben.height);
  // Boden mit Marken in der Welt: Folgt das Bild Ozzy, sieht man am Boden, dass er sich bewegt und nicht rutscht
  if (zustand.szene === 'steuern') {
    const y = (0 - ansicht.y0) * ansicht.massstab;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(oben.width, y);
    const abstand = 40;
    const x0 = Math.floor(ansicht.x0 / abstand) * abstand;
    for (let x = x0; (x - ansicht.x0) * ansicht.massstab < oben.width; x += abstand) {
      const px = (x - ansicht.x0) * ansicht.massstab;
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + 6 * dpr);
    }
    ctx.stroke();
  }
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
/** Zeit des letzten Bilds der Steuerung (0 = ruht) */
let steuerZeit = 0;
/** Bildausschnitt der Steuerung folgt Ozzys Lage in der Welt (Zeitkonstante in Sekunden) */
const kamera = { x: 0 };
const KAMERA_ZEIT = 0.9;
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
    if (istAblauf(zustand.szene)) {
      // Abläufe in ihrer echten Zeit, vorwärts, am Ende kurz stehen bleiben
      const d = dauerVon(ABLAEUFE[zustand.szene]) * 1000;
      if (!tStart) tStart = jetzt - zustand.t * d;
      zustand.t = Math.min(1, ((jetzt - tStart) % (d + 900)) / d);
    } else {
      if (!tStart) tStart = jetzt - zustand.t * 2000;
      const u = ((jetzt - tStart) / 2000) % 2;
      zustand.t = u < 1 ? u : 2 - u;
    }
    anzeigen();
  } else tStart = 0;
  // Steuerung: je Bild um die vergangene Zeit weiter (nach einer Pause höchstens ein Bild); das Bild folgt Ozzy, bis es ihn eingeholt hat
  const kameraFolgt = (): boolean => Math.abs(steuerung.weltX - kamera.x) > 0.05;
  const steuert = zustand.szene === 'steuern' && (!steuerung.ruht || kameraFolgt());
  if (steuert) {
    const dt = steuerZeit ? Math.min(0.1, (jetzt - steuerZeit) / 1000) : 1 / 60;
    if (!steuerung.ruht) {
      steuerung.schritt(dt);
      if (steuerung.ruht) anzeigen();
    }
    kamera.x += (steuerung.weltX - kamera.x) * (1 - Math.exp(-dt / KAMERA_ZEIT));
    if (!kameraFolgt()) kamera.x = steuerung.weltX;
    steuerZeit = jetzt;
  } else steuerZeit = 0;
  zeichnen();
  tempoZeigen(jetzt);
  if (zustand.laeuft || zustand.dauer || (zustand.szene === 'steuern' && (!steuerung.ruht || kameraFolgt()))) {
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
pruefhakenAnlegen({ daten, renderer, svgTexte: SVG_TEXTE, szeneBauen, vorlageFuer, einpassen, steuerung, ansichtsDateien: Object.fromEntries(Object.entries(ANSICHTEN).map(([k, v]) => [k, v.datei])) });
