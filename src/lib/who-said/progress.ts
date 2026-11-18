import { useSyncExternalStore } from "react";
import { BY_ID, ITEMS, PRAISE, VOICE, idsFor, type Mode, type SetId } from "./content";
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
  /** Today's guest on the shelf: picked once a day, met = the child already tapped it. */
  guest: { day: string; id: string; met: boolean } | null;
  /** Sets whose full sticker collection was already celebrated. */
  partied: Mode[];
  /** Parents' corner. */
  settings: Settings;
  /** Per toy: answered at the first try (hit) or mixed up (miss), for the statistics. */
  seen: Record<string, { hit: number; miss: number }>;
  /** Seconds played per day ("2026-11-18"), last 14 days kept. */
  playLog: Record<string, number>;
};

export type Settings = {
  /** Minutes per day, 0 = no limit. */
  limit: number;
  facts: boolean;
  /** Sets switched off by the parents. */
  off: Mode[];
  volume: { voice: number; sounds: number; music: number };
  /** Extra minutes granted today by a grown-up after the limit. */
  bonus: { day: string; minutes: number } | null;
};

const DEFAULT_SETTINGS: Settings = {
  limit: 0,
  facts: true,
  off: [],
  volume: { voice: 1, sounds: 1, music: 1 },
  bonus: null,
};

const KEY = "kto-skazal:progress";
const EMPTY: Progress = {
  stickers: [],
  plays: {},
  misses: {},
  level: "middle",
  child: "",
  guest: null,
  partied: [],
  settings: DEFAULT_SETTINGS,
  seen: {},
  playLog: {},
};

let state: Progress = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...EMPTY, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
    }
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
  const was = p.seen[id] ?? { hit: 0, miss: 0 };
  save({
    ...p,
    misses: { ...p.misses, [id]: Math.min((p.misses[id] ?? 0) + 1, 5) },
    seen: { ...p.seen, [id]: { ...was, miss: was.miss + 1 } },
  });
}

/** Guessed at the first try: it is getting learnt, show it a little less. */
export function noteHit(id: string) {
  const p = getProgress();
  const was = p.seen[id] ?? { hit: 0, miss: 0 };
  const misses = { ...p.misses };
  if (misses[id]) {
    misses[id] -= 1;
    if (misses[id] <= 0) delete misses[id];
  }
  save({ ...p, misses, seen: { ...p.seen, [id]: { ...was, hit: was.hit + 1 } } });
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

// ---------- «Зверь дня» ----------

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Today's guest: a toy the child hasn't collected yet if there is one, the same all day. */
export function guestOfDay() {
  const p = getProgress();
  const day = today();
  // today's guest stays, unless a grown-up has just switched its set off
  if (p.guest?.day === day && BY_ID[p.guest.id] && !p.settings.off.includes(BY_ID[p.guest.id].mode))
    return p.guest;
  const have = new Set(p.stickers);
  const off = new Set(p.settings.off);
  const allowed = ITEMS.filter((item) => !off.has(item.mode));
  const fresh = allowed.filter((item) => !have.has(item.id)).map((item) => item.id);
  const pool = fresh.length ? fresh : allowed.map((item) => item.id);
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const guest = { day, id: pool[hash % pool.length], met: false };
  save({ ...p, guest });
  return guest;
}

/** The child said hello to the guest: it leaves its sticker (once). Returns true if the sticker is new. */
export function meetGuest() {
  const p = getProgress();
  if (!p.guest || p.guest.met) return false;
  const isNew = !p.stickers.includes(p.guest.id);
  save({
    ...p,
    guest: { ...p.guest, met: true },
    stickers: isNew ? [...p.stickers, p.guest.id] : p.stickers,
  });
  return isNew;
}

// ---------- собранные наборы ----------

export function isSetComplete(mode: Mode, stickers = getProgress().stickers) {
  const have = new Set(stickers);
  return idsFor(mode).every((id) => have.has(id));
}

/** The set this new sticker completes, if it completes one that wasn't celebrated yet. */
export function setToCelebrate(sticker: string | null): Mode | null {
  if (!sticker) return null;
  const mode = BY_ID[sticker].mode;
  const p = getProgress();
  if (p.partied.includes(mode) || !isSetComplete(mode, p.stickers)) return null;
  save({ ...p, partied: [...p.partied, mode] });
  return mode;
}

// ---------- родительский уголок ----------

export function setSettings(patch: Partial<Settings>) {
  const p = getProgress();
  save({ ...p, settings: { ...p.settings, ...patch } });
}

/** Toys of a set the parents haven't switched off (the album still shows everything). */
export function activeIdsFor(set: SetId) {
  const off = new Set(getProgress().settings.off);
  return idsFor(set).filter((id) => !off.has(BY_ID[id].mode));
}

export function factsOn() {
  return getProgress().settings.facts;
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Called every few seconds while a game is on screen. */
export function addPlayTime(seconds: number) {
  const p = getProgress();
  const day = dayKey();
  const log: Record<string, number> = { ...p.playLog, [day]: (p.playLog[day] ?? 0) + seconds };
  // keep two weeks
  const keys = Object.keys(log).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  for (const k of keys.slice(14)) delete log[k];
  save({ ...p, playLog: log });
}

export function minutesToday() {
  return Math.floor((getProgress().playLog[dayKey()] ?? 0) / 60);
}

export function minutesWeek() {
  const p = getProgress();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    total += p.playLog[dayKey(d)] ?? 0;
  }
  return Math.floor(total / 60);
}

/** Today's time is up (limit plus whatever a grown-up added today). */
export function timeIsUp() {
  const { limit, bonus } = getProgress().settings;
  if (!limit) return false;
  const extra = bonus?.day === dayKey() ? bonus.minutes : 0;
  return minutesToday() >= limit + extra;
}

/** A grown-up allows a little more today. */
export function addBonusMinutes(minutes: number) {
  const { bonus } = getProgress().settings;
  const today = dayKey();
  const was = bonus?.day === today ? bonus.minutes : 0;
  setSettings({ bonus: { day: today, minutes: was + minutes } });
}

/** «Узнаёт уверенно» and «Путает» for the parents. */
export function learning() {
  const p = getProgress();
  const known: string[] = [];
  const confused: string[] = [];
  for (const [id, s] of Object.entries(p.seen)) {
    if (!BY_ID[id]) continue;
    if ((p.misses[id] ?? 0) > 0 && s.miss > 0) confused.push(id);
    else if (s.hit >= 2 && s.hit >= s.miss * 2) known.push(id);
  }
  confused.sort((a, b) => (p.misses[b] ?? 0) - (p.misses[a] ?? 0));
  known.sort((a, b) => p.seen[b].hit - p.seen[a].hit);
  return { known, confused };
}
