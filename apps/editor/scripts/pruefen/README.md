# Prüfskripte (Mess- und Bildwerkzeuge der Phase 2)

Gerettet aus dem Scratchpad der Sitzung vom 14.10.2026 (dort nur flüchtig). Die Pfade sind relativ zum Repo; Ausgaben landen in `apps/editor/pruefen-ausgabe/` (oder `AUSGABE=<ordner>`; nicht unter `test-results/`, das leert Playwright bei jedem E2E-Lauf), Bilder für Florian schreiben einzelne Skripte nach `docs/progress/editor/`.

## Kern-Skripte (`.ts`, ohne Browser)

Aus `packages/shape` starten: `npx vite-node ../../apps/editor/scripts/pruefen/<skript>.ts`

| Skript | misst |
|---|---|
| `umriss-abweichung.ts` | Abweichung Körper ↔ Kurve je Blatt (px bei 461 je Kachel) |
| `top-diagnose.ts` | Soll-/Ist-Breite je Ring gegen das Top |
| `stern-check.ts`, `platte-check.ts` | Tiger-Stern / Plattenmaul: Lage, Durchdringungen |
| `pose-ringe.ts` | Verschiebung je Ring beim Öffnen (wandern Bauchringe mit?) |
| `ueberbiss-check.ts` | Überbiss-Varianten, Durchdringungen je Öffnung nach Bereich (`DETAIL=1`, `LINIEN`, `DICKEN`, `NUR`) |
| `ueberbiss-schnitt.ts` + `html-shot.mjs` | Schnittbilder quer/längs als HTML → PNG |
| `bereiche-debug.ts` | Durchdringungen nach Bereich (Haut/Lippe/Tasche) |
| `pruefreihe.ts` | Prüfreihe Maul (Wesen × Kiefer × gezogene Anfänge): Δ, Lippen-px, Falten offen, Durchdringungen je Öffnung; schreibt `pruefreihe.json` (`NUR`, `ZUG=1`, `KUGEL0=1`) |
| `falten-orte.ts`, `maul-schnitt.ts` | wo die Falten liegen (`FALL`), Schnittbilder eines Falls |
| `zug-matrix.ts` (+ `flaechenabstand.ts`) | 15.10.: Anfänge in vier Richtungen ziehen (wie im Editor, Stationen eingefroren): Topologiewechsel (Ring, k, m, Käfigpunkte, Kappenzeile) und Sprünge der Haut zur vorigen Fläche |
| `lokalitaet-maul.ts` | 15.10.: Florians Satz 2 — Lippenanfang 10 px ziehen, Haut außerhalb des Bands (schwarze Linie, mit `LINIEN=1` auch Rot/Blau, + `RAND`) zur vorigen Fläche, Ziel < 0,5 px |

## Editor-Skripte (`.mjs`, Playwright gegen eigenen Vite auf 5192)

`apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/<skript>.mjs` — startet den Web-Modus auf Port 5192, führt das Skript aus, beendet den Server. Nie Florians Server auf 5180 benutzen.

