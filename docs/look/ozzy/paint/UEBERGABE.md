# Übergabe: Paint-Modus in Ozzy (Stand 19.11.2026, 22:30 Uhr: der Strang ruht)

Florian will in Ozzy einen Paint-Modus mit Ebenen, einer Ebenen-Ansicht und einem neuen Material (sein Auftrag wörtlich im Plan).
Diese Übergabe wird am Ende jedes Blocks überschrieben.

**Der Strang ruht seit dem 19.11. abends.** Florian: „Das hast du alles heute wirklich sehr gut umgesetzt. Ich mache morgen in
einer neuen session weiter. kannst du alles was übrig bleibt dokumentieren, damit es nicht vergessen wird. Morgen möchte ich
erstmal mit posen und maul weitermachen.“ **Alles, was übrig bleibt, steht in
[`docs/plans/2026-11-19-ozzy-paint-was-bleibt.md`](../../../plans/2026-11-19-ozzy-paint-was-bleibt.md)**: was bei ihm liegt
(A), was nicht gebaut ist (B), was nicht hält (C), was nicht geprüft ist (D), Zusammenführen (E), was die Sitzung „Posen und
Maul“ vom Paint-Modus wissen muss (F). Wer hier weiterbaut, liest zuerst diese Liste und baut nichts daraus ohne sein Wort.

## 1. Einstieg

| Was | Wo |
| --- | --- |
| Zweig, Arbeitsbaum | `claude/reverent-feynman-1efdd3`, `.claude/worktrees/reverent-feynman-1efdd3`. Baut auf dem Zweig der Objekte auf (`claude/ozzy-donut-mirror-system-7a31b7`, Stand `3a091f14`). **Nicht zusammengeführt**, weder mit ihm noch mit `claude/ozzy` noch mit `main`; erst auf sein Wort, am Schluss. |
| Fenster | `http://localhost:5215/ozzy.html`, Eintrag `ozzy-paint` in `.claude/launch.json`. Proben: `OZZY_URL=http://localhost:5215/ozzy.html`. Nie unter seinen Fenstern bauen (5205, 5211, 5194). |
| Was übrig bleibt | [`docs/plans/2026-11-19-ozzy-paint-was-bleibt.md`](../../../plans/2026-11-19-ozzy-paint-was-bleibt.md) (nummerierte Liste, Stand 19.11. abends) |
| Plan | [`docs/plans/2026-11-19-ozzy-paint-modus.md`](../../../plans/2026-11-19-ozzy-paint-modus.md): Auftrag, seine Antworten, Etappen mit Kriterien, Bauweise (Abschnitt 7), Etappe 1 (Abschnitt 9), Schritte der Etappe 2 (Abschnitt 10), Etappe 2 mit Messwerten und Lücken (Abschnitt 11), Etappe 3, erster Schritt: die Farbe läuft ein (Abschnitt 12), Etappe 3, zweiter Schritt: Farben als Tropfen, Farbtropfen, Pipette (Abschnitt 13), Etappe 4, das Bild der Bedienung in zwei Fassungen (Abschnitt 14), Abschnitt 15: Etappe 4, gebaut (Fassung 1, der Tropfen am Faden), Abschnitt 16: Etappe 5, gebaut (Ebenen), Abschnitt 17: Etappe 6, erster Schritt (die Ebenen-Ansicht, zwei Fassungen zur Wahl), **Abschnitt 18: Etappe 6, gebaut (Fassung B: was er sieht, gemessen, für ihn entschieden, was fehlt, Bauweise)** |
| Recherche | [`docs/research/2026-11-19-zbrush-grundmaterial.md`](../../../research/2026-11-19-zbrush-grundmaterial.md) |
| Seine Vorlagen | [`2026-11-19-zbrush-matcap-red-wax.png`](2026-11-19-zbrush-matcap-red-wax.png), [`2026-11-19-zbrush-red-wax-vierecke.webp`](2026-11-19-zbrush-red-wax-vierecke.webp) |
| Bilder und Filme | `docs/progress/ozzy/2026-11-19-paint-etappe-6-bogen.jpg`, `…-paint-etappe-6.mp4` (die Ebenen-Ansicht, gebaut, an „strange bird“); `…-paint-etappe-6-ansicht-bogen.jpg`, `…-paint-etappe-6-ansicht.mp4` (davor: die zwei Fassungen zur Wahl); `…-paint-etappe-5-bogen.jpg`, `…-paint-etappe-5.mp4` (Ebenen, an „strange bird“); `…-paint-etappe-4-bogen.jpg`, `…-paint-etappe-4.mp4` (gebaut, an „strange bird“); `…-paint-etappe-4-bedienung-bogen.jpg` (das Bild davor, zusammengesetzt); `…-paint-etappe-3-farben-bogen.jpg`, `…-paint-etappe-3-farben.mp4` (an „strange bird“); `…-paint-etappe-3-bogen.jpg`, `…-paint-etappe-3-tinte.mp4`, `…-paint-etappe-3-honig.mp4`; `…-paint-etappe-2-bogen.jpg`, `…-paint-etappe-2.mp4` (an „strange bird“); `…-paint-etappe-1-bogen.jpg`, `…-paint-etappe-1.mp4`; davor `…-wachs-vergleich.png`, `…-wachs-strange-bird.png`, `…-dreiecke-zeigen.png`, `…-ebenen-ansicht-skizze.png` |

