# Übergabe: Paint-Modus in Ozzy (Stand 19.11.2026, mittags)

Florian will in Ozzy einen Paint-Modus mit Ebenen, einer Ebenen-Ansicht und einem neuen Material (sein Auftrag wörtlich im Plan).
Das Maul kommt später in einer eigenen Sitzung. Diese Übergabe wird am Ende jedes Blocks überschrieben.

## 1. Einstieg

| Was | Wo |
| --- | --- |
| Zweig, Arbeitsbaum | `claude/reverent-feynman-1efdd3`, `.claude/worktrees/reverent-feynman-1efdd3`. Baut auf dem Zweig der Objekte auf (`claude/ozzy-donut-mirror-system-7a31b7`, Stand `3a091f14`). **Nicht zusammengeführt**, weder mit ihm noch mit `claude/ozzy` noch mit `main`; erst auf sein Wort, am Schluss. |
| Fenster | `http://localhost:5215/ozzy.html`, Eintrag `ozzy-paint` in `.claude/launch.json`. Proben: `OZZY_URL=http://localhost:5215/ozzy.html`. Nie unter seinen Fenstern bauen (5205, 5211, 5194). |
| Plan | [`docs/plans/2026-11-19-ozzy-paint-modus.md`](../../../plans/2026-11-19-ozzy-paint-modus.md): Auftrag, seine Antworten, Etappen mit Kriterien, Bauweise (Abschnitt 7, wie gebaut), **Abschnitt 9: Etappe 1 mit Messwerten, Lücken und dem, was nicht hält** |
| Recherche | [`docs/research/2026-11-19-zbrush-grundmaterial.md`](../../../research/2026-11-19-zbrush-grundmaterial.md) |
| Seine Vorlagen | [`2026-11-19-zbrush-matcap-red-wax.png`](2026-11-19-zbrush-matcap-red-wax.png), [`2026-11-19-zbrush-red-wax-vierecke.webp`](2026-11-19-zbrush-red-wax-vierecke.webp) |
| Bilder und Film | `docs/progress/ozzy/2026-11-19-paint-etappe-1-bogen.jpg`, `…-paint-etappe-1.mp4`; davor `…-wachs-vergleich.png`, `…-wachs-strange-bird.png`, `…-dreiecke-zeigen.png`, `…-ebenen-ansicht-skizze.png` |

## 2. Stand

| Etappe | Stand |
| --- | --- |
| 0 Material „Wachs“ | gebaut. Sein Wort: Farbton „-40 sieht gut aus“. |
| Schalter „Dreiecke zeigen“ | gebaut auf seinen Wunsch (Menü, `?facetten=1`). Sein Urteil steht aus. |
| **1 Der Beweis** | **gebaut (19.11.), sein Urteil steht aus.** Vier von fünf Kriterien halten; „bleibt auf der Haut“ hält bei kleinen Zügen, bei weiten nicht (Plan 9.3). Ihm vorgelegt mit Bildblatt und Film und der Frage, wie es weitergeht. |
| 2 bis 7 | nicht begonnen. **Nichts davon ohne sein Wort bauen.** |

**Die Frage, die bei ihm liegt:** sein Urteil zu Etappe 1 und was als Nächstes kommt: Etappe 2 (Farblinien bedienen), oder zuerst
eine der Lücken (P direkt auf der Form im Raum; Farbe auch eingerastet), oder zuerst das Kriechen.

## 3. Was gebaut ist

### Material „Wachs“ und „Dreiecke zeigen“

`apps/editor/src/ozzy/wachs.ts` (Kugelbild aus seiner Vorlage, Farbton in OKLCH gedreht, dazu `wachsLicht`: Helligkeit und Glanz
getrennt, für die Bemalung), `material.ts` (drittes festes Material; Ziel mit 16 Bit; `FesteWerte.flach`, `FesteWerte.danach`),
`main.ts` (Feinregler, `?wachs=`, `dreieckeZeigen`). Einzelheiten: Recherche und `apps/editor/CLAUDE.md`.

### Paint-Modus, Etappe 1

- **Bedienung:** B (Knopf „Farbe“ am iPad) schaltet den Modus; P, Ellipse (E), Freihand (N) zeichnen an einer Wand oder
  eingerastet eine geschlossene Farblinie (`werkBlatt.stiftZiel` → `farbStiftZiel`); ein Klick auf die Form im Raum füllt
  (`farbDruck`, `farbFuellenBei`); Farbe oben (`#farbe-wahl`); ⌘Z über den gemeinsamen Rückweg (`{ art: 'farbe' }`); Sichern und
  Laden (`WesenStand.farbe`); je Objekt eine Bemalung (`Ruhend.farbe`).
