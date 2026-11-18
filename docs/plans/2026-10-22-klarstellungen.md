# Klarstellungen zu Netz und Linien (Florian, Teil 1)

> Wörtlich gespeichert am 02.11.2026 (Sitzung „Gegenprüfung und Prüfplan“, Schritt 2 des Vorgehens in `docs/UEBERGABE.md`),
> nichts geändert. Florian hat den Start-Prompt aus der Übergabe unverändert eingefügt (dort stand „fertig“ schon mit drin)
> und Teil 1 darunter in einer Nachricht geschickt. Teil 2 (Bausteine) kommt später: `2026-10-22-bausteine-wuensche.md`.
> Bilder gehören nach `docs/look/klarstellungen-2026-10-22/` (in dieser Nachricht keine).
>
> Gegenprüfung und Prüfplan dazu: `2026-11-02-gegenpruefung-liniennetz.md` und `2026-11-02-pruefplan-p0-p3.md`.

## Nachricht 1 (02.11.2026)

Zu Teil 1:
Meine Klarstellungen betreffen hauptsächlich den ablauf und die ansichten des meshes und wie sie im 3d view umgesetzt werden sollen. Mir geht es darum dass ich bisher die 3 ansichten als sillouetten/umriss bezeichnet habe. Was ich vielmehr meinte ist eine illustration mit outlines die sich automatischaus der fom+ kante mit gezeigter verjüngung ergibt zusammen mit den edgloops...wobei sinnvollerweise die meisten kanten edgeloops sein werden.

Die 3 ansichten sehen dann aus wie 3 illustrationen mit outlines die wie bei richtigen illustrationen auch falten, höhe und tiefe andeuten können. Wie eine seitliche dünne flosse die man in seitenansicht mit einem edgeloop gestrichelt für den ansatz und eventuell einer harten kante für ein überstehendes teil (von oben eine sichelform oder so). Wir haben das schon halbwegs drin, aber wir fokusieren uns noch zu sehr auf spanten und sillhouetten.

Bitte überprüfe hier nochmal alle werkzeuge und ob ich diese wirklich brauche. Mir ist klatr, dass man halb und viertelansichten zwischen den 3 ansichten nicht immer 100%ig ableiten kann. Da muss das Mesh immer den exakten weg finden. Wenn keine kante angezeichnet ist sollte es also immer einfach so rund wie möglich in dn nächsten punkt übergehen. Die aktuell schwarze linie hätte ich eher erwatt, dass sie so läuft wie die gelbe linie. Wir hatten schon vorher beschrieben dass am ende z.B bei ente und langhals der bauch von oben durch den kopf laufen muss und die lie die "durch bzw unter" dem kopf läuft wird dann gestrichelt oder erkennbar blasser dargestellt und ist bearbeitbar. Die schwarze linie die gerade 2 zusaätzliche punkte von oben bildet, an der stelle wo baauch durh den kopf geht, brauchen wir dann so nichtmehr.

Behalte immer die Vision im auge aus 3 Outline-Illustrationen (5 mit unten und hinten) entsteht eine 3d grafik. Das Mesh muss inelligenz und super elegant sein! Die Vektorgrafiken alleine sehen dann aus wie Blueprints oder CAD grafiken mit organischen formen und cuttenden outlines zwischen 3px und 0px bzw gestrichelt. Wenn du hierzu noch gute iddeeen hast, immer her damit. Ich bin offen für gute voschläge also denk hier gerne nochmal extra nach und mache intensive recherchen.

Wichtig ist auch dass ich von beginn umstellen kann um den character auch in spielqualität zu sehen und ob das mesh gut auf die low poly variante umgesetzt wird, das wir im editor erzeugen. Mache auch hierzu wenn nötog nochmal ausführliche tests.

Ich bin jetzt einihge Stunden auf reisen. Mache alle aufgaben und notwendigen tests selbstständg und so ausführlich wie möglich um den weg ehrlich bestätigen zu können und prüfe meine klarstellungen nochmal gegen die aktuellen pläne und den bisherigen projektverlauf. Versuche immer die eleganteste und beste lösung zu findnen und gib alles, nimm dir die Zeit die es braucht und gehe keine abkürzungen.

Klarstellungen zu teil 2 sind jetzt noch nicht relevant und kommen dann irgendwann später

