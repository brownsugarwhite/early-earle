# 14 · Nachtrag: Tempo-Budget der ganzen Kette auf iPhone 16, iPad und Mac

Nachrecherche 3 zur Editor-Recherche („Studio“), Stand 20.11.2026. Ordner `docs/research/2026-11-20-editor/`.

**Frage.** Was kostet je Bild (a) das Auswerten der Figur (Rahmen und Rest, PCHIP über viele Schlüssel, Skinning mit
Drehzentren, Wächter), (b) das Abflachen mit fester Stückzahl, (c) die Abstandsfelder für Figur, Welt und Effekte über die
ganze Bühne (Weltpfad, Pfützen, Tropfen auf der Kamera, zweite Figur als zweiter Feldsatz), (d) Physik und Spiellogik und (e) im
Editor zusätzlich der Autorig bei jeder Formänderung, die „Spur der Zukunft“ und Live-Werte in den Panels? Welche Grenzen setzen
iOS und WebKit in Safari und in der WKWebView von Capacitor: Bildtakt im Stromsparmodus und bei Wärme, Speicher, Speicherbereinigung,
Verlust des WebGL-Kontexts, Start von WebAssembly? **Ergebnis:** eine Budget-Tabelle je Posten mit öffentlichen Vergleichswerten
(A18 gegen M3 Pro) und der Entwurf einer einzigen Messseite, die die getrennten Proben aus 07, 08, 09, 10 und 11 ersetzt.

**Warum.** Florians Maßstab lautet „Die Performance muss immer top sein“. Die Berichte dieser Reihe stützen ihn bisher nur mit
Schätzungen: 09 „unter 0,2 ms je Takt“ (unter der Annahme, ein iPhone-Kern sei so schnell wie ein M-Kern), 10 „grob 5 bis 9 ms
allein für die Figur“, 03 „weit unter einer Millisekunde“, 06 „Bruchteile einer Millisekunde“, 07 „unter 50 ms“. Nichts davon ist
auf dem iPhone gemessen. Das Budget aus 10 („Grafikkarte, ganze Szene ≤ 8 ms“) ist für die Szene aus 13 nicht durchgerechnet.

**Methode und Grenzen.** Primärquellen: der WebKit-Quelltext (Bildtakt, Wärme, Zeichenfläche, WebGL), WebKit-Bugzilla, Apples
Dokumentation (Meldungen zu Strom und Wärme, Metal-Tabellen vom 23.10.2026), MDN, Dokumentation von Box2D, Skia, Unity, Spine und
Rive, der WebKit-Blog (Speicherbereinigung, JIT, WebAssembly) und ein Aufsatz (Valve 2007). Vergleichswerte stammen aus
Testberichten (Notebookcheck, Beebom, Tests zum Stromsparmodus) und Geekbench-Sammlungen. Stimmen von Nutzern kommen aus den
Apple-Entwicklerforen, Foren von Babylon.js und GreenSock, Blogs und Fehlerberichten von Spieleentwicklern. **Grenzen:** Auf dem
iPhone ist weiterhin nichts gemessen. Alle iPhone-Zahlen sind Rechnungen aus öffentlichen Vergleichswerten und den Mac-Messungen des
Prototyps. Sie sind als „Rechnung“ oder „Schätzung“ gekennzeichnet und gelten auf etwa ±50 % genau. Der Test von GSMArena lag hinter
einer Sperre für Abrufe, er ist nur über Suchauszüge belegt; das Khronos-Wiki war gesperrt. Welche M3-Pro-Fassung (14 oder 18
Grafikkerne) und welches iPad Florian hat, ist offen. Die Berichte 01 bis 13 habe ich vorher gelesen, soweit sie Tempo betreffen.

---

## Kurzfassung

1. **Der Stromsparmodus halbiert den Bildtakt auf 30 Hz, Wärme allein nicht.** Im WebKit-Quelltext zählt der Stromsparmodus zu den
   Gründen für halbe Geschwindigkeit. Ein WebKit-Entwickler nennt das Absicht (eingeführt 2017). Ab der Wärmestufe „serious“ setzt
   WebKit zwar einen eigenen Grund, der bündelt aber nur Timer. Den Bildtakt halbiert er nur, wenn eine interne Einstellung an ist,
   und die ist im Standard aus. Die Vermutung „bei Wärme 30 Hz“ stimmt damit für WebKit nicht. Wärme wirkt anders: Das iPhone 16
   hält unter Dauerlast nur 66 bis 78 % seiner Grafikleistung. Wird ein Bild dadurch länger als 16,7 ms, fallen Bilder
   **unregelmäßig** aus.
2. **Weitere 30-Hz-Fallen:** iframes fremder Herkunft (bis man hineintippt) und „Adaptive Power“ ab iOS 26, die auf dem iPhone 16
   den Stromsparmodus bei 20 % Akku einschalten kann. Im Stromsparmodus sinkt außerdem die Leistung eines Prozessorkerns um rund
   60 %, gemessen am A18 Pro.
3. **Ein iPhone-16-Kern ist im kurzen Lauf so schnell wie ein M3-Pro-Kern.** JetStream 2 (280 gegen 307,5), Speedometer 2.0 (539
   gegen 549), Octane (96 054 gegen 96 501) und Geekbench 6 Einzelkern (rund 3 200 gegen 3 100) liegen innerhalb von ±10 %. Die
   Annahme aus 09 stimmt also für kurze Last. Unter Dauerlast kommt der Faktor 1,3 bis 1,5 dazu, im Stromsparmodus rund 2,5.
   Prozessorzeiten, die am Mac **in Safari** gemessen sind, lassen sich damit fast eins zu eins übertragen.
4. **Die Grafikkarte des M3 Pro ist drei- bis viermal so stark, nicht zwei- bis dreimal.** 3DMark Wild Life Extreme, GFXBench
   Aztec 4K und Geekbench Metal ergeben die Faktoren 2,9 bis 3,8 (Grafik) und 2,4 bis 2,8 (Rechnen), die Speicherbandbreite 2,5
   (150 gegen rund 60 GB/s). Warm wird daraus 4 bis 5,5. Beide Chips gehören zur selben Metal-Familie (Apple9). Der Mac zeigt also
   richtig, was geht, nur nicht wie schnell.
5. **Umgerechnet kostet der heutige Renderer auf dem iPhone 6 bis 11 ms je Million Bildpunkte (kalt), warm 8 bis 17 ms.** Am Mac
   sind es 2 bis 3 ms. Das iPhone 16 hat 3,0 Millionen Bildpunkte. **Felder über die ganze Bühne in voller Dichte kosten
   rechnerisch 17 bis 34 ms und gehen bei 60 Hz nicht.** Vorhersage zum Prüfen: Der Prototyp, über den ganzen Bildschirm in
   dreifacher Dichte, hält auf dem iPhone keine 60 Bilder je Sekunde.
6. **Die ganze Szene aus 13 passt in 8 ms Grafikzeit, aber nur mit vier Maßnahmen:** Felder nur im Rahmen jeder Figur, Felder in
   halber Auflösung mit voller Bildauflösung (Valve-Verfahren; die Spitzen müssen geprüft werden), die Welt einmal gebacken oder
   analytisch (das Rad ist ein Kreis mit Höhenprofil) und Pfützen und Kameratropfen als wenige analytische Tropfen im Bilddurchgang.
   Rechnung: 3,4 bis 8,2 ms kalt. Der Kachel-Durchgang (Stufe 2 aus 10) bleibt die Reserve.
7. **Prozessor: Die Kette (a) bis (d) samt Zeichenbefehlen kostet für Ozzy rund 1 bis 2,5 ms, wenn sie keinen Speicher wirft.**
   Das Budget beträgt 6 ms. Der Prototyp rechnet heute in PCHIP bei jedem Aufruf alle Steigungen neu und legt dabei vier Felder an.
   Das sind geschätzt 1 bis 2 ms je Bild und Tausende Würfe für die Speicherbereinigung; zusammen mit Hunderten WebGL-Aufrufen kommt
   der heutige Stand auf geschätzt 2 bis 5,5 ms. Die Abhilfe ist einfach: Steigungen nur neu rechnen, wenn sich Schlüssel ändern, und
   die Zeichenbefehle bündeln.
8. **Speicher: Es gibt keine feste Grenze, aber iPhones sind strenger als iPads.** Beobachtet wurden Abbrüche des Webprozesses bei
   1,25 GB und bei 2 GB. Nach mehrmaligem Neuladen bekommt WebAssembly teils nur noch 300 bis 500 MB. Höchstens 16 WebGL-Kontexte je
   Seite sind möglich. Feldtexturen über den ganzen Bildschirm brauchten rund 180 MB, im Rahmen und in halber Auflösung nur 10 bis
   30 MB.
9. **Kontextverlust ist auf iOS real.** Gemeldet wurde er nach dem Wechsel in den Hintergrund (iOS 17, in 17.1 behoben) und als
   Treiberabsturz (iOS 18, behoben). Was die Grafikkarte zeigt, muss sich deshalb jederzeit aus Daten neu aufbauen lassen.
10. **Speicherbereinigung und Start:** Die Pausen der Speicherbereinigung von WebKit bleiben meist bei 1 ms oder darunter, werden
    aber mit vielen Würfen häufiger. Das WebAssembly von Box2D (612 KB) braucht zum Übersetzen rechnerisch 10 bis 40 ms. Shader
    übersetzen blockiert in Safari trotz Erweiterung; deshalb alle Shader beim Laden übersetzen.
11. **Editor:** Der Autorig gehört in einen dauerhaften Worker und läuft nach dem Loslassen, nie in jedem Ziehbild (geschätzt bis
    50 ms je Lauf). Für die Spur der Zukunft kostet volle Physik über 1 bis 2 s rund 18 bis 84 ms. Einzelne Federn lassen sich
    geschlossen in Mikrosekunden rechnen, Ketten und Welt im Worker; die Geister werden als Umrisse gezeichnet. Live-Werte reichen
    mit 15 Hz. `requestIdleCallback` fehlt in Safari.
12. **Messen in Safari ist eingeschränkt.** `performance.now()` löst ohne Cross-Origin-Isolation nur 1 ms auf, mit Isolation
    20 µs. Die GPU-Zeitabfrage fehlt auf iOS praktisch ganz (0,25 % der Geräte). Die Messseite misst deshalb Stapel mit
    Synchronisierung und die Reserve bis zum ersten verpassten Bild.
13. **Eine Messseite `tempo.html` ersetzt die fünf Einzelproben.** Sie hat zehn Blöcke, einen Knopf, braucht rund 15 Minuten je
    Gerät, misst den echten Code mit vorher festgelegten Kriterien und schreibt das Ergebnis als Datei nach `docs/progress/tempo/`.
    Abschnitt 7 beschreibt sie.

---

## 1 Ausgangslage: Was die Berichte schätzen, und was davon bleibt

| Bericht | Aussage | Grundlage | Stand nach dieser Recherche |
| --- | --- | --- | --- |
| 03 | Mischen über wenige Schlüssel und bis vier Knochen je Anker: weit unter 1 ms | Schätzung | Gilt nur für Code ohne Speicherwürfe. Der Prototyp legt je PCHIP-Aufruf vier Felder an (Abschnitt 5.1). |
| 06 | Schritte 1 bis 6 bei einigen hundert Ankern: Bruchteile einer Millisekunde | Überschlag | Als Größenordnung bestätigt (0,1 bis 0,4 ms nach Rechnung in 5.1). |
| 07 | Autorig in unter 50 ms | Schätzung | Tragbar als Worker-Aufgabe nach dem Loslassen. Im Ziehbild geht es nicht. Ein Worker läuft auf einem Kern so schnell wie am Mac, aber das iPhone hat nur zwei Leistungskerne. |
| 08 | Figurphysik: Bruchteil einer Millisekunde | Erfahrung | Plausibel; im Stromsparmodus mal 2,5. |
| 09 | Ozzy, Rad und 50 Hindernisse unter 0,2 ms je Takt, Annahme iPhone-Kern gleich M-Kern | Box2D nativ am M2, Aufschlag für WebAssembly | Die Annahme stimmt für kurze Last (±10 %). Warm mal 1,3 bis 1,5, im Stromsparmodus mal 2,5. |
| 10 | iPhone grob 5 bis 9 ms für die Figur bei 1000 × 1000 (Faktor 2 bis 3); Budget Grafik ≤ 8 ms; ganze Bühne rund 20 GB/s | Mac-Messung, Fremdangaben | Der Faktor liegt bei 3 bis 4 (kalt) und 4 bis 5,5 (warm), also 6 bis 11 ms je Million Bildpunkte, warm 8 bis 17 ms. Das Budget von 8 ms ist richtig gewählt (Abschnitt 6). Die ganze Bühne passt nur mit den Maßnahmen aus 5.3. |
| 11 | 60 Hz als ehrliche Referenz | WebKit-Einstellung | Gilt. Es gibt aber 30 Hz im Stromsparmodus und in fremden iframes; der Editor muss das anzeigen. |
| 13 | Szene mit Weltpfad, Pfützen, Tropfen auf der Kamera, zweiter Figur | Spielentwurf | In Abschnitt 5.3 durchgerechnet. |