## 2. Stand

| Etappe | Stand |
| --- | --- |
| 0 Material „Wachs“ | gebaut. Sein Wort: Farbton „-40 sieht gut aus“. |
| Schalter „Dreiecke zeigen“ | gebaut auf seinen Wunsch (Menü, `?facetten=1`). Sein Urteil steht aus. |
| 1 Der Beweis | gebaut (19.11.). Vier von fünf Kriterien halten; die Bemalung kriecht bei weiten Zügen an der Form (Plan 9.3). Sein Wort danach: „Etappe 2 starten“. |
| 2 Farblinien bedienen wie Linien | gebaut (19.11.). P direkt auf der Form, Punkte und Richtungen mit A, offen und gekreuzt, die Mitte. Beide Proben halten, an der Kugel und an „strange bird“. Was fehlt: Plan 11.4. Sein Wort danach: „Etappe 3 starten“ (kein Urteil in Worten). |
| **3 Füllen mit dem Farbtropfen** | **gebaut (19.11.), sein Urteil steht aus.** Erster Schritt: Die Farbe läuft ein; sein Wort dazu: „Tinte“ (eingestellt; „Honig“ bleibt über `?fuellen=honig`). Zweiter Schritt: Farben als Tropfen unter der Leiste (antippen, ziehen und fallen lassen, Plus, Mülleimer), Farbtropfen (F), Pipette (I). Ihm vorgelegt mit Bildblatt und Film an „strange bird“. Was fehlt: Plan 13.4. Sein Wort danach: „Etappe 4 starten“ (kein Urteil in Worten). |
| 4 Weichheit an Linien und Punkten | gebaut (19.11.). Zuerst das Bild der Bedienung in zwei Fassungen; sein Wort: „Fassung 1“. Gebaut: Jeder Punkt einer Farblinie kann eine Breite tragen; an gewählten Punkten sitzt quer zur Farblinie ein Tropfen an einem Faden (wegziehen: weich, zurückschieben: hart), K und `[` `]` an mehreren Punkten. Alle sieben Kriterien halten (Plan 15.2). Was fehlt: Plan 15.4. Fassung 2 („Wasser“) ist nicht gebaut. Sein Wort danach: „Etappe 5 starten“ (kein Urteil in Worten). |
| 5 Ebenen | gebaut (19.11.). Sein Wort danach: „Etappe 6 starten“ (kein Urteil in Worten). Am rechten Rand ein Stapel liegender Tropfen, je Ebene eine Linse: Plus legt an, antippen wählt, wo gemalt wird, der Punkt daneben blendet aus und ein, ziehen ordnet, auf den Mülleimer gezogen ist die Ebene gelöscht. Oben deckt unten, auf Wachs und auf hellem Solid. Alle zehn Kriterien halten (Plan 16.2). Ihm vorgelegt mit Bildblatt und Film an „strange bird“ (ein Verlauf auf Ebene 1, Punkte auf Ebene 2). Für ihn entschieden: Plan 16.3. Was fehlt: Plan 16.4. |
| **6 Ebenen-Ansicht** | **gebaut (19.11.).** Sein Wort am Abend gilt dem ganzen Tag („wirklich sehr gut umgesetzt“); ein Urteil zu den Einzelheiten der Ebenen-Ansicht liegt nicht vor. Zuerst zwei Fassungen zur Wahl (A nebeneinander, B schräg versetzt); sein Wort: „dann fassung b“. Gebaut: Der Knopf über dem Stapel oder X fächert auf, je Ebene, die zu sehen ist, eine Kopie; vorn steht die Kopie der Ebene, an der gemalt wird (eine andere antippen: Sie tritt vor); an ihr malt man mit A, P, Lasso, Farbtropfen, Pipette wie an der einen Form; ziehen dreht alle zugleich, das Rad zoomt zum Zeiger hin; ordnen, aus- und einblenden, anlegen lassen die Kopien rücken und wachsen. Auf Wachs und auf hellem Solid. Alle neun Kriterien halten (Plan 18.2). Ihm vorgelegt mit Bildblatt und Film an „strange bird“. Für ihn entschieden: Plan 18.3. Was fehlt: Plan 18.4 (Freihand, Formen, Objekte aufgefächert; das Tempo des hellen Solids beim Drehen; iPad). |
| 7 | nicht begonnen. **Nicht ohne sein Wort bauen.** |

**Was bei ihm liegt:** die Liste A in „Was übrig bleibt“ (Etappe 7 und davor die Farben im Verbund; die Einzelheiten der
Ebenen-Ansicht; ob ein Klick mit A weiter füllt; das Kriechen bei weiten Zügen; „Dreiecke zeigen“; Tasten; Palette;
Zusammenführen). Er hat am 19.11. abends keine davon beantwortet und will am 20.11. zuerst mit Posen und Maul weitermachen, in
einer neuen Sitzung.

## 3. Was gebaut ist

### Material „Wachs“ und „Dreiecke zeigen“