| Skript | prüft |
|---|---|
| `delta-check.mjs` | Δ im Blatt-Titel und Saum |
| `stationen-check.mjs` | eingefrorene Stationen (Langhals-Hals hoch) |
| `platte-editor.mjs`, `tiger-front-stern.mjs` | Tiger aus der Library zu/offen, Stern im Front-Blatt klicken |
| `rex-ueberbiss.mjs`, `kugel-ueberbiss-florian.mjs` | Überbiss-/Unterbiss-Bilder (Rex, Florians Kugel) |
| `folgen-check.mjs`, `folgen-maul.mjs` | Formen folgen nach Pinselstrichen, mit Maul |
| `langhals-front-maul.mjs` | Maul im Front-Blatt (Tiefe vom Kern-Netz) |
| `pruefreihe-bilder.mjs` | Kontaktbogen der Prüfreihe (`NUR`, `NAH`, `NAME`) |
| `langhals-editor.mjs` | Florians Langhals-Ablauf: Maul zeichnen, getrennt, roter Anfang 4 × 15 px runter (Δ, Punktzahl, eingefrorener Maulzustand) |
| `seite-nah.mjs`, `front-nah.mjs` | 15.10.: Seite bzw. Front nah (`NAH=cu,cv,zoom`; Front mit `SPANT=f`) — ist eine Abweichung echt oder verdeckt? |
| `pruefwesen-check.mjs` | 15.10.: Wächter — alle Prüfwesen der Library laden, Δ, Punktzahl, Bühne zu/offen |
| `kiefer-spant-editor.mjs` | 15.10.: Kiefer-Spant setzen (Werkzeug S), + auf der Unterkiefer-Kurve, Punkte ziehen (Front, Bühne), Undo |
| `kiefer-griffe.mjs`, `knochen-griffe.mjs`, `knochen-buehne.mjs` | Rig und Fressen: Gelenk, Kieferlinie, Knochen in der Seite und auf der Bühne |
| `zahn-vergleich.mjs` | Phase 2 M4: Zähne zu/offen aus mehreren Kameras neben Referenzen (`WESEN`, `KAMERAS`, `OEFFNUNGEN`, `REF`, `DOK`, `MAUL`); vorher/nachher aus einem eigenen Arbeitsbaum mit kopierten `node_modules`-Verweisen |
| `zahn-tafel.mjs` | Tafel Zähne: Automatik → Stepper (Dokument übernimmt) → Länge für alle → Neigung am gewählten Zahn → Werte für offen → Löschen, Verteilen → Automatik, Undo |
| `zahn-griffe.mjs`, `zahn-blaetter.mjs` | Zahn auf der Bühne bzw. in Seite und Front anklicken und längs ziehen; verdeckte Zähne nicht greifbar |
| `zahn-farbe.mjs` | Zahnfarbe über den Farbwähler, keine neue Ableitung, zurück zum Standard |
| `zahn-pruefung.mjs` | Prüfung im Editor: zu langer Zahn → Befund, Glut, Vorschlag → frei, Undo (wartet auf `__stores.zahnPruefung.fertig`) |
| `zahn-abnahme.mjs` | Abnahme M4: Rex mit 14 Zähnen in Florians Schritten, Bild neben `rex_mouth_detail` und Bogen 06 |
| `augen-zustaende.mjs` | Phase 2 M5: PezenPez in allen Augenzuständen, Lid halb, Kugel-Paare (Knopf, Mandel gedreht, Schlitz) neben Bild 10 und der PezenPez-Vorlage (`KAMERA`) |
| `augen-glubsch.mjs` | Phase 2 M5, Schritt 2: Prüfwesen Glubsch in allen Zuständen, Lid halb, schräg, zu von unten; Kugel-Paare; Rex mit Glubschaugen zu/offen (Kugel folgt dem Schädel), neben Bild 10 |
| `augen-tafel.mjs` | Tafel Augen: Chip Glubsch, Tiefe, Rand ziehen (Größe), Undo, Klick setzt neu; Prüfpunkte mit ✓/✗ |
| `augen-augapfel.mjs` | Phase 2 M5, Schritte 3a/3b: Augapfel am Rex mit Höhle (zu/offen, 0°/20°, vorn, nah, von vorn oben, Seite) neben Bild 11; Spiegeltest gedrehter Augen (gemalt, Glubsch) von vorn (`LAGE=x,y,z`, `GROESSE`; Rex-Probe `LAGE=-0.15,0.285,0.11 GROESSE=0.06`) |
| `augen-abnahme.mjs` | Abnahme M5: PezenPez, Glubsch und Rex aus der Library, alle Zustände, neben Bild 10, PezenPez-Vorlage und Bild 11 |
| `maularten-bestand.mjs` | Phase 2 M6, Schritt 1: Bestand je Maulart (Kugel als Fisch, Drache `hals`, Tiger-Platte als W, Tiger-Kinn) neben den Referenzen |
| `rundmaul.mjs` | Phase 2 M6, Schritt 2: Prüfwesen Fisch, Rundmaul in fünf Öffnungen, schräg, Seite, neben `fish_round mouth`; Tafel-Chip aus/an |
| `drache.mjs` | Phase 2 M6, Schritt 3: Drache mit Maul `hals` in fünf Öffnungen, schräg und von vorn, neben `rex_dragon_big mouth` |
| `maularten-abnahme.mjs` | Abnahme M6: Fisch, Drache und Tiger zu/offen neben den vier Referenzen |
| `schaedel-gelenk.mjs` | Plan 5.2: Schädelgelenk-Griff in der Seite ziehen (Rex, Posen & Leben), Dokument, Knochen, ohne Umbau, Undo |