Was der Prototyp heute misst (`docs/look/ozzy-figur/UEBERGABE.md`): Am Mac bei 1000 × 1000 Bildpunkten und mit Warten in jedem
Bild braucht Safari 2,0 bis 3 ms, Chrome 2,6 bis 3,6 ms. Unter fremder Last (Illustrator, Simulator) sind es 5 bis 9 ms. Eine
größere Reichweite der Felder (R von 40 auf 88 Bildpunkte) hat die Zeit verdoppelt (3 auf 6 ms); mit einer Reichweite je Teil
waren es dann rund 4 ms. Der Schalter „Dauerlauf“ der Seite misst Bildabstand, Prozessorzeit und, wo vorhanden, die Zeit der
Grafikkarte. Die Messung auf dem iPhone steht seit dem 18.11. aus.

---

## 2 Die Geräte im Vergleich (öffentliche Werte)

| Größe | iPhone 16 (A18) | MacBook Pro M3 Pro (11 Kerne/14 Grafikkerne · 12/18) | Faktor Mac : iPhone | Quelle |
| --- | --- | --- | --- | --- |
| Geekbench 6 Einzelkern | 3 141 bis 3 409 (Tests), Sammlung 3 202 | rund 3 113 (Mittel 11 Kerne) | **≈ 1,0** | Beebom, Notebookcheck, EveryMac |
| Geekbench 6 Mehrkern | 7 793 bis 8 492 | rund 14 400 | 1,7 bis 1,8 | ebenda |
| JetStream 2 (Browser) | 280 | 307,5 (11 Kerne) | **1,1** | Notebookcheck |
| Speedometer 2.0 | 539 | 549 | **1,02** | Notebookcheck |
| Octane 2 | 96 054 | 96 501 (12 Kerne) | **1,0** | Notebookcheck |
| 3DMark Wild Life Extreme Unlimited | 4 142 (Test iPhone 16) | 12 094 / 14 545 | **2,9 / 3,5** | Notebookcheck |
| GFXBench Aztec Ruins 4K Offscreen | 25,5 B/s | 79 / 97,8 B/s | **3,1 / 3,8** | Notebookcheck |
| GFXBench Aztec Ruins High Offscreen | 52,3 B/s | – / 219,7 B/s | 4,2 | Notebookcheck |
| Geekbench 6 Metal | 28 030 | 68 043 / 78 324 | 2,4 / 2,8 | Beebom, Notebookcheck |
| Speicherbandbreite | rund 60 GB/s (Fremdangabe; Apple: 17 % mehr als A16) | 150 GB/s | 2,5 | Tom's Hardware, Notebookcheck |
| Metal-Familie | Apple9 | Apple9 | gleich | Apple, Metal-Tabellen |
| Dauerlast Grafik (3DMark-Stresstest) | 65,8 % (Beebom), 68,7 % (Notebookcheck), 78 % (GSMArena, Suchauszug) | kein Verlust (Notebookcheck) | warm zusätzlich 1,3 bis 1,5 | ebenda |
| Leistungsaufnahme Grafik | rund 6 W (Angabe Notebookcheck) | rund 24 bis 28 W | – | Notebookcheck |
| Oberfläche unter Last | 44 bis 45 °C | – | – | Notebookcheck |
| Anzeige | 60 Hz, 2556 × 1179, Dichte 3 (3,01 Mio. Bildpunkte) | bis 120 Hz; Safari zeichnet nahe 60 Hz | – | Apple, Bericht 11 |
| Arbeitsspeicher | 8 GB | 18 oder 36 GB | – | Apple-Interview, Notebookcheck |
| Stromsparmodus | Bildtakt 30 Hz; Einzelkern rund −60 % (A18 Pro) | – | – | WebKit, 9to5Mac, Tom's Guide |

**iPad.** Welches iPad Florian hat, ist offen. Je Kern liegen die Geräte weit auseinander: iPad Pro M5 rund 4 100, iPad Pro und
iPad Air M4 rund 3 700, iPad mini A17 Pro rund 2 800 bis 2 900, iPad Air M2 und iPad A16 rund 2 570 bis 2 600 (Geekbench 6
Einzelkern). **Ein iPad mit M2 oder A16 ist je Kern rund 20 % langsamer als das iPhone 16** und wäre damit das langsamste Glied der
Kette für den Editor. Die Bandbreite beträgt beim M5 153 GB/s (Apple); beim M4 sind es nach meinem Wissen 120 GB/s. Auch auf dem
iPad Pro mit 120 Hz zeichnen Safari und WKWebView nahe 60 Hz (Abschnitt 3.1). Das iPad Pro 13" hat 2752 × 2064 Bildpunkte (5,7 Mio.),
fast doppelt so viele wie das iPhone. Apple sagt, die Speichergrenzen auf dem iPhone seien strenger als auf dem iPad.

**Wie man die Faktoren liest.** Prozessorlast im Browser (ein Kern, kurz): Mac und iPhone sind gleich schnell. Grafiklast mit vielen
Bildpunkten: Der Mac ist drei- bis viermal so schnell, das kalte iPhone erreicht also ein Viertel bis ein Drittel davon. Nach einigen
Minuten Dauerlast verliert das iPhone noch ein Viertel bis ein Drittel. Die öffentlichen Tests sind 3D-Spiele-Lasten. Unsere Last
(viele Bildpunkte, Speicherverkehr, wenige Dreiecke) liegt zwischen „Aztec 4K“ (Füllrate und Bandbreite) und „Metal“ (Rechnen). Die
Messseite liefert den echten Faktor für unseren Renderer.

---

## 3 Was iOS und WebKit begrenzen

### 3.1 Bildtakt

**Grundtakt 60 Hz.** Die WebKit-Einstellung „Prefer Page Rendering Updates near 60fps“ ist stabil und standardmäßig an, aus nur auf
visionOS. Seiten zeichnen deshalb nahe 60 Bildern je Sekunde statt mit der Wiederholrate des Bildschirms. Das gilt auf dem iPad Pro
und am Mac in Safari. In der WKWebView einer App lässt sich das nicht umschalten: Ein Entwickler meldete im Januar 2025 im
Apple-Forum, `requestAnimationFrame` bleibe in WKWebView auch auf ProMotion-Geräten bei 60 Hz, die Schalter von Safari wirkten dort
nicht. Eine Antwort von Apple steht dort nicht. Der Bericht vom September (`docs/research/tech-stack.md`) nennt dazu den offenen
WebKit-Bug 294338. Das iPhone 16 hat ohnehin einen 60-Hz-Bildschirm.

**Stromsparmodus: 30 Hz, mit Absicht.**
- *Mechanik (Quelltext von heute):* Die Seite (`Page`) hört auf die Meldung des Systems zum Stromsparmodus und setzt dann den
  Drosselgrund `LowPowerMode`. In `AnimationFrameRate.cpp` gehört er zur Menge der Gründe für halbe Geschwindigkeit, zusammen mit
  „fremdes iframe ohne Berührung“, „sichtbar untätig“ und „aggressive Wärmeminderung“. Das Intervall steigt dann von 15 auf 30 ms,
  bei 60 Hz also auf 30 Bilder je Sekunde. Gleichzeitig werden Timer gröber gebündelt.
- *Geschichte:* Eingeführt im Februar 2017 (Bug 168837). Unter iOS 13 lief `requestAnimationFrame` im Stromsparmodus versehentlich
  mit rund 90 Hz (Bug 202269), weil zwei Taktgeber gleichzeitig liefen. Seit iOS 14 sind es wieder 30 Hz. Ein WebKit-Entwickler
  schrieb im August 2020, die Grenze sei gewollt und das Verhalten von iOS 13 der Fehler gewesen (Bug 215745).
- *Nutzerstimmen:* Der Autor der Animationsbibliothek Motion bemerkte die Drosselung, als er zwei gleiche iPhones nebeneinander
  legte; nur eines war im Stromsparmodus. Im GreenSock-Forum heißt es, es gebe keinen Weg drumherum; der Fragesteller sagte seinen
  Nutzern einfach Bescheid. Ein Bericht von 2024 zeigt: Auch CSS-Animationen mit der Kurve `linear()` laufen im Stromsparmodus mit
  30 Hz.
- *In der App:* Die Regel steckt in WebCore, also in der Engine selbst, nicht in Safari. Sie sollte deshalb auch in der WKWebView von
  Capacitor gelten. Das ist abgeleitet, nicht gemessen; Block B1 der Messseite prüft es.
- *Zusätzlich drosselt das System den Prozessor:* Am iPhone 16 Pro Max (A18 Pro) fiel Geekbench 6 im Stromsparmodus von 3 341 auf
  1 384 Punkte im Einzelkern (−59 %) und von 8 270 auf 4 093 im Mehrkern (−50 %). Tom's Guide maß dasselbe (−61 % und −52 %). Nach
  Apples Doku reduziert das System im Stromsparmodus Animationen und schaltet einige visuelle Effekte ab.
- *Adaptive Power (iOS 26):* Auf iPhone 15 Pro und neuer, also auch auf dem iPhone 16, gibt es eine Einstellung, die Leistung bei
  hohem Verbrauch etwas zurücknimmt und den Stromsparmodus bei 20 % Akku einschalten kann. Auf dem iPhone 17 ist sie
  standardmäßig an; ob auf Florians iPhone, ist offen.

**Wärme: kein halber Takt in WebKit, aber weniger Leistung.**
- *Mechanik:* Seit 2023 beobachtet WebKit die Wärmestufe des Systems. Ab „serious“ (und damit auch bei „critical“) setzt es den Grund
  `ThermalMitigation`. Dieser Grund wirkt nach heutigem Quelltext nur auf die Bündelung von Timern, nicht auf den Bildtakt. Den
  Bildtakt halbiert erst `AggressiveThermalMitigation`. Den setzt WebKit nur, wenn die interne Einstellung „Respond to thermal
  pressure aggressively“ an ist, und die ist im Standard aus.
- *Folge:* Die Vermutung „bei Wärme rund 30 Hz“ trifft auf WebKit nicht zu. Wärme wirkt über das System: Takt und Leistung von
  Prozessor und Grafikkarte sinken. Das iPhone 16 hielt im 3DMark-Stresstest 65,8 % (Beebom), 68,7 % (Notebookcheck) und laut
  Suchauszug von GSMArena 78 % der besten Runde. Notebookcheck schreibt, die volle Leistung halte unter Volllast nur kurz und falle
  in manchen Lagen um fast ein Drittel. Dauert ein Bild dann länger als 16,7 ms, verpasst die Seite einzelne Bilder. Das ergibt
  **unregelmäßige** 40 bis 60 Bilder je Sekunde, keine sauberen 30.
- *Apples Rat* je Stufe: Bei „fair“ Arbeit verschieben, die nicht sofort gebraucht wird. Bei „serious“ Bildschirm-Aktualisierungen
  und Animationen verringern. Bei „critical“ fast alle Arbeit einstellen. Eine Webseite kann die Wärmestufe nicht lesen; eine App
  kann sie über ein kleines Plugin weiterreichen.

