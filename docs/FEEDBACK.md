# Feedback-Katalog (Florian, 2026-09-29 Nacht) — Richtung für die zweite Iteration

**Hauptreferenz ist der gesamte Ordner `ref/eyvind earle/` (45 Gemälde, lokal, nicht im Git) — von Anfang an.** Die zehn Bilder in `ref/feedback-2026-09-29/01–10.webp` sind gute Beispiele daraus; das Bild aus dem ersten Briefing war ebenfalls nur ein Beispiel. Zuordnung der zehn Beispiele:

| Nr. | Bild | Welt-Idee | Kernmerkmale |
|---|---|---|---|
| 01 | Blauer Riesenbaum auf grünen Hügeln | Wooding-Held / "Flechtenbaum" | Stamm aus schwarz-blauen Bändern mit Flechten-Mosaik (rot/grün/gelb/weiß), violette Punktkuppeln, dünne lila Bäume, gelbgrüne Hügel |
| 02 | Grüne Nebelhügel | Luzz "Nebelhügel" | dunkle Kuppelwälder mit feinsten Punkten, grüne Rampen, weiße Nebelstreifen, Kühe |
| 03 | Kuppelbaum-Nahaufnahme | Baum-Modul | Kuppeln aus gestapelten Kugeln, Punkte nur am Rand, dunkler Kern, dünner Stamm |
| 04 | Violette Hänge, gelber Hang | "Violette Hänge" | blaue Kuppelhügel, gelber Hang mit Kühen, dunkle Kuppelbäume mit Punktrand, fraktaler kahler Baum |
| 05 | Blauer Baum mit Wurzeln | "Wurzelwelt" (Winter-Blau) | schwarze Wurzel-/Astfraktale, bronze Sternnadeln, cremefarbener Schneehang mit Streifen |
| 06 | Blauer Schneeberg mit Kiefern | "Schneekiefern" | schwarze Dreieckswälder mit weißen Punkten, weiße/blaue Schneeflächen, messerscharfe Kanten |
| 07 | Blauer Kathedralenwald | "Kathedralenwald" | hohe dünne weiße Stämme, geschichtete Kronen, tiefes Blau, Kulissenebenen |
| 08 | Rote Scheune im Schnee | "Rote Scheune" (ganze Welt in diesem Stil) | schwarzer Baum mit weißen Flechten, Grau-Himmel, rote Bretterwand mit feinen Strichen, Schnee mit Linien |
| 09 | Goldene Wiese mit Kuh-Schatten | "Goldene Wiese" | überlange harte Schatten, Gelb gegen Dunkelgrün, Punktrand an Kuppeln |
| 10 | Juwelenwald mit gestreiften Stämmen | "Juwelenwald" (ganze Welt in diesem Stil) | rote/blaue/violette Kuppeln mit Rautenmustern, gestreifte Stämme mit Flechten, cremefarbener Himmel, Perspektivlinien am Boden |

## Anforderungen (Checkliste)

**Kreaturen**
- [x] Körpertypen: Blob, Schlange (schlängelt), Vierbeiner (läuft wirklich), REX-artig (Zweibeiner mit Kamm), dick/behäbig vs. leicht/hüpfend — ✓ `/lab/creature` → Bewegung, Parcours
- [x] Physikalisch korrektes Springen wie ein Schleimblob (Anlauf-Squash, Stretch im Flug, Aufprall-Splat) — ✓ Schleimsprung mit Anlauf, Stretch, Splat
- [x] Rüssel und Beine mit eigenen Animationen; Gang aus Schrittzyklus + IK; Schlangen-Wellenbewegung — ✓ Gang mit Bein-IK, Rüssel schwingt/rollt, Schlange folgt der Kopfspur
- [x] Materialien: Fell, Federn; Gas/Flüssig/Feuer deutlich besser und Earle-haft — ✓ `/lab/blob`: Fell-Locken, Feder-Dachziegel, Gas als Nebelwesen, Feuer 4 Bänder, Flüssig mit Wellenringen
- [x] Muster: Tiger, Giraffe, Zebra, Schlange, Punkte — prozedural, Earle-Palette — ✓ Artpaletten, Streifen quer zur Wirbelsäule
- [x] Augen und Module reicher (Iris, Pupille, Lider; Hörner mit Rillen; Rüssel mit Falten) — ✓ 32 Module mit Iris/Pupille/Lid, Rillen, Falten, Gelenken
- [x] Mehr Variation; Editoren mit besserer Usability — ✓ 7 Arten + Zufall; Level-Editor v2 (iPhone), Creature-Editor mit Körper-Tab/Undo

