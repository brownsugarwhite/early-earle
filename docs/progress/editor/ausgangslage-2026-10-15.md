# Ausgangslage Maul und Werkzeuge (15.10.2026)

> Plan [„Maul als Einsatz, Werkzeug-Harmonie und Posen“](../../plans/2026-10-15-maul-einsatz-harmonie-posen.md), Stufe 1 (Teil V und H0). Gemessen ist der **heutige Maulbau** (Stand c97497b nach der Rücknahme, Commit 42ef353). Jeder neue Teil muss diese Zahlen in allen Klassen schlagen. Nichts hiervon ist eine Abnahme; es ist der Vergleichsmaßstab.

## Prüfstand

- **Zufallsreihe** (`packages/shape/src/kern/pruefen/`, Startwert 20261015, jede Achse ausgewogen gezogen):
  - 11 Körper: Kugel, Ei, Wurst, Turm, Flunder, Birne (hoher Kopf über vorstehendem Bauch), Tiger-Kasten, Rex, Langhals, Robbe, Drache; die Grundkörper mit Zufallsvarianten, Florians Vorlagen unverändert.
  - Maullage: hoch, mittel, tief, unter dem Kinn, seitlich (nicht auf der Mitte), am Hals.
  - Linienform: gerade, steigend, fallend, J mit steilem Ende, S, senkrechtes Ende, Florians nachgezogene Vorlagenlinie; kurz und lang.
  - Kiefer: gleich, Überbiss, Unterbiss (Versatz klein/groß, schmaler/breiter), wie der Chip „getrennt“.
  - Bearbeitung nach dem Maul: keine, Anfang ziehen, Mundwinkel ziehen, Schädel +18 px, Kinn −12 px, Schnauze +15 px, Pinselbeule am Maul, Pinsel auf der Silhouette.
- **Gebaut wie im Editor:** Stationen am Körper ohne Maul eingefroren, Maul danach gezeichnet (Linien auf der Haut, runder Anfang), nach einer Bearbeitung mit den Stationen, die der Editor nach dem ersten Maulbau zurückschreibt.
- **Maße** (`masse.ts`, geprüft in `reihe.test.ts`):
  - Formtreue: Abstand der Haut zum selben Körper ohne Maul; „fern“ = mehr als eine Maullänge von der Linie, „nah“ = dazwischen (ohne Lippenband).
  - Δ je Blatt mit und ohne Maul (Maulfenster ausgenommen).
  - Lippe dicht über die ganze gezeichnete Linie, beidseitig, in Seite, Front und Top.
  - Faltenzuwachs je Hautfläche gegen die nächste Fläche des Körpers ohne Maul.
  - Umgeklappte Hautflächen; Durchdringungen mit Haut beim Öffnen (25, 50, 75, 100 %).
  - Kieferunabhängigkeit: Linienmitte um 10 px gezogen, Bewegung der Haut des anderen Kiefers.
- **Skripte:** `apps/editor/scripts/pruefen/zufallsreihe.ts` (Reihe), `reihe-boegen.mjs` (Kontaktbögen im echten Editor, eigener Vite auf 5192), `werkzeug-matrix.ts` (Werkzeugfolgen).

## Zufallsreihe, 200 Fälle

**Alle 200 Fälle bauen, und alle 200 verletzen mindestens eine Schwelle der neuen Bauweise** (Formtreue ≤ 0,25 px, Δ-Zuwachs ≤ 0,5 px, Lippe ≤ 1 px, Faltenzuwachs ≤ 2°, keine umgeklappte Fläche, keine Durchdringung mit Haut beim Öffnen, Kiefer unabhängig).

| Befund | Fälle |
|---|---|
| Körper fern vom Maul um mehr als 0,25 px verändert | 182 von 200 (≤ 1 px nur 48; 3 ohne Fernbereich) |
| Lippe bei gleichen Kiefern ≤ 1 px | nur 10 von 67 |
| Durchdringungen mit Haut bei 100 % Öffnung | 149 von 200 (ganz ohne beim Öffnen: 50) |
| Umgeklappte Hautflächen | 134 von 200 |
| Getrennte Kiefer: Ziehen der einen Linie bewegt den anderen Kiefer | 128 bzw. 101 von 133 (Median 5,7 px, bis 2008 px) |
| Netz zerrissen (Δ-Zuwachs > 100 px oder > 500 umgeklappte Flächen) | 24 Fälle, vor allem Birne, Langhals, Drache; einzelne Punkte fliegen bis 15 000 px weit |

