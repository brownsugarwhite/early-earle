# content/creatures/

Dateien der Wesen-Werkstatt (Plan `docs/plans/2026-10-07-wesen-werkstatt.md`). Geschrieben werden sie aus dem
Grundformen-Lab `/lab/wesen` (später aus der Werkstatt `/werkstatt/wesen`), über den Dev-Endpunkt `/__content/creatures/…`.

- `vorlagen/<id>.json` — eine Wesen-Vorlage: `{ "schemaVersion": 1, ...Bauplan }`, der vollständige Bauplan mit allen
  Werten (Schema `BauplanSchema` in `@ee/creature`). Die Id ist der Wesenname in Kleinbuchstaben (Umlaute
  ausgeschrieben, sonst Bindestriche), z. B. `rex-gross.json`.
- `stil.json` — die Stil-Vorgabe aller Wesen (Look-Vertrag): `{ "schemaVersion": 1, ...WesenStil }` mit Licht, Wertstufen,
  Federung, Verlauf, Rim, Korn, Glimmer, Bodenkontakt und Schattenregel (Typ `WesenStil` in `@ee/render`). Fehlt sie,
  gilt der Standard des Materials (`STIL_STANDARD`).

Im Lab: **Speichern** legt die Vorlage auf dem Mac ab (ohne Verbindung lokal im Browser, „Teilen“ schickt die Datei
weiter), **Stil sichern** im Tab „Licht & Stil“ schreibt `stil.json`. Gelesen wird zuerst vom Mac, ohne Mac aus dem
App-Bündel. Die eingebauten Lab-Vorlagen stehen im Code (`apps/game/src/lab/wesen/presets.ts`), nicht hier.

Ältere Dateien bleiben lesbar: Werte außerhalb der Schema-Bereiche werden beim Laden in den Bereich geklemmt, unbekannte
Felder fallen weg, fehlende bekommen die Vorgabe.
