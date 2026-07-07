import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

// A single shared PER-MINUTE clock for the whole app. The hero countdown shows
// days (+ coarse hours/minutes), never seconds, so a 60s cadence is plenty.
// Instead of every live countdown owning its own setInterval (which multiplied
// one-per-card and kept firing off-screen — the CPU/heat culprit), components
// subscribe to this one tick via useTick(). The interval only runs while at
// least one consumer is mounted, so screens with no live countdown cost nothing.

const TICK_MS = 60_000; // per-minute; seconds are never displayed on the hero

interface TickValue {
  now: number;             // current time in ms; changes once per minute while active
  subscribe: () => () => void;
}

const TickCtx = createContext<TickValue>({ now: Date.now(), subscribe: () => () => {} });

export function TickProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(true);
  const count = useRef(0);

  // Track page/app visibility so the clock does ZERO periodic work while the user
  // isn't looking (tab backgrounded / app inactive). Web uses visibilitychange;
  // native uses AppState.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const doc: any = (globalThis as any).document;
      if (!doc) return;
      const onVis = () => setVisible(doc.visibilityState !== 'hidden');
      onVis();
      doc.addEventListener('visibilitychange', onVis);
      return () => doc.removeEventListener('visibilitychange', onVis);
    }
    const sub = AppState.addEventListener('change', s => setVisible(s === 'active'));
    return () => sub.remove();
  }, []);

  // Stable subscribe: ref-counts consumers and flips `active` on the 0<->1 edges
  // so the interval starts on the first subscriber and stops after the last.
  const subscribe = useRef(() => {
    count.current += 1;
    if (count.current === 1) setActive(true);
    return () => {
      count.current = Math.max(0, count.current - 1);
      if (count.current === 0) setActive(false);
    };
  }).current;

  // The interval runs ONLY while there's a live consumer AND the page is visible.
  // Hiding the tab clears it; returning does an immediate tick so the display is
  // fresh, then resumes the per-minute cadence.
  useEffect(() => {
    if (!active || !visible) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [active, visible]);

  // `children` is a stable element reference, so this provider re-rendering each
  // minute does NOT re-render the app tree — only useTick() consumers do.
  return <TickCtx.Provider value={{ now, subscribe }}>{children}</TickCtx.Provider>;
}

// Subscribe to the shared per-minute tick. Returns `now` (ms) and re-renders the
// caller once a minute. Only call it in a component that is actually visible and
// needs a live countdown (e.g. the active hero card) so the interval stays idle
// whenever nothing on screen is ticking.
export function useTick(): number {
  const { now, subscribe } = useContext(TickCtx);
  useEffect(() => subscribe(), [subscribe]);
  return now;
}
