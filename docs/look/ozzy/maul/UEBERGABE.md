# Übergabe: Maul, Zähne, Zunge (Stand 20.11.2026)

**Wo:** Zweig `claude/ozzy-maul` (vom Paint-Zweig `claude/reverent-feynman-1efdd3`, Stand `49f1557c`; er enthält `claude/ozzy`, die
Objekte und den Paint-Modus). Arbeitsbaum `.claude/worktrees/ozzy`, Fenster 5205 (Eintrag `ozzy`). `claude/ozzy` selbst steht
weiter auf `6bef9f17`: zusammengeführt ist nichts, das bleibt Florians Wort.

**Was es gibt:** ein Konzept, eine Studie, zwei Proben im Kern und **seit dem 20.11. in Ozzy die erste Scheibe von Etappe 1 (das
Maul aus einer Linie als echte Form) und Etappe 2 (die Kiefer als Tropfen, „Fressen“, der Blick ins Maul)**, siehe unten „Etappe 1
in Ozzy“ und „Etappe 2 in Ozzy“. **Seit dem 20.11. auch Etappe 3 (Lippen trennen, Über- und Unterbiss; die Probe P3 hält) und
Etappe 4 (die Ebene „Maul“ im Paint-Modus; die Probe P4 hält), dazu zwei Scheiben von Etappe 5 (Zähne sprießen und gehen mit den
Kiefern mit; die Linse stellt sie). Als Nächstes, auf Florians Wort: der Rest von Etappe 5 (Zähne wählen und rücken) oder
Etappe 6 (Zunge).** Offenes steht
nummeriert in
[`docs/plans/2026-11-20-ozzy-maul-was-bleibt.md`](../../../plans/2026-11-20-ozzy-maul-was-bleibt.md): Florian will am Ende einen
großen Feinschlifflauf, keine einzelnen Vergleiche und Tests („Du musst mir nicht immer Vergleiche und Tests zeigen“).

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
einem: ob ich mit Etappe 1 in Ozzy beginne** (Plan, 12.10). Sein Wort (20.11.): „Starte Etappe 1.“

## Etappe 1 in Ozzy (erste Scheibe, 20.11.)

**Was geht:** in der Seite (Taste 1) mit P eine Linie vom Leeren vor der Form bis zum Mundwinkel in ihr, ↩. Sie bleibt stehen und
bekommt den Tropfen „Maul“. Der Tropfen macht daraus das Maul (zu gerechnet; die Lippe ein Ring mit Kante und Zwillingen, gewählt;
im Maul die Mitte von Gaumen und Boden und die Rachenlinie). ⌘Z nimmt es zurück, Esc verwirft die wartende Linie. Ein gezogener
Punkt der Lippe nimmt seinen Zwilling mit. **Was fehlt:** Öffnen, „Lippen trennen“, Ebene „Maul“, Zähne, Zunge (die Liste oben).

**Wo:**

- `src/form/maulEcht.ts`: der Baustein ohne Fenster (`maulSchneidenMit`, `kieferSeiten`, `MAUL_HAAR`), Tests `maulEcht.test.ts`.
- `src/form/werk.ts`: `maulSchneiden` (ein Schritt für ⌘Z, gebaut wie `objektVerbinden`), `istMaulEcht`, `ueberDasMaul` (in
  `kreuzungenSuchen`), `maulFalte` und `kreuztSich` (für `linienGekreuzt`).
- `src/ozzy/werkBlatt.ts`: der wartende Strich (`maulStrich`, `maulStrichOrt`, `maulStrichWeg`; in `fertig()` der Fall „ein Ende
  im Leeren, eines in der Form“).
- `src/ozzy/main.ts`: der Tropfen am Strich (`maulUiZeigen`, der Klick auf `#maul-tropfen`), Esc; Haken `maulStrich`,
  `koerperNetz`, in `werkLinienDaten` die Felder `maulLinie` und `maulEcht`.
- Probe: `GPU=1 [FRISCH=1] node scripts/pruefen/ozzy-maul-fenster.mjs [ordner]` (aus `apps/editor`).

**Was man wissen muss** (jede Zeile hat einmal Stunden gekostet):

- **Die Lippe ist ein Maul aus einer Linie im Sinn des Kerns** (`Loop.maulLinie`), mit dem Winkel `MAUL_HAAR` (0,03°). Daran
  erkennt das Werk das neue Maul (`istMaulEcht`), und darum zieht ein Punkt seinen Zwilling mit (der Code vom 14.11.).
