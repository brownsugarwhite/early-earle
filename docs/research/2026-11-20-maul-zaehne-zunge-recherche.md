# Maul, Zähne, Zunge: Recherche (20.11.2026)

Für das Konzept [`docs/plans/2026-11-20-ozzy-maul-zaehne-zunge.md`](../plans/2026-11-20-ozzy-maul-zaehne-zunge.md). Zwei Teile: was
im Projekt schon erforscht und gebaut wurde, und was andere Werkzeuge tun. **Zur Güte der Quellen:** Die Stellen aus dem Netz habe
ich über die Suche gelesen (ihre Auszüge und Zusammenfassungen), nicht jede Seite ganz. Wo eine Angabe nur aus einer Quelle stammt
oder ich sie aus dem Gedächtnis nenne, steht es dabei.

## 1. Was im Projekt schon da ist

| Wann | Was | Was das Konzept davon nimmt |
| --- | --- | --- |
| 12.10. | [`2026-10-12-maul-kiefer-zaehne-augen.md`](2026-10-12-maul-kiefer-zaehne-augen.md): Florians Ablauf (Körper, Maullinie, Kiefer gleich oder getrennt, offen, Zähne, Rig), Maul-Rigs in Film und Spiel (Maultasche, klebrige Lippen, Kiefer als Knochen plus Korrektur), Spore, Zeichnen in 3D, Zahn-Versuch | **Zähne:** Platz auf dem Zahnfleisch als feste Stelle (nicht Bogenlänge), Rahmen (längs, zum Gegenkiefer, nach innen), Form aus Rundheit, Schärfe, Biegung, „außen“ für Hauer, „geschlossen klein, offen groß“. **Backen:** Blendshape vor dem Drehen speichern, höchstens drei mit Normalen, ein Wert treibt alles. **Mundwinkel:** ein Punkt reicht bei 90° bis 120° nicht (Knochen mit halbem Winkel) |
| 15.10. | Zahn-Tafel im Käfig-Editor (`docs/progress/editor/zaehne-m43-tafel-2026-10-15.jpg`): Anzahl je Kiefer, Öffnung, Auswahl, Werte für zu und offen, Länge, Schärfe, Neigung, „mehr“ | Florian, 20.11.: „ganz ok“, aber „ohne die vielen Regler“. Daraus: ein Drehregler mit Perlen statt neun Reglern |
| 15.10. | Florians Urteile: Zähne dürfen sich überschneiden; ein Zahn ganz ohne Spitze („süße Blobzähne“); geschlossen auch unsichtbar; kleine Mäuler sollen offen sehr groß werden | keine Kollisionswarnung; Vorlage „Blob“; Pose = Knochen plus Versatz der Lippenpunkte |
| 13.11. | Sitzung 4, [`docs/UEBERGABE.md`](../UEBERGABE.md) 7.7 bis 7.15: eine eingeschweißte Tasche kommt in acht Fassungen nicht zur Ruhe; in Schritten geformt hält sie; „durchgestanzt“; Kante mit eigenem Winkel; Kieferknochen am geformten Maul; das Maul aus einer Linie (Zwilling, 20° offen gerechnet) | **Die Lehre:** Die Rechnung hält eine Tasche nur, wenn Linien sie fassen; zusammengeklappt hat sie keine Form. **Das Wort:** durchgestanzt |
| 14.11. | 7.16: Florian hält an. Was nicht hielt: Linien, die das Maul kreuzen (Paarung verloren, 2,6 Einheiten Spalt), Mittellinie ohne Punkte, feines Netz, Naht zu 3° bis 5° geknickt. Acht Fragen für die Maul-Sitzung | Der Grund, die Tasche aus der gerechneten Haut herauszunehmen. Die acht Fragen sind im Konzept, Abschnitt 2, beantwortet |
| 14.11. | Pose rechnet in ihrer Ruhe und geht mit der Grundform mit (Etappe 2 und 3): `pose.delta`, `pose.linien` | Der Weg für „in der Pose wie in der Grundform“ steht; neu kommen Lippe, Zähne, Zunge dazu |
| 18./19.11. | Objekte und Verbund: Verschmelzen und Abziehen als Zustand, abgeleitet aus den gezeigten Häuten (`verbundRechnen.ts`, `manifold-3d`), Naht hart oder rund | **Das Muster** (ableiten statt umbauen) und die Bibliothek für den Schnitt der Studie |
| 19.11. | Paint-Modus: Farblinien als Orte auf der Haut, P direkt auf der Form, Mitte, weiche Kanten, Ebenen, Ebenen-Ansicht | **Die Lippenlinie ist eine Linie dieser Art.** Das Maul als Ebene; Zahnfleisch als Farblinie; aufgeklappt malen in der Ebenen-Ansicht |
| | Florians Blätter `docs/look/editor/05-maul-detail.png`, `06-rex-mit-maul.png`; Bilder `docs/look/wesen-refs/bild03`, `bild07`, `bild14` | Farben der Lippe (zu türkis, oben rosa, unten blau, Mundwinkel schwarz); Über- und Unterbiss als zwei Linien; Zähne über der geschlossenen Lippe; Innen dunkelrot, Zunge heller |

