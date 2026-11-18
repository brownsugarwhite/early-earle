# Übergabe: Ozzy-Figur (Stand 18.11.2026, Recherche und Tests)

Neuer Strang neben dem Prototyp `claude/maskottchen`: Ozzy als 2,5D-Bewegungswerkzeug mit Physik, aus Florians eigenen SVGs.
Zweig `claude/ozzy-animation-physics-294508` (aufgesetzt auf `claude/maskottchen` @ ebb6fd21), Arbeitsbaum
`.claude/worktrees/ozzy-animation-physics-294508`.

## Wo was liegt

- **Plan (wartet auf Florians Freigabe):** [`docs/plans/2026-11-18-ozzy-figur.md`](../../plans/2026-11-18-ozzy-figur.md)
- **Recherche:** [`docs/research/2026-11-18-ozzy-figur-recherche.md`](../../research/2026-11-18-ozzy-figur-recherche.md)
- **Vorlagen:** `vorlagen/` (sechs SVGs aus Illustrator, 18.11.; Original auf Florians Schreibtisch `~/Desktop/ozzy/svg`)
- **Prüfbilder:** `docs/progress/ozzy-figur/2026-11-18-t*.png`
- **Proben:** `apps/editor/scripts/ozzy-figur/tests/` (README dort; aus einem leeren Ordner starten, kein Dev-Server nötig)

## Stand

- Gebaut ist nur, was die Tests brauchten (Import und Morph als Skripte, Test-Renderer `sdf/fluessig.js`). Kein Code unter `src/`.
- Ergebnisse: Teile morph-fähig (nach dem Säubern der 0,01-Schlusslinien), Renderer exakt (0,2 %), Kopfdrehung aus Front und
  Profil trägt (Fehler nur auf der abgewandten Seite), Körperdrehung Front → Logo trägt, Tempo am Mac rund 6 ms je Bild.

## Nächster Schritt

Florians Antwort zum Plan abwarten. Bei Freigabe: Etappe A (Import, Prüfer, Daten) und B (Renderer als Baustein mit
Außenkanten auf der Grafikkarte), danach seine Messung auf dem iPhone.

## Fallen aus den Tests

- Gespiegelte Hälften (A/B) überlappen in der Mitte; in einer gemeinsamen Maske mit Schablone löschen sie sich aus → jedes Teil
  braucht sein eigenes Abstandsfeld, vereinigt wird erst im Bildpass.
- Das Minimum der Teilefelder ist innen kein Abstand zum Umriss (innere Nähte, z. B. der Scheitel zwischen den Kopfmasken). Wer
  Weiß am Umriss klemmen will, braucht den Abstand zu den **Außenkanten**.
- Ein Band mit Breite 0 (Ohrspalt, wenn die Ohren sich nicht überdecken) zeichnet über die Kantenglättung trotzdem eine Haarlinie:
  Bänder als Deckung `deck(d − w) − deck(d)` zeichnen, nicht als Abstand.
- Ein fester Mindestrand um Weiß verändert die Vorlagen (Scheitel: Rand 0) → Rand nur auf der abgewandten Seite.
- Gespiegelte Formen nie mit gleicher Ankernummer auf die Front mischen (die Mitte fällt zu einer Linie zusammen): Links- und
  Rechtsdrehung brauchen die Partnerkarte.
