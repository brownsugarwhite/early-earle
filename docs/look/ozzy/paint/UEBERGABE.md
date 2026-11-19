# Übergabe: Paint-Modus in Ozzy (Stand 19.11.2026, vormittags)

Florian will in Ozzy einen Paint-Modus mit Ebenen, einer Ebenen-Ansicht und einem neuen Material (sein Auftrag wörtlich im Plan).
Das Maul kommt später in einer eigenen Sitzung. Diese Übergabe wird am Ende jedes Blocks überschrieben.

## 1. Einstieg

| Was | Wo |
| --- | --- |
| Zweig, Arbeitsbaum | `claude/reverent-feynman-1efdd3`, `.claude/worktrees/reverent-feynman-1efdd3`. Baut auf dem Zweig der Objekte auf (`claude/ozzy-donut-mirror-system-7a31b7`, Stand `3a091f14`). **Nicht zusammengeführt**, weder mit ihm noch mit `claude/ozzy`: erst auf Florians Wort, am Schluss. `main` bleibt unberührt. |
| Fenster | `http://localhost:5215/ozzy.html`, Eintrag `ozzy-paint` in `.claude/launch.json`. Proben: `OZZY_URL=http://localhost:5215/ozzy.html`. Nie unter seinen Fenstern bauen (5205, 5211, 5194). |
| Plan | [`docs/plans/2026-11-19-ozzy-paint-modus.md`](../../../plans/2026-11-19-ozzy-paint-modus.md): Auftrag, Vorschlag, Etappen mit Kriterien, Antworten auf die Grundfragen, Bauweise |
| Recherche | [`docs/research/2026-11-19-zbrush-grundmaterial.md`](../../../research/2026-11-19-zbrush-grundmaterial.md): wie ZBrush sein Grundmaterial macht, mit Quellen, und der Nachbau |
| Seine Vorlage | [`2026-11-19-zbrush-matcap-red-wax.png`](2026-11-19-zbrush-matcap-red-wax.png) (ZBrush 4R7, Kugel in „MatCap Red Wax“) |
| Bilder | `docs/progress/ozzy/2026-11-19-wachs-vergleich.png`, `…-wachs-strange-bird.png`, `…-ebenen-ansicht-skizze.png` |

## 2. Stand

| Etappe | Stand |
| --- | --- |
| 0 Material „Wachs“ | **gebaut** (Commit `0bd660cb`). Sein Urteil steht aus: Trifft es ZBrush, und welcher Farbton? |
| Plan Paint-Modus | **liegt ihm zur Freigabe vor.** Zwei Fragen an ihn: Freigabe; ob „gewohnte Tools“ seine Werkzeuge aus Ozzy meint (A, P, Freihand, Ellipse, Lasso, K) |
| 1 bis 7 | nicht begonnen. **Nichts davon ohne sein Wort bauen.** |

**Nächster Schritt nach seiner Freigabe:** Etappe 1, der Beweis (Plan, 3.1): eine Farblinie, eine Füllung, harte Kante, bleibt
beim Umformen auf der Haut; fünf Kriterien. Vorschlag für die Reihenfolge darin: (1) Ort auf der Haut und Mitgehen über
Netzwechsel, gemessen im Fenster, noch ohne Bedienung (Kriterium 2 und 3 zuerst: Daran hängt alles); (2) Schneiden in die Anzeige
und Zeichnen auf beiden Gründen (Kriterium 1 und 4); (3) P und der Klick zum Füllen, Sichern, Laden, ⌘Z (Kriterium 5); dann Film
und Bild an ihn.

## 3. Was gebaut ist: das Material „Wachs“

- **Was es ist:** ZBrushs Grundmaterial „MatCap Red Wax“, nachgebaut, wie ZBrush es zeichnet: als Matcap. Die Farbe hängt nur
  von der Normalen im Blick ab und wird aus einem Kugelbild nachgeschlagen; kein Licht, kein Umriss.
- **Dateien:** `apps/editor/src/ozzy/wachs.ts` (das Kugelbild: 29 × 29 Stützstellen, an seiner Vorlage ausgemessen; Farbton in
  OKLCH gedreht; Test `wachs.test.ts`), `material.ts` (drittes festes Material in `FesteHaut`), `main.ts` (Feinregler „Material
  Wachs“, `?wachs=<Grad>`). Menü, Taste M, `?material=wachs`.
- **Wie nah:** Im Rot der Vorlage (Farbton 0) liegt Ozzys Kugel im Mittel 1,6 / 1,4 / 1,5 von 255 Stufen neben ZBrush, größte
  Abweichung 9 (`scripts/ozzy/wachs-vergleich.mjs`).
- **Grundwert des Farbtons: −40** (Magenta; mein Vorschlag, er stellt ihn im Feinregler).
- **Nebenbei:** Das Ziel der festen Materialien hält jetzt 16 Bit je Kanal (mit 8 Bit zeigte der dunkle Verlauf Ringe). Solid und
  Zebra sind unverändert (Probe hält).
