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