**Weitere Fallen.** Ein iframe fremder Herkunft wird halbiert, bis man hineintippt; das bloße Aufsetzen des Fingers reicht nach dem
Motion-Artikel nicht, erst ein Tippen. Eine
Spielvorschau im Editor darf also nie in einem iframe fremder Herkunft laufen. Im Hintergrund pausiert der Bildaufruf ganz. Nach der
Rückkehr entsteht ein großer Zeitsprung, den der feste Takt mit Zeitkappung abfängt (Bericht 09).

**Was das für „glatt“ heißt.** Im Stromsparmodus ist 60 Hz auf iOS nicht zu erreichen, weder in Safari noch, nach dem Quelltext, in
der App. Florian darf „glatt“ deshalb nie im Stromsparmodus beurteilen, ohne es zu wissen. Abschnitt 9 empfiehlt einen sichtbaren
Hinweis. Bei Wärme bleibt 60 Hz möglich, wenn das Budget eine Reserve für die Wärme enthält (Abschnitt 6).

### 3.2 Speicher

- **Webprozess (WebContent):** Es gibt keine feste Grenze. Ein Apple-Ingenieur sagt, sie hänge vom Gerät und von der Lage im System
  ab, und iPhones hätten strengere Grenzen als iPads. Beobachtet wurden: Abbruch bei mehr als 1,25 GB (Januar 2025, eine Seite mit
  vielen Diagrammen); „ActiveHard 2048 MB“ auf einem iPhone 17 Pro mit 12 GB, in Safari wie in einer Capacitor-App, während dieselbe
  Seite auf iPads lief (April 2026). Eine Berechtigung für mehr Speicher wirkt nur für die App selbst, nicht für den Webprozess. Für
  das iPhone 16 mit 8 GB habe ich keinen Wert gefunden.
- **Grafikspeicher:** WebGL läuft auf iOS seit 2022 im eigenen GPU-Prozess (Bug 236382). Dort liegen auch alle Texturen. Eine
  Schnittstelle zum Abfragen gibt es nicht. MDN rät, Puffer und Texturen selbst zusammenzuzählen und vorsichtig zu planen.
- **WebAssembly:** Ein Unity-Entwickler konnte auf iPhones und iPads mit 4 bis 6 GB beim ersten Besuch rund 1 GB WebAssembly-Speicher
  anlegen, nach jedem Neuladen nur noch 300 bis 500 MB, auf einem Gerät einmal nur 28 MB (Februar 2024). Bei WebKit läuft das unter
  einem Sammelfehler zur Zerstückelung des reservierten Bereichs. Geteilter Speicher (`shared`) scheiterte unter iOS 16.4 an
  Fällen, die ohne ihn gingen. **Für uns:** Den Speicher von Box2D klein anlegen (16 bis 64 MB) und nicht teilen.
- **Feste Grenzen im Quelltext:** Eine Zeichenfläche darf auf iOS höchstens 8192 × 8192 Bildpunkte groß sein. Je Seite sind
  höchstens 16 WebGL-Kontexte erlaubt, in Workern 4; beim siebzehnten verwirft WebKit den ältesten stillschweigend. **Für den
  Editor** heißt das: ein Kontext für alles. Vorschaubilder in Panels werden in diesem Kontext gerechnet, nicht in eigenen
  Zeichenflächen mit eigenem Kontext.
- **Rechnung für unsere Felder:** Der Prototyp hält sechs Feldtexturen und eine für die Außenkante, je 8 Byte je Bildpunkt
  (Halbgleitkomma), dazu Schablone (4 Byte). Über den ganzen Bildschirm des iPhone (3,01 Mio. Bildpunkte) sind das rund 180 MB, dazu
  der Bildpuffer. `preserveDrawingBuffer: true` kostet auf Mobilgeräten zusätzlich eine Kopie. Auf dem iPad Pro 13" wären es rund
  340 MB. Nur im Rahmen der Figur (0,36 bis 0,49 Mio. Bildpunkte) sind es 22 bis 29 MB, in halber Auflösung 5 bis 7 MB.

### 3.3 Speicherbereinigung und JIT

- **Speicherbereinigung (Riptide, seit 2017):** Sie arbeitet nebenläufig und nach Generationen. Sie hält das Programm nur noch für
  kurze Schritte an (Stapel lesen, Bedingungen des DOM lösen). Nach WebKit dauern diese Pausen meist etwa 1 ms oder weniger. In einem
  Belastungstest sanken Pausen von über 10 ms auf unter 3 ms. **Folge:** Einzelne Pausen sind klein. Viele Würfe je Bild machen sie
  aber häufiger, und eine Pause in einem ohnehin vollen Bild kostet das Bild. WebAssembly-Speicher wird nicht bereinigt; nur die
  JavaScript-Hüllen um Aufrufe zählen.
- **Bewährtes Verfahren:** Speicher am Anfang anlegen und wiederverwenden (web.dev, „static memory“ mit Objekt-Pools).
- **JIT in Stufen:** JavaScriptCore beginnt im Interpreter und übersetzt heißen Code in drei Stufen: Baseline nach rund 500
  Zählpunkten (jeder Aufruf zählt 15, jeder Schleifendurchlauf 1), DFG nach rund 1 000, FTL nach rund 100 000. Baseline ist etwa
  doppelt so schnell wie der Interpreter, DFG fünfmal so schnell wie Baseline, FTL noch einmal 1,5-mal. Ändern sich die Typen,
  springt der Code zurück. Das kostet einige Mikrosekunden je Rücksprung und erzwingt eine neue Übersetzung. **Folge:** Die ersten
  ein bis zwei Sekunden sind langsamer, die Messseite verwirft sie. Heißer Code soll immer dieselben Typen sehen (typisierte Felder,
  keine wechselnden Objektformen).
- **In der App** gibt es den JIT ebenfalls (WKWebView). Im Lockdown-Modus schaltet Apple „komplexe Web-Technologien“ ab; was genau
  das für WebAssembly in einer App bedeutet, steht dort nicht (Bericht 09).

### 3.4 Verlust des WebGL-Kontexts

- **Berichte:** Unter iOS 17 gingen Kontexte nach dem Wechsel in den Hintergrund verloren und ließen sich teils erst nach dem Leeren
  des Browser-Caches neu anlegen. Behoben ist das in Safari 17.1 (ANGLE verwirft Metal-Kontexte nicht mehr bei harmlosen Fehlern).
  Unter iOS 18 brach eine Seite mit three.js beim Hochladen großer Puffer zusammen, Ursache war eine Shader-Zeile (`flat varying`)
  ab rund 30 000 Ecken (März 2025, behoben). Weitere Ursachen: der GPU-Prozess wird wegen Speicher beendet, oder es gibt mehr als 16
  Kontexte.
- **Verfahren:** Beim Ereignis `webglcontextlost` `preventDefault()` aufrufen, den Bildaufruf anhalten und bei `webglcontextrestored`
  alle Programme, Puffer und Texturen neu anlegen. Testen lässt sich das mit der Erweiterung `WEBGL_lose_context`
  (`loseContext()`, `restoreContext()`). Unser Vorteil: Die Felder entstehen ohnehin in jedem Bild neu. Nur Programme und gebackene
  Texturen (Welt) müssen aus den Daten wieder entstehen.

### 3.5 Start: WebAssembly, Shader, Daten

- **WebAssembly in WebKit:** Der Code läuft zuerst in einem schnellen Übersetzer (BBQ), heiße Funktionen bekommen im Hintergrund
  optimierten Code (OMG). BBQ übersetzt etwa viermal so schnell, sein Code läuft etwa halb so schnell (WebKit, 2017). Seit 2023 baut
  WebKit zusätzlich einen Interpreter, der direkt auf dem Bytecode arbeitet und ohne Übersetzen loslaufen kann. Ein übersetztes Modul lässt
  sich per `postMessage` ohne neues Übersetzen an einen Worker geben.
- **Rechnung:** Die unterste Stufe übersetzte 2020 auf einem Server-Kern rund 20 MB je Sekunde. Ein iPhone-16-Kern ist deutlich
  schneller. Box2D (612 KB WebAssembly) braucht damit rechnerisch **10 bis 40 ms**, Rapier (2,4 MB) 40 bis 120 ms.
- **In der App:** `WebAssembly.instantiateStreaming` verlangt den Typ `application/wasm`. Für den Dateiserver von Capacitor auf iOS
  gab es einen Fehler mit falschem Typ. Ersatzweg: `WebAssembly.instantiate` aus einem `ArrayBuffer` (prüft keinen Typ).
- **Shader:** Safari kennt seit 14.5 die Erweiterung `KHR_parallel_shader_compile`. Ein offener Fehler von 2023 meldet aber, dass
  das Übersetzen trotzdem blockiert. **Folge:** Alle Shader-Varianten beim Laden hinter dem Startbild übersetzen. Shader nicht aus
  Florians Regeln zur Laufzeit erzeugen, sonst stockt der Editor bei jeder Regeländerung. Regeln gehören in Uniforms oder eine
  Datentextur.

### 3.6 Was man in Safari überhaupt messen kann

- **Uhr:** `performance.now()` und die Zeitstempel des Bildaufrufs lösen in WebKit nur 1 ms auf. Mit Cross-Origin-Isolation
  (Kopfzeilen COOP und COEP) sind es 20 µs (seit September 2021). Die Messseite braucht deshalb diese Kopfzeilen oder misst Stapel,
  die länger als einige Millisekunden laufen.
- **Zeit der Grafikkarte:** WebKit hat die Zeitabfrage `EXT_disjoint_timer_query_webgl2` 2023 eingebaut, auf iOS meldet sie aber
  nach der Statistik von web3dsurvey nur 0,25 % der Geräte. Die Werte im Prototyp kommen also nur aus Chrome am Mac, und auch dort
  schwanken sie (1,4 bis 5,5 ms für dasselbe Bild, Übergabe). Ersatz: Stapel von Bildern in einen Zwischenpuffer zeichnen und mit
  einem Lesen von einem Bildpunkt warten (Zeit geteilt durch Stapelgröße), Zäune (`fenceSync`) abfragen, ohne zu blockieren (MDN),
  oder die Reserve bis zum ersten verpassten Bild bestimmen (Abschnitt 7.4).
- **Fehlt in Safari:** `requestIdleCallback` (bis Safari 27 im Standard aus), die Long-Animation-Frames-Schnittstelle,
  `performance.memory`.
- **Web Inspector** (Mac, per Kabel auch für iPhone und WKWebView): Zeitleiste der Prozessorlast (Proben alle 500 ms), Speicher in
  Kategorien (JavaScript, Seite, Bilder, Ebenen), Schnappschüsse des JavaScript-Heaps. Das reicht für eine einmalige
  Speichermessung am Gerät.

---

## 4 Was die besten Programme und Verfahren tun