- **Der Haarspalt** hält Punkte auseinander, die sonst am selben Ort lägen. Ohne ihn läse der Kern die Spiegelpaare falsch, sobald
  er sie aus den Lagen neu liest (`kantenTeilen`, das Laden). Der Test `maulEcht.test.ts` zählt Punkte am selben Ort.
- **Nach dem Schnitt muss Ozzy die Haut ganz neu anlegen** (`werkHaut.ganzNeu()`, `raumRechnen`, wie nach einem Abziehen).
- **Eine harte Linie, die man genau von ihrem Ende her sieht** (die Rachenlinie in der Seite), hat im Bild die Länge null. Ihre
  Breite wurde 0/0, und damit fiel die Anzeige **aller** Linien aus (`werkBlatt.abtasten`, behoben).
- **Die Kreuzungssuche des Werks ist rein geometrisch.** Die zwei Stücke einer geschnittenen Linie enden am selben Ort (eines an
  jeder Lippe); sie hielt das nach jedem Schritt für eine neue Kreuzung, die Linien bekamen immer mehr Punkte, an der Lippe
  schlugen bis 60 Dreiecke um. Jetzt gilt: Linien, die an derselben Stelle an Ober- und Unterlippe hängen, kreuzen sich dort nicht.
- **„Linie kreuzt sich selbst“:** Die zusammengeklappte Lippe, die Mitte von Gaumen und Boden und die Mitte der Form (ihre Enden
  berühren sich vorn) galten als verdreht, und das Werk räumte nach einem Zug nicht mehr auf. Geprüft wird jetzt je Hälfte.
- **P beginnt eine Abzweigung, wenn der erste Klick dicht am Umriss liegt** (es fängt die Linie der Mitte). Die Maullinie muss
  ein Stück vor der Form beginnen (die Probe: rund 100 Einheiten).
- **Das Aufräumen des Fensters nachstellen:** den Stand gleich nach dem Schnitt über `__ozzy.standGepackt()` holen, dann
  `form-aufraeumen.ts <datei>`. Im Kern war das Aufräumen sauber, im Fenster nicht: So fiel die Kreuzungssuche auf.

## Etappe 2 in Ozzy: die Kiefer (20.11.)

**Was es gibt:** Mit dem Maul die Pose „Fressen“ (oben 8°, unten 34°), an jeder Kieferspitze ein Tropfen an einer Haarlinie zum
Mundwinkel (rosa oben, blau unten). Ziehen dreht den Kiefer; unter 2° rastet er zu; Anschlag 70° unten, 45° oben. In der Grundform
öffnet Halten das Maul für einen Blick. Nach dem Schneiden zeigt es sich einmal. Plan, Abschnitt 12.12.

**Wo:**

- `src/form/maulEcht.ts`, Abschnitt „Etappe 2“: `maulLage` (Scharnier, Lippe, Spitze aus der Lippe gelesen), `maulEchtAmLoop`
  (das Maul in der Gestalt des Maulschnitts im Kern, dazu je Punkt Winkel um das Scharnier, Abstand und Kiefer), `kieferWinkel`
  (Drehwinkel je Punkt für einen Stand der Knochen), `kieferTropfenRuhe`, `KIEFER_MAX`, `FRESSEN_ANFANG`. Test in
  `maulEcht.test.ts` („die Kiefer“).
- `src/form/werk.ts`: `maulSchneiden` setzt `G.maul` und die Pose; `maulIstGeformt` und `maulSchnitt` kennen `istMaulEcht`;
  `knochenJetzt` nimmt `kieferWinkel`; neu `maulBlick`, `maulBlickSetzen`, `anzeigeDreht`, `kieferStellen`, `kieferKnochen`,
  `stueckeGezeigtBei`. `alsAnzeige` dreht jetzt auch in der Grundform, solange `maulBlick` > 0.
- `src/ozzy/main.ts`: Abschnitt „Die Kiefer als Tropfen“ (`kieferUiZeigen` je Bild, der Zug an einem Tropfen, `kieferSchau`),
  Haken `__ozzy.kiefer()`. `ozzy.html` und `ozzy.css`: `.kiefer-tropfen`, `.kiefer-knochen`.
