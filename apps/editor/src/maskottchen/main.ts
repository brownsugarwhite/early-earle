// Ozzy läuft: Bühne mit vier Reitern (Spielen, Bibliothek, Filmstreifen, Drehen).
import { Buehne } from './buehne';
import { BODEN_Y, Figur } from './figur';
import { type Pose, RUHE } from './pose';

const buehne = new Buehne(
  document.getElementById('leinwand') as HTMLCanvasElement,
  document.getElementById('figur') as HTMLCanvasElement,
  document.getElementById('oben') as HTMLCanvasElement,
);
const figur = new Figur();
const leiste = document.getElementById('leiste')!;
const hud = document.getElementById('hud')!;

type Reiter = 'spielen' | 'bibliothek' | 'film' | 'drehen';
let reiter: Reiter = (new URLSearchParams(location.search).get('reiter') as Reiter) || 'drehen';

// ---- Drehen: Regler für die Pose und eine Drehleiste -------------------------------------------------------------------
const drehPose: Pose = { ...RUHE };
const REGLER: [keyof Pose, string, number, number, number][] = [
  ['theta', 'Kopf θ', -180, 180, 1],
  ['psi', 'Körper ψ', -180, 180, 1],
  ['kopfNicken', 'Nicken', -40, 40, 1],
  ['kopfNeigen', 'Neigen', -40, 40, 1],
  ['ohrH', 'Ohr hinten', -40, 40, 1],
  ['ohrV', 'Ohr vorn', -40, 40, 1],
  ['schopf', 'Schopf', -40, 40, 1],
  ['brauen', 'Brauen', -20, 20, 1],
  ['brauenKipp', 'Brauen kipp', -20, 20, 1],
  ['nase', 'Nase', -1, 1, 0.05],
  ['bart', 'Bart', -20, 20, 1],
  ['schwanz', 'Schwanz', -60, 60, 1],
  ['schwanzDreh', 'Ring drehen', 0, 360, 1],
  ['nicken', 'Körper nicken', -30, 30, 1],
  ['rollen', 'Wiegen', -20, 20, 1],
  ['beinVN', 'Bein vorn nah', -45, 45, 1],
  ['beinVF', 'Bein vorn fern', -45, 45, 1],
  ['beinHN', 'Bein hinten nah', -45, 45, 1],
  ['beinHF', 'Bein hinten fern', -45, 45, 1],
];
let drehenLeiste = false;
function drehenAufbauen(): void {
  leiste.innerHTML = `<h2>Drehen</h2><p>Kopf und Körper rundherum. Die Schlüssel sind Florians Ansichten: Front 0°, Logo 15°, Seite 90°; negativ ist gespiegelt.</p><div id="regler"></div>
  <h3>Anzeige</h3>
  <label class="regler"><span>Flüssig</span><input id="glaette" type="range" min="0" max="20" step="0.5" value="${buehne.glaette}"/><span id="glaette-zahl"></span></label>
  <div class="reihe"><button class="knopf" id="ruhe">Logo-Pose</button><button class="knopf" id="leiste-an">Drehleiste</button></div>`;
  const gl = leiste.querySelector<HTMLInputElement>('#glaette')!;
  const glz = leiste.querySelector('#glaette-zahl')!;
  const glSetzen = () => {
    buehne.glaette = Number(gl.value);
    glz.textContent = buehne.glaette ? String(buehne.glaette) : 'aus';
  };
  gl.addEventListener('input', glSetzen);
  glSetzen();
  const box = leiste.querySelector('#regler')!;
  for (const [k, name, min, max, schritt] of REGLER) {
    const z = document.createElement('label');
    z.className = 'regler';
    z.innerHTML = `<span>${name}</span><input type="range" min="${min}" max="${max}" step="${schritt}" value="${drehPose[k]}"/><span></span>`;
    const ein = z.querySelector('input')!;
    const zahl = z.querySelectorAll('span')[1]!;
    const setze = () => {
      drehPose[k] = Number(ein.value);
      zahl.textContent = String(Math.round(drehPose[k] * 100) / 100);
    };
    ein.addEventListener('input', setze);
    setze();
    box.appendChild(z);
  }
  leiste.querySelector('#ruhe')!.addEventListener('click', () => {
    Object.assign(drehPose, RUHE);
    drehenAufbauen();
  });
  const la = leiste.querySelector('#leiste-an')!;
  la.classList.toggle('an', drehenLeiste);
  la.addEventListener('click', () => {
    drehenLeiste = !drehenLeiste;
    la.classList.toggle('an', drehenLeiste);
  });
}

function drehenZeichnen(): void {
  if (drehenLeiste) {
    // Drehleiste: 12 Köpfe im Abstand von 30°
    buehne.einpassen(-200, 0, 12 * 1400 + 200, 3400, 0.02);
    buehne.anfangen();
    for (let k = 0; k < 12; k++) {
      const p: Pose = { ...drehPose, theta: -180 + k * 30 + 15, x: 800 + k * 1400 };
      figur.boden(p, 0);
      buehne.figur(figur.zeichenteile(p));
      const q: Pose = { ...drehPose, psi: -180 + k * 30 + 90, theta: -180 + k * 30 + 90 + 15 - 90, x: 800 + k * 1400, y: 1180 + 1750 };
      figur.boden(q, 0);
      buehne.figur(figur.zeichenteile({ ...q, y: q.y + 1750 }));
    }
    buehne.abschliessen();
    return;
  }
  buehne.einpassen(100, 0, 1830, BODEN_Y + 40, 0.06, 60);
  buehne.anfangen();
  const p = { ...drehPose };
  figur.boden(p, 0);
  buehne.figur(figur.zeichenteile(p));
  const c = buehne.ctx;
  c.strokeStyle = 'rgba(31,26,23,0.16)';
  c.lineWidth = 2 / buehne.kamera.massstab;
  c.beginPath();
  c.moveTo(-2000, BODEN_Y);
  c.lineTo(4000, BODEN_Y);
  c.stroke();
  buehne.abschliessen();
}

// ---- Reiter -------------------------------------------------------------------------------------------------------------
function reiterSetzen(r: Reiter): void {
  reiter = r;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#reiter button')) b.setAttribute('aria-selected', String(b.dataset['reiter'] === r));
  if (r === 'drehen') drehenAufbauen();
  else leiste.innerHTML = `<h2>${r}</h2><p>Kommt gleich.</p>`;
  const u = new URL(location.href);
  u.searchParams.set('reiter', r);
  history.replaceState(null, '', u);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#reiter button')) b.addEventListener('click', () => reiterSetzen(b.dataset['reiter'] as Reiter));
reiterSetzen(reiter);

let letzte = performance.now();
function bild(jetzt: number): void {
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  void dt;
  if (reiter === 'drehen') drehenZeichnen();
  hud.textContent = '';
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);

// Test-Haken
(window as unknown as { __ozzy: unknown }).__ozzy = { figur, drehPose, buehne };
