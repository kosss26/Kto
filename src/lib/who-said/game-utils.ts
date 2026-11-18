import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { pauseAudio, resumeAudio } from "./audio";
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

// ---------- pause: app hidden / screen locked ----------

let paused = false;
const pauseListeners = new Set<() => void>();

/** Called by the shell on visibilitychange: freezes sounds and every game timer, then carries on. */
export function setPaused(next: boolean) {
  if (next === paused) return;
  paused = next;
  if (next) pauseAudio();
  else resumeAudio();
  for (const fn of pauseListeners) fn();
}

function subscribePause(fn: () => void) {
  pauseListeners.add(fn);
  return () => {
    pauseListeners.delete(fn);
  };
}

export function usePaused() {
  return useSyncExternalStore(
    subscribePause,
    () => paused,
    () => false,
  );
}

/** Runs `fn` each time the app comes back from the background. */
export function useOnResume(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(
    () =>
      subscribePause(() => {
        if (!paused) ref.current();
      }),
    [],
  );
}

type Timer = { id: number; fn: () => void; due: number; left: number };

/**
 * setTimeout that is cancelled when the screen goes away and that stops while the app is hidden:
 * a round waits exactly where it was and continues when the child comes back.
 */
export function useTimers() {
  const timers = useRef(new Set<Timer>());

  const arm = useCallback((t: Timer, ms: number) => {
    t.due = Date.now() + ms;
    t.id = window.setTimeout(() => {
      timers.current.delete(t);
      t.fn();
    }, ms);
  }, []);

  const later = useCallback(
    (fn: () => void, ms: number) => {
      const t: Timer = { id: 0, fn, due: 0, left: ms };
      timers.current.add(t);
      if (paused) t.left = ms;
      else arm(t, ms);
    },
    [arm],
  );

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t.id);
    timers.current.clear();
  }, []);

  useEffect(() => {
    const all = timers.current;
    const off = subscribePause(() => {
      for (const t of all) {
        if (paused) {
          window.clearTimeout(t.id);
          t.left = Math.max(0, t.due - Date.now());
        } else {
          arm(t, t.left);
        }
      }
    });
    return () => {
      off();
      for (const t of all) window.clearTimeout(t.id);
    };
  }, [arm]);

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
