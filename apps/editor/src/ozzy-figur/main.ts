// Ozzy Figur (Etappe A und B): Florians Vorlagen exakt oder flüssig, zwei Prüfszenen für die Regeln, Tempoanzeige.
// Die SVGs werden beim Laden aus docs/look/ozzy-figur/vorlagen gelesen: Tauscht Florian eine Datei aus, zeigt die Seite sie nach
// dem Neuladen (der Import prüft und meldet im Abschnitt „Import“).
import backSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_back.svg?raw';
import frontSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_front.svg?raw';
import lieg1Svg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown01.svg?raw';
import lieg2Svg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown02.svg?raw';
import logoSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand01_logo.svg?raw';
import profilSvg from '../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand02.svg?raw';
import { abflachen, type Form, kasten, verschieben } from './form';
import { pruefhakenAnlegen } from './pruefen';
import { type Ansicht, type Diagnose, EXAKT, FigurRenderer, FLUESSIG, type Fluessig, type Szene } from './renderer';
import { koerperDrehung, kopfDrehung, REGELN, type Regeln, szenenKasten, vorlageSzene } from './szenen';
import { ANSICHTEN, type AnsichtName, importieren, teilVon } from './vorlagen/import';

export const SVG_TEXTE: Record<string, string> = {
  'ozzy_front.svg': frontSvg,
  'ozzy_back.svg': backSvg,
  'ozzy_stand01_logo.svg': logoSvg,
  'ozzy_stand02.svg': profilSvg,
  'ozzy_laydown01.svg': lieg1Svg,
  'ozzy_laydown02.svg': lieg2Svg,
};
const daten = importieren(SVG_TEXTE);

export type SzenenName = AnsichtName | 'kopf' | 'koerper';
const SZENEN: { name: SzenenName; titel: string }[] = [
  { name: 'logo', titel: 'Logo' },
  { name: 'profil', titel: 'Profil' },
  { name: 'front', titel: 'Front' },
  { name: 'back', titel: 'Rücken' },
  { name: 'lieg1', titel: 'Liegen 1' },
  { name: 'lieg2', titel: 'Liegen 2' },
  { name: 'kopf', titel: 'Kopf dreht' },
  { name: 'koerper', titel: 'Körper dreht' },
];

export function szeneBauen(name: SzenenName, t: number, fl: Fluessig, regeln: Regeln = REGELN): Szene {
  if (name === 'kopf') return kopfDrehung(daten, t, fl, regeln);
  if (name === 'koerper') return koerperDrehung(daten, t, fl);
  return vorlageSzene(daten, name, fl);
}

/** Florians Vorlage an der Stelle der Szene (nur an den Enden einer Drehung), für die rote Linie darüber */
export function vorlageFuer(name: SzenenName, t: number): Form[] | null {
  const a = daten.ansichten;
  if (name !== 'kopf' && name !== 'koerper') return a[name].teile.map((x) => x.form);
  if (name === 'kopf') {
    if (t < 0.01) return a.logo.teile.map((x) => x.form);
    if (t > 0.99) {
      const kl = kasten(teilVon(a.logo, 'bohne')!.form);
      const kp = kasten(teilVon(a.profil, 'bohne')!.form);
      return a.profil.teile.map((x) => verschieben(x.form, kl[0] - kp[0], kl[1] - kp[1]));
    }
    return null;
  }
  if (t > 0.99) return a.logo.teile.map((x) => x.form);
  if (t < 0.01) {
    const kf = kasten(teilVon(a.front, 'bohne')!.form);
    const kl = kasten(teilVon(a.logo, 'bohne')!.form);
    return a.front.teile.map((x) => verschieben(x.form, (kl[0] + kl[2]) / 2 - (kf[0] + kf[2]) / 2, a.logo.boden - a.front.boden));
  }
  return null;
}

/** fester Rahmen je Szene (Vereinigung über beide Enden), damit beim Drehen nichts springt */
export function rahmen(name: SzenenName): [number, number, number, number] {
  const ks = [szenenKasten(szeneBauen(name, 0, EXAKT)), szenenKasten(szeneBauen(name, 1, EXAKT))];
  return [Math.min(ks[0]![0], ks[1]![0]), Math.min(ks[0]![1], ks[1]![1]), Math.max(ks[0]![2], ks[1]![2]), Math.max(ks[0]![3], ks[1]![3])];
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
      ${regler('verdecken', 'Verdecken', 40, zustand.regeln.verdecken)}
      ${regler('spaltBreite', 'Ohrspalt breit', 20, zustand.regeln.spaltBreite)}
      ${regler('spaltAuslauf', 'Ohrspalt Auslauf', 60, zustand.regeln.spaltAuslauf)}
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
  for (const k of ['verdecken', 'spaltBreite', 'spaltAuslauf'] as const) {
    const el = document.getElementById(k) as HTMLInputElement;
    el.addEventListener('input', () => {
      zustand.regeln[k] = Number(el.value);
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
  const dreht = zustand.szene === 'kopf' || zustand.szene === 'koerper';
  document.getElementById('drehen')!.style.display = dreht ? '' : 'none';
  document.getElementById('regelRegler')!.style.display = zustand.szene === 'kopf' ? '' : 'none';
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
const messung = { cpu: [] as number[], abstand: [] as number[], zuletzt: 0, anzeige: 0 };
function tempoZeigen(jetzt: number): void {
  if (messung.zuletzt) messung.abstand.push(jetzt - messung.zuletzt);
  messung.zuletzt = jetzt;
  messung.cpu.push(renderer.letzte.cpuMs);
  if (messung.cpu.length > 90) messung.cpu.shift();
  if (messung.abstand.length > 90) messung.abstand.shift();
  if (jetzt - messung.anzeige < 400) return;
  messung.anzeige = jetzt;
  const median = (a: number[]): number => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
  const bps = messung.abstand.length ? 1000 / median(messung.abstand) : 0;
  const gpu = renderer.letzte.gpuMs;
  tempoFeld.textContent = `${zustand.dauer || zustand.laeuft ? `${bps.toFixed(0)} Bilder/s · ` : ''}Prozessor ${median(messung.cpu).toFixed(1)} ms${Number.isFinite(gpu) ? ` · Grafik ${gpu.toFixed(1)} ms` : ''}\n${renderer.breite}×${renderer.hoehe} · ${renderer.letzte.strecken} Kanten · ${renderer.halbFloat ? 'Half-Float' : '8 Bit'}`;
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
  } else messung.zuletzt = 0;
}

aufbauen();
window.addEventListener('resize', neu);
neu();
pruefhakenAnlegen({ daten, renderer, svgTexte: SVG_TEXTE, szeneBauen, vorlageFuer, einpassen, ansichtsDateien: Object.fromEntries(Object.entries(ANSICHTEN).map(([k, v]) => [k, v.datei])) });
