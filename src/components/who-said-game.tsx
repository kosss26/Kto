import { useCallback, useEffect, useRef, useState } from "react";
import {
  playCall,
  playFanfare,
  playSoft,
  playTap,
  playYes,
  prefetchCalls,
  prepareCalls,
  resumeAudio,
  speakName,
  stopVoice,
  unlockAudio,
} from "@/lib/who-said/audio";
import { BY_ID, ITEMS, MODES, cardSrc, idsFor, matAt, type Mode } from "@/lib/who-said/content";

const ROUNDS = 8;
const COUNTS = [2, 2, 3, 3, 4, 4, 4, 4];
/** Silence before the bell rings again by itself, then before the right card starts to glow. */
const IDLE_REPEAT_MS = 7000;
const IDLE_HINT_MS = 13000;

type Phase = "hello" | "play" | "done";

function warmImages() {
  if (typeof window === "undefined") return;
  const art = ITEMS.map((item) => cardSrc(item.id));
  for (const src of art) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** `asked` = targets already used this game: everyone gets a turn before anyone repeats. */
function deal(ids: string[], count: number, previous: string | null, asked: string[]) {
  const fresh = ids.filter((id) => !asked.includes(id) && id !== previous);
  const pool = fresh.length ? fresh : ids.filter((id) => id !== previous);
  const target = pool[Math.floor(Math.random() * pool.length)];
  const others = shuffle(ids.filter((id) => id !== target)).slice(0, count - 1);
  return { target, choices: shuffle([target, ...others]) };
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 4.5l8 7" />
      <path d="M6.5 10v9.5h11V10" />
    </svg>
  );
}

function AgainIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4.8h-4.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 5.8v12.4a1 1 0 0 0 1.5.86l10-6.2a1 1 0 0 0 0-1.72l-10-6.2a1 1 0 0 0-1.5.86Z" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path className="cone" d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
      <path d="M15.2 9a4.2 4.2 0 0 1 0 6" />
      <path d="M17.8 6.5a7.8 7.8 0 0 1 0 11" />
    </svg>
  );
}

const LOGO_COLORS = ["#ff6b5e", "#ffb627", "#4cbf6a", "#3fa2e8", "#a77bea", "#ff6fa8"];

