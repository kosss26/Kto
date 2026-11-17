import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { cardSrc } from "./content";

export function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function warmImages(ids: string[]) {
  if (typeof window === "undefined") return;
  for (const src of ids.map(cardSrc)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

/** setTimeout that is cancelled when the screen goes away. */
export function useTimers() {
  const timers = useRef(new Set<number>());
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current.clear();
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
    };
  }, []);
  return { later, clearTimers };
}

/** Games tell the shell when the background music has to be quiet. */
export const QuietContext = createContext<(quiet: boolean) => void>(() => {});

export function useQuiet(quiet: boolean) {
  const setQuiet = useContext(QuietContext);
  useEffect(() => {
    setQuiet(quiet);
  }, [quiet, setQuiet]);
}
