# Übergabe: Ozzy, das Maskottchen (Stand 17.11.2026, Runde 5)

Zweig `claude/maskottchen`, Arbeitsbaum `.claude/worktrees/maskottchen`, Seite `apps/editor/maskottchen.html` („Ozzy läuft“),
Eintrag `maskottchen` in `.claude/launch.json` (Port 5207). Plan: [`docs/plans/2026-11-16-ozzy-maskottchen.md`](../../plans/2026-11-16-ozzy-maskottchen.md),
Recherche: [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../../research/2026-11-16-ozzy-morph-und-animation.md).
Prüfbilder: `docs/progress/maskottchen/` (Runde 3: `2026-11-16-r3-*`, Runde 4: `2026-11-17-r4-*`, Runde 5: `2026-11-17-r5-*`).

## Runde 5 (17.11.): Tempo, Gelände je Fuß, Übergänge ohne Sprung

- **Tempo** (`fluessig.ts`, `buehne.ts`): Die Figur liegt ganz auf der Grafikkarte in ihrer eigenen Ebene (WebGL2). Die Maske wird als
  Schablone gefüllt (Fächer zählen die Umläufe wie „nonzero“), mit Mehrfachabtastung, nur im Rahmen der Figur. Keine Kopien
  Canvas ↔ Grafikkarte mehr (die kosteten in Safari rund 30 ms je Bild). WebKit in Mac-Größe: 43 → 17 ms je Bild, 60 Bilder/s, auch
  in iPhone-Größe. Prüfblätter und Aufnahme kopieren die Figur in den Grund (`buehne.inGrund`); Schrift liegt auf der oberen Ebene
  (`schriftCtx`).
- **Glätten ohne Treppen:** Das große Weichzeichnen läuft auf einer verkleinerten Stufe (Mittel aus 2 × 2, bis σ 3–6 Punkte misst)
  und wird als B-Spline gelesen. Vorher tastete es die scharfe Maske in Sprüngen ab, die Brücken (Hals, Schwanz, Bein am Bauch)
  franzten treppig aus (`2026-11-17-r5-bruecken-*`).
- **Gelände je Fuß** (`spieler.ts`, `figur.ts`, `clips.ts`, `spiel.ts`):
  - Der Spieler kennt den Boden (`bodenFn`: im Spiel die Plattformen und neu Rampen; sonst die Stufen der Treppen-Clips). Jeder Fuß steht auf dem Boden unter seiner Sohle; stehende Füße haften, ein neuer Boden kommt weich nach.
  - Der Körper neigt sich nach dem Gelände (`gelaendeNicken`, `kippen`: die Beine bleiben dabei in der Welt stehen).
  - Ein stehender Fuß streckt sich zu seinem Boden, bis er abhebt (Kanal `reichen`, beim Stolpern 0).
  - Der Gang plant Tritte: Jeder Fuß setzt an einer festen Stelle auf, weicht Kanten aus (Schritt kürzer oder länger, höchstens 110) und hebt die ganze Sohle über das Gelände (Kanal `bahn`). Klack nur, wenn ein Fuß im Clip aufgesetzt hat.
  - Im Spiel nimmt er Stufen bis 110 im Gang (Bordstein 90, Absatz 110 nach einer Rampe), 110–320 klettert er, höhere springt er.
- **Löser ohne Ruck:** Ziel-Nicken und Höhe werden kritisch gedämpft nachgeführt (`nickenZiel`, `kippenAuf`, `hoeheSetzen`); die
  Federn rechnen in der Welt (ein Wechsel des Grunds stößt sie nicht an).
- **Übergänge mit Trägheit** (`uebergang = 'traegheit'`, Schalter `'blenden'` für das alte Überblenden): Der neue Clip gilt sofort,
  der Unterschied zum alten (Lage und Schwung je Kanal) klingt als Polynom 5. Grades ab; der Schwung rollt aus.
- **Proben:** `tempo.mjs` (Bildabstände je Motor und Größe), `nebeneinander.mjs` (Vorher/Nachher), `spielbilder.mjs` (echter Takt
  im Spiel), Prüfblatt `ART=spiel VON=… [ALT=1]` (Gelände; `ALT=1` rechnet wie bisher mit allen Füßen auf einer Höhe).

## Was steht

