// Gassirunde, das Spiel. Schlank nach Plan 2.3 Nr. 4: höchstens 300 Zeilen Code ohne Tests und Konfiguration; kein Store, kein
// editor/ der Laufzeit, kein React, kein opentype.js (test/keinSpielcode.test.ts). M0: leere Fläche und Titel in Lobster.
// M6.2 baut Laden über den Server, Eingabe, Hülle und Live (src/{main,laden,eingabe,huelle,live}.ts).
const LOBSTER = new URL('../../../assets/fonts/lobster/Lobster-Regular.ttf', import.meta.url).href;

const schrift = new FontFace('Lobster', `url(${JSON.stringify(LOBSTER)}) format('truetype')`, { display: 'block' });
document.fonts.add(schrift);
// Proben nehmen ihr erstes Bild erst nach data-schrift, wie im Editor (apps/studio/src/main.ts)
schrift.load().then(
  () => {
    document.documentElement.dataset.schrift = 'geladen';
  },
  (e: unknown) => {
    document.documentElement.dataset.schrift = 'fehlt';
    console.error('Lobster nicht geladen', e);
  },
);

const flaeche = document.querySelector<HTMLCanvasElement>('#flaeche');

/** Die Fläche in Bildpunkten des Geräts */
function anpassen(): void {
  if (!flaeche) return;
  const dichte = window.devicePixelRatio || 1;
  flaeche.width = Math.round(flaeche.clientWidth * dichte);
  flaeche.height = Math.round(flaeche.clientHeight * dichte);
}

window.addEventListener('resize', anpassen);
anpassen();
