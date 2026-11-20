# Übergabe: Maul, Zähne, Zunge (Stand 20.11.2026)

**Wo:** Zweig `claude/ozzy-maul` (vom Paint-Zweig `claude/reverent-feynman-1efdd3`, Stand `49f1557c`; er enthält `claude/ozzy`, die
Objekte und den Paint-Modus). Arbeitsbaum `.claude/worktrees/ozzy`, Fenster 5205 (Eintrag `ozzy`). `claude/ozzy` selbst steht
weiter auf `6bef9f17`: zusammengeführt ist nichts, das bleibt Florians Wort.

**Was es gibt:** ein Konzept und eine Studie. **In Ozzy, am Werk und am Rechenkern ist nichts geändert.**

- Konzept (zur Freigabe): [`docs/plans/2026-11-20-ozzy-maul-zaehne-zunge.md`](../../../plans/2026-11-20-ozzy-maul-zaehne-zunge.md).
  Oben Florians Auftrag wörtlich; Abschnitt 3 die Definition („das Maul ist ein Schnitt, kein Umbau“), 4 die Bedienung, 8 was die
  Studie beweist und was nicht, 9 die Etappen, 10 was bei ihm liegt.
- Recherche: [`docs/research/2026-11-20-maul-zaehne-zunge-recherche.md`](../../../research/2026-11-20-maul-zaehne-zunge-recherche.md).
- Bildblätter: `docs/progress/ozzy/2026-11-20-maul-aus-einer-linie-bogen.jpg`, `…-zaehne-linse-zunge-bogen.jpg`.
- Studie: `http://localhost:5205/maul.html` (`apps/editor/maul.html`, `apps/editor/src/maulstudie/`).

**Sein Urteil steht aus.** Gefragt ist er nach zwei Dingen: ob der Weg trägt, und ob Etappe 1 in Ozzy beginnen soll. Nichts aus den
Etappen ohne sein Wort bauen.

## Die Studie in einem Absatz

Sie lädt eine gesicherte Form (`/__wesen/<Name>`: Haut des Rechennetzes und Linien), verfeinert sie ein- oder zweimal (Loop) und
zeigt sie mit dem Wachs. Eine Linie in der Seitenebene (vom Mundwinkel nach vorn) wird das Maul: Die Haut wird längs der Linie
gerade von Seite zu Seite aufgeschnitten (`schnitt.ts`, mit `manifold-3d` wie der Verbund), die zwei Wände sind Gaumen und Boden.
Jeder Punkt bekommt eine Seite (links oder rechts der Linie) und ein Gewicht; `kieferStellen` dreht ihn um den Mundwinkel. Zähne
sitzen an Plätzen der Wand (`gebiss.ts`, Formen aus `zahn.ts`), die Zunge ist eine Kette mit Federn (`zunge.ts`), die Linse mit
Formenring und Drehregler steht in `linse.ts`. `main.ts` hält alles zusammen (Bühne, Eingaben, Leiste, Haken `window.__maul`).

## Was man wissen muss

- **Zu zeigt die Studie die Form selbst** (`koerperNetz`), nicht die geschnittene Haut: Die Bibliothek braucht einen Spalt mit
  Breite, und der wäre als Haarlinie zu sehen (276 bis 509 Bildpunkte). Im Bau: die Dreiecke an der Linie direkt teilen, Breite
  null.
- **Seiten und Drehsinn:** Das Profil läuft vom Mundwinkel nach vorn. Links der Laufrichtung öffnet gegen den Uhrzeigersinn, rechts
  mit ihm. Welche Seite der Oberkiefer ist, sagt `obenLinks` (bei einem Maul, das nach −x zeigt: falsch).
- **Das Gewicht** (`kieferFeld`): vor dem Mundwinkel 1 bis zur Reichweite (in Längen der Lippe, Standard 1,0, Auslauf bis 1,9),
  hinter dem Mundwinkel über den Winkel um das Scharnier auslaufend (95° bis 165°). Im Auslauf werden die Normalen aus der
  gestellten Haut neu gerechnet (`auslaufNormalen`), sonst schattiert die gedehnte Haut falsch.
- **Die Farbe der Wand** rechnet je Bildpunkt den Abstand zur Lippe aus einer Tabelle „halbe Breite des Mauls über s“
  (`MaulSchnitt.breite`, geglättet). Die Wand hat fast keine eigenen Punkte (alle liegen auf der Lippe): Farbe je Punkt ginge
  nicht.
- **Zähne innen** werden nie länger als der Spalt zwischen den Kiefern (`zaehneStellen`); Zähne vor der Lippe behalten ihre Länge.
- **Die Linse** fängt den Zeiger (`setPointerCapture`): Beim Loslassen meldet der Browser das Feld, nicht mehr das Zeichen unter
  dem Zeiger. Was angetippt wurde, beim Drücken merken.
- **Ein Strahl von three trifft bei einem einseitigen Material nur beim Eintreten.** Wer die Dicke der Form braucht, schießt von
  beiden Seiten (`dickeBei`).
- **Fenster 5205:** Der alte Server war mit dem Wechsel des Zweigs weg; neu gestartet über den Eintrag `ozzy`. Er gehört der
  Sitzung, die ihn gestartet hat; endet sie, muss ihn die nächste neu starten.

## Bilder neu machen

```bash
# aus apps/editor; das Fenster 5205 muss laufen
node scripts/ozzy/maul-studie-bilder.mjs <ordner>     # 25 Aufnahmen und zahlen.json, rund 90 s
node scripts/ozzy/maul-studie-bogen.mjs <ordner>      # setzt die zwei Bildblätter nach docs/progress/ozzy/
```

## Geprüft

Typen (`pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`) und Lint (`eslint src/maulstudie`) sauber. Tests gibt es für
die Studie keine. An Ozzy ist nichts geändert, seine Proben habe ich nicht laufen lassen.