| Vorbild | Mechanik | Stärke | Schwäche | Für uns |
| --- | --- | --- | --- | --- |
| **Unity: Takt nach Wärme** | Mit einer Einstellung senkt Unity auf iOS den Ziel-Takt in den Wärmestufen „serious“ und „critical“; die Zielwerte je Stufe sind einstellbar. Ziel: weniger Hitze, keine Aussetzer und keine Zeitüberschreitung der Grafikkarte. | gleichmäßig statt unregelmäßig; Gerät erholt sich | weniger flüssig, sobald es warm ist | In der App die Wärmestufe lesen. Bei „critical“ gleichmäßig 30 Hz (jedes zweite Bild), vorher Effekte abschalten. |
| **Unity: Dynamische Auflösung** | Auf iOS nur mit Metal. Puffer werden nach der gemessenen Prozessor- und Grafikzeit (FrameTimingManager) kleiner oder größer gerechnet. | hält den Takt | die Bildschärfe wechselt | Im Editor nie (der Look muss stehen). Im Spiel höchstens eine feste Stufe mit Abstand gegen Pendeln, nur mit Florians Wort. |
| **Spine: Metrics-Ansicht** | Zeigt beim Bearbeiten, was kostet: Knochen und Bedingungen (Prozessor), Ecken und Gewichte (Prozessor), gezeichnete Fläche samt Überdeckung (Füllrate), Zeichenaufrufe und Clipping. Clipping nennt Spine „sehr teuer“. Weitere Ratschläge: Gewichte ausdünnen, bei vielen Figuren der Reihe nach rechnen. | Kosten sind beim Arbeiten sichtbar, bevor das Gerät klagt | Zahlen statt Urteil; für Laien schwer zu deuten | Eine schlichte Ampel „iPhone“ im Editor, gerechnet aus den gemessenen Faktoren. Die Zahlen dahinter nur auf Wunsch. |
| **Rive: Renderer** | Auf Apple-GPUs bevorzugt er Pixel Local Storage: Pfade werden in einem Durchgang im schnellen Kachelspeicher gemischt, ohne Zwischentexturen; Rückfallstufen für andere GPUs. | wenig Speicherverkehr, ideal für Kachel-GPUs | in WebGL2 auf Safari nicht verfügbar | Unser Gegenstück ist der Kachel-Durchgang (Stufe 2 aus 10): Abstand und Vorzeichen direkt im Bilddurchgang. |
| **Skia: Wang-Formel** | Rechnet aus den zweiten Differenzen der Kontrollpunkte, wie viele gleich lange Parameterschritte ein Kurvenstück braucht, damit die Strecken höchstens 1/Genauigkeit Bildpunkte abweichen: n = ⌈√(0,75 · Genauigkeit · max‖P₀ − 2P₁ + P₂‖)⌉. | feste, beweisbare Stückzahl; kein Springen | nur Obergrenze, also etwas mehr Strecken | Feste Stückzahl je Kurvenstück aus dem größten Bedarf über alle Schlüssel (5.2). |
| **Valve: Abstandsfeld in kleiner Auflösung** | Das Abstandsfeld liegt in einer kleineren Textur. Bilinear gefiltert und mit Schwelle ergibt es scharfe Kanten bei starker Vergrößerung (Beispiel: 64 × 64 Texel). Aus dem Abstand folgen weiche Kanten, Umrisse und Schatten. | ein Viertel der Bildpunkte bei halber Auflösung, Kanten bleiben scharf | spitze Ecken runden sich ohne Zusatz | Felder in halber Auflösung, Bild in voller (5.3). Spitzenteile (Bart, Ohrspalt) prüfen oder voll auflösen. |
| **Box2D: Bewegungsmeldungen** | Nach jedem Schritt liefert die Engine ein zusammenhängendes Feld mit den Lagen nur der bewegten Körper, statt alle abzufragen. | wenige Aufrufe, schnell im Speicher zu lesen | – | Aus WebAssembly gebündelt lesen, nicht Körper für Körper. |
| **Unity: Vorhersage-Szene** | Für Flugbahnen legt man eine zweite, getrennte Physikszene an und rechnet sie mit festen Schritten voraus. | stört die echte Welt nicht | doppelte Welt | Die Spur der Zukunft rechnet in einer eigenen Kopie im Worker (5.5). |
| **Apple und MDN: Kachel-GPUs** | Wenige Durchgänge, kleine Formate, nicht mehr laden und speichern als nötig. `invalidateFramebuffer` für Anhänge, die nach dem Durchgang nicht mehr gebraucht werden. `alpha: false` kann teuer sein. Nicht blockierend lesen (`fenceSync`). | große Wirkung auf Bandbreite und Strom | – | Schablone und Zwischenfelder nach Gebrauch verwerfen; Prüfen, ob `alpha: false` (heute im Prototyp) bremst. |
| **WebKit selbst** | 60-Hz-Grundtakt, 30 Hz im Stromsparmodus, Timer bündeln bei Wärme, nebenläufige Speicherbereinigung | spart Strom auf allen Seiten | Seiten können nicht widersprechen | annehmen und sichtbar machen |

**Stimmen von Nutzern.** Im Forum von Babylon.js schrieb ein Entwickler im November 2024, seine Seite halte auf dem iPhone 14 Pro
zwar 60 Bilder je Sekunde, das Telefon werde aber sehr heiß und der Akku leere sich schnell. Auf einem Mac mini mit M4 brauche
Safari rund 30 % Prozessor, Chrome rund 7 %. Ein Mitglied des Teams antwortete nur, es teile den Frust. Das passt zum Aufbau von
Safari: Jeder WebGL-Aufruf geht an den GPU-Prozess. Für uns heißt das: wenige Aufrufe je Bild. Weitere Stimmen stehen in 3.1 (30 Hz,
keine Umgehung) und 3.2 (Speicherabbrüche, schrumpfender WebAssembly-Speicher).

---

## 5 Die Kette Posten für Posten

### 5.0 Annahmen der Rechnung

- **Figur:** Ozzy mit 20 bis 25 Teilen und 250 bis 600 Ankern; jeder Anker hat zwei Griffe, also 750 bis 1 800 Punkte. Je Regler 16
  bis 40 Schlüssel (Florians 16 Kopfschlüssel, gebaute Schlüssel, Faltschlüssel). Die Teile seiner Kopfschlüssel haben je 9 Anker.
- **Spiel:** iPhone 16 im Querformat, 2556 × 1179 = 3,01 Millionen Bildpunkte (Dichte 3). Ozzy samt Reichweite der Felder in einem
  Rahmen von 600 × 600 bis 700 × 700 Bildpunkten, das sind 0,36 bis 0,49 Millionen.
- **Eichung am Mac:** Safari braucht für den heutigen Renderer 2 bis 3 ms je Million Bildpunkte, Chrome bis 3,6 ms.
- **Umrechnung:** Grafik am iPhone kalt mal 2,9 bis 3,8, warm mal 1,45 dazu (aus 69 % Dauerlast). Damit kostet ein Bild des
  heutigen Renderers 5,8 bis 11,4 ms je Million Bildpunkte kalt und 8,4 bis 16,5 ms warm. Prozessor kalt mal 1,0, warm mal 1,3 bis
  1,5, im Stromsparmodus mal 2,5.
- **Kosten wachsen mit der Fläche:** Die Felder kosten etwa proportional zu den Bildpunkten, denn auch die Reichweite R wächst mit
  dem Maßstab. Das ist ein Modell erster Ordnung und gilt auf etwa ±50 %.

### 5.1 (a) Auswerten: Rahmen und Rest, PCHIP, Skinning, Wächter

**Rechnung für ausgerollten Code.** PCHIP mit vorberechneten Steigungen braucht je Koordinate etwa 20 Rechenschritte (Intervall
suchen, Hermite-Polynom). Bei 1 800 Punkten mit je zwei Koordinaten sind das rund 70 000 Schritte. Rahmen und Rest kosten je Teil
einen Drehwinkel und eine Größe, dazu PCHIP auf dem Rest: genauso viel. Das Skinning mit Drehzentren rechnet je Punkt bis zu vier
Knochen mit je rund 30 Schritten, das sind rund 200 000. Die Wächter prüfen je Kurvenstück Sehne und Schlaufe und je Teil die Kanten
paarweise mit einem Rahmentest (rund 11 000 Paare). **Zusammen deutlich unter einer Million einfacher Schritte: 0,1 bis 0,4 ms in
JavaScript.** Das bestätigt 03 und 06 als Größenordnung.

**Was der Prototyp heute tut.** `pchip()` in `form.ts` rechnet bei jedem Aufruf alle Steigungen aller Schlüssel neu und legt dabei
drei Felder an. `formAusSchluesseln()` in `raster.ts` legt je Koordinate zusätzlich ein Feld mit `keys.map(...)` an. Je Anker sind es
etwa 8 bis 10 Aufrufe (Anker, Griffe, Längen, Winkel). Bei 400 Ankern und 20 Schlüsseln ergibt das rund 4 000 Aufrufe mit
240 000 Schleifenschritten und rund 16 000 kurzlebigen Feldern je Bild. **Schätzung: 1 bis 2 ms je Bild und häufige kleine
Bereinigungen.** Das ist nicht gemessen. Die Anzeige „Prozessor“ der Seite misst nur den Renderer, nicht `szeneBauen`.

**Abhilfe.** Die Steigungen hängen nur von den Schlüsseln ab. Man rechnet sie neu, wenn sich ein Schlüssel ändert, nicht in jedem
Bild. Dazu das zuletzt benutzte Intervall merken, alle Koordinaten in typisierten Feldern ablegen (je Größe ein Feld) und im heißen
Code keine Funktionen anlegen. Im Spiel laufen die Wächter nur für Teile, die die Physik verformt; die Schlüssel hat der Editor
schon geprüft. Ziel: **≤ 0,5 ms je Figur, ohne Würfe.**

### 5.2 (b) Abflachen mit fester Stückzahl

- **Heute:** Die Stückzahl folgt der Länge des Kontrollpolygons (Wurzel der Länge mal 1,5, höchstens 96). Ändert sich die Länge im
  Morph, springt die Zahl, und alle Strecken des Kurvenstücks rücken (Bericht 10).
- **Fest nach der Wang-Formel:** Je Kurvenstück k gilt n_k = max über alle Schlüssel von ⌈√(0,75 · s_max · M_k / Toleranz)⌉. Dabei
  ist M_k die größte zweite Differenz der Kontrollpunkte, s_max der größte Maßstab des Spiels und die Toleranz 0,2 Bildpunkte. Ein
  typisches Stück mit M = 150 Bildpunkten braucht 24 Strecken. Für Ozzy sind es **5 000 bis 10 000 Strecken** im Spiel.
- **Kosten:** Mit vorberechneten Bernstein-Gewichten für feste Parameter braucht jeder Punkt etwa 10 Rechenschritte. Für 10 000
  Punkte sind das rund 0,05 ms. Dazu kommt das Packen in einen dauerhaften Puffer (6 Werte je Strecke, 240 KB) und das Hochladen mit
  `bufferSubData`. **Schätzung: 0,1 bis 0,3 ms.**
- **Im Editor:** Die Stückzahl gilt je Zoomstufe (Zweierpotenzen) und wechselt nur beim Zoomen, nie im Morph. Bei 0,2 Bildpunkten
  Toleranz ist der Wechsel unsichtbar. Bei achtfachem Zoom wächst die Zahl um den Faktor √8 ≈ 2,8 (rund 17 000 Strecken für die ganze
  Figur). Strecken außerhalb der Ansicht fallen weg.

### 5.3 (c) Abstandsfelder für Figur, Welt und Effekte

**Wovon die Kosten abhängen.** Drei Größen bestimmen die Zeit der Grafikkarte: die Bildpunkte, über die Felder gerechnet und
gespeichert werden; die Bytes je Bildpunkt (heute rund 56 geschrieben und 56 gelesen); und die Überdeckung der Streckenrechtecke
(Umfang mal 2R). Am Mac verdoppelte R = 88 statt 40 die Zeit. Der Bilddurchgang läuft über die ganze Fläche.

**Szenarien für das iPhone 16 (Rechnung, Spiel, 60 Hz):**

| Szenario | Bildpunkte mit Feldern | Speicherverkehr je Bild (bei 60 Hz) | Feldtexturen | Grafikzeit kalt | warm | Urteil |
| --- | --- | --- | --- | --- | --- | --- |
| **S0** Prototyp heute über den ganzen Bildschirm, Dichte 3 | 2,6 bis 3,0 Mio. | 300 bis 350 MB (18 bis 21 GB/s, ein Drittel der Bandbreite) | rund 180 MB | **15 bis 34 ms** | 22 bis 50 ms | hält keine 60 Hz; Vorhersage zum Prüfen |
| **S0′** wie S0, Dichte 2 | 1,34 Mio. | 155 MB (9 GB/s) | 80 MB | 7,8 bis 15 ms | 11 bis 22 ms | knapp kalt, warm nicht |
| **S1** nur Rahmen um Ozzy, Dichte 3 | 0,36 bis 0,49 Mio. | 42 bis 57 MB (2,5 bis 3,4 GB/s) | 22 bis 29 MB | 2,1 bis 5,6 ms | 3,0 bis 8,1 ms | trägt eine Figur |
| **S2** Rahmen, Felder in halber Auflösung, Bild in voller | Felder 0,09 bis 0,12 Mio., Bild 0,36 bis 0,49 Mio. | 16 bis 23 MB (1 bis 1,4 GB/s) | 5 bis 7 MB | 1,2 bis 3,1 ms | 1,7 bis 4,5 ms | **Ziel für Ozzy** |
| **S3** ganze Szene aus 13: Ozzy und zweite Figur als S2, Welt gebacken oder analytisch, Pfützen und Kameratropfen analytisch, Vollbild-Durchgang für Hintergrund | wie S2 mal 2, dazu 3 Mio. Bildpunkte mit einfachem Shader | rund 60 MB (3,6 GB/s) | 15 bis 25 MB (dazu Welt 8 MB) | **3,4 bis 8,2 ms** | 4,9 bis 11,9 ms | **passt ins Budget**, am oberen Rand knapp |
| **S4** „naiv“: alles als Felder über die ganze Bühne | 3,0 Mio. | > 350 MB | > 180 MB | > 17 bis 34 ms | > 25 bis 50 ms | geht nicht |
| **S5** Kachel-Durchgang (Stufe 2 aus 10) | keine Zwischentexturen | Farbe 4 Byte je Bildpunkt | – | offen (rechnet mehr, liest weniger) | – | Reserve, falls S3 die Messung nicht besteht |

