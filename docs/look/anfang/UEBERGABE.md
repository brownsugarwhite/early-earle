# Übergabe: Anfang einer Form und Seifenhaut (Stand 15.11.2026, spätabends, Runde 3: Ecke)

Eigener Strang neben „Linien, Punkte, Zeiger“. Konzept, Ergebnis und Fragen an Florian:
[`docs/plans/2026-11-15-anfang-seifenhaut.md`](../../plans/2026-11-15-anfang-seifenhaut.md). Florians Materialentwurf (keine feste
Vorlage): `2026-11-15-entwurf-materialien.webp` hier im Ordner.

## Wo was liegt

| Was | Ort |
| --- | --- |
| Arbeitsbaum | `.claude/worktrees/anfang`, Zweig `claude/anfang` (von `claude/form-spiegel`, 23aa8e7d) |
| Server | Eintrag `anfang` in `.claude/launch.json`, Port 5203 (auch uncommittet im Hauptordner, weil das Vorschauwerkzeug dort liest) |
| Seite | `http://localhost:5203/anfang.html` (`?info=1` Takt und Netz, `?bild=1` ohne Leiste und Zeiger, `?film=1` ohne Leiste mit Zeiger, `&fassung=0–3`, `&nacht=1`) |
| Code | `apps/editor/src/anfang/`: `main.ts` (Seite, Ablauf, Kamera, Eingaben, Test-Haken `__anfang`), `stift.ts` (P, Kapseln), `form.ts` (Netz, Poisson, Körper, Strahl), `aufblasen.ts` (Ablauf als Funktion der Zeit), `haut.ts` (Farbtafel, Shader, Durchgänge), `regler.ts`, `fluessig.ts` (Kopie aus dem Linien-Strang, Stand d762e508) |
| Skripte | `apps/editor/scripts/anfang/`: `bilder.mjs` (`MOMENTE=…`, `FASSUNGEN=0,3`, `GRUND=papier`), `film.mjs` (`KURZ=1`, `TITEL=…`, `DPR=…`), `nah.mjs` (Abriss groß), `takt.mjs` (Probe 1 und 3), `fisch.mjs` (Testform) |
| Schrift | `assets/fonts/lobster/Lobster-Regular.ttf` (SIL OFL, `OFL.txt` daneben), eingebunden in `src/anfang/anfang.css` |
| Bilder, Filme | `docs/progress/anfang/` |

## Stand Runde 2

Florians Rückmeldung (wörtlich im Plan, Abschnitt „Runde 2“): Seifenhaut und Höhenlinien gefallen, Nacht noch nicht; Aufblasen neu (Rahmen fährt zur Wand und wird Schatten, Haut hängt, reißt ab), Kasten mit Schatten an den Wänden, Linien nur beim Darüberfahren, Lobster. Gebaut und geprüft, sein Urteil steht aus. Nicht gebaut: Morph zur Ansicht beim Drehen und Bedienen der Kurven an den Wänden (aus der Ecke der Vision übernehmen, Cloud-Zweig `claude/meme-curves-editor-concept-s65kq1`), Ziehen, Aufblasen, Glätten an der Blase (kommt im Detail später).

## Stand Runde 3

Florian: „ich meinte Ecke und die Beschriftung soll auch auf den Boden projiziert sein“. Gebaut: Ecke aus Rückwand (Seite), linker Wand (Front) und Boden (Top), drei Haarlinien vom Eckpunkt, Namen in Lobster flach auf dem Boden (grau, beim Darüberfahren dunkel), Kamera 32°/22° mit eingepasstem Abstand. Sein Urteil steht aus.

## Bedienung

P ist das einzige Werkzeug: Klick Ecke, Ziehen rund, ⌥ bricht den Griff, am ersten Punkt schließen (oder ↩), ⌫ letzter Punkt
zurück (geschlossen: öffnet), Esc verwirft. Geschlossen ziehen sich Punkte noch. ↩ bläst auf. Danach: über eine Wand oder ihren Namen am Boden fahren
zeigt ihre Linien, der Name wird dunkel, an der Blase ziehen dehnt, daneben ziehen dreht, Rad zoomt, Leertaste noch einmal, Esc oder ⌫
zurück aufs Blatt (der Film läuft rückwärts). 1–4 Fassung, N Nacht, R Feinregler.

