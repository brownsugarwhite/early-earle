/**
 * Schalter des Werks (Ozzy, Phase 3). Das Werk (`../form/werk.ts`) liest seine Schalter beim Laden aus der Adresse, wie das
 * Prüffenster `kurven.html`. Ozzy rechnet wie dessen Standardversion (`?gewichte=geometrie`) und behält im Browser nichts (das
 * Prüffenster auf demselben Port behält dort seine Formen; Ozzy soll ihm nichts überschreiben). Dieses Modul muss in `main.ts` als
 * erstes geladen werden, vor allem, was das Werk lädt.
 */
const p = new URLSearchParams(location.search);
let anders = false;
for (const [k, v] of [
  ['gewichte', 'geometrie'],
  ['behalten', '0'],
] as const) {
  if (p.has(k)) continue;
  p.set(k, v);
  anders = true;
}
if (anders) history.replaceState(history.state, '', `${location.pathname}?${p.toString()}${location.hash}`);

export {};
