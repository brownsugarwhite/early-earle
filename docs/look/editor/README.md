# Editor-Vorlagen (Florian, 11.10.2026)

- `figmaScreenshot.png`: Grundlayout aus Figma, 3456×2322 px, also 2× bei 1728×1161 CSS-px (Original in `~/Desktop/2048/editorRefs/`)
- `01-grundlayout.webp`: dasselbe Layout als Chat-Bild 1
- `02-eckknoepfe.png`: Chat-Bild 2 mit den Eckknöpfen (Braun, Blau, Pink); der blaue Rahmen ist vermutlich Figmas Auswahl

- `03-tiger-konzept.webp`: Konzept Tiger (11.10.): Top, Seite und Front geschlossen (schwarzer Mundwinkel, türkise Maulpunkte), Seite und Front offen (rote Oberlippe, blaue Unterlippe); Silhouette plus Kantenlinien, Kanten mit Verjüngung und Verlauf, wo sie in runde Formen übergehen

- `04-wesen-mit-maeulern.png` (12.10., 2958×1926): drei Reihen. **Langhals** (Top, Seite zu, Front zu, Seite auf, Front auf: offen läuft die Unterlippe den Hals hinab), **Robbe** (Top, Seite/Front zu und auf: offen reicht die Unterlippe bis zum Boden), **Drachen-Reihe** (nur Seite: Zähne zu und auf, Unterbiss mit getrennten Linien, großer Drache mit Flügeln). Türkis = Maullinie zu (Kiefer gleich), Rot = Oberkiefer, Blau = Unterkiefer, Schwarz = Mundwinkel; die Punkte hat Florian von Hand gesetzt.
- `05-maul-detail.png` (12.10., 3538×1702): Maullinien je Ansicht (Shape = Front, Side = Seite) mit Legende „oberes Maul“ (rot), „unteres Maul“ (blau), „Mundwinkel“ (schwarz): zu (türkis), leicht offen mit getrennten Kiefern, weit offen, dazu offene Mäuler ohne Farben (Mundwinkel eingezogen).
- `06-rex-mit-maul.png` (12.10., 3782×1304): **Rex** Top, Seite und Front mit Zähnen; Seite/Front zu mit getrennten Kiefern (Überbiss: die rote Oberlippe liegt unter der blauen Unterlippe, die oberen Zähne hängen außen); Seite/Front offen (Unterkiefer fällt, untere Kopfsilhouette ändert sich).

Florians Ablauf dazu (12.10.): Körper → Maul-Tab (blau) → Kiefer gleich/getrennt schon geschlossen (Überbiss, Unterbiss, Lippenbreite, Platz für Zähne) → Zahn-Tab (braun; Anzahl je Kiefer, symmetrisch, Zahnmenü mit Rundheit, Schärfe, Neigung; Riesenzähne offen größer) → Rig-Tab (Kieferknochen zu/auf). Seitenleiste rechts immer offen. Plan: [`docs/plans/2026-10-12-maul-zaehne-rig.md`](../../plans/2026-10-12-maul-zaehne-rig.md)

Zusatzvorgaben aus dem Chat: Kurvenkontur 3 px, Punkte rund mit Ø 10 px, Bézier-Griffe als 6-px-Quadrate, Farben wie im Screenshot. Jedes neue Wesen startet als Kugel aus drei Kreisen.

Plan: [`docs/plans/2026-10-11-editor-grundlayout.md`](../../plans/2026-10-11-editor-grundlayout.md)
- `07-ueberhang-spant-3d.webp` (13.10.): Seite mit Schnauzen-Überhang (Umriss läuft oben nach vorn und unten wieder zurück), Spant S1 und Hauptspant H; Front mit Spant S1; Top als Pfeil mit Haken hinten; 3D „Kanten im Käfig“ blockt die Einbuchtung zu (flache Front statt Schnauze über Bauch).
- `08-spant-acht.webp` (13.10.): Spant S1 in der Front als Acht geformt (die Hälfte kreuzt die Achse). Florian: Die beiden Teile sollen clippen und zwei Formen oben und unten werden, der überlappende Teil in der Mitte soll weg (Bauch, Schnauze oder sogar ein Loch).
- `09-top-haken-3d.webp` (13.10.): Top mit Haken an der Rückseite (Umriss läuft wieder nach innen); 3D von oben füllt die Einbuchtung auf.

Florians Fragen dazu (13.10. morgens): Spanten sollen die wahre Form zeigen (hier zwei Ringe für Schnauze und Bauch). Spanten dynamischer: Jeder Punkt einer Kantenlinie ist ein Punkt im Spant, in der Front knicken ergibt eine echte Kante. Überhänge ohne Wirbelsäule, Einbuchtungen im Top nicht ausblocken. „Eventuell ist das Mesh auch falsch aufgebaut? Gibt es bessere Lösungen? Vielleicht direkt in Lofts?“

## Screenshots aus dem Editor (16.–20.10., gesichert am 20.10.)

- `florian-2026-10-15-ente-fluegel.webp` (15.10.): Ente mit Flügeln (Vorlage des Prüfkörpers `ente` in `kern/pruefen/grundkoerper.ts`).
- `florian-2026-10-16-ente-haken.webp` (16.10., Screenshot 1): Library-Ente mit Flügelhaken im Top; Δ Front 23 px, Top 32 px (Prüfkörper `ente-haken`).
- `florian-2026-10-16-einfach-kerbe.webp`, `florian-2026-10-16-einfach-kerbe-2.webp` (16.10., Screenshots 2/3): einfache Form aus der Startkugel, Top als Pfeil mit S-Kurve hinten (Prüfkörper `einfach`).
- `florian-2026-10-17-zweihals.webp` (17.10.): sein Zweihals-Versuch auf „Teile“ (Δ Seite 15,5 · Front 85,2 · Top 61,1 px), „noch nicht sauber nachzustellen“.
- `florian-2026-10-17-ente-lappen.webp` (17.10.): Ente mit Hakenschnabel auf „Teile“, Flügelchen als Lappen — „passen nicht, die Form muss richtig dargestellt werden“.
- `florian-2026-10-20-kegel-linien.webp` (20.10.): Kegelkörper mit der „wilden“ lila (Front-Umriss in Seite und Top) und blauen Linie (Seiten-Umriss in der Front); Δ Seite 1,2 · Front 6,0 · Top 3,0 px. Prüfkörper `kegel` der Extremreihe (Plan 20.10., V1), mit stimmigen Maßen nachgebaut.