Zur Rechnung: S2 nimmt an, dass die Feld-Durchgänge rund 60 % der Zeit kosten und der Bilddurchgang 40 %. Halbe Auflösung viertelt
die Felder, also 0,4 + 0,6/4 = 0,55 der Zeit von S1. S3 zählt zweimal S2 und 1 bis 2 ms für Welt, Effekte und den Hintergrund.

**Bausteine für die Bühne.**
- **Welt:** Das Rad ist ein Kreis. Hügel lassen sich als Höhenprofil über dem Winkel ablegen. Der Abstand ist dann näherungsweise
  r − (R + h(θ)); das reicht für weiche Kontakte. Ist der Weltpfad eine freie Form, wird sein Abstandsfeld einmal beim Laden oder
  nach einer Änderung in eine Textur im Koordinatensystem des Rads gebacken (etwa 2048 × 2048 in 16 Bit, 8 MB). In jedem Bild wird
  sie nur gedreht gelesen. Die Kollision nutzt dieselbe Form (Bericht 13).
- **Pfützen und Spritzer:** Wenige Kreise oder Kapseln, weich vereinigt (smin), als Liste in einem Uniform-Feld. Gerechnet wird nur
  im Rahmen der Pfütze; der Aufwand wächst mit der Zahl der Tropfen (8 bis 32).
- **Tropfen auf der Kamera:** Analytische Kreise im letzten Durchgang. Ohne Brechung (Lichtkante, Schatten) kosten sie fast nichts.
  Mit Brechung braucht es das fertige Bild als Textur, also einen Vollbild-Durchgang mehr: 3 Millionen Bildpunkte mal 8 Byte, rund
  24 MB je Bild. Geschätzt 0,5 bis 1,5 ms, nur solange Tropfen sichtbar sind.
- **Zweite Figur:** Ein eigener Feldsatz in ihrem Rahmen (zweimal S2). Will man den Speicher sparen, lassen sich die Felder
  nacheinander für beide Figuren benutzen. Dann können die beiden Figuren aber nicht miteinander verschmelzen.
- **Halbe Feldauflösung, volle Bildauflösung:** Das ist das Valve-Verfahren. Die Felder werden bilinear gelesen; Halbgleitkomma ist
  in WebGL2 filterbar. Heute liest der Prototyp mit `NEAREST`. Ein Nebeneffekt: Im Editor verdoppelt sich die Reichweite in
  Bildpunkten bei gleichem Deckel, R sättigt beim Zoomen später (Bericht 10, Grenze 3). **Das Risiko sind Spitzen**: Bart, Ohrspalt
  und der „Durchbruch“ könnten weicher werden. Abhilfe ist eine gemischte Auflösung je Teil (spitze Teile voll, große Teile halb).
  Das entscheidet nur ein Vorher-Nachher-Bild in derselben Ansicht, also Florians Auge.
- **Heute im Renderer zu ändern** (ohne Wirkung auf das Bild): Durchgang 2 legt je Teil einen neuen `Float32Array` an und macht
  rund 15 Aufrufe (Schere, Schablone löschen, Puffer, Programm, Uniforms, zwei Zeichnungen). Bei 24 Teilen sind das Hunderte Aufrufe
  je Bild, die in Safari einzeln an den GPU-Prozess gehen. Ziel: ein Puffer für alle Fächer, Teile über Versatz, unter 100 Aufrufe je
  Bild. Dazu `invalidateFramebuffer` für Schablone und Zwischenfelder nach Gebrauch und `preserveDrawingBuffer` im Spiel aus.
- **Die Grenze der Kacheln ist kein Problem:** Sechs Halbgleitkomma-Ziele sind 48 Byte je Bildpunkt. Apple erlaubt bei Apple7 und
  neuer bis 128 Byte je Bildpunkt (Metal-Tabellen); die Kacheln sind 32 × 32 groß.

### 5.4 (d) Physik und Logik

- **Welt (Box2D 3 als WebAssembly, einfädig):** Ozzys Ersatzkörper, Rad, rund 50 Hindernisse, Strahlabfragen für vier Beine.
  Bericht 09 schätzt unter 0,2 ms je Takt. Die Annahme dahinter (iPhone-Kern gleich M-Kern) stimmt nach Abschnitt 2 für kurze Last.
  Lagen werden gebündelt über die Bewegungsmeldungen gelesen, nicht Körper für Körper mit JavaScript-Hüllen.
- **Figurphysik (TypeScript):** einige hundert Punkte, rund 1 000 Bedingungen, 4 Teilschritte. Schätzung aus 08 und 09: 0,1 bis
  0,5 ms je Takt.
- **Logik:** Zustände, Launen, Ereignisse, Ton: unter 0,1 bis 0,3 ms.
- **Summe:** 0,3 bis 1 ms kalt, warm bis 1,5 ms, im Stromsparmodus bis 2,5 ms. Bei 30 Hz im Stromsparmodus fallen zwei Takte auf
  ein Bild, also bis 5 ms bei 33 ms Bildzeit. Das ist unkritisch. Risiken sind Würfe an der Schnittstelle und Rücksprünge des JIT.
- **Wiederholbarkeit:** Ein Zustands-Hash nach 600 Takten auf Mac und iPhone (Bericht 09) gehört in dieselbe Messseite (Block B7).

### 5.5 (e) Was der Editor zusätzlich rechnet

- **Autorig bei jeder Formänderung:** Er flacht ab, zerlegt in Dreiecke, sucht die Achse, setzt Knochen und rechnet
  Wärme-Gewichte (eine Zerlegung je verformbarem Teil, ein Rückwärtseinsetzen je Knochen). Bericht 07 schätzt unter 50 ms. Viele
  Teile Ozzys sind starr (ein Knochen, Gewicht 1); nur Bohne, Beine, Schwanz und Ohren brauchen die Gleichung. Ein Worker läuft auf
  einem Kern, der so schnell ist wie am Mac. Der A18 hat aber nur zwei Leistungskerne und vier Effizienzkerne. Hauptthread, Worker und
  WebKit teilen sich die zwei schnellen Kerne, ein zweiter Worker landet auf einem langsamen. Ein iPad mit M2 oder A16 liegt je Kern
  rund 20 % unter dem iPhone. **Verfahren:** in
  einem dauerhaften Worker, angestoßen nach dem Loslassen oder nach 150 ms Pause. Angewendet wird das Ergebnis nur, wenn der Stand
  noch derselbe ist (wie `standZahl` im Werk). Der Hauptthread schickt nur die Daten, das kostet rund 0,1 ms. Im Ziehbild selbst
  läuft der Autorig nie, sonst springt das Rig beim Ziehen. Budget: ≤ 50 ms je Lauf auf iPhone-Klasse, sichtbar erst ab 200 ms.
- **Spur der Zukunft** (Bericht 12: Umriss für die nächsten 1 bis 2 s beim Ziehen an einem Physik-Regler): 60 bis 120 Takte mal 0,3
  bis 0,7 ms (Figur und Welt) ergeben **18 bis 84 ms je Ziehbild**. Im Bild ist das nicht möglich. Drei Wege, die sich ergänzen:
  1. Eine einzelne Feder mit Frequenz f und Dämpfung ζ (Bericht 08) hat eine geschlossene Lösung. Ihre Zukunft kostet für jede
     Zahl von Geisterbildern nur Mikrosekunden.
  2. Ketten (Schwanz) und Welt laufen in einer eigenen Kopie im Worker, wie Unitys Vorhersage-Szene. Zuerst kommen 0,25 s, der Rest
     schrittweise. Das Box2D-Modul lässt sich per `postMessage` teilen. Wartezeit 1 bis 5 Bilder.
  3. Gröber rechnen: Ein 30-Hz-Takt mit 2 Teilschritten für die Spur halbiert die Kosten.
  Die Geister werden als Umrisse gezeichnet (wie heute die Zwiebelhaut), nicht als eigene Felder. Budget im Hauptthread: ≤ 1 ms.
- **Live-Werte in Panels:** Jede Änderung von `textContent` kann Stil und Layout auslösen. Teuer wird es mit vielen Elementen und
  wenn man nach dem Schreiben Layout liest (erzwungenes Layout, web.dev). **Verfahren:** höchstens 15 Hz, feste Breiten,
  tabellarische Ziffern, Eindämmung per CSS (`contain`), nur sichtbare Panels, nie lesen nach dem Schreiben. Schätzung: unter 0,5 ms je
  Aktualisierung bei 10 bis 20 Werten. Da `requestIdleCallback` in Safari fehlt, laufen verschobene Arbeiten im Worker oder in
  eigenen Scheiben im Bildaufruf.
- **Hilfslinien:** Griffe, Zwiebelhaut und Bahnen als Linienzüge, ≤ 1 ms. Jede weitere Figur im Editor (Zwiebelhaut als volle
  Figur, zwei Posen nebeneinander) kostet (a) und (b) noch einmal und, wenn sie mit Feldern gezeichnet wird, auch (c).

### 5.6 Start, Speicher, Kontext

| Posten | Rechnung oder Beleg | Budget |
| --- | --- | --- |
| WebAssembly Box2D übersetzen und einrichten | 10 bis 40 ms (Rechnung aus 20 MB/s) | ≤ 50 ms |
| Shader übersetzen (5 bis 8 Programme) | unbekannt; blockiert in Safari | beim Laden, zusammen ≤ 300 ms |
| Erstes Bild in der App | unbekannt | ≤ 2 s ab Start |
| Feldtexturen | S2/S3: 10 bis 30 MB; S0: 180 MB | ≤ 150 MB GPU gesamt |
| WebAssembly-Speicher | Box2D braucht wenige MB | 16 bis 64 MB, nicht geteilt |
| Webprozess gesamt | Abbrüche beobachtet ab 1,25 GB | ≤ 400 MB |
| Kontexte | höchstens 16 je Seite | 1 |

---

## 6 Die Budget-Tabelle

### 6.1 Rahmen

Bei 60 Hz bleiben 16,7 ms je Bild. Nach den RAIL-Regeln (web.dev) braucht der Browser davon rund 6 ms für sich; für die eigene
Arbeit bleiben rund 10 ms. Die Grafikkarte arbeitet im GPU-Prozess neben dem Hauptthread her; ihr Budget zählt getrennt. **Reserve für
Wärme:** Das iPhone 16 hält unter Dauerlast rund 69 % der Grafikleistung (mal 1,45) und verliert beim Prozessor ein Viertel bis ein
Drittel (mal 1,3 bis 1,5). Deshalb sind die Budgets für das kalte Gerät gesetzt:

- **Hauptthread (eigene Arbeit) ≤ 6 ms kalt**, warm rund 8 ms. Der Rest bleibt für WebKit, Speicherbereinigung, Eingabe und
  Schwankung.
- **Grafikkarte ≤ 8 ms kalt**, warm rund 11,6 ms. Das bleibt unter 16,7 ms mit Platz für Schwankung. Das Budget aus Bericht 10
  stimmt also, jetzt mit Begründung.

### 6.2 Spiel auf dem iPhone 16 (60 Hz, Ozzy und Szene aus 13)

