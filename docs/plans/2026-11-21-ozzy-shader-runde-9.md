# Ozzy, Shader Runde 9: Schleim neu, Felsen, Schlangen, Barcelonas Straßen, Gaudí neu, Ghetto, Punk, Neon, Natur, Nachtschatten, Sin City (21.11.2026)

Florian (wörtlich): „Der slime gefällt mir leider noch garnicht und beim stein dachte ich eher an felsen und realistische natürliche
steintexturen. Die verzogenen schuppen gefallen mir bei den schlangen nicht. Es sieht noch nicht realistisch genug aus. Bitte auch
noch so richtig roughe shader die die rauen straßen barcelonas wiederspiegeln. lass dir hier etwas richtig cooles einfallen. Der
erste gaudi shader sieht gut aus. Die beiden anderen gefallen nicht (casa battlou und casa familia. Denke wieder mehr out of the box.
Gerne auch die spider verse shader wieder mehr miteinbeziehen. Bitte noch mehr gaudi ideen und "Ghetto" und "punk" und neon und
natur. Ich will hier ganz tolle dinge entwickeln. Hier ist der richtige platz für jedes experiment. Wir sortieren dann aus was taugt
und was nicht. SChau dir das material von drachenzähmen leicht gemacht des nachtschatten an und mache es noch besser und auch 3
materialien die frank millers sin city als inspiration nutzen. Nicht so viele kombinationen. Bei fell und muster ging das zu weit.
Lieber einzelne shader richtig ausfeilen und eigene ausgefeilte versionen pro stil machen wenn etwas funktioniert.“

Vorlagen (`docs/look/ozzy/shader/vorlagen/`): `2026-11-21-r9-schleimgeist.webp` (grüner Schleimgeist mit Skelett, Glühen, Blasen,
Dampf), `…-r9-tropfschleim.webp` (Schleimschicht mit Tropfspuren auf einer Kugel), `…-r9-bruchsteinmauer.webp` (Kalksteine mit hellem
Mörtel), `…-r9-panot-flor.webp` (Barcelonas Gehwegplatte mit Blume), `…-r9-flor-popart.webp` (die Blume als Pop-Art).
Recherche: `docs/research/2026-11-21-runde-9-recherche.md`.

## Regeln dieser Runde (Florian)

- **Einzelne Shader ausfeilen statt Regler-Kombinationen.** Was in einem Stil wirkt, bekommt eine eigene, ausgefeilte Fassung je Stil
  (eigener Shader), keine Stufenregler über viele Stile und Muster.
- Was nicht gefällt, fliegt aus der Wahl (Casa Batlló, Sagrada Família, der alte Schleim).

## Etappen

1. **Schleim neu:** (a) Schleimgeist: durchscheinend, glühender Kern, ein Skelett im Inneren (Abstandsfeld, durch die Dicke abgetastet),
   Blasen, Dampf, Funken; (b) Tropfschleim: bucklige, sehr glänzende Schicht mit Tropfspuren nach unten, neongrün mit gelben Stellen.
2. **Felsen und Natursteine:** Fels (Risse, Verwitterung, Flechten, Moos) und Bruchsteinmauer nach der Vorlage.
3. **Schlangen:** keine verzogenen Schuppen mehr (wo das Feld verzerrt, kleine Schuppen wie am Kopf), kleinere Schuppen, feinere Fugen,
   Glanz je Schuppe: realistischer.
4. **Barcelona:** Panot de flor (rau, abgenutzt, nass), die Blume als Pop-Art im Spider-Verse-Druck, neue Gaudí-Ideen statt Casa Batlló
   und Sagrada Família, Trencadís als eigene Fassung im Spider-Verse-Stil.
5. **Ghetto, Punk, Neon, Natur:** je ein bis zwei ausgefeilte Shader.
6. **Nachtschatten** (besser als im Film) und **drei Sin-City-Shader**.
7. **Bilder, Übergabe, was bleibt.**

## Proben

Je Shader Bilder an „strange bird“ (Übersicht und nah), Konsole ohne Fehler, Typen und Lint. Sein Auge entscheidet; er sortiert aus.

## Stand (21.11.2026)

Gebaut, alle an „strange bird“ geprüft (Konsole ohne Fehler, Typen und Lint), Bilder `docs/progress/ozzy/shader/2026-11-21-runde-9-*.png`:

1. **Schleim neu** (6d7e403e): Schleimgeist (Skelett als Abstandsfeld durch die Dicke, glühender Kern, Blasen, Dampf, Funken) und
   Tropfschleim (bucklige nasse Schicht mit Tropfspuren); der alte Schleim ist heraus.
2. **Felsen** (42580e4c): Fels (Relief in vielen Maßstäben, Bruchflächen, Risse, Mineralkörner, Wasserspuren, Rost, Flechten, Moos)
   und Bruchsteinmauer nach der Vorlage.
3. **Schlangen** (ddb7bb53): Die Längsphase folgt der Dichte der Querphase (keine in die Breite gezogenen Schuppen mehr), wo das Gitter
   trotzdem verzerrt ist, liegen Körnchen wie am Kopf; kleinere Schuppen, feinere Fugen, Glanz je Schuppe, Schiller im Glanz.
4. **Barcelona** (ac7a9b14): Panot (nachts nach dem Regen), Flor Pop (Spider-Verse-Druck), Persiana (Rollladen mit Graffiti), La
   Pedrera (Kalkputz und Trencadís aus Marmor und Flaschenglas), Trencadís Verse; Casa Batlló und Sagrada Família heraus.
5. **Straße und Natur** (39668918): Hall of Fame, Nietenleder, Neon Rot, Argon Blau, Platane.
6. **Nachtschatten und Sin City** (053eccdb): Nachtschatten, Nachtschatten Alpha, Sin City Regen, Gelb, Rot.

Jetzt 94 Shader in elf Gruppen. Offen (Punkte 54 bis 61 in `2026-11-20-ozzy-shader-was-bleibt.md`): Gòtic-Mauer, Studentenblumen,
Walrippen, Sticker-Bomb, Tartan, Neonröhren, Moos, Tagschatten, Innenabstand, Reliefschatten für Fels und Mauer.
