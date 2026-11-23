# Ozzy als Suite, Teil 15: Schaden und Zerstörung

Stand 23.11.2026. Ohne Agenten, mit einer gründlichen Suche zu GTA 6. Vorher: Teil 1 bis 14, vor allem Teil 11 (Physik) und Teil 14
(Werkstoffe). Sammelphase: nichts gebaut, nichts getestet.

**Deine Frage (23.11.):** „Wie wird das bei großen Spielen wie GTA 6 gemacht, und wie funktioniert da das Schadensmodell? So was hätte
ich auch gerne.“

## 0 Kurzfassung

1. **Rockstar legt die Technik von GTA 6 nicht offen.** Sichtbar sind echte Dellen in Blechteilen (Trailer); laut einer Technikbesprechung
   von Digital Foundry, die ich nur aus zweiter Hand kenne, ändern die Verformungen das Fahrverhalten. Figuren reagieren seit GTA IV mit
   Euphoria körperlich; GTA 6 steht in dieser Linie, Einzelheiten sind nicht bestätigt.
2. **Große Spiele bauen Schaden in fünf Schichten:** Verformung, lose Teile, Bruch, Oberfläche und Folgen. Echte Weichkörper-Physik für
   ganze Fahrzeuge, wie in BeamNG.drive, ist die teure Ausnahme.
3. **Der eigentliche Trick:** Fast alles ist vorbereitet. Gerechnet wird nur, was sich gerade bewegt, und nur nah an der Kamera; Trümmer
   schlafen ein oder verschwinden.
4. **Für Ozzy passt das gut zu Linien, Werkstoffen und Posen:** Der Werkstoff bestimmt, wie etwas kaputtgeht; Schadensstufen formst du
   von Hand wie Posen (eine Schadens-Leiter); Teile hängen an Nähten, die reißen; Bruchstücke rechnet Ozzy in der Ruhe aus Form und
   Werkstoff vor.
5. **Stil gilt auch hier:** ein Regler von echt (Knautschzone, Splitter) bis Trickfilm (Ziehharmonika, Sterne, springt zurück).

## 1 Was über GTA 6 bekannt ist

- Rockstar hat keine technische Beschreibung der Verformung, der Zerstörung oder der Physik-Engine veröffentlicht.
- Sichtbar: eine Delle in einer hinteren Autotür in einem frühen Trailer; mehr echte Verformung als in GTA V, wo der Schaden weitgehend
  aus Kratzern und vereinfachten Knautschzonen bestand.
- Eine Digital-Foundry-Besprechung, in einem Forum zitiert, beschreibt Verformungen der Blechteile, die das Fahrverhalten direkt ändern.
  Das Original habe ich nicht geprüft.
- Die Engine ist eine Weiterentwicklung von RAGE in der Linie von Red Dead Redemption 2, das Euphoria weiter ausgereizt hat als GTA V.
  Viele Behauptungen im Netz (Versionsnamen, ganz prozedurale Zerstörung) sind unbelegt.

Wie genau Rockstar es macht, lässt sich also nicht sagen. Die Verfahren der Branche sind aber gut bekannt.

## 2 Wie große Spiele Schaden bauen

| Schicht | Wie | Beispiele |
| --- | --- | --- |
| 1 Verformung | Punkte des Netzes werden um den Aufprall nach innen geschoben, nach Kraft und Richtung, mit einer Grenze, wie tief eine Delle werden darf | Rennspiele, GTA |
| 2 Lose Teile | Türen, Hauben und Stoßstangen sind eigene Teile an Gelenken; ab einer Kraft reißt das Gelenk, und das Teil fällt als eigener Körper | GTA, viele Rennspiele |
| 3 Bruch | Wände, Möbel und Glas sind vorab in Stücke zerlegt (oft nach einem Voronoi-Muster); beim Treffer wird das ganze Modell durch die Stücke ersetzt; große Stücke brechen bei genug Kraft weiter in kleinere | Unreal Engine (Chaos), Battlefield |
| 4 Oberfläche | Kratzer, Dreck, Risse und Ruß als Masken über dem Material, an der Trefferstelle aufgemalt | fast alle |
| 5 Folgen | Schadenszustände ändern das Verhalten: Motor raucht und brennt, Reifen platzt, Lenkung zieht, Figur hinkt | GTA, Red Dead Redemption 2 |

**Figuren:** Euphoria (NaturalMotion) rechnet Figuren mit simulierten Muskeln: Sie halten das Gleichgewicht, schützen den Kopf, greifen
nach Halt. Das ist mehr als eine schlaffe Puppe (Ragdoll) und der Grund, warum Stürze in GTA und Red Dead so lebendig wirken.

**Die Extreme:** BeamNG.drive rechnet ganze Fahrzeuge als Weichkörper aus Knoten und Balken, sehr rechenintensiv; Teardown baut die Welt
aus Voxeln, alles ist zerstörbar; The Finals rechnet die Zerstörung auf dem Server, damit sie für alle Spieler gleich ist.

## 3 Die Tricks dahinter

- **Fast alles ist vorbereitet:** Stücke, Stufen, Masken. Gerechnet wird nur, was sich gerade bewegt.
- **Nur nah an der Kamera echt;** weiter weg genügen einfache Stufen.
- **Trümmer schlafen ein,** verschmelzen oder verschwinden, damit das Budget hält.
- **Schaden wird als wenige Zahlen gespeichert** (Dellen je Zone, Stufe je Teil), nicht als ganzes Netz.
- **Wo alle dasselbe sehen müssen** (online), wird die Zerstörung auf dem Server oder immer gleich gerechnet.

