// Setzt die Bildblätter zur Studie „Maul, Zähne, Zunge“ aus den Aufnahmen von `maul-studie-bilder.mjs`.
// Aufruf aus apps/editor: node scripts/ozzy/maul-studie-bogen.mjs <ordner mit den Aufnahmen> [zielordner]
// Alles auf den Blättern ist echt aus dem Fenster der Studie; nur das kleine Schema „Lippen trennen“ ist gezeichnet.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ordner = path.resolve(process.argv[2] ?? '.');
const ziel = path.resolve(process.argv[3] ?? path.resolve(hier, '../../../../docs/progress/ozzy'));
const schrift = `file://${path.resolve(hier, '../../../../assets/fonts/lobster/Lobster-Regular.ttf')}`;
const zahlen = JSON.parse(fs.readFileSync(path.join(ordner, 'zahlen.json'), 'utf-8'));

const kopf = (titel, unter) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@font-face { font-family: Lobster; src: url('${schrift}'); }
html, body { margin: 0; background: #fff; }
body { width: 2400px; padding: 44px 44px 36px; box-sizing: border-box; font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #17202a; }
h1 { font-family: Lobster, serif; font-weight: 400; font-size: 64px; margin: 0 0 6px; }
p.unter { font-size: 25px; margin: 0 0 28px; color: #4a5560; }
h2 { grid-column: 1 / -1; font-family: Lobster, serif; font-weight: 400; font-size: 42px; margin: 14px 0 -10px; }
.gitter { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px 26px; }
.gitter.vier { grid-template-columns: repeat(4, 1fr); }
figure { margin: 0; }
figure .rahmen { border: 1px solid #d6d2cb; border-radius: 6px; overflow: hidden; background: #fff; aspect-ratio: 1100 / 760; }
figure.hoch .rahmen { aspect-ratio: 360 / 364; }
figure img { display: block; width: 100%; height: 100%; object-fit: cover; }
figure.nah img { object-fit: cover; transform: scale(var(--k, 1.5)); transform-origin: var(--o, 50% 50%); }
figcaption { font-size: 23px; line-height: 1.32; margin-top: 10px; color: #17202a; }
figcaption b { font-weight: 650; }
.breit { grid-column: span 2; }
.schema { border: 1px solid #d6d2cb; border-radius: 6px; padding: 18px 22px; }
.schema svg { display: block; width: 100%; height: auto; }
.klein { font-size: 20px; color: #4a5560; }
</style></head><body><h1>${titel}</h1><p class="unter">${unter}</p>`;
const fuss = `</body></html>`;
const b = (name, text, klasse = '', stil = '') => `<figure class="${klasse}" style="${stil}"><div class="rahmen"><img src="file://${path.join(ordner, `${name}.jpg`)}"></div><figcaption>${text}</figcaption></figure>`;

const unter1 = `20.11.2026 · Studie neben Ozzy (maul.html im Fenster 5205) · deine Formen „teat firefish“ und „strange bird“, alles echt aus dem Fenster · an Ozzy, am Werk und am Rechenkern ist nichts geändert`;
const blatt1 =
  kopf('Ozzy · Ein Maul aus einer Linie', unter1) +
  `<div class="gitter">` +
  b('a1-form', `<b>1 · Deine Form, wie sie ist.</b> Die Studie liest sie nur (Haut und Linien aus der Datei).`) +
  b('a2-zu-seite', `<b>2 · Eine Linie von der Seite</b>, vom Mundwinkel (schwarzer Punkt) nach vorn. Zu ist das Maul nur diese Linie, türkis wie in deinem Blatt 05. Gemessen gegen die Form ohne Maul: <b>${zahlen.seite.anders} von ${zahlen.seite.form.toLocaleString('de-DE')} Bildpunkten</b> anders (schräg ${zahlen.schraeg.anders}, Front ${zahlen.front.anders}).`) +
  b('a3-offen-seite', `<b>3 · Geöffnet: durchgestanzt.</b> Von der Seite hat das Maul genau die Form der Linie. Oben rosa, unten blau. Die zwei Tropfen sitzen an den Kieferknochen (Haarlinien zum Mundwinkel).`) +
  b('a4-offen-schraeg', `<b>4 · Die Tasche.</b> Gaumen und Boden dunkelrot, nach hinten dunkler; längs der Lippe der hellere Ring fürs Zahnfleisch. Die Kante an der Lippe ist hart. Die Zunge liegt schon drin.`) +
  b('a5-offen-front', `<b>5 · Von vorn.</b> Gerade von Seite zu Seite: Der Mundwinkel sitzt auf beiden Wangen.`) +
  b('a9-weit', `<b>6 · Weit offen</b> (oben 22°, unten 70°). Vorn dreht jeder Kiefer starr. Hinter dem Mundwinkel staucht sich die Haut hier zu einer Falte: Das ist die Stelle, die im Bau noch Arbeit braucht (Konzept, Etappe 2).`) +
  b('a6-nur-unten', `<b>7 · Nur der Unterkiefer</b> (40°). Der Oberkiefer rührt sich nicht.`) +
  b('a7-nur-oben', `<b>8 · Nur der Oberkiefer</b> (28°). Der Unterkiefer rührt sich nicht: Die zwei haben keinen Einfluss aufeinander.`) +
  b('a8-linien', `<b>9 · Linien der Form, die das Maul kreuzen,</b> stören nicht: Sie reißen an der Lippe, und dort steht je Kiefer ein Punkt (hier die Linie der Mitte an der Spitze).`) +
  `<h2>Selbst gezeichnet, an „strange bird“</h2>` +
  b('d1-strich', `<b>10 · P, ein Strich von der Seite.</b> An seinem inneren Ende, dem Mundwinkel, hängt der Tropfen „Maul“.`) +
  b('d2-maul', `<b>11 · Ein Tipp auf den Tropfen:</b> Aus dem Strich ist das Maul geworden (Schnitt in rund einer Viertelsekunde), mit Tasche, Zahnfleisch und Zunge.`) +
  `<figure><div class="schema"><svg viewBox="0 0 700 430" font-family="-apple-system, Helvetica, Arial, sans-serif">
    <text x="0" y="26" font-size="24" font-weight="650">Lippen trennen (gezeichnet, nicht gebaut)</text>
    <g fill="none" stroke-width="3" stroke-linecap="round">
      <path d="M40,120 C110,150 190,150 250,112" stroke="#2fb8a6"/>
      <path d="M390,112 C460,146 540,148 600,104" stroke="#e8306a"/>
      <path d="M418,132 C470,160 545,158 600,104" stroke="#1f3cf0"/>
      <path d="M40,300 C110,330 190,330 250,292" stroke="#e8306a"/>
      <path d="M22,318 C100,352 190,346 250,292" stroke="#1f3cf0"/>
      <path d="M390,290 C460,322 540,326 600,284" stroke="#e8306a"/>
      <path d="M390,318 C455,352 540,346 600,284" stroke="#1f3cf0"/>
    </g>
    <g fill="#17202a"><circle cx="250" cy="112" r="6"/><circle cx="600" cy="104" r="6"/><circle cx="250" cy="292" r="6"/><circle cx="600" cy="284" r="6"/></g>
    <g fill="#2fb8a6"><circle cx="40" cy="120" r="5"/><circle cx="110" cy="141" r="5"/><circle cx="185" cy="140" r="5"/></g>
    <g fill="#e8306a"><circle cx="390" cy="112" r="5"/><circle cx="465" cy="137" r="5"/><circle cx="40" cy="300" r="5"/><circle cx="390" cy="290" r="5"/></g>
    <g fill="#1f3cf0"><circle cx="418" cy="132" r="5"/><circle cx="490" cy="152" r="5"/><circle cx="22" cy="318" r="5"/><circle cx="390" cy="318" r="5"/></g>
    <g font-size="20" fill="#17202a">
      <text x="40" y="180">zu, eine Linie: Punkte gelten</text><text x="40" y="204">für beide Lippen</text>
      <text x="390" y="180">getrennt: Unterlippe zurück</text><text x="390" y="204">(Überbiss)</text>
      <text x="22" y="384">Unterlippe vor (Unterbiss)</text>
      <text x="390" y="384">eine Lücke, auch wenn es zu ist</text>
    </g>
  </svg></div><figcaption><b>12 · Was noch fehlt: „Lippen trennen“.</b> So ist es gedacht (deine Farben, dein Blatt 05). In der Studie nicht gebaut; im Konzept Etappe 4.</figcaption></figure>` +
  `</div>` +
  fuss;

const unter2 = `20.11.2026 · dieselbe Studie, „teat firefish“ · alles echt aus dem Fenster · Zähne, Linse, Drehregler und Zunge sind zum Anfassen da (Maus, Finger, Stift)`;
const blatt2 =
  kopf('Ozzy · Zähne, Linse, Drehregler, Zunge', unter2) +
  `<div class="gitter">` +
  b('b0-spriessen', `<b>1 · „Zähne“ einschalten:</b> Sie sprießen von der Spitze nach hinten aus dem Zahnfleisch (hier mittendrin festgehalten).`) +
  b('b1-zaehne', `<b>2 · Der Anfang:</b> ein einfacher Zahn („Tropfen“), gleichmäßig verteilt, spiegelgleich, vorn größer, die untere Reihe mit einem Zahn weniger. Jeder Zahn sitzt starr an seinem Kiefer.`) +
  b('b2-linse', `<b>3 · Ein Tipp auf einen Zahn wählt die Reihe</b> (hell), und oben rechts geht die Linse auf: der Zahn im Raum, darum zwei Ringe.`) +
  `</div><div class="gitter vier" style="margin-top:26px">` +
  b('b3-linse-nah', `<b>4 · Die Linse.</b> Innen der Zahn mit Wurzel und der Linie des Zahnfleischs, mit dem Finger zu drehen. <b>Formenring:</b> die Vorlagen; was an der Marke oben steht, gilt. <b>Drehregler</b> (geriffelt): stellt, was die Perle sagt (# Anzahl, G Größe, B Biegung, N Neigung, V Verlauf, S Sitz). Der Tropfen unten rechts zieht die Linse größer.`, 'hoch') +
  b('b4-rad-dreht', `<b>5 · Gedreht</b> (wirklich, mit der Maus, 60°): je Rast ein Zahn mehr, ${zahlen.nachDrehen.oben} statt 12. Die Zahl steht nur, solange man dreht; es tickt leise, das Rad läuft nach.`, 'hoch') +
  b('b11-linse-einzeln', `<b>6 · Ein einzelner Zahn</b> (zweiter Tipp): Die Linse zeigt ihn allein; Form, Größe und Biegung gelten jetzt nur ihm und seinem Spiegelbild.`, 'hoch') +
  b('b10-einzeln', `<b>7 · Derselbe Zahn im Maul:</b> ein „Hauer“ zwischen Tropfen. Ziehen rückt ihn auf dem Zahnfleisch; weiter als ein Stück vor die Lippe geht er nicht.`, '', 'align-self:start') +
  `</div><div class="gitter" style="margin-top:26px">` +
  b('b6-saebel', `<b>8 · Vorlage „Säbel“</b> für beide Reihen. Zwischen den Kiefern ist nur so viel Platz, wie das Maul offen ist: Ein Zahn innen wird nie länger als der Spalt.`) +
  b('b7-blob', `<b>9 · Vorlage „Blob“:</b> ganz ohne Spitze.`) +
  b('b8-backe', `<b>10 · Vorlage „Backe“:</b> viereckig, mit Höckern, acht je Kiefer.`) +
  b('b9-viele', `<b>11 · Vorlage „Nadel“, 26 und 25:</b> Der Drehregler stellt die Anzahl, die Reihe verteilt sich neu.`) +
  b('b12-aussen-zu', `<b>12 · Sitz „außen“:</b> sechs spitze Zähne oben, vor der Lippe. Bei geschlossenem Maul liegen sie über dem Unterkiefer (die Richtung deines Bilds 07).`) +
  b('b5-mehr-zaehne', `<b>13 · Zähne dürfen sich überschneiden</b> (dein Wort vom 15.10.): Es gibt keine Warnung und kein Wegschieben.`) +
  `<h2>Die Zunge</h2>` +
  b('c1-zunge-liegt', `<b>14 · Sie liegt im Maul</b>, auf dem Unterkiefer, mit einer flachen Rille. Ihre Breite richtet sich nach dem Maul. Bewegt sich der Kiefer, kommt sie mit Verzögerung nach und schwingt aus.`) +
  b('c2-zunge-gezogen', `<b>15 · Gezogen wie Gummi:</b> Sie dehnt sich und wird dabei dünner; die Wurzel bleibt am Kiefer. Losgelassen schnellt sie zurück.`) +
  b('c3-zunge-haengt', `<b>16 · Über die Lippe hinaus</b> hat sie keinen Boden mehr und hängt.`) +
  `</div>` +
  fuss;

const br = await chromium.launch();
for (const [name, html] of [
  ['2026-11-20-maul-aus-einer-linie-bogen', blatt1],
  ['2026-11-20-zaehne-linse-zunge-bogen', blatt2],
]) {
  const datei = path.join(ordner, `${name}.html`);
  fs.writeFileSync(datei, html);
  const s = await br.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 1 });
  await s.goto(`file://${datei}`);
  await s.waitForTimeout(700);
  const p = path.join(ziel, `${name}.jpg`);
  await s.screenshot({ path: p, fullPage: true, type: 'jpeg', quality: 88 });
  console.log(p);
  await s.close();
}
await br.close();
