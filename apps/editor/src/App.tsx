import { useWirbelTasten } from './wirbel/WirbelEbene';
import { useGrund, useLayoutSteuerung, useMenueBruecke, useTastatur, useTitel, useVerlassenWarnung } from './hooks';
import { Seitenleiste } from './leiste/Seitenleiste';
import { Stamm } from './stamm/Stamm';
import { Dock } from './dock/Dock';
import { useKantenTasten } from './kanten/KantenEbene';
import { useMaulTasten } from './maul/MaulEbene';
import { MenuBar } from './menu/MenuBar';
import { Szene3D } from './three/Szene3D';
import { VIEWS } from './types';
import { DialogFenster } from './ui/DialogFenster';
import { Glasfilter } from './ui/Glasfilter';
import { Hinweis } from './ui/Hinweis';
import { KontextMenue } from './ui/KontextMenue';
import { ViewportGrund, ViewportOber } from './viewports/Viewport';
import { useModalKontext } from './editing/modal/modal';
import { useSchleifenKontext } from './kern/schleifenWerkzeug';
import { useZeigerMerker } from './editing/modal/zeiger';

export function App() {
  useLayoutSteuerung();
  useGrund();
  useTastatur();
  useVerlassenWarnung();
  useMenueBruecke();
  useTitel();
  useMaulTasten();
  useWirbelTasten();
  useKantenTasten();
  useZeigerMerker();
  useModalKontext();
  useSchleifenKontext();
  return (
    <>
      <Glasfilter />
      <MenuBar />
      <main className="buehne">
        {VIEWS.map((id) => (
          <ViewportGrund key={id} id={id} />
        ))}
        <Szene3D />
        {VIEWS.map((id) => (
          <ViewportOber key={id} id={id} />
        ))}
        <Seitenleiste />
        <Stamm />
        <Dock />
      </main>
      <KontextMenue />
      <DialogFenster />
      <Hinweis />
    </>
  );
}
