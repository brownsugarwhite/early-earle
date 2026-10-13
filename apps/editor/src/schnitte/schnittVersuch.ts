// Versuch 13.10.: Prüfwesen für die Bauweisen „Schnitte“ und „rund“ laden.
//   ?versuch=schnitte|rund|kern&wesen=ueberhang|kugel|rex|tiger|robbe|langhals   (kern = Wesen-Editor 2, Beweis 1)
//   &bauweise=bisher|wirbel|schnitte|rund (zum Vergleichen), &regel=gerade-ungerade, &ueberblenden=punkte, &spanten=0 (Spanten weglassen)
// „ueberhang“ ist Florians Bogen vom 13.10. (Ente mit Schnauze über dem Bauch, Glocke, Top mit Haken, S1 als Acht),
// nachgezogen als Dokument; die anderen sind die nachgezogenen Versuchswesen vom 12.10.

import { type Dokument, dokumentLesen, neuesDokument } from '@ee/shape';
import { type Vorlage, vorlageDokument } from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export async function schnittVersuchLaden(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const versuch = q.get('versuch');
  if (versuch !== 'schnitte' && versuch !== 'rund' && versuch !== 'kern') return;
  const wesen = q.get('wesen') ?? 'ueberhang';
  let dok: Dokument = neuesDokument('Kugel');
  if (wesen !== 'kugel') {
    const json = (await (await fetch(`${import.meta.env.BASE_URL}versuch/${wesen}/${wesen}.json`)).json()) as { format?: string };
    dok = json.format === 'ee-wesen' ? dokumentLesen(json) : vorlageDokument(json as Vorlage, 'zu', wesen);
  }
  if (q.get('spanten') === '0') {
    dok = { ...dok };
    delete dok.spanten;
  }
  useEditor.getState().laden(dok, null);
  if (q.get('regel') === 'gerade-ungerade') useUi.getState().setzeSchnittRegel('gerade-ungerade');
  if (q.get('ueberblenden') === 'punkte') useUi.getState().setzeSchnittUeberblenden('punkte');
  const b = q.get('bauweise');
  useUi.getState().setzeBauweise(b === 'bisher' || b === 'wirbel' || b === 'schnitte' || b === 'rund' || b === 'kern' ? b : versuch);
}
