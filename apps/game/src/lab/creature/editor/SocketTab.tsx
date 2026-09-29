import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { SLOT_IDS, type SlotId } from '@ee/genome';
import { Slider } from '../../../routes/LabCreature';
import { SLOT_LABELS, deg, updateSocket, type RulesDraft } from './editorState';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Socket positions on a 2D body map (equirectangular: x = theta, y = phi) with big draggable dots,
 * plus sliders for tilt, roll, sink, jitter and spread. Mirror slots show their twin at −theta.
 */
export function SocketTab({ draft, onChange, slot, setSlot }: { draft: RulesDraft; onChange: (d: RulesDraft) => void; slot: SlotId; setSlot: (s: SlotId) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<SlotId | null>(null);
  const s = draft.sockets[slot];

  const toXY = (theta: number, phi: number) => ({ x: ((theta + Math.PI) / (2 * Math.PI)) * 100, y: ((Math.PI / 2 - phi) / Math.PI) * 100 });
  const fromEvent = (e: ReactPointerEvent) => {
    const r = mapRef.current!.getBoundingClientRect();
    const u = clamp((e.clientX - r.left) / r.width, 0, 1);
    const v = clamp((e.clientY - r.top) / r.height, 0, 1);
    return { theta: u * 2 * Math.PI - Math.PI, phi: Math.PI / 2 - v * Math.PI };
  };
  const onDown = (id: SlotId) => (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = id;
    setSlot(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const id = dragging.current;
    if (!id) return;
    const { theta, phi } = fromEvent(e);
    onChange(
      updateSocket(draft, id, (sk) => {
        sk.theta = Math.round(theta * 100) / 100;
        sk.phi = Math.round(clamp(phi, -1.5, 1.5) * 100) / 100;
      }),
    );
  };
  const onUp = () => {
    dragging.current = null;
  };
  const set = (patch: Partial<typeof s>) => onChange(updateSocket(draft, slot, (sk) => Object.assign(sk, patch)));

  return (
    <div className="ced-section" data-testid="ed-sockets">
      <div className="creature-row">
        {SLOT_IDS.map((id) => (
          <button key={id} type="button" className="ced-chip" data-active={id === slot} onClick={() => setSlot(id)}>
            {SLOT_LABELS[id]}
          </button>
        ))}
      </div>
      <div ref={mapRef} className="ced-map" data-testid="ed-socket-map" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {SLOT_IDS.flatMap((id) => {
          const sk = draft.sockets[id];
          const main = toXY(sk.theta, sk.phi);
          const dots = [
            <div key={id} className="ced-map-dot" data-active={id === slot} style={{ left: `${main.x}%`, top: `${main.y}%` }} onPointerDown={onDown(id)} title={SLOT_LABELS[id]}>
              {SLOT_LABELS[id].slice(0, 3)}
            </div>,
          ];
          if (sk.mirror) {
            const twin = toXY(-sk.theta, sk.phi);
            dots.push(
              <div key={id + '-m'} className="ced-map-dot" data-mirror="true" data-active={id === slot} style={{ left: `${twin.x}%`, top: `${twin.y}%` }}>
                {SLOT_LABELS[id].slice(0, 3)}
              </div>,
            );
          }
          return dots;
        })}
        <span className="ced-map-axis">← hinten · links · VORN · rechts · hinten → | oben ↑ unten ↓</span>
      </div>
      <div className="creature-row">
        <span className="creature-label">{SLOT_LABELS[slot]}</span>
        <button type="button" className="ced-chip" data-active={!!s.mirror} onClick={() => set({ mirror: !s.mirror })}>
          Spiegelpaar
        </button>
        <button type="button" className="ced-chip" data-active={(s.ref ?? 'up') === 'up'} onClick={() => set({ ref: 'up' })}>
          Bezug: oben
        </button>
        <button type="button" className="ced-chip" data-active={s.ref === 'forward'} onClick={() => set({ ref: 'forward' })}>
          Bezug: vorn
        </button>
        <span className="creature-info">
          θ {deg(s.theta)} · φ {deg(s.phi)}
        </span>
      </div>
      <div className="creature-row">
        <Slider label="Theta" value={s.theta} min={-Math.PI} max={Math.PI} step={0.01} onChange={(theta) => set({ theta })} format={deg} />
        <Slider label="Phi" value={s.phi} min={-1.5} max={1.5} step={0.01} onChange={(phi) => set({ phi })} format={deg} />
        <Slider label="Neigung" value={s.tilt ?? 0} min={-1.5} max={1.5} step={0.01} onChange={(tilt) => set({ tilt })} format={deg} />
        <Slider label="Rollen" value={s.roll ?? 0} min={-Math.PI} max={Math.PI} step={0.01} onChange={(roll) => set({ roll })} format={deg} />
        <Slider label="Einsinken" value={s.sink ?? 0} min={-0.2} max={0.3} step={0.005} onChange={(sink) => set({ sink })} />
        <Slider label="Jitter θ" value={s.jitter?.[0] ?? 0} min={0} max={0.5} step={0.01} onChange={(j) => set({ jitter: [j, s.jitter?.[1] ?? 0] })} />
        <Slider label="Jitter φ" value={s.jitter?.[1] ?? 0} min={0} max={0.5} step={0.01} onChange={(j) => set({ jitter: [s.jitter?.[0] ?? 0, j] })} />
        <Slider label="Abstand" value={s.spread ?? 0.3} min={0} max={1.5} step={0.01} onChange={(spread) => set({ spread })} format={deg} />
      </div>
    </div>
  );
}
