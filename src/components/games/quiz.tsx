import { useCallback, useEffect, useRef, useState } from "react";
import {
  clipMs,
  playClip,
  playSoft,
  playYes,
  prefetchClips,
  prepareClips,
  stopClip,
} from "@/lib/who-said/audio";
import {
  BY_ID,
  VOICE,
  callSrc,
  clipsFor,
  factSrc,
  idsFor,
  matAt,
  answerSrc,
  answerSrcs,
  roundClips,
  type SetId,
  similarTo,
} from "@/lib/who-said/content";
import {
  getProgress,
  maybeSmartLine,
  noteHit,
  noteMiss,
  pickWeighted,
  type Level,
} from "@/lib/who-said/progress";
import { nameLine } from "@/lib/who-said/names";

/** The child's "Умница" line, so it is decoded before it might be needed. */
function smartPrep() {
  const id = getProgress().child;
  return id ? nameLine(id, "smart") : "";
}
import { CardFace, CheckIcon, Finale, Hills, SpeakerIcon, Sparks, Stars, TopBar } from "../kit";
import { shuffle, useQuiet, useTimers } from "@/lib/who-said/game-utils";

const ROUNDS = 8;
/** Cards per round for each level. */
const COUNTS: Record<Level, number[]> = {
  baby: [2, 2, 2, 2, 2, 2, 2, 2],
  middle: [2, 2, 3, 3, 4, 4, 4, 4],
  pro: [3, 3, 4, 4, 4, 6, 6, 6],
};
/** Silence before the sound repeats by itself, then before the right card starts to glow. */
const IDLE_REPEAT_MS = 7000;
const IDLE_HINT_MS = 13000;

/** `asked` = targets already used this game: everyone gets a turn before anyone repeats. */
function deal(
  ids: string[],
  count: number,
  previous: string | null,
  asked: string[],
  tricky: boolean,
) {
  const fresh = ids.filter((id) => !asked.includes(id) && id !== previous);
  const pool = fresh.length ? fresh : ids.filter((id) => id !== previous);
  // toys the child mixed up before come back more often
  const target = pickWeighted(pool);
  const rest = ids.filter((id) => id !== target);
  // «Умник»: look-alikes and sound-alikes go into the round first
  const alike = tricky ? shuffle(similarTo(target, rest)).slice(0, 2) : [];
  const others = [...alike, ...shuffle(rest.filter((id) => !alike.includes(id)))].slice(
    0,
    count - 1,
  );
  return { target, choices: shuffle([target, ...others]) };
}

/** «Кто сказал?»: hear a call or a question, tap the right toy. */
export function QuizGame({ set, onHome }: { set: SetId; onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const [asleep, setAsleep] = useState<string[]>([]);
  const [wobbling, setWobbling] = useState<string | null>(null);
  const [ringing, setRinging] = useState(false);
  const [solved, setSolved] = useState(false);
  const [idleHint, setIdleHint] = useState(false);
  const [idleTick, setIdleTick] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const asked = useRef<string[]>([]);
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const ring = useCallback(
    (id: string) => {
      setRinging(true);
      // Already decoded for a single set; in the mix the clip may still be loading.
      void prepareClips(
        [callSrc(id), ...answerSrcs(id), factSrc(id), smartPrep()].filter(Boolean),
      ).then(() => playClip(callSrc(id), BY_ID[id].sound));
      later(() => setRinging(false), 1100);
    },
    [later],
  );

  const startRound = useCallback(
    (index: number, previous: string | null) => {
      const ids = idsFor(set);
      // once every toy has had a turn, start a new lap
      const lap = index === 0 ? [] : asked.current.length >= ids.length ? [] : asked.current;
      const level = getProgress().level;
      const next = deal(ids, COUNTS[level][index], previous, lap, level === "pro");
      asked.current = [...lap, next.target];
      if (set === "mix") prefetchClips(roundClips(next.choices));
      setRound(index);
      setTarget(next.target);
      setChoices(next.choices);
      setAsleep([]);
      setSolved(false);
      setIdleHint(false);
      return next.target;
    },
    [set],
  );

  const begin = useCallback(() => {
    clearTimers();
    stopClip();
    setFound([]);
    setDone(false);
    const first = startRound(0, null);
    void prepareClips(clipsFor(set)).then(() => ring(first));
  }, [clearTimers, ring, set, startRound]);

  useEffect(() => {
    begin();
    return () => stopClip();
  }, [begin]);

  // If the child goes quiet: ring again, then let the right card glow.
  useEffect(() => {
    if (done || solved || !target) return;
    const repeat = window.setTimeout(() => ring(target), IDLE_REPEAT_MS);
    const hint = window.setTimeout(() => setIdleHint(true), IDLE_HINT_MS);
    return () => {
      window.clearTimeout(repeat);
      window.clearTimeout(hint);
    };
  }, [done, solved, target, round, idleTick, ring]);

  function choose(id: string) {
    if (done || solved || asleep.includes(id)) return;
    setIdleTick((n) => n + 1);
    if (id === target) {
      if (!asleep.length) noteHit(id);
      setSolved(true);
      setIdleHint(false);
      playYes();
      // ["Умница, Маша!"] → "Да, это корова!" → "Корова даёт молоко." → next round.
      // Pauses follow the real clip lengths.
      const smart = maybeSmartLine();
      const said = answerSrc(id);
      const smartEnds = smart && clipMs(smart) ? 300 + clipMs(smart) + 100 : 300;
      const nameEnds = smartEnds + (clipMs(said) || 1000);
      const factEnds = nameEnds + 150 + (clipMs(factSrc(id)) || 0);
      if (smart && clipMs(smart)) later(() => playClip(smart), 300);
      later(() => playClip(said), smartEnds);
      later(() => playClip(factSrc(id)), nameEnds + 150);
      setFound((list) => [...list, id]);
      later(
        () => {
          if (round + 1 >= ROUNDS) setDone(true);
          else ring(startRound(round + 1, target));
        },
        Math.max(1900, factEnds + 600),
      );
      return;
    }
    playSoft();
    if (!asleep.length) noteMiss(target);
    setAsleep((list) => [...list, id]);
    setWobbling(id);
    later(() => setWobbling(null), 600);
    later(() => playClip(VOICE.again), 300);
    later(() => ring(target), 1500);
  }

  if (done) return <Finale set={set} found={found} onHome={onHome} onAgain={begin} />;

  const hint = !solved && (asleep.length >= 2 || idleHint);

  return (
    <main className="room play">
      <TopBar onHome={onHome}>
        <Stars count={found.length} total={ROUNDS} />
      </TopBar>

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
              style={{
                animationDelay: `${index * 0.07}s`,
                ["--mat" as string]: matAt(index, round),
              }}
              onClick={() => choose(id)}
              aria-label={BY_ID[id].name}
              aria-disabled={solved || sleeping}
            >
              <CardFace id={id} />
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
              <Sparks />
            </button>
          );
        })}
      </div>
      <Hills />
    </main>
  );
}
