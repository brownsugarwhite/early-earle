# Shader: was bleibt (Feinschliff, gesammelt; Stand nach Runde 8, 21.11.2026)

Alle 62 laufen ohne Fehler in der Konsole (Bilder: `docs/progress/ozzy/shader/2026-11-20-runde-2-*.png`, Runde 4:
`2026-11-20-runde-4-*.png`, Runde 6: `2026-11-21-runde-6-*.png`). Was mir beim Ansehen aufgefallen ist, für einen Feinschlifflauf (Florians Auge entscheidet):

1. **Die sechs freien aus Runde 1** sind nachgeschärft (Feuer, Rauch, Tinte, Flüssigglas, Aquarell, Tintenfleck). Es bleibt: Im
   Feuer zeigen sich am Rand des Rauchs runde Ballen; im Rauch liegt am Ohr eine dunkle Sichel (dort ist der Körper dünn); die Tinte
   sammelt sich mit der Zeit unten (sie sinkt) und wird dort einförmig; im Glas ist der Austritt eine Näherung (Linse), nicht der
   echte Weg durch die Form; die Bleistiftlinien bei Tintenfleck laufen durch das ganze Bild.
2. **Eine Linie:** braucht nach der Wahl rund 15 Sekunden, bis sie die Form füllt; Kontrast weicher als die Vorlage.
3. **Ereignishorizont:** In Ozzys Standardblick (von schräg oben) ist der Bogen der Rückseite über der Form nur leicht gebogen; wie in
   „Interstellar“ wirkt es erst flach von der Seite. Der Photonenring ist eine feine Linie um den Umriss.
4. **Tropfen:** An schrägen Kanten wirkt der Ansatz noch etwas flach; eine Pfütze unter der Form fehlt.
5. **Staub:** Am Ende des Zerfalls wird die Wolke sehr dicht (gewollt: dann ist die Statue ganz Staub).
6. **Haut:** Poren und Felderung erst nah zu sehen; echte Streuung im Bild (Weichzeichnen der Beleuchtung je Kanal) fehlt noch.
7. **Earle-Haut:** Riefen und Lichtpunkte bei normalem Zoom kaum zu sehen.
8. **Gouache:** in Runde 4 neu gemalt (siehe unten).
9. **Tiger:** Die Richtung der Streifen folgt der längsten Achse der Form (Kasten); an runden Formen entstehen an den Enden Ringe.
10. **Comicdruck:** Glanzpunkte noch etwas fleckig. **Marker 2099:** das Muster eher Leiterbahn als Stufenmuster.
11. **Alle:** Ozzys Linien und Wände liegen auf dunklen Bühnen dunkel und leise; ob sie dort hell werden sollen, ist seine Wahl.
12. **Tempo:** auf dem M3 Pro flüssig; am iPhone nicht gemessen. Am teuersten: Ereignishorizont (Strahlengang je Bildpunkt), Staub
    (65 536 Vierecke), Tropfen (Suche der Kante je Bildpunkt unter der Form).

**Nach Runde 3 (Tiermuster, Ukiyo-e, Diamant, Diskokugel):**

13. **Schlange und Krokodil:** Wo die Fläche die Richtung wechselt, wechseln auch die Schuppenreihen (eine Naht, wie bei echten
    Tieren an Übergängen, aber an Florians Formen manchmal mitten auf einer Wölbung). **Runde 6:** Schlangen und Drache sind
    Schindeln im Raum (keine Naht); Krokodil, Salamander und Elefant laufen auf den neuen Häuten.
14. **Diskokugel:** in Runde 4 neu (siehe unten).
15. **Diamant:** in Runde 4 neu (siehe unten).
16. **Ukiyo-e:** Die Pinselzeichen im Titelfeld sind Striche ohne Bedeutung; der Berg ist klein.

**Nach Runde 4 (Tiere in drei Stilen, LEGO, Diamant, Diamantbesatz, Diskokugel, Gouache):**

17. **Tiere:** Ringe und Rauten (Korallennatter, Klapperschlange) laufen quer zur längsten Achse der Form; an verschlungenen Formen
    wirken sie wie Flecken. Der Python schimmert am Umriss violett (gewollter Schimmer, vielleicht zu stark). Im Comic glänzt eine
    stark gewölbte Form an vielen Stellen. **Runde 6:** Die Tiere laufen auf den Häuten (`haeute.ts`, Licht wie beim T-Rex, fünf
    Stile); Ringe und Rauten laufen weiter quer zur längsten Achse der Form.
18. **LEGO:** Dünne Teile, schmaler als ein Stein, fallen weg (wie beim echten Bauen); die Steine schauen nur nach oben (Noppen oben,
    keine Seitenbauweise). Das Licht hängt an der Sicht: Beim Drehen wandern die Schatten mit.