- **Vorlagen** (hier im Ordner): `ozzy-logo.png`, `ozzy-drei-ansichten.png/.webp` (Logo, Front, Seite), Nachzeichnungen `spur*`.
- **Kopf aus wenigen Bézier-Ankern** (`teile-def.mjs` → `teile-bauen.mjs` → `src/maskottchen/daten/anker.ts`), Morph nach Winkel/Länge
  (`anker.ts`). Was die Zeichnungen nicht haben oder was beim Drehen hakte, ergänzt `rueckseiten()` in `figur.ts`:
  - ferner Schlitz im Profil als winzige Kopie (bei 60° fast zu),
  - Schopf von vorn aufrecht und spiegelgleich (Paare a–c, d–e: nach dem Umdrehen exakt gespiegelt), im Profil im Haar,
  - Strähne endet in der Nase,
  - von hinten verschwinden Gesicht und Nase hinter dem Kopf.
  - Anhänge halten die Nähte: Ohrwurzeln am Kopf, Schopf am Gesicht.
- **Körper aus Querschnitten** (`querschnitte` in `figur.ts`): Superellipsen entlang des Körpers, oben und unten genau Florians
  Seitenansicht, Breite wie seine Front, zu den Enden rund. Dadurch stimmt die Silhouette in jeder Richtung: Seite, schräg,
  frontal, von hinten.
  - Haut im Raum: atmen, strecken/stauchen, biegen (`biegung`), an den Hüften mit den Beinen mitdrehen, am Boden platt drücken.
  - Bauch zwischen den Beinen: In jedem Bild spannt sich ein runder Bogen zwischen die Innenkanten der Beine (`lueckeBogen`).
    Darum zeigt die Lücke im Gang keine Buckel; die Tropfen der Zeichnung (W) sind ersetzt.
  - Von hinten verschmilzt der Ringschwanz mit dem Rumpf, ohne Rand, das Loch wird dafür größer (Florian, 17.11.).
- **Kinnhaken** (`kehle`, scharf gezeichnet, nicht in der flüssigen Maske): von der Seite nach dem Blick des Kopfs zwischen der
  Locke des Logos (15°) und Florians schlankem Sporn aus der Seitenansicht (90°, `kehleSeite`). Die Spitze geht mit dem Kopf.
  Prüfen gegen die Vorlage: `VORLAGE=spur-seite.json` legt Florians Seitenansicht rot über das Blatt.
- **Beine** (`bein`, `beinWeg`, `beinFlach`):
  - Bis 40° gekippt ist die Sohle flach am Boden. Der Gips bleibt gerade und wird erst kurz vor der Sohle flach. Er streckt oder staucht sich, damit der Fuß genau auf seinem Boden steht, auch auf Stufen.
  - Gehobene Füße schweben `hub` über ihrem Boden.
  - Weiter gekippt (Sitzen, Liegen, Kratzen) ist der Gips steif wie ein Brett.
- **Boden-Löser** (`stuetzen`, `boden`): Stehende Beine tragen gemeinsam (weich, Mittel ihrer Längen), steife Beine und der weiche
  Rumpf sind harte Stützen. Mit `frei` sucht er das Kippen, bei dem die Beine gleich lang sind. Böden je Fuß: `stufeVN … stufeHF`.
- **Flüssig** (`fluessig.ts`, `buehne.ts`):
  - Alle schwarzen Teile (auch die Nase, nicht der Kinnhaken) werden als eine Maske groß weichgezeichnet (`glaette` 32): Das gibt runde Kehlen an allen Nähten.
  - Dazu kommt ein kleines Weichzeichnen (`glatt` 5): Ecken werden weich, Spitzen nur wenig stumpfer.
- **Federn** (`federn.ts`): wie Pendel gekoppelt, wenig gedämpft (Ohren, Schopf, Schwanz, Bart, Nase, Kopf, Stauchen, Biegen).
- **Clips** (`clips.ts`):
  - neu: Stufe hoch/runter (Fußfolge mit geplanten Tritten, `trittePlanen`, `fussfolge`), Zuwenden, frontal Stehen, Rücken zudrehen, von hinten Stehen,
  - umgebaut: Anhalten (Pudding über stehenden Sohlen), Stolpern (Nase in den Boden, Hinterbeine strampeln, Schütteln), Schnüffeln (alle Sohlen am Boden),
  - Laufen und Eilen wackliger.
- **Mischer** (`spieler.ts`):
  - Winkel über den kürzesten Weg (Umschauen dreht nicht zurück).
  - Kontext je Clip (Stufenhöhe).
  - Nach einer Stufe wird der neue Boden zum Grund (`hoehe`, `stufeVersatz`), Gelände für Bibliothek und Filmstreifen.