`apps/editor/src/ozzy/wachs.ts`, `material.ts` (drittes festes Material; Ziel mit 16 Bit; `FesteWerte.flach`, `danach`), `main.ts`
(Feinregler, `?wachs=`, `dreieckeZeigen`). Einzelheiten: Recherche und `apps/editor/CLAUDE.md`.

### Paint-Modus

- **Bedienung:** B (Knopf „Farbe“ am iPad) schaltet den Modus. Im Raum gehören A, P und Lasso den Farblinien (`farbAn`,
  `modellSetzen`): P setzt Punkte direkt auf der Form (Klick Ecke, Ziehen rund, Faden, auf dem ersten Punkt schließen, ↩ offen,
  ⌫, Esc); A zieht Punkte, dreht Richtungen (Nadel, Ring, ⌥ knickt), ⌫ löscht; die Mitte zeigt sich mit P als Punktreihe, P
  rastet auf ihr ein, eine Farblinie von der Mitte zur Mitte ist von selbst fertig. Ein Klick auf die Form (ohne dass etwas am
  Zeiger hängt) füllt. **Farbtropfen (F):** nichts hängt am Zeiger, jeder Klick auf die Form füllt, ⌥ + Klick nimmt die Farbe
  auf. **Pipette (I):** Ring am Zeiger in der Farbe unter ihm, ein Klick nimmt sie auf, dann gilt der Farbtropfen. **Die Farben**
  hängen als Tropfen unter der Leiste: antippen wählt, den gewählten noch einmal antippen öffnet den Farbwähler, das Plus legt
  eine an, ziehen und über der Form loslassen füllt (mit jedem Werkzeug), auf den Mülleimer gezogen ist die Farbe verworfen.
  Ellipse (E) und Freihand (N) zeichnen wie in Etappe 1 an einer Wand oder eingerastet. ⌘Z über den
  gemeinsamen Rückweg (`{ art: 'farbe' }`); Sichern und Laden (`WesenStand.farbe`, Version 2 mit Punkten und Richtungen); je
  Objekt eine Bemalung (`Ruhend.farbe`).
- **Code:** `apps/editor/src/ozzy/farbe/` (ohne DOM und three bis auf `anzeige.ts`):
  `ort.ts` (Ort = Dreieck + Gewichte, `spur`, `spurImVorhang`, `punkteZuordnen`, `orteUebergeben`), `kurve.ts` (Punkte und
  Richtungen, `stueckImBild`, `stueckLegen`), `treffer.ts` (`strahlAufNetz`, `ParallelTreffer`, `BildTreffer`), `ketten.ts`
  (Ketten je Dreieck, `kreuzungenTeilen`), `flaechen.ts`, `bemalung.ts` (Modell, Datei, `linienAusTreffern`), `fein.ts`,
  `naechster.ts`, `anzeige.ts` (Zeichnen je Bildpunkt), `farbwerk.ts` (hält alles zusammen, folgt je Bild der Haut des Werks),
  `farbBlatt.ts` (das Modell für das Verhalten der Linien-Studie). In `main.ts`: `farbWerk`, `farbBlatt`, `malModus`, `farbAn`,
  `hautJetzt()`, `farbSicht()`, `farbeZeigen()`, die Nahtstellen in Bild, Zeiger, Tasten, Rückweg, Ablage.
- **Bauweise in vier Sätzen:** Die Bemalung sitzt an den Punkten des Rechennetzes (Dreieck + Gewichte) und geht ohne Rechnung
  mit; beim Netzwechsel bleibt ein Ort in seinem Dreieck, wenn es das noch gibt, sonst wird er gesucht. Eine Farblinie ist eine
  dichte Folge solcher Orte, einzelne davon sind ihre Punkte mit zwei Richtungen im Maß ihres Dreiecks. Die Kurve zwischen zwei
  sichtbaren Punkten wird im Bild gelegt, längs des Blicks auf die glatte Anzeige; nur angefasste Stücke werden neu gelegt.
  Gezeichnet wird ohne Schnitt ins Netz: Die Grafikkarte rechnet je Bildpunkt Abstand und Seite zur Farblinie.
- **Etappe 3, erster Schritt:** Eine neue Füllung läuft ein (`farbe/fliessen.ts`: die Weite jeder Stelle von der Saat, über die
  Haut, nur innerhalb der Fläche; `anzeige.ts`: die neue Farbe steht, wo die Front schon war; `farbwerk.ts`: `FLIESSEN`,
  `fliessen(dt)`). Feinregler „Füllen“, `?fuellen=tinte|honig|0`; im Testbrowser ohne Angabe aus. Der Farbtropfen am Zeiger ist
  ein Element der Seite (`#farbtropfen`).
- **Etappe 3, zweiter Schritt:** `farbe/farbLeiste.ts` (die Tropfen unter der Leiste; Farben in `localStorage`, `ozzy.farben`;
  das unsichtbare Farbfeld `#farbe-farbe` öffnet den Farbwähler, Proben und Filme setzen darüber die gewählte Farbe), `leiste.ts`
  (`LeistenWerkzeug` mit `tropfen` und `pipette`, `malZeigen`, `farbeZeigen`), `main.ts` (`farbWerkzeug()`: Der Zeiger geht dann
  nicht an das Verhalten der Linien; `farbAufnehmenBei`, `farbUnter`, `farbZug`), `farbwerk.ts` (`farbeBei`).
