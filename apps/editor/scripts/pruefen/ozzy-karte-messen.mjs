// Ozzy, Plan „Ozzy stabil und schnell“ (17.11.2026): Was kostet ein Bild auf der Grafikkarte? Keine Prüfung, ein Werkzeug.
// Je Fassung und Ansicht: Rechnen je Bild (Prozessor) und samt Warten auf die Grafikkarte (`mitKarte` in `ozzy-teile.mjs`), Median aus
// 40 Bildern, das Werk ruht. Die Fassungen ändern für diesen Lauf das ausgelieferte Modul (kein Eingriff in den Arbeitsbaum); passt ein
// Flicken nicht mehr zum Code, steht es in der Zeile.
// Aufruf aus apps/editor, Ozzy auf 5205:
//   node scripts/pruefen/ozzy-karte-messen.mjs
//   NAME="strange bird" DICHTE=2 FASSUNGEN=ist,ohneAA,…  (alle Namen: unten in `flicken`)
//   EXTRA="material=solid"  weitere Schalter der Adresse (18.11.: ein festes Material statt der Seifenhaut)
import { auf, mitKarte, z1 } from './ozzy-teile.mjs';

const FORM = process.env.NAME ?? 'strange bird';
const DICHTE = Number(process.env.DICHTE ?? 2);
const HAUT = '**/src/anfang/haut.ts*';
const MAIN = '**/src/ozzy/main.ts*';
const OHNE_RAUSCHEN = [
  ['float n = 0.62 * rauschen(vec3(p * 1.45 + w * 1.5, t * 1.4)) + 0.26 * rauschen(vec3(p * 3.3 + w * 0.9, t * 2.1));', 'float n = 0.0;'],
  ['vec2 w = vec2(rauschen(vec3(p * 0.85, t)), rauschen(vec3(p * 0.85 + 4.7, t + 2.3)));', 'vec2 w = vec2(0.0);'],
];
const flicken = {
  /** wie gebaut */
  ist: {},
  /** Ziel der Seifenhaut ohne, mit zweifacher Kantenglättung (gebaut: vierfach) */
  ohneAA: { [HAUT]: [['samples: 4', 'samples: 0']] },
  aa2: { [HAUT]: [['samples: 4', 'samples: 2']] },
  /** Ziel mit 8 statt 16 Bit je Kanal (1009 = UnsignedByteType), mit und ohne Kantenglättung */
  byte: { [HAUT]: [['type: HalfFloatType,', 'type: 1009,']] },
  byteOhneAA: { [HAUT]: [['type: HalfFloatType,', 'type: 1009,'], ['samples: 4', 'samples: 0']] },
  /** ohne das Rauschen der Dicke im Shader (so viel kostet es höchstens) */
  ohneRauschen: { [HAUT]: OHNE_RAUSCHEN },
  ohneAAohneRauschen: { [HAUT]: [['samples: 4', 'samples: 0'], ...OHNE_RAUSCHEN] },
  /** nur die Vorderseite der Blase (zwei statt vier Durchgänge) */
  nurVorn: { [HAUT]: [['mesh.visible = durch ? i < 4 : i === 4', 'mesh.visible = durch ? (i === 2 || i === 3) : i === 4']] },
  /** ohne Seifenhaut, ohne Linien, ohne beides (Grundlast) */
  ohneHaut: { [MAIN]: [['haut.zeichnen(kam.aktiv, w, []);', ';']] },
  ohneLinien: { [MAIN]: [['anzeige.zeichnen(szene);', ';']] },
  ohneBeides: { [MAIN]: [['haut.zeichnen(kam.aktiv, w, []);', ';'], ['anzeige.zeichnen(szene);', ';']] },
};

console.log(`Form ${FORM}, Dichte ${DICHTE}; je Zelle: Rechnen / mit Grafikkarte (ms je Bild, Median aus 40)`);
console.log('| Fassung | Raum | Raum nah | eingerastet Seite | Vier Ansichten | |\n| --- | --- | --- | --- | --- | --- |');
for (const name of (process.env.FASSUNGEN ?? Object.keys(flicken).join(',')).split(',')) {
  const { browser, s, geladen, fehler } = await auf({ form: FORM, dichte: DICHTE, flicken: flicken[name] ?? {}, extra: process.env.EXTRA ?? '' });
  await geladen();
  await s.waitForTimeout(3000);
  const aus = [];
  // 1 Raum in Ruhe
  aus.push(await mitKarte(s));
  // 2 Raum, nah (Rad)
  await s.mouse.move(720, 450);
  for (let k = 0; k < 6; k++) {
    await s.mouse.wheel(0, -240);
    await s.waitForTimeout(60);
  }
  await s.waitForTimeout(900);
  const zoom = await s.evaluate(() => window.__ozzy.blick().zoom);
  aus.push(await mitKarte(s));
  // 3 eingerastet Seite (vorher einpassen)
  await s.keyboard.press('Home');
  await s.waitForTimeout(500);
  await s.keyboard.press('1');
  await s.waitForTimeout(1900);
  aus.push(await mitKarte(s));
  // 4 Vier Ansichten
  await s.keyboard.press('0');
  await s.waitForTimeout(1500);
  await s.keyboard.press('Tab');
  await s.waitForTimeout(2000);
  aus.push(await mitKarte(s));
  console.log(`| ${name} | ${aus.map((a) => `${z1(a.rechnen)} / ${z1(a.gesamt)}`).join(' | ')} | Zoom nah ${zoom.toFixed(2)}${fehler.length ? ` · ${[...new Set(fehler)].slice(0, 2).join(' ; ').slice(0, 160)}` : ''} |`);
  await browser.close();
}
