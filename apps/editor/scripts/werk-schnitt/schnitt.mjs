// Schnitt von apps/editor/src/form/kurven.ts in das Werk (ohne DOM, ohne three.js) und die Hülle.
// Aufruf: node schnitt.cjs <kurven.ts> <ausgabeordner> [--nur-bericht]
// Jede Anweisung auf oberster Ebene wird der Hülle oder dem Werk zugeordnet: Hülle ist, was DOM oder three.js berührt, und alles,
// was davon abhängt, außer über die Grenze aus Anzeige-Funktionen (die das Werk über `anzeige.…` ruft). Was beide Seiten zuweisen,
// wandert in das geteilte Objekt `G` des Werks. Regeln: `schnitt-regeln.json` (Grenze = Anzeige-Funktionen, die das Werk über Haken
// ruft; ihre Typen).
// Wiederholen (Ozzy, 16.11.2026), etwa wenn in einem alten Zweig weiter in `kurven.ts` gebaut wird:
//   1  In diesem `kurven.ts` die drei Zeilen `document.body.style.pointerEvents = …` durch `eingabenSperren(true)` bzw.
//      `eingabenSperren(false)` ersetzen und die Funktion `eingabenSperren(an)` dazuschreiben (wie in der Hülle).
//   2  node apps/editor/scripts/werk-schnitt/schnitt.mjs <kurven.ts> <ausgabeordner>   (schreibt werk.ts, kurven.ts, zuordnung.txt)
//   3  Was seit dem Schnitt im Werk dazukam, wieder einsetzen. Stand 16.11.: `SilhouettenAnker`, `SILHOUETTE_SCHRITT`, `neuAusUmriss`
//      und die Importe `polygonFlaeche`, `umrissAbtasten` im Werk; in der Hülle der Prüfhaken `ablage.neuAusUmriss` und sein Import.
//      Dazu (16.11. abends, Ozzy S6b, mit Florians Zustimmung): `griffImRaum` und `zugGriffRaum` vor `zugBewegen`, und in `zugBewegen`
//      beim Griff `griffImRaum ? { ...griffImRaum } : inWelt(…)` statt `inWelt(…)`.
//      Dazu (17.11., Plan „Ozzy stabil und schnell“, A1): `bildRestGemeldet` und `bildRestMelden` nach `bildGerechnetMs`, und in der
//      letzten Zeile von `bildRechnen` `bildRestGemeldet ?? performance.now() - bildT0 - bildGerechnetMs` statt der Messung allein.
//      (Der Anlauf eines neuen Lösers, `ANLAUF_RUNDEN`, ist seit dem 18.11. wieder heraus: Die Ursache ist im Kern behoben, Plan C1.)
//      Dazu (18.11., C2): `stiftStrich`, `vorhangSchneiden` und `aufrichtenJetzt` nach `loopSchneiden`, die Importe `loopAusVorhang`,
//      `stelleImBlatt`, `griffeAufStrich`, `vorhangWeg`; im Auftrag von `aufraeumenStarten` die Angabe `aufrichten`.
//      Dazu (18.11., D1 Teil 2): `verfeinernPause` und `VERFEINERN_PAUSE_MS` nach `nichtsZuVerfeinern` (überall mit ihm
//      zurückgesetzt), in der Antwort des Workers `d.wenig` (dann die Pause statt `nichtsZuVerfeinern`), in `zugRechnen` die
//      Bedingung `performance.now() >= verfeinernPause` vor `gestreckt()`.
//      Dazu (20.11., das Maul als echte Form, Etappe 1 und 2): der Import aus `./maulEcht`; `istMaulEcht`, `maulSchneiden`,
//      `ueberDasMaul` (in `kreuzungenSuchen`), `maulFalte` und `kreuztSich` (in `linienGekreuzt`); `maulBlick`, `maulBlickSetzen`,
//      `anzeigeDreht`, `KIEFER_RAST`, `kieferStellen`, `kieferKnochen`, `stueckeGezeigtBei`; und je eine Stelle für `istMaulEcht` in
//      `maulIstGeformt`, `maulSchnitt` (mit `alle`), `maulAktuell`, `knochenJetzt` (`kieferWinkel`), `alsAnzeige` (`anzeigeDreht`)
//      und `standAnwenden`. Dazu (Etappe 3): `MaulZustand` mit `echt` und `ersteUnten`, `maulSeitenMerken`, `maulLippe`,
//      `lippenGetrennt`, `lippeGewaehlt`, `LIPPEN_NAH`, `lippeNachZeiger`, `lippenTrennen`, `lippenVerbinden`. Dazu (Etappe 4):
//      `maulTasche`. Dazu (Etappe 5): `ZahnReihe`, `MaulZaehne`, `MaulZustand.zaehne`, `zaehneSetzen`.
//      (Was die Sitzungen „Objekte“ und „Paint-Modus“ ins Werk gesetzt haben, steht hier nicht.)
// Geprüft am 16.11.: Aus `kurven.ts` von 179dfa4a (mit Schritt 1) entstehen genau `werk.ts` und `kurven.ts` von 5039cead.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(path.join(hier, '..', '..', 'package.json'))('typescript');

