# illudiy: Logo-Nachbau und Intro-Studie (Übergabe, 21.11.2026)

Auftrag (Florian, 21.11.): Das Firmenlogo illudiy genau analysieren, alle optischen Täuschungen benennen, das Logo als
exakten Vektor nachbauen (bis zum Schatten der dicken Kontur auf dem Verlaufsrand und den weichen Weißverläufen), zu
Täuschungen in Physik, Medien und Kunst recherchieren, ehrlich gegenüberstellen und ein Intro bauen, das aus dem Nichts
kommt, ohne Schnitt und ohne unnötige Alphablenden auskommt, mit Physik, Bounce und den Täuschungen spielt.

## Einstieg

- **`illudiy-intro.html`** öffnen (Doppelklick, läuft ohne Server und offline). Oben die Bühne mit **Intro A · Einrasten**,
  **Intro B · mit Kippwelle**, **Kurzfassung** und sechs Tests, darunter Zeitlupe (bis ⅒×), Zeitschieber, die Ansicht
  **„Flächen nach Richtung“** und **„Original darüber“**. Weiter unten: Vorher-Nachher-Schieber, Analyse der Täuschungen,
  Konzept mit Ablaufgrafik, Recherche-Tabelle, offene Fragen.
- Videos (1920 × 1080, 60 fps) in `video/`: `intro-a-einrasten.mp4`, `intro-b-kippwelle.mp4`, `kurzfassung.mp4`.
- Konzept: [`docs/plans/2026-11-21-illudiy-intro.md`](../../plans/2026-11-21-illudiy-intro.md). Recherche mit Quellen:
  [`RECHERCHE.md`](RECHERCHE.md).

## Dateien

| Datei | Inhalt |
|---|---|
| `illudiy-logo.svg` | exakter Vektor (28 Flächen, 4 Verläufe, 3 Masken), 2000 × 937 wie das Original |
| `illudiy-modell.json` | dasselbe als Daten: Flächen, Verläufe, Masken, Punkte, Messpunkte; Grundlage der Animation |
| `illudiy-intro.html` | eigenständige Seite: Engine, Abläufe, Tests, Analyse, Konzept, Recherche (Modell und Original eingebettet) |
| `illudiy-original.webp` | Florians Vorlage aus dem Chat (gesichert) |
| `video/` | gerenderte Intros |
| `werkzeug/` | Mess-, Bau-, Prüf- und Renderskripte (siehe `werkzeug/README.md`) |
| `docs/progress/2026-11-21-illudiy-*.png` | Vergleich Original/Vektor/Abweichung, Flächen nach Richtung, Kontaktbögen Intro A |

## Stand und Prüfung

- **Vektor gegen Original:** Kantenlage ±0,1 px, mittlere Farbabweichung 1,2 von 255, 0,02 % der Pixel weichen um mehr als
  100 Stufen ab (nur Kantenglättung an Kurven und Ecken).
- **Animation:** Das letzte Bild der Engine hat dieselbe Abweichung zum Original wie das SVG (1,26 statt 1,23).
- **Sprünge:** Bild-zu-Bild-Prüfung der Videos ohne Ausreißer (Punkte fallen von außerhalb des Bildes ein, Schatten startet
  weich).
- Geprüft im Browser (Desktop 1280 px und schmal): keine Konsolenfehler. **Nicht geprüft:** iPhone/iPad, Florians Auge.

## Wie es gebaut ist

1. **Messen:** Pixel in Klassen (Hintergrund, Petrol, Weiß, Farbe), Ränder verfolgt, jede gerade Kante mit Querschnitten
   subpixelgenau gemessen und als Gerade gefittet, Ecken als Schnittpunkte, Kurven aus gemessenen Randpunkten als Béziers.
   Verläufe per kleinster Quadrate aus dem Bild.
2. **Modell:** Flächen mit Überlappung unter Nachbarflächen (keine Fugen), Schatten des Rands über zwei gemessene Strahlen,
   die an den Plattenecken beginnen.
3. **Engine:** Jede Fläche liegt auf ihrer eigenen Ebene im Raum, entlang der Blickrichtung der Endkamera gehoben (ändert
   das Endbild nicht). Verwundene Flächen des ll sind Regelflächen. Kamera mit Azimut, Höhe, Rollen und Dolly-Zoom in die
   Parallelprojektion; Federn als geschlossene Formeln, Bälle mit Schwerkraft und Stoßzahl. Jedes Bild ist eine reine
   Funktion der Zeit (spulbar, exakt wiederholbar, als Video renderbar).

## Offen (Florians Entscheidung)

- Hauptfassung: Intro A oder B (B mit Kippwelle, kräftiger, 0,6 s länger)?
- Kamera aus 74° (von rechts kommend) oder von links?
- Petrol-Stamm des zweiten i vor der Platte sichtbar (jetzt) oder erst mit der Platte?
- Danach: Ton (Shepard-Glissando, das beim Einrasten aufgeht), Export für App-Start, optional Sugihara-Geometrie.