Je Klasse (Median / 90. Perzentil; px bei 461 px je Kachel):

| Kiefer | n | Formtreue fern | Δ-Zuwachs | Lippe | Faltenzuwachs fern | umgeklappt | Haut-Durchdringung 50/100 % |
|---|---|---|---|---|---|---|---|
| gleich | 67 | 4,7 / 28,8 | 7,4 / 49,1 | 3,2 / 19,9 | 14,5° / 177° | 63 % | 67 / 75 % |
| Überbiss | 66 | 4,8 / 17,3 | 9,8 / 41,5 | 9,2 / 15,0 | 16,1° / 175° | 65 % | 59 / 77 % |
| Unterbiss | 67 | 6,5 / 20,4 | 11,8 / 42,1 | 13,3 / 22,6 | 35,1° / 175° | 73 % | 70 / 71 % |

| Maullage | n | Formtreue fern | Δ-Zuwachs | Lippe | umgeklappt | Haut-Durchdringung 100 % |
|---|---|---|---|---|---|---|
| mittel | 53 | 4,4 / 14,7 | 3,9 / 26,2 | 6,2 / 16,4 | 58 % | 75 % |
| hoch | 37 | 7,3 / 17,3 | 11,2 / 49,1 | 9,6 / 20,7 | 81 % | 95 % |
| tief | 35 | 6,6 / 17,0 | 11,6 / 24,4 | 13,0 / 21,0 | 60 % | 60 % |
| unter dem Kinn | 42 | 5,2 / 37,5 | 8,8 / 55,1 | 11,0 / 22,4 | 52 % | 49 % |
| seitlich | 27 | 2,2 / 11,8 | 25,8 / 33,0 | 9,2 / 20,3 | 89 % | 96 % |
| am Hals | 6 | 28,4 / 29,4 | 58,9 / 59,1 | 5,5 / 7,3 | 100 % | 100 % |

| Linienform | n | Lippe | Δ-Zuwachs | umgeklappt |
|---|---|---|---|---|
| gerade | 31 | 7,8 / 17,7 | 10,4 / 43,4 | 61 % |
| J mit steilem Ende | 32 | 13,2 / 23,4 | 16,8 / 55,1 | 72 % |
| senkrechtes Ende | 29 | 8,9 / 21,0 | 8,3 / 44,5 | 79 % |
| S | 29 | 6,4 / 16,8 | 7,3 / 27,8 | 66 % |
| Florians Vorlagenlinie | 16 | 5,2 / 6,0 | 1,7 / 4,7 | 25 % |

Bauzeit mit Maul auf Stufe 2: Median 57 ms (der Editor baut mit Stufe 3).

### Teilreihe: einfachste Mäuler (40 Fälle)

Gerade, steigende oder fallende Linie, Anfang mittig oder tief, Kiefer gleich, ohne Bearbeitung danach (`FILTER` in `zufallsreihe.ts`). **Alle 40 verletzen mindestens eine Schwelle.**

| Maß | Median | 90 % | Max |
|---|---|---|---|
| Formtreue fern (px) | 4,3 | 28,3 | 50,7 |
| Formtreue nah (px) | 7,7 | 23,3 | 33,9 |
| Faltenzuwachs fern (°) | 8,2 | 172 | 177 |
| Faltenzuwachs nah (°) | 33,7 | 174 | 176 |
| Lippe (px) | 1,2 | 6,8 | 13,1 |
| Δ-Zuwachs (px) | 2,5 | 31,2 | 47,8 |

Lippe ≤ 1 px: 14 von 40 · ohne Durchdringung mit Haut beim Öffnen: 22 von 40 · ohne umgeklappte Fläche: 29 von 40.

## Florians Befunde, nachgestellt

Seine gespeicherten Wesen liegen im Browser (Web-Modus) und waren nicht lesbar. Nachgestellt ist jeder Befund an den ähnlichsten Fällen der Reihe:

