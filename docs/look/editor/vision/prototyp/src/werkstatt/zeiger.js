// Zeiger als kleinste Zeichen (SVG, weiß mit dunklem Saum): Sie sagen, was ein Zug an dieser Stelle tun wird.
// drehen (Leere und Haut), greifen (Punkt, Griff), ziehen (während des Zugs), perle (Linie: Doppelklick setzt einen Punkt),
// stift (rechte Taste, ⌥, P, Pencil), schwenken (Leertaste, mittlere Taste), linse (durchs Bullauge schauen), passer (Platte schieben).

const saum = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#0b0f14" stroke-width="4" opacity="0.55">${inhalt}</g><g stroke="#ffffff" stroke-width="1.6">${inhalt}</g></g></svg>`;
const url = (svg, x, y, ersatz) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${x} ${y}, ${ersatz}`;

const GLYPHEN = {
  drehen: url(saum('<path d="M10.2 9.6 A8 8 0 1 0 21.8 9.6"/><path d="M21.8 9.6 l-0.6 4.2 M21.8 9.6 l-4.1 -0.4"/><circle cx="16" cy="16" r="1.2" fill="#fff"/>'), 16, 16, 'grab'),
  greifen: url(saum('<circle cx="16" cy="16" r="6.5"/>'), 16, 16, 'grab'),
  ziehen: url(saum('<circle cx="16" cy="16" r="4" fill="#fff"/>'), 16, 16, 'grabbing'),
  perle: url(saum('<circle cx="16" cy="16" r="2.4" fill="#fff"/><path d="M16 6 v4 M16 22 v4 M6 16 h4 M22 16 h4"/>'), 16, 16, 'crosshair'),
  stift: url(saum('<path d="M7 25 l2.4 -7.2 L21.5 5.7 l4.8 4.8 L14.2 22.6 Z"/><path d="M7 25 l4 -1.6"/>'), 7, 25, 'crosshair'),
  schwenken: url(saum('<path d="M16 5 v22 M5 16 h22"/><path d="M13 8 l3 -3 l3 3 M13 24 l3 3 l3 -3 M8 13 l-3 3 l3 3 M24 13 l3 3 l-3 3"/>'), 16, 16, 'move'),
  linse: url(saum('<circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="1.4" fill="#fff"/>'), 16, 16, 'pointer'),
  passer: url(saum('<circle cx="16" cy="16" r="6"/><path d="M16 5 v22 M5 16 h22"/>'), 16, 16, 'move'),
  zeigen: 'default',
};

export function zeigerSetzen(el, art) {
  const g = GLYPHEN[art] || GLYPHEN.zeigen;
  if (el._zeiger !== g) {
    el.style.cursor = g;
    el._zeiger = g;
  }
}

// dieselben Zeichen als Pfade für die Geistermaus (in die Überlagerung gezeichnet)
export const GLYPH_PFADE = {
  drehen: ['M10.2 9.6 A8 8 0 1 0 21.8 9.6', 'M21.8 9.6 l-0.6 4.2 M21.8 9.6 l-4.1 -0.4'],
  stift: ['M7 25 l2.4 -7.2 L21.5 5.7 l4.8 4.8 L14.2 22.6 Z', 'M7 25 l4 -1.6'],
  schwenken: ['M16 5 v22 M5 16 h22', 'M13 8 l3 -3 l3 3 M13 24 l3 3 l3 -3 M8 13 l-3 3 l3 3 M24 13 l3 3 l-3 3'],
};
