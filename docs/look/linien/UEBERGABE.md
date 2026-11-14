# Übergabe: Linien, Punkte, Zeiger (Stand 14.11.2026, spätabends)

Eigener Strang. Plan: [`docs/plans/2026-11-14-linien-zeiger-tropfen.md`](../../plans/2026-11-14-linien-zeiger-tropfen.md).
Florians Entwürfe liegen hier (`2026-11-14-florian-fisch-entwurf.webp` und `…-nah.webp`); vor jedem Urteil öffnen.

## Wo was liegt

| Was | Ort |
| --- | --- |
| Arbeitsbaum | `.claude/worktrees/look-linien`, Zweig `claude/look-linien` (von `claude/form-spiegel`, 23aa8e7d) |
| Server | Eintrag `linien-look` in `.claude/launch.json`, Port 5199 |
| Seite | `http://localhost:5199/linien.html` (`?info=1` zeigt Bilder je Sekunde und Kapseln, `?bild=1` ohne Leiste) |
| Code | `apps/editor/src/linien/`: `netz.ts` (Linien, Punkte, Abtasten, Ziehen), `fluessig.ts` (Anzeige, WebGL2), `verhalten.ts` (Anflug, Tropfen, Greifen, Werte), `feder.ts`, `main.ts` (Seite, Feinregler), `fisch.json` |
| Fisch aus dem Entwurf | `apps/editor/scripts/linien/fisch-aus-entwurf.mjs` (Aufruf im Kopf der Datei; braucht das Bild als BMP über `sips`) |
| Vergleichsbilder | `apps/editor/scripts/linien/vergleich.mjs` → `docs/progress/linien/<datum>-vergleich-gesamt.jpg`, `…-nah.jpg` |
| Film | `apps/editor/scripts/linien/film.mjs <ziel.mp4>` (Ablauf in `BAHN`, Bild für Bild, 60 je Sekunde, ffmpeg) |
| Raum | `http://localhost:5199/raum.html` (`?form=<Name>`); `src/linien/raum.ts`, `raum-main.ts`; Film `scripts/linien/raum-film.mjs` |

## Bedienung der Seite

Zeiger an Linie oder Punkt, drücken und ziehen. Pinch oder ⌘ + Rad zoomt, zwei Finger oder Leertaste verschieben, ⌘Z zurück.
Knöpfe: 100 %, Einpassen, Entwurf (seine Zeichnung darunter, E), Wachsen mit Zoom, Feinregler (R; Werte bleiben im Browser,
„Werte kopieren“ legt die geänderten als JSON in die Zwischenablage), Zurück, Fisch neu.

## Stand

- Gebaut und an seinem Entwurf verglichen (Bilder `docs/progress/linien/2026-11-14-vergleich-*.jpg`): Stärken, Punkte, Zeiger, Stern an
  Kreuzungen, Linse an der Linie, Tropfen an der Spitze.
- Florian zur ersten Fassung (14.11., abends): „sehr gut“, aber beim Klick soll nicht die Stelle zum Zeiger gleiten, sondern
  umgekehrt, animiert. Umgebaut: Der gezeichnete Zeiger gleitet auf Punkt oder Linie (`versatz` in `verhalten.ts`), die Stelle folgt
  der Maus genau, beim Loslassen gleitet der Zeiger zurück. Geprüft mit den Test-Haken: Stelle beim Klick 0,000 bewegt, Zeiger im
  Zug 0,000 auf der Stelle, Versatz nach dem Loslassen 0. Film neu (`docs/progress/linien/2026-11-14-film.mp4`, `film.mjs`).
- Punkte: 2,5 px Durchmesser (Florian: „Durchmesser soll gelten“).
- Linienstärke wächst beim Zoomen standardmäßig nicht mit (Florian); Schalter „Wachsen mit Zoom“ bleibt. Geprüft: innen 0,25 px
  und Punkt 2,5 px Durchmesser bei 100 % und 400 % gleich, mit Schalter bei 400 % viermal so groß.
- **Im Raum** (Florian: „auf ein 3D-Modell übertragen, damit ich es im Raum testen kann“): `raum.html` mit seinen Formen aus `wesen/`
  (Plan, Schritt 1b). Haut weiß mit Umriss als Hülle, Linien und Punkte projiziert, Verdecktes je Bildpunkt grün, Ziehen mit weichem
  Feld als Ersatz für den Löser. Geprüft mit `__raum` (Kreuzung folgt der Maus genau). Film `2026-11-14-raum-film.mp4`.
- Offen: ob „Mesh“ auch ein Nachschwingen der Haut meint; danach der Einbau in die Blätter des Editors.

## Fallen

- Das Vorschaufenster der Sitzung ist oft verborgen; dann läuft `requestAnimationFrame` nicht. Prüfen mit `__linien.zeigerHin(x, y)`
  und `__linien.vorspulen(ms)` (rechnet die Federn ohne Bildtakt; im Raum `__raum`) oder mit `vergleich.mjs` (eigener Browser).
- Im Raum: Die Haut der Formen läuft an der Spiegelebene durch sich selbst; ohne den Schnitt wie im Editor (`hautSeiten`, jede Hälfte
  an der Ebene abgeschnitten) gibt es Fehler am Umriss. Die Hülle für den Umriss nur mit Rückseiten zeichnen, sonst schlägt sie an
  schrägen Flächen durch die Haut.
- Der Entwurf ist dreifach exportiert: Einheit überall „Punkt des Entwurfs“ = Bildpunkt / 3. Die Zeigerspitzen in `vergleich.mjs`
  sind aus dem Nahbild abgelesen (auf etwa einen Punkt genau).
- An den Stellen, an denen im Entwurf schon Zeiger, Tropfen und Sterne gezeichnet sind, hält das Skelett die Linien nicht: Dort sind
  drei Stücke von Hand gelegt (`VON_HAND`) und die Punkte von Hand gesetzt (`ECHT`).
- `.claude/launch.json` im Hauptordner hat den Eintrag `linien-look` uncommittet (das Vorschauwerkzeug liest nur dort). Auf diesem
  Zweig ist er committet; beim Nachziehen des Hauptordners die lokale Änderung vorher verwerfen.
