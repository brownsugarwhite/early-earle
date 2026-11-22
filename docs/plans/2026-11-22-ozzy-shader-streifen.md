# Ozzy, Shader: alle Shader in Streifen über der Form (22.11.2026)

Florian, 22.11., mit einem Bild (sechs schräge Streifen über „strange bird“, je Streifen ein Shader mit seiner Bühne): „kannst du
mir eine demo erstellen in der all meine shader in der art meines screenshots übereinanderliegen und ich all meine shader
durchswipen kann und das 3d objekt darunter immer genau die textur/shading hat das angezeigt ist … das 3d objekt soll möglichst groß
angezeigt werden … nach links und rechts flüssig swipen und all meine shader über das mesh laufen lassen“.

Vorlage gesichert: `docs/look/ozzy/shader/vorlagen/2026-11-22-streifen-vorlage.webp`.

## Was gebaut wird

- Eine Ansicht **Streifen** in Ozzy (Zweig `claude/ozzy-shader`, Fenster 5219): alle 94 Shader nebeneinander als schräge Streifen
  (Schräge wie im Bild, etwa 1 zu 5), endlos im Kreis, in der Reihenfolge der Tafel. Jeder Streifen zeigt die Form mit genau
  seinem Shader und seiner Bühne; die Grenzen sind harte, geglättete Schnitte.
- **Groß:** Beim Eintritt passt die Ansicht die Form ins Fenster (Kasten der Form im Bild, Rand 4 %), ohne Bedienung, Linien und
  Tafeln. Der Blick bleibt, wie er war (Drehung und Neigung); beim Verlassen kommen Zoom, Schwenk und Material zurück, gewählt ist
  dann der Shader in der Mitte.
- **Wischen:** Finger, Stift und Maus ziehen die Streifen mit Schwung; das Trackpad wischt mit zwei Fingern; ← → einen Streifen
  weiter (weich), ↑ ↓ breitere oder schmalere Streifen, Esc oder × zurück. Namen klein unten im Streifen.
- **Eintritt:** Knopf „Streifen“ in der Tafel der Shader, Taste ⇧Y, oder die Adresse `ozzy.html?streifen=1&form=strange%20bird`.

## Wie es flüssig bleibt

- Während des Wischens ändert sich nur, welcher Teil welches Bilds zu sehen ist. Jeder Shader rechnet sein Bild darum einmal für
  den ganzen Blick; das Wischen setzt nur fertige Bilder zusammen (ein Durchgang mit bis zu zwölf Bildern).
- Bewegte Shader rechnen in Ruhe nur ihren Streifen nach (Schere auf den Kasten des Streifens, alle Ziele in Fenstergröße; Paare
  der Simulation laufen ganz).
- Je Bild höchstens so viel Arbeit, wie in den Takt passt (gemessen am Abstand der Bilder); zuerst, was zu sehen ist, dann die
  Nachbarn in Wischrichtung.
- Übersetzen im Hintergrund (paralleles Übersetzen, wo der Browser es kann), die nächsten zuerst. Die Programme bleiben in einem
  Schatten erhalten, darum kostet ein Shader, der wiederkommt, kein Übersetzen mehr. Ein Shader, der noch nicht fertig ist, zeigt
  die Form in Ton mit einem leichten Schimmer.
- Am Leben bleiben die sichtbaren und die nahen Shader (Speicher der Ziele); weiter entfernte werden ganz freigegeben.

## Probe

Am Mac im Fenster 5219 mit „strange bird“: Wischen ohne Ruckeln (Bildabstand im Mittel unter 20 ms), jeder Streifen zeigt seinen
Shader auch an der Form, keine Kante zwischen zwei Streifen außer dem Schnitt. Urteil: Florian.

## Stand (22.11., gebaut)

- Gebaut wie geplant: `apps/editor/src/ozzy/shader/streifen.ts` (Bahnen, Takt, Übersetzen im Hintergrund, Schatten, Ton),
  `shader/streifenBedienung.ts` (Ebene, Wischen mit Schwung, Trackpad, Zusammenziehen, Tippen, Tasten, Namen), im Kern die Schere
  (`ausschnitt`) und das Mitschreiben (`aufzeichnen`, `sammeln`), Knopf „Streifen“ in der Tafel, Taste ⇧Y, Adresse `?streifen=1`
  (ohne `form` lädt sie „strange bird“, Blick schräg von vorn wie die Bilder der Shader).
- Zwei Fehler gefunden, die es auch ohne Streifen gab: (1) Fell, Schaf, Plüschtier, Leopard, Tiger und Giraffe teilten ihre Ziele
  unter dem Namen „fell“, auch das Muster je Ecke (wird nur bei Änderungen neu gerechnet): In den Streifen trug das Schaf das
  Leopardenmuster. Jetzt heißen die Ziele nach dem Shader (`schalen.ts`). (2) Das Schuppenfeld gab es einmal je Kern; jede Schlange
  mit einer anderen Schuppengröße rechnete es neu (rund 0,5 s im Hauptfaden je Wechsel). Jetzt eins je Maß (`schuppenFeld.ts`).
- Gemessen im Fenster 1024 × 768 (2048 × 1536 Gerätepunkte), mit Warten auf die Grafikkarte: ein ganzes Bild kostet je Shader 1 bis
  20 ms (Wolke 20, Zuckerwatte 18, Staub 16, Rauch 11, Ereignishorizont 10, die meisten 1 bis 6). Übersetzen aller 94 im Hintergrund
  rund 15 s beim ersten Öffnen, danach rund 2 s. Ein Durchlauf durch alle 94 mit erzwungen viel Arbeit je Bild: im Mittel 2 ms je
  Bild, einzelne bis 160 ms (Pusteblume, Fell beim ersten Rechnen nach dem Neubau). Speicher: höchstens 9 laufende Shader und 40
  behaltene Bilder.
- Bilder: `docs/progress/ozzy/shader/2026-11-22-streifen.jpg`, `-schlangen.jpg`, `-fell.jpg` (nach der Korrektur des Fells).
- Nicht geprüft: der Takt im sichtbaren Fenster (das Fenster der Probe war verdeckt), iPhone und iPad. Offenes: „was bleibt“ 64 bis 67.