- `src/ozzy/werkBlatt.ts`: `abtasten` und `verdeckteProben` nehmen im Übergang den genauen Ort (`werk.stueckeGezeigtBei`).
- Probe: `GPU=1 [FRISCH=1] [DIAG=1] node scripts/pruefen/ozzy-maul-fenster.mjs [ordner]`, Kriterien 8 bis 12.

**Was man wissen muss:**

1. **Das Feld der Kiefer hängt am Winkel.** Die Gewichte im Maulschnitt (`gewicht`, `gewichtOben`) gelten für kleine Winkel; den
   Winkel je Punkt rechnet `kieferWinkel` (die Ausläufe werden mit dem Winkel breiter: quer bleiben mindestens 30 % der Haut,
   Scherung höchstens 1,25). Wer backt oder sonst Gewichte braucht, nimmt nicht einfach `gewicht` mal Winkel.
2. **Falten zählen:** Ein Dreieck ist gefaltet, wenn seine Normale nach dem Drehen von der mitgedrehten Normale der Ruhe wegzeigt
   (Haken `kiefer().gefaltet`). Der Umlaufsinn in der Seite allein (`gekippt`) schlägt auch an, wo die Haut am Umriss auf der Kante
   steht (Bauch- und Rückenlinie); das sind keine Falten.
3. **Der Zug zählt den Winkel des Zeigers um das Scharnier,** vom Drücken an, nicht seinen Ort: In der Grundform öffnet das Maul
   erst beim Halten, der Tropfen wandert unter dem Zeiger weg. Der Winkel wird auf der Spiegelebene gelesen (`zeigerAufMitte`);
   läuft der Blick fast längs der Ebene, zählt der Weg nach oben und unten.
4. **Der Blick ins Maul ist nur Anzeige:** `werk.maulBlick` (0 … 1) mal die Winkel der Pose. Gerechnet, gegriffen und bearbeitet
   wird weiter in der geschlossenen Grundform. `werkBlatt.signatur` gilt nicht, solange `werk.anzeigeDreht()`.
5. **Die Rachenlinie** wird über die Linien gefunden (sie hängt am Mundwinkel, ihre übrigen Punkte liegen in der Tasche), nicht
   mehr nur über ihre Lage: So gilt sie auch, wenn ihre Mitte nach hinten gezogen ist (nicht ausprobiert).
6. **Mit `G.maul` sperrt das Werk** Spiegel aus, den Schnitt an der Mitte und Verschmelzen/Abziehen (für jedes Maul).
7. Eine Probe, die den Blick wechselt (Raum, Zoom), liest die Orte der Tropfen danach neu (`kiefer()`).

## Etappe 3 in Ozzy: die Lippen (20.11.)

**Was es gibt:** „Lippen trennen“ und „Lippen verbinden“ (der Tropfen `#maul-tropfen`, hinter dem Mundwinkel, solange ein Punkt
der Lippe gewählt ist). Getrennt hat jede Lippe ihre Punkte; Über- und Unterbiss und Lücken auch geschlossen. Plan, 12.13.

**Wo:** `werk.ts`: `lippenTrennen`, `lippenVerbinden`, `lippenGetrennt`, `maulLippe`, `lippeGewaehlt`, `lippeNachZeiger`,
`maulSeitenMerken`; `MaulZustand` trägt `echt` und `ersteUnten` (auch in `ablage.ts`). `maulEcht.ts`: `maulLage` gibt je Kiefer
eine `KieferLage` (`oben`, `unten`), `kieferSeiten` und `maulEchtAmLoop` nehmen die feste Zuordnung. `werkBlatt.ziehen` ruft
`lippeNachZeiger` beim Beginn eines Zugs. `main.ts`: der Tropfen in `maulUiZeigen`, `kieferJetzt` (Tropfen mit Abstand im Bild),
Haken `__ozzy.lippen()`. Probe: `ozzy-maul-fenster.mjs`, Kriterien 13 bis 16; Test „getrennte Lippen“ in `maulEcht.test.ts`.

**Was man wissen muss:**

1. **Getrennt heißt: Die Lippe trägt kein `maulLinie` mehr.** Sie ist dann ein Ring wie jeder andere (kein Zwilling irgendwo im
   Werk). Dass sie das Maul als echte Form ist, steht am Maul (`G.maul.echt`); `istMaulEcht(l)` fragt beides.
