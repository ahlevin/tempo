import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// A single shared 1-second clock for the whole app. Instead of every live
// countdown owning its own setInterval (which multiplied one-per-card and kept
// firing off-screen — the main CPU/heat culprit), components subscribe to this
// one tick via useTick(). The interval only runs while at least one consumer is
// mounted, so screens with no live countdown cost nothing.

interface TickValue {
  now: number;             // current time in ms; changes once per second while active
  subscribe: () => () => void;
}

const TickCtx = createContext<TickValue>({ now: Date.now(), subscribe: () => () => {} });

export function TickProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(false);
  const count = useRef(0);

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

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // `children` is a stable element reference, so this provider re-rendering each
  // second does NOT re-render the app tree — only useTick() consumers do.
  return <TickCtx.Provider value={{ now, subscribe }}>{children}</TickCtx.Provider>;
}

// Subscribe to the shared 1-second tick. Returns `now` (ms) and re-renders the
// caller each second. Only call it in a component that is actually visible and
// needs live seconds (e.g. the active hero card) so the interval stays idle
// whenever nothing on screen is ticking.
export function useTick(): number {
  const { now, subscribe } = useContext(TickCtx);
  useEffect(() => subscribe(), [subscribe]);
  return now;
}