- **Etappe 4, weiche Kanten:** `kurve.ts` (`FarbPunkt.breite`), `bemalung.ts` (`breitenLaengs`, Datei Version 3), `ketten.ts`
  (Breite je Punkt der Kette), `weich.ts` (das Feld: Abstand zur weichen Farblinie über die Haut, Breite dort, Füllung
  jenseits), `anzeige.ts` (`WeichBild`: der Verlauf innen je Ecke, am Rand je Kette), `farbBlatt.ts` (`breitenGriffe`), `main.ts`
  (`weichGriffe`, `weichZug`, `weichTaste`). Bedienung: Punkt wählen, den Tropfen am Faden ziehen; K; `[` `]`.
- **Etappe 5, Ebenen:** `bemalung.ts` (`Bemalung.ebenen` von unten nach oben, `Ebene.aus`, `ebeneNeu`, `ebeneLoeschen`,
  `ebeneOrdnen`, `sichtUebernehmen`), `farbwerk.ts` (je Ebene ihr abgeleiteter Stand, neu gerechnet wird nur die geänderte;
  `ebene…`, `ebenenStand`, `bedienbar`, `farbeBei` von oben nach unten), `anzeige.ts` (`FarbAnzeige` je Ebene, `FarbStapel`
  zeichnet alle in einem Durchgang, sammelt, wo Überlagern nicht reicht), `farbe/ebenenStapel.ts` (der Stapel am Rand,
  `#ebenen`), `main.ts` (`ebenenStapel`, `ebeneWaehlen`, `ebeneZeigen`, `ebeneNeu`, `ebeneOrdnen`, `ebeneLoeschen`). Bedienung:
  Plus, Linse antippen, Punkt daneben, Linse ziehen, auf den Mülleimer.
- **Etappe 6, die Ebenen-Ansicht:** in `main.ts` alles mit `faecher` (Zustand, Federn je Kopie, der Kreis um die Form, die
  Kopien mit Maßstab, Versatz, Bereich der Tiefe und Rang, der Zeiger zurück in das Bild einer Kopie, Zoom und Schwenk des ganzen
  Bilds). Gemalt wird an der vorderen Kopie: `farbSicht()` gibt dem Blatt der Farblinien ihre Abbildung, `linienKoerper()` stellt
  den Körper für die Verdeckung dorthin, `farbUnter`, `farbFuellenBei` rechnen den Zeiger zurück. Gezeichnet werden alle Kopien
  in einem Durchgang: `material.ts` (`kopienStellen`), `anzeige.ts` (`FarbKopie`, `uBild`, `uTiefe`, `uSicht`, `KoerperSatz`),
  `gast.ts` (`kopien`: das helle Solid je Kopie von hinten nach vorn). `farbwerk.ts`: `sichtbareEbenen()`, `farbeBei(…, nur)`.
  `ebenenStapel.ts`: der Knopf `.faecher`. Bedienung: X oder der Knopf, Kopie antippen, malen, ziehen dreht, Rad zoomt, Pos1.
  Einzelheiten: Plan 18.5.
- **Am Werk und am Rechenkern ist nichts geändert** (Proben: Prüfsumme der Form).

### Messwerte und Lücken

Etappe 1: Plan, Abschnitt 9. Etappe 2: Plan, Abschnitt 11 (11.3 die Tabelle, 11.4 was fehlt). Kurz: Punkte 0,00 Gerätepunkte
neben den Klicks; Richtungen 0,00° neben dem Zeiger; an „strange bird“ kostet Bedienen je Schritt rund 2 ms und die Bemalung je
Bild 2,8 ms; die Bemalung kriecht bei weiten Zügen an der Form (unverändert).

## 4. Was im Plan für ihn entschieden ist (er kann es umdrehen)

Das Wort „Farblinie“; „gewohnte Tools“ = seine Werkzeuge aus Ozzy (bestätigt, Pinsel vielleicht später); gemalt wird im Raum und
eingerastet; Bemalung gespiegelt wie das Objekt, **eine Farblinie über die Mitte endet an der Mitte** (der längere Teil gilt);
nur Farblinien begrenzen Farbflächen; Tasten B, F, I als Vorschlag; Farbtropfen am Zeiger; auf Wachs färbt das Material Gemaltes
nicht ein; die Ebenen-Ansicht als aufgefächerter Raum (Skizze). Neu in Etappe 2, von mir entschieden: Die Kurve liegt, wie man
sie im Bild zieht (nicht wie die Richtungen im Raum stehen). Neu in Etappe 3 (Plan 13.3): Mit A füllt ein Klick auf freie Haut
weiter; acht Farben am Anfang als Platzhalter; die Farben gehören zum Browser, nicht zur Form; nach der Pipette gilt der
Farbtropfen; mit dem Farbtropfen nimmt ⌥ die Farbe auf (kein Röntgen). Neu in Etappe 5 (Plan 16.3): Antippen wählt die Ebene,
ein eigener Punkt blendet aus (im Plan stand „tippen blendet aus und ein“); der Stapel am rechten Rand; eine neue Ebene liegt
über der aktiven; zu sehen und zu greifen sind nur die Farblinien der aktiven Ebene; wer an einer ausgeblendeten Ebene malt,
blendet sie ein; Aus- und Einblenden und die Wahl der Ebene sind keine Schritte für ⌘Z; höchstens zwölf Ebenen; zwischen zwei
Ebenen mischt eine weiche Kante wie innerhalb einer Ebene. Neu in Etappe 6 (Plan 18.3): Jede Ebene, die zu sehen ist, hat ihre
Kopie, auch eine leere; ein Tipp auf eine hintere Kopie wählt nur (Ausnahmen: ein Tropfen aus der Leiste, die Pipette); die Taste
X; die vordere Kopie 5 % größer; Zoom und Schwenk gelten dem ganzen Bild der Kopien, das Rad zoomt dort zum Zeiger hin, beim
Zusammenschieben kehrt die Ansicht zurück; der Raum tritt aufgefächert zurück; kein Einrasten und keine Vier Ansichten, solange
aufgefächert ist.

