# Ozzy, Shader Runde 6: Fell, Flausch, Häute im Zeichenstil, Diskokugel (21.11.2026, gebaut)

Florian (wörtlich): „gerne noch nachschärfen. Diskokugel wirkt noch nicht überzeugend und auch Die Tiermuster können mit den rex
nicht mithalten. Außerdem hätte ich gerne noch mehr Hautshader im manga, anime und spider-verse look. Und wir brauchen eine richtig
gute art fell mit verschiedensten mustern als shader darzustellen. Ich fand Ghibli shader schon sehr cool. Gerne mehr davon mit
mustern und andere stile. Mache gerne nochmal ausführliche recherchen welche arten von fell es gibt und wie wir es am besten
darstellen. Auch verschiedenen Zuckerwatte/wolke, flauchige shader. Alles absolute state of the art und gerne auch experimentelles
und extrem stilisiertes ausprobieren.“

Recherche: `docs/research/2026-11-21-fell-flausch-recherche.md`. Zweig `claude/ozzy-shader`, Fenster 5219.

## Grundentscheidung: Fell aus Schalen

Bisher war Fell nur ein Muster auf der Haut, dazu ein Haarsaum im Bild. Neu ist echtes Fell aus **Schalen** (Lengyel u. a. 2001):

- Der Kern zeichnet sein Netz **instanziert**, 12 bis 40 Schalen in einem Durchgang, jede ein Stück weiter außen längs der Normale
  und in Strichrichtung geneigt. Jede Schale zeigt die Querschnitte der Haare in ihrer Höhe. So hat das Fell eine echte
  Silhouette, ohne Filter über dem Bild (der rutschte bei Bewegung).
- **Haare als Zellen im Raum** (je Zelle ein Haar; keine Ebenen, also keine Nähte), Länge je Haar verschieden, zur Spitze dünner.
  **Büschel:** Die Spitzen laufen zur Mitte ihres Büschels (Silva u. a. 2010). **Strich:** längs der Körperachse und mit der
  Schwerkraft nach unten. **Locken:** Wendeln um die Wurzel.
- **Kantenglättung** über Deckung zu Abtastungen (MSAA mit alpha to coverage): beim Drehen ruhig.
- **Licht:** Kajiya-Kay mit zwei verschobenen Glanzlinien (Scheuermann 2004), Wurzeln dunkler, Gegenlicht am Rand.
- **Muster** an der Wurzel jedes Haars, Agouti-Bänder längs des Haars; Colorpoint dunkel, wo die Form dünn und weit von ihrer
  Mitte ist; Scheckung weiß von unten und an den Enden.

## Etappen

1. **Fell-Motor** (`fell.ts`): Schalen, Haare, Büschel, Strich, Licht, Muster, Stile.
   - **Stile:** Echt, Ghibli (gemalte Büschel, drei Töne, Pinselspur längs der Haare, Papier), Anime (spitze Büschel, harte Stufen,
     Randlicht, Kontur), Spider-Verse (Tuschestriche auf der Schattenseite der Büschel, Raster, versetzte Platte), Manga (Schwarz und
     Weiß, Rasterfolie, Federstriche), Plüsch (dicht und kurz, Samtglanz).
   - **Felltypen:** kurz und glatt, Doppelfell, Plüsch, lang, Zotteln, Locken.
   - **Muster:** Uni, Tiger, Leopard, Gepard, Jaguar, Schneeleopard, Zebra, Giraffe, Katze getigert, Katze marmoriert, Kaliko,
     Schildpatt, Siam, Dalmatiner, Kuh, Fuchs, Waschbär, Wildhund, Merle.
   - Leopard, Tiger, Giraffe (Tiermuster) laufen danach auf diesem Fell (gleiche Namen in der Wahl).
   - Neue Gruppe in der Wahl: **„Fell & Flausch“**.
2. **Flausch:** Wolke (Echt nach Nubis: Beer, Puder, Vorwärtsstreuung, Mehrfachstreuung; Ghibli, Anime, Spider-Verse), Zuckerwatte
   (feine wirre Fasern, durchscheinend, rosa und hellblau, Glitzer), Schafwolle (Locken, dunklere Spitzen), Pusteblume
   (experimentell: Stiele mit Schirmchen).
