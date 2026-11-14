# Übergabe: Linien, Punkte, Zeiger (Stand 14.11.2026, abends)

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
| Vergleichsbilder | `apps/editor/scripts/linien/vergleich.mjs` → `docs/progress/linien/<name>-vergleich-gesamt.jpg`, `…-nah.jpg` |

## Bedienung der Seite

Zeiger an Linie oder Punkt, drücken und ziehen. Pinch oder ⌘ + Rad zoomt, zwei Finger oder Leertaste verschieben, ⌘Z zurück.
Knöpfe: 100 %, Einpassen, Entwurf (seine Zeichnung darunter, E), Wachsen mit Zoom, Feinregler (R; Werte bleiben im Browser,
„Werte kopieren“ legt die geänderten als JSON in die Zwischenablage), Zurück, Fisch neu.

## Stand

- Gebaut und an seinem Entwurf verglichen (Bilder `docs/progress/linien/2026-11-14-vergleich-*.jpg`): Stärken, Punkte, Zeiger, Stern an
  Kreuzungen, Linse an der Linie, Tropfen an der Spitze.
- Geprüft im Fenster: Punkt und Kreuzung ziehen, Stelle einer Linie ziehen (die Linie liegt danach 0,04 Punkte unter dem Zeiger).
- Florians Urteil steht aus. Fragen an ihn: Punktgröße (Durchmesser oder Radius), ob „Mesh“ auch die Haut im 3D meint.

## Fallen

- Das Vorschaufenster der Sitzung ist oft verborgen; dann läuft `requestAnimationFrame` nicht. Prüfen mit `__linien.zeigerHin(x, y)`
  und `__linien.vorspulen(ms)` (rechnet die Federn ohne Bildtakt) oder mit `vergleich.mjs` (eigener Browser).
- Der Entwurf ist dreifach exportiert: Einheit überall „Punkt des Entwurfs“ = Bildpunkt / 3. Die Zeigerspitzen in `vergleich.mjs`
  sind aus dem Nahbild abgelesen (auf etwa einen Punkt genau).
- An den Stellen, an denen im Entwurf schon Zeiger, Tropfen und Sterne gezeichnet sind, hält das Skelett die Linien nicht: Dort sind
  drei Stücke von Hand gelegt (`VON_HAND`) und die Punkte von Hand gesetzt (`ECHT`).
- `.claude/launch.json` im Hauptordner hat den Eintrag `linien-look` uncommittet (das Vorschauwerkzeug liest nur dort). Auf diesem
  Zweig ist er committet; beim Nachziehen des Hauptordners die lokale Änderung vorher verwerfen.
