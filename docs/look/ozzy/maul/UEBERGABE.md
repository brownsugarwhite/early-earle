# Übergabe: Maul, Zähne, Zunge (Stand 20.11.2026)

**Wo:** Zweig `claude/ozzy-maul` (vom Paint-Zweig `claude/reverent-feynman-1efdd3`, Stand `49f1557c`; er enthält `claude/ozzy`, die
Objekte und den Paint-Modus). Arbeitsbaum `.claude/worktrees/ozzy`, Fenster 5205 (Eintrag `ozzy`). `claude/ozzy` selbst steht
weiter auf `6bef9f17`: zusammengeführt ist nichts, das bleibt Florians Wort.

**Was es gibt:** ein Konzept, eine Studie und zwei Proben. **In Ozzy, am Werk und am Rechenkern ist nichts geändert.**

- Konzept (zur Freigabe): [`docs/plans/2026-11-20-ozzy-maul-zaehne-zunge.md`](../../../plans/2026-11-20-ozzy-maul-zaehne-zunge.md).
  Oben Florians Auftrag wörtlich; Abschnitt 3 die Definition („das Maul ist ein Schnitt, kein Umbau“), 4 die Bedienung, 8 was die
  Studie beweist und was nicht, 9 die Etappen, 10 was bei ihm liegt.
- Recherche: [`docs/research/2026-11-20-maul-zaehne-zunge-recherche.md`](../../../research/2026-11-20-maul-zaehne-zunge-recherche.md).
- Bildblätter: `docs/progress/ozzy/2026-11-20-maul-aus-einer-linie-bogen.jpg`, `…-zaehne-linse-zunge-bogen.jpg`.
- Studie: `http://localhost:5205/maul.html` (`apps/editor/maul.html`, `apps/editor/src/maulstudie/`).

**Seine Antwort (20.11.):** Maul und Zähne „gefallen mir sehr gut“, aber das Innere des Mauls (Zahnfleischlinie, Tasche, Bemalung,
Kieferpunkte) muss nach dem Erstellen bearbeitbar sein wie der Rest des Meshs; dazu eine Ebene „Maul“, riesiger Über- und
Unterbiss und große Hauer auf einer Seite, auch geschlossen. **Daraus der Nachtrag (Plan, Abschnitt 12): Der Schnitt ist nur die
Geburt; mit dem Bestätigen wird das Maul echte Form** (wie ein angewendetes Abziehen). Probe dazu in Ozzy selbst, ohne Code zu
ändern: `scripts/ozzy/maul-echt-probe.mjs`, Bildblatt `docs/progress/ozzy/2026-11-20-maul-echte-form-probe.jpg` (Abziehen
angewendet → Tasche ist Haut, Lippe ist ein Ring mit Kante → Tropfen „Maul“ → „Fressen“ öffnet).

**Probe P1 ist gerechnet (20.11., sein Wort: „Ja, P1 rechnen“; Ergebnis im Plan, 12.6; Bildblatt
`docs/progress/ozzy/2026-11-20-maul-p1-probe.jpg`).** Geöffnet gerechnet (wie in 12.3 festgelegt) hält das Maul nicht. Zu gerechnet,
mit zwei Linien im Maul, hält es an „teat firefish“ fast; die Knochen öffnen nur die Anzeige, und die Kiefer beeinflussen sich
nicht. Knapp verfehlt: ein gefaltetes Dreieck je Seite am Mundwinkel, der Spalt der Lippen, 1,5 statt 1 außen am Unterkiefer.
Gefragt war er, ob ich P2 rechne; sein Wort: „Ja, P2 rechnen“.