## 2. Wie andere ein Maul machen

- **Spore (2008):** Mäuler sind fertige Teile („Rigblocks“) mit Gelenken oder Blendshapes und Griffen zum Verformen; alle Mäuler
  hören auf denselben Kanal „auf/zu“. Robust und sofort animiert, aber ein Maul ist nie Teil der Haut. (Recherche vom 12.10., B2;
  heute nichts Neues dazu gefunden.) [Rigblocks](https://janeng.com/?p=104)
- **Teddy (1999):** Ein Strich, der außerhalb beginnt und außerhalb endet, schneidet ab, was auf einer Seite liegt („Biss“); eine
  Höhle entsteht aus einem geschlossenen Strich und einem zweiten, der den Umriss der Vertiefung zeigt. Löcher gehen nicht. Das ist
  der nächste Verwandte von „eine Linie wird ein Maul“: Unser Strich endet innen (am Mundwinkel) statt außen.
  [Teddy](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf),
  [ShapeShop](https://cspages.ucalgary.ca/~blob/webpapers/05/shapeshop_hires.pdf)
- **Womp („Liquid 3D“) und Spline:** Formen verschmelzen, wenn man sie zusammenschiebt, und ein abgezogenes Teil hinterlässt eine
  weiche Kante; die Breite der Rundung ist ein Wert. Dahinter steht das weiche Minimum über Abstandsfelder. Das ist dieselbe Idee
  wie Verbund und Naht in Ozzy (rund oder Kante, Breite) und passt zu „liquid drop“; für die Lippe heißt das: K rundet die Kante
  des Schnitts. [Womp](https://womp.com/solutions/easy-3d/),
  [80.lv](https://80.lv/articles/womp-creating-goopy-3d-models-in-your-browser),
  [weiches Minimum](https://iquilezles.org/articles/smin), [Spline](https://docs.spline.design/designing-in-3-d/shape-blend)
- **Film- und Spiel-Rigs:** Maultasche als eigene Innenhaut hinter den Lippen, Zähne und Zunge als eigene, starre Netze am
  Kieferknochen, klebrige Lippen, die vom Mundwinkel her wie ein Reißverschluss aufgehen. (Recherche vom 12.10., B1.) Das Konzept
  hält sich daran: Wände, Zähne und Zunge hängen starr an ihrem Kiefer.

## 3. Zähne

- **ZBrush:** Zähne setzt man mit Einsetz-Pinseln; ein verbreiteter freier Satz bringt zwei Zahnfleische, 36 Zähne und eine Zunge
  mit, und ein Kurven-Pinsel reiht Teile längs eines Strichs auf und verjüngt sie. Abstände und einzelne Zähne stellt man danach von
  Hand nach. Was wir übernehmen: Vorlagen statt Regler, Reihe längs einer Linie, Verlauf nach hinten.
  [Teeth & Gums](https://flippednormals.com/product/free-teeth-gums-insert-brush-4542),
  [Curve Insert](https://pixologic.com/zclassroom/lesson/curve-insert-mesh-tri-parts)
- **Infinigen** (Recherche vom 12.10.): Kiefer mit Reglern für Zahngröße, Dichte, Schiefe und Zunge. Dieselben Größen stehen bei
  uns als Perlen am Drehregler.
- **Eigene Probe:** Acht Vorlagen aus neun Zahlen (Länge, Breite, Tiefe, Spitze, Querschnitt, Biegung, Höcker, Wurzel, Länge der
  Wurzel) reichen für spitz, abgerundet, gebogen und viereckig mit Höckern (`zahn.ts`, Bildblatt 2). Was sie nicht können: einen
  Zahn, der in keine dieser Zahlen passt. Dafür ist die spätere Etappe „ein Zahn als kleine Form“ da.

## 4. Der Drehregler und die Haptik

- **Drehknöpfe am Bildschirm:** Mit der Maus sind Drehungen mühsam; manche Knöpfe erlauben darum verdeckt auch ein gerades Ziehen,
  was kaum jemand findet und dem Kreisen in die Quere kommen kann. Ein Schieber ist die übliche Wahl für einen Wert mit festem
  Bereich; ein Knopf lohnt, wo es ums Gefühl geht. ([NN/g](https://www.nngroup.com/articles/sliders-knobs/)) Eine freie
  Knopf-Bibliothek löst es mit Rasten für benannte Werte, Ziehen, Mausrad und Pfeiltasten und einer Taste für fein
  ([egui-elegance](https://docs.rs/egui-elegance/0.3.0/src/elegance/knob.rs.html)). Eine Studie zu Knopf und Schieber hält fest,
  dass ohne Haptik das Bedienen ohne Hinsehen leidet ([KnobSlider](https://core.ac.uk/download/151188477.pdf)).
- **Was daraus für Ozzy folgt:** Das Rad wird im Kreis gezogen (mit Finger und Stift ist das natürlich), dazu dreht das Mausrad.
  Der Winkel zählt von dort, wo man anfasst (nichts springt). Rasten sieht und hört man: der Tropfen an der Marke, das Ticken.
- **Haptik im Browser, Stand November 2026:**
  - Safari auf dem iPhone kennt die Vibration der Webseiten nicht. Ein Umweg: Seit Safari 17.4 gibt ein Schalter
    (`<input type="checkbox" switch>`) beim Umlegen den kleinen Schlag des Systems; Bibliotheken lösen ihn aus dem Skript aus.
    ([WebKit](https://webkit.org/?p=15054), [ios-haptics](https://unpkg.com/ios-haptics@3.1.1/README.md),
    [Beschreibung](https://azukiazusa.dev/blog/ios-safari-web-haptics.md)) Die Bibliothek schreibt selbst, der Umweg gehe nur von
    iOS 17.4 bis 26.4 und sei mit 26.5 versperrt. **Das habe ich aus keiner zweiten Quelle bestätigt.**
  - **Das iPad hat keinen Haptik-Motor.** Haptik gibt es dort seit 2024 nur im Apple Pencil Pro und im Trackpad des Magic Keyboard.
    ([Nutrient](https://nutrient.io/blog/haptic-feedback-across-ipad-and-iphone))
  - Die Haptik des Stifts erreichen nur eigene Apps; ein Wunsch, sie Webseiten zu öffnen, liegt bei WebKit
    ([Fehler 296943](https://bugs.webkit.org/show_bug.cgi?id=296943), August 2025). Ob das inzwischen geht, habe ich nicht gefunden.
  - Android kann vibrieren (`navigator.vibrate`); die Studie nutzt es, wo es da ist.
- **Folgerung:** Die „tolle Haptik“ muss aus Bild und Ton kommen. Erst wenn Ozzy eine eigene App wird, kommt die Hand dazu (am
  Stift). Die Studie ist so gebaut, dass man das Rad am Mac und am iPad anfassen kann.

## 5. Runde Felder und Ringe

- **Krita:** Ein rundes Feld am Zeiger mit Ringen darum (Farbverlauf, zuletzt benutzte Farben, ein Ring zum Drehen der
  Leinwand). Das nächste Vorbild für „ein Ring um ein rundes Feld, den man dreht“.
  [Pop-up Palette](https://docs.krita.org/en/reference_manual/popup-palette.html)
- **Kuchenmenüs:** gut mit wenigen Stücken, schlecht mit vielen ([Überblick](https://www.wikiwand.com/en/articles/Pie_menu)). Darum
  hat der Formenring acht Vorlagen und der Drehregler sieben Perlen, nicht mehr.
- **Lupe als Werkzeug** („Magic Lens“, Bier u. a., 1993; aus dem Gedächtnis, nicht neu nachgeschlagen): ein Feld, das zeigt, was
  darunter liegt, anders und größer. Unsere Linse zeigt das gewählte Teil allein und groß.

## 6. Die Zunge

- **Rigs:** Zungen werden als Kette von Knochen längs einer Kurve geführt (Spline-IK), dehnbar, mit Federn für das Nachschwingen.
  ([Blender](https://docs.blender.org/manual/en/dev/animation/constraints/tracking/spline_ik.html),
  [Polycount](https://polycount.com/discussion/comment/2742615),
  [Feder-Kette](https://citrus-software.github.io/mikan-docs/references/mod/rig/jiggle))
- **Im Spiel:** Federknochen wie bei VRM-Figuren (Haare, Stoff) laufen je Bild mit wenigen Rechnungen; zwei bekannte Fallen: ein
  großer Zeitschritt lässt sie aufschaukeln (begrenzen), und beim Skalieren einer Figur müssen ihre Werte mit.
  ([three-vrm](https://cdn.jsdelivr.net/npm/@pixiv/three-vrm-springbone@3.4.4/README.md),
  [VRM](https://vrm.dev/en/api/spring/spring_and_scaling))
- **Weiche Körper im Browser:** Es gibt Rechnungen für ganze weiche Körper aus Tetraedern in three.js
  ([Tetrament](https://github.com/zalo/Tetrament), [THREE-XPBD](https://github.com/markeasting/THREE-XPBD),
  [Müller](https://matthias-research.github.io/pages/challenges/challenges.html)). Für eine Zunge ist das zu viel: Sie ist lang und
  schmal, eine Kette genügt.
- **Eigene Probe:** elf Knoten, je Bild vier Schritte, Feder zum Platz auf dem Unterkiefer (hinten straff, vorn lose), weiche
  Längenbindung (gedehnt zieht sie schwächer zurück als gestaucht), Gaumen und Boden als Grenzen, gedehnt dünner. Das trägt das
  Gefühl „Gummi“ und kostet nichts Messbares (`zunge.ts`, Bildblatt 2). Was offen ist: an Zähnen anstoßen, kleben, die Pose halten.

## 7. Was ich nicht geprüft oder nicht gefunden habe

- Dreams, Nomad Sculpt, MagicaCSG: nichts Belastbares zu Mäulern oder weichem Abziehen gefunden.
- Ob die Haptik des Apple Pencil Pro für Webseiten inzwischen offen ist.
- Ob der Umweg über den Schalter auf dem iPhone 16 mit dem heutigen iOS noch geht: am Gerät probieren.
- Zahnformen aus der Zahnmedizin als Vorlagen (Schneide-, Eck-, Backenzahn, Zahl der Wurzeln): nicht nachgeschlagen; die acht
  Vorlagen sind nach deinen Bildern gewählt.
