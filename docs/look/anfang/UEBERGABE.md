# Übergabe: Anfang einer Form und Seifenhaut (Stand 15.11.2026, spätabends, Runde 5)

Eigener Strang neben „Linien, Punkte, Zeiger“. Konzept, Florians Rückmeldungen wörtlich, Ergebnisse und Fragen:
[`docs/plans/2026-11-15-anfang-seifenhaut.md`](../../plans/2026-11-15-anfang-seifenhaut.md). Florians Materialentwurf (keine feste
Vorlage): `2026-11-15-entwurf-materialien.webp` hier im Ordner.

## Wo was liegt

| Was | Ort |
| --- | --- |
| Arbeitsbaum | `.claude/worktrees/anfang`, Zweig `claude/anfang` (von `claude/form-spiegel`, 23aa8e7d) |
| Server | Eintrag `anfang` in `.claude/launch.json`, Port 5203 (auch uncommittet im Hauptordner, weil das Vorschauwerkzeug dort liest) |
| Seite | `http://localhost:5203/anfang.html` (`?info=1` Takt und Netz, `?bild=1` ohne Leiste und Zeiger, `?film=1` ohne Leiste mit Zeiger, `&fassung=0–3`, `&nacht=1`) |
| Code | `apps/editor/src/anfang/`: `main.ts` (Seite, Ablauf, Raum, Kamera, Ansichten, Viereransicht, Eingaben, Test-Haken `__anfang`), `stift.ts` (P, Kapseln), `form.ts` (Netz, Poisson, Körper mit Schlauch, runde Blase, Strahl), `aufblasen.ts` (Ablauf als Funktion der Zeit, Grundwerte), `haut.ts` (Farbtafel, Shader, Durchgänge, Felder, Aufwärmen), `schatten.ts` (weiche Schatten an den Wänden), `regler.ts`, `fluessig.ts` (Kopie aus dem Linien-Strang, Stand d762e508) |
| Skripte | `apps/editor/scripts/anfang/`: `film.mjs` (ganzer Ablauf mit Ansichten; `KURZ=1`, `TITEL=…`, `DPR=…`), `bilder.mjs` (`MOMENTE=…`, `FASSUNGEN=0,3`, `GRUND=papier`), `ansichten.mjs` (Raum, Seite, Front, Top, halbe Fahrt, Viereransicht), `nah.mjs` (Abriss groß), `takt.mjs` (Übergang und Takt; `FASSUNGEN=…`, `WARTE=<ms>`, `DPR=…`), `fisch.mjs` (Testform) |
| Schrift | `assets/fonts/lobster/Lobster-Regular.ttf` (SIL OFL, `OFL.txt` daneben), eingebunden in `src/anfang/anfang.css` |
| Bilder, Filme | `docs/progress/anfang/` (Runde 5: `2026-11-15-r5-film.mp4`, `…-r5-ablauf-papier.png`, `…-r5-ansichten.png`) |

## Stand

- **Runde 2:** Rahmen fährt zur Wand und wird Schatten, Haut hängt und reißt ab, Linien an den Wänden beim Darüberfahren, Lobster.
- **Runde 3:** Ecke statt Kasten, Namen in Lobster auf dem Boden (in Runde 5 wieder entfernt, Florian: keine großen Labels).
- **Runde 4:** erst runde, pralle Blase, kräftiges Schwingen, dann die Form; Kamera beim Hängen zur Seite.
- **Runde 5 (gebaut, sein Urteil steht aus):** Florian: „noch zu sehr aus der Spiegellinie“, Hals „billig und kantig“, Dynamik „zu
  zäh“, Projektion auf allen Seiten (höchstens drei), keine Labels, weiche Schatten, Morph zu den Ansichten, Viereransicht. Gebaut:
  Kuppel in der Mitte wächst nach außen, Rock wird Schlauch, runder Hals als eigenes Netz, Abriss bei 0,47 s, Schnalz in die Form;
  schneller Zug mit gleichzeitiger Kamerafahrt (24°/14°); Würfel mit weichen Schatten auf den abgewandten Wänden; Ansichten 1, 3, 7, 0
  (Drehen und Dolly-Zoom in 0,62 s) und 4. Einzelheiten und offene Punkte im Plan, Abschnitt „Gebaut (Runde 5)“.
- **Nicht gebaut:** Punkte in Front und Top ziehen; Ziehen, Aufblasen, Glätten an der Blase (kommt im Detail später); Nacht ist
  weiter nicht gut.

## Bedienung

P ist das einzige Werkzeug: Klick Ecke, Ziehen rund, ⌥ bricht den Griff, am ersten Punkt schließen (oder ↩), ⌫ letzter Punkt
zurück (geschlossen: öffnet), Esc verwirft. ↩ bläst auf. Danach: über eine Wand fahren zeigt den Umriss von ihrer Achse, an der Blase
ziehen dehnt, daneben ziehen dreht (beim Loslassen nahe einer Achse, unter 9°, rastet die Ansicht ein), Rad zoomt, Leertaste noch
einmal, Esc oder ⌫ zurück aufs Blatt. 1 Seite (Punkte ziehbar, die Blase folgt), 3 Front, 7 Top, 0 Raum: tippen bleibt, halten
schaut kurz hin. 4 Viereransicht an und aus. M Fassung, N Nacht, R Feinregler.

