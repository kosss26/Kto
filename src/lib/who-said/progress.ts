import { useSyncExternalStore } from "react";
import { ITEMS, PRAISE, VOICE, idsFor, type SetId } from "./content";
import { NAMES, nameLine } from "./names";

/**
 * Everything the game remembers, kept in this browser only (no accounts).
 * stickers — toys collected for the album; plays — finished games per set;
 * misses — how often a toy was mixed up, so it comes back more often; level — difficulty.
 */
export type Level = "baby" | "middle" | "pro";

type Progress = {
  stickers: string[];
  plays: Partial<Record<SetId, number>>;
  misses: Record<string, number>;
  level: Level;
  /** Id from NAMES, or "" when the game should not use a name. */
  child: string;
};

const KEY = "kto-skazal:progress";
const EMPTY: Progress = { stickers: [], plays: {}, misses: {}, level: "middle", child: "" };

let state: Progress = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* blocked storage: play without memory */
  }
}

function save(next: Progress) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* blocked storage: progress lives until the tab closes */
  }
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getProgress() {
  load();
  return state;
}

export function useProgress() {
  return useSyncExternalStore(subscribe, getProgress, () => EMPTY);
}

export function setChild(child: string) {
  save({ ...getProgress(), child });
}

/** The chosen name as text, or "". */
export function childName() {
  const id = getProgress().child;
  return NAMES.find((n) => n.id === id)?.name ?? "";
}

/** «Молодец, Маша!» when a name is set, plain «Молодец!» otherwise. */
export function bravoLine() {
  const id = getProgress().child;
  return id ? nameLine(id, "bravo") : VOICE.bravo;
}

export function helloLine() {
  const id = getProgress().child;
  return id ? nameLine(id, "hi") : "";
}

/** Short cheer after a right answer; now and then it uses the child's name. */
export function praiseLine() {
  const id = getProgress().child;
  if (id && Math.random() < 0.35) return nameLine(id, "smart");
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}

/** Names a child can hear itself called by, sometimes, after a right answer. */
export function maybeSmartLine() {
  const id = getProgress().child;
  return id && Math.random() < 0.3 ? nameLine(id, "smart") : "";
}

export function setLevel(level: Level) {
  save({ ...getProgress(), level });
}

/** The toy was the answer and the child picked another one first. */
export function noteMiss(id: string) {
  const p = getProgress();
  save({ ...p, misses: { ...p.misses, [id]: Math.min((p.misses[id] ?? 0) + 1, 5) } });
}

/** Guessed at the first try: it is getting learnt, show it a little less. */
export function noteHit(id: string) {
  const p = getProgress();
  if (!p.misses[id]) return;
  const misses = { ...p.misses, [id]: p.misses[id] - 1 };
  if (misses[id] <= 0) delete misses[id];
  save({ ...p, misses });
}

/** Weighted pick: a toy that was mixed up twice is three times as likely as a fresh one. */
export function pickWeighted(ids: string[]) {
  const misses = getProgress().misses;
  const weights = ids.map((id) => 1 + (misses[id] ?? 0));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

/**
 * A game was finished: count it for the set and give one new sticker —
 * preferably one of the toys from this very game, otherwise any missing one of the set.
 */
export function finishGame(set: SetId, found: string[]): string | null {
  const p = getProgress();
  const have = new Set(p.stickers);
  const fromGame = found.filter((id) => !have.has(id));
  const fromSet = idsFor(set).filter((id) => !have.has(id));
  const anywhere = ITEMS.map((item) => item.id).filter((id) => !have.has(id));
  const pool = fromGame.length ? fromGame : fromSet.length ? fromSet : anywhere;
  const sticker = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  save({
    ...p,
    stickers: sticker ? [...p.stickers, sticker] : p.stickers,
    plays: { ...p.plays, [set]: (p.plays[set] ?? 0) + 1 },
  });
  return sticker;
}

export const LEVELS: { id: Level; label: string; note: string }[] = [
  { id: "baby", label: "Малыш", note: "2–3 года · две карточки" },
  { id: "middle", label: "Знайка", note: "3–4 года · до четырёх" },
  { id: "pro", label: "Умник", note: "5–6 лет · до шести и похожие голоса" },
];