19. **Diamant:** Die Facetten folgen der Normale (keine ebenen Flächen im Raum); am Umriss blüht das Licht stark auf.
    **Diamantbesatz:** sehr viel Funkeln, im Ganzen unruhig; wo Zellen im Raum die Haut nur streifen, entstehen kleine, angeschnittene
    Steine.
20. **Diskokugel:** in Runde 6 neu (siehe unten).
21. **Gouache:** Striche der Form reichen ein wenig über den Umriss (gewollt); die Wolken bestehen aus kurzen Strichen, Ghibli malt sie
    weicher.

**Nach Runde 5 (T-Rex; Bilder `2026-11-20-runde-5-trex-*.png`):**

22. **T-Rex und die Form:** Der Shader kennt keinen Kopf, keine Beine und keinen Schwanz: Die Bänder laufen quer zur längsten Achse der
    Form, Bauch ist, was nach unten zeigt, die Rückenhöcker sitzen nur, wo die Spiegelebene oben liegt. Auge, Zähne und Krallen gibt es
    nicht (dafür müsste der Shader die Teile der Form kennen).
23. **T-Rex, Narben:** Sie liegen, wo zwei Rauschfelder die Haut treffen; je nach Form und Blick sieht man keine oder mehrere (Regler
    Narben).
24. **T-Rex, Bühnen:** stehen still (kein ziehender Rauch, keine fliegenden Saurier). In der Urzeit wirft die Form keinen Schatten (sie
    schwebt vor der Landschaft). Spielzeug „Erde“ ist braun; das grüne Spielzeug ist die Färbung Wald.
25. **T-Rex, Tempo:** je Bildpunkt zwei Zellsuchen im Raum (Fossil drei) mit je 54 Zellen, dazu die Bühne; nicht gemessen, weder auf dem
    Mac noch am iPhone.

**Nach Runde 6 (Fell, Flausch, Häute im Zeichenstil, Diskokugel; Bilder `2026-11-21-runde-6-*.png`):**

26. **Fell, Tempo:** In Bewegung im Testbrowser 25 bis 48 ms je Bild (je nach Zoom, nah teurer; vorher 96 bis 300), danach ein Bild
    in voller Güte. In Florians Chrome und am iPhone nicht gemessen. **Runde 7:** in Bewegung 26 bis 32 ms samt Ozzy (Grund 11 bis
    13 ms), im Stand 45 bis 110 ms (Tabelle im Plan der Runde 7); am iPhone weiter nicht gemessen.
27. **Übersetzen:** Der Wechsel zu einem Fell- oder Hautshader hält das Bild 0,4 bis 0,7 s an (das Programm wird übersetzt).
28. **Fell Ghibli:** Die Ränder der Büschel sind etwas kratzig; nah liegt im weißen Fell ein Gitter aus kurzen Strichen. **Runde 7:**
    behoben (Haare behalten im Büschel die halbe Dicke, gemalter weicher Rand); ganz nah bleibt am Rand ein feines Korn.
29. **Fell, Muster:** Leopard, Gepard und Jaguar sind in der Übersicht schwer zu unterscheiden (erst nah: Rosetten, volle Punkte,
    Rosetten mit Kern). Die Muster kennen keine Körperteile: Siam und Waschbär sind an den Enden der Form dunkel (weit außen im
    Kasten der Form), nicht an Gesicht, Ohren und Pfoten; der Waschbär hat keine Maske.
30. **Schaf:** In der Übersicht Vlies; nah liegen die Locken wie ein Netz aus Ringen. **Runde 7:** Wolle als Stapel (Kuppeln wie
    Blumenkohl, cremeweiß). Es bleibt: nah zeigen manche Kuppeln an der Seite ein feines Gewebe (die Fasern stehen in einem Raster);
    die Kräuselung einzelner Fasern ist kaum zu sehen.
31. **Wolke:** Ghibli und Anime haben eckige Schattenstufen (die Kanten der Ballen zeigen sich in der Stufe); die Fransen am Rand
    sehen aus wie Fell. Eine Wolke im Spider-Verse-Stil (im Plan) ist nicht gebaut.
