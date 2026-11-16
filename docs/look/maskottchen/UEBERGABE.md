# Übergabe: Ozzy, das Maskottchen (Stand 17.11.2026, Runde 4)

Zweig `claude/maskottchen`, Arbeitsbaum `.claude/worktrees/maskottchen`, Seite `apps/editor/maskottchen.html` („Ozzy läuft“),
Eintrag `maskottchen` in `.claude/launch.json` (Port 5207). Plan: [`docs/plans/2026-11-16-ozzy-maskottchen.md`](../../plans/2026-11-16-ozzy-maskottchen.md),
Recherche: [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../../research/2026-11-16-ozzy-morph-und-animation.md).
Prüfbilder: `docs/progress/maskottchen/` (Runde 3: `2026-11-16-r3-*`, Runde 4: `2026-11-17-r4-*`).

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
  - Haut im Raum: atmen, strecken/stauchen, biegen (`biegung`), an steif gekippten Beinen mitdrehen, am Boden platt drücken.
  - Von hinten sitzt der Ringschwanz mit weißem Rand vor dem Rumpf.
- **Beine** (`bein`, `beinWeg`, `beinFlach`):
  - Bis 40° gekippt ist die Sohle flach am Boden und der Gips biegt sich weich. Oben dreht er gut halb mit, die Haut geht mit. Er streckt oder staucht sich, damit der Fuß genau auf seinem Boden steht, auch auf Stufen.
  - Gehobene Füße schweben `hub` über ihrem Boden.
  - Weiter gekippt (Sitzen, Liegen, Kratzen) ist der Gips steif wie ein Brett.
- **Boden-Löser** (`stuetzen`, `boden`): Stehende Beine tragen gemeinsam (weich, Mittel ihrer Längen), steife Beine und der weiche
  Rumpf sind harte Stützen. Mit `frei` sucht er das Kippen, bei dem die Beine gleich lang sind. Böden je Fuß: `stufeVN … stufeHF`.
- **Flüssig** (`fluessig.ts`, `buehne.ts`):
  - Alle schwarzen Teile (auch die Nase) werden als eine Maske groß weichgezeichnet (`glaette` 24): Das gibt runde Kehlen an allen Nähten.
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

## Offen

1. Kopf oben zwischen 40° und 70°: kleine weiße Kerben zwischen Ohr, Haarkappe und Gesichtsrand (Teile morphen getrennt). Eine
   gezeichnete Zwischenansicht (45°) mit denselben Ankern wäre die saubere Lösung.
2. Kinn im Profil: Haken folgt dem Kopf, die weiße Ecke unten ist noch spitz; Florians Urteil abwarten.
3. Ein kleiner weißer Punkt zwischen den Beinen in einzelnen Bildern des Gangs (Naht der Querschnitte mit den Schattenbeinen).
4. Witz und Timing (Laufen, Eilen, Stolpern, Stufen) beurteilt Florian live; Stärke der Federn und Glätte sind Stellgrößen.