## 4 So würde es in Ozzy gehen

1. **Der Werkstoff bestimmt den Schaden** (Teil 14): Knete und Metall bleiben verbeult, Gummi springt zurück, Stein bricht entlang seiner
   Schichten, Glas zerspringt sternförmig, Holz splittert entlang der Maserung, Stoff reißt an den Nähten (wie die Nahtrisse in Marvelous
   Designer 2026.1), Seifenhaut platzt in Tröpfchen. Regler: verformbar, zerbrechlich, zäh.
2. **Dellen** sind eine örtliche Verschiebung der Haut um den Treffer, mit Grenze. Weil die Linien die Wahrheit sind, kann eine Delle auf
   Wunsch eine Linie werden, die du weiterformst; die Hand hat Vorrang vor der Physik.
3. **Schadensstufen als Posen:** Du formst „neu“, „verbeult“ und „Wrack“ von Hand wie Posen; Ozzy blendet um den Treffer herum zwischen
   ihnen. Das ist die Leiter von 2 bis 2048 in die andere Richtung, eine Schadens-Leiter. So sieht Schaden auch im Earle- oder Vektorstil
   gestaltet aus statt zufällig.
4. **Teile an Nähten:** Türen, Räder, Ohren und Hüte hängen an Nähten oder Gelenken mit einer Reißkraft. Reißt die Naht, wird das Teil ein
   eigener Körper.
5. **Bruchstücke vorab:** In der Ruhe rechnet Ozzy aus Form und Werkstoff die Stücke vor (Stein in Schichten, Glas sternförmig, Holz in
   Splittern). Beim Treffer werden sie eingewechselt; große zerfallen weiter, wenn genug Kraft da ist.
6. **Oberfläche:** Kratzer, Ruß und Risse sind Auflagen (Teil 14), an der Trefferstelle gemalt.
7. **Folgen als Sätze:** „Sobald der Motor zu 70 % beschädigt ist: Rauch.“ „Sobald ein Rad fehlt: Der Wagen zieht nach links.“ Das ist
   Spielmechanik aus dem Editor (Teil 13).
8. **Figuren, die sich wehren:** Gleichgewicht halten, Kopf schützen, nach Halt greifen, aus Knochen und Nachschwingen (Teil 11), im
   Geist von Euphoria. Für die fliegenden Fahrgäste in Traumacoaster besonders reizvoll.
9. **Stil-Regler:** von echt (Knautschzone, Splitter, Staub) bis Trickfilm (Ziehharmonika, Sterne um den Kopf, springt zurück).
10. **Zurückspulen und Reparieren:** Schaden lässt sich über die Leiste zurückdrehen, und ein Regler „Schaden“ von 0 bis 1 zeigt jede
    Stufe; das hilft beim Gestalten und kann selbst Spielmechanik sein (Reparatur).

## 5 Wofür in deinen Projekten

- **Traumacoaster:** Wagen und Bahn bei Unfällen, fliegende Fahrgäste, die reagieren, zerbrechende Kulissen und Glas; Trickfilm-Schaden
  passt zum Ton.
- **early earle:** Formen, die beim Verschmelzen platzen (Seifenhaut), Kulissen, die bei Ereignissen brechen.
- **Gassirunde:** kleine Dinge, die umfallen und zerbrechen (Vase, Zaun, Mülltonne).

## 6 Tempo auf dem iPhone 16

Vorbereitete Stufen und Bruchstücke sind billig, örtliche Dellen auf der Grafikkarte auch; Trümmer schlafen ein. Echte Weichkörper wie in
BeamNG gibt es nur am Mac oder in der Ruhe. Im Spiel muss Schaden immer gleich ausgehen (fester Takt, Teil 11).

## 7 Ehrlich

- Das Niveau von GTA ist die Arbeit von Hunderten über Jahre. Das Prinzip können wir haben, die Menge nicht.
- Wie GTA 6 es genau macht, ist nicht öffentlich; beschrieben sind hier die bekannten Verfahren der Branche.
- Zerstörbare Welten kosten Speicher (vorab zerlegte Stücke) und Rechenzeit; im Spiel gezielt einsetzen, nicht überall.

## 8 Quellen

- GTA 6: [GTA Intel](https://gtaintel.com/news/gta-6-physics-and-destruction),
  [Sportskeeda: Delle im Trailer](https://www.sportskeeda.com/gta/news-first-look-gta-6-car-deformation-physics-seemingly-found-trailer),
  [Digital-Foundry-Besprechung, zitiert bei NeoGAF](https://www.neogaf.com/threads/digital-foundry-grand-theft-auto-6-digital-foundry-tech-review-the-game-of-the-generation.1703495/),
  [GTA Zone: Euphoria](https://gta-zone.com/news/gta-6-euphoria-ragdoll-physics/)
- Ohne Link: NaturalMotion Euphoria (GTA IV, GTA V, Red Dead Redemption 2), BeamNG.drive, Teardown, The Finals, Unreal Engine Chaos
  Destruction, Battlefield (Frostbite).
- Vorher: Teil 3 (Leiter), Teil 11 (Physik, Nachschwingen, Rückspulen), Teil 13 (Spielmechanik aus Sätzen), Teil 14 (Werkstoffe).