| Befund (15.10.) | ähnliche Fälle | gemessen |
|---|---|---|
| Kugel mit Bauch unter hohem Maul, Top Δ 29–57 px | Anfang hoch an Birne, Kugel, Ei (11) | Top-Δ-Zuwachs Median 10, bis 59 px; Haut nahe dem Maul Median 12, bis 54 px verschoben |
| Kinn wird Wand, Seite Δ 27,5 px | Kugel mit getrennten Kiefern (12) | Seite-Δ-Zuwachs Median 21, bis 31 px |
| Ei-Schnabel, Δ 29,1 px | Ei (18) | Seite-Δ-Zuwachs Median 11, bis 29 px |
| J-Mundwinkel unmöglich, „rot 19,1 px“ | J (32), senkrechtes Ende (29) | Lippe Median 13 bzw. 9, bis 40 bzw. 44 px |
| echter Rex-Unterbiss zerreißt alles (Δ 201 px) | Rex Unterbiss (1); zerrissene Netze (24) | 31 px am einen Rex-Fall; zerrissene Netze bis 15 000 px |
| Schädel +18 px: 44–78 Durchdringungen | Bearbeitung Schädel (25) | Durchdringungen mit Haut bei 100 % Median 136, bis 3121 |
| einfachste Mäuler mit Falten | eigene Reihe: gerade/steigende/fallende Linie, mittig oder tief, Kiefer gleich, ohne Bearbeitung (40) | Faltenzuwachs nahe am Maul Median 34°, fern 8°; Körper verschoben fern Median 4,3 px, nah 7,7 px |
| Pinsel, dann Maul: Seite Δ 25, Front 37, rot 34 px | Florians Ablauf (unten) | nach dem Maul Seite Δ 36 px, Lippe 15 px, Körper fern vom Maul bis 38 px verschoben |

## Werkzeug-Matrix (H0)

**Florians Ablauf auf der Startkugel** (Bau wie im Worker; nach Pinselstrichen ohne Maul „Formen folgen“; Stationen zurückgeschrieben wie im Editor):

| Schritt | Δ Seite/Front/Top | Lippe | Verschiebung fern / gesamt |
|---|---|---|---|
| Aufblasen an der Wange | 0,5 / 1,2 / 1,3 | – | 0,0 / 5,4 px |
| Ziehen an der Schnauze nach vorn | 3,9 / 1,2 / 4,0 | – | 0,0 / 18,1 px |
| Seite: Scheitel 20 px hoch | 4,3 / 1,3 / 3,8 | – | **12,2** / 19,9 px |
| Front: Seitenpunkt 15 px nach außen (wirkt überall) | 4,3 / 1,4 / 5,0 | – | – / 15,1 px |
| Maul zeichnen | **36,2** / 1,4 / 2,3 | **14,7** | **37,8** / 51,5 px |
| Ziehen am Maul (ohne Folgen, wie im Editor) | 36,2 / 1,4 / 2,3 | 14,7 | 0,1 / 1,1 px |
| Maulanfang ziehen | 36,6 / 1,4 / 2,3 | 13,9 | 1,9 / 2,4 px |

Abzulesen:
- Pinselstriche selbst bleiben örtlich.
- Eine Linienänderung verschiebt den Körper auch fern der Stelle (Scheitel: 12 px).
- Das Maul verändert den Körper massiv (38 px fern vom Maul, Seite Δ 36 px).
- Ein Pinselstrich am Maul wirkt kaum (1 px statt der gezogenen ≈ 9 px), weil die Deltas an Käfigindizes hängen, die das Maul umverteilt hat.

**Alle Paare von Handlungen** auf Kugel, Birne und Rex (177 Paare) und **30 Zufallsgänge** à 8 Schritte auf sieben Körpern; je Handlung Median / Max über alle Schritte (Verschiebung „fern“ = Haut außerhalb der bearbeiteten Stelle, Lippen und Maulinneres zählen nicht):

