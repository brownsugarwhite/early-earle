# Zonen-Grundblob: ein Körper, in Zonen geteilt (Idee, ungetestet)

> Stand 2026-10-05. Anlass: Florians Skizze (7 Blobs mit waagrechten Zonen, großes Maul als Mittelteil, U-Form mit Augen auf den Hörnern, Flaschenform, Dino mit Schnauze und Rückenzacken) und seine Frage: „Was wäre, wenn wir nur einen Grundblob haben und diesen in verschiedene Teile aufteilen – Unterteil, Mund, Augen, Oberteil? Könnte man so nicht alle Formen und Mäuler auf stilisierte Weise darstellen? Wie müsste die perfekte Aufteilung aussehen?“
>
> Das ist eine Idee, kein Ergebnis. Sie braucht einen Look-Test (unten).

## Prinzip

Der Körper **ist** der Kopf (wie bei Pac-Man, Kirby, Om Nom oder einer Klappmaul-Puppe). Das Maul teilt ihn waagrecht. Das Tier erkennt man an drei Dingen: der Silhouette oben (Ohren, Hörner, Schnauze), dem Maultyp und Farbe/Muster. Die Grundform bleibt bei allen Tierthemen erhalten – das war Florians ursprünglicher Plan.

Statt fremde Tiere zu zerschneiden, wird gebaut: ein Körper mit festen Zonen, an definierten Stellen kleine, im Stil modellierte Aufsätze.

## Die Aufteilung

Jede Zone hat genau eine Aufgabe. Nur das Maul ist ein echter Spalt; alle anderen Grenzen sind weiche Zonen auf einer durchgehenden Oberfläche (Gewichte für Form, Farbe und Muster), damit der Körper ein glatter Jelly bleibt. Florians Bänder in der Skizze können als Musterstreifen im Shader erscheinen.

```
        ^  ^       Aufsätze Kappe: Ohren, Hörner, Fühler, Kamm, Haar
   .-----------.
  (    Kappe    )   Identität / Tierthema          15–30 % Höhe
  (   Gesicht   )   Augen-Anker, Nase/Schnauze     15–25 %
  ==Oberlippe=====  Naht 2
  [    Maul     ]   Spalt mit Scharnier hinten     0 % (zu) … 50 % (weit auf)
  ==Unterlippe====  Naht 1
  (  Unterteil  )   Bauch, Kinn; Stand und Hüpfen  30–50 %
   '-----------'
     o       o     Aufsätze Sohle: Füße, Beine
  Rückenleiste senkrecht hinten über alle Zonen: Zacken, Flossen, Panzer, Flügel; Schwanz am Unterteil
```

1. **Unterteil** (Bauch, Kinn, Sohle): Stehen, Quetschen, Hüpfen. Sockel für Füße/Beine und Schwanz.
2. **Maul**: Ausdruck und Fressen, die Hauptanimation.
   - Kein Bauteil, sondern ein Spalt mit Scharnier hinten. Öffnen = Gesicht und Kappe kippen nach oben, das Unterteil gibt leicht nach. Innen eine Mundtasche (dunkel, Zunge), Zähne als Einsätze an den Lippen.
   - Mundlinie als Kurve: Breite (60°–300° um den Körper), Krümmung (Lächeln bis Grimm), Vorsprung nach vorn.
   - Lippenprofil bestimmt den Maultyp: rund (Lächeln), vorgezogen (Schnauze), spitz und hart (Schnabel), gezackt (Zähne), geteilt (Mandibeln), lang (Krokodil).
3. **Gesicht** (Oberkiefer, Augenband): Blick und Gefühl. Nase/Schnauze als Vorsprung der Form, Rüssel und Schnurrhaare als Aufsätze.
4. **Kappe** (Stirn, Scheitel): das Tierthema. Darf sich teilen (U-Form mit zwei Hörnern).
5. **Augen sind Einsätze an Ankern**, kein festes Band: Höhe, Winkel, Abstand. Standard im Gesicht, bei der U-Form auf den Hörnern, bei der Spinne acht.
6. **Rückenleiste und Schwanz**: die Silhouette von der Seite (Dino-Zacken, Flossen).

Proportionen aller Zonen sind Parameter eines Höhenprofils. Die 13 Grundformen (Stufen 2 bis 8192) sind 13 Profile; die Zonen liegen in Prozent darauf.

## Beispiele

| Thema | Kappe | Gesicht | Maul | Unterteil / Rücken |
|---|---|---|---|---|
| Retriever | Schlappohren | kurze Schnauze, Nase | breit, Zunge | kleine Pfoten |
| Rex | flach | lange Schnauze nach vorn | gezackt, weit | Rückenzacken, Schwanz |
| Ente | Federschopf | – | Schnabel | Schwimmfüße |
| Spinne | – | acht Augen | Mandibeln | acht Beine am Unterteil |
| Elefant | große Ohren | Rüssel | klein | Säulenfüße |
| Giraffe | Hörnchen | – | klein, hoch oben | Flaschenform, Flecken |

## Grenzen

- Waagrechte Tiere (Schlange, Krokodil, langer Giraffenhals) nur als gestreckter oder gebogener Blob; Schlange evtl. mit Schwanzzone.
- Viele Beine und Flügel brauchen weiterhin Aufsätze an Sockeln (das Sockel-Prinzip aus [`../modulsystem/SYSTEM.md`](../modulsystem/SYSTEM.md) bleibt dafür gültig).
- Realistische Tierköpfe gehen nicht – das ist der Preis der Stilisierung und passt zu den Skizzen.

## Technik und Vorteile

- **Eine Topologie für alle:** Jede Zone hat eine feste Zahl an Ringen, alle Nähte dieselbe Punktzahl. Dadurch nahtlos per Konstruktion, kein Schneiden.
- **Draw Calls:** Wenn alle Körper dieselbe Topologie teilen, kann ein einziger instanzierter Draw Call alle Körper zeichnen; Profil und Zustand je Wesen als Datentextur. Das ist genau die offene Forderung aus Prototyp 1 (CLAUDE.md, Fallen „Draw Calls wachsen mit der Wesen-Vielfalt“). Ungetestet.
- **Rig:** ein Scharnier (Maul), Federn für Quetschen und Hüpfen, Zunge optional. Billig und robust.
- **Kombinationen:** Maultyp, Kappen-Aufsätze, Augen, Füße und Muster frei tauschbar, immer im selben Stil.
- **Meshy** bleibt möglich für Aufsätze (Ohren, Hörner, Flügel), die auf die genormten Sockel passen, oder Florian modelliert den Grundkörper einmal in Blender.

## Vorschlag Look-Test (nur nach Freigabe)

- Ein Grundkörper als Profil mit vier Zonen, Jelly-Material aus dem Grundblob-Test.
- Die sieben Figuren aus Florians Skizze nachbauen, gleiche Ansicht, Skizze und Render nebeneinander.
- Maul öffnen/schließen animiert, zwei, drei Maultypen und Aufsätze zum Umschalten.
- Kriterien: Florian erkennt seine Figuren wieder; das Maul offen und zu wirkt wie ein Körper, keine sichtbaren Nähte; alle sieben aus einer Topologie.
