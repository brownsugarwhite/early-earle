import { buildCreature, type BuildOptions } from '@ee/creature';

/** Vermascht einen Bauplan abseits des Hauptthreads; Antwort mit übertragenen Puffern (kein Kopieren). */
export interface BuildRequest {
  id: number;
  bauplan: unknown;
  opts: BuildOptions;
}

self.onmessage = (e: MessageEvent<BuildRequest>) => {
  const { id, bauplan, opts } = e.data;
  try {
    const build = buildCreature(bauplan, opts);
    const d = build.descriptors;
    const transfer = [build.positions.buffer, build.normals.buffer, build.index.buffer, build.closed.buffer, d.skinIndex.buffer, d.skinWeight.buffer, d.spine.buffer, d.region.buffer, d.ao.buffer, d.thick.buffer, d.group.buffer];
    (self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage({ id, build }, transfer);
  } catch (err) {
    (self as unknown as { postMessage(msg: unknown): void }).postMessage({ id, error: String(err) });
  }
};