const [pfad, ausOrdner, schalter] = process.argv.slice(2);
const nurBericht = schalter === '--nur-bericht';
const regeln = JSON.parse(fs.readFileSync(path.join(hier, 'schnitt-regeln.json'), 'utf8'));

function parse(text) {
  const host = ts.createCompilerHost({});
  const orig = host.getSourceFile;
  host.getSourceFile = (n, v) => (n === 'kurven.ts' ? ts.createSourceFile(n, text, v, true, ts.ScriptKind.TS) : orig.call(host, n, v));
  host.fileExists = (n) => n === 'kurven.ts' || ts.sys.fileExists(n);
  host.readFile = (n) => (n === 'kurven.ts' ? text : ts.sys.readFile(n));
  const prog = ts.createProgram(['kurven.ts'], { noResolve: true, target: ts.ScriptTarget.ESNext, lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'], types: [] }, host);
  const sf = prog.getSourceFile('kurven.ts');
  return { sf, checker: prog.getTypeChecker() };
}

const ZUWEISUNG = new Set([ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken, ts.SyntaxKind.PercentEqualsToken, ts.SyntaxKind.BarEqualsToken, ts.SyntaxKind.AmpersandEqualsToken]);

function analysieren(text) {
  const { sf, checker } = parse(text);
  const anw = [];
  const deklVon = new Map(); // Name → Index der Anweisung
  const importe = []; // { node, namen: [{name, quelle}] }
  sf.statements.forEach((s, i) => {
    const namen = [];
    if (ts.isImportDeclaration(s)) {
      const quelle = s.moduleSpecifier.text;
      const b = s.importClause;
      if (b?.namedBindings && ts.isNamedImports(b.namedBindings)) for (const e of b.namedBindings.elements) namen.push(e.name.text);
      if (b?.name) namen.push(b.name.text);
      importe.push({ i, quelle, namen });
    } else if (ts.isFunctionDeclaration(s) && s.name) namen.push(s.name.text);
    else if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) { if (ts.isIdentifier(d.name)) namen.push(d.name.text); }
    else if ((ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s)) && s.name) namen.push(s.name.text);
    for (const n of namen) deklVon.set(n, i);
    anw.push({ i, node: s, namen, istImport: ts.isImportDeclaration(s), refs: new Set(), zuw: new Set(), globale: new Set(), stellen: [] });
  });
  // Verweise je Anweisung (über den Checker auf die Deklaration aufgelöst)
  const oberste = new Map(); // Deklarationsknoten → Index
  sf.statements.forEach((s, i) => {
    if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) oberste.set(d, i);
    else if (ts.isImportDeclaration(s)) {
      const b = s.importClause;
      if (b?.namedBindings && ts.isNamedImports(b.namedBindings)) for (const e of b.namedBindings.elements) oberste.set(e, i);
    } else oberste.set(s, i);
  });
  for (const a of anw) {
    if (a.istImport) continue;
    const besuchen = (n) => {
      if (ts.isIdentifier(n)) {
        const kurz = ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n;
        const sym = kurz ? checker.getShorthandAssignmentValueSymbol(n.parent) : checker.getSymbolAtLocation(n);
        const d = sym?.declarations?.[0];
        if (d && oberste.has(d) && d.getSourceFile() === sf) {
          const j = oberste.get(d);
          const name = n.text;
          // nicht die eigene Deklaration
          const istDekl = (ts.isVariableDeclaration(n.parent) || ts.isFunctionDeclaration(n.parent) || ts.isTypeAliasDeclaration(n.parent) || ts.isInterfaceDeclaration(n.parent) || ts.isClassDeclaration(n.parent)) && n.parent.name === n;
          if (!istDekl) {
            a.refs.add(name);
            a.stellen.push({ pos: n.getStart(sf), end: n.getEnd(), name, j, kurz });
            const p = n.parent;
            const links = (ts.isBinaryExpression(p) && ZUWEISUNG.has(p.operatorToken.kind) && p.left === n) || ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken));
            if (links) a.zuw.add(name);
          }
        } else if (!d || d.getSourceFile() !== sf) {
          if (['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'ResizeObserver', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'SVGSVGElement', 'SVGElement', 'HTMLCanvasElement', 'HTMLSpanElement', 'HTMLDivElement', 'PointerEvent', 'KeyboardEvent', 'WheelEvent', 'MouseEvent', 'Element', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'alert', 'confirm', 'prompt'].includes(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) a.globale.add(n.text);
        }
      }
      ts.forEachChild(n, besuchen);
    };
    besuchen(a.node);
  }
  return { sf, anw, deklVon, importe };
}

