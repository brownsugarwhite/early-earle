# Ozzy-Figur: 3D aus deinen Zeichnungen statt Morph der Zeichnungen (Vorschlag, 19.11.2026)

**Stand: Beweis gebaut (Florian, 19.11.: „Ja, 3D-Beweis“), Ergebnis in Abschnitt 6.** Sein Urteil steht aus.

Anlass, Florian (19.11.): „ich spreche von der 360 grad drehung. Es kann eigentlich nicht sein dass wir jetzt tage an so einfachen
animationen eines so einfachen characters rumdoktorn... Wo ist das problem? Wie geht es besser. Ich habe auch den verdacht dass die
animationen nicht gut dynamisch ineinandermorphen werden und wir für jeden übergang eine extra animation brauchen werden...hast du
das bedacht?“

## 1. Wo das Problem liegt

- **Wir morphen flache Zeichnungen, Anker für Anker.** Drehen und Hinsetzen sind aber Bewegungen im Raum: Teile wandern
  hintereinander, Kanten laufen über eine Rundung, Spitzen verschwinden hinter der Kontur. Davon weiß der Morph nichts, er schiebt
  Punkte zwischen zwei Zeichnungen hin und her. Wo sich zwei Zeichnungen räumlich widersprechen, entstehen Haken, Haarlinien, Stufen.
- **Jede solche Stelle braucht eine eigene Reparatur.** Bisher: Faltschlüssel, Zwischenschlüssel 67°, Spitzenführung, Klemmen,
  gebaute Haltungen (Hocke, Diener), Anker je Abschnitt, gehobene Pfoten. Der Kopf von 0° bis 90° hat nach drei Runden noch drei
  unsaubere Stellen (ferne Wange bei 5–15°, Stirn am fernen Ohr bei 25–45°, Spitze der Stirnfranse bei 50–75°). Eine Drehung um 360°
  hat viermal so viele Bereiche zwischen Schlüsseln, mit derselben Art Fehler (Rückseite, Ohren, die sich kreuzen).
- **Haltungen:** Deine Zeichnungen liegen und messen verschieden (Hinterpfoten im Sitzen weit vorn, im Liegen weit hinten; Beine im
  Liegen bis 15 % größer, Fenster bis 150 %). Mischt man die Zeichnungen, rutscht und wächst es. Ein sauberer Übergang braucht dann je
  Paar eine eigene Choreographie (heute 8 Abläufe für 3 Haltungen). **Dein Verdacht stimmt:** Das wächst mit jedem neuen Zustand
  (n Haltungen, bis n·(n−1) Wege), und jede Unterbrechung macht es schwieriger.
- Das hätte ich früher sagen müssen: Die Sonderregeln häuften sich seit Etappe C (Plan vom 18.11., Abschnitt 5 hatte 3D verworfen,
  weil deine Ansichten gezeichnet und nicht projiziert sind; den Preis dafür bei 360° und bei freien Übergängen habe ich unterschätzt).

## 2. Wie es besser geht: Ozzy als einfache 3D-Figur, flach schwarz-weiß gezeichnet

- **Form aus deinen Zeichnungen:** Jedes Teil (Bohne, Beine, Kopf, Ohren, Schwanz, Nase) wird ein Körper im Raum. Front und Seite
  deiner Zeichnung sind zwei Schablonen; ihr Schnitt, abgerundet, ist der Körper („visual hull“). Von vorn und von der Seite ergibt
  das deine Umrisse, dazwischen dreht er sich wie ein echter Körper. Teile verschmelzen weich wie heute im Modus „flüssig“.
- **Weiß aus deinen Zeichnungen:** Bart, Fenster, Schwanzspitze und Ohrspalt liegen als deine Formen auf der Oberfläche (von vorn, von
  der Seite und von hinten aufgelegt, nach der Richtung der Fläche gemischt). Sie drehen mit; es gibt keine Anker mehr, die aneinander
  vorbeilaufen.
- **Skelett:** Knochen für Rumpf, Hals, Kopf, Ohren, Schwanz und je Bein zwei bis drei Glieder. Eine Haltung ist ein Satz
  Gelenkwinkel; jede Haltung geht in jede andere über, auch mitten im Wechsel. Pfoten, die stehen, hält die inverse Kinematik am
  Boden: Rutschen ist dann ausgeschlossen statt repariert.
- **Charakter ohne Handarbeit je Übergang:** Ausholen, Nachfedern und Wackeln kommen aus allgemeinen Regeln (Federn, Trägheit).
  Besonderes, wie der Hüpfer auf den Hintern, ist ein kurzer Clip, der sich in jeden Zustand einblenden lässt (so arbeiten Spiele:
  Clips, Mischbäume, Fußverankerung).