2. **Welche Hälfte die Unterlippe ist, steht am Maul (`ersteUnten`),** gelesen beim Schneiden (und beim Laden älterer Stände,
   solange die Lippen aufeinanderliegen). Nie neu aus der Lage lesen, wenn die Lippen getrennt sind: An der Kugel kippte es nach
   dem Kürzen der Unterlippe (Test).
3. **Zwei Punkte am selben Ort:** Wo getrennte Lippen aufeinanderliegen, wählt `lippeNachZeiger` beim Beginn des Zugs den Punkt
   der Lippe, auf deren Seite der Zeiger liegt. Das Ziel des Verhaltens kann dabei ein Punkt einer anderen Linie sein, die dort
   an der Lippe hängt (der Anker einer Kreuzung nennt seinen ersten Punkt): Gesucht wird über den Ort.
4. **Tropfen über Punkten:** Ein Knopf über der Zeichenfläche fängt den Griff ab. Der Tropfen „Lippen verbinden“ hing erst unter
   dem Mundwinkel, genau über der Unterlippe (die Probe traf ihn, und die Lippen waren wieder verbunden); die Kiefertropfen saßen
   bei kleinem Bild auf der Lippenspitze. Wer einen neuen Tropfen an die Form hängt, hält Abstand zu dem, was man dort greift.
5. **Der Zeiger klebt:** Das Verhalten der Linien behält sein Ziel, bis ein neues deutlich näher ist. Eine Probe, die zwei dicht
   beieinanderliegende Punkte nacheinander greift, führt den Zeiger dazwischen weit weg.
6. **Die Zählung des Werks (`umgeschlagen`) schlägt an getrennten Lippen an** (4 bis 6 an der Lippe und in der Tasche): gegen
   den Ort prüfen (Kriterium 15), nicht gegen null.

## Etappe 4 in Ozzy: die Ebene „Maul“ (20.11.)

**Was es gibt:** eine Ebene „Maul“ im Paint-Modus, die mit dem Maul kommt und geht: die Zahnfleischlinie (eine Farblinie) und zwei
Füllungen (Zahnfleisch, Inneres). Plan, 12.14.

**Wo:** `src/ozzy/farbe/maulEbene.ts` (`maulEbeneBauen`: Abstand von der Lippe in der Tasche, Höhenlinie → `linienAusTreffern`,
Saaten; `istMaulEbene`), `farbwerk.ts` (`maulEbenePflegen`, `maulGebiet`, `maulTascheVon`), `flaechen.ts` (`flaechenRechnen` mit
`gebiet`), `werk.ts` (`maulTasche`), `main.ts` (`maulEbenePflegen` je Bild vor `farbWerk.schritt`, `maulEbeneAktiv`,
`farbeMoeglich`). Probe: `GPU=1 node scripts/pruefen/ozzy-maul-farbe-fenster.mjs [ordner]` (F1 bis F7), dazu 8b und 17 in
`ozzy-maul-fenster.mjs`; Test „die Ebene Maul“ in `maulEcht.test.ts`.

**Was man wissen muss:**

1. **Die Ebene ist abgeleitet, ihr Inhalt nicht.** Fehlt sie und die Form hat ein Maul (Grundform, Werk in Ruhe), legt Ozzy sie an;
   hat die Form kein Maul mehr, geht sie. Beides ohne Schritt für ⌘Z. Was auf ihr gemalt wird, sind Schritte wie überall.
2. **Die Füllungen dieser Ebene bleiben in der Tasche** (`gebiet`: je Dreieck 1, wenn alle drei Ecken zu Tasche oder Lippe
   gehören; über den Rand des Gebiets wird nie vereint). Eine Farblinie als Grenze knapp hinter der Lippe hielt nicht: Nach den
   Zügen von Etappe 3 lief die Füllung über die Form. Vermutlich (nicht nachgesehen): Beim Netzwechsel wird ein Ort, dessen
   Dreieck es nicht mehr gibt, am nächsten Ort der neuen Haut gesucht, und der lag außen.
3. **Farblinien laufen nie längs einer Kante des Netzes** (`RAND`): Auf der Lippe selbst kann keine liegen.
4. **Die Bemalung dreht mit der Anzeige von selbst mit:** Sie sitzt an Dreiecken, gezeichnet wird auf dem gezeigten Netz
   (`werkHaut.netz`), getroffen wird das gezeigte Netz (`farbUnter`, `farbFuellenBei`).
5. **`farbeMoeglich` gilt am Maul als echte Form auch in der Pose** (vorher in keiner). In der Pose ist `werk.haut` ein anderes
   Objekt mit denselben Dreiecken: Das Farbwerk leitet dann einmal neu ab, die Orte bleiben.