## Nachtrag 16.10.: Grundkörper, Linien, Maul-Einsatz, Posen, Vergleich

### Kern-Skripte (aus `packages/shape` mit `npx vite-node ../../apps/editor/scripts/pruefen/<skript>.ts`)

| Skript | misst / zeigt |
|---|---|
| `grundkoerper-g.ts` | Teil G: Kontaktbogen der Grundkörper (Seite, Front, Top, schräg; Wirbelsäule, Sprossen), Δ je Blatt, Falten, Zeit. `KOERPER`, `NAME`, `TITEL`; `BAUM=1` Rumpf und Äste getrennt, `BAUM=3` Wirbelsäulen-Baum (G4 neu Schritt 3), `TEILE=verschmolzen|angesteckt` (G4 Teile) |
| `skelett-g4.ts`, `zerlegung-g4.ts` | Teil G, G4 neu: Mittelachsen der drei Ansichten; automatische Zerlegung der Seite in Rumpf und Äste mit Schnittsehnen |
| `knoten-diagnose.ts` | Plan „Formgerechte Topologie“, Beweis 1: Nahaufnahme des Ast-Ansatzes (Käfigkanten, Falten > 20° rot, Sehne blau). `BAU=alt` (baum.ts) oder `knoten` (knoten.ts), `LAGEN=ziele|kaefig`, `GROESSE` |
| `g3-querschnitte.ts` | Teil G, G3 (verworfen): Querschnitt je Ring gegen je Abschnitt |
| `leiter-bild.ts` | Leiter eines Falls als Bild (Rücken, Bauch, Sprossen) |
| `netz-l0.ts` | Teil L, L0: Bilder „Linie wird Reihe / Ring“ (Cel-Stufen, Käfigschleifen, Reihe rot, Linie blau) |
| `einsatz-feld.ts`, `einsatz-topologie.ts`, `einsatz-loesen.ts`, `einsatz-vergleich.ts`, `einsatz-alt-neu.ts` | Teil A (Maul als Einsatz): Feld (A3), Topologie (A5), gelöste Haut (A7), Varianten der Lippenstellen über 54 Fälle, alter Maulbau gegen Einsatz („Bauch unter hohem Maul“) |
| `zufallsreihe.ts`, `werkzeug-matrix.ts` | Teil V: Zufallsreihe (200 Fälle, wie im Editor gebaut), Werkzeug-Matrix H0 |
| `posen-tempo.ts` | B7: Tempo eines Gewichtswechsels (Vorschau, Überblenden) |

### Editor-Skripte (über `run-check.sh`)

| Skript | prüft |
|---|---|
| `reihe-boegen.mjs` | Kontaktbögen der Zufallsreihe im echten Editor |
| `tab-wechsel.mjs` | B1: Tab-Wechsel mit echten Klicks und Pinselzügen (Grundform bitgleich) |
| `fressen-pinsel.mjs`, `posen-b3.mjs` … `posen-b7.mjs`, `posen-matrix.mjs` | Posen: jedes Werkzeug in jeder Pose, Tafel „Posen & Leben“, Undo mit Zielwechsel |

### Regressionsvergleich: gleicher Ablauf, alter Stand gegen heute (`vergleich/`)

So wurde am 16.10. die Regression G2 gefunden (Florians Ablauf: neue Kugel → umformen → Maul). Arbeitsbäume liegen unter `$WT_BASIS` (Standard `$TMPDIR/ee-vergleich`), Bilder unter `apps/editor/pruefen-ausgabe/vergleich/`. Aufräumen: `git worktree remove --force <pfad>`, dann `git worktree prune`.

