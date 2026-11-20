// Vertrag: was `Laufzeit.bild` und `Laufzeit.auswerten` zurückgeben (Plan 4.2). Die Felder gehören der Laufzeit und gelten bis zum
// nächsten Aufruf; wer sie länger braucht, kopiert sie.

export interface BildStand {
  anker: Float64Array;          // je Anker 6 Zahlen absolut, nach allen Schritten (Bild)
  ruhe: Float64Array;           // je Anker 6 Zahlen vor den Knochen (Schritt 12), für Rückrechnung und Zwiebelhaut
  knochen: Float64Array;        // je Knochen 6 Zahlen (2 × 3-Matrix in der Welt)
  regler: Float64Array;         // gezeigte Werte
  marken: Float64Array;         // Wächter: je Marke Teil, Stück, Art
}
