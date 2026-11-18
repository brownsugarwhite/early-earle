# Claude direkt in Ozzy: Recherche (18.11.2026)

**Auftrag** (Florian, 18.11., wörtlich): „ich würde dich gerne direkter in ozzy einbauen. Z.B um anfangs eine vektor form auch durch
promt zu vektorform eingeben zu können. Können user sich z.B mit ihrem antropic accout einloggen und dich dann so direkt steuern? es
gäbe dann eine kleine eingabe neben den wekzeugen. nur recherchieren nichts bauen!“

Nichts gebaut, nichts an Ozzy geändert. Quellen am Ende; Stand der Regeln und Preise: 18.11.2026.

## Kurz

- **Anmelden mit dem Claude-Konto direkt in Ozzy: nein.** Anthropic verbietet fremden Apps ausdrücklich, eine Claude-Anmeldung
  einzubauen oder Anfragen über die Abos ihrer Nutzer (Free, Pro, Max, Ultra) laufen zu lassen. Seit Anfang 2026 wird das auch
  technisch durchgesetzt.
- **Erlaubt ist, was du willst, auf zwei anderen Wegen:**
  - **Ozzy als Claude-Seite (Artifact):** Ozzy läuft innerhalb von Claude (claude.ai oder Claude-App). Jeder Nutzer ist dort mit
    seinem Konto angemeldet, und jede Anfrage zählt gegen sein eigenes Kontingent. Das ist der einzige offizielle Weg zu „Nutzer
    zahlen mit ihrem Claude-Konto“.
  - **Ozzy ruft Claude über die Schnittstelle (API):** mit einem Schlüssel aus der Claude Console. Max- und Ultra-Abos enthalten
    dafür monatlich 100 bzw. 200 Dollar Guthaben, getrennt vom Wochenlimit von Claude Code.
- **Prompt zu Vektorform:** Das Format passt genau. Ozzys Silhouette ist ein Pfad aus Ankern mit Griffen, also das, was Claude als
  Vektorpfad liefern kann. Ob die Silhouetten deinen Look treffen, ist **ungetestet**. Ein Test mit Kriterium steht unten (Abschnitt 5).
- **Empfehlung:** für dich und Nicole jetzt die API mit dem Abo-Guthaben; für fremde Nutzer später Ozzy als Claude-Seite, nach einem
  Lauftest.

## 1. Was Ozzy dafür schon mitbringt

Stand `claude/ozzy`, `6bef9f17`:

- **Die Silhouette ist ein Vektorpfad.** In `apps/editor/src/ozzy/blatt.ts` besteht sie aus Ankern `{x, y, ein, aus}`: Lage und zwei
  Griffe, in Pixeln des Blatts, y nach unten. Das ist ein kubischer Bézier-Pfad, wie ein SVG-Pfad. Die größte geschlossene Linie
  wird mit ↩ aufgeblasen. Eine Silhouette von Claude müsste nur als Linie aufs Blatt gelegt werden. Danach läuft alles wie heute (P
  zum Nachbessern, ↩ zum Aufblasen, „Weg A“ unverändert).
- **Grobe Punkte genügen.** `anpassen` aus `@ee/shape/zeichnen` macht schon heute aus einem Freihandstrich einen Pfad mit den
  wenigsten Ankern. Liefert Claude nur grobe Punkte, macht Ozzy daraus mit Florians Glättung einen sauberen Pfad.
- **Platz für die Eingabe:** Die Leiste (`leiste.ts`) besteht aus Haarlinien-Zeichen (P, Freihand, Ellipse/Würfel, Lasso,
  Mülleimer). Eine kleine Eingabe könnte dort als weiterer Tropfen aufklappen, im Stil von liquid drop.
- **Ozzy ist schon von außen bedienbar:** Die Test-Haken `window.__ozzy` (49 Einträge) zeigen, dass sich Ablauf und Zustand per
  Code erreichen lassen. Daran könnten später Werkzeuge hängen, die Claude aufruft („Silhouette setzen“, „Bild der Form holen“,
  „aufblasen“).

