# Plan: Ozzy, das Maskottchen (16.11.2026)

Seite `apps/editor/maskottchen.html` („Ozzy läuft“), Code `apps/editor/src/maskottchen/`, Werkzeuge `apps/editor/scripts/maskottchen/`,
Vorlagen `docs/look/maskottchen/`, Zweig `claude/maskottchen` (Arbeitsbaum `.claude/worktrees/maskottchen`, Port 5207, Eintrag
`maskottchen`). Recherche: [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../research/2026-11-16-ozzy-morph-und-animation.md).

## Stand

- **Vorlagen:** Logo nachgezeichnet (Abweichung 0,04 %), Florians Front- und Seitenansicht in Logo-Koordinaten.
- **Teile mit wenigen Ankern** (Florian: „nur so viele Punkte wie nötig“): Nase 4, Schopf 5, Ohren je 6, Kopf 13, Gesicht 29,
  Rumpf 13, Kehle 6, Schwanz 8, Loch 4 (zusammen 88 statt rund 2000 Punkte). Gleiche Anker in Front (0°), Logo (15°), Seite (90°).
  Erzeugt von `teile-bauen.mjs` aus `teile-def.mjs` (Marken je Ansicht).
- **Morph nach Winkel und Länge** (`anker.ts`): Griffe immer als Winkel/Länge, Ohren, Schopf, Nase, Schwanz um ihren Schwerpunkt;
  monotone kubische Interpolation über den Blickwinkel; glatte Anker bleiben glatt, Ecken spitz (Eckstärke je Ansicht).
- **Aufbau des Kopfs:** schwarzer Kopf als eine Fläche, weißes Gesicht als eine Fläche mit beiden Schlitzen als Kerben, Ohren und
  Schopf dahinter, Nase darauf. Das Band über der Schnauze im Profil ist der Streifen zwischen Gesichtsrand und Kopfumriss.
- **Beine:** vier Gipssäulen gleicher Breite, Fenster mittig; der dunkle Schatten neben jedem Bein ist das ferne Bein (Florian), das
  im Profil 110 vorn, in der Front 60 außen steht. Runde Hüfte, damit beim Schwingen keine Ecke herausragt.
- **Rückseite (90° → 180°):** Entwurf ohne Vorlage. Das Gesicht wird zur Vorderkante hin schmal, der Kopf schließt oben als Kuppel,
  Ohren und Schopf gehen den Weg zurück in ihre Frontlage (nichts klappt um).

## Was Florian bemängelt hat und was daraus folgt

| Rückmeldung | Ursache | Abhilfe |
| --- | --- | --- |
| zerrissen, kantig, „viel zu plump“ | Hunderte Punkte, je auf gerader Bahn; Teile mit eigenen Rändern liefen auseinander | wenige Anker, Morph nach Winkel/Länge, Gesicht und Kopf je eine Fläche |
| „Ohren nicht wie 3D-Blätter drehen“, Schopf „wie ein Blatt“ | Karten-Drehung und Spiegeln bei 0° | nichts drehen oder spiegeln, das dünn würde; Schopf behält seine Neigung |
| Nase wird nur kleiner | Schrumpfen beim Wegdrehen | Nase bleibt voll und wird vom Kopf verdeckt |
| Ring dünn, Bein als Kasten, Körperdrehung falsch | Ring gequetscht, eckige Hüfte, Zwischenformen des Rumpfs | Ring nie gequetscht (Wechsel vorn, verdeckt), runde Hüfte; Rumpf braucht eine 3/4-Ansicht |
| „spitz sein können“ | flüssige Weichzeichnung rundet Spitzen | abgeschaltet (bleibt als Regler) |

## Was noch fehlt (Reihenfolge)

1. **Zwischenformen 15° → 90° glätten:** Schopf schmilzt in den Rand des vorderen Ohrs statt in sein Inneres; rechter Schlitz und
   Backenbart laufen an die Schnauze, ohne Zacken; Kerbe am Ohransatz schließen. Probe: `blatt.ts kopf` mit `WINKEL=15,30,45,60,75,90`.
2. **Fehlende Ansichten:** 3/4 vorn (45°) und hinten (180°) für Kopf und Körper. Am besten von Florian in Illustrator, mit denselben
   Ankern wie Front und Seite (oder ich entwerfe sie, er korrigiert). Ohne sie bleiben Körperdrehung und Rückseite Entwürfe.
3. **Bibliothek:** Stehen, Laufen (Passgang mit Wiegen), Eilen, Anhalten (Nachwippen auf den Sohlen), Umdrehen, Hinsetzen/Sitzen/
   Aufstehen (Schaukeln wie ein alter Mann), Hinlegen/Schlafen/Aufwachen, Schnüffeln (Schubkarre), Kopf schief, Umschauen,
   Schütteln, Springen (steif, alle vier zugleich), Stolpern, Erstarren und Umkippen, Bellen (Rückstoß), Wedeln, Warten (Bein tippt),
   Kratzen (erreicht das Ohr nie), Ziel fixieren. Federn für Ohren, Schopf, Schwanz, Bart, Kopf (`federn.ts`), Boden-Löser für die
   steifen Beine (`Figur.boden`).
4. **Mischer:** Überblenden im Zahlenraum der Pose, Wurzelbewegung, Blickrichtung über ψ (nach links = ψ −90°, die Schatten-Beine
   bleiben vorn).
5. **Filmstreifen:** Clips aneinanderreihen, Dauer und Übergang je Karte, abspielen, als Video (WebM) und JSON sichern.
6. **Spielen:** kleines Level, Pfeile/WASD und Knöpfe für das iPhone, Coyote-Zeit, Sprung-Puffer.

## Prüfen

- Logo-Pose gegen das Logo: `npx vite-node scripts/maskottchen/pose-svg.ts <svg>` und `node scripts/maskottchen/vergleich.mjs <svg> <diff.png>`.
- Drehblätter: `ORDNER=… npx vite-node scripts/maskottchen/blatt.ts <name> kopf|koerper|ausdruck|beine`.
- Formen neu bauen: `TOL=3 node scripts/maskottchen/teile-bauen.mjs` (aus `apps/editor`).