## Fallen

- Zwei Leinwände übereinander: unten three.js (Haut, in ein Halbfloat-Ziel mit 4× MSAA, am Ende nach sRGB), oben die flüssige
  Anzeige (WebGL2, eigener Kontext). Für Verdecktes bekommt die obere den Körper nur als Tiefe (`koerperZeigen: false`). Der Ring
  liegt genau auf der Haut: ohne `bias` flackert er.
- Durchsichtige Fassungen zeichnen je Seite zwei Durchgänge (Durchlass multiplizieren, Spiegelung addieren), hinten vor vorn.
- `Koerper`: vorn 0..n−1, hinten n..2n−1, Rahmen 2n..3n−1 auf denselben Puffern (`subarray`), dazu der Schlauch als eigenes Netz
  (`schlauch`, Ring = Randpunkte × 44 Zeilen). Vor dem Abriss ist alles hinter dem Hals unsichtbar (`sicht` je Punkt).
- **Abriss ohne Sprung** nur, weil der Schlauch am Abriss genau in die Trichter von Rückseite und Rahmen übergeht (kurz überblendet,
  `seitRiss`): Wer Hals (`halsOrt`, Profil `trichter`) oder Schlauch ändert, ändert beide Seiten in `Koerper.setzen` und prüft mit
  `__anfang.abriss()` (Sprung kleiner als die Schritte danach).
- **Farben der Dehnung:** Bezug ist die Blase in Ruhe (`bezugRuhe` nach `setzen(moment(99))`), dann `bezugJetzt` für den Anfang.
  Mit dem flachen Film als Bezug ist die Kuppel in der Mitte rund 30-fach gedehnt und wird weiß. Im Shader ist die Dehnung auf
  0,55 bis 6 begrenzt.
- **Schatten** (`schatten.ts`): je Achse ein Bild des Umrisses (384²), nur wenn eine Wand dieser Achse zu sehen ist, zweimal
  weichgezeichnet (Kern ein Viertel, Halbschatten = `weich` in Welt). Die Wände multiplizieren (Zero/SrcColor) und liegen ohne Tiefe in
  der Szene der Haut (renderOrder −20). Der alte Weg (Blase im Shader auf die Wand gelegt, `uSchatten`) ist abgeschaltet.
- **Raum und flache Ansichten:** `raumSicht()` = (1 − flach)²: Wände und Ecklinien sind in flachen Ansichten aus, auch beim Drehen
  von einer zur nächsten. Die Linien einer Ansicht erscheinen nur nahe ihrer Achse (Blickrichtung · Achse über 0,97), sonst stünden
  sie beim Drehen schräg im Bild.
- **Viereransicht:** drei orthografische Kameras, mit Viewport und Scissor ins selbe Ziel gezeichnet (nur die Blase); der Raum
  schrumpft über die Projektionsmatrix ins vierte Feld. Die Linien der Felder zeichnet die obere Leinwand (`linienDerFelder`).
- **Aufwärmen beim Laden** (`aufwaermen` in `main.ts` und `Haut`): eine kleine Probeblase wird einmal unsichtbar gezeichnet, mit
  Schlauch und allen sechs Wänden. Ohne das übersetzt der Browser die Schatten-Shader mitten im ersten Aufblasen (ein Bild 59 ms).
- **Takt messen** im Browserfenster des Vorschauwerkzeugs (Größe auf 1440 × 900 stellen, danach zurück), immer gegen eine leere
  Seite: Das Fenster hat bei 120 Hz von sich aus etwa jedes neunte Bild bei 60 Hz. Der Testbrowser ohne Bildschirm zeigt bei doppelter
  Dichte nach Pausen Aussetzer, die das echte Fenster nicht hat.
- Normalen nach dem Winkel gewichten, nicht nach der Fläche (sonst zeigen harte Spiegelungen das Netz). Die runde Blase ist eine
  zweite Lage je Punkt (`runderUmriss`: Rand geglättet, Fläche gleich, Inneres harmonisch mit `dirichletLoesen`); einfaches Glätten
  des ganzen Netzes faltete an der Flosse.
- Filme: `__anfang.film(true)` hält den Takt des Browsers an, dann rechnet nur `__anfang.bild(1/60)`; `__anfang.zeit(T)` hält die
  Zeit fest (auch die Uhr des Materials). `aufDerHaut` für einen Punkt außerhalb der Form trifft den nächsten Randpunkt: Zum Drehen
  im Film deutlich daneben drücken. `aufDerWand(i, a, b)`: 0 hinten, 1 seitlich, 2 unten (die jeweils ferne Wand).