| Skript | macht |
|---|---|
| `vergleich/editor-lauf.sh <commit\|HEAD> <port> <skript.mjs>` | Editor eines Commits auf eigenem Port (nie 5180) starten, Skript ausführen, beenden |
| `vergleich/kern-lauf.sh <commit\|HEAD> <skript.ts>` | Kern-Skript gegen den Code eines Commits (`ROOT`) |
| `vergleich/buehne.mjs` | Library-Prüfwesen laden, Bühne mit gleicher Kamera fotografieren, Δ (`NUR`) |
| `vergleich/ablauf.mjs` (+ vorher `vergleich/maul-json.ts`) | Florians Ablauf im Editor: neue Kugel (Stationen frieren ein) → Schnabel mit Kerbe → Unterbiss-Maul; neue Kugel → Vase |
| `vergleich/ablauf-kern.ts` | derselbe Ablauf im Kern mit Δ, Falten, Enden der Wirbelsäule |
| `vergleich/bau.ts` | Library-Prüfwesen im Kern frisch und eingefroren bauen, Falten (`WESEN`) |

## Nachtrag 16.10. vormittags: S0 (Plan „Liniennetz, Zielform, Käfig“)

| Werkzeug | misst / zeigt |
|---|---|
| `grundkoerper-g.ts` | jetzt auch die S0-Körper (`einfach`, `einfach-glatt`, `ente-haken`, `vase`, `vierbeiner`, `zweihals`, `augenstiele`, `fluegel-oben`), Widersprüche rot auf der Linie, Falten nach Zonen im Text |
| `s0-editor.mjs` (über `run-check.sh`) | lädt Prüfkörper im echten Editor (`laden`, Stationen frieren ein), hält Δ und Widerspruch je Blatt fest, Bild je Fall; `FAELLE`, `AUSGABE` |
| Kern: `kern/pruefen/zonen.ts`, `kern/grundkoerper/huelle.ts` | Faltenmaß nach Zonen; Erreichbarkeit der Umrisse (Widerspruch je Probe in px), Säulen der Sichthülle |

## Nachtrag 16.10. mittags: S1 Liniennetz, S1c Kopplung jedes Punkts

| Skript (über `run-check.sh`) | misst / zeigt |
|---|---|
| `netz-a.mjs` | Liniennetz je Blatt (Züge sichtbar/verdeckt, Ringe), Bilder je Fall; `FAELLE`, `NETZSTIL=ton\|farbe`, `LINIE=1` (Kantenlinie in der Seite), `KAEFIG=1`, `GROESSE` |
| `netz-b.mjs` | derselbe Punkt: SVG-Blatt gegen die Kamera des Blatts (≤ 0,5 px, auch 150 % und Back/Bottom), Hover-Marke in allen Blättern, Ziehen eines fremden Knotens (gemeinsame Koordinate, ein Undo-Schritt); `FAELLE`, `GROESSEN` |
| `netz-c.mjs` | S1c: Mauszüge an der Startkugel (Widerspruch ≤ 1 px nach jeder Geste, ein Undo-Schritt), „angleichen“ an der Ente-Haken |
| `netz-d.mjs` | Sichtbarkeit des Netzes gegen den Strahltest der Bühne (≥ 99,5 %; Proben genau auf dem Umriss und hinter umgeklappten Flächen gesondert), Formgeste ohne versteckte Schreibvorgänge |
| `netz-bauchpunkt.mjs` | Florians Beispiel: Bauchknoten der Seite im Top (Ring), Hover in allen Blättern, im Top längs ziehen |
| `kontaktbogen.mjs <spec.json> <aus.png>` | Kontaktbogen aus Bild-Ausschnitten (ohne Server, direkt mit `node`) |

Kern: `kopplungPunkte.test.ts` (Angleichen der Prüfkörper, 325 Zufallsgesten, alte Widersprüche bleiben), `kern/netzSicht.test.ts`. Prüfskripte, die `@playwright/test` laden, müssen im Repo liegen (aus dem Scratchpad findet Node das Paket nicht).
