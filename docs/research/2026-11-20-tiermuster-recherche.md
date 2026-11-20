# Recherche: Tiermuster und Schuppen als Shader (20.11.2026)

Florian nach Runde 3: „Tiere vor allem leopard, giraffe und schuppen von schlange und krokodil bekommst du noch besser hin. Mach gerne
2-3 verschiedene schlangen und schuppenarten. Bitte auch noch ein richtiges salamandermuster. Mache gerne nochmal eine recherche wie
das am besten umzusetzen ist. Gerne tiere auch in verschiedenen stilen wie spider-verse und earle.“

## Was die Quellen sagen

- **Schlangenhaut:** Ein eigenes Modell für Schlangenmuster (Pinheiro, Walter 2018: Bildverarbeitung und Zellularautomaten) statt
  allgemeiner Rauschmuster; für das Licht eine Mehrschicht-BRDF (Chalmers-Arbeit). In Substance: eine Schuppe bauen, kacheln, je
  Schuppe drehen. In GLSL harte Schwellen nie mit `step`, sondern geglättet, sonst flimmern die Kanten (Gustavson).
- **Schuppen der Klapperschlange:** gekielt (ein Grat längs der Mitte jeder Schuppe), am Rücken am stärksten, an den Seiten
  schwächer, Bauchschilde glatt; Rückenschuppen symmetrisch, rautenförmig; rund 25 Reihen um den Körper.
- **Leopard und Jaguar:** Zwei-Stufen-Turing-Modell (Liu, Liaw, Maini 2006): Tupfen sind die Grundform, Rosetten entstehen daraus;
  mit Wachstum teilen sich Flecken zu Rosetten (Malheiros u. a. 2020); dort wirkt das Bild vor allem durch die Richtung des Fells
  und seine Eigenschatten.
- **Giraffe:** eigentlich zwei Reaktions-Diffusions-Systeme (Walter u. a. 2001); praktisch Voronoi-Zellen, deren Rand aus dem
  Abstand zur nächsten und zweitnächsten Mitte kommt (gleich breite Adern), mit abgerundeten Ecken.
- **Krokodil:** auf dem Rücken Knochenplatten (Osteoderme) mit Grat, an den Flanken kleinere Schuppen, am Bauch glatte Schilde; der
  Kopf reißt beim Wachsen (Milinkovitch: Schuppen am Krokodilkopf sind Risse). In Substance: Zellen oder Kachelstreuung, Höhe mit
  Fase, verzogen gegen das Raster.
- **Feuersalamander:** keine Quelle mit Shader; bewährt: zelluläres oder Rauschmuster, geschwellt zu Flecken, gelb auf glänzendem
  Schwarz, nasse Haut mit feinen Poren.

## Was daraus folgt (Bauplan)

1. **Ein Stil-Schalter für alle Tiere:** echt, Spider-Verse (Comicdruck: flache Töne, Rasterpunkte im Schatten, Tuschekontur,
   versetzte Platte), Earle (Siebdruck-Stufen in Juwelfarben, getöntes Fast-Schwarz, Lichtpunkte, eigene Bühne).
2. **Schuppen** in regelmäßigen Reihen (eben, je nach Ausrichtung der Fläche eine von drei Ebenen), je Schuppe: Wölbung als Höhe,
  ein Schatten unter der überlappenden Kante, eigener Glanz; die Farbe an der Mitte der Schuppe (gezackte Grenzen Schuppe für
  Schuppe wie beim Tier). Arten: glatt (Python), gekielt (Klapperschlange), glänzend in Ringen (Korallennatter).
3. **Krokodil:** Rücken mit Platten, Grat und Grübchen; Flanken mit runden Höckern; Bauch mit glatten Schilden.
4. **Feuersalamander:** Schwarz mit gelben, zum Teil zu Streifen verbundenen Flecken, nasse Haut (scharfe Lichter), feine Poren,
  Drüsenwülste.
5. **Leopard:** Rosetten aus drei bis fünf Bruchstücken (C-Formen) um eine dunklere Mitte, dazwischen Vollflecken; Fell mit
  Richtung und Haarsaum. **Giraffe:** Zellen mit abgerundeten Ecken, gleich breite helle Adern, Flecken innen dunkler.

## Quellen

- [A Procedural Model for Snake Skin Texture Generation (Pinheiro, Walter 2018)](https://scitepress.org/Documents/2018/66264/)
- [Chalmers: Lighting model to render snakes](https://odr.chalmers.se/server/api/core/bitstreams/638316fd-54fb-4053-ac09-9cc1c3d48717/content)
- [80.lv: Creating procedural snakes in Substance Designer](https://80.lv/articles/creating-procedural-snakes-in-substance-designer)
- [Gustavson: Procedural Textures in GLSL](https://itn-web.it.liu.se/~stegu76/TNM084-2019/Insights_ch7.pdf)
- [Wikipedia: Keeled scales](https://en.wikipedia.org/wiki/Keeled_scales)
- [Whitman SnakeKey: Glossar](https://whitman.edu/snakekey/characterglossary.html)
- [Turk: Generating textures on arbitrary surfaces using reaction-diffusion](https://faculty.cc.gatech.edu/~turk/my_papers/reaction_diffusion.pdf)
- [Liu, Liaw, Maini 2006: Two-stage Turing model for leopard and jaguar (Phys. Rev. E)](https://link.aps.org/doi/10.1103/PhysRevE.74.011914)
- [Malheiros u. a. 2020: The leopard never changes its spots](https://mgmalheiros.github.io/research/leopard/leopard-2020-preprint.pdf)
- [Walter u. a. 2001: Clonal mosaic model for giraffe and big cat patterns (SIGGRAPH)](https://discmaster.textfiles.com/file/16662/SIGGRAPH%202001:%20Conference%20Proceedings.iso/mac/papers/walter/walter.pdf)
- [American Scientist: Self-organized scales](https://www.americanscientist.org/article/self-organized-scales)
- [Osteoderme (The World of Crocs)](https://sites.google.com/view/theworldofcrocs/design-hub/design-guide/mut-storage/osteoderms)