| Posten | Inhalt | Rechnung iPhone kalt | warm | **Budget kalt** | Öffentlicher Vergleich A18 : M3 Pro | Hauptrisiko | Block der Messseite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (a) Auswerten | Rahmen und Rest, PCHIP über 16 bis 40 Schlüssel, Drehzentren-Skinning bis 4 Knochen, Wächter, 250 bis 600 Anker | Ziel 0,1 bis 0,4 ms; heute geschätzt 1 bis 2 ms | × 1,4 | **0,5 ms** | Einzelkern ≈ 1 : 1 (JetStream 2 280 : 307,5; Geekbench 6 ≈ 3 200 : 3 100) | Würfe je Aufruf; Rücksprünge des JIT | B2 |
| (b) Abflachen | feste Stückzahl (Wang), 5 000 bis 10 000 Strecken, dauerhafter Puffer | 0,1 bis 0,3 ms | × 1,4 | **0,3 ms** | wie (a) | neuer Puffer je Bild; springende Stückzahl | B2 |
| (c1) Zeichenbefehle | WebGL-Aufrufe, Uniforms, Hochladen | Ziel 0,2 bis 0,5 ms; heute geschätzt 0,5 bis 2 ms | × 1,4 | **0,5 ms** | Safari reicht jeden Aufruf an den GPU-Prozess (Nutzer: Safari 30 % gegen Chrome 7 % Prozessor) | Hunderte Aufrufe je Bild | B2, B3 |
| (c2) Felder Ozzy | Rahmen, Felder halb, Bild voll (S2) | 1,2 bis 3,1 ms | 1,7 bis 4,5 ms | **3 ms** | Grafik 2,9 bis 3,8 : 1 (Wild Life Extreme, Aztec 4K); Bandbreite 2,5 : 1 | Reichweite R, Spitzen bei halber Auflösung | B3 |
| (c3) Bühne | zweite Figur (S2), Welt gebacken oder analytisch, Pfützen, Kameratropfen, Hintergrund | 2,2 bis 5,1 ms | 3,2 bis 7,4 ms | **5 ms** | wie (c2) | Brechung der Tropfen (+0,5 bis 1,5 ms), große Rahmen | B3, B4 |
| (d) Physik und Logik | Box2D-Welt, Figurphysik, Launen, Ereignisse | 0,3 bis 1 ms | bis 1,5 ms; Stromsparmodus × 2,5 | **1,5 ms** | Box2D nativ M2 1,47 ms für Tausende Körper (Bericht 09), Wasm-Aufschlag 1,5 bis 2,5 | Hüllen und Würfe an der Schnittstelle | B2, B7 |
| Anzeige im Spiel (DOM) | Zähler, Hinweise | 0,1 bis 0,3 ms | × 1,4 | **0,3 ms** | – | Layout nach Schreiben | B2 |
| **Summe Hauptthread** | (a) + (b) + (c1) + (d) + Anzeige | **0,8 bis 2,5 ms** (heute geschätzt 2 bis 5,5) | 1,1 bis 3,5 ms | **≤ 6 ms** | | | |
| **Summe Grafik** | (c2) + (c3) | **3,4 bis 8,2 ms** | 4,9 bis 11,9 ms | **≤ 8 ms** | | oberer Rand knapp → Stufe 2 | |
| Speicher | Feldtexturen, Welt, Wasm, JS | 25 bis 40 MB GPU; Wasm 16 bis 64 MB | – | **GPU ≤ 150 MB, Seite ≤ 400 MB** | Abbrüche beobachtet ab 1,25 GB | Neuladen schrumpft Wasm | B5 |
| Start | Wasm, Shader, Daten | Wasm 10 bis 40 ms; Shader unbekannt | – | **erstes Bild ≤ 2 s** | Wasm unterste Stufe rund 20 MB/s (2020) | blockierendes Übersetzen | B5 |

### 6.3 Editor auf iPad und Mac (60-Hz-Referenz)

| Posten | Rechnung | **Budget** | Bemerkung |
| --- | --- | --- | --- |
| (a) + (b) für die gezeigte Figur, dazu Zwiebelhaut (zwei weitere Figuren) | dreimal Spiel: 0,6 bis 2 ms; iPad mit M2/A16 mal 1,25 | **≤ 2,5 ms** | Zwiebelhaut als Umriss braucht kein (c) |
| (c) Felder | Bühne am iPad groß (2 bis 4 Mio. Bildpunkte im Rahmen bei Zoom) | **≤ 8 ms** | im Editor immer Rahmen und halbe Feldauflösung; Grafikkarte des iPad offen |
| Hilfslinien (Griffe, Bahnen, Geister) | Linienzüge | **≤ 1 ms** | |
| Live-Werte | 10 bis 20 Werte bei 15 Hz | **≤ 0,5 ms** | keine Layout-Lesungen |
| Zeiger, Treffer, Store-Transaktion je Ziehbild | Datensatz-Diff wie tldraw (Bericht 11) | **≤ 1 ms** | |
| Autorig | Worker, nach Loslassen oder Pause | **≤ 50 ms je Lauf**, Hauptthread ≤ 0,1 ms | Ergebnis nur bei gleichem Stand |
| Spur der Zukunft | Federn geschlossen, Ketten und Welt im Worker | **Worker ≤ 60 ms für 2 s**, Hauptthread ≤ 1 ms | erste 0,25 s im nächsten Bild |
| **Summe Hauptthread** | | **≤ 6 bis 8 ms** | Mac in Chrome mit 120 Hz: halbe Zeit; Bericht 11 empfiehlt eine 60-Hz-Vorschau |

### 6.4 Umrechnungsregel Mac → iPhone (bis die Messseite echte Werte liefert)

| Last | kalt | warm (nach Minuten) | Stromsparmodus |
| --- | --- | --- | --- |
| Prozessor, ein Kern (in **Safari** am Mac gemessen) | × 1,0 | × 1,3 bis 1,5 | × 2,5 und Takt 30 Hz |
| Prozessor, alle Kerne zugleich (mehrere Worker) | × 1,7 bis 1,8 | × 2,2 bis 2,7 | × 3,5 |
| Grafik, viele Bildpunkte | × 3 bis 4 | × 4 bis 5,5 | unbekannt, Takt 30 Hz |
| Speicherbandbreite | × 2,5 | – | – |

**Arbeitsregel bis dahin:** Eine Szene, die am Mac in Safari mehr als 2 ms Grafikzeit für die Bildpunkte des iPhone braucht, ist für
das iPhone zu teuer. Der heutige Prototyp über den ganzen Bildschirm verfehlt diese Regel deutlich.

---

## 7 Eine Messseite statt fünf Proben

### 7.1 Grundsätze

- **Eine Seite, ein Knopf:** `apps/editor/tempo.html` mit Code in `src/tempo/`. Sie misst den **echten Code** (Renderer, Raster,
  Haltung, Abläufe, Steuerung), keine Nachbauten. Wo ein Modul noch fehlt (Autorig, Figurphysik), steht ein klar beschrifteter Ersatz
  gleicher Größe, oder der Block ist ausgegraut.
- **Kriterien vorher festgelegt** (Arbeitsregel 2): Die Budgets aus Abschnitt 6 stehen in der Seite. Das Ergebnis ist je Posten eine
  Ampel.
- **Im Vordergrund, sichtbar, kurz:** rund 15 Minuten je Gerät, davon 10 Minuten Dauerlauf. Keine Messreihen im Hintergrund.
- **Gleiche Seite in Safari und in der App:** In der Capacitor-App lädt die WKWebView dieselbe Seite vom Dev-Server
  (`server.url` wie beim Live Reload; die Einstellung wird nie eingecheckt).
- **Fester Stand:** Die Seite läuft aus einem gebauten Stand (`vite preview`) oder aus einem eigenen Arbeitsbaum mit eigenem Port.
  So lädt keine Änderung unter `src` die Seite mitten im Lauf neu (Falle aus der Übergabe).
- **Genaue Uhr:** Der Dev-Server schickt nur für diese Seite COOP und COEP. Die Seite prüft `crossOriginIsolated` und die gemessene
  Auflösung der Uhr (20 µs oder 1 ms) und wählt danach die Stapelgröße.
- **Ergebnis als Datei:** Die Seite schickt ein JSON an den Dev-Server (wie `PUT /__ozzy-figur/schluessel` im Prototyp). Es landet in
  `docs/progress/tempo/<datum>-<gerät>-<safari|app>.json`. Als Ersatz gibt es einen Knopf „Kopieren“.

### 7.2 Aufbau in Blöcken

| Block | Dauer | Was gemessen wird | Kriterium (vorab) |
| --- | --- | --- | --- |
| **B0 Gerät** | 10 s | Gerät, Fassung von iOS und Safari, App oder Safari, Dichte, Zeichenfläche, Auflösung der Uhr, `crossOriginIsolated`; WebGL2: Halbgleitkomma renderbar und filterbar, Zeitabfrage ja/nein, größte Textur; WebGPU ja/nein; Wasm-SIMD ja/nein. In der App über ein kleines Plugin: Wärmestufe, Stromsparmodus, Akkustand. | – (Protokoll) |
| **B1 Takt** | 5 s Ruhe | Abstand der Bildaufrufe → 60, 30 oder 120 Hz | 60 Hz; bei 30 Hz Hinweis „Stromsparmodus oder iframe?“ |
| **B2 Prozessor je Posten** | rund 40 s | Nach 3 s Aufwärmen je Posten 300 Stapel (jeder ≥ 2 ms bei 1-ms-Uhr): (a) Auswerten heute und ohne Würfe (sobald gebaut), (b) Abflachen, (c1) Zeichenbefehle ohne Warten, (d1) Box2D-Takt (`box2d3-wasm/compat`, Ozzy-Ersatz, Rad, 50 Hindernisse), (d2) Figurphysik (Ersatz: 300 Punkte, 1 000 Bedingungen, 4 Teilschritte), (d3) Logik, (e1) Autorig, (e2) Spur der Zukunft mit 120 Takten, (e3) Panel mit 20 Werten. Median, 95 %, Höchstwert. Zusätzlich die Zahl der Lücken über 25 ms, wenn die eigene Arbeit unter 8 ms lag (Hinweis auf Speicherbereinigung). | Budgets aus 6.2 und 6.3 |
| **B3 Grafik je Szene** | 6 × 10 s | S0 (Prototyp, ganze Fläche, Dichte 3), S0′ (Dichte 2), S1 (Rahmen), S2 (halbe Feldauflösung, sobald gebaut), S3 (ganze Szene, sobald gebaut), S4 (naiv, zum Zeigen). Je Szene: Bildabstand Median, 95 % und 99 %, Anteil verpasster Bilder (über 25 ms), längste Lücke; Grafikzeit als Stapel (20 Bilder in einen Zwischenpuffer, dann einen Bildpunkt lesen, Zeit geteilt durch 20) und, wo vorhanden, mit der Zeitabfrage; **Reservefaktor** (Abschnitt 7.4). | S2 ≤ 3 ms, S3 ≤ 8 ms Grafikzeit; Reservefaktor der ganzen Szene ≥ 2 (kaltes Gerät) |
| **B4 Dauerlauf** | 10 min | S3 oder die beste lauffähige Szene, Rad dreht sich, Physik läuft. Alle 10 s Bildabstand (Median, 95 %) und verpasste Bilder; jede Minute 2 s Reservefaktor; in der App die Wärmestufe. | 60 Bilder/s über 10 min, Median ≤ 12 ms (Bericht 10), 95 % ≤ 17,5 ms |
| **B5 Start und Speicher** | eigener Knopf, lädt neu | Zeit bis zum ersten Bild (Navigation Timing), Wasm übersetzen und einrichten (gestreamt und aus Puffer), Shader übersetzen und verbinden je Programm (bis zur ersten fertigen Zeichnung, über einen Zaun), Summe der Texturen, Puffer und des Wasm-Speichers; dreimal neu laden und den Wasm-Speicher erneut anlegen | Budgets aus 5.6; kein Fehler beim dritten Laden |
| **B6 Kontextverlust** | 5 s | `loseContext()` und `restoreContext()`: Zeit bis zum ersten richtigen Bild, Prüfsumme des Bilds vorher und nachher | gleiches Bild, ≤ 500 ms |
| **B7 Wiederholbarkeit** | 10 s | 600 Takte mit festem Eingabeprotokoll, Hash aus Box2D und Figur, groß angezeigt | gleicher Hash auf Mac und iPhone (Bericht 09) |
| **B8 Editor** | 30 s (iPad, Mac) | künstliches Ziehen an einem Griff mit Zeigerereignissen; dabei Autorig nach Pause, Spur der Zukunft, Live-Werte; Bildzeit des Hauptthreads (95 %), Wartezeit bis Autorig und Spur fertig | Hauptthread ≤ 8 ms (95 %); Autorig ≤ 50 ms; erste Spur im nächsten Bild |
| **B9 Verbindung** (optional) | 10 s | Mac schickt Zeitstempel über den Dev-Server, das iPhone antwortet; halbe Umlaufzeit | < 0,5 s (Bericht 11) |