| Handlung | n | Δ größtes Blatt (px) | Lippe (px) | Verschiebung fern (px) |
|---|---|---|---|---|
| Seitenknoten ziehen | 77 | 2,7 / 1649 | 1,0 / 6,4 | **10,1** / 31,9 |
| Frontknoten ziehen (wirkt auf alle Ringe) | 69 | 4,0 / 48,0 | 4,2 / 41,8 | 13,0 / 23,2 |
| Topknoten ziehen | 67 | 3,4 / 32,2 | 1,0 / 36,0 | **9,7** / 21,9 |
| Aufblasen | 71 | 2,4 / 40,1 | 3,4 / 41,8 | 0,2 / 4,5 |
| Ziehen (Pinsel) | 75 | 2,1 / 48,5 | 1,4 / 37,5 | 0,1 / 3,8 |
| Maul zeichnen | 63 | 10,2 / 47,2 | 1,7 / 36,3 | 1,6 / 52,2 |
| Maulanfang ziehen | 41 | 10,2 / 1623 | 1,0 / 37,5 | 0,2 / 16,8 |
| Kiefer getrennt | 32 | **29,0** / 3215 | 0,3 / 36,0 | **21,2** / 258 |
| Maul entfernen | 31 | 2,2 / 11,1 | – | **7,9** / 51,9 |

Abzulesen:
- Linienänderungen sind nicht örtlich: Ein Seiten- oder Topknoten verschiebt die Haut fern der Stelle im Median um rund 10 px.
- „Kiefer getrennt“ verändert den Körper im Median um 21 px fern vom Maul.
- Das Maul zu entfernen stellt den alten Körper nicht wieder her (Median 7,9 px Unterschied; die vom Maul geänderten Stationen bleiben im Dokument).
- Nach Pinselstrichen liegt die Lippe bis 42 px neben der Linie.
- **Ein Bau ist abgestürzt:** Bei zerrissenem Netz wirft die Δ-Messung in `wesenBauen` („Set maximum size exceeded“ in `kieferAbdeckung`); der Editor würde an dieser Stelle genauso abbrechen.

## Grenzen der Messung

- „Fern“ ist leer, wenn das Maul im Verhältnis zum Körper sehr lang ist (3 Fälle ohne Wert).
- Die Lippe misst die gewollte Rille des heutigen Baus (2–3 px) als Abweichung mit; die neue Bauweise verlangt ≤ 1 px ohne diese Ausnahme.
- „Durchdringungen mit Haut“ ist eine Näherung für sichtbare Durchdringungen; verdeckte Überlappung beim geschlossenen Über-/Unterbiss zählt nicht (nur Öffnungen über 0).
- Kugel und Ei des Generators sind nicht Florians Wesen; seine Bögen bleiben die Vorgabe für den Look.

## Kontaktbögen

Je Klasse die schlechtesten Fälle, die auf keinem früheren Bogen stehen (Rang = Summe aller Verstöße auf Log-Skala). Jede Zeile: Seitenblatt mit schwarzer, roter und blauer Linie (wie im Editor), Bühne zu (schräg, Seite), offen 50 % und 100 %; darüber die Maße.

- [Einfache Mäuler in der Hauptreihe](ausgangslage-2026-10-15-einfach.jpg) und die [Teilreihe der einfachsten Mäuler](ausgangslage-2026-10-15-einfache-maeuler-alle.jpg)
- [Hohes Maul](ausgangslage-2026-10-15-hoch.jpg)
- [Mundwinkel in jeder Form (J, S, senkrecht)](ausgangslage-2026-10-15-winkel.jpg)
- [Maul an anderer Stelle (Kinn, seitlich, Hals)](ausgangslage-2026-10-15-lage.jpg)
- [Kiefer getrennt (Über-, Unterbiss)](ausgangslage-2026-10-15-kiefer.jpg)
- [Körper nach dem Maul geändert](ausgangslage-2026-10-15-bearbeitung.jpg)
- [Florians Wesen (Rex, Tiger-Kasten, Langhals, Drache, Robbe)](ausgangslage-2026-10-15-vorlagen.jpg)

Neu erzeugen: `apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/reihe-boegen.mjs` (Reihe vorher mit `zufallsreihe.ts`).

## Nächster Schritt

Stufe 2 des Plans: **B1 Tab-Sofortkorrektur** (der Editor-Tab zeigt immer die Grundform, ein Bau bei jedem Wechsel, mit oder ohne Maul), danach Stufe 3: Maul-Beweis A1–A11 als eigenständiges Kernmodul.
