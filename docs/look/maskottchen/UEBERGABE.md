# Übergabe: Ozzy, das Maskottchen (Stand 16.11.2026, Runde 3)

Zweig `claude/maskottchen`, Arbeitsbaum `.claude/worktrees/maskottchen`, Seite `apps/editor/maskottchen.html` („Ozzy läuft“),
Eintrag `maskottchen` in `.claude/launch.json` (Port 5207). Plan: [`docs/plans/2026-11-16-ozzy-maskottchen.md`](../../plans/2026-11-16-ozzy-maskottchen.md),
Recherche: [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../../research/2026-11-16-ozzy-morph-und-animation.md).
Prüfbilder dieser Runde: `docs/progress/maskottchen/2026-11-16-r3-*.png`.

## Was steht

- **Vorlagen** (hier im Ordner): `ozzy-logo.png` (Logo), `ozzy-drei-ansichten.png/.webp` (Florian: Logo, Front, Seite),
  Nachzeichnungen `spur*.json/.svg` (Logo auf 0,04 % genau; Front und Seite in Logo-Koordinaten, `umrechnen.mjs`).
- **Teile aus wenigen Bézier-Ankern** (`scripts/maskottchen/teile-def.mjs` → `teile-bauen.mjs` → `src/maskottchen/daten/anker.ts`):
  je Teil Marken in Front (0°), Logo (15°), Seite (90°). Bauen: `TOL=3 node scripts/maskottchen/teile-bauen.mjs` aus `apps/editor`.
  Was die Zeichnungen nicht haben oder was beim Drehen hakte, ergänzt `rueckseiten()` in `figur.ts` (siehe Runde 3).
- **Morph** (`anker.ts`): Griffe als Winkel/Länge, kompakte Teile um ihren Schwerpunkt, monotone Interpolation über den Winkel,
  glatte Anker glatt, Ecken spitz. **Anhänge** (`figur.ts`, `ANHAENGE`): Ohrwurzeln folgen dem Kopf, der Schopf dem oberen Rand des
  Gesichts, damit Nähte zwischen den Ansichten nicht wandern.
- **Figur** (`figur.ts`): 2,5D mit 3D-Ankern. **Rumpf-Haut** (`rumpfHaut`): Atmen und Strecken/Stauchen um die Hüftlinie, Biegen der
  Bohne (`biegung`, Hüften der nahen Beine fest, vorn läuft es zum Kopf hin aus), Haut dreht an jeder Hüfte ein Stück mit dem Bein
  mit, was unter den Boden käme, drückt sich platt und quillt zur Seite. Anker und Griff-Endpunkte durch dieselbe Abbildung
  (`verformen`), darum entstehen keine Knicke. Kopf und Schwanz sitzen auf der gebogenen, gestauchten Bohne (`amRumpf`). Das
  **Stück am Kinn** (schwarzer Haken unter der Schnauze, Teil `kehle`) geht mit dem Kopf und schwingt (`kehleAmKopf`); das weiße Kinn
  schwingt als Vorhang (`bart`, `bartDreh`). Ferne Beine: gerechnet am wahren Ort, nur im Bild als Schatten versetzt.
- **Boden-Löser** (`boden`): Gipse mit Kippen aus Nicken und Wiegen, liegend unten die runde Hüfte; der Rumpf ist weich (`STUETZEN`
  am Umriss, `WEICH` = 42).
- **Flüssig** (`fluessig.ts`, `buehne.ts`): alle schwarzen Teile hinter dem Gesicht als eine Maske, weichgezeichnet und mit der Maske
  vereinigt (Schließung): runde Kehlen an den Nähten, Spitzen bleiben spitz. Gesicht, Fenster, Loch und Nase scharf darüber.
- **Federn** (`federn.ts`): Ohren, Schopf, Schwanz, Bart (ein Pendel im Bild), Nase, Kopf, Stauchen und Biegen der Bohne; Kopplung wie
  ein Pendel (Winkelbeschleunigung = Beschleunigung der Wurzel / Länge), wenig gedämpft.
