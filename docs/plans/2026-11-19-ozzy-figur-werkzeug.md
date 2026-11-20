# Plan: Formen selbst anpassen, Vektorwerkzeuge wie in Illustrator (19.11.2026 nachts)

Florian, 19.11. nachts, nach der sechsten Fassung der Kopfdrehung: „ursprünglich war geplant dass ich sowas doch selbst anpassen kann
indem du mich posen und unsaubere stellen in den übergängen einfach selbst anpassen lässt. Baue mir dazu vektorbearbeitungstools wie in
illutrator ein.“ Das war im Plan vom 18.11. Punkt 7 („Werkzeug“, Reiter Posen: Teil anklicken, Anker und Griffe ziehen, die Korrektur gilt
an dieser Stelle des Rasters, die Nachbarn blenden weich ein; keine Punkte hinzufügen oder löschen) und Etappe E.

Vorher: Die Formen der Kopfdrehung gehen auf die fünfte Fassung (33f13ebf) zurück, die er „besser“ fand; die sechste verschob sie bei
144°–216° um bis zu 68 Einheiten (Rutschen, Verklumpen). Die Renderer-Regel gegen blasse Fäden (sauberes Ausverjüngen) bleibt.

## Stufe 1 (jetzt): Kopfdrehung

- Seite `apps/editor/ozzy-figur.html`, Szenen „Kopf dreht 360°“, „Kopf dreht“, „Ozzy dreht sich“: Knopf **Bearbeiten** (Taste B).
- Werkzeuge wie in Illustrator:
  - **Direktauswahl (A):** Anker anklicken und ziehen (mit seinen Griffen), Griffe ziehen; ⇧ wählt mehrere, Rahmen aufziehen, Pfeiltasten
    verschieben (⇧ = 10). Der Griff eines glatten Ankers dreht den Gegengriff mit; mit ⌥ gezogen wird der Anker eine Ecke.
  - **Auswahl (V):** ganzes Teil anklicken und verschieben.
  - **Ankerpunkt umwandeln (⇧C):** Klick macht aus glatt eine Ecke und umgekehrt; aus einem Anker ziehen zieht beide Griffe heraus.
  - Zoom: ⌘ + Scrollen oder Zusammenziehen auf dem Trackpad, ⌘0 ganze Figur; Verschieben: Leertaste + Ziehen oder Scrollen. ⌘Z, ⇧⌘Z.
    Auf iPhone und iPad: Anker mit dem Finger ziehen, mit zwei Fingern zoomen.
  - Keine Punkte hinzufügen oder löschen: Jedes Teil hat in allen Schlüsseln dieselben Anker, nur so kann es weich überblenden.
- Jede Änderung wird ein **Zwischenschlüssel** des Teils bei diesem Winkel (auf 0,5° gerundet), die Nachbarn blenden weich ein. Gebaute
  Schlüssel desselben Teils näher als 4° fallen dafür weg; seine gezeichneten Schlüssel (0°, 45°, 90°, 180°, Bart bei 67°) bleiben, außer
  er ändert genau dort. Die zweite Hälfte ist gespiegelt: Eine Änderung bei 200° gilt gespiegelt auch bei 160°.
- Liste **Deine Schlüssel** (Winkel, Teil; hinspringen, löschen). Gespeichert wird von selbst in `docs/look/ozzy-figur/schluessel.json`
  (über den Dev-Server), geladen beim Öffnen; so liegen seine Schlüssel im Repo.
- Die Winkelanzeige der 360°-Szene zeigt den echten Winkel (vorher ein Viertel davon).
- **Probe:** bei 150° einen Anker ziehen → Schlüssel in der Datei, nach dem Neuladen dieselbe Form, ⌘Z nimmt ihn zurück; ohne Schlüssel
  bleibt alles wie vorher (Vorlagen genau, keine Sprünge).

## Stufe 1b (20.11. früh): alle Schlüssel sehen

Florian: „Ich müsste aber auch deine schlüsselbilder sehen um es richtig bearbeiten zu können. Im moment shee ich nur meine“. Gebaut: eine
**Zeitleiste** unter der Bühne mit allen Schlüsseln je Kopfteil und ihrer Herkunft (seine Vorlage, von mir gebaut, verborgener Faltschlüssel,
seine), Klick springt hin, Ziehen dreht den Kopf, J und K springen von Schlüssel zu Schlüssel. Oben links steht, wessen Schlüssel hier liegt und
wozu, und rot, welche meiner Schlüssel ein Zug hier ersetzt (näher als 4°). Einzelheiten in der Übergabe, Abschnitt „Zeitleiste“.

## Stufe 2: Körper drehen (ψ)

Dieselben Werkzeuge für Bohne, Beine, Keile, Fenster und Schwanz in „Körper dreht“ und „Ozzy dreht sich“ (Schlüssel über ψ). Dabei die
Regeln, die der Körper zusätzlich rechnet (Bohnenenden an den Beinkanten, Klemme der Fenster), so einbauen, dass sein Schlüssel genau
gezeigt wird.

## Stufe 3: Haltungen und Abläufe

Sitzen, Liegen und die Übergänge (Hinsetzen, Hinlegen, Aufstehen): Korrekturen an einer Stelle eines Ablaufs als Schlüssel der Mischung.

## Später

Illustrator-Rundweg (aktuelle Form als SVG in seiner Dateistruktur ausleiten, in Illustrator Punkte verschieben, wieder einlesen).

## Offen

Stufe 2 und 3 nach seinem Urteil zu Stufe 1.
