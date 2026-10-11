import { useLayoutSteuerung, useMenueBruecke, useTastatur, useTitel } from './hooks';
import { LibraryPanel } from './library/LibraryPanel';
import { MenuBar } from './menu/MenuBar';
import { Szene3D } from './three/Szene3D';
import { VIEWS } from './types';
import { DialogFenster } from './ui/DialogFenster';
import { Glasfilter } from './ui/Glasfilter';
import { Hinweis } from './ui/Hinweis';
import { KontextMenue } from './ui/KontextMenue';
import { ViewportGrund, ViewportOber } from './viewports/Viewport';

export function App() {
  useLayoutSteuerung();
  useTastatur();
  useMenueBruecke();
  useTitel();
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
        <LibraryPanel />
      </main>
      <KontextMenue />
      <DialogFenster />
      <Hinweis />
    </>
  );
}
