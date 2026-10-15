// Versuch 13.10.: Prüfwesen für die Bauweisen „Schnitte“ und „rund“ laden.
//   ?versuch=schnitte|rund|kern&wesen=ueberhang|kugel|rex|tiger|robbe|langhals   (kern = Wesen-Editor 2, Beweis 1)
//   &bauweise=bisher|wirbel|schnitte|rund (zum Vergleichen), &regel=gerade-ungerade, &ueberblenden=punkte, &spanten=0 (Spanten weglassen)
// „ueberhang“ ist Florians Bogen vom 13.10. (Ente mit Schnauze über dem Bauch, Glocke, Top mit Haken, S1 als Acht),
// nachgezogen als Dokument; die anderen sind die nachgezogenen Versuchswesen vom 12.10.

import { type Dokument, dokumentLesen, neuesDokument } from '@ee/shape';
import { halsVerbreitern, zwiebel, kastenSpanten } from '@ee/shape/kern';
import { type Vorlage, vorlageDokument } from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

/**
 * Prüfwesen der Library (Florian, 15.10.: „die Testwesen direkt in die Library, immer der aktuellste Stand“): kein
 * gespeicherter Stand, sondern bei jedem Laden frisch aus den nachgezogenen Vorlagen und dem Kern gebaut. Die
 * Dokumentnamen sind die Schlüssel der Ausstattung (`pruefwesenBauplan(dok.name)`: Tiger mit Maullinie, Augen, Zonen).
 */
export const PRUEFWESEN: readonly { id: string; name: string; palette: string; hinweis: string }[] = [
  { id: 'kugel', name: 'Kugel', palette: 'blob', hinweis: 'Startkugel, Satz 2: alle Blätter ≤ 1 px' },
  { id: 'rex', name: 'Rex', palette: 'rex', hinweis: 'Front breiter als Top gezeichnet (Δ zeigt es)' },
  { id: 'tiger', name: 'Tiger', palette: 'tiger', hinweis: 'Kastenschnauze als Spanten, Mercedesstern-Maul' },
  { id: 'langhals', name: 'Langhals', palette: 'giraffe', hinweis: 'Satz 3: Hals hochziehen, er bleibt' },
  { id: 'drache', name: 'Drache', palette: 'giraffe', hinweis: 'Langhals mit doppeltem Hals, Maul bis zum Hals' },
  { id: 'ueberhang', name: 'Ente', palette: 'blob', hinweis: 'Überhang (Schnauze über dem Bauch)' },
  { id: 'robbe', name: 'Robbe', palette: 'blob', hinweis: 'Versuchswesen vom 12.10.' },
  { id: 'pezenpez', name: 'PezenPez', palette: 'blob', hinweis: 'Blob mit einem senkrechten Schlitzauge in der Mitte (Augen, Phase 2 M5)' },
  { id: 'glubsch', name: 'Glubsch', palette: 'blob', hinweis: 'Blob mit einem großen Glubschauge in der Mitte (Bild 10, Phase 2 M5)' },
];

/** Prüfwesen frisch bauen: Vorlage (`public/versuch/<name>/<name>.json`) plus Kern-Zutaten (Drache: Hals ×2, Tiger: Kasten-Spanten). */
export async function pruefwesenDokument(wesen: string): Promise<Dokument> {
  // Drache (Beweis 2, Lage „hals“): der Langhals mit doppelt so dickem Hals (Giraffenhals ≈ 2 % der Höhe ist zu dünn für zwei Taschen)
  const datei = wesen === 'drache' ? 'langhals' : wesen;
  let dok: Dokument = neuesDokument('Kugel');
  if (wesen === 'zwiebel') dok = zwiebel(neuesDokument('zwiebel'));
  else if (wesen === 'pezenpez') {
    // PezenPez (Augen, Phase 2 M5): die Startkugel mit einem senkrechten Schlitzauge auf der Mittelnaht, vorn auf ≈ 55 % der Höhe
    const k = neuesDokument('pezenpez');
    const xs = k.profile.seite.knoten.map((q) => q.p.x);
    const ys = k.profile.seite.knoten.map((q) => q.p.y);
    const y = Math.min(...ys) + 0.55 * (Math.max(...ys) - Math.min(...ys));
    dok = { ...k, ausstattung: { augen: { ring: 2, j: 2, groesse: 0.2, punkt: [Math.min(...xs), y, 0], mitte: true, form: 'schlitz', breite: 0.5 } } };
  } else if (wesen === 'glubsch') {
    // Glubsch (Bild 10, zweites Wesen): die Startkugel mit einem großen Glubschauge vorn auf der Mittelnaht, ≈ 62 % der Höhe
    const k = neuesDokument('glubsch');
    const xs = k.profile.seite.knoten.map((q) => q.p.x);
    const ys = k.profile.seite.knoten.map((q) => q.p.y);
    const y = Math.min(...ys) + 0.62 * (Math.max(...ys) - Math.min(...ys));
    dok = { ...k, ausstattung: { augen: { ring: 2, j: 2, groesse: 0.34, punkt: [Math.min(...xs), y, 0], mitte: true, art: 'glubsch', form: 'knopf' } } };
  } else if (wesen !== 'kugel') {
    const json = (await (await fetch(`${import.meta.env.BASE_URL}versuch/${datei}/${datei}.json`)).json()) as { format?: string };
    dok = json.format === 'ee-wesen' ? dokumentLesen(json) : vorlageDokument(json as Vorlage, 'zu', wesen);
    if (wesen === 'drache') dok = halsVerbreitern(dok, 2, 0.3, 0.585);
    // Tiger (Beweis 4): die Kastenschnauze als echte Spanten im Dokument (M3: Reifen auf dem Körper, von Florian ziehbar);
    // der Bauplan-Kasten gilt nur ohne eigene Spanten
    if (wesen === 'tiger' && !dok.spanten?.length) dok = { ...dok, spanten: kastenSpanten(dok.profile.front, 0.02, 0.15, 0.25, 0.85) };
  }
  return dok;
}

export async function schnittVersuchLaden(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const versuch = q.get('versuch');
  if (versuch !== 'schnitte' && versuch !== 'rund' && versuch !== 'kern') return;
  const wesen = q.get('wesen') ?? 'ueberhang';
  let dok = await pruefwesenDokument(wesen);
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