- **Spiel** (`spiel.ts`):
  - Stufen bis 320 klettert er hoch, Absätze bis 320 steigt er hinunter, höhere springt er.
  - V dreht ihn zu uns, H dreht ihm den Rücken zu.
  - Steht er länger still, dreht er sich zu uns und setzt sich dann.
- **Prüfen:** Typen `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`.
  - Blätter aus der laufenden Seite: `ART=clip CLIP=… BILDER=10 ABSTAND=0.2 SPALTEN=5 RAHMEN='[…]' node scripts/maskottchen/seitenblatt.mjs <png>`.
  - `MITLAUFEN=0` zeigt die Stufe, `ART=posen POSEN='[{"psi":45,"theta":30}]'` zeigt einzelne Posen.
  - Fehlersuche: `BUNT=1`, `OHNE=…`, `WEISS=…`, `GLAETTE=…`, `GLATT=…`.

## Florians Rückmeldungen

- 16.11.: Die Hinterbeine sind der Schatten neben den Vorderbeinen; „super smooth“, „spitz sein können“, nichts wie ein Blatt
  drehen, wenige Anker mit Griffen; Runde 3: Bohne biegt mit, keine Kanten an Nähten, Kinn von der Seite, wobbelig.
- 17.11. (Runde 4):
  - „Der Körper macht noch Ecken beim Übergang zu den Beinen … du kannst auch wieder komplett verflüssigen, … wenn es für die Animation besser ist, gehe ich mit der abgerundeten Form.“
  - Übergang Gesicht–Nase smoother, Kinn im Profil.
  - Umschauen drehte zurück.
  - „Die Beine dürfen sich auch manchmal lustig verformen, aber die Fußsohlen sollen immer am Boden stehen und nicht kippen.“
  - Wackliger; beim Schnüffeln ging das Hinterteil komisch hoch.
  - Stufen angestrengt hoch- und runterklettern statt springen; Stolpern viel witziger.
  - Nach dem Drehen nicht genau spiegelverkehrt (Schopf, Bart).
  - „Der Körper ist das Wichtigste.“
  - Front- und Rückpose: frontal stehen, den Rücken zudrehen, alles perfekt smooth.

- Nachtrag 17.11. (nach den Prüfbildern):
  - Im Gang zeigt der Übergang des Körpers zwischen den Beinen noch Stellen.
  - Das Kinn ist zu rund, nicht wie die Vorlage von der Seite.
  - Um den Schwanz soll keine zweite Outline liegen; lieber das Loch vergrößern, wenn der Ring im Körper aufgeht.

- 17.11. (Runde 5): „Was mich gerade am meisten stört, ist die Performance, und Ozzy sollte dynamisch auf die Physik reagieren
  können, also wissen, wann er mit den Vorder- oder Hinterbeinen höher stehen muss, und alles muss noch dynamischer sein und
  perfekt ohne Sprung und direkter ineinander überlaufen.“ Genauere Vorlagen für die Formen schickt er als AI/SVG.

## Offen

1. Kopf oben zwischen 40° und 70°: kleine weiße Kerben zwischen Ohr, Haarkappe und Gesichtsrand (Teile morphen getrennt). Eine
   gezeichnete Zwischenansicht (45°) mit denselben Ankern wäre die saubere Lösung.
2. Kinnhaken bei starkem Nicken: Er knickt leicht, wo Kopf und Brust ihn ziehen.
3. Im Gang bleibt eine winzige Stufe, wo eine schwebende Schattensohle neben der stehenden aufsetzt (Hub 3).
4. Witz und Timing (Laufen, Eilen, Stolpern, Stufen) beurteilt Florian live; Stärke der Federn und Glätte sind Stellgrößen.
5. Runde 5:
   - Beim Hinabsteigen der 260er-Stufe sackt der Körper vorn um rund 100 ab, wenn der nahe Vorderfuß abhebt (Choreografie des Kletter-Clips; jetzt über 0,1 s statt in einem Bild).
   - Beim Eilen über eine 110er-Stufe hebt sich ein Fuß in 3 Bildern um 128 (der Trab-Schritt ist kurz).
   - Weicht ein Tritt einer Kante weit aus, steht das Bein am Ende bis 33° schräg.
   - Florians AI/SVG-Vorlagen für die Formen einarbeiten.