32. **Zuckerwatte:** innen sehr glatt, die Fasern sieht man fast nur am Rand.
33. **Pusteblume** (Versuch): wirkt eher wie Distel oder Schneeflocken.
34. **Plüschtier:** Plüsch ohne Nähte und Knopfaugen (der Shader kennt die Teile der Form nicht).
35. **Drache:** Nah wirken die Schindeln wie spitze Blätter (eher Tannenzapfen); flacher und breiter wäre vielleicht drachiger.
36. **Häute im Anime-Stil:** Nasse Häute (Frosch, Krake) glänzen mit großen weißen Formen; gewollt, vielleicht zu viel.
37. **Diskokugel:** An schrägen Stellen werden die Kacheln Parallelogramme (der Schnitt des Rasters mit der Fläche), über einer
    scharfen Kante der Form knicken sie mit. Die Strahlen entstehen im Bild (vom Mittelpunkt der Kugel aus verwischt), nicht im Raum.
38. **T-Rex:** Die Kino-Bühne lebt noch nicht (Rauch, Flugsaurier, Glut; Plan Runde 6, Etappe 6, zweiter Teil).
39. **Gemerkte Regler:** Bei den Tieren aus Runde 4 hat der Stil die Reihenfolge gewechselt (1 war Spider-Verse, ist jetzt Anime;
    2 war Earle, ist jetzt Manga; Earle ist 4).
40. **Spiel:** Die Probe „Ghibli-Fell“ im Spiel ist nicht gebaut (Florian: „später reicht“).

**Nach Runde 7 (Fell schneller, Ghibli-Ränder, Schaf; Bilder `2026-11-21-runde-7-fell*.png`):**

41. **iPhone:** Fenster 5219 läuft im WLAN; gemessen ist noch nichts (Florian: Adresse mit `info=1`, „B/s“ ablesen).
42. **Nah in Bewegung** rechnet das Fell in halber Auflösung: weicher, bis die Form steht (dann ein Bild in voller Güte, nah rund
    100 ms; das ist ein spürbares Stocken beim Loslassen).
43. **Bühnen hinter dem Fell** werden jedes Bild neu gerechnet (Anime-Himmel: zwei Rauschfelder je Bildpunkt), obwohl sie stillstehen;
    ein Zwischenspeicher spart einige Millisekunden.
44. **Flammen** (Anime, Spider-Verse, Manga) suchen nur noch vier Kandidaten: Selten schneidet eine Grenze des Rasters eine Flamme
    gerade ab (in den Bildern nicht gesehen).

**Nach Runde 8 (Schlangen, Drache, Echsen, Schleim, Steine, Barcelona, Zeichenstil, Matrix 2.0; Bilder `2026-11-21-runde-8-*.png`):**

45. **Fell, Wolken, Plüsch** erreichen laut Florian „noch nicht den standard“; ruhen bis später.
46. **Schuppenfeld:** Auf Flossen und Ohren verzerrt sich das Gitter (größere, gestreckte Schuppen), an der Vorderkante der Oberflosse
    laufen die Reihen sternförmig zusammen. Die Recherche schlägt vor: Strichrichtung aus dem Abstand längs des Körpers (Dijkstra durch
    das Innere), Phasen nach Knöppel 2015 oder mehrstufig, im Worker, vom letzten Stand aus. Rechnet heute 0,6 s im Hauptfaden.
47. **Schlangen:** Rauten der Klapperschlange lesen sich von der Seite als Bänder; weiße Rückenschuppen des Baumpythons selten; die
    Linien zwischen den Schuppen sind auf hellen Schlangen etwas zu dunkel. Gabunviper (Recherche) nicht gebaut.
48. **Drache:** Kamm auf der Mittellinie nicht gebaut; die Schuppen sind flacher als in Runde 6, aber noch Schindeln aus Zellen im Raum
    (die Recherche empfiehlt Platten aus dem Schuppenfeld, zwei mal zwei Flankenschuppen je Platte).
49. **Krokodil:** Das Raster der Rückenschilde wirkt nah wie ein Korb; Kopfvielecke (Faltung) nicht gebaut. **Chamäleon:** wirkt noch
    etwas wie ein Mosaik; Sechseckgitter aus dem Feld (Recherche) nicht gebaut.
50. **Zeichenstil:** Stil und Palette wie die Vorlage, aber keine Oni-Maske (die Form ist glatt, das Ornament ist prozedural); Spiralen
    wirken eher wie Ringe; Schraffur als Querkonturen (Recherche) nicht gebaut.
51. **Matrix 2.0:** Zeiger als Lampe, Entschlüsseln-Welle, Nachleuchten der Röhre und ein MSDF-Atlas (Recherche) nicht gebaut.
52. **Steine:** Calacatta, Nero Marquina, Labradorit (Recherche) nicht gebaut; Achat wirkt hell.
53. **Barcelona:** Panot (Sechseckpflaster) und Kugeln auf dem Kamm der Batlló nicht gebaut. **Schleim:** Pfütze und Brennfleck auf
    der Bühne nicht gebaut.