## Fallen

- Zwei Leinwände übereinander: unten three.js (Haut, in ein Halbfloat-Ziel, am Ende nach sRGB), oben die flüssige Anzeige (WebGL2,
  eigener Kontext). Für Verdecktes bekommt die obere den Körper nur als Tiefe (`koerperZeigen: false`); die Tiefe ist −z der Ansicht,
  wie bei den Kapseln. Der Ring liegt genau auf der Haut: ohne `bias` flackert er.
- Durchsichtige Fassungen zeichnen je Seite zwei Durchgänge (Durchlass multiplizieren, Spiegelung addieren), hinten vor vorn. Die
  Rückseite zeigt sich erst, wenn sie sich vom Film löst (`hintenSichtbar`), sonst kämpfen zwei gleiche Flächen.
- Vorder- und Rückseite haben je eigene Randpunkte (gleiche Lage). Die Normale am Rand mischt beide erst, wenn die Form zu ist (`zu`);
  in der Phase „eine Fläche“ hätte die Summe sonst die Länge 0.
- Normalen nach dem Winkel gewichten, nicht nach der Fläche: Auf dem ungleichen Netz (Reihen am Rand) kippen sie sonst, und harte
  Spiegelungen zeigen das Netz.
- Der Takt des Browsers rechnet nichts, solange `__anfang.film(true)` gilt; Filme rechnen Bild für Bild mit `__anfang.bild(1/60)`.
  `__anfang.zeit(T)` hält die Zeit des Aufblasens fest (auch die Uhr des Materials), für genau wiederholbare Standbilder.
- Ein Druck mit `aufDerHaut` für einen Punkt außerhalb der Form trifft den nächsten Randpunkt, also die Haut: Zum Drehen im Film
  einen Punkt deutlich daneben nehmen.

- **Runde 2:** Drei Flächen auf einem flachen Netz (`Koerper`: vorn 0..n−1, hinten n..2n−1, Rahmen 2n..3n−1); die Haut der Blase
  und der Rest im Rahmen sind zwei Geometrien auf Teilstücken derselben Puffer (`subarray`). Vor dem Abriss ist alles hinter dem
  Hals unsichtbar (`sicht` je Punkt), nicht weggeschnitten.
- Abriss ohne Sprung nur, weil der Schlauch bei `schnitt` = 1 genau die beiden Trichter ist, mit denen es weitergeht: Wer das
  Profil (`trichter`) oder die Lage des Halses ändert, muss beides an beiden Stellen ändern (`Koerper.setzen`, beide Zweige).
- Wände: Die Blase wird im Shader auf die Wand gelegt und mit MIN gemischt (Überdeckungen nicht doppelt dunkel). An der Rückwand
  löst die Projektion der Blase den Rest im Rahmen ab, sobald er ganz Schatten ist (gleiche Form, gleiche Farbe).
- Ecke (`eckeRechnen`): Wände bei `xl`, `yb`, `zw`; der Abstand der Kamera am Ende kommt aus `einpassen` (Halbierung, alle wichtigen Punkte im Bild). Wer Namen, Schatten oder die Kamera verschiebt, bekommt den Abstand neu.
- Namen am Boden (`Haut.setzeNamen`): die Schrift wird erst gezeichnet, wenn Lobster geladen ist (`document.fonts.load`); danach meldet sie ihr Seitenverhältnis, und die Ecke wird neu gerechnet. Darüberfahren prüft auf dem Boden zuerst die Rechtecke der Namen.
- Alle Shader werden in `setzeKoerper` übersetzt (`renderer.compile`), sonst stockt ein Bild, wenn die Wände erscheinen.
- `__anfang.aufDerWand(i, a, b)` gibt einen Punkt auf Wand i (0 Rückwand, 1 links, 2 Boden) im Bild, `aufDemNamen(i)` die Mitte eines Namens; `abriss()`
  misst den Abriss (Sprung und Schritte davor und danach).