**Probe P2 ist gerechnet (20.11.; Ergebnis im Plan, 12.9; Bildblatt `docs/progress/ozzy/2026-11-20-maul-p2-probe.jpg`).** Das Maul
ohne Spalt hält an „teat firefish“: Ruhe nach 2 Runden, die Lippe ein zusammengeklappter Loop mit Zwillingen (Spalt an der Linie
genau null), am Mundwinkel nichts gefaltet, geöffnet spannt sich nichts, die geschlossene Linie lässt sich als Ganzes ziehen.
Wörtlich nicht erfüllt: am Netz bleibt zwischen den Lippen ein Rest bis 0,14; außen am Unterkiefer 1,63 statt unter 1. Der Rest
außen kommt von der harten Kante, nicht vom Maul (Gegenprobe ohne Schnitt: 1,65 an derselben Stelle). **Gefragt ist er jetzt nach
einem: ob ich mit Etappe 1 in Ozzy beginne** (zuerst ein Vergleichsbild im Look von Ozzy, dann die erste Scheibe; Plan, 12.10).
Das braucht sein Wort für einen neuen Handgriff im Werk. Nichts aus den Etappen ohne sein Wort bauen.

## Die Studie in einem Absatz

Sie lädt eine gesicherte Form (`/__wesen/<Name>`: Haut des Rechennetzes und Linien), verfeinert sie ein- oder zweimal (Loop) und
zeigt sie mit dem Wachs. Eine Linie in der Seitenebene (vom Mundwinkel nach vorn) wird das Maul: Die Haut wird längs der Linie
gerade von Seite zu Seite aufgeschnitten (`schnitt.ts`, mit `manifold-3d` wie der Verbund), die zwei Wände sind Gaumen und Boden.
Jeder Punkt bekommt eine Seite (links oder rechts der Linie) und ein Gewicht; `kieferStellen` dreht ihn um den Mundwinkel. Zähne
sitzen an Plätzen der Wand (`gebiss.ts`, Formen aus `zahn.ts`), die Zunge ist eine Kette mit Federn (`zunge.ts`), die Linse mit
Formenring und Drehregler steht in `linse.ts`. `main.ts` hält alles zusammen (Bühne, Eingaben, Leiste, Haken `window.__maul`).

## Was man wissen muss

- **Zu zeigt die Studie die Form selbst** (`koerperNetz`), nicht die geschnittene Haut: Die Bibliothek braucht einen Spalt mit
  Breite, und der wäre als Haarlinie zu sehen (276 bis 509 Bildpunkte). Im Bau: die Dreiecke an der Linie direkt teilen, Breite
  null.
- **Seiten und Drehsinn:** Das Profil läuft vom Mundwinkel nach vorn. Links der Laufrichtung öffnet gegen den Uhrzeigersinn, rechts
  mit ihm. Welche Seite der Oberkiefer ist, sagt `obenLinks` (bei einem Maul, das nach −x zeigt: falsch).
- **Das Gewicht** (`kieferFeld`): vor dem Mundwinkel 1 bis zur Reichweite (in Längen der Lippe, Standard 1,0, Auslauf bis 1,9),
  hinter dem Mundwinkel über den Winkel um das Scharnier auslaufend (95° bis 165°). Im Auslauf werden die Normalen aus der
  gestellten Haut neu gerechnet (`auslaufNormalen`), sonst schattiert die gedehnte Haut falsch.
- **Die Farbe der Wand** rechnet je Bildpunkt den Abstand zur Lippe aus einer Tabelle „halbe Breite des Mauls über s“
  (`MaulSchnitt.breite`, geglättet). Die Wand hat fast keine eigenen Punkte (alle liegen auf der Lippe): Farbe je Punkt ginge
  nicht.
- **Zähne innen** werden nie länger als der Spalt zwischen den Kiefern (`zaehneStellen`); Zähne vor der Lippe behalten ihre Länge.
- **Die Linse** fängt den Zeiger (`setPointerCapture`): Beim Loslassen meldet der Browser das Feld, nicht mehr das Zeichen unter
  dem Zeiger. Was angetippt wurde, beim Drücken merken.
- **Ein Strahl von three trifft bei einem einseitigen Material nur beim Eintreten.** Wer die Dicke der Form braucht, schießt von
  beiden Seiten (`dickeBei`).
