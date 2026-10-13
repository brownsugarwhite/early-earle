# Phase 0, Beweis 5: Feuer, Gas, Fell-Blob (14.10.2026, nachts)

> Plan: [`docs/plans/2026-10-13-wesen-editor-2.md`](../plans/2026-10-13-wesen-editor-2.md), Abschnitte 7, 8.4–8.6 und 11.1 (5). Code: Klinge `packages/shape/src/kern/klinge.ts`, Material `packages/render/src/creature2/material/feuer.ts`, Editor-Tab „kern“ mit Chips „Stil: fest · feuer · gas · fell“ (`apps/editor/src/kern/kernBau.ts`, URL `&stil=feuer`). Bilder und 3-s-Schleifen `docs/progress/editor/kern-stil-kugel-<stil>.png|-2.png|.webm` (`STIL=1 node apps/editor/scripts/kern-bilder.mjs kugel`). Test `klinge.test.ts`. Bögen: `substance gas:fire.png` (Stufe 7: zweite Reihe Gas, dritte Reihe Feuer, jeweils die mittlere Figur), `musterTfell:struktur:flügel.png` (Fell-Blobs, Tigerreihe).

Kriterium des Plans: je Stufe 7 des Bogens als Standbild und 3-s-Schleife auf einer Kugel-Vorlage (ohne Maul); Florians Urteil „so geht es weiter“ für mindestens zwei von drei.

## Was gebaut ist

1. **Klinge als Käfig** (Plan 7): Röhre 6 × 8 (Büschel 4 × 8) mit Kappen, Ringe mit Profil (Flamme, Zacke, Tropfen, Schwade: Breite nach Höhe, Spitze 0), Linsenquerschnitt (Dicke 35–50 % der Breite), Spitze als scharfer Eckpunkt, unterer Ring im Körper. **Alle Klingen eines Wesens teilen Topologie, Unterteilungsmatrix und Löser**; je Klinge nur Ziele: 7 Zungen lösen und fein rechnen in 1,2 ms, 260 Büschel in 3 ms.
2. **Ansatz auf der Haut**: Fußpunkt und Normale aus dem feinen Netz (Schwerpunkt-Normale, für Blobs ausreichend), Achse nach oben gekämmt (0 = Normale, 1 = Lot), Querrichtung tangential, Phase je Klinge. Verteilungen: Zungen am Scheitel (eine große Hauptzunge, Kranz bei Polwinkel 28–34°), Büschel über die ganze Haut (Fibonacci, 260 Stück, 15 % der Höhe, nach oben gekämmt), abgelöste Flämmchen/Bläschen über dem Scheitel, die in 3 s aufsteigen und schrumpfen.
3. **Wehen als Käfig-Pose** (Plan 7, hier auf dem Käfig statt im Vertex-Shader): jeder Ring dreht um den Fuß in Dickenrichtung mit t² und Phase, zwei Sinus-Anteile; S-Biegung der Mittellinie. Im Editor ≈ 14 Bilder je Sekunde (Klingen je Bild neu gelöst, Dreiecke neu, Lagen in die Puffer geschrieben).
4. **Feuer/Gas-Material** (`feuer.ts`, Plan 8.5/8.6): unbeleuchtet; Bandwert aus Höhe im Körper, seitlichem Abstand zur Flammenachse im Blickraum (die Bänder schachteln sich um die Achse wie gezeichnet) und nach oben strömendem Rauschen (zwei Oktaven), in vier Bänder posterisiert; Feuer harte Grenzen und schnelles Strömen, Gas weiche Grenzen (hart → weich) und langsames Strömen; Paletten Stufe 7 (Feuer `#d8432c → #f0812c → #f7bd3a → #fde9a0`, Gas `#3f8f88 → #58b995 → #a6dd62 → #e3f59c`); Papierkorn; Schlitzaugen mit Blinzeln. Körper und Klingen tragen dasselbe Material.
5. **Fell**: Körper mit dem Earle-Material (Tiger-Palette), 260 Büschel-Klingen erben die Deskriptoren ihres Fußpunkts (Streifen laufen über die Büschel), leichter Wind.

## Ergebnis

