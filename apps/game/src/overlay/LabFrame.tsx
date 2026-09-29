import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PerfBadge } from './PerfBadge';

/** Rahmen für Prototypen: Canvas füllt den Bildschirm, darüber Titel, Navigation, Perf-Badge und Regler. */
export function LabFrame({ title, children, controls }: { title: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <div className="lab-frame">
      {children}
      <header className="lab-header">
        <Link to="/lab" className="lab-back">◀ Lab</Link>
        <h1 className="lab-title">{title}</h1>
        <PerfBadge />
      </header>
      {controls ? <aside className="lab-controls">{controls}</aside> : null}
    </div>
  );
}