- **Fenster 5205:** Der alte Server war mit dem Wechsel des Zweigs weg; neu gestartet über den Eintrag `ozzy`. Er gehört der
  Sitzung, die ihn gestartet hat; endet sie, muss ihn die nächste neu starten.

## Die Proben P1 und P2 im Kern (`scripts/pruefen/form-maul-echt.ts`)

```bash
# aus packages/shape; rund 12 s je Lauf, kein Fenster nötig
REISS=1 OBEN=0 UNTEN=0 KONTROLLE3=1 BLATT=<pfad> npx vite-node ../../apps/editor/scripts/pruefen/form-maul-echt.ts  # P2
OBEN=0 UNTEN=0 BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-maul-echt.ts   # B: zu gerechnet
AUFRAEUMEN=0 OBEN=0 UNTEN=0 npx vite-node ../../apps/editor/scripts/pruefen/form-maul-echt.ts               # C: ohne Aufräumen
MAULLINIEN=0 npx vite-node ../../apps/editor/scripts/pruefen/form-maul-echt.ts                              # A: geöffnet gerechnet
# das Blatt als Bild, aus apps/editor: BREITE=1900 HOEHE=780 node scripts/pruefen/html-shot.mjs --jpg <pfad>.html
```

Schalter: `NAME=<Form>`, `OBEN`, `UNTEN` (Grad, mit denen gerechnet wird; 0 und 0 = zu), `ZEIG_OBEN`, `ZEIG_UNTEN` (Öffnung nur
für das Bild), `SPALT` (halbe Dicke des Keils), `ZUG` (Weg des gezogenen Lippenpunkts, 0 = aus), `SEITE=lage|schnitt` (Kiefer wie
zuerst nach der Lage oder nach dem Schnitt statt aus den Linien), `DIAG=1` (alle Linien vor und nach dem Abziehen), `GIER`,
`NEIGUNG` (zweiter Blick des Blatts).

Was die Probe tut: Form laden und zur Ruhe rechnen (Kontrolle), die Maullinie als dünnen Keil bauen (mit den zwei Linien des Mauls
als Linien des Keils), mit `objekteVerbinden` abziehen, rechnen, messen (K1 bis K5), mit den Knochen in der Anzeige öffnen, einen
Punkt der Unterlippe ziehen, und zum Vergleich dieselbe Form ohne Maul genauso aufräumen und rechnen (Kontrolle 2).

Merke:

- **Der Baustein lehnt ab, wenn eine Linie zwischen zwei ihrer Punkte durch ein Teil läuft, das dünner ist als ihr Netz.** Vor dem
  Abziehen bekommt jede Linie, die die Maullinie kreuzt, dort einen Punkt des Netzes (`kantenTeilenMit`).
- **Welcher Kiefer ein Punkt ist, nie aus seiner Lage lesen.** Zu liegen die Wände nur um den Spalt auseinander; nach dem Rechnen
  steht ein Punkt des Bodens auf der Seite des Gaumens. `kieferSeiten` liest es aus den Linien (Lippe am Mundwinkel geteilt, Tasche
  bis zur Rachenlinie gefüllt). Mit der Lage kamen zwei falsche Befunde heraus (66 gespannte Dreiecke, Oberkiefer bewegt sich 2,76).
- **Geöffnet rechnen ist keine Ruhe** (Fassung A): Die Tasche ohne Linien bläst sich auf, der Auslauf hinter dem Mundwinkel rundet
  neu. Die Ruhe ist „zu“, die Knochen drehen nur die Anzeige.
- **`falten().umgeklappt` sagt nicht, was es zählt.** `umgeschlageneWo` nennt je Dreieck Ort, Fläche und den Winkel gegen die
  Nachbarn: Splitter des Schnitts (Fläche unter 0,1) sind etwas anderes als ein gefaltetes Dreieck am Mundwinkel (Fläche 15).
- **`heute().weg` ist nur der letzte Abschnitt.** Wie weit die Haut ging, sagen K3 und K4 (über `flaechenAbstand`).
- **Linien, die nach `kantenTeilenMit` neue Punkte tragen, nie über die Haut von davor zeichnen:** Die fehlenden Lagen werden im
  Blatt zu Strichen zum Ursprung (`vorherBild`).
