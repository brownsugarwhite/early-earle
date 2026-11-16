# Übergabe: Ozzy, das Maskottchen (Stand 16.11.2026 abends)

Zweig `claude/maskottchen`, Arbeitsbaum `.claude/worktrees/maskottchen`, Seite `apps/editor/maskottchen.html` („Ozzy läuft“),
Eintrag `maskottchen` in `.claude/launch.json` (Port 5207). Plan: [`docs/plans/2026-11-16-ozzy-maskottchen.md`](../../plans/2026-11-16-ozzy-maskottchen.md),
Recherche: [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../../research/2026-11-16-ozzy-morph-und-animation.md).

## Was steht

- **Vorlagen** (hier im Ordner): `ozzy-logo.png` (Logo), `ozzy-drei-ansichten.png/.webp` (Florian: Logo, Front, Seite),
  Nachzeichnungen `spur*.json/.svg` (Logo auf 0,04 % genau; Front und Seite in Logo-Koordinaten, `umrechnen.mjs`).
- **Teile aus wenigen Bézier-Ankern** (`scripts/maskottchen/teile-def.mjs` → `teile-bauen.mjs` → `src/maskottchen/daten/anker.ts`):
  je Teil Marken mit Lage in Front (0°), Logo (15°), Seite (90°); zwischen zwei Marken so wenige kubische Stücke wie nötig (verdeckte
  Strecken genau eins). Bauen: `TOL=3 node scripts/maskottchen/teile-bauen.mjs` aus `apps/editor`.
- **Morph** (`anker.ts`): Griffe als Winkel/Länge, Ohren, Schopf, Nase, Schwanz um ihren Schwerpunkt, monotone Interpolation über den
  Winkel, glatte Anker glatt, Ecken spitz (Stärke je Ansicht). Negative Winkel gespiegelt; der Schopf nur verschoben (behält seine
  Neigung).
- **Figur** (`figur.ts`): 2,5D mit 3D-Ankern (Hals, Hüften, Schwanzwurzel), Kopf als schwarze Fläche plus Gesicht (weiß, beide
  Schlitze als Kerben), Ohren/Schopf/Schwanz biegen, Nase wird beim Wegdrehen verdeckt, Gipssäulen mit runder Hüfte, ferne Beine
  als Schatten (Versatz je Blickrichtung), Boden-Löser für die steifen Beine (`boden`).
- **Bewegung:** `clips.ts` (26 Clips), `spieler.ts` (Mischer), `federn.ts` (Nachschwingen), `spiel.ts` (Level und Steuerung),
  `main.ts` (Reiter Spielen, Bibliothek, Filmstreifen, Drehen).
- **Prüfen:** Logo-Pose `npx vite-node scripts/maskottchen/pose-svg.ts <svg>` + `node scripts/maskottchen/vergleich.mjs <svg> <diff>`
  (zuletzt 0,78 % der Fläche, Ränder bis 3 Bildpunkte); Blätter `ORDNER=… npx vite-node scripts/maskottchen/blatt.ts <name> kopf|koerper|clip`
  (`WINKEL=…`, `CLIP=laufen BILDER=12 MITLAUFEN=1`).

## Florians Rückmeldungen (16.11., alle während der Arbeit)

- Die Hinterbeine sind der dunkle Schatten neben den Vorderbeinen, es gibt kein zweites Paar.
- „super smooth“, „tropfenförmig und wunderschön“, „spitz sein können“, „Proportionen immer gut“, „Das kannst du besser!“
- „Ohren nicht wie 3D-Blätter drehen“, „nichts einfach wie ein Blatt drehen, die Dicke der Silhouette nutzen“.
- „nur so viele Punkte setzen wie nötig, viel mit den Bézier-Handles arbeiten, die Punkte genau animieren, keine hinzufügen“.
- „Ich schmeiß einfach alles rein, was mir auffällt“ (gern; die Seite ist während der Arbeit eine Baustelle).

## Offen

1. Zwischenformen 45°–60°: Schopfspitze zwischen den Ohren, feine Zacken unter der Nase, Kerbe am Ohransatz (Marken genauer
   zuordnen).
2. 3/4-Ansicht (45°) und Rückseite für Kopf und Körper: am besten von Florian in Illustrator mit denselben Ankern (dann wird die
   Drehung sauber); sonst Entwurf von mir zum Korrigieren. Ohne sie bleiben Körperdrehung und Rückseite Entwürfe.
3. Große Beinwinkel (Sitzen) wirken wie gedrehte Kästen: Florian fragen, ob die Gipse dort leicht nachgeben dürfen.
4. Timing der Clips mit Florian durchgehen (Bibliothek), dann Feinschliff; Logo-Treue der Ruhepose wieder unter 0,4 %.
