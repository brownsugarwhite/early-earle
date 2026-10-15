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