## 2. Anmeldung mit dem Claude-Konto: nicht erlaubt

- Anthropic regelt das in den Rechtshinweisen zu Claude Code, Abschnitt „Authentication and credential use“. Die Anmeldung mit
  einem Claude-Abo ist nur für Claude Code und Anthropics eigene Apps gedacht. Wer ein Produkt baut, soll API-Schlüssel aus der Claude
  Console nutzen. Fremde Apps dürfen keine Claude-Anmeldung anbieten und keine Anfragen über die Abos ihrer Nutzer leiten. Sie
  dürfen auch keine Claude-Zugangsdaten oder Sitzungen sammeln, speichern oder weiterreichen; angemeldet wird nur über Anthropics
  eigenen Ablauf. Anthropic behält sich vor, das ohne Vorwarnung durchzusetzen.
- Nach Presseberichten sperrte Anthropic solche Zugänge ab dem 9. Januar 2026, und am 19. Februar 2026 wurde die Regel
  klargestellt. Offene Projekte, die den Anmeldeablauf von Claude Code nachbauen („Sign in with Claude“), gibt es weiterhin. Sie
  verstoßen gegen die Verbrauchsbedingungen und setzen das Konto aufs Spiel. **Nicht machen.**
- Die Console (API) ist ein **eigenes Konto mit eigener Abrechnung**; API-Nutzung wird nie über ein claude.ai-Abo abgerechnet.
  Die einzige Brücke ist das monatliche API-Guthaben, das in Max-, Ultra- und Team-Abos enthalten ist (Abschnitt 3, Weg B).

## 3. Die erlaubten Wege

| Weg | Wer meldet sich an | Wer zahlt | Eingabe neben der Leiste? | Passt für |
| --- | --- | --- | --- | --- |
| **A** Ozzy als Claude-Seite (Artifact) | jeder Nutzer bei Claude, in Claudes eigenem Ablauf | jeder Nutzer aus seinem Abo-Kontingent | ja | fremde Nutzer „mit ihrem Konto“ |
| **B** API mit Schlüssel | niemand bei Claude (der Schlüssel liegt auf dem Mac) | Florian (Abo-Guthaben oder gekauftes Guthaben) | ja | Florian, Nicole, das Team |
| **B'** API, Nutzer tragen eigenen Schlüssel ein | niemand; der Nutzer kopiert seinen Console-Schlüssel | jeder Nutzer über sein Console-Guthaben (nicht sein Abo) | ja | fremde Nutzer, die eine Console haben |
| **C** App Attest (native App für iPad/Mac) | niemand; die App weist sich bei Anthropic aus | Florians Workspace | ja | später, wenn Ozzy eine App wird |
| **D** Claude bedient Ozzy von außen (MCP) | Florian in Claude Code oder der Claude-App | Florians Abo | nein, die Eingabe ist im Claude-Fenster | Florian allein, zum Ausprobieren |

### Weg A: Ozzy als Claude-Seite (Artifact mit der Fähigkeit `sample`)

- **So geht es:** Ozzy wird gebaut (`vite build`) und als Artifact auf claude.ai veröffentlicht, mit allen Dateien. Die Seite fragt
  Claude über `claude.use("sample")`. Jeder, der die Seite öffnet, ist dort mit seinem Claude-Konto angemeldet. Jede Anfrage zählt
  gegen sein eigenes Kontingent, „wie jede andere Nachricht“; Florian zahlt für fremde Nutzung nichts. Beim ersten Aufruf fragt
  Claude den Nutzer um Erlaubnis.