## 5. Was hier besonders zählt

- Deutsch, kurz, in seinen Wörtern. Frage und Wahlmöglichkeiten wörtlich in die Abschlussnachricht (am Handy sieht er keine
  Kästen), Bilder mitschicken. Nie „bestanden“ ohne ihn. Zuerst zeigen, was sich an seiner Form geändert hat.
- Budget: keine Fächer aus Agenten, keine Workflows, keine Messreihen ohne Rückfrage; nur die betroffenen Proben und Tests.
- Am Rechenkern (`packages/shape`), am Werk, am Verbund, am Sitz der Loops und am Aufblasen nichts ändern, ohne ihn zu fragen. Eine
  Stelle im Plan sieht noch einen Zusatz vor und sagt, dass vorher gefragt wird: die Farben im Verbund (5.3, vor Etappe 7).
- **An seiner Form prüfen, nicht nur an der Kugel.** Etappe 2 hielt an der Kugel in allen Kriterien und an „strange bird“ nicht
  (Falten, Überhänge, die Mitte): Das zeigte erst der Film.
- Ozzy läuft auch am iPad mit Stift (kein ⌥): jede Geste von Anfang an dafür mitbauen. **Am iPad ist vom Paint-Modus noch nichts
  geprüft.**
- Materialien nie nachempfinden, wo es eine Quelle gibt („exakt wie erarbeitet“). Das helle Solid bleibt der Gast, unverändert.
- `CLAUDE.md` (Wurzel) steht knapp unter 10 240 Bytes: den Stand ersetzen, nicht anhängen.

## 6. Prüfen

- Typen: `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`. Lint nur geänderte Dateien:
  `pnpm --filter @ee/editor exec eslint <dateien>`.
- Tests, aus `apps/editor`: `npx vitest run src/ozzy/` (63 Tests: Bemalung, Kurven, Einlaufen, weiche Kanten, Ebenen, Kugelbild
  des Wachses, Rechner des Verbunds).