const warum = new Map();
function zuordnen(an) {
  const { anw, deklVon, importe } = an;
  // Namen aus three.js und dem DOM-Umfeld
  const huelleImporte = new Set();
  for (const im of importe) if (regeln.huelleQuellen.some((q) => im.quelle.startsWith(q))) for (const n of im.namen) huelleImporte.add(n);
  const art = new Map(); // Index → 'huelle' | 'werk'
  const grenze = new Set(regeln.grenze); // Anzeige-Funktionen, die das Werk über `anzeige.` ruft
  warum.clear();
  for (const a of anw) {
    if (a.istImport) continue;
    const zwang = a.namen.map((n) => regeln.zwang[n]).find(Boolean);
    if (zwang) { art.set(a.i, zwang); continue; }
    // Startcode (Anweisungen ohne Deklaration) gehört dem Fenster, das ihn ausführt: der Hülle
    if (!a.namen.length) { art.set(a.i, 'huelle'); continue; }
    const dom = a.globale.size > 0 || [...a.refs].some((r) => huelleImporte.has(r));
    art.set(a.i, dom ? 'huelle' : 'werk');
  }
  // Ausbreiten: wer etwas aus der Hülle braucht (außer über die Grenze), gehört in die Hülle
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (const a of anw) {
      if (a.istImport || art.get(a.i) !== 'werk') continue;
      if (a.namen.some((n) => regeln.zwang[n])) continue;
      // Variablen (reine Daten) bleiben im Werk, außer ihr Anfangswert braucht etwas aus der Hülle; Funktionen breiten aus
      const istDaten = ts.isVariableStatement(a.node) && !a.node.declarationList.declarations.some((d) => d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)));
      if (istDaten) {
        const imAnfang = new Set();
        for (const d of a.node.declarationList.declarations) if (d.initializer) for (const st of a.stellen) if (st.pos >= d.initializer.getStart() && st.end <= d.initializer.getEnd()) imAnfang.add(st.name);
        const hj = [...imAnfang].find((r) => deklVon.has(r) && art.get(deklVon.get(r)) === 'huelle');
        if (hj) {
          art.set(a.i, 'huelle');
          warum.set(a.i, hj);
          geaendert = true;
        }
        continue;
      }
      const startcode = !a.namen.length;
      for (const r of a.refs) {
        const j = deklVon.get(r);
        if (j === undefined || art.get(j) !== 'huelle') continue;
        if (grenze.has(r) && !startcode) continue;
        // Typen aus der Hülle zählen nicht (die gibt es im Werk als eigene Kopie nicht: Fehler zeigt der Compiler)
        art.set(a.i, 'huelle');
        warum.set(a.i, r);
        geaendert = true;
        break;
      }
    }
  }
  // Daten, die nur die Hülle benutzt, gehören in die Hülle
  for (const a of anw) {
    if (a.istImport || art.get(a.i) !== 'werk' || !ts.isVariableStatement(a.node)) continue;
    if (a.namen.some((n) => regeln.zwang[n])) continue;
    let w = false;
    let h = false;
    for (const b of anw) {
      if (b.istImport || b.i === a.i) continue;
      if (!a.namen.some((n) => b.refs.has(n))) continue;
      if (art.get(b.i) === 'werk') w = true;
      else h = true;
    }
    if (h && !w) {
      art.set(a.i, 'huelle');
      warum.set(a.i, '(nur Hülle)');
    }
  }
  return art;
}

