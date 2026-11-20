// Lobster, die Schrift von Studio (Konzept 9.3; Datei in assets/fonts/lobster). Geladen über FontFace statt @font-face, damit
// jede Seite weiß, wann sie steht: Titel, Text als Figur und später die Glyphentabelle (text/schriftLesen.ts liest dieselbe Datei).

/** Adresse der Schriftdatei; beim Bauen legt Vite sie mit Prüfsumme im Namen in den Stand. */
export const LOBSTER_URL = new URL('../../../../assets/fonts/lobster/Lobster-Regular.ttf', import.meta.url).href;

/** Schriftfamilie für CSS und Canvas, mit dem Rückfall des Vorbilds */
export const LOBSTER = "'Lobster', Georgia, serif";

let geladen: Promise<FontFace> | null = null;

/** Lädt Lobster einmal je Seite und trägt sie in document.fonts ein; danach gilt font-family 'Lobster' überall auf der Seite. */
export function lobsterLaden(): Promise<FontFace> {
  geladen ??= (() => {
    const schrift = new FontFace('Lobster', `url(${JSON.stringify(LOBSTER_URL)}) format('truetype')`, {
      weight: '400',
      style: 'normal',
      display: 'block',
    });
    document.fonts.add(schrift);
    return schrift.load();
  })();
  return geladen;
}
