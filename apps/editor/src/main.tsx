import '@fontsource/irish-grover';
import './styles/tokens.css';
import './styles/editor.css';
import { createRoot } from 'react-dom/client';
import { abweichung } from '@ee/shape';
import { App } from './App';
import { useEditor } from './state/editorStore';
import { useUi } from './state/uiStore';
import { useRahmen } from './layout/animation';
import { versuchAktiv, versuchForm } from './versuch/subdivision';
import { tigerLaden } from './versuch/ueberlagerung';
import { schnittVersuchLaden } from './schnitte/schnittVersuch';
import { useKernAnzeige } from './kern/kernBau';

// Versuche (?versuch=subd&form=…): Testform laden
const versuch = versuchAktiv();
if (versuch?.modus === 'tiger') void tigerLaden(versuch.zustand);
else if (versuch && versuch.modus !== 'maul') useEditor.setState({ dok: versuchForm(useEditor.getState().dok, versuch.form) });
// Versuch 13.10.: Prüfwesen der Bauweisen „Schnitte“ und „rund“ (?versuch=schnitte|rund&wesen=ueberhang|kugel|rex|…)
void schnittVersuchLaden();

// Zugriff für E2E-Tests und die Konsole (kein Einfluss auf die Bedienung)
Object.assign(window, {
  __stores: { editor: useEditor, ui: useUi, rahmen: useRahmen, kernAnzeige: useKernAnzeige },
  __pruefen: { abweichung: () => abweichung(useEditor.getState().dok.profile) },
});

createRoot(document.getElementById('root')!).render(<App />);