const text0 = fs.readFileSync(pfad, 'utf8');
let an = analysieren(text0);
let art = zuordnen(an);

// Was beide Seiten zuweisen oder was die Hülle im Werk zuweist (oder umgekehrt): ins geteilte Objekt `G`
const geteilt = new Set(regeln.geteilt);
for (const a of an.anw) {
  if (a.istImport) continue;
  for (const z of a.zuw) {
    const j = an.deklVon.get(z);
    if (j === undefined) continue;
    const s = an.anw[j].node;
    if (!ts.isVariableStatement(s)) continue;
    if (art.get(j) !== art.get(a.i)) geteilt.add(z);
  }
}
// Werk-Anweisungen, die Variablen der Hülle lesen: die Variable ins Werk holen (sie hat dann keine Abhängigkeit zum DOM, sonst Fehler)
const bericht = [];
for (const a of an.anw) {
  if (a.istImport || art.get(a.i) !== 'werk') continue;
  for (const r of a.refs) {
    const j = an.deklVon.get(r);
    if (j === undefined || art.get(j) !== 'huelle') continue;
    if (regeln.grenze.includes(r)) continue;
    bericht.push(`Werk ${a.namen.join(',') || '#' + a.i} liest Hülle ${r}`);
  }
}

// ---------- Umschreiben: geteilte Variablen → G.name ----------
function umschreiben(text, an, geteilt) {
  const ersetzen = [];
  for (const a of an.anw) {
    if (a.istImport) continue;
    for (const st of a.stellen) if (geteilt.has(st.name)) ersetzen.push({ pos: st.pos, end: st.end, neu: st.kurz ? `${st.name}: G.${st.name}` : `G.${st.name}` });
  }
  // Deklarationen geteilter Variablen: `let x: T = w;` → entfernen (sie stehen in G); Kommentar bleibt
  const deklWeg = [];
  const gFelder = [];
  for (const a of an.anw) {
    if (!ts.isVariableStatement(a.node)) continue;
    const decls = a.node.declarationList.declarations;
    const alle = decls.every((d) => ts.isIdentifier(d.name) && geteilt.has(d.name.text));
    const einige = decls.some((d) => ts.isIdentifier(d.name) && geteilt.has(d.name.text));
    if (!einige) continue;
    if (!alle) throw new Error('gemischte Deklaration: ' + a.namen.join(','));
    for (const d of decls) {
      const typ = d.type ? d.type.getText(an.sf) : null;
      const init = d.initializer ? d.initializer.getText(an.sf) : 'undefined';
      gFelder.push({ name: d.name.text, typ, init, i: a.i });
    }
    deklWeg.push({ pos: a.node.getStart(an.sf), end: a.node.getEnd(), i: a.i });
  }
  return { ersetzen, deklWeg, gFelder };
}

const { ersetzen, deklWeg, gFelder } = umschreiben(text0, an, geteilt);

// Anzeige-Aufrufe im Werk → anzeige.name
const anzeigeErsatz = [];
const grenzeBenutzt = new Set();
for (const a of an.anw) {
  if (a.istImport || art.get(a.i) !== 'werk') continue;
  for (const st of a.stellen) {
    const j = an.deklVon.get(st.name);
    if (j !== undefined && art.get(j) === 'huelle' && regeln.grenze.includes(st.name)) {
      anzeigeErsatz.push({ pos: st.pos, end: st.end, neu: st.kurz ? `${st.name}: anzeige.${st.name}` : `anzeige.${st.name}` });
      grenzeBenutzt.add(st.name);
    }
  }
}