3. **Häute im Zeichenstil:** T-Rex mit den neuen Stilen Anime und Manga; neue Häute mit eigenem Motor wie beim T-Rex: Drache
   (große, sich überlappende Schuppen als Schindeln im Raum), Frosch (glatt, nass, Giftfarben), Chamäleon (Körnchen, Farbbänder),
   Krake (Farbzellen, Warzen, Schimmer). Stile je Haut: Echt, Anime, Manga, Spider-Verse.
4. **Schuppentiere auf T-Rex-Niveau:** Python, Klapperschlange, Korallennatter, Krokodil mit Schindeln im Raum (keine Ebenen, keine
   Naht), Normale aus dem Gefälle, Licht wie Kino, eigene Bühnen, dieselben Stile. Salamander und Elefant: Licht und Bühne.
5. **Diskokugel neu:** Plättchen in Breitenkreisen um die Hochachse (wie eine echte Kugel), jedes eben und leicht verkippt, mit
   Fugen; der Raum dunkel mit kleinen farbigen Lampen, darum blitzen nur wenige Plättchen, dafür grell und mit Sternen; die
   Strahlen als Linien im Raum (scharf, nicht körnig), Lichtflecken an Wand und Boden wandern mit der Drehung.
6. **T-Rex nachschärfen:** Anime und Manga (Etappe 3); Kino-Bühne lebt (Rauch zieht, Flugsaurier ziehen, Glut steigt).
7. **Bilder, Übergabe, was bleibt.**

## Prüfung

Je Etappe Bilder an „strange bird“ (Übersicht und nah, `GIER=-30 NEIGUNG=8`, `ZOOM=2.4` und `7`), Konsole ohne Fehler, Typen und
Lint. Tempo: je neuem Motor einmal die Zeit eines Bilds auf dem Mac messen (Grafikkarte, nicht nur Prozessor); am iPhone nicht.
Sein Auge entscheidet; Offenes sammle ich in `docs/plans/2026-11-20-ozzy-shader-was-bleibt.md`.

## Stand (21.11.2026)

Gebaut: Etappe 1 bis 5 und 7; Etappe 6 zur Hälfte (T-Rex in Anime und Manga ja, die lebende Kino-Bühne nein). 62 Shader in sechs
Gruppen. Bilder `docs/progress/ozzy/shader/2026-11-21-runde-6-*.png`; Offenes: `…-shader-was-bleibt.md`, Punkte 26 bis 40.

Anders als geplant:

- **Fell:** Ghibli malt dicke Haare in großen Büscheln (Kegel sahen aus wie Blätter oder Federn); Anime, Spider-Verse und Manga
  nehmen Büschel als Flammen (mit dünnen Haaren wurde ihre Kontur fleckig); Tusche nur an den Kanten der Büschel. 20 Muster (dazu
  Wolle). Schaf und Plüschtier sind Voreinstellungen des Fells, keine eigenen Motoren.
- **Tempo** (nicht im Plan, nach der ersten Messung: 96 bis 300 ms je Bild): Muster einmal je Ecke in einer Textur, acht statt
  27 Nachbarzellen, in Bewegung 45 % der Schalen in 70 % der Auflösung, danach ein Bild in voller Güte. Jetzt 25 bis 48 ms in
  Bewegung im Testbrowser.
- **Flausch:** Fell und Flausch teilen den Lauf der Schalen (`schalen.ts`); die Wolke hat Echt, Ghibli, Anime (kein Spider-Verse).
- **Häute:** Earle als fünfter Stil für alle Häute; die Schuppentiere laufen auf demselben Motor (`haeute.ts`).
- **Diskokugel:** Kacheln aus einem Würfelraster im Raum statt in Breitenkreisen (Kreise um eine Achse laufen an den Polen und in
  Mulden der Form zusammen); die Strahlen entstehen im Bild (radial verwischt) statt als Linien im Raum.
