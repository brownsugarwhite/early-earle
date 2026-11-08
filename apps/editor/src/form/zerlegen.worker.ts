// Form zuerst (08.11.2026), Verfeinern im Zug: Zerlegung im Hintergrund. Das Fenster schickt die Zeilen der Matrix eines feineren
// Netzes (flach), der Worker zerlegt sie und schickt die Zerlegung als Daten zurück; das Fenster wechselt sie ein, sobald sie da ist.
import { type FlacheZeilen, type ZerlegungsDaten, zeilenAusFlach, zerlegungsDaten } from '@ee/shape/dicht';

type Auftrag = { id: number; systeme: { n: number; flach: FlacheZeilen; daempfung: number }[] };

self.onmessage = (e: MessageEvent<Auftrag>) => {
  const { id, systeme } = e.data;
  const t0 = performance.now();
  const daten: ZerlegungsDaten[] = systeme.map((s) => zerlegungsDaten(s.n, zeilenAusFlach(s.flach), s.daempfung));
  const transfer = daten.flatMap((d) => [d.perm.buffer, d.Lp.buffer, d.Li.buffer, d.Lx.buffer]);
  (self as unknown as Worker).postMessage({ id, daten, ms: performance.now() - t0 }, transfer);
};
