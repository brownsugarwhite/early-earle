# Ozzy, Shader Runde 8: Schlangen, Drache, Echsen, Schleim, Steine, Gaudí, Zeichenstil, Matrix 2.0 (21.11.2026)

Florian (wörtlich): „Ok, mit fell machen wir später weiter. Wolken und fell und plüsch erreichen noch nicht den standard...aber mir
gefallen gerade vor allem die schlangen und drace nicht. Diese sollen viel besser und echter aussehen. Mahe gerne nochmal eine
ausführliche recherche wie man die schlangenhäute am besten hinbekommt. Drachenhaut soll richtig abgefahren und spektakulär sein.
Gerne auch hyprealistisch. Auch krokodil und chamäleon sind in realistisch noch nicht gut genug. Es muss immer wunderschön und
elegant aussehen. Bitte auch noch ein richtig tolles "schleim" material erstellen in hyperrealistisch und auch verschiedene
steinmaterialien. Dazu bitte noch 3 schader neu entwickeln die von antoni gaudi und barcelona inspiriert sind. Ich finde den
zeichenstil in dem screenshot wunderschön. Bekommst dud as genauso als shader hin. Mache gerne weiter ausführliche tests und
recherchen, was state of the art ist, was das beste ist das andere programme so können und wie wir es noch viel besser machen. Ich
habe auch diesen 3js askii shader gefunden den ich gerne hätte. Er besteht aus verschiedenen zeichen. Kannst du diesen noch
verbessern und erweitern? Es wird dann mein Matrix 2.0 shader.“

Vorlagen: `docs/look/ozzy/shader/vorlagen/2026-11-21-zeichenstil-oni.webp` (Zeichenstil), `…-ascii-flow.webp` (ASCII-Shader aus
einem Shader-Paket für three.js). Recherche: `docs/research/2026-11-21-runde-8-recherche.md`. Zweig `claude/ozzy-shader`, Fenster 5219.
Fell, Wolken und Plüsch ruhen bis später (sein Urteil: „erreichen noch nicht den standard“).

## Etappen (in dieser Reihenfolge; nach jeder ein Commit)

1. **Schlangen neu, hyperrealistisch** (Python, Klapperschlange, Korallennatter): regelmäßige schräge Schuppenreihen (der Weg dahin
   nach der Recherche: auf der Form ausgerichtet statt Zellen im Raum, die wie Kiesel wirken), echte Überlappung mit freier Kante,
   Kiele, Haut zwischen den Schuppen, Bauchschilde, Glanz mit Mikrostruktur, Irisieren (Python), das Muster Schuppe für Schuppe.
2. **Drache spektakulär:** Hierarchie der Schuppen (große Platten, kleine Schuppen dazwischen), Glut zwischen den Schuppen,
   Irisieren, Abnutzung; hyperrealistisch und dazu eine abgefahrene Fassung.
3. **Krokodil und Chamäleon realistisch:** Krokodil mit Osteodermen und Rissen, nass; Chamäleon mit Körnchen, Tuberkeln und dem
   Schimmer der Nanokristalle.
4. **Schleim, hyperrealistisch:** durchscheinend mit Brechung, Streuung und Blasen, Glanz, Fäden und Tropfen.
5. **Steine** (neue Gruppe „Stein“): mehrere Gesteine, je echt (Adern, Bänder, Körner, Streuung, Politur).
6. **Drei Gaudí-Shader** (Barcelona): Ideen nach der Recherche (z. B. Trencadís, Casa Batlló, Licht der Sagrada Família).
7. **Zeichenstil nach Vorlage:** Tuschelinien mit wechselnder Breite, Schraffur, gedeckte Palette (Knochenweiß, Ziegelrot, Salbei),
   Papier, Muster im Grund; Ornament als Relief, damit die glatte Form etwas zum Zeichnen hat.
8. **Matrix 2.0:** ASCII auf der Form mit echten Glyphen (Atlas), Kantenzeichen, Regen mit Katakana, Phosphorglühen, Zeilen,
   Farbrampen; besser als die Vorlage.
9. **Bilder, Übergabe, was bleibt.**

## Proben

Je Etappe Bilder an „strange bird“ (Übersicht `ZOOM=2.4`, nah `ZOOM=6`), Konsole ohne Fehler, Typen und Lint; vor und nach dem
Umbau dieselbe Ansicht. Tempo der neuen Motoren einmal messen (in Bewegung und im Stand). Sein Auge entscheidet.

## Stand (21.11.2026): gebaut

Alle Etappen in einem ersten Stand, 78 Shader in acht Gruppen (neu: Stein, Barcelona). Bilder:
`docs/progress/ozzy/shader/2026-11-21-runde-8-schlangen.png`, `-drache-echsen.png`, `-schleim-steine.png`,
`-barcelona-tusche-matrix.png`. Recherche: `docs/research/2026-11-21-runde-8-recherche.md`. Offenes: `…-shader-was-bleibt.md`,
Punkte 45 bis 53.

- **Schlangen:** Schuppenfeld auf dem Netz (`schuppenFeld.ts`), Python, Klapperschlange, Korallennatter, neu Regenbogenboa und Grüner
  Baumpython; regelmäßige schräge Reihen, Überlappung, Schatten unter der freien Kante, Muster je Schuppe.
- **Drache:** Rangordnung der Schuppen, Riefen, Poren, abgenutzte Kanten; Arten Glut (Magma in schmalen Fugen), Smaragd, Frost, Nacht
  (Schiller an den Rändern); Haut kann leuchten und schillern.
- **Krokodil** auf dem Schuppenfeld (Knochenschilde in Querreihen), **Chamäleon** mit Körnchen und Stimmung.
- **Schleim** (Brechung, Farbe nach Weg, Trübe, Blasen, Glitzer, zähe Tropfen), **Steine** (acht Gesteine), **Barcelona** (Trencadís,
  Casa Batlló, Sagrada Família), **Ornament in Tusche** (Zeichenstil der Vorlage), **Matrix 2.0** (Formzeichen, Katakana-Regen).
