/**
 * Ozzy, S13 (liquid drop, Idee 2): Regler als Tropfen auf einem Faden. Der Knopf eines Reglers dehnt sich beim Ziehen in Zugrichtung (je
 * schneller, desto mehr, und dabei schmaler, wie ein Tropfen gleichen Inhalts) und schwingt beim Loslassen nach. Eine Feder je Regler, solange
 * er sich bewegt; sie setzt `--dehn-x` und `--dehn-y` am Regler, die CSS skaliert damit den Knopf (`ozzy.css`).
 */

type Feder = { x: number; v: number; ziel: number; wert: number; t: number; zieht: boolean };

const federn = new Map<HTMLInputElement, Feder>();
let laeuft = false;
let zuletzt = 0;

/** so schnell (Bildpunkte je Sekunde) muss der Knopf sein, damit er sich um seine ganze Breite dehnt */
const VOLL = 900;

function schritt(jetzt: number): void {
  const dt = Math.min(0.05, Math.max(0, (jetzt - zuletzt) / 1000));
  zuletzt = jetzt;
  for (const [el, f] of federn) {
    // steht der Zeiger still, lässt das Dehnen nach
    if (f.zieht && jetzt - f.t > 60) f.ziel = 1 + (f.ziel - 1) * Math.exp(-dt / 0.08);
    if (!f.zieht) f.ziel = 1;
    // beim Ziehen fast ohne Nachschwingen hinterher, losgelassen mit Nachschwingen zurück
    const w = 2 * Math.PI * (f.zieht ? 9 : 5.5);
    const z = f.zieht ? 0.9 : 0.28;
    // in kleinen Schritten (sonst wird die Feder bei ruckelnden Bildern unstet)
    for (let rest = dt; rest > 1e-6; rest -= 1 / 240) {
      const h = Math.min(rest, 1 / 240);
      f.v += (-w * w * (f.x - f.ziel) - 2 * z * w * f.v) * h;
      f.x += f.v * h;
    }
    const sx = Math.min(1.95, Math.max(0.6, f.x));
    el.style.setProperty('--dehn-x', sx.toFixed(3));
    el.style.setProperty('--dehn-y', (1 / Math.sqrt(sx)).toFixed(3));
    if (!f.zieht && Math.abs(f.x - 1) < 0.002 && Math.abs(f.v) < 0.02) {
      el.style.removeProperty('--dehn-x');
      el.style.removeProperty('--dehn-y');
      federn.delete(el);
    }
  }
  if (federn.size) requestAnimationFrame(schritt);
  else laeuft = false;
}

function los(): void {
  if (laeuft) return;
  laeuft = true;
  zuletzt = performance.now();
  requestAnimationFrame(schritt);
}

/** einmal beim Start: alle Regler der Seite (auch später angelegte) */
export function reglerTropfen(): void {
  document.addEventListener(
    'input',
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.type !== 'range') return;
      const jetzt = performance.now();
      const wert = Number(el.value);
      let f = federn.get(el);
      if (!f) {
        f = { x: 1, v: 0, ziel: 1, wert, t: jetzt, zieht: true };
        federn.set(el, f);
      }
      const dt = Math.max(1, jetzt - f.t) / 1000;
      const spanne = Math.max(1e-9, Number(el.max || 100) - Number(el.min || 0));
      const pxProS = ((Math.abs(wert - f.wert) / spanne) * el.clientWidth) / dt;
      f.ziel = 1 + Math.min(0.9, pxProS / VOLL);
      f.wert = wert;
      f.t = jetzt;
      f.zieht = true;
      los();
    },
    true,
  );
  const loslassen = (): void => {
    for (const f of federn.values()) f.zieht = false;
    if (federn.size) los();
  };
  document.addEventListener('change', loslassen, true);
  document.addEventListener('pointerup', loslassen, true);
}

/** für Proben: wie weit der Knopf eines Reglers gerade gedehnt ist (1 = rund) */
export function reglerDehnung(el: HTMLInputElement): number {
  return federn.get(el)?.x ?? 1;
}
