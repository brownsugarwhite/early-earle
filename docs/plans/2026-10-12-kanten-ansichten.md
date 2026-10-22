# Kanten, Rück- und Untersicht, verbundene Kiefer (Plan 12.10.2026, Versuch im Editor)

## Florians Rückmeldung (12.10. mittags)

1. Die Kiefer müssen am schwarzen Punkt (Mundwinkel) immer zusammenhängen. Sie müssen wirklich mit dem Shape verbunden sein; im Moment sind jeder Kiefer und das Grundshape eigene Objekte.
2. Als Test einbauen, wie die Kanten entstehen.
3. Überall im 2D-View eine Linie setzen können:
   - 1 px und gestrichelt = mögliche Kante, Übergang 100 % glatt
   - je härter, desto breiter und dunkler; schwarz und 3 px = 100 % scharf
   - So soll sich jedes Element in jeder Höhe in Shapes übersetzen lassen.
4. Top und Front auf Bottom und Back umschaltbar, mit einem Tab oben an den beiden Viewports.
5. Fragen:
   - Lässt sich so alles darstellen?
   - Konturen im eigenen Tab oder im Form-Tab in anderer Farbe?
   - Ist Dicke plus Strichelung gut, oder geht es besser?
6. Nachtrag: Bildet er mit den Griffen einer Silhouette eine Ecke, soll sie als Kante in den anderen Ansichten erkennbar sein.

Mehr Tests und Recherche, Versuche direkt im Editor. Das Layout darf umgebaut werden.

## Befund (Bildschirm Fressen-Tab, `docs/progress/editor/maul-tab-offen.png`)

- „Kiefer getrennt“ versetzt die ganze Oberlinie, auch den Mundwinkel. Es entstehen zwei schwarze Punkte nebeneinander.
- Im Fressen-Tab bleibt das Profil der geschlossene Kreis. Die blaue Linie hängt außerhalb des Körpers, der Körper geht nicht mit.

## Entscheidungen (meine Empfehlung, als Versuch gebaut)

1. **Kanten im Form-Tab, kein eigener Tab.**
   - Silhouetten und Kanten sind eine Zeichnung wie in Florians Bögen und wie in Illustrator.
   - Der Zeichenstift auf freier Fläche beginnt eine Kantenlinie; auf der Silhouette setzt er wie bisher einen Punkt.
   - Keine eigene Farbe: Grau → Schwarz trägt schon die Härte, ein Farbton würde „dunkler = härter“ stören. Die Knoten sind türkis wie alle Punkte.
2. **Darstellung der Härte**:
   - Breite 1 → 3 px und Grau → Schwarz, bei 0 % gestrichelt. Die Breite darf entlang der Linie wechseln, wie beim Breitenwerkzeug in Illustrator (⇧W); so läuft eine Kante weich aus.
   - Einstellen über den Regler in der Seitenleiste und über das Breitenwerkzeug direkt auf der Linie.
3. **Ecken der Silhouetten sind Kanten.**
   - Ein Eckpunkt hat eine Härte (Standard 100 %).
   - Die Kante erscheint in den anderen Ansichten im selben Stil:
     - Ecke in der Front: Längskante
     - Ecke in Seite oder Top: Kante quer über den Körper
   - Ein Klick darauf wählt die Ecke in ihrer Ansicht.
4. **Back und Bottom sind echte Rückansichten:**
   - Back ist waagerecht gespiegelt, Bottom senkrecht.
   - Die Silhouetten sind dieselben, denn ein Umriss sieht von vorn und hinten gleich aus.
   - Neu ist, welche Fläche sichtbar ist. Linien auf der abgewandten Seite erscheinen blass.
   - Tab am Viewport-Titel: „front · back“, „top · bottom“.
5. **Kiefer verbunden:**
   - Ober- und Unterlinie teilen den Mundwinkel, im geschlossenen und im offenen Zustand.
   - Der Start der Oberlinie bleibt auf der Kontur, wenn sich die Form ändert.
   - Im Fressen-Tab zeigen die Ansichten den geöffneten Körper (Umriss des 3D-Körpers), das geschlossene Profil blass dahinter.
   - Die Grundform wird im Tab Editor bearbeitet. Eigene Pose-Profile bleiben ein Vorschlag für die Bauweise.
6. **3D (Shapes → Loft → Käfig):** Mit Kanten oder Ecken baut das 3D einen Catmull-Clark-Käfig aus den Profilen.
   - Längslinien: Ringpunkte werden auf die Linie geschoben, die Kante läuft längs.
   - Querlinien: Ringe werden auf die Linie gelegt.
   - Ecken: Ring bzw. Längslinie genau an der Ecke.
   - Härte → Kantenschärfe 0 … 3 Stufen, entlang der Linie verlaufend.
   - Mit Maul: Kanten auf die nächste vorhandene Kantenschleife (Näherung).

## Datenmodell (optional, Version 0)

```ts
Kante = { knoten: Knoten3[]; haerte: number[] /* je Knoten 0…1 */; blick: 'seite'|'front'|'hinten'|'top'|'unten' }
dok.kanten?: Kante[]           // gespiegelt an z = 0 wie die Maullinien
Profil-Knoten: haerte?: number // nur bei art 'ecke', Standard 1
```

## Arbeitspakete

- **A. Plan und Schema:** Datenmodell mit Rundreise-Test, committen.
- **B. Recherche** (Hintergrund):
  - Vorbilder:
    - DIN-Lichtkanten
    - Tangentenkanten in CAD
    - Linienriss im Schiffbau (Knicklinie, Spanten vorn/hinten)
    - Charakterlinien im Autodesign
    - Kantenschärfe in Blender, T-Splines und FiberMesh
    - OpenSketch
    - Breitenwerkzeug in Illustrator
  - Wahrnehmung von Strichbreiten.
  - Grenzen der Darstellung aus Silhouetten, Linien und Querschnitten.
- **C. 3D-Kanten** (Hintergrund, eigener Arbeitsbaum, `packages/shape/src/versuch/kanten.ts` mit Tests):
  - Käfig aus Profilen mit Kanten aus Linien und Ecken.
  - Abgeleitete Eckkanten für die 2D-Anzeige.
  - Messungen: Lage der Kante, Schärfe steigt mit der Härte, 0 % bleibt glatt, Verlauf, Umriss, Tempo.
- **D. Editor:**
  - Ansichten front/back und top/bottom
  - Kantenlinien: zeichnen, wählen, ziehen auf der Fläche, löschen
  - Härte: Regler und Breitenwerkzeug ⇧W
  - abgeleitete Eckkanten
  - Kiefer verbunden: gemeinsamer Mundwinkel, Start auf der Kontur, offener Umriss im Fressen-Tab
  - Einbau von C ins 3D
- **E. Prüfung:** Typecheck, Lint, Unit-Tests, E2E mit echter GPU, Bilder.
- **F. Bericht:** Recherche-Dokument, Übergabe, Gedächtnis, Seite.
