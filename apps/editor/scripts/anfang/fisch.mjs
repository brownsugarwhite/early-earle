// Testform der Probe „Anfang einer Form“: ein Fisch mit runden Bögen und einer Schwanzflosse aus Ecken, für ein Fenster von
// 1200 × 800 (Mitte 600, 400). Anker in CSS-Pixeln, Griffe relativ zum Anker (wie Illustrator: ein = zur vorigen Linie).
const s = 1.25;
const um = (x, y) => [600 + (x - 410) * s, 400 + (y - 300) * s];
const roh = [
  [230, 300, [0, 60], [0, -60]],
  [380, 200, [-80, 0], [80, 0]],
  [520, 270, [-40, -25], [25, -10]],
  [590, 220],
  [568, 300],
  [590, 380],
  [520, 330, [25, 10], [-40, 25]],
  [380, 400, [80, 0], [-80, 0]],
];
export const FISCH = roh.map(([x, y, ein, aus]) => {
  const [px, py] = um(x, y);
  return { x: px, y: py, ein: ein ? [ein[0] * s, ein[1] * s] : [0, 0], aus: aus ? [aus[0] * s, aus[1] * s] : [0, 0] };
});
