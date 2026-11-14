import type { Renderer3D } from './Renderer3D';

/** Die eine 3D-Szene der App (für Vorschaubilder beim Speichern und für Tests). */
export const szene: { aktuell: Renderer3D | null } = { aktuell: null };
