// Wesen-Editor 2, Beweis 4 (14.10.2026): Form-Hilfen für Prüfwesen. Spanten für eine Kastenschnauze: Spanten brauchen die
// Knotenstruktur der Front (gleiche Knotenzahl, Reihenfolge oben → unten); hier entstehen Kasten- und Rundprofile mit n
// Knoten in normierten Koordinaten (Breite 0 … 1 ab der Achse, Höhe 0 … 1). Ecken des Kastens sind Knoten mit Härte →
// Längsfalten. Dazu der Drachenhals (Beweis 2): die Front-Silhouette in einem Höhenband verbreitern.

import type { Knoten, Profil } from '../profil';
import type { Dokument, Spant } from '../dokument';

const o = { x: 0, y: 0 };

/** Kastenprofil mit n ≥ 4 Knoten: oben Achse, Ecke oben rechts, n − 4 Knoten auf der rechten Seite, Ecke unten rechts, unten Achse. */
export function kastenProfil(n: number, haerte: number, vorlage: Profil): Profil {
  const knoten: Knoten[] = [{ p: { x: 0, y: 1 }, ein: o, aus: o, art: 'glatt' }];
  knoten.push({ p: { x: 1, y: 1 }, ein: o, aus: o, art: 'ecke', haerte });
  const seite = Math.max(0, n - 4);
  for (let i = 1; i <= seite; i++) knoten.push({ p: { x: 1, y: 1 - i / (seite + 1) }, ein: o, aus: o, art: 'glatt' });
  knoten.push({ p: { x: 1, y: 0 }, ein: o, aus: o, art: 'ecke', haerte });
  knoten.push({ p: { x: 0, y: 0 }, ein: o, aus: o, art: 'glatt' });
  return { ...vorlage, knoten } as Profil;
}

/** Rundes Profil (Halbellipse) mit n Knoten und glatten Griffen, gleiche Struktur wie der Kasten. */
export function rundProfil(n: number, vorlage: Profil): Profil {
  const knoten: Knoten[] = [];
  for (let i = 0; i < n; i++) {
    const th = (Math.PI * i) / (n - 1);
    const p = { x: Math.sin(th), y: (1 + Math.cos(th)) / 2 };
    // Tangente der Ellipse: (cos θ, −sin θ / 2), Grifflänge ein Drittel des Bogens zum Nachbarn
    const l = (Math.PI / (n - 1)) / 3;
    const t = { x: Math.cos(th) * l, y: (-Math.sin(th) / 2) * l };
    const erster = i === 0;
    const letzter = i === n - 1;
    knoten.push({ p, ein: erster ? o : { x: -t.x, y: -t.y }, aus: letzter ? o : t, art: 'glatt' });
  }
  return { ...vorlage, knoten } as Profil;
}

/**
 * Spanten einer Kastenschnauze: Kasten von `fVorn` bis `fHinten` (Härte der Ecken), rund bei `fRund`; dahinter gilt
 * die Front als Hauptspant. Die Front gibt die Knotenzahl vor.
 */
export function kastenSpanten(front: Profil, fVorn: number, fHinten: number, fRund: number, haerte = 0.85): Spant[] {
  const n = front.knoten.length;
  const kasten = kastenProfil(n, haerte, front);
  return [
    { f: fVorn, profil: kasten },
    { f: fHinten, profil: kasten },
    { f: fRund, profil: rundProfil(n, front) },
  ];
}

/**
 * Drachenhals (Beweis 2, Lage „hals“): Die Front-Silhouette wird im Höhenband `yVon … yBis` (Welt) um `faktor` verbreitert
 * (Knoten samt Griffen). Der Langhals-Bogen hat einen Giraffenhals (halbe Breite ≈ 2 % der Höhe); ein Maul, das den Hals
 * hinabläuft, braucht Platz für zwei Taschen. Die Top-Silhouette gibt am Hals ohnehin die Kopfbreite vor.
 */
export function halsVerbreitern(dok: Dokument, faktor: number, yVon: number, yBis: number): Dokument {
  const sk = dok.skalierung;
  const im = (k: Knoten) => k.p.y * sk > yVon && k.p.y * sk < yBis;
  const front = { ...dok.profile.front, knoten: dok.profile.front.knoten.map((k) => (im(k) ? { ...k, p: { x: k.p.x * faktor, y: k.p.y }, ein: { x: k.ein.x * faktor, y: k.ein.y }, aus: { x: k.aus.x * faktor, y: k.aus.y } } : k)) } as Profil;
  return { ...dok, profile: { ...dok.profile, front } };
}
