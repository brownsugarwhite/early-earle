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

## 7. Nach dem Beweis: Rohmodell in Blender (19.11.)

Florian: „dein beweis sieht aus wie das schlechteste aus beiden welten“, dann: „Ja blender klingt besser. das weiß kann auch gerne aus
einem shader kommen. Im gesicht vllt nicht aber am körper bzw den beinen schon. Die ansichten sind nicht 100%ig exakt. es sind recht
schnelle drafts gewesen … Mach mal und wir schauen wie gut es rankommt.“

- **Modell** (`tools/ozzy-figur/ozzy_roh.py`, läuft im Hintergrund: `Blender -b --factory-startup --python tools/ozzy-figur/ozzy_roh.py
  -- docs/look/ozzy-figur/3d`): Metaballs (weich ineinanderfließende Kugeln und Kapseln) nach seinen Maßen, Zeile für Zeile aus Front
  und Seite gelesen: Bohne, vier Beine, Schwanz (eine Familie), Kopf als fast runde Kugel mit Bart unten vorn, Nase, Ohren als oben
  spitz zulaufende Eier. Ergebnis `docs/look/ozzy-figur/3d/ozzy-roh.blend` (Metaballs zum Formen ausgeblendet, Netze sichtbar) und
  `ozzy-roh.glb` (Netze: koerper mit Eckfarbe „fenster“, kopf, nase, ohrR, ohrL).
- **Zeichnen** (`apps/editor/ozzy-3d.html`, `src/ozzy-figur/drei/main.ts`, three.js): flach schwarz. Beine und Schwanz: Weiß, wo die
  Fläche zur Kamera schaut (Regler „Fenster“, Standard 0,85: ein schwarzer Rand von rund 20 bleibt), die Sohle bleibt schwarz. Gesicht:
  sein Weiß aus der Frontzeichnung, fest auf den Kopf gemalt, nur auf Flächen, die nach vorn schauen, und nie bis an den Umriss.
  `?seitenWeiss=1` malt zusätzlich die Seitenzeichnung auf seitliche Flächen (Versuch: Brauen und Augen verwischen, Front 67 statt 80 %).
- **Deckung des Schwarz** (seine Zeichnungen sind Entwürfe; nur zur Orientierung): Front 79 %, Rücken 85 %, Seite 50 % (dort fehlt das
  Weiß des Barts an der Wange), 3/4 52 % (seine 3/4 zeigt den Kopf stärker von vorn). Bilder `docs/progress/ozzy-figur/2026-11-19-3d-*`.
- **Offen für ihn:** wie das Gesicht von der Seite aussehen soll (Bart an der Wange als eigene Form oder Bemalung), Proportionen am
  Modell nach seinem Auge (in Blender), dann Skelett und Haltungen.

### 7a. Bart als eigene Form (Florian, 19.11.: „Bart als eigene Form“)

- **Versucht:** Bart = was von vorn UND von der Seite weiß ist (Schnitt beider Weißflächen durch den Kopf). Verlor zu viel Weiß (Front
  62 %): Der runde Kopf des Rohmodells liegt nicht genau auf seinem Seitenumriss (die Stirn steht vor), dort fällt der Schnitt weg.
  Weich nach der Richtung der Fläche gemischt: Brauen verwischen. Weich auslaufende Grenze: schwarze Risse über den Rand der Front.
- **Gebaut (Standard `?gesicht=kante`):** Jede Fläche des Kopfes nimmt die Zeichnung, zu der sie schaut: die Front bis etwa 53° zur
  Seite (dort liegt noch das Weiß ihres Gesichts), dahinter die Seitenzeichnung (links gespiegelt), scharfe Grenze. Eine feste Form
  auf dem Kopf, die sich mitdreht. Front 77 %, Seite 61 % (vorher 50 %), Rücken 83 %. Rest: bei 50–60° sieht man die Grenze als
  senkrechte Kante, wo die Braue der Front auf die der Seite trifft. Bilder `docs/progress/ozzy-figur/2026-11-19-3d-bart-*`.