## Nachricht 2 (05.11.2026, Form zuerst: Outlines, Edgeloops, kein Verschmelzen)

> Wörtlich gespeichert am 05.11.2026 im Arbeitsbaum `form-zuerst`, nach den Proben „Teile“ (normales Fenster und `?linien`).

Das mit den teilen halte ich für keine gute Lösung. Vorher war es ein teil verschmilz und jetzt sind es zwei. Die form hat es ja zuvor schon gut getroffen. Die querschnitte von kopf und bauch sind in den anderen ansichten dann noch nicht gutzu bearbeiten und es wirkt sehr instabil, was aber an dem zusammenspiel der ganzen  linien und outline liegt.

Ich habe grundsetzlich ein gutes gefühl bei der methode, da das mesh sehr organisch wirkt. Das gefällt mir. Die bedeutung der outlines muss noch anders werden und ich möchte das prinzip von edgeloops mehr vertiefen. Ich verstehe deine aussage dazu, aber sie sollen mehr als bearbeitungstool dienen und sind später zusätzlich guidelines für die topologie. Die Outlines dürfen nichtmehr in dem sinn als grifflinie gesehen werden. das mag bei der kugel so sein, aber die outline selbst soll letzt endlich nicht bearbeitet werden sondern wie bei einem 3d model die netzpunkte die sich aus der anfänglichen outline und den erstellten linien und kanten ergeben. Das mesh soll nicht zu einem "donut" verschmelzen können sondern ein ende steckt dann in dem anderen. das gleiche prinzip gilt bei getrennten kieferern. Es ist alles mit dem netz verbunden. Edgloops macht man gerne selbst aber die seiten sollen auch am ende alle gleichwertig sein, dass ich überall alles machen kann. Macht meine klarstellung sinn?

Wenn es nch keinen sinn macht, brauchen wir das nicht direkt so umsetzen, aber sind wir auf demweg dahin bzw ist das mit dieser methode so umsetzbar und weche tests bauchen wir noch um das zu beweisen? Bezier-Hanles wären glaube ich auch die bessere wahl. du meintest das macht keine probleme.

## Nachricht 3 (05.11.2026 abends, nach dem Vorschlag „Netz als Wahrheit“)

> Wörtlich gespeichert am 05.11.2026. Davor zwei kurze Nachrichten: „Bei einem Netz.....klingt nach einem anderen system...mehr nach
> käfig statt unserer neuen form.“ und „ich muss überlegen“.

Es soll ja ein dichtes netz sein das sich selbst generiert. Die outlines stören. sie machen bei organischen formen extrem krumme linien bei den anderen ansichten und ich weiß nicht ob das zu fixen ist. es macht doch viel mehr sinn es wie ein echtes 3d model zu behalten. die outlines bleiben natürlich. das endergebnis in den 3 ansichten soll immernoch aussehen wie ein blueprint oder eine vectorillustration. Kanten und edgloops sind quasi die selbe idee. ich gebe kopf und bauch ein edgloop und über diesen steuer ich die breite von oben oder von vorne...das geht von allen seiten so. die edgeloops passen sich immer genau an und die form muss immer abgerundet sein. daher ist der ansatz mit den organischen eliptoiden nicht schlecht. Das wichige ist aber dass kanten, edgloops (man kann auh überlegen dass das das gleiche sein wird) und unterschiedliche kiefer nichts anderes als edgloops bzw kanten sind. Die outline ist die outline, bearbeitet werden aber die griffe auf den loops und kanten. Die form bläst sich immer zur optimalen rundung auf. punkte kann man als bezierpunkte bearbeiten und es funktionieren die tools wie (o) in blender mit dem circle of influence. Es soll die perfekte mischung aus vektorwerkzeugen und blender sein.

Passen meine klarstellungen oder helfen sie die sicht zu klären? Was ist die ehrliche einschätzung. Es hat sich mit den linien nicht schlecht angefühlt. aber die ansichtslinien die von alleine entstehen, das verzerren des meshes in den anderen ansichten, die art des aufblasens (wenn ich etwas schmale mache nehme ich ihm auch die höhe) und dass edgloops/umrisse so ungerade mit viel zu vielen punkten sind macht die bearbeitung und einschätzung für mich gerade schwer. Wenn ein netz wie bei zBrush besser ist lohnt es sich vllt bzw was ist es eigentlich nicht schon so?