- Proben, aus `apps/editor`, immer mit `GPU=1 OZZY_URL=http://localhost:5215/ozzy.html`; Stand 19.11., 21:50 Uhr: alle halten,
  bis auf Kriterium 2 der Etappe 1 bei weiten Zügen (bekannt, Plan 9.3).
  - `[MATERIAL='helles solid'] node scripts/pruefen/ozzy-farbe-faecher-fenster.mjs [ordner]`: Etappe 6 an einer Kugel (70
    zusammengeschoben ist das Bild von vorher, 71 jede Kopie zeigt nur ihre Ebene, 72 die Anordnung, auch die Reihe
    nebeneinander über den Haken, 73 drehen, 74 antippen und Esc). Rund eine Minute je Grund.
  - `[MATERIAL='helles solid'] node scripts/pruefen/ozzy-farbe-faecher-malen-fenster.mjs [ordner]`: Etappe 6, malen in der
    Ebenen-Ansicht, mit echten Klicks (76 P auf der vorderen Kopie, 77 eine andere antippen und dort malen, 78 Punkt ziehen, 79
    der Tropfen am Faden, 80 Farbtropfen aus der Leiste auf eine andere Kopie, 81 Pipette, 82 Zoom und Pos1, 83 aus- und
    einblenden, anlegen, ordnen, 84 Werkzeuge und Esc, 85 Zoom und Schwenk nach dem Zusammenschieben). Rund anderthalb Minuten.
  - `node scripts/pruefen/ozzy-farbe-faecher-tempo.mjs`: Etappe 6, Tempo an „strange bird“ mit drei Ebenen bei 2880 × 1800 (87
    drei Kopien höchstens 3 ms mehr als die Form allein; dazu das helle Solid beim Drehen).
  - `node scripts/pruefen/ozzy-farbe-ebenen-fenster.mjs [ordner]`: Etappe 5 an einer Kugel und an „strange bird“ (60 leere und
    ausgeblendete Ebene ändern nichts, 61 oben deckt unten, 62 ordnen, 63 aus- und einblenden, 64 weiche Kante über einer
    anderen Ebene, 65 gemalt wird auf der aktiven Ebene, 66 ⌘Z, Sichern, Laden, 67 der Stapel mit echten Klicks, 68 Tempo mit
    drei Ebenen). Dauert rund dreieinhalb Minuten (zwei Seiten).
  - `node scripts/pruefen/ozzy-farbe-weich-fenster.mjs [ordner]`: Etappe 4 an einer Kugel und an „strange bird“ (50 Breite null
    ist das Bild von vorher, 51 Breite bei 1-, 4-, 16-fach, 52 Fließen zur harten Kante, 53 nicht über eine andere Farblinie,
    54 der Tropfen am Faden, 55 K und die Klammern, 56 Sichern und Laden, 57 Tempo). Dauert rund zweieinhalb Minuten (drei Seiten).
  - `node scripts/pruefen/ozzy-farbe-tropfen-fenster.mjs [ordner]`: Etappe 3, zweiter Schritt, an einer Kugel mit echten Klicks
    (30 nur im Paint-Modus, 31 F greift nichts, 32 antippen und füllen, 33 Pipette, 34 ⌥ + Klick, 35 ziehen, fallen lassen,
    Mülleimer, 36 Farbe ändern und Neuladen, 37 B).
  - `[ART=tinte|honig] node scripts/pruefen/ozzy-farbe-fliessen-fenster.mjs [ordner]`: Etappe 3 an einer Kugel (20 läuft vom Klick
    aus, 22 offene Farblinie staut, 23 Tempo, 24 ⌘Z mittendrin, 25 Farbtropfen am Zeiger).
  - `node scripts/pruefen/ozzy-farbe-bedienen-fenster.mjs [ordner]`: Etappe 2 an einer Kugel, jede Geste mit einzelnen Klicks
    (Kriterien 0 bis 6, 8, 9).
  - `[NAME=<Form>] node scripts/pruefen/ozzy-farbe-mitte-fenster.mjs [ordner]`: Etappe 2 an „strange bird“ (10 Raster gegen
    Strahl, 11 Überhang, 16 verdeckter Punkt, 12 von der Mitte zur Mitte, 13 quer über die Mitte, 15 Tempo beim Bedienen).
    `DIAG=1` nennt die gewählten Stellen.
  - `node scripts/pruefen/ozzy-farbe-fenster.mjs [ordner]`: die fünf Kriterien der Etappe 1 an einer Kugel. Kriterium 2 hält bei
    `WEITE=15`, nicht bei 55. `DIAG=1`, `PROFIL=1`.
  - `[NAME=<Form>] [WEITE=20] node scripts/pruefen/ozzy-farbe-form.mjs [ordner]`: Etappe 1 an einer gesicherten Form.
  - `node scripts/pruefen/ozzy-material-fenster.mjs [ordner]`: die Materialien (2b Wachs, 2c Dreiecke zeigen).
- Film der Etappe 6 (die gebaute Ansicht): `GPU=1 OZZY_URL=… node scripts/ozzy/paint-faecher-film.mjs <ziel.mp4>`; Standbilder:
  `GPU=1 OZZY_URL=… node scripts/ozzy/paint-faecher-blick.mjs <ordner>` (auch das helle Solid). Die Skripte für die zwei
  Fassungen zur Wahl stehen in der Geschichte (`6ea54242`).
- Film der Etappe 5: `OZZY_URL=… node scripts/ozzy/paint-ebenen-film.mjs <ziel.mp4>` (in einem kleinen Fenster, 760 × 560: Leiste,
  Form und Stapel zusammen im Bild; Tasten und Handgriffe nennt ein kleines Feld); Standbilder: `GPU=1 OZZY_URL=… node
  scripts/ozzy/paint-ebenen-blick.mjs <ordner>`; die Szene beider: `scripts/ozzy/paint-ebenen-szene.mjs`.
- Film der Etappe 4: `OZZY_URL=… node scripts/ozzy/paint-weich-film.mjs <ziel.mp4>` (Tasten zeigt der Film als kleines Feld);
  Standbilder: `GPU=1 OZZY_URL=… node scripts/ozzy/paint-weich-blick.mjs <ordner>`.
- Bildblatt der Bedienung vor dem Bau (zusammengesetzt): `GPU=1 OZZY_URL=… node scripts/ozzy/paint-weich-szene.mjs <ordner>` nimmt die Szene
  auf (Haut und Linien getrennt, `szene.js`), `node scripts/ozzy/paint-weich-bogen.mjs <ordner>` setzt das Blatt.
- Filme: `OZZY_URL=… node scripts/ozzy/paint-farben-film.mjs <ziel.mp4>` (Etappe 3: Tropfen, Farbtropfen, Pipette; über der
  Leiste zeichnet der Film einen eigenen Pfeil, weil ein Mitschnitt den Zeiger des Systems nicht zeigt),
  `[ART=tinte|honig] node scripts/ozzy/paint-fuellen-film.mjs <ziel.mp4>` (Etappe 3: die Farbe läuft ein),
  `scripts/ozzy/paint-bedienen-film.mjs` (Etappe 2, an „strange bird“ von vorn),
  `scripts/ozzy/paint-film.mjs` (Etappe 1). Vergleichsbild Wachs: `scripts/ozzy/wachs-vergleich.mjs`.

## 7. Fallen und Aufgefallenes