6. **Zwei Kriterien älterer Paint-Proben fielen bei hoher Last des Rechners durch** (`ozzy-farbe-fenster.mjs` 2,
   `ozzy-farbe-ebenen-fenster.mjs` 68; beide hängen an der Uhr). Nicht gegen den Stand davor verglichen.

## Etappe 5 in Ozzy, erste Scheibe: die Zähne (20.11.)

**Was es gibt:** der Tropfen „Zähne“ unter der Leiste; zwei Zahnreihen, die sprießen, mit den Kiefern mitgehen und zu im Maul
stecken. Plan, 12.15. **Was fehlt:** die Linse (Formenring, Drehregler), Zähne wählen und rücken, ein Zahn ohne Spiegelbild, Zähne
außen, die Farbe.

**Wo:** `src/ozzy/zaehne.ts` (`zahnPlaetze`: die Plätze aus der Tasche; `zaehneNetz`: das Netz an der gezeigten Haut;
`ZAEHNE_ANFANG`), `werk.ts` (`MaulZustand.zaehne`, `ZahnReihe`, `zaehneSetzen`; `maulTasche` gibt je Punkt den Kiefer und das
Scharnier), `farbe/maulEbene.ts` (`taschenFeld`, `hoehenlinie`, `zahnfleischBreit` sind jetzt für beide da), `main.ts`
(„Die Zähne“: `zaehnePlaetzeJetzt`, `zaehneRechnen` nach `werkHaut.rechnen`, das Sprießen; in `ruheZeigen` steht ihr Netz bei
den ruhenden Netzen), `ozzy.html` (`#zaehne-tropfen`). Zahnformen: `src/maulstudie/zahn.ts`. Probe:
`GPU=1 node scripts/pruefen/ozzy-maul-zaehne-fenster.mjs [ordner]`; Test „die Zähne“; Haken `__ozzy.zaehne()`.

**Was man wissen muss:**

1. **Die Zähne sind Werte am Maul** (`G.maul.zaehne`): mit ⌘Z und im Stand der Form (`standJetzt`, `standAnwenden`), also auch
   in der Datei (Sichern und Laden im Fenster ungeprüft). Plätze und Netz sind abgeleitet: Die Plätze
   werden nach jedem Schritt, jedem Netzwechsel und jeder Änderung der Werte neu gelesen, das Netz nach jedem Rechnen der Haut.
2. **Ein Zahn hängt an zwei Orten der Wand** (Hälfte z ≥ 0) und einem Anteil dazwischen; sein Spiegelbild wird gespiegelt
   gezeichnet (z und Umlaufsinn). Die Normale der Wand zeigt aus der Form, in der Tasche also ins Maul: Das ist seine Achse.
3. **Das Netz der Zähne steht bei den ruhenden Netzen** (`ruheZeigen`, `ruheNetzGemerkt`): So zeigt es jedes Material, auch die
   Seifenhaut. Es ist je Stand ein neues Objekt; wer Netze zusammensetzt, erkennt den Wechsel daran.
4. **Zu hat jeder Zahn die Länge null** (`spalt(r)` = 2 · r · sin(Winkel / 2)); das Netz behält dabei seine Punkte und Dreiecke.
5. **`kieferSeiten` nennt jetzt auch die Punkte der Rachenlinie und den Mundwinkel:** Sie gehören keinem Kiefer allein
   (`maulTasche().kiefer` ist dort 0); wer eine Wand der Tasche meint, fragt die Punkte, die einem Kiefer gehören.
6. **Die Werte am Anfang (`ZAEHNE_ANFANG`) greifen ineinander:** unten ein Zahn weniger, und die untere Reihe reicht einen
   halben Zahn weniger weit (`bis` 0,788 = 0,86 · 11 / 12). So haben beide Reihen dieselbe Teilung, und die unteren Zähne stehen
   in den Lücken der oberen (der Test prüft es). Wer die Linse einbaut, hält das beim Stellen der Anzahl.
7. **Ein Zahn hat 640 Dreiecke** (die Vorlage der Studie, unverändert): 23 Zähne sind 14 720. Fürs Backen gröber nehmen.

## Etappe 5 in Ozzy, zweite Scheibe: die Linse (20.11.)

