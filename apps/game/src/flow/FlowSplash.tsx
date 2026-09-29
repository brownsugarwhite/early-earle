import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import splashUrl from '../../../../assets/ref-florian/02-splashscreen-illudiy-i.png';
import { useFlowStore } from './flowStore';

/** Splash PNG geometry (838 × 1428): the baked i-dot's centre and radius as fractions of the image. */
const IMG_W = 838;
const IMG_H = 1428;
const DOT_X = 0.5173;
const DOT_Y = 0.4062;
const DOT_R = 41 / IMG_W;
/** The mask hole is a little larger than the baked dot so its soft edge never peeks out. */
const HOLE_FACTOR = 1.14;

/**
 * Splash overlay: Florian's set composition as the PNG itself, `object-fit: contain` on the splash ink.
 * A circular mask hole over the baked dot lets the 3D hero (placed by projected screen coordinates)
 * show through; behind it the scene renders the same ink, so nothing is visibly cut.
 * Tap or any key → the hero hops off the i and the overlay fades while the camera pulls back.
 */
export function FlowSplash() {
  const phase = useFlowStore((s) => s.phase);
  const request = useFlowStore((s) => s.request);
  const setSplashDot = useFlowStore((s) => s.setSplashDot);
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: IMG_W, h: IMG_H, left: 0, top: 0 });
  const [mounted, setMounted] = useState(phase === 'splash' || phase === 'hop');

  // Keep the overlay in the DOM through the fade, then unmount.
  useEffect(() => {
    if (phase === 'splash') setMounted(true);
    else if (phase === 'hop') {
      const id = window.setTimeout(() => setMounted(false), 900);
      return () => window.clearTimeout(id);
    } else setMounted(false);
    return undefined;
  }, [phase]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const s = Math.min(W / IMG_W, H / IMG_H);
      const w = IMG_W * s;
      const h = IMG_H * s;
      const left = (W - w) / 2;
      const top = (H - h) / 2;
      setBox({ w, h, left, top });
      setSplashDot({ x: left + w * DOT_X, y: top + h * DOT_Y, r: DOT_R * w });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [mounted, setSplashDot]);

  if (!mounted) return null;
  // The hole is cut into the whole overlay (image and letterbox) in viewport pixels; behind it the scene
  // renders the interior colour of the i plus the hero, so the overlay's ink never shows through.
  const holeR = DOT_R * box.w * HOLE_FACTOR;
  const rootStyle = {
    '--dot-x': `${box.left + box.w * DOT_X}px`,
    '--dot-y': `${box.top + box.h * DOT_Y}px`,
    '--hole-r': `${holeR}px`,
  } as React.CSSProperties;
  const imgStyle = { width: `${box.w}px`, height: `${box.h}px` } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className="splash"
      data-testid="splash"
      data-fading={phase !== 'splash'}
      style={rootStyle}
      onPointerDown={() => {
        if (phase === 'splash') request('hop');
      }}
    >
      <img className="splash-img" src={splashUrl} alt="illudiy" draggable={false} style={imgStyle} />
      <p className="splash-hint">Tippen</p>
    </div>
  );
}