function Logo({ small = false }: { small?: boolean }) {
  const lines = ["Кто", "сказал?"];
  let n = 0;
  return (
    <h1 className={small ? "logo is-small" : "logo"} aria-label="Кто сказал?">
      {lines.map((line) => (
        <span className="logo-line" key={line} aria-hidden="true">
          {[...line].map((ch, i) => {
            const color = LOGO_COLORS[n++ % LOGO_COLORS.length];
            return (
              <span key={i} className="logo-ch" style={{ color, animationDelay: `${n * 0.06}s` }}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/** Felt hills along the bottom of every screen. */
function Hills() {
  return (
    <svg className="hills" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      <path className="hill-back" d="M0 70 C70 30 140 40 200 62 C260 84 330 38 400 54 V120 H0Z" />
      <path className="hill-front" d="M0 92 C80 64 150 70 220 88 C290 106 350 76 400 82 V120 H0Z" />
      <path className="stitch" d="M0 100 C80 72 150 78 220 96 C290 114 350 84 400 90" />
    </svg>
  );
}

function Stars({ count, total }: { count: number; total: number }) {
  return (
    <ol className="track" aria-label={`Угадано ${count} из ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className={i < count ? "track-star is-on" : i === count ? "track-star is-now" : "track-star"} />
      ))}
    </ol>
  );
}

const SET_MATS = ["#bfe3a5", "#ffd9a8", "#fff0a6", "#bfe0f5"];

export function WhoSaidGame() {
  const [phase, setPhase] = useState<Phase>("hello");
  const [mode, setMode] = useState<Mode>("farm");
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState("cow");
  const [choices, setChoices] = useState<string[]>(["cow", "hen"]);
  const [asleep, setAsleep] = useState<string[]>([]);
  const [wobbling, setWobbling] = useState<string | null>(null);
  const [ringing, setRinging] = useState(false);
  const [solved, setSolved] = useState(false);
  const [idleHint, setIdleHint] = useState(false);
  const [idleTick, setIdleTick] = useState(0);
  const [found, setFound] = useState<string[]>([]);

  const timers = useRef(new Set<number>());
  const asked = useRef<string[]>([]);
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
    prefetchCalls();
    warmImages();
    stopVoice();
    const onBack = () => resumeAudio();
    const pending = timers.current;
    document.addEventListener("visibilitychange", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      for (const id of pending) window.clearTimeout(id);
    };
  }, []);

  const ring = useCallback(
    (id: string) => {
      setRinging(true);
      playCall(id);
      later(() => setRinging(false), 1100);
    },
    [later],
  );

  // If the child goes quiet: ring again, then let the right card glow.
  useEffect(() => {
    if (phase !== "play" || solved) return;
    const repeat = window.setTimeout(() => ring(target), IDLE_REPEAT_MS);
    const hint = window.setTimeout(() => setIdleHint(true), IDLE_HINT_MS);
    return () => {
      window.clearTimeout(repeat);
      window.clearTimeout(hint);
    };
  }, [phase, solved, target, round, idleTick, ring]);

  function startRound(index: number, previous: string | null) {
    const ids = idsFor(mode);
    // once every toy has had a turn, start a new lap
    const lap = index === 0 ? [] : asked.current.length >= ids.length ? [] : asked.current;
    const next = deal(ids, COUNTS[index], previous, lap);
    asked.current = [...lap, next.target];
    setRound(index);
    setTarget(next.target);
    setChoices(next.choices);
    setAsleep([]);
    setSolved(false);
    setIdleHint(false);
    return next.target;
  }

  function begin() {
    unlockAudio();
    playTap();
    clearTimers();
    stopVoice();
    setFound([]);
    const first = startRound(0, null);
    setPhase("play");
    void prepareCalls().then(() => ring(first));
  }

  function goHome() {
    playTap();
    clearTimers();
    stopVoice();
    setRinging(false);
    setPhase("hello");
  }

  function finish() {
    setPhase("done");
    playFanfare();
    later(() => speakName("Молодец!"), 700);
  }

  function choose(id: string) {
    if (phase !== "play" || solved || asleep.includes(id)) return;
    setIdleTick((n) => n + 1);
    if (id === target) {
      setSolved(true);
      setIdleHint(false);
      playYes();
      // Vehicle clips already say the name out loud; animals get it spoken after their call.
      if (BY_ID[id].mode !== "city") later(() => speakName(BY_ID[id].name), 250);
      setFound((list) => [...list, id]);
      later(() => {
        if (round + 1 >= ROUNDS) finish();
        else ring(startRound(round + 1, target));
      }, 1900);
      return;
    }
    playSoft();
    setAsleep((list) => [...list, id]);
    setWobbling(id);
    later(() => setWobbling(null), 600);
    later(() => ring(target), 650);
  }

  function pickMode(next: Mode) {
    playTap();
    setMode(next);
  }

  const hint = !solved && (asleep.length >= 2 || idleHint);
  const parade = MODES.find((item) => item.id === mode)?.parade ?? [];

  if (phase === "hello") {
    return (
      <main className="room hello">
        <Logo />

        <div className="sets" role="radiogroup" aria-label="Кого слушаем">
          {MODES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={mode === item.id}
              className={mode === item.id ? "set is-on" : "set"}
              style={{ ["--mat" as string]: SET_MATS[index] }}
              onClick={() => pickMode(item.id)}
            >
              <span className="set-pic">
                <img src={cardSrc(item.cover)} alt="" />
              </span>
              <span className="set-name">{item.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="play-btn" onClick={begin} aria-label="Играть">
          <span className="play-disc">
            <PlayIcon />
          </span>
          <span className="play-word">Играть</span>
        </button>

        <div className="parade" aria-hidden="true">
          {parade.map((id) => (
            <img key={id} src={cardSrc(id)} alt="" />
          ))}
        </div>
        <Hills />
        <p className="credits">
          {mode !== "city" ? "Звуки животных — записи с Wikimedia Commons" : "Машины называет голос"}
        </p>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="room done">
        <div className="stars" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1 className="praise">Молодец!</h1>
        <p className="recap-title">Ты угадал:</p>
        <ul className="recap">
          {found.map((id, index) => (
            <li
              key={`${id}-${index}`}
              style={{ animationDelay: `${0.35 + index * 0.07}s`, ["--mat" as string]: matAt(index, 0) }}
            >
              <img src={cardSrc(id)} alt={BY_ID[id].name} />
            </li>
          ))}
        </ul>
        <div className="finale-actions">
          <button type="button" className="round-btn is-white" onClick={goHome} aria-label="Домой">
            <HomeIcon />
          </button>
          <button type="button" className="round-btn is-go" onClick={begin} aria-label="Играть ещё">
            <AgainIcon />
          </button>
        </div>
        <Hills />
      </main>
    );
  }

  return (
    <main className="room play">
      <header className="topbar">
        <button type="button" className="round-btn is-white is-small" onClick={goHome} aria-label="Домой">
          <HomeIcon />
        </button>
        <Stars count={found.length} total={ROUNDS} />
        <span className="topbar-spacer" aria-hidden="true" />
      </header>

      <div className="sound-zone">
        <button
          type="button"
          className={ringing ? "sound-btn is-live" : "sound-btn"}
          onClick={() => {
            setIdleTick((n) => n + 1);
            ring(target);
          }}
          aria-label="Послушать ещё раз"
        >
          <span className="wave w1" aria-hidden="true" />
          <span className="wave w2" aria-hidden="true" />
          <span className="sound-disc">
            <SpeakerIcon />
          </span>
        </button>
      </div>

      <div className={`cards${solved ? " is-solved" : ""}`} data-count={choices.length} key={round}>
        {choices.map((id, index) => {
          const good = solved && id === target;
          const sleeping = asleep.includes(id);
          const state = good
            ? " is-good"
            : sleeping
              ? " is-asleep"
              : hint && id === target
                ? " is-hint"
                : "";
          return (
            <button
              key={id}
              type="button"
              className={`card${state}${wobbling === id ? " is-wobble" : ""}`}
              style={{ animationDelay: `${index * 0.07}s`, ["--mat" as string]: matAt(index, round) }}
              onClick={() => choose(id)}
              aria-label={BY_ID[id].name}
              aria-disabled={solved || sleeping}
            >
              <span className="card-face">
                <img src={cardSrc(id)} alt="" draggable={false} />
              </span>
              {sleeping && (
                <span className="zz" aria-hidden="true">
                  z<small>z</small>
                </span>
              )}
              <span className="badge" aria-hidden="true">
                <CheckIcon />
              </span>
              <span className="plate" aria-hidden={!good}>
                {BY_ID[id].name}
              </span>
              <span className="sparks" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </button>
          );
        })}
      </div>
      <Hills />
    </main>
  );
}
