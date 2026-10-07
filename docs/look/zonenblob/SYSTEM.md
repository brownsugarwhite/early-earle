# Zonen-Grundblob: System mit Steckplätzen (Rat, ungetestet)

> Stand 2026-10-05. Florians Klarstellung: „Kein Klappmechanismus. Verschiedene geriggte Mäuler! Verschiedene Augen. Giraffenhälse mit eigenem Kopf. Ich habe dich um Rat bei einem komplexen System gefragt.“ Skizze: 7 Blobs, waagrecht geteilt in Unterteil, Mund, Augen, Oberteil; großes Maul bei großen Blobs; Dino mit eigenem Kopf oben und Rückenzacken.
>
> Ersetzt die Deutung in [`IDEE.md`](IDEE.md). Baut auf Begriffen aus [`../modulsystem/SYSTEM.md`](../modulsystem/SYSTEM.md) auf (Element, Andockring, Sockel), aber die Teile werden passend **gebaut** statt aus Tieren geschnitten.

## Grundidee

Der Grundblob ist ein **Träger mit festen Steckplätzen**. In jeden Steckplatz kommt ein eigenes, fertig geriggtes Modul. Alle Wesen (alle 13 Stufen, alle Tierthemen) sind derselbe Träger mit anderer Bestückung.

## 1. Steckplätze

| Platz | Aufgabe | Beispiele |
|---|---|---|
| Unterteil | Stehen, Fortbewegung | Stummelfüße, Pfoten, Hufe, Spinnenbeine, Tentakel, Schlangenschwanz |
| Mund | Fressen, Ausdruck | Retriever mit Zunge, Drachenkiefer, Schnabel, Entenschnabel, Hai, Frosch, Mandibeln, Lächeln |
| Augen | Blick, Gefühl | Pillen, Kugelaugen mit Pupille, Facetten, acht Spinnenaugen, Stielaugen, Zyklop |
| Oberteil | Thema, Silhouette | Ohren, Hörner, Geweih, Kamm, Fühler – oder **Hals mit eigenem Kopf** (Giraffe, Dino, Drache, Schlange) |
| Rücken (Empfehlung) | Seitensilhouette | Flügel, Zacken, Panzer, Flossen |
| Schwanz (Empfehlung) | Seitensilhouette | Dino-, Katzen-, Fisch-, Skorpionschwanz |

- Unterteil, Mund, Augen, Oberteil sind **volle Scheiben** rundherum (wie in der Skizze): Ring unten, Ring oben. Das Modul füllt die ganze Scheibe; vorne sitzt das Maul bzw. sitzen die Augen, hinten ist es Haut. Dadurch passt jede Scheibe auf jede Nachbarscheibe.
- Rücken und Schwanz sind **Sockel** auf den Scheiben (Flügel und Schwänze passen in kein Band).

## 2. Köpfe sind rekursiv

Ein Hals-Modul endet in einem **Kopf, der selbst ein kleiner Träger ist**: mit eigenem Mund-, Augen- und Oberteil-Platz. So geht Giraffenhals + Drachenmaul + Spinnenaugen + Hirschgeweih.

Regel: Ein Modul kann Plätze **belegen** (Hörner mit Augen belegen den Augenplatz) oder **neue mitbringen** (Hals bringt Kopf mit drei Plätzen). Der Bauplan eines Wesens ist ein Baum aus Plätzen.

## 3. Schnittstelle je Platz (damit alles auf alles passt)

1. **Nahtring:** feste Punktzahl und Reihenfolge, gleiche Normalen auf beiden Seiten → keine sichtbare Naht.
2. **Andockknochen:** Das Skelett des Moduls hängt am Platz-Knochen des Grundblobs. Die Nahtpunkte sind auf beiden Seiten gleich gewichtet → nichts reißt beim Quetschen, Hüpfen, Fressen.
3. **Eigenes Rig im Modul:** Kiefer, Zunge, Lippen, Lider, Pupillen, Halskette liegen im Modul, nicht im Grundblob. Rig-Vorlage je Modultyp (alle Schnäbel teilen ein Skelett, alle Kiefer ein anderes).
4. **Gemeinsames Animations-Vokabular:** Jedes Modul liefert dieselben Zustände (Ruhe, Fressen, Freuen, Erschrecken, Schlafen, Wachsen …) mit eigenen Clips. Der Grundblob gibt nur den Zustand vor. Kein Retargeting; jede Kombination ist sofort animiert.
5. **Regeln:** erlaubte Stufen bzw. Größen, belegte und mitgebrachte Plätze, Polygonbudget.

## 4. Ein Grundblob für alle 13 Stufen

- Die 13 Stufenformen sind Formvarianten (Blendshapes) **einer** Topologie. Die Nahtringe wandern mit, Module werden über den Ring per Käfigverformung angepasst.
- Die Besonderheiten der Stufen werden selbst Module: Hörner mit Augen (Stufe 9) = Oberteil-Modul, Füße (Stufen 11, 13) = Unterteil-Modul, Spitze oben = Oberteil-Modul. Auch die 13 Grundformen sind dann Kombinationen.
- Die Scheibenhöhen sind je Stufe festgelegt: der Mund wächst mit der Stufe (Skizze: Riesenmaul bei großen Blobs).

## 5. Herstellung

- **Blender-Vorlage:** Grundblob mit Nahtringen, Platz-Knochen, Rig-Vorlagen und Namensregeln. Module werden darauf modelliert oder aus Meshy übernommen und an die Ringe angepasst (Meshy liefert Form und Textur, Blender die Passung).
- **Prüfskript vor dem Import:** Naht passt, Knochen benannt, alle Zustands-Clips vorhanden, Budget eingehalten.
- Material: ein Shader für alle Module (Jelly, fest, Fell), Farbe und Muster je Wesen.

## 6. Laufzeit

Beim Erzeugen eines Wesens werden seine Module einmal zu einem Mesh mit einem Skelett und einem Material (Texturatlas) zusammengefügt → ein Draw Call je Wesen (plus Schatten). 36 Wesen bleiben im Budget von 100.

## Mengen

Beispiel: 12 Unterteile × 15 Mäuler × 10 Augen × 20 Oberteile × 8 Rücken × 8 Schwänze ≈ 2,8 Mio. Kombinationen aus 73 Modulen.

## Schwierig, ehrlich

- Nähte bei Fell und bei starker Verformung.
- Module, die für große Stufen gebaut sind, auf Stufe 2 (Giraffenhals auf winzigem Blob): Regeln oder Größenvarianten.
- Konflikte zwischen Plätzen (wer belegt was) brauchen klare Regeln, sonst stehen Augen in Hörnern.

## Entscheidungen für Florian

1. Hals mit Kopf: Behält der Körper Mund und Augen (wie der Dino in der Skizze) oder wandern sie in den Kopf? Oder je Modul festgelegt?
2. Nähte sichtbar als Stilmittel (Bänder wie in der Skizze) oder unsichtbar?
3. Wer baut Module: Florian in Blender, Meshy, beides?
4. Rücken und Schwanz als zusätzliche Plätze: ja/nein?
