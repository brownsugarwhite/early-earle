// Zwischenschlüssel des Kopfs, aus Florians Übermalungen gebaut (Kopfkoordinaten wie die Schlüssel aus den Vorlagen).
// bartB bei 67°: Florians Übermalung vom 18.11. (docs/look/ozzy-figur/vorlagen/ozzy_kopf67_florian.png), erzeugt mit
// scripts/ozzy-figur/zwischen67/ (Abgleich auf die Darstellung, Kontur der fernen Bartkante, Bézier-Stücke angepasst).
import type { Form } from '../form';
import type { TeilName } from './import';

export const ZWISCHEN: { teil: TeilName; w: number; form: Form }[] = [
  {
    teil: 'bartB',
    w: 67,
    form: [
      { p: [17.22, 31.54], i: [15.58, 24], o: [29.02, 45.46] },
      { p: [43.42, 83.47], i: [43.42, 83.47], o: [68.34, 68.16] },
      { p: [78.8, 15.92], i: [77.89, 42.87], o: [81.82, 21.32] },
      { p: [87.86, 31.95], i: [83.9, 26.96], o: [104.83, 12.17] },
      { p: [91.71, -39.23], i: [101.42, -23.34], o: [94.21, -37.31] },
      { p: [98.55, -29.3], i: [100.06, -30.99], o: [100.72, -31.29] },
      { p: [70.28, -96.48], i: [108.49, -45.3], o: [70.28, -96.48] },
      { p: [72.14, -106.15], i: [64.02, -101.62], o: [72.14, -106.15] },
      { p: [13.5, -124.18], i: [53.84, -132.1], o: [12.27, -54.41] },
    ],
  },
];
