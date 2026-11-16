# Werk lösen (Phase 1): Fenster-Proben vorher und nachher, 16.11.2026

Server: Ozzy (5205), kurven.html?gewichte=geometrie, GPU=1. Vorher = kurven.ts vor dem Schnitt (mit der Sperre der Eingaben als Funktion), nachher = werk.ts + Hülle.

## Vergleich der Urteile
```
== form-abzweigung-fenster.txt: Urteile VERSCHIEDEN (22 gut, 0 FEHL nachher; vorher 19 gut, 3 FEHL)
   vorher : FEHL der Kreis bleibt, nichts umgeschlagen, spiegelgleich: Punkte des Kreises um höchstens 0,00 bewegt; umgeschlagen 2
   nachher: gut der Kreis bleibt, nichts umgeschlagen, spiegelgleich: Punkte des Kreises um höchstens 0,00 bewegt; umgeschlagen 0
   vorher : FEHL danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0,00 anders; umgeschlagen 2
   nachher: gut danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0,00 anders; umgeschlagen 0
   vorher : FEHL danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0,00 anders; umgeschlagen 2; die Linie hat 5 Punkte
   nachher: gut danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0,00 anders; umgeschlagen 0; die Linie hat 5 Punkte
   vorher : 3 Punkte nicht erfüllt
   nachher: alle Punkte erfüllt
   4 Zeilen mit anderen Zahlen, die ersten:
     - FEHL der Kreis bleibt, nichts umgeschlagen, spiegelgleich: Punkte des Kreises um höchstens 0.0 bewegt; umgeschlagen 2
     + gut  der Kreis bleibt, nichts umgeschlagen, spiegelgleich: Punkte des Kreises um höchstens 0.0 bewegt; umgeschlagen 0
     - FEHL danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0.0 anders; umgeschlagen 2
     + gut  danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0.0 anders; umgeschlagen 0
     - FEHL danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0.0 anders; umgeschlagen 2; die Linie hat 5 Punkte
     + gut  danach: die Form bleibt, nichts umgeschlagen, spiegelgleich: Ausdehnung um höchstens 0.0 anders; umgeschlagen 0; die Linie hat 5 Punkte
     - 3 Punkte nicht erfüllt
     + alle Punkte erfüllt
== form-donut-fenster.txt: Urteile gleich (23 gut, 0 FEHL nachher; vorher 23 gut, 0 FEHL)
== form-fressen-pose.txt: Urteile gleich (0 gut, 0 FEHL nachher; vorher 0 gut, 0 FEHL)
== form-gesichert-zug.txt: Urteile gleich (0 gut, 0 FEHL nachher; vorher 0 gut, 0 FEHL)
   5 Zeilen mit anderen Zahlen, die ersten:
     - geladen und Hintergrund fertig nach <s> · 11449 Punkte, größte Koordinate 754 · Auftrag: {"nr":2,"geaendert":false,"vorstufe":"keine","abgebrochen":false,"neu":0,"gelegt"
     + geladen und Hintergrund fertig nach <s> · 11449 Punkte, größte Koordinate 754 · Auftrag: {"nr":2,"geaendert":false,"vorstufe":"keine","abgebrochen":false,"neu":0,"gelegt"
     - im Zug (3.7 s): 185 Bilder, Abstand Median <ms>, 95 % <ms>, längster <ms> · je Runde <ms>
     + im Zug (3.3 s): 180 Bilder, Abstand Median <ms>, 95 % <ms>, längster <ms> · je Runde <ms>
     - beim Loslassen: Haut steht NICHT (Runden seit der letzten Mausbewegung 1) · 11477 Punkte, größte Koordinate 754
     + beim Loslassen: Haut steht  (Runden seit der letzten Mausbewegung 5) · 11477 Punkte, größte Koordinate 754
     - nach dem Loslassen: das Fenster steht höchstens <ms> still (Bilder über <ms> Abstand: 0) · letzte Bewegung der Haut nach <s>, alles ruht nach <s> (ja) · Netzwechsel: 1144
     + nach dem Loslassen: das Fenster steht höchstens <ms> still (Bilder über <ms> Abstand: 0) · letzte Bewegung der Haut nach <s>, alles ruht nach <s> (ja) · Netzwechsel: 1144
== form-kiefer-fenster.txt: Urteile gleich (12 gut, 0 FEHL nachher; vorher 12 gut, 0 FEHL)
== form-maul-formen-fenster.txt: Urteile gleich (17 gut, 0 FEHL nachher; vorher 17 gut, 0 FEHL)
   2 Zeilen mit anderen Zahlen, die ersten:
     - gut  Maul formen: Meldung: Maul geformt (1.7 s): Die Maullinie ist eine Kante und trägt ihren Knick selbst (95° an den Lippen, 70° am Mundwinkel) · ⌘Z führt zurück
     + gut  Maul formen: Meldung: Maul geformt (1.5 s): Die Maullinie ist eine Kante und trägt ihren Knick selbst (95° an den Lippen, 70° am Mundwinkel) · ⌘Z führt zurück
     - gut  animiert: Das Fenster zeigt das Formen in Schritten: 61 von 63 Bildern mit Bewegung in 1.7 s
     + gut  animiert: Das Fenster zeigt das Formen in Schritten: 61 von 63 Bildern mit Bewegung in 1.5 s
== form-maul-loop.txt: Urteile gleich (0 gut, 0 FEHL nachher; vorher 0 gut, 0 FEHL)
== form-pose-fenster.txt: Urteile gleich (16 gut, 1 FEHL nachher; vorher 16 gut, 1 FEHL)
== form-pose-mitgehen-fenster.txt: Urteile gleich (57 gut, 0 FEHL nachher; vorher 57 gut, 0 FEHL)
   4 Zeilen mit anderen Zahlen, die ersten:
     - das gemeinsame Netz danach: 3485 → 3461 Punkte, davon 3455 am selben Ort (noch in der Pose: 3455 von 3461; beim Verlassen bewegt: 0.0); neue Punkte bis 0.5 neben der alte
     + das gemeinsame Netz danach: 3485 → 3459 Punkte, davon 3453 am selben Ort (noch in der Pose: 3453 von 3459; beim Verlassen bewegt: 0.0); neue Punkte bis 0.5 neben der alte
     - gut  A (Punkt von Loop 7 fern vom Maul um 15 gezogen): ein reiner Zug (die Linien haben dieselben Punkte wie vorher): 287.4 vom Maul, 32.2 frei; Punkte 65 → 65, Netz 3461
     + gut  A (Punkt von Loop 7 fern vom Maul um 15 gezogen): ein reiner Zug (die Linien haben dieselben Punkte wie vorher): 287.4 vom Maul, 32.2 frei; Punkte 65 → 65, Netz 3459
     - gut  A (Punkt von Loop 7 fern vom Maul um 15 gezogen): am Maul bleibt die Haut der Pose (höchstens 0.5): 0.1 (3461 → 3457 Punkte)
     + gut  A (Punkt von Loop 7 fern vom Maul um 15 gezogen): am Maul bleibt die Haut der Pose (höchstens 0.5): 0.1 (3459 → 3457 Punkte)
     - gut  A (Punkt von Loop 7 fern vom Maul um 15 gezogen): die Pose zeigt die Änderung der Grundform (um den gezogenen Punkt höchstens 0.5 neben der Grundform): 0.0 (Netz 346
     + gut  A (Punkt von Loop 7 fern vom Maul um 15 gezogen): die Pose zeigt die Änderung der Grundform (um den gezogenen Punkt höchstens 0.5 neben der Grundform): 0.0 (Netz 345
URTEILE WEICHEN AB
```

## Abzweigung: Streuung (je ein Lauf der Probe)
```
streuung-alt-1: 0 FEHL, umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 
streuung-alt-2: 0 FEHL, umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 
streuung-alt-3: 0 FEHL, umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 
streuung-neu-1: 0 FEHL, umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 
streuung-neu-2: 0 FEHL, umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 
streuung-neu-3: 0 FEHL, umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 umgeschlagen 0 
```

Die 2 umgeschlagenen Dreiecke der ersten Messung vorher kamen nicht wieder: alter Stand in 3 von 3 Läufen ohne (`streuung-alt-*`), geteilter Stand in 7 von 7 (der Lauf „nachher“, `streuung-neu-*` und drei weitere Läufe, die wegen eines falschen Pfads auch den geteilten Stand prüften; ihre Ausgaben sind überschrieben). Also Streuung der Uhr, keine Änderung durch den Schnitt. Pose: der bekannte offene Punkt (umgeschlagene Dreiecke an der Mitte) vorher wie nachher.