- **Frischer Arbeitsbaum:** erst `pnpm install --frozen-lockfile --prefer-offline`, sonst läuft nichts.
- **Vorschau-Server:** vor einem Start `lsof -nP -iTCP -sTCP:LISTEN | grep 51` ansehen und danach prüfen, dass 5194, 5205, 5211 und
  5213 noch laufen. **5211 (das Fenster der Objekte) hat diese Sitzung am 19.11. um 10:06 neu gestartet; es hängt an ihr.**
- **`farbAn` in `main.ts`** ist der Schalter „die Farblinien werden gerade bedient“ (im Raum mit A, P, Lasso). In der Bildfunktion
  gab es einen örtlichen Namen gleichen Wortlauts für „die Farbe ist zu sehen“; er verdeckte den Schalter, und solange nichts
  gemalt war, galt die Verdeckung der Linien nicht. Er heißt jetzt `farbeDa`. Wer dort einen Namen vergibt: vorher suchen.
- **Was verdeckt ist, entscheidet die Anzeige der Linien je Bildpunkt** über die Tiefe des Körpers (er steht im Paint-Modus mit
  Deckung 0 in der Szene). Sieht man Linien durch die Form, zuerst `__ozzy.farbVerdeckung()` lesen (soll 0,02 sein).
- **Den Anteil zweier Farben an einem Bildpunkt messen** (für Verläufe): die eine Füllung rein rot, die andere rein blau. Rot
  minus Grün und Blau minus Grün hängen dann nicht mehr an Licht und Glanz des Wachses; ihr Verhältnis gibt den Anteil (gemischt
  wird in Bildschirmwerten, erst danach hell und dunkel: `rot` in `ozzy-farbe-weich-fenster.mjs`).
- **Der Blick ist perspektivisch:** Was im Bild wie groß ist, wächst nicht einfach mit dem Zoom. Wie viele Pixel eine Einheit an
  einer Stelle misst, sagt der Tropfen eines gewählten Punkts (`farbWeichGriffe`, `jeEinheit`). Über Zoom 4 hinaus (nur über den
  Haken erreichbar) lassen sich Punkte nicht mehr greifen.
- **Der Blick steht nach dem Drehen mit der Maus nicht jedes Mal gleich:** Beim Loslassen läuft die Form mit Schwung nach, je
  nach Takt verschieden weit (so fielen die Szenen der Filme verschieden aus). Für Bilder und Filme den Blick setzen:
  `__ozzy.blickSetzen({ gier, neigung, zoom })`; oder vor dem Loslassen eine halbe Sekunde ruhen. Der Zoom mit dem Mausrad endet
  bei 4; zwölf Schritte zu 100 sind schon mehr.
- **Das Fenster im Browser-Bereich der App kann im Hintergrund langsam laufen** (einmal war die Form vier Sekunden nach dem
  Laden noch nicht da): nach dem Laden und zwischen den Handgriffen `__ozzy.bild(1 / 30)` einige Male rufen. Nach einer Probe dort `localStorage.removeItem('ozzy.farben')`, sonst bleiben die Farben der Probe stehen.
- **Der Farbwähler des Systems** lässt sich in einer Probe nicht bedienen: Die Probe setzt `#farbe-farbe` (Wert, dann `input` und
  `change`), das gilt dem gewählten Tropfen.
- **Einlaufen Bild für Bild ansehen:** `__ozzy.film(true)` hält die Schleife an, `__ozzy.bild(dt)` rechnet ein Bild mit dieser
  Zeit, `__ozzy.farbFluss()` sagt, wie weit die Front ist. Im Filmskript wechselt P mit einem zweiten Druck auf P zurück zu A:
  zwischen zwei Formen erst A, dann P drücken.
- **Bilder der Haut allein:** `__ozzy.film(true)`, `__ozzy.bild(1 / 60)`, dann sofort `#haut.toDataURL()`; danach `film(false)`.
  Die Fläche des Gasts (helles Solid) gibt so kein Bild her: aus einem Bildschirmfoto der Seite lesen.
- **Eine Kante messen:** nie zwischen Bildpunkten mischen. Die Probe sammelt alle Bildpunkte in einem Streifen um die Farblinie
  mit ihrem Abstand und liest daraus das Profil.
- **Der Zeiger rastet mit P auf Linien und Punkte der Form ein,** wenn über die Wand gezeichnet wird (Ellipse, Freihand,
  eingerastet); ein Punkt der Farblinie liegt dann dort, wo der Zeiger steht.
- **Proben, die an der Wand des Tops ziehen:** Unter einem gewählten Ring hängt der Tropfen „Maul formen“ und kann genau über dem
  Anfasser liegen. Vorher die Auswahl leeren: Esc, aber nur, wenn etwas gewählt ist (ohne Auswahl lässt Esc die Luft ab). Und
  hinter der Form liegt in der Grundansicht bei (685; 545) der Griff der Raumecke: Ein Klick dort klappt auf, statt zu füllen.
- **„strange bird“ in der Grundansicht:** Die Mitte liegt verdeckt in der Falte zwischen den zwei Körperhälften; die vordere
  Hälfte hängt über. Für Proben an der Mitte die Form von vorn drehen (im Leeren 170 Pixel nach links ziehen; so der Film).
- **„strange bird“ kommt nach einem Zug hin und zurück nicht an ihren Platz** (Haut bis 4,5 Einheiten daneben). Wer dort misst,
  vergleicht die Bemalung mit der Haut, nicht mit ihrer Lage davor.
