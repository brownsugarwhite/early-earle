# Übergabe: Linien, Punkte, Zeiger (Stand 15.11.2026, abends)

Eigener Strang. Plan: [`docs/plans/2026-11-14-linien-zeiger-tropfen.md`](../../plans/2026-11-14-linien-zeiger-tropfen.md). Konzept
zur Freigabe: [`docs/plans/2026-11-15-richtungen-statt-griffe.md`](../../plans/2026-11-15-richtungen-statt-griffe.md).
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
| Werkzeug P und Auswahl (seit 15.11. abends) | Code `src/linien/stift.ts` (P wie Illustrator, Schnittstelle `StiftWerk`, Rechnung 2D), `auswahl.ts` (Auswahl 2D), im Raum in `raum.ts` (Haut treffen, auflegen, Mitte); Proben `scripts/linien/stift-zeichnen-probe.mjs` (2D) und `stift-raum-probe.mjs` (Raum), Filme `stift-film.mjs 2d|raum` → `docs/progress/linien/2026-11-15-stift-*`. Die alte `stift-probe.mjs` (Punkt setzen und gleich ziehen) ist abgelöst |
| Konzeptbilder | `scripts/linien/konzept-bilder.mjs` (2D, sechs Bilder), `konzept-raum.mjs` (Raum, drei Bilder) → `docs/progress/linien/2026-11-15-konzept-*.png` |
| Richtungen | Code `src/linien/richtung.ts` (+ `verhalten.ts`, `raum.ts`, `netz.ts`); Probe `scripts/linien/richtung-probe.mjs`; Bilder `richtung-bilder.mjs`; Film `richtung-film.mjs` → `docs/progress/linien/2026-11-15-richtung-*` |
| Zeiger bleibt, Schwellung fließt | Vorher und nachher auf demselben Weg, mit Messwerten: `scripts/linien/fliessen-film.mjs` (lädt den alten Stand aus git ins Fenster) → `docs/progress/linien/2026-11-15-fliessen-*` |
| Konzept Auswahl und P | Plan `docs/plans/2026-11-15-auswahl-und-stift.md`; Bilder `scripts/linien/konzept-stift.mjs` (2D, neun) und `konzept-stift-raum.mjs` (Raum, drei) → `docs/progress/linien/2026-11-15-konzept-stift-*` |

## Bedienung der Seite

Zeiger an Linie oder Punkt, drücken und ziehen. Pinch oder ⌘ + Rad zoomt, zwei Finger oder Leertaste verschieben, ⌘Z zurück.
Auf der Linie nahe am Punkt: Richtung drehen (⌥ knickt, zurück in die Flucht rastet ein, Doppelklick: Knick ↔ rund); im Raum auf
der Haut, ⇧ beim Drücken aus der Haut.
Auswahl (V): Klick wählt einen Punkt (⇧ dazu oder weg), Ziehen im Leeren zieht einen Rahmen, Doppelklick auf eine Linie wählt den
Loop, gewählte gehen beim Ziehen zusammen mit, ⌫ löscht, Esc leert, ⌘A alle.
P (wie Illustrator): Klick Ecke, Ziehen rund, ⌥ bricht, ⇧ 45°, Leertaste verschiebt beim Ziehen den Punkt, Klick auf den letzten
Punkt zieht seinen Griff ein; am ersten Punkt der Ring (Klick oder Ziehen schließt), ↩ schließt, ⌫ nimmt den letzten Punkt zurück,
Esc bricht ab. Auf Vorhandenem beginnen oder enden: Abzweigung (Ziehen gibt dort ein zweites Griffpaar). Im Raum auf der Haut,
spiegelgleich, an der Mitte rastet P ein (von Mitte zu Mitte: Ring); Ziehen im Leeren: Rahmen, ⌥ + Ziehen dreht, ⌥ + ⇧ + Ziehen
verschiebt, zwei Finger drehen.
Knöpfe: 100 %, Einpassen, Entwurf (seine Zeichnung darunter, E), Wachsen mit Zoom, P · Zeichnen, Feinregler (R; Werte bleiben im
Browser, „Werte kopieren“ legt die geänderten als JSON in die Zwischenablage), Zurück, Fisch neu.

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
- **15.11.:** Florian: „schön, der liquid effect und tropfen effect wirkt gut. Die genauen einstellungen muss ich noch testen.“
  - **P-Regel gebaut:** Punkt auf der Linie nur mit P, sonst nur die Verdickung. Mit P setzt Drücken den Punkt (im Raum
    spiegelgleich); geprüft mit `stift-probe.mjs`, Bild `2026-11-15-stift.png`.
  - **Konzept „Richtungen statt Griffe“** geschrieben, mit Bildern im echten Look. Kern: keine schwebenden Griffe; man fasst die Linie
    nahe am Punkt (Nadel), der Griff erscheint nur beim Halten (Haarlinie mit Perle), ein Ring zeigt die Ebene. ⌥ knickt, Einrasten
    oder Doppelklick rundet, an der Kreuzung je Linie. Im 3D auf der Haut, mit ⇧ aus der Haut. Seine Antworten auf die fünf Fragen
    stehen aus; erst danach die Konzept-Probe bauen.
  - **Freigegeben** („Ja, so bauen“) und **gebaut**: Ergebnisse der Probe, Bilder, Film und Grenzen im Konzept, Abschnitt „Gebaut“.
    Danach: Einbau in den Editor (Schritt 2 des Strangs; Knick je Linie ändert `eckeUmschalten`/`eckeGezeigt` in `kurven.ts`, im
    Bau-Fenster, abgestimmt mit dem Plan „schnell, glatt, exakt“).