- **Clips** (`clips.ts`), ausgerechnet statt geschätzt:
  - Sitzen: Hinterbeine flach nach vorn, Körper 25° zurück, Hintern platt (`sitzLage`).
  - Liegen: Gipse vorn und hinten waagrecht, Bauch platt, Kopf über den Vordergipsen.
  - Stolpern und Anhalten: steif über die Kante der Sohle gekippt, die Wurzel rollt mit (`kippWeg`).
  - Springen: Die Bohne holt aus (hängt durch), schnellt hoch, staucht beim Landen.
  - Laufen: Passgang, Wiegen hebt die schwingende Seite, Klack beim Aufsetzen.
  - Eilen: Trippeltrab.
  - Erschrecken: Ziegenhüpfer, dann steif mit zitternden Ohren.
  - Aufwachen: erst die vorderen, dann die hinteren Gipse unter den Körper.
- **Prüfen:** Typen `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`. Blätter aus der laufenden Seite (flüssig, wie auf der
  Bühne): `ART=clip CLIP=hinsetzen BILDER=10 ABSTAND=0.2 SPALTEN=5 RAHMEN='[-150,-100,1850,1640]' node scripts/maskottchen/seitenblatt.mjs <png>`
  (`ART=kopf|koerper|posen`, `POSEN='[{"theta":40}]'`, `VON=laufen`). Fehlersuche: `BUNT=1` (jedes Teil eigene Farbe),
  `OHNE=schopf,…`, `WEISS='rgba(255,0,0,0.4)'`. Umriss eines Teils: `node scripts/maskottchen/umriss.mjs rumpf 90` (`GRUPPE=kopf ANKER=1`).

## Florians Rückmeldungen (16.11.)

- Die Hinterbeine sind der dunkle Schatten neben den Vorderbeinen, es gibt kein zweites Paar.
- „super smooth“, „tropfenförmig und wunderschön“, „spitz sein können“, „Proportionen immer gut“.
- „Ohren nicht wie 3D-Blätter drehen“, „die Dicke der Silhouette nutzen“; „nur so viele Punkte wie nötig, viel mit den Handles“.
- Runde 3 (wörtlich in Teilen): „der Körper hat eine Bohnenform und soll sich mit den Beinen mitverbiegen, dass es nie Kanten und
  immer flüssige Übergänge zwischen den Teilen gibt. Das gleiche gilt für Ohren, Bart und Nase. Das Stück am Kinn muss sich von der
  Seite auch besser mitbewegen.“ Stolpern, Sitzen, Liegen stimmten nicht, Springen sah nicht gut aus, Laufen und Eilen nicht lustig
  genug, die Gipse nicht lesbar. „Etwas wobbeliger, passend zu liquid drop, daher passt das Verschmelzen ganz gut.“ Keine Vorlagen
  mehr von ihm: selbst analysieren.

## Offen

1. Kopfdrehung 40°–70° oben: Zwischen Ohr, Haarkappe und Gesichtsrand bleiben kleine weiße Kerben. Ursache: Die schwarze Kappe
   wächst zwischen Logo (offener Haaransatz) und Profil (Kappe über der Stirn) über das Gesicht, die Teile morphen getrennt.
   Lösung wäre eine gezeichnete Zwischenansicht (45°) für Kopf, Gesicht und Ohren mit denselben Ankern.
2. Bei negativen Winkeln (nach links schauend) ein weißer Punkt im Schopf um −30°.
3. Ob Laufen und Eilen jetzt lustig genug sind, entscheidet Florian live (Bibliothek, Spielen). Stärke der Federn ist eine Stellgröße
   (`federn.ts`, Kopplungen).
4. Körperdrehung (ψ) und Rückseite sind weiter Entwürfe; Logo-Treue der Ruhepose wieder unter 0,4 %.