- **Die Kanten der hinteren Raumecke und die Zeichnungen an den Wänden** liegen bei allen festen Materialien als feine Linien über
  der Form (schon vor dieser Sitzung; im Bildblatt der Etappe 2, Bild 6, am linken Flügel zu sehen). Nicht behoben.
- **Ein Ziel mit linearen Farben braucht mehr als 8 Bit,** sobald weiche dunkle Verläufe darin stehen.
- **Ebenen, die Reihenfolge beim Zeichnen:** three zeichnet alles Deckende vor allem Durchscheinenden, gleich was `renderOrder`
  sagt. Darum stehen alle Materialien der Bemalung in der Reihe der durchscheinenden (`transparent: true`, das Überblenden ist
  trotzdem aus, wo sie decken); sonst läge der Rand einer unteren Ebene über dem Inneren einer oberen.
- **Über dem hellen Solid deckt nichts von selbst** (dort wird multipliziert): Zwei Ebenen direkt übereinander gäben Farbe mal
  Farbe. Sie werden erst zu einem Bild gesammelt. Verrechnet wird dieses Bild mit dem Körper selbst, nicht über die ganze
  Fläche: Sonst färbt es am Umriss die Stellen neben dem Körper mit (dort steht die Kante des hellen Solids; die Probe sah 47
  von 255).
- **Ein Ziel mit Kantenglättung gibt nach jedem Durchgang seine Farbe frei** (three, `invalidateFramebuffer`): Was zusammen in
  ein solches Ziel soll, steht in einer Szene und wird in einem Durchgang gezeichnet.
- **Was ein Bild kostet, samt Grafikkarte messen** (`mitKarte` in `ozzy-teile.mjs`: nach jedem Bild einen Bildpunkt
  zurücklesen). Die Zeit von `bild()` allein zeigte vom Sammeln nichts (0,3 ms), die Grafikkarte brauchte 3,5 ms mehr je Bild.
  Der Abstand der Bilder beim Drehen schwankt von Lauf zu Lauf (16,8 bis 27 ms im Median): kein Kriterium, nur ein Hinweis.
- **Der Kasten der Form im Bild (`hautAusschnitt`) ist viel größer als ihr Umriss** (er nimmt die Ecken ihres Kastens im
  Raum). Wer etwas an der Größe der Form im Bild bemisst, nimmt den Kreis um sie (`faecherKreis`: Er hängt auch nicht davon ab,
  wie sie gedreht ist).
- **Die Ebenen-Ansicht zeichnet alle Kopien in einem Durchgang** (je Kopie ein Versatz im Programm und ein Bereich der Tiefe).
  Je Kopie ein ganzes Bild des Wachses kostete das Doppelte (26 statt 13 ms bei 2880 × 1800).
- **Aufgefächert liegt die Form, an der gemalt wird, verkleinert und versetzt im Bild.** Wer im Paint-Modus einen Strahl der
  Kamera braucht, rechnet den Zeiger zuerst zurück (`malOrt`, `faecherZurueck`), oder nimmt das Blatt der Farblinien (seine Sicht
  ist schon die der Kopie). `faecherBild` sind die Kopien des letzten Bilds: Daran misst das Drücken.
- **Der Platz einer Ebene zählt im Fenster von oben** (`ebeneOrdnen(id, platz)` in `main.ts`, der Haken `farbEbene('ordnen')`), im
  Farbwerk von unten.
- **Die Linien an den Wänden zeichnet `wandLinien`** (Umriss der Form, die Farblinien als feine Striche, die Kanten der Ecke),
  nicht `werkLinien`. Aufgefächert blendet beides über `faecherStill()` aus.
- **Der Renderer des hellen Solids zeichnet in Ruhe nicht neu:** Sein Tempo misst man beim Drehen (`__ozzy.gast(true)`, dann
  je Bild `mess.verzerren + mess.zeichnen`); `mitKarte` wartet nur auf `#haut` und `#linien`.
- **Im Film-Takt (`film(true)`, `bild()`) kann der Stapel am Rand hinter dem Bild herhinken:** vor einem Bildschirmfoto kurz
  in echter Zeit warten.
- **Ein gezogenes Element der Seite gleitet nach dem Loslassen zurück** (seine Stile ändern sich, es liegt noch unter dem
  Zeiger): Wer wissen will, was unter dem Zeiger liegt (`elementFromPoint`, der Mülleimer), fragt vor dem Aufräumen.
- **Zusammenführen später:** Dieser Zweig ändert `main.ts` an schmalen Nahtstellen (Suchwörter `farbWerk`, `farbBlatt`, `malModus`,
  `farbAn`, `farbWerkzeug`, `farbLeiste`, `weichZug`, `weichGriffe`, `ebenenStapel`, `faecher`, `malOrt`), dazu `leiste.ts` (zwei Werkzeuge, `LeistenWerkzeug`), `material.ts` (`kopien`), `gast.ts`
  (`ueberzug`, `kopien`), `werkBlatt.ts` (`stiftZiel`), `ablage.ts` (`farbe`), `ozzy.html`, `ozzy.css` und beide `CLAUDE.md`. Der Stand in `CLAUDE.md` wird beim Zusammenführen ohnehin neu geschrieben.