- **Was die Seite damit kann:** Text mit Anweisung, Daten und gewünschtem Format schicken; die Antwort als JSON lesen
  (`sample.json`); Funktionen der Seite als Werkzeuge anbieten, die Claude aufruft (z. B. „Silhouette setzen“, „Bild der Form
  holen“); Bilder mitschicken (die Leinwand als Bild), damit Claude sein Ergebnis sieht und nachbessert. Wählbar sind drei Stufen:
  schnell, normal, stark.
- **Zeiten** (aus der Schnittstellenbeschreibung): Die schnelle Stufe antwortet in ein bis zwei Sekunden. Normal und stark denken
  erst nach; bis zum ersten Text vergehen 5 bis 60 Sekunden. Mit Werkzeugen dauern drei Runden auf der normalen Stufe meist 30 bis 90
  Sekunden. Die Eingabe darf bis 256 KB groß sein.
- **Dazu:** Diktat (`dictation`) macht aus Sprache Text, in Chromium und in der Desktop-App. Gespeichert wird über `assets`, `db` oder
  `downloads` statt im Ordner `wesen/`.
- **Haken:**
  - `sample` gibt es nur innerhalb von Claude, nicht auf `localhost:5205` und nicht auf einer eigenen Website.
  - Die Seite hat kein freies Netz; alles, was sie lädt, muss mitveröffentlicht sein.
  - Jede neue Fassung von Ozzy ist ein neuer Build und ein neues Veröffentlichen; entwickelt wird weiter lokal.
  - Es gibt Ratenbegrenzungen, und der Nutzer muss zustimmen.
  - Das Modell wählt man als Stufe (mit Namen nur, wenn der Nutzer es nutzen darf); einen eigenen Systemprompt gibt es nicht.
- **Ungetestet:** ob Ozzy im Rahmen einer Claude-Seite läuft. Zu prüfen: WebGL 2 und WebGPU (Material „Grün“), Zeiger- und
  Stiftereignisse auf dem iPad, Tastenkürzel wie ⌘Z und ⌘S im eingebetteten Rahmen, Größe des Builds (bis 16 MB je Datei), Speichern.

### Weg B: API mit Schlüssel, Florian zahlt

- **So geht es:** Ein kleiner Server-Teil im Ozzy-Dev-Server (Vite-Middleware auf dem Mac) hält den Schlüssel und ruft Claude. Die
  Eingabe in Ozzy schickt nur den Text dorthin. Weil Ozzy im WLAN läuft, geht das auch vom iPad aus.
- **Guthaben:** Max-Abos enthalten monatlich 100 Dollar API-Guthaben, Ultra 200 Dollar, Team bis 500 Dollar. Man holt es auf
  claude.ai unter Einstellungen → Abrechnung → „API credits“ ab, indem man eine Console-Organisation verknüpft. Ein Abo lässt sich nur
  mit einer Organisation verknüpfen, ändern kann das danach nur der Support. Das Guthaben verfällt am Monatsende. Es zahlt die
  API, nicht Claude Code, und **es belastet das Wochenlimit nicht**. Pro und Free haben keins; dort kauft man Guthaben in der Console.
- **Schlüssel nicht in die Seite:** Die API nimmt zwar Anfragen direkt aus dem Browser an, mit dem Kopf
  `anthropic-dangerous-direct-browser-access`. Dann steht der Schlüssel aber im Seitencode. Für Florians eigenes Fenster ginge das zur
  Not, für alles andere nicht.
