# Modulsystem für Mischwesen: Plan zur Freigabe

> Stand 2026-10-05. Anlass: Der erste Test (Teile abgerissen und ineinandergesteckt) war unbrauchbar, Urteil Florian: „Die Mischwesen müssen natürlich viel besser und genauer zerteilt werden, und wir brauchen ein System. Das funktioniert auch mit den geposteten Meshes.“ Dieser Plan beschreibt das System. Gebaut wird erst nach Florians Freigabe, und jede Stufe endet mit einem Vergleichsbild, das Florian abnimmt, bevor die nächste beginnt.

## Was beim ersten Test falsch war

- Schnitte als gerade Ebenen über Flächenmitten: zackige, zerrissene Ränder quer durch Hals, Mähne und Kamm.
- Offene Schnittränder, nichts verschlossen, kein Übergang zum neuen Körper.
- Ausdünnen vor dem sauberen Schneiden und zu stark: Splitter in Fellsträhnen.
- Platzierung nach Zahlen, ohne Maßstab-, Posen- und Stilabgleich.

## Das System in fünf Bausteinen

1. **Schnittlinien entlang der Anatomie statt Ebenen.**
   - Pro Modell ein Skelett aus der Form (Mittellinien von Hals, Beinen, Schwanz).
   - Entlang jedes Astes den Querschnitt messen; die Schnittlinie liegt an der schmalsten Stelle bzw. in der natürlichen Falte (konkave Krümmung), wie ein Mensch die Grenze sehen würde.
   - Die Linie folgt der Oberfläche (geschlossene Schleife), nicht einer Ebene. Florian kann jede Linie im Vorschaubild abnehmen oder verschieben.
2. **Exakt schneiden und verschließen.**
   - Dreiecke werden an der Linie geteilt (glatter Rand statt Zickzack), auf der vollen Meshy-Auflösung.
   - Die Öffnung bekommt einen kurzen, gerundeten Zapfen mit Farbe aus der Umgebung, damit nichts offen ist, auch nicht beim Bewegen.
   - Erst danach ausdünnen, mit festgehaltenem Schnittrand und höherer Auflösung an feinen Strähnen.
3. **Genormte Andockstellen.**
   - Jedes Teil bekommt einen Andockrahmen: Mitte und Radius des Schnittrings, Richtung, Oben.
   - Jeder Rumpf (Grundblob oder Meshy-Rumpf) bekommt benannte Sockel (Hals, Schultern, Hüfte, Rücken, Schwanz) mit demselben Rahmen.
   - Maßstab und Ausrichtung ergeben sich aus den Rahmen, nicht aus Handzahlen.
4. **Nahtloser Übergang.**
   - Der Schnittring des Teils wird auf die Oberfläche des Rumpfs gezogen (wie Schrumpffolie), ein schmales Band dahinter wird weich angeglichen: Form, Normalen und Farbe gehen fließend ineinander über.
   - Wo das nicht reicht: Kragen aus Fell, Schuppen oder Hautwulst im Material des Rumpfs.
5. **Einheitlicher Stil und Bewegung.**
   - Alle Teile eines Wesens bekommen dieselbe Beleuchtung; gebackene Meshy-Schattierung und Farbe werden getrennt (Farbe aus der Palette, Malstruktur bleibt), optional Meshy-Retexture mit einer gemeinsamen Stilvorlage.
   - Gelenke mit echten Knochen und weichen Gewichten (Knie, Kiefer mit Kehle, Hals als Kette) statt starrer Teile.

## Stufen mit Abnahme durch Florian

| Stufe | Ergebnis | Abnahme |
|---|---|---|
| 1 | Schnittlinien für Giraffe, Spinne, Rex, Retriever als Vorschaubilder (Linien auf dem Modell) | Liegen die Grenzen richtig? |
| 2 | Ein Teil sauber geschnitten und verschlossen (Giraffenkopf mit Hals), vorher/nachher | Sauberer Rand, nichts zerrissen? |
| 3 | Dieses Teil nahtlos an einem Grundblob und an einem Meshy-Rumpf, Vergleich mit einem GPT-Bild derselben Kombination | Sieht es aus wie ein Wesen? |
| 4 | Gelenke (Hals, Kiefer, Beine mit Knie) und Bewegung | Bewegt es sich glaubwürdig? |
| 5 | Erst dann: alle Teile, Sockel an allen 13 Grundformen, Mischwesen-Ansicht | — |

Fällt eine Abnahme durch, wird die Stufe wiederholt oder der Ansatz geändert, nicht weitergebaut.

## Was Florian liefern kann (hilft, ist aber nicht Voraussetzung für Stufe 1–2)

- Für Stufe 3 ein GPT-Bild der Zielkombination (z. B. Grundblob mit Giraffenhals), damit es ein echtes Vergleichsbild gibt.
- Drachenflügel als eigenes Meshy-Modell.

## Werkzeuge (Cloud)

Python mit trimesh, scipy, pymeshlab (vorhanden); für Skelett, Geodäten und exaktes Schneiden zusätzlich libigl oder Blender als Python-Paket (`bpy`, Bisect mit Füllen, Shrinkwrap, automatische Gewichte). Welche von beiden, entscheidet ein kurzer Test in Stufe 1.

## Nachtrag 2026-10-05: Abnahme Stufe 1 nicht bestanden

Florian: „Die Schnitte passen leider gar nicht – meistens viel zu wenig geschnitten.“ Die Linien lagen am Ende des Übergangs (Teilseite), die Teile waren zu klein. Ein automatischer zweiter Versuch (Schnitt in der Mitte des Übergangs, Rumpfseite) schnitt durch den Rumpf (ein Ring um beide Vorderbeine der Giraffe, Spinnenringe quer durch den Körper) und wurde verworfen, nicht gezeigt.

Nächster Schritt: Florian zeichnet auf sauberen Ansichten ein, wo er schneiden würde (`docs/progress/zum-markieren-*.png`). Seine Linien werden zuerst exakt als Ansatzpunkte übernommen; erst danach wird die Regel daraus abgeleitet (wie weit in den Rumpf, welche Muskelpartien zum Teil gehören), bevor wieder automatisch geschnitten wird.

## Nachtrag 2026-10-05: Test beendet

Florian: „Erstelle mir den Editor mit deinen Linien. Ich weiß, es wird noch nicht gut aussehen. Ich brauche ein klares System für die Aufteilung und Elemente … ich will den Test jetzt beenden.“ Ergebnis: Elemente entlang der Stufe-1-Linien geschnitten und verschlossen, Editor mit Rumpf/Sockel/Element-System im Artefakt. Beschreibung des Systems: [`SYSTEM.md`](SYSTEM.md). Die Stufen 2–5 dieses Plans bleiben für die Produktion.
