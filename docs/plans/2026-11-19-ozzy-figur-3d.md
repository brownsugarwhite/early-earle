# Ozzy-Figur: 3D aus deinen Zeichnungen statt Morph der Zeichnungen (Vorschlag, 19.11.2026)

**Stand: Vorschlag, wartet auf Florians Wort.** Nichts davon ist gebaut.

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
