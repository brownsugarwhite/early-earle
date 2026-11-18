 
// Gegenprüfung Frage 6: Spiegelzuordnung in hautAus (über gerundete Lagen, 1e-3) bei Punkten sehr nahe der Mittelebene / sehr nahe beieinander
import { hautAus } from '../../../../../../packages/shape/src/dicht/kurven';
// Oktaeder, dessen zwei seitliche Spitzen (±z) fast auf der Mittelebene liegen
for (const z of [1, 0.01, 0.001, 0.0004, 0]) {
  const pos = [10, 0, 0, -10, 0, 0, 0, 10, 0, 0, -10, 0, 0, 0, z, 0, 0, -z];
  const tri = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];
  const h = hautAus(pos, tri);
  console.log(`Dicke z = ±${z}: Spiegel der beiden Spitzen (Punkte 4, 5) = ${h.spiegel[4]}, ${h.spiegel[5]} (richtig: 5, 4)`);
}
// zwei verschiedene Punkte näher als 1e-3 beieinander (z. B. zwei Proben, die auf eine Ecke fallen)
{
  const pos = [10, 0, 0, -10, 0, 0, 0, 10, 0, 0, -10, 0, 0, 0, 5, 0, 0, -5, 3, 3, 2.0001, 3, 3, 2.0004, 3, 3, -2.0001, 3, 3, -2.0004];
  const tri = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5, 6, 7, 0, 8, 9, 0];
  const h = hautAus(pos, tri);
  console.log(`zwei Punkte 0,0003 auseinander (6, 7) und ihre Spiegelbilder (8, 9): Spiegel = ${h.spiegel[6]}, ${h.spiegel[7]}, ${h.spiegel[8]}, ${h.spiegel[9]} (richtig: 8, 9, 6, 7)`);
}