- **Für fremde Nutzer (B, B'):** Entweder zahlt Florian: eigener Server, eigene Anmeldung bei Ozzy, Grenzen je Nutzer. Oder jeder
  Nutzer trägt seinen eigenen Console-Schlüssel ein (B'). Das ist erlaubt, aber umständlich, und es zahlt nicht sein Abo.

### Weg C: App Attest (später, native App)

- Neu: iOS- und macOS-Apps können Claude direkt vom Gerät rufen, ohne mitgelieferten Schlüssel und ohne eigenen Server: Die App
  weist bei Apple nach, dass sie echt ist, und bekommt von Anthropic Zugänge für eine Stunde, nur für Nachrichten.
- Es zahlt immer Florians Workspace; die Zugänge tragen keine Nutzerkennung.
- Noch Beta: Es läuft über ein Swift-Paket (OS-27-Betas) und braucht ein echtes Gerät, keinen Simulator. Ein Ozzy in Capacitor
  bräuchte ein kleines natives Plugin. Erst interessant, wenn Ozzy eine App fürs iPad wird.

### Weg D: Claude bedient Ozzy von außen

- **MCP:** Ein kleines Werkzeug verbindet Claude Code oder die Claude-App mit dem offenen Ozzy-Fenster: Silhouette setzen, Bild
  ansehen, aufblasen. Mit Florians eigenem Abo ist das gewöhnliche Nutzung und erlaubt. Die Eingabe sitzt dann aber im Claude-Fenster,
  nicht neben Ozzys Leiste.
- **Unverändertes Claude Code als Motor:** Ozzys Eingabe könnte auf dem Mac ein **unverändertes** Claude Code aufrufen, bei dem sich
  jeder selbst angemeldet hat. Nach den Regeln ist das zulässig. Es zählt aber gegen das Wochenlimit von Claude Code, braucht den Mac
  und antwortet mit Claude-Code-Geschwindigkeit.
- **Interaktiver Connector (MCP App):** Ozzy erschiene dabei im Chat selbst, seit Januar 2026 möglich. Für einen ganzen Editor ist das
  zu eng.

## 4. Empfehlung

1. **Für dich und Nicole jetzt: Weg B mit dem Abo-Guthaben**, falls dein Abo Max oder Ultra ist (sonst Guthaben kaufen). Am wenigsten
   Umbau: Es läuft in deinem Fenster 5205 und auf dem iPad, ohne Anmeldung, und belastet dein Wochenlimit nicht.
2. **Wenn Ozzy für andere offen sein soll und sie mit ihrem Konto zahlen sollen: Weg A.** Vorher ein Lauftest von Ozzy als
   Claude-Seite. Kriterium: Zeichnen, Aufblasen und Drehen laufen flüssig, der Stift funktioniert auf dem iPad, ⌘Z und ⌘S gehen,
   Sichern und Laden funktionieren.
3. **Nicht bauen:** eine eigene Claude-Anmeldung in Ozzy.

**So könnte die Eingabe aussehen** (Vorschlag, nicht gebaut): ein Tropfen in der Leiste klappt ein Feld auf. Man tippt zum Beispiel
„dicker Vogel mit langem Hals, von der Seite“. Claude liefert die Silhouette, und sie erscheint auf dem Blatt als Linie mit Punkten
(mit P bearbeitbar). ↩ bläst sie auf wie heute. Später könnte dieselbe Eingabe auch ändern („Hals länger“, „ein Loop um den Hals“),
immer als Änderung der Linien, damit „Weg A“ gilt. Auf dem iPad diktiert die Systemtastatur in jedes Textfeld; dafür muss nichts
gebaut werden.

## 5. Prompt zu Vektorform: was zu erwarten ist

- **Format:** Claude gibt einen geschlossenen Pfad zurück, als Anker mit Griffen oder als SVG-Pfad. Mit festem Antwortschema
  (strukturierte Ausgabe) ist die Antwort immer lesbar.
- **Qualität, nach einer Vergleichsstudie** (VectorGym, Februar 2026; geprüft wurden ältere Modellgenerationen): Text zu SVG ist die
  leichteste von vier Vektor-Aufgaben. Die stärksten Modelle dreier Anbieter, darunter Claude, liegen dicht beieinander. Typische
  Fehler sind falsche Grundformen, Missverständnisse und unvollständige Formen. Organische Silhouetten misst die Studie nicht
  eigens. **Ob es deinen Look trifft, ist ungetestet.**
- **Hebel für bessere Formen:**
  - Claude sieht das Bild seines Ergebnisses und bessert in zwei bis drei Runden nach.
  - Claude liefert nur grobe Punkte, und Ozzys `anpassen` macht wenige glatte Anker daraus.
  - Einige deiner Silhouetten gehen als Beispiele in den Auftrag.
  - Eine Skizze oder ein Foto geht als Vorlage mit.
- **Fertiges Werkzeug zum Vergleich** (Regel 1: früh sagen, wenn eines schneller trifft): Recraft „Text to Vector“ (V4/V4.1) liefert
  SVG-Pfade; bei Wiederverkäufern kostet ein Bild etwa 0,08 bis 0,30 Dollar (nicht beim Hersteller geprüft). Ozzy würde davon den
  äußeren Umriss nehmen.
- **Test, wenn du willst** (ohne Einbau in Ozzy):
  - Zehn Beschreibungen in deiner Art, je eine Silhouette von Claude (mit und ohne Bild-Runde) und zum Vergleich von Recraft.
  - Alle nebeneinander auf dem Blatt, gleicher Maßstab.
  - **Kriterium:** Du würdest mindestens 6 von 10 als Startform behalten und nur mit P nachbessern.
  - Den Teil mit Claude kann eine Sitzung ohne API-Schlüssel machen: Sie schreibt die Pfade selbst, wie die Eingabe es später täte.

## 6. Kosten über die API (Schätzung, nicht gemessen)

Listenpreise (Stand 03.11.2026), je Million Tokens Eingabe / Ausgabe:

| Modell | Eingabe | Ausgabe |
| --- | --- | --- |
| stärkstes Modell | 4 $ | 20 $ |
| mittleres Modell | 2 $ | 10 $ |
| schnelles Modell | 0,10 $ | 0,50 $ |

Eine Silhouette braucht etwa 3 000 bis 5 000 Tokens Eingabe (Anleitung, Beispiele) und 2 000 bis 8 000 Tokens Ausgabe (Pfad und
Nachdenken):

| Modell | je Versuch |
| --- | --- |
| stärkstes Modell | 5 bis 18 Cent |
| mittleres Modell | 3 bis 9 Cent |
| schnelles Modell | unter 1 Cent |

Mit Bild-Runden kostet ein Versuch das Zwei- bis Dreifache. 100 Dollar Guthaben reichen grob für 200 bis 3 000 Versuche im Monat. Vor
einer Entscheidung messen (Regel 7).

## Quellen

- Anthropic, Rechtliches zu Claude Code, „Authentication and credential use“: https://code.claude.com/docs/en/legal-and-compliance
- Anthropic, Authentifizierung der API (Schlüssel, Workload Identity Federation, App Attest, Anfragen aus dem Browser):
  https://platform.claude.com/docs/en/manage-claude/authentication
- Anthropic, App Attest: https://platform.claude.com/docs/en/manage-claude/app-attest
- Anthropic, API-Guthaben für Max, Ultra und Team: https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- Anthropic, Claude-powered Artifacts (Nutzer zahlen mit ihrem Konto): https://claude.com/blog/claude-powered-artifacts und
  https://academy.claude.com/tutorials/prototype-ai-powered-apps-with-claude-artifacts
- Schnittstelle `sample` für Artifacts (Laufzeitvertrag 0.2.96): aus der Typbeschreibung der Artifact-Fähigkeiten
- Anthropic, interaktive Connectors (MCP Apps): https://claude.com/blog/interactive-tools-in-claude
- Presse zur Sperre: The Register, 20.02.2026: https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access ;
  WinBuzzer, 19.02.2026: https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/
- VectorGym (Vergleich Text zu SVG, Februar 2026): https://www.alphaxiv.org/abs/2603.29852
- Recraft Text to Vector (Wiederverkäufer-Seiten): https://docs.comfy.org/built-in-nodes/partner-node/image/recraft/recraft-text-to-vector ,
  https://www.eachlabs.ai/recraft/recraft-v4/recraft-v4-text-to-vector