- **Nicht nachgebaut:** die Vertiefungen (zweites Kugelbild von ZBrush). Dafür bräuchte es ein zweites Bild von ihm.

## 4. Was im Plan für ihn entschieden ist (er kann es umdrehen)

Das Wort „Farblinie“; „gewohnte Tools“ = seine Werkzeuge aus Ozzy; gemalt wird im Raum und eingerastet; Bemalung gespiegelt wie
das Objekt; nur Farblinien begrenzen Farbflächen; Tasten B, F, I als Vorschlag; Farbtropfen am Zeiger; auf Wachs färbt das Material
Gemaltes nicht ein; die Ebenen-Ansicht als aufgefächerter Raum (Skizze).

## 5. Was hier besonders zählt

- Deutsch, kurz, in seinen Wörtern. Frage und Wahlmöglichkeiten wörtlich in die Abschlussnachricht (am Handy sieht er keine
  Kästen), Bilder mitschicken. Nie „bestanden“ ohne ihn. Zuerst zeigen, was sich an seiner Form geändert hat.
- Budget: keine Fächer aus Agenten, keine Workflows, keine Messreihen ohne Rückfrage; nur die betroffenen Proben und Tests.
- Am Rechenkern (`packages/shape`), am Verbund, am Sitz der Loops und am Aufblasen nichts ändern, ohne ihn zu fragen. Zwei Stellen
  im Plan sehen einen Zusatz vor und sagen, dass vorher gefragt wird: die Zuordnung beim Netzwechsel aus dem Werk (5.1, nur falls
  der Beweis es braucht) und die Farben im Verbund (5.3, vor Etappe 7).
- Ozzy läuft auch am iPad mit Stift (kein ⌥): jede Geste von Anfang an dafür mitbauen.
- Materialien nie nachempfinden, wo es eine Quelle gibt („exakt wie erarbeitet“). Das helle Solid bleibt der Gast, unverändert.
- `CLAUDE.md` (Wurzel) steht knapp unter 10 240 Bytes: den Stand ersetzen, nicht anhängen.

## 6. Prüfen

- Typen: `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`. Lint nur geänderte Dateien:
  `pnpm --filter @ee/editor exec eslint <dateien>`.
- Tests, aus `apps/editor`: `npx vitest run src/ozzy/` (Kugelbild des Wachses, Rechner des Verbunds).
- Probe der Materialien, aus `apps/editor`: `GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node
  scripts/pruefen/ozzy-material-fenster.mjs [ordner]` (2b ist das Wachs). Stand 19.11.: alle Kriterien halten.
- Vergleichsbild: `OZZY_URL=http://localhost:5215/ozzy.html node scripts/ozzy/wachs-vergleich.mjs`.

## 7. Fallen und Aufgefallenes

- **Frischer Arbeitsbaum:** erst `pnpm install --frozen-lockfile --prefer-offline`, sonst läuft nichts.
- **Vorschau-Server:** vor einem Start `lsof -nP -iTCP -sTCP:LISTEN | grep 51` ansehen und danach prüfen, dass 5194, 5205, 5211 und
  5213 noch laufen, und später noch einmal: Gleich nach dem Start von 5215 (09:31) lief alles; eine halbe Stunde später war 5211
  (das Fenster der Objekte) weg, ohne dass diese Sitzung es beendet hätte. **Diese Sitzung hat 5211 um 10:06 wieder gestartet
  (Eintrag `ozzy-objekte`, derselbe Arbeitsbaum der Objekte, unverändert); es hängt seitdem an ihr.** Endet diese Sitzung, kann es
  wieder verschwinden.
- **Bilder der Haut allein:** `__ozzy.film(true)`, `__ozzy.bild(1 / 60)`, dann sofort `#haut.toDataURL()`; danach `film(false)`.
  Ein Bildschirmfoto der Seite trägt auch die Linien des Raums.
- **Die Kante der hinteren Raumecke** liegt bei allen festen Materialien als feine Linie über der Form (auch bei Solid und Zebra,
  schon vor dieser Sitzung). Nicht behoben; gehört in den Feinschliff der Materialien.
- **Ein Ziel mit linearen Farben braucht mehr als 8 Bit,** sobald weiche dunkle Verläufe darin stehen (gilt für alles, was der
  Paint-Modus an Verläufen zeichnet).
- **`dreieckSuche` und `uebernehmen` in `werkHaut.ts`** (nächster Ort auf einem Netz, Weiterreichen beim Netzwechsel) sind nicht
  nach außen geführt; der Paint-Modus braucht dasselbe für die Orte der Farblinien.
- **Zusammenführen später:** Dieser Zweig ändert `main.ts` nur an wenigen Stellen (Feinregler, Schalter), `material.ts` und beide
  `CLAUDE.md`. Der Stand in `CLAUDE.md` wird beim Zusammenführen ohnehin neu geschrieben. Die Vorlage liegt in beiden Zweigen
  unter demselben Pfad mit demselben Inhalt.