**Ergebnisansicht:** Je Posten eine Ampel und eine Zeile Klartext. Für Florian kommt oben eine Zusammenfassung: „Das Spiel hält
60 Bilder je Sekunde: ja/nein. Reserve: x-fach. Nach 10 Minuten: …“. Darunter stehen die Zahlen für die Sitzungen.

### 7.3 Welche Probe wo landet

| Bericht | Bisherige Einzelprobe | Block |
| --- | --- | --- |
| 07 | Autorig: Laufzeit auf dem iPhone unter 50 ms; Rollen, Seiten, Probewackeln | B2 (e1), B8; die Prüfung der Rollen und das Probewackeln bleiben eine Sichtprobe für Florian |
| 08 | Figurphysik unter 1 ms je Bild bei 60 Hz | B2 (d2), B4 |
| 09 | Rechenzeit unter 1 ms je Takt; Hash auf Mac und iPhone gleich; Bindung ohne Speicherfehler in Safari | B2 (d1), B7, B5 (Wasm-Speicher) |
| 10 | Stufe 0: Prototyp in Safari und App, 60 Bilder/s über 5 min, Median ≤ 12 ms; WebGPU vorhanden?; Sättigung beim Zoom | B3, B4 (jetzt 10 min), B0; die Sättigung als Szene in B3 mit Zoom |
| 11 | Bildrate zählen (60/120 Hz); Inspector-Werte beim Abspielen unter 16,7 ms; Änderung am Mac in unter 0,5 s auf dem iPhone | B1, B8, B9 |

### 7.4 Messverfahren im Einzelnen

- **Stapel statt Einzelmessung:** Bei 1 ms Uhr misst man nie einen Lauf von 0,2 ms einzeln, sondern n Läufe hintereinander, bis der
  Stapel mindestens 2 ms dauert. Gemeldet wird die Zeit geteilt durch n.
- **Aufwärmen:** Die ersten 3 s jedes Postens werden verworfen (Stufen des JIT, Abschnitt 3.3).
- **Grafikzeit ohne Zeitabfrage:** (1) *Stapel mit Warten:* k Bilder in einen Zwischenpuffer zeichnen, dann einen Bildpunkt lesen;
  das blockiert, bis die Grafikkarte fertig ist. (2) *Zaun:* `fenceSync` nach dem Bild, in den folgenden Bildern ohne Blockieren
  abfragen (MDN); das ergibt eine grobe Fertigzeit. (3) *Reservefaktor:* Die Seite zeichnet die Szene m-mal je Bild (m = 1; 1,5;
  2; 3; 4) und sucht das größte m, bei dem 95 % der Bildabstände unter 17,5 ms bleiben. Die Grafikzeit beträgt dann ungefähr
  16,7 ms / m. Das misst unter echten Bedingungen samt WebKit und Compositing. Für den Prozessor geht dasselbe mit wiederholtem
  Auswerten.
- **Statistik:** Median, 95 %, 99 %, Höchstwert, Anteil der Bildabstände über 25 ms und längste Lücke. Mittelwerte allein verdecken
  Ruckler.
- **Wärme ohne App:** Safari kennt die Wärmestufe nicht. Der jede Minute gemessene Reservefaktor zeigt die Drosselung trotzdem.
- **Einmal mit Werkzeugen eichen:** Der Speicher des Webprozesses lässt sich nur im Web Inspector sehen (iPhone per Kabel am Mac). Für
  die genaue Grafikzeit gibt es Instruments mit dem Metal-Systemtrace auf dem GPU-Prozess. Beides braucht einmal das Gerät am Mac
  und ersetzt die Seite nicht.

### 7.5 Ablauf für Florian

1. Akku über 50 %, **nicht am Ladekabel** (Laden wärmt), Stromsparmodus aus, Adaptive Power notieren, Helligkeit fest, Gerät flach
   auf den Tisch.
2. Seite öffnen (Safari, danach die App), „Messen“ tippen, 15 Minuten nicht anfassen.
3. Am Ende schickt die Seite das Ergebnis selbst. Er sieht die Zusammenfassung mit Ampeln.
4. Optional eine Minute im Stromsparmodus: Er sieht selbst, wie 30 Hz aussehen, und die Seite misst den Faktor des Prozessors.

Das ist eine einmalige, vorher festgelegte Probe je Gerät (Arbeitsregeln 1 und 2). Danach rechnen alle Sitzungen mit den gemessenen
Faktoren statt mit Schätzungen. Nach größeren Änderungen am Renderer läuft nur B3 erneut (eine Minute).

---

## 8 Ehrliche Gegenüberstellung für unseren Fall

Unser Fall: ein Charakter- und Physik-Spieleditor, ein Art Director ohne Programmierkenntnisse, Mac und iPad/iPhone. Dazu kommen
„Performance immer top“ und „sein Auge entscheidet“.

**8.1 Wie die Felder rechnen**

| Weg | Stärken | Schwächen | Urteil |
| --- | --- | --- | --- |
| A Prototyp wie heute (ganze Fläche, volle Dichte) | läuft, einfach | rechnerisch 15 bis 34 ms auf dem iPhone; rund 180 MB Texturen | nicht für das Spiel |
| B Rahmen je Figur, volle Dichte | kleine Änderung, Bild unverändert | eine Figur passt, die Szene aus 13 knapp nicht | **sofort** |
| C Rahmen, Felder halb, Bild voll (Valve) | Speicherverkehr und Texturen auf ein Viertel, R sättigt später | Spitzen könnten weicher werden | **nächster Schritt, nur nach Vorher-Nachher-Bild** |
| D Kachel-Durchgang (Stufe 2) | keine Zwischentexturen, keine Flächengrenze | eigener Code, mehr Rechnen, Einsortieren | Reserve, wenn C die Messung nicht besteht |
| E WebGPU mit Rechenshadern | Einsortieren auf der Grafikkarte | iOS 26 und neuer, frische Fehler | später |

**8.2 Bildtakt bei Stromsparmodus und Wärme**

| Weg | Stärken | Schwächen | Urteil |
| --- | --- | --- | --- |
| Nichts tun | einfach | Florian urteilt unwissentlich bei 30 Hz; unregelmäßige Bilder bei Hitze | nein |
| Anzeigen und gleichmäßig halten | ehrlich; fester Takt mit Interpolation hält Bewegung richtig | weniger flüssig | **ja**: Hinweis „30 Bilder/s (Stromsparmodus)“ im Editor; das Spiel rechnet in festen Takten |
| Bei „critical“ gleichmäßig 30 Hz (wie Unity) | Gerät kühlt, kein Stottern | nur in der App erkennbar | ja, nach Florians Wort |
| Auflösung dynamisch senken | hält 60 Hz | Look wechselt | im Editor nie; im Spiel höchstens eine Stufe |

**8.3 Grafikzeit messen**

| Weg | Stärken | Schwächen | Urteil |
| --- | --- | --- | --- |
| Zeitabfrage der Grafikkarte | genau | auf iOS praktisch nicht vorhanden; in Chrome schwankend | nur wo vorhanden, als Zusatz |
| Stapel mit Warten (einen Bildpunkt lesen) | einfach, überall | Sync-Aufschlag, nicht der echte Ablauf | **ja**, je Posten |
| Zaun (`fenceSync`) | blockiert nicht | grob | ja, für den Dauerlauf |
| Reservefaktor (Mehrlast bis zum ersten verpassten Bild) | misst die echte Lage samt WebKit | indirekt | **ja**, Hauptzahl für Florian |
| Instruments am Mac | genau, mit GPU-Prozess | Gerät am Kabel, nur für uns | einmal zum Eichen |

**8.4 Wo schwere Editor-Rechnungen laufen**

| Weg | Stärken | Schwächen | Urteil |
| --- | --- | --- | --- |
| Hauptthread in Scheiben | einfacher Zustand | Safari ohne `requestIdleCallback`; jede Scheibe kostet Bildzeit | nur unter 1 ms |
| Dauerhafter Worker | blockiert nie, Modul per `postMessage` teilbar | Daten kopieren, Stand prüfen | **ja** für Autorig und Spur |
| WebAssembly | schneller bei Zahlenlasten | Speicherfragen auf iOS, mehr Bau | erst, wenn JS das Budget reißt |

**8.5 Spur der Zukunft**

| Weg | Stärken | Schwächen | Urteil |
| --- | --- | --- | --- |
| Volle Physik je Ziehbild | genau | 18 bis 84 ms | nein |
| Geschlossene Lösung je Feder | Mikrosekunden, beliebig viele Geister | nur Einzelfedern | **ja** |
| Worker mit eigener Kopie, schrittweise | Ketten und Welt; Hauptthread frei | 1 bis 5 Bilder Verzögerung | **ja** |
| Gröberer Takt für die Spur | halbiert Kosten | weicht minimal ab | als Zusatz |

**8.6 Wo gemessen wird**

| Weg | Stärken | Schwächen | Urteil |
| --- | --- | --- | --- |
| Nur Mac | bequem | der Grafikfaktor (3 bis 5,5) bleibt geschätzt; keine Wärme, kein Stromsparmodus | nein |
| Safari auf dem iPhone | schnell, genaue Uhr mit Isolation | keine Wärmestufe | **ja** |
| App (WKWebView) | echtes Spiel, Wärmestufe per Plugin | Kopfzeilen und Wasm-Typ prüfen | **ja** |
| Chrome am Mac | 120 Hz, Zeitabfrage | andere Engine | nur Zusatz |

---

## 9 Empfehlungen

1. **Budget festschreiben** (Abschnitt 6) und an jede Etappe binden: Hauptthread ≤ 6 ms, Grafik ≤ 8 ms kalt, GPU-Speicher ≤ 150 MB,
   ein WebGL-Kontext, erstes Bild ≤ 2 s.
2. **Bis zur Messung mit der Umrechnungsregel arbeiten** (6.4): Prozessor mal 1 (warm mal 1,4), Grafik mal 4 (warm mal 5,5). Am Mac
   in Safari messen, nicht in Chrome.
3. **Messseite `tempo.html` als eigene Etappe bauen** (nach Freigabe). Florian misst einmal je Gerät, in Safari und in der App. Sie
   ersetzt die Einzelproben aus 07 bis 11.
4. **Renderer jetzt eng fassen** (Weg B, ohne Wirkung auf das Bild): nur im Rahmen jeder Figur zeichnen; ein dauerhafter Puffer statt
   neuer `Float32Array`; unter 100 WebGL-Aufrufe je Bild; `invalidateFramebuffer` für Schablone und Zwischenfelder;
   `preserveDrawingBuffer` im Spiel aus; prüfen, ob `alpha: false` bremst.
5. **Halbe Feldauflösung nur nach Vorher-Nachher-Bild** an seiner Figur in derselben Ansicht (Arbeitsregel 1), mit Blick auf Bart,
   Ohrspalt und Durchbruch. Notfalls gemischt je Teil.
6. **Welt und Effekte billig bauen:** Rad als Kreis mit Höhenprofil, freier Weltpfad als einmal gebackenes Feld im System des Rads,
   Pfützen und Kameratropfen als analytische Tropfen; Brechung nur auf Florians Wunsch.
7. **Auswerten ohne Würfe:** PCHIP-Steigungen nur bei Schlüsseländerung rechnen, Intervall merken, typisierte Felder, gleichbleibende
   Typen; Wächter im Spiel nur an Teilen, die die Physik verformt.
