import { Route, Routes } from 'react-router';
import { Home } from './routes/Home';
import { Play } from './routes/Play';
import { LabIndex } from './routes/LabIndex';
import { LabBlob } from './routes/LabBlob';
import { LabEarle } from './routes/LabEarle';
import { LabGrid } from './routes/LabGrid';
import { LabCreature } from './routes/LabCreature';
import { LabTree } from './routes/LabTree';
import { LabShadow } from './routes/LabShadow';
import { LabRex } from './routes/LabRex';
import { LabAudio } from './routes/LabAudio';
import { EditorLevels } from './routes/EditorLevels';
import { EditorCreatures } from './routes/EditorCreatures';
import { EditorMap } from './routes/EditorMap';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<Play />} />
      <Route path="/lab" element={<LabIndex />} />
      <Route path="/lab/blob" element={<LabBlob />} />
      <Route path="/lab/earle" element={<LabEarle />} />
      <Route path="/lab/grid" element={<LabGrid />} />
      <Route path="/lab/creature" element={<LabCreature />} />
      <Route path="/lab/tree" element={<LabTree />} />
      <Route path="/lab/shadow" element={<LabShadow />} />
      <Route path="/lab/rex" element={<LabRex />} />
      <Route path="/lab/audio" element={<LabAudio />} />
      <Route path="/editor/levels" element={<EditorLevels />} />
      <Route path="/editor/creatures" element={<EditorCreatures />} />
      <Route path="/editor/map" element={<EditorMap />} />
    </Routes>
  );
}
