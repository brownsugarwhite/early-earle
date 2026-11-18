// Test 3: Körper dreht von vorn (Front.svg, 0°) in die Seite (Logo, 90°), Kopf schaut zu uns. Beine als Punkte im Raum (Lage aus beiden Ansichten).
import { writeFileSync } from 'node:fs';
import { DATEIEN, ladeAnsicht, verschiebe, zuPfad, morph, VORLAGEN } from './morph.mjs';
const V = {}; for (const [k, f] of Object.entries(DATEIEN)) V[k] = ladeAnsicht(VORLAGEN, f);
const F = V.front.els, L = V.logo.els;
const DYF = 2.09; // Front-Boden 411.11 → Logo-Boden 413.2
const cF = 154.4, cL = 184.1; // Mitte der Bohne (Kasten) je Ansicht
const relF = (A) => verschiebe(A, -cF, DYF), relL = (A) => verschiebe(A, -cL, 0);
const mitte = (A) => { let x = 0; for (const a of A) x += a.p[0]; return x / A.length; };
// Beine: Ozzys rechte Beine sind in der Front links. Zuordnung Front-Index ↔ Logo-Index
const BEINE = [
  { n: 'RV', f: 6, l: 5, wf: 8, wl: 14 },    // rechts vorn: immer nah, Fenster immer
  { n: 'RH', f: 7, l: 6, wf: null, wl: 7 },  // rechts hinten: vorn verdeckt, in der Seite nah
  { n: 'LV', f: 5, l: 4, wf: 10, wl: null }, // links vorn: vorn nah, in der Seite fern
  { n: 'LH', f: 4, l: 3, wf: null, wl: null },
];
const KOPF = [0, 1, 9, 11, 12, 13, 14].map(i => F[i]); // Front-Kopf (Ohren, Masken, Bart, Nase)
const kopfXF = 166 - cF, kopfXL = 252.9 - cL; // Lage des Kopfs zur Bohnenmitte
function bild(psi) {
  const t = psi / 90, s = Math.sin(psi * Math.PI / 180), c = Math.cos(psi * Math.PI / 180);
  let out = '';
  // Bohne: Winkel/Länge-Morph, Fortschritt geglättet
  const bohne = morph(relF(F[2].form), relL(L[1].form), t, 'W');
  // Beine: Mitte als Punkt im Raum (x vorn = X, x seitlich = Z), Form gemorpht und an die Mitte gesetzt
  const beine = BEINE.map(b => {
    const Af = relF(F[b.f].form), Al = relL(L[b.l].form);
    const X = mitte(Af), Z = mitte(Al), x = X * c + Z * s;
    const form = morph(verschiebe(Af, -X, 0), verschiebe(Al, -Z, 0), t, 'W');
    const lat = b.n[0] === 'R' ? -1 : 1, vorn = b.n[1] === 'V' ? 1 : -1;
    const nah = 70 * vorn * c + 50 * (-lat) * s; // Nähe zur Kamera
    return { ...b, x, form: verschiebe(form, x, 0), nah };
  }).sort((a, b) => a.nah - b.nah);
  // Schwanz: Punkt im Raum (vorn verdeckt hinter der Bohne, in der Seite am Hinterteil), Form fest wie im Logo, mit weißem Inneren
  { const SA = relL(L[0].form), SI = relL(L[2].form); const Z = mitte(SA), x = Z * s; const dx = x - Z;
    out += `<path d="${zuPfad(verschiebe(SA, dx, 0))}"/><path d="${zuPfad(verschiebe(SI, dx, 0))}" fill="#fff"/>`; }
  for (const b of beine) out += `<path d="${zuPfad(b.form)}"/>`;
  out += `<path d="${zuPfad(bohne)}"/>`;
  // Fenster der nahen Beine: RV morpht; LV verschwindet, RH erscheint (hier: Platzhalter durch Kippen um die Beinmitte, im Plan: gleitet hinter den Gipsrand)
  for (const b of beine) {
    const Bf = b.wf != null ? relF(F[b.wf].form) : null, Bl = b.wl != null ? relL(L[b.wl].form) : null;
    const Af = relF(F[b.f].form), Al = relL(L[b.l].form); const X = mitte(Af), Z = mitte(Al);
    let w = null;
    if (Bf && Bl) w = verschiebe(morph(verschiebe(Bf, -X, 0), verschiebe(Bl, -Z, 0), t, 'W'), b.x, 0);
    else if (Bf || Bl) { const B = Bf ? verschiebe(Bf, -X, 0) : verschiebe(Bl, -Z, 0); const sichtbar = Bf ? Math.max(0, 1 - t * 1.6) : Math.max(0, t * 1.6 - 0.6); if (sichtbar > 0.02) { const m = mitte(B); w = verschiebe(B.map(a => ({ p: [m + (a.p[0] - m) * sichtbar, a.p[1]], i: [m + (a.i[0] - m) * sichtbar, a.i[1]], o: [m + (a.o[0] - m) * sichtbar, a.o[1]] })), b.x, 0); } }
    if (w) out += `<path d="${zuPfad(w)}" fill="#fff"/>`;
  }
  // Kopf schaut zu uns: Front-Kopf an der Halsstelle (Punkt im Raum)
  const kx = kopfXF * c + kopfXL * s;
  for (const e of KOPF) out += `<path d="${zuPfad(verschiebe(relF(e.form), kx - kopfXF, 0))}" fill="${e.weiss ? '#fff' : '#000'}"/>`;
  return out;
}
const PS = [0, 22.5, 45, 67.5, 90];
const W = 430, H = 440;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * PS.length * 0.9}" height="${(H + 30) * 0.9}" viewBox="0 -15 ${W * PS.length} ${H + 30}"><rect x="0" y="-15" width="100%" height="100%" fill="#fff"/>`;
PS.forEach((p, k) => { svg += `<g transform="translate(${k * W + 200},0)">${bild(p)}</g><text x="${k * W + 200}" y="${H + 8}" font-size="16" font-family="Helvetica" text-anchor="middle" fill="#888">${p}°</text>`; });
svg += '</svg>';
writeFileSync('koerper-drehung.svg', svg);