- **Code:** `apps/editor/src/ozzy/farbe/` (ohne DOM und three bis auf `anzeige.ts`; Tests `farbe.test.ts`, 11 Stück):
  `ort.ts` (Ort = Dreieck + Gewichte, `spur`, `punkteZuordnen`, `orteUebergeben`), `ketten.ts`, `flaechen.ts`, `bemalung.ts`
  (Modell, Datei), `fein.ts`, `treffer.ts`, `naechster.ts`, `anzeige.ts` (Zeichnen je Bildpunkt), `farbwerk.ts` (hält alles
  zusammen, folgt je Bild der Haut des Werks). In `main.ts`: `farbWerk`, `malModus`, `hautJetzt()`, `farbeZeigen()`, `malSetzen`,
  `farbSchritt`, die Nahtstellen in Bild, Zeiger, Tasten, Rückweg, Ablage; Haken `malen`, `farbe`, `farbLinie`, `farbFuellen`,
  `farbLinieImBild`, `farbLinieImRaum`, `farbKosten`, `werkSumme`, `hautAbstand`.
- **Bauweise in drei Sätzen:** Die Bemalung sitzt an den Punkten des Rechennetzes (Dreieck + Gewichte) und geht ohne Rechnung
  mit. Beim Netzwechsel bleibt ein Ort in seinem Dreieck, wenn es das noch gibt (die gebliebenen Punkte stehen im Werk vorn und in
  ihrer Reihenfolge), sonst wird er gesucht. Gezeichnet wird ohne Schnitt ins Netz: Die Grafikkarte rechnet je Bildpunkt Abstand
  und Seite zur Farblinie. Ausführlich: Plan, Abschnitt 7.
- **Am Werk und am Rechenkern ist nichts geändert** (Probe, Kriterium 3: Prüfsumme der Form).

### Messwerte und Lücken

Stehen im Plan, Abschnitt 9 (9.2 die fünf Kriterien, 9.3 das Kriechen, 9.4 was Etappe 1 nicht hat, 9.5 Aufgefallenes). Kurz:
Kante 0,83 Gerätepunkte bei 1-, 2-, 4-fach; Bemalung 0,2 bis 0,5 ms je Bild beim Ziehen; ⌘Z und Laden genau; hin und zurück 0,3
Einheiten bei 15 Einheiten Zug, 0,6 bis 0,7 bei 55 (verlangt 0,5), nach drei weiten Zügen 1,7.

## 4. Was im Plan für ihn entschieden ist (er kann es umdrehen)

Das Wort „Farblinie“; „gewohnte Tools“ = seine Werkzeuge aus Ozzy (bestätigt, Pinsel vielleicht später); gemalt wird im Raum und
eingerastet; Bemalung gespiegelt wie das Objekt; nur Farblinien begrenzen Farbflächen; Tasten B, F, I als Vorschlag; Farbtropfen
am Zeiger; auf Wachs färbt das Material Gemaltes nicht ein; die Ebenen-Ansicht als aufgefächerter Raum (Skizze).

## 5. Was hier besonders zählt

- Deutsch, kurz, in seinen Wörtern. Frage und Wahlmöglichkeiten wörtlich in die Abschlussnachricht (am Handy sieht er keine
  Kästen), Bilder mitschicken. Nie „bestanden“ ohne ihn. Zuerst zeigen, was sich an seiner Form geändert hat.
- Budget: keine Fächer aus Agenten, keine Workflows, keine Messreihen ohne Rückfrage; nur die betroffenen Proben und Tests.
- Am Rechenkern (`packages/shape`), am Werk, am Verbund, am Sitz der Loops und am Aufblasen nichts ändern, ohne ihn zu fragen. Eine
  Stelle im Plan sieht noch einen Zusatz vor und sagt, dass vorher gefragt wird: die Farben im Verbund (5.3, vor Etappe 7).
- Ozzy läuft auch am iPad mit Stift (kein ⌥): jede Geste von Anfang an dafür mitbauen. **Am iPad ist vom Paint-Modus noch nichts
  geprüft.**
- Materialien nie nachempfinden, wo es eine Quelle gibt („exakt wie erarbeitet“). Das helle Solid bleibt der Gast, unverändert.
- `CLAUDE.md` (Wurzel) steht knapp unter 10 240 Bytes: den Stand ersetzen, nicht anhängen.

## 6. Prüfen

- Typen: `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`. Lint nur geänderte Dateien:
  `pnpm --filter @ee/editor exec eslint <dateien>`.