console.log('Zuordnung:', [...art.values()].filter((v) => v === 'werk').length, 'Werk,', [...art.values()].filter((v) => v === 'huelle').length, 'Hülle');
console.log('geteilt (G):', [...geteilt].join(', '));
console.log('Grenze benutzt:', [...grenzeBenutzt].join(', '));
console.log('Bericht:\n  ' + bericht.join('\n  '));
const liste = an.anw.filter((a) => !a.istImport).map((a) => `${art.get(a.i) === 'werk' ? 'W' : 'H'} ${an.sf.getLineAndCharacterOfPosition(a.node.getStart(an.sf)).line + 1}: ${a.namen.join(', ') || ts.SyntaxKind[a.node.kind]}${warum.has(a.i) ? '  ← ' + warum.get(a.i) : (art.get(a.i) === 'huelle' ? '  ← DOM/three: ' + [...a.globale].join(',') : '')}`);
fs.mkdirSync(ausOrdner, { recursive: true });
fs.writeFileSync(path.join(ausOrdner, 'zuordnung.txt'), liste.join('\n') + '\n');
if (nurBericht && process.env.WER !== '1') process.exit(0);

// ---------- Text der beiden Dateien ----------
function anwenden(text, aenderungen) {
  const s = [...aenderungen].sort((x, y) => y.pos - x.pos);
  let t = text;
  for (const a of s) t = t.slice(0, a.pos) + a.neu + t.slice(a.end);
  return t;
}
// Ersetzungen im Gesamttext (Positionen gelten für text0); die Teile werden danach über die Spannen der Anweisungen geschnitten
const teile = an.anw.map((a) => ({ a, start: a.node.getFullStart(), end: a.node.getEnd() }));
function teilText(t) {
  const aend = [];
  for (const e of ersetzen) if (e.pos >= t.start && e.end <= t.end) aend.push({ pos: e.pos - t.start, end: e.end - t.start, neu: e.neu });
  if (art.get(t.a.i) === 'werk') for (const e of anzeigeErsatz) if (e.pos >= t.start && e.end <= t.end) aend.push({ pos: e.pos - t.start, end: e.end - t.start, neu: e.neu });
  for (const d of deklWeg) if (d.i === t.a.i) aend.push({ pos: d.pos - t.start, end: d.end - t.start, neu: `/* in G: ${t.a.namen.join(', ')} */` });
  return anwenden(text0.slice(t.start, t.end), aend);
}
let hakenNach = -1;
for (const n of grenzeBenutzt) {
  const j = an.deklVon.get(n);
  if (j !== undefined && ts.isVariableStatement(an.anw[j].node) && j > hakenNach) hakenNach = j;
}
if (hakenNach < 0) hakenNach = an.anw.findIndex((a) => !a.istImport);
const werkTeile = [];
const huelleTeile = [];
const kopf = text0.slice(0, an.anw[0].node.getFullStart());
for (const t of teile) {
  if (t.a.istImport) continue;
  const tx = teilText(t);
  if (art.get(t.a.i) === 'werk') werkTeile.push(exportieren(tx, t.a));
  else {
    huelleTeile.push(tx);
    if (t.a.i === hakenNach) huelleTeile.push(`\n\n// Die Anzeige für das Werk (Haken), so früh wie möglich gesetzt\nObject.assign(anzeige, { ${[...grenzeBenutzt].join(', ')} });`);
  }
}
function exportieren(tx, a) {
  if (!a.namen.length) return tx;
  // `function`, `const`, `let`, `type`, `interface` am Anfang der Anweisung (nach führenden Kommentaren)
  return tx.replace(/(^|\n)(async function |function |const |let |type |interface |class |enum )/, (m, a1, a2) => `${a1}export ${a2}`);
}
// Importe je Seite: nur, was die Anweisungen dieser Seite benutzen (das Werk lädt three.js so gar nicht erst)
function importeFuer(seite) {
  const benutzt = new Set();
  for (const a of an.anw) if (!a.istImport && art.get(a.i) === seite) for (const r of a.refs) benutzt.add(r);
  let aus = '';
  for (const im of an.importe) {
    const node = an.anw[im.i].node;
    const b = node.importClause;
    const quelle = node.moduleSpecifier.getText(an.sf);
    const lead = text0.slice(node.getFullStart(), node.getStart(an.sf));
    const teile = [];
    let def = null;
    if (b?.name && benutzt.has(b.name.text)) def = b.name.text;
    if (b?.namedBindings && ts.isNamedImports(b.namedBindings)) for (const e of b.namedBindings.elements) if (benutzt.has(e.name.text)) teile.push(e.getText(an.sf));
    if (!def && !teile.length) continue;
    const typNur = b?.isTypeOnly ? 'type ' : '';
    const inner = [def, teile.length ? `{\n  ${teile.join(',\n  ')},\n}` : null].filter(Boolean).join(', ');
    aus += `${lead}import ${typNur}${inner} from ${quelle};`;
  }
  return aus;
}
const werkNamen = new Set(an.anw.filter((a) => !a.istImport && art.get(a.i) === 'werk').flatMap((a) => a.namen));
const gText = gFelder.length
  ? `\n\n/** Zustand, den Werk und Hülle beide setzen (beim Schnitt aus \`kurven.ts\` hierher geholt) */\nexport const G = {\n${gFelder.map((f) => `  ${f.name}: ${f.init}${f.typ ? ` as ${f.typ}` : ''},`).join('\n')}\n};\n`
  : '';
