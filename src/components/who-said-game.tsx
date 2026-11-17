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
import { BY_ID, ITEMS, MODES, cardSrc, idsFor, type Mode } from "@/lib/who-said/content";

const ROUNDS = 8;
const COUNTS = [2, 2, 3, 3, 4, 4, 4, 4];
/** Silence before the bell rings again by itself, then before the right card starts to glow. */
const IDLE_REPEAT_MS = 7000;
const IDLE_HINT_MS = 13000;

type Phase = "hello" | "play" | "done";

function warmImages() {
  if (typeof window === "undefined") return;
  const art = ["/toys/bell.webp", "/toys/listen.webp", "/toys/again.webp", ...ITEMS.map((item) => cardSrc(item.id))];
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

function deal(ids: string[], count: number, previous: string | null) {
  const pool = ids.filter((id) => id !== previous);
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

export function WhoSaidGame() {
  const [phase, setPhase] = useState<Phase>("hello");
  const [mode, setMode] = useState<Mode>("animals");
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
    const next = deal(idsFor(mode), COUNTS[index], previous);
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
      if (BY_ID[id].mode === "animals") later(() => speakName(BY_ID[id].name), 250);
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
  const matClass = mode === "transport" ? "is-city" : "is-farm";

  if (phase === "hello") {
    return (
      <main className="room hello">
        <h1 className="wordmark">
          <img src="/toys/wordmark4.webp" alt="Кто сказал" />
        </h1>

        <div className="sets" role="radiogroup" aria-label="Кого слушаем">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={mode === item.id}
              className={`set ${item.id === "transport" ? "is-city" : "is-farm"}${mode === item.id ? " is-on" : ""}`}
              onClick={() => pickMode(item.id)}
            >
              <span className="set-pic">
                <img src={cardSrc(item.cover)} alt="" />
              </span>
              <span className="set-name">{item.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="start" onClick={begin} aria-label="Начать игру">
          <img className="bell is-idle" src="/toys/bell.webp" alt="" />
          <img className="start-word" src="/toys/listen.webp" alt="" />
        </button>

        <p className="credits">
          {mode === "animals" ? "Звуки животных — записи с Wikimedia Commons" : "Машины называет голос"}
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
        <ul className={`recap ${matClass}`}>
          {found.map((id, index) => (
            <li key={`${id}-${index}`} style={{ animationDelay: `${0.35 + index * 0.07}s` }}>
              <span className="mini-mat">
                <img src={cardSrc(id)} alt={BY_ID[id].name} />
              </span>
            </li>
          ))}
        </ul>
        <div className="finale-actions">
          <button type="button" className="big-btn is-wood" onClick={goHome} aria-label="Домой">
            <HomeIcon />
          </button>
          <button type="button" className="big-btn is-go" onClick={begin} aria-label="Играть ещё">
            <AgainIcon />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="room play">
      <header className="topbar">
        <button type="button" className="cube" onClick={goHome} aria-label="Домой">
          <HomeIcon />
        </button>
        <ol className="beads" aria-label={`Задание ${round + 1} из ${ROUNDS}`}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <li key={i} className={i < found.length ? "bead is-on" : i === round ? "bead is-now" : "bead"} />
          ))}
        </ol>
        <span className="cube-spacer" aria-hidden="true" />
      </header>

      <div className="bell-zone">
        <button
          type="button"
          className={ringing ? "replay is-live" : "replay"}
          onClick={() => {
            setIdleTick((n) => n + 1);
            ring(target);
          }}
          aria-label="Послушать ещё раз"
        >
          <span className="wave w1" aria-hidden="true" />
          <span className="wave w2" aria-hidden="true" />
          <img className={ringing ? "bell is-ringing" : "bell"} src="/toys/bell.webp" alt="" />
        </button>
      </div>

      <div className={`cards ${matClass}${solved ? " is-solved" : ""}`} data-count={choices.length} key={round}>
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
              style={{ animationDelay: `${index * 0.06}s` }}
              onClick={() => choose(id)}
              aria-label={BY_ID[id].name}
              aria-disabled={solved || sleeping}
            >
              <span className="mat">
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
    </main>
  );
}