- **360°:** Kopf und Körper drehen frei, auch nach hinten und beim Nicken, ohne Schlüssel je Winkel.
- **Physik später** auf demselben Skelett (Laufen, Stolpern, Springen, Salto wie im ersten Auftrag).
- **Zeichnen:** flach, ohne Licht, ohne Outline, schwarz und weiß, Kanten so scharf wie heute (Abstandsfelder, jetzt im Raum).

## 3. Was es kostet, wo das Risiko liegt

- **Zwischenansichten:** Dein 3/4 ist gezeichnet, nicht gerechnet. Die 3D-Figur trifft Front, Seite und Rücken; bei 45° zeigt sie die
  räumliche Mitte. Ob dir das gefällt, entscheidet dein Auge. Wo deine Zeichnungen bewusst schummeln (die fernen Beine schauen im
  Profil vor), helfen kleine Verschiebungen je Blickwinkel; so arbeitet etwa Guilty Gear Xrd (3D, das wie gezeichnet aussieht).
- **Haltungen:** Sitzen und Liegen entstehen aus Gelenkwinkeln, ihre Form weicht etwas von deinen Zeichnungen ab. Wo nötig, bekommt
  eine Haltung eine Korrekturform: je Haltung, nicht je Übergang.
- **Tempo auf dem iPhone** (Abstandsfelder im Raum sind teurer als in der Ebene): misst der Beweis. Reicht es nicht, wird die Form
  beim Laden in ein Netz umgerechnet und wie üblich mit Skelett gezeichnet.
- **Was bleibt:** der Import deiner SVGs, die Abstandsfelder, die Kantenglättung. Der Zweig bleibt als Stand erhalten.

## 4. Beweis zuerst (eine Sitzung), vorher festgelegte Probe

1. Stehen, gebaut aus Front und Seite; Körper und Kopf drehen von 0° bis 360°.
2. Bei 0° (Front), 90° (Seite) und 180° (Rücken) decken sich die schwarzen Flächen mit deinen Vorlagen zu mindestens 97 %; bei 45°
   steht sie neben deinem 3/4 zum Ansehen.
3. Beim Drehen in 5°-Schritten keine Haken, Haarlinien oder Stufen (Bildfolge).
4. Tempo in Chrome und Safari am Mac; das iPhone misst du.

Hält der Beweis nicht, sage ich es sofort; dann bleiben wir bei 2,5D oder gehen nach Blender.

## 5. Danach (nur nach deinem Wort)

Skelett mit Stehen, Sitzen und Liegen, freie Übergänge mit stehenden Pfoten, dann Physik.

## Alternative: Modell in Blender

Ozzy als Netz mit Skelett aus Blender (von dir oder von mir über Blender gebaut); Skelett und Logik wie oben. Vorteil: Du formst ihn
direkt. Nachteil: Deine SVGs sind dann nur Vorlage, das Weiß wird eine Textur, und jede Formänderung ist Handarbeit.

## 6. Ergebnis des Beweises (19.11.)

Seite `apps/editor/ozzy-raum.html` (Port 5213), Code `apps/editor/src/ozzy-figur/raum/`, Probe `scripts/ozzy-figur/raum-probe.mjs`,
Bilder und Video `docs/progress/ozzy-figur/2026-11-19-raum-*`.

| Probe | Ergebnis |
| --- | --- |
| 1 Drehung 0–360° | Körper und Kopf drehen frei; der Umriss läuft ohne Haken und Stufen ✓ |
| 2 Deckung des Schwarz | 0° Front 98,7 % ✓ · 90° Seite 96,1 % (knapp unter 97: Spitze des fernen Ohrs, Nasenspitze) · 180° Rücken 90,5 % ✗ (siehe unten) |
| 3 Weiß zwischen den Ansichten | an den Schlüsselwinkeln genau seine Zeichnung; dazwischen unruhig (Fenster der Beine, Bartkanten) ✗ |
| 4 Tempo am Mac | Chrome 2,6 ms (95 %: 6,3), Safari 2,0 ms (5,0) je Bild ✓; iPhone misst Florian |

- **Rücken:** Ein Körper zeigt von hinten genau das Spiegelbild seiner Front. Florians Rückansicht hat Beine und Ohren an denselben
  Stellen wie die Front (nicht gespiegelt), und seine Front ist ungleich (Deckung mit dem eigenen Spiegelbild 73 %). Mehr als rund
  91 % sind von hinten deshalb mit keinem Körper möglich.
- **Weiß:** Das Weiß kommt aus seinen Zeichnungen und wird zwischen zwei Ansichten gemischt. Wo zwei Zeichnungen verschiedenes Weiß
  an dieselbe Stelle legen (Beinfenster vorn und von der Seite), wird es zwischen den Ansichten unruhig. Sauber wird es erst, wenn das
  Weiß einmal im Raum liegt (auf den Körper gemalt), statt aus mehreren Zeichnungen gemischt zu werden.