const typen = regeln.typen;
const grenzeText = `\n/** Was das Werk von der Anzeige braucht; die Hülle (oder Ozzy) setzt es. Bis dahin tut es nichts (\`skala\`: 1). */\nexport interface Anzeige {\n${[...grenzeBenutzt].map((n) => `  ${n}: ${typen[n] ?? '() => void'};`).join('\n')}\n}\nexport const anzeige: Anzeige = {\n${[...grenzeBenutzt].map((n) => `  ${n}: ${(typen[n] ?? '').endsWith('number') ? '() => 1' : '() => {}'},`).join('\n')}\n};\n`;
const werkText = `// Das Werk (Ozzy, Phase 1, 16.11.2026): Zustand und Handgriffe einer Form, aus \`kurven.ts\` gelöst; ohne DOM und ohne three.js.\n// Schnittplan: docs/look/ozzy/werk-schnittplan.md. Die Hülle (\`kurven.ts\`, Ozzy) setzt \`anzeige\` und liest den Zustand.\n${importeFuer('werk')}${gText}${grenzeText}${werkTeile.join('')}\n`;
const huelleBenutzt = new Set();
for (const a of an.anw) if (!a.istImport && art.get(a.i) === 'huelle') for (const r of a.refs) huelleBenutzt.add(r);
const ausWerk = [...werkNamen].filter((n) => huelleBenutzt.has(n) && !geteilt.has(n));
const istTyp = (n) => { const j = an.deklVon.get(n); const k = j === undefined ? null : an.anw[j].node; return !!k && (ts.isTypeAliasDeclaration(k) || ts.isInterfaceDeclaration(k)); };
const huelleImportWerk = `\nimport {\n${[...ausWerk.map((n) => (istTyp(n) ? `type ${n}` : n)), ...(gFelder.length ? ['G'] : []), 'anzeige'].map((n) => `  ${n},`).join('\n')}\n} from './werk';\n`;
const huelleText = `${kopf}${importeFuer('huelle')}${huelleImportWerk}${huelleTeile.join('')}\n`;
fs.writeFileSync(path.join(ausOrdner, 'werk.ts'), werkText);
fs.writeFileSync(path.join(ausOrdner, 'kurven.ts'), huelleText);
console.log('geschrieben:', path.join(ausOrdner, 'werk.ts'), path.join(ausOrdner, 'kurven.ts'));
// (Bericht) wer liest und setzt die geteilten Größen
if (process.env.WER === '1') {
  for (const g of geteilt) {
    const z = [];
    for (const a of an.anw) {
      if (a.istImport) continue;
      const lies = a.refs.has(g);
      const setzt = a.zuw.has(g);
      if (!lies && !setzt) continue;
      z.push(`${art.get(a.i) === 'werk' ? 'W' : 'H'}:${a.namen[0] ?? '#' + a.i}${setzt ? '=' : ''}`);
    }
    const j = an.deklVon.get(g);
    console.log(`${g} [${art.get(j) === 'werk' ? 'W' : 'H'}] ${z.join(' ')}`);
  }
}
