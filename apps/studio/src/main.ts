// Studio, der Editor (index.html). Zusammenbau-Datei: Nur die Integration ändert sie (Plan 2.2).
// M0: Papier, Titel „Studio“ in Lobster, leere Bühne. M1.Z hängt den Betrachter mit Ozzys Kopf und der Leiste θ ein, dazu
// pruefhaken.ts; M3.Z die Werkbank (Sitzung, Bühne, Werkzeuge, Leiste) und befehle/alle.ts; jede Etappe danach ihre Teile.
import './look/liquid-drop.css';
import { lobsterLaden } from './look/schrift';

// Proben nehmen ihr erstes Bild erst nach data-schrift, sonst stünde der Titel noch ohne Lobster da.
lobsterLaden().then(
  () => {
    document.documentElement.dataset.schrift = 'geladen';
  },
  (e: unknown) => {
    document.documentElement.dataset.schrift = 'fehlt';
    console.error('Lobster nicht geladen', e);
  },
);