- Tests, aus `apps/editor`: `npx vitest run src/ozzy/` (23 Tests: Bemalung, Kugelbild des Wachses, Rechner des Verbunds).
- Proben, aus `apps/editor`, immer mit `GPU=1 OZZY_URL=http://localhost:5215/ozzy.html`:
  - `node scripts/pruefen/ozzy-farbe-fenster.mjs [ordner]`: die fünf Kriterien an einer Kugel (rund 2 Minuten). Stand: 0, 1, 3, 4,
    5, 6 halten, 2 bei `WEITE=15`, nicht bei 55. `DIAG=1`: die Lagen in jedem Abschnitt des Zugs, der Ruck beim Netzwechsel und
    zwei weitere Züge hin und zurück. `PROFIL=1`: das Profil quer zur Kante.
  - `[NAME=<Form>] [WEITE=20] node scripts/pruefen/ozzy-farbe-form.mjs [ordner]`: dieselben Handgriffe an einer gesicherten Form
    (Standard „strange bird“). Stand: alles hält.
  - `node scripts/pruefen/ozzy-material-fenster.mjs [ordner]`: die Materialien (2b Wachs, 2c Dreiecke zeigen). Stand: alles hält.
- Film: `OZZY_URL=… node scripts/ozzy/paint-film.mjs <ziel.mp4>`. Vergleichsbild Wachs: `scripts/ozzy/wachs-vergleich.mjs`.

## 7. Fallen und Aufgefallenes

- **Frischer Arbeitsbaum:** erst `pnpm install --frozen-lockfile --prefer-offline`, sonst läuft nichts.
- **Vorschau-Server:** vor einem Start `lsof -nP -iTCP -sTCP:LISTEN | grep 51` ansehen und danach prüfen, dass 5194, 5205, 5211 und
  5213 noch laufen. Am 19.11. vormittags war 5211 (das Fenster der Objekte) verschwunden, ohne dass diese Sitzung es beendet hätte;
  **sie hat es um 10:06 wieder gestartet (Eintrag `ozzy-objekte`), es hängt seitdem an ihr.** Endet diese Sitzung, kann es wieder
  verschwinden.
- **Bilder der Haut allein:** `__ozzy.film(true)`, `__ozzy.bild(1 / 60)`, dann sofort `#haut.toDataURL()`; danach `film(false)`.
  Die Fläche des Gasts (helles Solid) gibt so kein Bild her: aus einem Bildschirmfoto der Seite lesen.
- **Eine Kante messen:** nie zwischen Bildpunkten mischen (das zeichnet selbst weich: 1,3 bis 1,9 statt 0,83 Gerätepunkte).
  Die Probe sammelt alle Bildpunkte in einem Streifen um die Farblinie mit ihrem Abstand und liest daraus das Profil.
- **Der Zeiger rastet mit P auf Linien und Punkte der Form ein,** auch im Paint-Modus; ein Punkt der Farblinie liegt dann dort,
  wo der Zeiger steht, nicht unter der Maus (eine Probe las das als 1,2 Einheiten Abweichung). Ob das so bleiben soll, ist offen.
- **Proben, die an der Wand des Tops ziehen:** Unter einem gewählten Ring hängt der Tropfen „Maul formen“ und kann genau über dem
  Anfasser liegen (Drücken trifft dann den Knopf, Drücken und Loslassen formt ein Maul). Vorher die Auswahl leeren: Esc, aber nur,
  wenn etwas gewählt ist (ohne Auswahl lässt Esc die Luft ab). Und hinter der Form liegt bei (685; 545) der Griff der Raumecke: Ein
  Klick dort klappt auf, statt zu füllen.
- **Ein Ring quer über die Kugel drückt sie ein** (bekannt: zu wenige Punkte je Linie). Die Kugel der Probe mit drei Ringen ist
  darum keine Kugel mehr; das stört nicht.
- **„strange bird“ kommt nach einem Zug hin und zurück nicht an ihren Platz** (Haut bis 4,5 Einheiten daneben, auch nach einem
  ersten Zug zum Setzen). Wer dort misst, vergleicht die Bemalung mit der Haut, nicht mit ihrer Lage davor.
- **Die Kanten der hinteren Raumecke und die Zeichnungen an den Wänden** liegen bei allen festen Materialien als feine Linien über
  der Form (schon vor dieser Sitzung). Über einer Farbfläche fällt es mehr auf. Nicht behoben; gehört in den Feinschliff der
  Materialien.
- **Ein Ziel mit linearen Farben braucht mehr als 8 Bit,** sobald weiche dunkle Verläufe darin stehen.
- **Zusammenführen später:** Dieser Zweig ändert `main.ts` an schmalen Nahtstellen (Suchwort `farbWerk`, `malModus`), dazu
  `material.ts`, `gast.ts` (`ueberzug`), `werkBlatt.ts` (`stiftZiel`), `ablage.ts` (`farbe`), `ozzy.html`, `ozzy.css` und beide
  `CLAUDE.md`. Der Stand in `CLAUDE.md` wird beim Zusammenführen ohnehin neu geschrieben.