**Was es gibt:** Der Tropfen „Zähne“ bleibt unter der Leiste und öffnet und schließt die Linse oben rechts (unter der Tafel
„Fressen“): Formenring (acht Vorlagen, weicher Wechsel), Drehregler mit den Perlen `#`, `G`, `N`, `V`, `S`, zwei Perlen für die
Reihen (rosa oben, blau unten: antippen = nur diese Reihe, noch einmal = beide). Solange sie offen ist, steht das Maul offen.
Plan, 12.16. **Was fehlt:** Zähne im Bild antippen und rücken, ein Zahn ohne Spiegelbild, Zähne außen, Farbe, die Perlen
Biegung und Wurzel.

**Wo:** `src/maulstudie/linse.ts` und `linse.css` (die Linse selbst; auch die Studie benutzt sie), `src/ozzy/main.ts` („Die Linse
der Zähne“: `linseOeffnen`, `linseSchliessen`, `linseSchritt` je Bild, `zaehneStellen`, `zahnPerlen`, `linseLegen`),
`src/ozzy/zaehne.ts` (`zaehnePaar`, `sitzGrenzen`, `formNetzGemischt`), `ozzy.html` (`#linse`), `ozzy.css` (`#linse`, der
gedrückte Tropfen). Probe: `GPU=1 node scripts/pruefen/ozzy-maul-zaehne-fenster.mjs [ordner]` (Z1 bis Z6, L1 bis L7); Haken
`__ozzy.zaehne().linse`.

**Was man wissen muss:**

1. **Die Linse gehört Studie und Ozzy.** Was Ozzy braucht, ist dort wahlfrei (`LinsenZiele.reihen`, die Größe am Anfang). Nach
   Änderungen `maul.html` einmal laden und die Linse öffnen (`__maul.zaehne(true); __maul.waehlen('oben')`).
2. **Schritte für ⌘Z zählt der Griff, nicht die Zeit:** `zaehneStellen(was, …)` legt einen an, wenn es ein neuer Griff ist
   (`Linse.griffNr`: einmal Greifen und Drehen samt Nachlauf, oder ein Zug am Rad der Maus), eine andere Sache, oder wenn
   dazwischen etwas anderes geschah. (Erst hatte ich 0,9 s als Grenze: Wer langsam dreht, bekam mehrere Schritte.)
3. **Die Linse schließt nur, wenn es nichts mehr zu stellen gibt** (kein Maul, zurück auf dem Blatt, Paint-Modus, Vier
   Ansichten, Objekte). `bearbeitenAn` ist beim Wechsel der Ansicht kurz falsch: Daran darf sie nicht hängen.
4. **Lagen neben einer Tafel am Layout messen** (`offsetTop`, `offsetHeight`), nicht an ihrem Bild: Die Tafel „Fressen“ fliegt
   beim Erscheinen aus dem Tropfen „Maul“ ein (`fressenQuellen`), ihr `getBoundingClientRect` steht dann irgendwo im Bild.
5. **Das Feld `#linse` ist rund ausgeschnitten** (`clip-path`): Die Ecken gehören der Bühne. Alles, was die Linse zeichnet, muss
   im Kreis liegen (`rand` in `Linse.bauen`).
6. **In der Grundform hält die Linse den Blick ins Maul offen** (`kieferUiZeigen`). Wird an der Form gezogen, ist die Anzeige zu
   (`werk.anzeigeDreht`), die Zähne haben dann die Länge null (`zaehneRechnen`).
7. **Das Feld der Tasche** (`taschenFeld`) wird je Netz und Schritt einmal gerechnet (`zaehneFeldJetzt`), nicht je gestelltem Wert.
8. **Die Probe:** 60° sind rechnerisch genau vier Rasten, sie dreht 62°. Am Rad der Maus zählt Playwright bei zwei Gerätepunkten
   je CSS-Pixel den halben Weg (`mausRad`). Ein Esc zu viel lässt die Luft ab (zurück aufs Blatt).

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

Etappe 1 (20.11.): Typen von Editor und Kern, Lint der geänderten Dateien, `npx vitest run src/form/ src/ozzy/` (38 und 63
Tests), im Fenster `ozzy-maul-fenster.mjs` (an „teat firefish“ und mit `FRISCH=1`) und `ozzy-p-schnitt-fenster.mjs` (P quer über
die Form geht wie zuvor). Nicht gelaufen: die übrigen Fensterproben von Ozzy (`ozzy-alle.mjs`).
