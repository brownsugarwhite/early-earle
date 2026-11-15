# Übergabe: Anfang einer Form und Seifenhaut (Stand 15.11.2026, abends)

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
| Skripte | `apps/editor/scripts/anfang/`: `bilder.mjs`, `film.mjs` (`KURZ=1`, `TITEL=…`, `DPR=…`), `takt.mjs`, `fisch.mjs` (Testform) |
| Bilder, Filme | `docs/progress/anfang/` |

## Bedienung

P ist das einzige Werkzeug: Klick Ecke, Ziehen rund, ⌥ bricht den Griff, am ersten Punkt schließen (oder ↩), ⌫ letzter Punkt
zurück (geschlossen: öffnet), Esc verwirft. Geschlossen ziehen sich Punkte noch. ↩ bläst auf. Danach: daneben ziehen dreht, Rad
zoomt, an der Haut ziehen dehnt, Leertaste noch einmal, Esc oder ⌫ zurück aufs Blatt (der Film läuft rückwärts). 1–4 Fassung,
N Nacht, R Feinregler.

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