8. **Abflachen nach der Wang-Formel** mit fester Stückzahl je Kurvenstück aus dem größten Bedarf über alle Schlüssel (Toleranz 0,2
   Bildpunkte); im Editor je Zoomstufe; außerhalb der Ansicht weglassen.
9. **Takt:** feste 60-Hz-Takte mit Interpolation für Physik und Abläufe (Bericht 09). 30 Hz im Stromsparmodus annehmen und im Editor
   anzeigen. In der App die Wärmestufe lesen (kleines Capacitor-Plugin): bei „serious“ zuerst Effekte zurücknehmen, bei „critical“
   gleichmäßig 30 Hz.
10. **Editor:** Autorig in einem dauerhaften Worker nach dem Loslassen oder nach 150 ms Pause, angewendet nur bei gleichem Stand. Spur
    der Zukunft geschlossen für Einzelfedern, Ketten und Welt im Worker, Geister als Umrisse. Live-Werte mit höchstens 15 Hz, ohne
    Layout-Lesungen. Kein Verlass auf `requestIdleCallback`.
11. **Robust gegen iOS:** Kontextverlust behandeln und mit `WEBGL_lose_context` testen. Wasm-Speicher klein und nicht geteilt. Alle
    Shader beim Laden übersetzen, keine Shader aus Regeln zur Laufzeit erzeugen. Wasm mit `application/wasm` laden oder aus einem
    Puffer. Spielvorschau nie in einem iframe fremder Herkunft.
12. **Kostenanzeige im Editor wie Spines Metrics, aber schlicht:** eine Ampel „iPhone“ aus Ankern, Schlüsseln, Strecken,
    Feld-Bildpunkten und Physik-Körpern, gerechnet mit den gemessenen Faktoren. Die Zahlen dahinter nur auf Wunsch.

---

## 10 Offene Fragen

1. Welches iPad hat Florian (Chip, Größe), und welche M3-Pro-Fassung (14 oder 18 Grafikkerne)? Davon hängen die Faktoren für den
   Editor ab.
2. Hält der heutige Prototyp auf dem iPhone 60 Hz? Die Vorhersage lautet: nein über den ganzen Bildschirm in Dichte 3 (15 bis 34 ms),
   ja im Rahmen der Figur.
3. Sieht Florian einen Unterschied zwischen Feldern in voller und in halber Auflösung, besonders an den Spitzen?
4. Was ist ihm bei Hitze lieber: gleichmäßig 30 Bilder je Sekunde oder unregelmäßig 40 bis 60?
5. Gilt die 30-Hz-Drosselung des Stromsparmodus in der Capacitor-App genauso wie in Safari? Erwartet wird ja (gemeinsamer
   Quelltext); B1 prüft es.
6. Ist Adaptive Power auf seinem iPhone an? Dann kann der Stromsparmodus bei 20 % Akku von selbst kommen.
7. Brauchen die Tropfen auf der Kamera Brechung? Sie kostet einen Vollbild-Durchgang mehr.
8. Wie groß ist Ozzy im Spiel (Anteil der Bildhöhe), und ist die zweite Figur gleichzeitig im Bild?
9. Wie hoch ist die Grenze des GPU-Prozesses für Texturen auf dem iPhone 16? Dafür habe ich keine Quelle gefunden.
10. Bietet WebGPU in Safari 26 und 27 auf dem iPhone Zeitstempel-Abfragen? Dann ließe sich die Grafikzeit genau messen (nur für einen
    WebGPU-Nachbau).
11. Gelten die COOP- und COEP-Kopfzeilen in der WKWebView der App? Die Seite meldet es in B0. Davon hängt die Auflösung der Uhr in der
    App ab.

---

## Quellen

**WebKit-Quelltext und Fehlerberichte**
- Bildtakt und Drosselgründe: <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/graphics/AnimationFrameRate.h>,
  <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/graphics/AnimationFrameRate.cpp>
- Seite, Stromsparmodus, Wärme, Timer: <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/page/Page.cpp>
- Wärmestufe ab „serious“: <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/cocoa/ThermalMitigationNotifier.mm>
- Einstellungen (60 fps, Wärme aggressiv): <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml>
- Größe der Zeichenfläche: <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/CanvasBase.cpp>
- WebGL-Kontexte (16 je Seite): <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/html/canvas/WebGLRenderingContextBase.cpp>
- Drosselung im Stromsparmodus (2017): <https://bugs.webkit.org/show_bug.cgi?id=168837>
- 90 Hz unter iOS 13: <https://bugs.webkit.org/show_bug.cgi?id=202269>
- 30 Hz ist Absicht: <https://bugs.webkit.org/show_bug.cgi?id=215745>
- Uhr 1 ms und 20 µs: <https://bugs.webkit.org/show_bug.cgi?id=228137>
- WebGL im GPU-Prozess auf iOS: <https://bugs.webkit.org/show_bug.cgi?id=236382>
- Kontextverlust iOS 17: <https://bugs.webkit.org/show_bug.cgi?id=262628>
- Kontextverlust iOS 18: <https://bugs.webkit.org/show_bug.cgi?id=289601>
- WebAssembly-Speicher nach Neuladen: <https://bugs.webkit.org/show_bug.cgi?id=269777>
- Zeitabfrage eingebaut (2023): <https://bugs.webkit.org/show_bug.cgi?id=252388>
- Shader-Übersetzen blockiert: <https://lists.webkit.org/pipermail/webkit-unassigned/2023-February/1084921.html>

**WebKit-Blog**
- Speicherbereinigung Riptide: <https://webkit.org/blog/7122/introducing-riptide-webkits-retreating-wavefront-concurrent-garbage-collector/>
- Stufen des JIT: <https://webkit.org/blog/10308/speculation-in-javascriptcore/>
- WebAssembly BBQ und OMG: <https://webkit.org/blog/7691/webassembly/>
- Web Inspector, Speicher: <https://webkit.org/blog/6425/memory-debugging-with-web-inspector/>
- Web Inspector, Prozessor: <https://webkit.org/?p=8993>

**Apple**
- Meldungen zu Strom und Wärme: <https://developer.apple.com/documentation/xcode/responding-to-power-notifications>
- Wärmestufen: <https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.enum>
- Stromsparmodus: <https://support.apple.com/en-us/101604>
- Metal-Tabellen (23.10.2026): <https://developer.apple.com/metal/Metal-Feature-Set-Tables.pdf>
- WKWebView bei 60 Hz (Forum): <https://developer.apple.com/forums/thread/773222>
- Abbruch des Webprozesses bei 1,25 GB (Forum): <https://developer.apple.com/forums/thread/771787>
- „ActiveHard 2048 MB“, iPhones strenger als iPads (Forum): <https://developer.apple.com/forums/thread/823061>
- M5, 153 GB/s: <https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/>
- M3-Familie: <https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/>
- iPhone 16, technische Daten: <https://www.apple.com/mt/iphone-16/>

**Vergleichswerte**
- iPhone 16 im Test (Browser, Grafik, Dauerlast, Wärme): <https://www.notebookcheck.net/Apple-iPhone-16-smartphone-review-More-innovations-than-one-would-think.908118.0.html>
- A18, Benchmarks und Stresstest: <https://beebom.com/apple-a18-benchmarks/>
- A18-Grafik (Sammlung): <https://www.notebookcheck.net/Apple-A18-GPU-Benchmarks-and-Specs.891560.0.html>
- M3 Pro, 18 Grafikkerne: <https://www.notebookcheck.net/Apple-M3-Pro-18-Core-GPU-Benchmarks-and-Specs.782445.0.html>
- M3 Pro, 14 Grafikkerne: <https://www.notebookcheck.net/Apple-M3-Pro-14-Core-GPU-Benchmarks-and-Specs.782454.0.html>
- MacBook Pro 14 M3 Pro im Test: <https://www.notebookcheck.net/Apple-MacBook-Pro-14-2023-M3-Pro-review-Improved-runtimes-and-better-performance.779538.0.html>
- M3 Pro, Prozessor: <https://www.notebookcheck.net/Apple-M3-Pro-11-Core-Processor-Benchmarks-and-Specs.783008.0.html>
- Geekbench-Sammlung iPhone und iPad: <https://everymac.com/apple-benchmarks/all-current-apple-devices-benchmarks.html>
- iPad mini A17 Pro gegen Air M2: <https://appleinsider.com/articles/24/10/18/first-benchmarks-show-massive-leap-in-ipad-mini-performance>
- A18 Bandbreite (+17 %): <https://www.tomshardware.com/uk/phones/iphone/apples-a18-processor-powers-the-iphone-16-and-apple-intelligence>
- 8 GB im iPhone 16: <https://9to5mac.com/2024/09/13/iphone-16-ram-apple-intelligence/>
- Stromsparmodus halbiert die Leistung: <https://9to5mac.com/2025/02/17/low-power-mode-slows-down-iphone/>,
  <https://www.tomsguide.com/phones/iphones/slow-running-iphone-heres-the-first-thing-you-should-check-to-fix-it>
- Adaptive Power: <https://www.macrumors.com/2025/09/03/ios-26-adaptive-power-setting>

**Verfahren, Handbücher, Aufsätze**
- MDN, WebGL-Praxis: <https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices>
- MDN, Kontextverlust: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event>
- RAIL, 10 ms je Bild: <https://web.dev/articles/rail>
- Layout und erzwungenes Layout: <https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing>
- Statischer Speicher mit Pools: <https://web.dev/articles/speed-static-mem-pools>
- `requestIdleCallback` in Safari: <https://caniuse.com/requestidlecallback>
- Zeitabfrage in der Praxis: <https://web3dsurvey.com/webgl2/extensions/EXT_disjoint_timer_query_webgl2>
- Übersetzungsdurchsatz von WebAssembly: <https://wingolog.org/archives/2020/04/14/understanding-webassembly-code-generation-throughput>
- Skia, Wang-Formel: <https://raw.githubusercontent.com/google/skia/main/src/gpu/tessellate/WangsFormula.h>
- Valve, Abstandsfelder in kleiner Auflösung (2007): <https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf>
- Rive, Renderer und Pixel Local Storage: <https://rive.app/docs/runtimes/cpp/renderers.md>
- Spine, Metrics: <http://esotericsoftware.com/spine-metrics>
- Box2D, Bewegungsmeldungen: <https://box2d.org/documentation/md_simulation.html>
- Unity, Takt nach Wärme: <https://docs.unity.com/en-us/engine/6000.5/script-reference/unityeditor/playersettings/adjustiosfpsusingthermalstate>
- Unity, dynamische Auflösung: <https://docs.unity3d.com/2022.3/Documentation/Manual/DynamicResolution.html>
- Unity, getrennte Physikszenen: <https://docs.unity3d.com/Manual/physics-multi-scene.html>
- Capacitor, Live Reload: <https://capacitorjs.com/docs/guides/live-reload>
- Wasm-Typ und Capacitor (Forum): <https://forum.obsidian.md/t/plugin-failure-promisereactionjob-native-code-web-assembly-related/43392>

**Stimmen von Nutzern**
- 30 Hz entdeckt (Motion): <https://motion.dev/magazine/when-browsers-throttle-requestanimationframe>
- Keine Umgehung im Stromsparmodus (GreenSock): <https://greensock.com/forums/topic/26826-any-way-to-keep-gsap-running-at-60fps-while-mobile-device-is-in-low-power-mode/>
- Safari heiß und hungrig (Babylon.js): <https://forum.babylonjs.com/t/safari-is-basically-broken/54886>
- Kontextverlust nach Hintergrund (three.js): <https://discourse.threejs.org/t/context-lost-when-backgrounding-safari-on-ios-17-developer-beta-8/55772>

**Im Repo**
- `docs/look/ozzy-figur/UEBERGABE.md` (Mac-Messungen des Prototyps), `apps/editor/src/ozzy-figur/form.ts` (`pchip`, `abflachen`),
  `raster.ts` (`formAusSchluesseln`), `renderer.ts` (Durchgänge), `main.ts` (Dauerlauf), `docs/research/tech-stack.md`, Berichte
  03, 06, 07, 08, 09, 10, 11, 12, 13 dieses Ordners.
