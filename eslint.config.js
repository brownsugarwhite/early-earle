// @ts-check
import tseslint from 'typescript-eslint';

// Studio: Node gibt es nur in der Ablage, den Werkzeugen, den Apps (Server, Konfiguration, Proben) und in Tests (Plan 2.1, 2.3 Nr. 1).
// Die übrigen Pakete laufen im Browser und auf dem iPhone; ihre Typprüfung ohne Tests sieht Node nicht (tsconfig.quellen.json), und
// ESLint meldet es schon beim Schreiben. Tests und Hilfen nur für Tests (*.testhilfe.ts) dürfen Node.
const NODE_GLOBALE = ['process', 'Buffer', 'require', 'module', '__dirname', '__filename', 'global', 'setImmediate', 'clearImmediate'];
const ohneNode = (name) => ({
  name,
  message: `Kein Node in diesem Paket: ${name} gibt es im Browser und auf dem iPhone nicht (Plan 2.1, 2.3 Nr. 1).`,
});
const NUR_TESTS = ['**/*.test.ts', '**/*.testhilfe.ts'];

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', 'apps/godot/**', 'ref/**', 'apps/game/ios/build/**', 'apps/game/ios/build-device/**', '.claude/**', 'apps/game/ios/App/App/public/**', 'apps/game/android/**/build/**', 'apps/editor/dist-electron/**', 'apps/editor/release/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Studio, Pakete ohne Node (Plan 2.1, 2.3 Nr. 1): keine Node-Globalen in den Quellen
  {
    files: ['packages/studio-{rechnen,format,store,laufzeit,welt,bild,ton,autorig}/src/**/*.ts'],
    ignores: NUR_TESTS,
    rules: {
      'no-restricted-globals': ['error', ...NODE_GLOBALE.map(ohneNode)],
    },
  },
  // Studio, Simulationspfad wiederholbar (Plan 2.3 Nr. 2): Hier rechnet nichts mit Funktionen, die nicht auf jedem Gerät bitgleich
  // sind, und nichts liest eine Uhr oder einen Zeitgeber. Erlaubt bleiben Math.sqrt, abs, floor, ceil, round, trunc, sign, min, max,
  // imul, fround. Math gilt nur direkt als `Math.<Name>`: Ein Umweg (`const M = Math`, `Math[name]`, `globalThis.Math`) käme an der
  // Liste vorbei. Zufall nur aus einem Strom mit Saat, deshalb auch kein `crypto` (getRandomValues, randomUUID).
  // Ausgenommen sind Tests (sie vergleichen mit Math, Plan 5.4 M1.1) und vorläufig winkel.ts und exp.ts, die bis zur Umstellung auf
  // den Port der fdlibm nach M1 Welle A über Math rechnen; dann streicht die Integration diese beiden Einträge unter `ignores`.
  // Dieser Block ersetzt für seine Dateien `no-restricted-globals` des Blocks davor; deshalb stehen die Node-Globalen hier noch einmal.
  {
    files: ['packages/studio-{rechnen,format,laufzeit,welt,autorig}/src/**/*.ts'],
    ignores: [...NUR_TESTS, 'packages/studio-rechnen/src/winkel.ts', 'packages/studio-rechnen/src/exp.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...NODE_GLOBALE.filter((name) => name !== 'global').map(ohneNode),
        ...['crypto', 'globalThis', 'global', 'self', 'window'].map((name) => ({
          name,
          message:
            name === 'crypto'
              ? 'Simulationspfad: nicht wiederholbar, einen Strom mit Saat aus @ee/studio-rechnen/zufall nehmen (Plan 2.3 Nr. 2).'
              : `Simulationspfad: kein ${name}; darüber kämen Math, Date, performance und crypto an den Regeln vorbei (Plan 2.3 Nr. 2).`,
        })),
        ...['setTimeout', 'setInterval', 'requestAnimationFrame'].map((name) => ({
          name,
          message: `Simulationspfad: kein Zeitgeber (${name}); die Zeit kommt als Takt von außen (Plan 2.3 Nr. 2).`,
        })),
      ],
      'no-restricted-properties': [
        'error',
        ...['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp', 'expm1',
          'log', 'log1p', 'log2', 'log10', 'pow', 'hypot', 'cbrt'].map((property) => ({
          object: 'Math',
          property,
          message: 'Simulationspfad: nicht auf jedem Gerät bitgleich, die eigene Funktion aus @ee/studio-rechnen nehmen (Plan 2.3 Nr. 2).',
        })),
        {
          object: 'Math',
          property: 'random',
          message: 'Simulationspfad: nicht wiederholbar, einen Strom mit Saat aus @ee/studio-rechnen/zufall nehmen (Plan 2.3 Nr. 2).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='**']",
          message: 'Simulationspfad: ** ist nicht auf jedem Gerät bitgleich; ausmultiplizieren oder pow aus @ee/studio-rechnen (Plan 2.3 Nr. 2).',
        },
        {
          selector: "AssignmentExpression[operator='**=']",
          message: 'Simulationspfad: **= ist nicht auf jedem Gerät bitgleich; ausmultiplizieren oder pow aus @ee/studio-rechnen (Plan 2.3 Nr. 2).',
        },
        {
          selector: "Identifier[name='Date']",
          message: 'Simulationspfad: keine Uhr (Date); die Zeit kommt als Takt von außen (Plan 2.3 Nr. 2).',
        },
        {
          selector: "Identifier[name='performance']",
          message: 'Simulationspfad: keine Uhr (performance); die Zeit kommt als Takt von außen (Plan 2.3 Nr. 2).',
        },
        {
          selector: "Identifier[name='Math']:not(MemberExpression > Identifier.object)",
          message: 'Simulationspfad: Math nur direkt als Math.<Name>, nie weitergereicht oder umbenannt (Plan 2.3 Nr. 2).',
        },
        {
          selector: "MemberExpression[object.name='Math'][computed=true]",
          message: 'Simulationspfad: Math nur mit festem Namen (Math.sqrt), nie Math[…] (Plan 2.3 Nr. 2).',
        },
      ],
    },
  },
);