- Das Aufräumen der Probe ist das des Fensters (`nadelnZusammenlegen`, `nachVerdichten` mit `verdichtenWieImFenster`).

Aus P2 (`REISS=1`: der Spalt geschlossen, Lippen als Zwillinge):

- **Das Modell für die Zwillinge gibt es im Kern:** `maulLinie.ts` (14.11.), `Loop.maulLinie` mit dem Winkel 0, `zwillinge`,
  `zwillingeAngleichen`, `zwillingeFestlegen`, `zwillingsFehler`. Die Rechnung liest `maulLinie` nicht.
- **Die Zwillingsregel kennt nur Enden auf der Spiegelebene.** An einem Ende, das an einer anderen Linie hängt, setzt sie einen
  Griff nach außen; damit kippte die Rechnung (Unterkiefer 6 statt 1,6 daneben, 42 bis 71 Runden statt 2). Nach
  `zwillingeFestlegen` an hängenden Enden den äußeren Griff auf null setzen (`ENDGRIFF=0` stellt den Fehler nach).
- **Nach dem Zwillingsschritt** bekommt jede Probe ihre Stelle auf dem neuen Pfad (`pfadParameter`), und Punkte anderer Linien
  an denselben Kreuzungen gehen mit (`mitnehmen`).
- **Punkte am selben Ort** (Gaumen und Boden, Zwillinge an Kreuzungen): Die Spiegelpaare nie aus den Lagen neu lesen.
  `verdichten` führt sie mit; `kantenTeilen` und `hautAus(pos, tri)` lesen sie neu (falsche Partner).
- **Ohne Aufräumen** kommt das Maul ohne Spalt nicht zur Ruhe (602 Runden). Nie ohne `nadelnZusammenlegen` und `nachVerdichten`.
- **Falten messen:** `gefaltetWo` (steiler als 120° gegen einen Nachbarn ohne harte Linie dazwischen), nicht `falten().umgeklappt`
  (zählt das Dreieck der Wand an der Rachenlinie, das gewollt auf der anderen Wand liegt). Die Form selbst hat fern vom Maul 24
  solche Dreiecke (ein scharfer Kiel an der Mitte): immer gegen die Form von vorher lesen.
- **Welcher Kiefer außen:** die Lippe, die über die Kanten des Netzes zuerst erreicht wird (`kieferSeiten`), nicht die Lage gegen
  die gezeichnete Linie (an einer verzogenen Lippe sagt die nichts).
- **Kontrolle 3** (`KONTROLLE3=1`): `loopAusVorhang` und `loopEinsetzen` legen eine Linie längs der Maullinie quer über die Form,
  hart nur vom Mundwinkel nach vorn (Kante je Punkt). So lässt sich trennen, was vom Maul kommt und was von der harten Kante.
- `heute()` in der Probe rechnet über die ganze Haut (nicht auf der Hälfte) und gilt als ruhig unter 0,02 je Runde; die Form
  selbst zittert an einer Stelle fern vom Maul mit 0,02 bis 0,06 je Runde (`GEDULD=300`).

## Bilder neu machen

```bash
# aus apps/editor; das Fenster 5205 muss laufen
node scripts/ozzy/maul-studie-bilder.mjs <ordner>     # 25 Aufnahmen und zahlen.json, rund 90 s
node scripts/ozzy/maul-studie-bogen.mjs <ordner>      # setzt die zwei Bildblätter nach docs/progress/ozzy/
```

## Geprüft

Typen (`pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`) und Lint (`eslint src/maulstudie`) sauber. Tests gibt es für
die Studie keine. An Ozzy ist nichts geändert, seine Proben habe ich nicht laufen lassen. Die Proben P1 und P2: Lint sauber
(`eslint scripts/pruefen/form-maul-echt.ts`); sie läuft mit `vite-node` und gehört zu keinem Typenlauf.