**Map / Welt**
- [x] Zehn Welten, je eine pro Referenzbild, alle auf dem Planeten (Welt 08 und 10 komplett im Bildstil) — ✓ `/lab/earle` Weltenwahl; Pass 2 mit Gemälde-Kompositionen
- [x] Viel mehr Höhe und Perspektive, übertriebene Verzerrung — ✓ eigene Kamera je Welt, Krümmungs-Boost, FOV 80–88°
- [x] Großer Earle-Baum als Wahrzeichen; Levelpfad führt den Baum hoch und entlang der Riesenkrone — ✓ `/lab/tree`; Level 80–95 klettern Stamm und Krone
- [x] Blüten mit zenartigen geometrischen/mathematischen Animationsloops in Earle-Farben — ✓ Goldener-Winkel-Spirale, 1:φ-Sway, 9-s-Atmen
- [x] Müll der Anfangswelt sichtbar (Schrotthügel, rostige Monolithe, Ölpfützen, Gasquellen), verschwindet mit Wachstum — ✓ Schrotthügel, Rostmonolithe, Ölpfützen, Gasquellen, Reifen; versinken mit Wachstum
- [x] Raffiniertere Shader: animierte, sehr feine Vektortexturen (Stämme, Flechten, Streifen) — ✓ Streifen/Flechten/Bretter/Schneelinien/Bodenstrahlen mit fwidth-AA

**Spielfeld / Übergänge**
- [x] Spielfeld viel cooler; Sondersteine mit echter Visualisierung (keine leeren Klötze) — ✓ alle Elemente visualisiert und animiert (`/lab/grid` → Elemente-Schau)
- [x] Morph Map → Spielfeld spektakulärer, alles flüssiger und dynamischer — ✓ Hügel hebt sich, Platten-Welle, Held-Sprung mit Splat

**Schatten (Florian, 2026-09-29 spät, höchste Priorität)**
- [x] Schattenkanten sind stufig (Treppen = vergrößerte Schattenkarten-Texel bei 10°-Sonne und großer Planetenansicht). Ziel: **super smooth und exakt wie im Gemälde** — messerscharfe, aber glatte Vektor-Kurven, 1-px-Antialiasing, keine Treppen, kein Weichzeichnen, kein Flimmern beim Drehen. Vorher-Bild: `docs/progress/p2e-shadow-before-iphone.webp`. — ✓ Schatten v2: Kaskaden + B-Spline-Kante (`/lab/shadow`), WebKit-Fallback

**Kreaturen & Spielfeld (Florian, 2026-09-29 Nacht, zweites Feedback)** — Referenz: seine Draufsicht-Skizze `assets/ref-florian/08-blob-animation-draft.png`
- [x] Spielfeld viel mehr von oben (Draufsicht, ~65°) — ✓ ~65° (Hochformat 67°)
- [x] Bewegung langsamer und entfernungsabhängig (weiter Weg = länger), andere Dynamiken; Merge langsamer und lesbarer — ✓ 150 ms + 90 ms/Feld, Schwere 220 + 120
- [x] Nur bewegte Figuren drehen sich in Wischrichtung — ✓
- [x] Funktionierendes, animiertes Maul (öffnen, kauen, brüllen, verschlingen); Blob mit Maul-Sichel in Bewegungsrichtung wie in der Skizze — ✓ öffnen/kauen/brüllen/gähnen/verschlingen
- [x] Beine: als Assets **und** 2/4 dicke Stampfer direkt aus dem Körpermaterial geknetet (SDF), nicht angehängt — ✓ geknetete Stampfer + Beinmodule
- [x] Schlange schlängelt dynamisch (Wirbelsäule folgt dem Kopf, Welle, S-Kurven) statt sich wie ein Stock zu drehen — ✓ Kopfspur, S-Kurven, Einrollen
- [x] Mutierte Wesen näher an der Skizze — besonders REX (pink, Stachelkamm), Giraffe (langer Hals, Flecken), Elefant (Ohrenlappen, Rüssel), dazu Retriever, Maus, Ente — ✓ `/lab/creature` → Skizze
- [x] Merge viel spektakulärer und interaktiver: Wesen mit starken Beinen/Flügeln springen zur Kamera hoch, reißen das Maul auf und verschmelzen beim Herunterfallen; mehr Splash-Effekte — ✓ leapToCamera mit Maul am Apex, Splash-Kronen, Tropfenbögen, Kamera-Punch
- [x] Muster perfektionieren: Augen dürfen nicht im Muster untergehen; Fell und Federn verbessern — ✓ Gesichtsmaske mit Sklera-Ring
- [x] Sessionlimit: automatisch weiterarbeiten → geplante Aufgabe `early-earle-weiterarbeiten` (alle 3 h, nur wenn 2 h Ruhe) — ✓

**iPhone first**
- [x] Auf dem iPhone mit vollem Liquid Glass und App-Funktionen testbar (Capacitor-Build, natives Glas-HUD, Haptik) — ✓ im Simulator verifiziert (`pnpm ios:sim`); Gerät braucht Apple-ID-Signierung


## Stand 2026-09-30 (früh) — für die nächste Rückmeldung

Erledigt (siehe Häkchen); offen bzw. nur teilweise:
- [ ] **iPhone-Gerätetest** mit nativer App: braucht Florians Apple-ID in Xcode (Anleitung `docs/IOS.md`); Safari-Test über `https://<Mac-IP>:5173` geht sofort.
- [ ] Klang (prozedural, in Arbeit), REX im Flow vollständig verdrahtet (in Arbeit), Mesh-Körper auf dem Brett (in Arbeit).
- [ ] Offene Designfragen im GDD-Nachtrag (Strahl-Regel, Rettungs-Ausgang, Streuner-Regel, Öl in Syrup …).