- **15.11. nachmittags, Florian zur gebauten Probe:** „Das Konzept an sich hast du sehr gut gemacht!“ Dazu zwei Wünsche und neue
  Punkte (wörtlich im Plan [`2026-11-15-auswahl-und-stift.md`](../../plans/2026-11-15-auswahl-und-stift.md)).
  - **Gebaut:** Der Zeiger bleibt nach dem Klick auf der Stelle und findet erst mit der Bewegung der Maus zu ihr zurück (40 px
    Weg: knapp zwei Drittel); was er trifft, entscheidet der gezeichnete Zeiger. Schwellung und Nadel sind eine Form aus Federn (Mitte,
    Reichweite und Höhe je Seite, Taille), die Spindel fließt in die Nadel. Gemessen gegen den Stand vom Mittag (`fliessen-film.mjs`):
    zwei Buckel 10 Bilder → 0, Stärke beim Wechsel 50 % → 91 %, Zeiger nach dem Klick 6,75 px → 0 vom Punkt.
    `richtung-probe.mjs` prüft jetzt „Zeiger bleibt“ statt „Versatz 0“.
  - **Konzept „Auswahl und Werkzeug P“** (P wie in Illustrator, im Netz anhängen und kreuzen, Ring um den Körper über die Mitte,
    Auswahl mit Tropfen und kleinem Stern, Rahmen): Plan und zwölf Bilder; vier Fragen an ihn.
- **15.11. abends:** Seine Antworten (wörtlich im Plan): Abzweigung, Ziehen an jedem Punkt (zweites Griffpaar), nur Loops, ↩ schließt,
  Esc bricht ab, ⌥ + Ziehen dreht im Raum, Auswahl wie im Bild. **Gebaut in 2D und im Raum**, beide Proben halten alle Kriterien
  (Tabelle im Plan, Abschnitt „Gebaut“), Filme `2026-11-15-stift-film-2d.mp4` und `…-raum.mp4`. Sein Urteil steht aus. Offen:
  Kreuzungen im Raum (dort entstehen noch keine Punkte, wo die neue Linie Linien kreuzt), seine Tastenbelegung, Einbau in den Editor.

## Fallen

- Kreuzungen setzt P erst ein, wenn die Linie fertig ist: Ziehen am ersten Punkt beim Schließen ändert noch das erste Stück; früher
  eingesetzte Kreuzungspunkte blieben dann neben der Kurve liegen. Bis dahin zeigt das Verhalten sie als Vorschau.
- Im Raum misst die Anzeige „verdeckt“ nur nahe am Zeiger (Tiefenbild um ihn). Der Rahmen prüft deshalb jeden Punkt mit einem Strahl
  (`ankerZuSehen`), und `__raum.vorspulen` holt das Tiefenbild wie der Bildtakt; ohne es greift eine Probe Linien auf der Rückseite.
- Proben mit P: Wer auf eine vorhandene Linie oder einen Punkt klickt, macht eine Abzweigung (sie endet am nächsten Vorhandenen).
  Freie Stellen suchen (`stift-raum-probe.mjs`, `freieStelle`); der Tropfen hält 1,8 Fangradien, nach dem Überqueren einer Linie
  zieht Drücken daneben noch sie statt eines Rahmens (`stift-film.mjs` sucht den Anfang des Rahmens fern von allen Linien).
- Im Raum liegt eine mit P gezeichnete Linie nur in der Anzeige auf der Haut (`aufHaut`: Proben auf den nächsten Hautpunkt gelegt);
  ihre Bézier-Punkte und Griffe bleiben die Wahrheit. `Raum3D.schritte` ist das Zurück (der Name `zurueck` gehört zu `StiftWerk`).

- Vorher und nachher im selben Fenster: Den alten Stand einer Datei holt `git show`, `typescript` übersetzt ihn, und Playwright
  liefert ihn unter einer eigenen Adresse aus (`page.route`); die übrigen Module kommen vom Server (`fliessen-film.mjs`). So kommt
  nichts davon ins Repo.
- Die Nadel an Punkt 55, Linie 2 ist knapp 29 Einheiten lang (langer Schwung): Wege, die die Spindel zeigen sollen, außerhalb
  beginnen (Länge mit `nadelLaenge` lesen).
- Ein Ring im Raum als Schnitt der Haut mit einer Ebene (`konzept-stift-raum.mjs`): Am Kopf von „teat firefish“ schneidet die Ebene
  auch die Flanken der Beulen; am Schwanz ist es eine saubere Röhre. Die schräge Hausansicht sieht die Ebene fast von der Kante.

- Konzeptbilder im Raum: Die Bildschleife der Seite läuft nach `formLaden` noch ein paar Bilder und zeichnet über eigene Szenen;
  vor dem Zeichnen kurz warten (`konzept-raum.mjs`, `ausgang`). Verdeckte Haarlinien (grün, 0,25 px) sind auf Bildern kaum zu sehen;
  zum Prüfen dicker zeichnen.
- `page.locator(…).screenshot` kennt kein `clip` (es nimmt das ganze Element); für Ausschnitte `page.screenshot({ clip })`.
- Doppelklick auf eine Richtung zählt die echte Zeit (`performance.now()`, 350 ms). Proben, die schneller als eine Hand mehrmals
  drücken, setzen vorher `verhalten.klick = null`, sonst wird der zweite Druck ein Doppelklick.
- Wege in Filmen nicht vorausrechnen, wenn sich die Linie dazwischen dreht: Die Stelle auf der Nadel aus dem Stand im Fenster lesen
  (`richtung-film.mjs`); sonst greift der Zeiger die Nadel der anderen Linie an der Kreuzung.

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
