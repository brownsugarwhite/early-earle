// Form zuerst (10.11.2026, Gegenprüfung Schritt G4): Verfeinern im Zug ganz im Hintergrund. Das Fenster schickt die Haut (flach) und
// die Loops; der Worker verdichtet, bettet die neuen Punkte auf der alten Haut ein, baut die Zeilen der Matrix und zerlegt sie
// (`verfeinern.ts`). Zurück kommen das feinere Netz und die Zerlegung; das Fenster wechselt sie ein, sobald sie da sind. (Seit dem
// 08.11. lief hier nur die Zerlegung, `zerlegen.worker.ts`.) Ein Fehler kommt als Meldung zurück, damit der Zug nicht hängt.
// Zweiter Auftrag (G4.3): das Aufräumen nach dem Loslassen, verdeckt bis die neue Haut steht. Mit Vorstufe (G4.4, nach Kante,
// Löschen, neuem Loop) kommt zuerst ein Zwischenstand (die gesetzte Haut auf demselben Netz), dann das Ergebnis.
import { type AufraeumAuftrag, type VerfeinerAuftrag, aufgeraeumtZumUebergeben, aufraeumen, felderZumUebergeben, verfeinern, zwischenZumUebergeben } from './verfeinern';

self.onmessage = (e: MessageEvent<VerfeinerAuftrag | AufraeumAuftrag>) => {
  const ziel = self as unknown as Worker;
  const auftrag = e.data;
  try {
    if ('art' in auftrag) {
      // nach dem Loslassen (G4.3): verdichten, setzen bis zur Ruhe, nachverfeinern, zerlegen; mit Vorstufe erst der Zwischenstand
      const ergebnis = aufraeumen(auftrag, (z) => ziel.postMessage(z, zwischenZumUebergeben(z) as ArrayBuffer[]));
      ziel.postMessage(ergebnis, aufgeraeumtZumUebergeben(ergebnis) as ArrayBuffer[]);
    } else {
      const ergebnis = verfeinern(auftrag);
      ziel.postMessage(ergebnis, felderZumUebergeben(ergebnis) as ArrayBuffer[]);
    }
  } catch (fehler) {
    ziel.postMessage({ id: auftrag.id, fehler: fehler instanceof Error ? `${fehler.message}` : String(fehler) });
  }
};