Standbilder (`kern-stil-kugel-feuer.png`, `-gas.png`, `-fell.png`, zweites Bild nach 3 s jeweils `-2.png`) und 3-s-Schleifen (`.webm`, Playwright-Aufnahme des Editors):

| Stil | Was zu sehen ist | Gegen den Bogen |
|---|---|---|
| **Feuer** | oranger Körper, gelber Kern in der unteren Mitte, Hauptzunge und Kranz mit roten Spitzen, sechs aufsteigende Flämmchen, dunkle Schlitzaugen; Zungen wehen, Flämmchen steigen in 3 s | Farben und Aufbau wie Stufe 7; die Bänder sind weniger gewellt und geschichtet als gezeichnet (dort drei verschachtelte, wellige Bänder), die Kugel hat keine Zwiebelform, sieben Zungen sind zu viele (Bogen: eine große, zwei kleine) |
| **Gas** | gelbgrüner Körper mit weichen türkisen Wirbeln an den Rändern, drei Schwaden am Scheitel, aufsteigende Bläschen | Farbe und Weichheit wie Stufe 7; die Schwaden verklumpen zu einem Hut statt einzelner Kringel (Bogen: zwei, drei geschwungene Fahnen), kein eigener Wirbel im Körper |
| **Fell** | 420 runde Büschel, an den Flanken hängend, dunkler Ansatz, Tigerstreifen laufen über die Büschel, leichter Wind | dichter und weicher als die erste Runde (Igel), aber noch eher Zapfen als Wolle: Büschel zu scharf gezeichnet, zu wenig überlappend; der Bogen hat kleinere, weichere Büschel mit Airbrush-Rand |

Tempo: Klingen je Bild neu gelöst (7 Zungen 1,2 ms, 420 Büschel ≈ 5 ms), Dreiecke neu ≈ 20–30 ms beim Fell → ≈ 14 Bilder je Sekunde im Editor (Stufe 2 Körper, Stufe 1–2 Klingen).

## Was stimmt und was nicht (deutlich)

- **Trägt:** Klingen als geteilte Käfig-Topologie sind billig (Hunderte je Bild), das Wehen als Käfig-Pose braucht keinen eigenen Shader, Körper und Klingen teilen das Material, Deskriptoren laufen über die Büschel. Das Feuer/Gas-Material trifft Farbe und Posterisierung des Bogens.
- **Fehlt am Feuer:** gewellte, geschichtete Bandgrenzen (mehr Rauschen in der Bandgrenze statt im Wert, drei sichtbare Bänder), Zwiebelform als Vorlage statt Kugel, weniger und größere Zungen, Innenbänder auf den Zungen selbst.
- **Fehlt am Gas:** Schwaden als einzelne, stärker gekrümmte Fahnen (Biegung je Klinge als Kurve statt Sinus), Wirbel im Körper (Rauschen als Drehfeld), Bläschen als Kugeln statt Tropfen.
- **Fehlt am Fell:** gemalte Büschel auf der Haut (Plan 8.4: Abstandsfelder, nur der Umriss gebaut), weichere Kanten (Material-Federung je Klinge), Überlappung in Reihen (Dachziegel), kleinere Büschel am Gesicht; das Spiel-Budget verlangt die gemalte Variante (420 gebaute Büschel ≈ 100 000 Dreiecke).
- **Nicht gebaut:** Jelly auf dem Kern-Netz (Werkstatt-Material vorhanden), Stil-Tab mit Reglern, Zonen für Feuer/Gas.

## Urteil

Alle drei Stile stehen als Standbild und Schleife auf der Kugel; die Bauweise (Klingen als geteilte Käfige, Bändermaterial, Wehen als Pose) trägt. Das Urteil nach Plan liegt bei Florian („so geht es weiter“ für mindestens zwei von drei); meine Einschätzung: Feuer ja, Gas und Fell je eine zweite Runde mit der Liste oben. Damit sind alle fünf Beweise der Phase 0 gebaut: 1 bestanden, 2 für drei von vier Lagen, 3 bestanden, 4 zur Hälfte (Material live, Tiger-Kopf und Zonen-Atlas fehlen), 5 wartet auf Florians Blick.
