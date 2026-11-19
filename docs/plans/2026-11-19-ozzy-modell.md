# Ozzy als Modell: Front genau, Seite und 3/4 angenähert (19.11.)

Florian (19.11.): „ich habe keine projektion gezeichnet. Front ist am wichtigsten. seite und 3/4 sind angenähert...das musst du eben auch
machen. Ich verlange ja nicht dass es 100% trifft. aber es war ja komplett daneben und unschön“ und „das hast du ja schonmal versucht.
meine zeichnungen sind aus dem kopf und nicht genau...“. Vorher: „Es soll schon genau wie mein logo sein“, „Bart als eigene Form“.

## Ziel

Ein 3D-Ozzy, der **von vorn genau** seine Zeichnung trifft (Umriss und Weiß), von der Seite und in 3/4 seine Zeichnungen **annähert**
und dabei **sauber** ist: glatte Flächen, keine Risse, keine Streifen, keine Finnen. Das Dazwischen ergibt sich aus der Form.

## Weg

Seite `apps/editor/ozzy-modell.html`, Code `apps/editor/src/ozzy-figur/modell/`.

1. **Aufblasen** (`aufblasen.ts`): Jedes Teil wird aus seinem Umriss in der Hauptansicht aufgeblasen wie ein Ballon (Poisson-Gleichung im
   Umriss, Höhe 2·√u; ein Kreis wird genau eine Kugel). Von vorn ist das genau sein Umriss. Die Tiefe nimmt es Zeile für Zeile aus der
   zweiten Ansicht, geglättet. Feld bikubisch gelesen, Abstandsfelder leicht weichgezeichnet (sonst flackern die Flächenrichtungen).
   Netz: Surface Nets, Ecken auf die Fläche gezogen.
2. **Kopf** (`kopf.ts`): Florians äußerer Umriss von vorn, an jeder Stelle um die Breite seines schwarzen Rands dort verkleinert. Der Rand
   kommt beim Zeichnen mit derselben Breite ringsum dazu (Rückseiten einer vergrößerten Hülle, nach hinten geschoben, damit er nur
   außerhalb des Umrisses erscheint). Ohren und Nase genauso aufgeblasen, schwarz.
3. **Weiß**: aus der Front, nach hinten bis zur Grenze aus der Seitenzeichnung; im Randband (über 66° von vorn) etwas breiter.

## Stand 1 (19.11. mittags, `docs/progress/ozzy-modell/kopf-1-runder-kopf.png`)

Deckung des Schwarz mit seinen Zeichnungen (nur Kopf, ausgerichtet): Front 91,7 %, 3/4 46 %, Seite 55 %, Rücken 88 %. Nur der Umriss:
Front 98,7 %, 3/4 83 %, Seite 88 %, Rücken 88 %. Die Form ist sauber; das Weiß der Front zieht an der Seite aber Balken (alles Schwarz nahe
am Umriss der Front liegt auf einer Kugel an der Seite breit), und der Kopf wirkt von der Seite wie eine Kugel mit Gesicht.

## Nächster Schritt: Bart als eigene Form (Florians Wahl vom 19.11.)

Sein 3/4 zeigt, wie er es meint: Das Weiß behält fast seine Frontform, und auf der nahen Seite erscheint breites Schwarz, der Kopf
hinter dem Bart. Also: **Bart und Schnauze ein eigener weißer Körper vor dem schwarzen Kopf.**

- Bart: von vorn genau sein Weiß (Augenkerben gemalt), Tiefe aus dem Weiß seiner Seitenzeichnung, vorn leicht gewölbt.
- Kopf dahinter: von vorn sein schwarzer Umriss, breit nur hinter dem Bart (Hinterkopf), vorn im Bart verborgen.
- Probe: Front wie bisher (über 90 %), 3/4 und Seite deutlich näher an seinen Zeichnungen, keine Balken.

Danach Körper, Beine, Schwanz nach demselben Weg (Körper und Beine aus der Seite aufgeblasen: das Logo zeigt den Körper von der Seite).
