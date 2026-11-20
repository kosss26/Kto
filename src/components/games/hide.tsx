import { useCallback, useEffect, useRef, useState } from "react";
import { clipMs, playClip, playSoft, playYes, prepareClips, stopClip } from "@/lib/who-said/audio";
import {
  BY_ID,
  HIDE,
  ITEMS,
  VOICE,
  answerSrc,
  answerSrcs,
  callSrc,
  cardSrc,
  type SetId,
} from "@/lib/who-said/content";
import { useOnResume, usePaused, useQuiet, useTimers } from "@/lib/who-said/game-utils";
import {
  activeIdsFor,
  getProgress,
  noteHit,
  noteMiss,
  pickWeighted,
  type Level,
} from "@/lib/who-said/progress";
import { Backdrop, Finale, Notes, SpeakerIcon, Sparks, Stars, TopBar } from "../kit";

const ROUNDS = 8;
/** Bushes per round for each level. */
const BUSHES: Record<Level, number[]> = {
  baby: [2, 2, 2, 2, 2, 2, 2, 2],
  middle: [2, 2, 3, 3, 3, 3, 4, 4],
  pro: [3, 3, 4, 4, 4, 4, 4, 4],
};
/** Silence before the toy calls again by itself. */
const CALL_AGAIN_MS = 6000;

/** Toys that make a real sound: hiding only works if the child can hear who it is. */
function pool(set: SetId) {
  const own = activeIdsFor(set).filter((id) => BY_ID[id].sound);
  if (own.length >= 3) return own;
  const all = activeIdsFor("mix").filter((id) => BY_ID[id].sound);
  return all.length >= 3 ? all : ITEMS.filter((item) => item.sound).map((item) => item.id);
}

/** Left −0.8 … right 0.8: the call comes from the bush the toy sits behind. */
const panFor = (spot: number, count: number) => (count < 2 ? 0 : -0.8 + (1.6 * spot) / (count - 1));

/** A felt bush with stitching, drawn in code; a few shades so rows don't look copied. */
function Bush({ shade }: { shade: number }) {
  const greens = [
    ["#5bb36a", "#4a9c58"],
    ["#6cc27a", "#56a865"],
    ["#4fa65f", "#3f8e4e"],
    ["#74c784", "#5eae6c"],
  ][shade % 4];
  return (
    <svg className="bush-art" viewBox="0 0 120 90" aria-hidden="true">
      <path
        d="M10 84 C2 70 8 52 24 50 C22 32 42 22 56 32 C62 14 92 16 94 38 C112 38 120 58 110 72 C114 80 108 86 100 86 L18 86 Z"
        fill={greens[0]}
      />
      <path d="M18 86 C30 74 48 72 60 80 C72 70 92 72 102 86 Z" fill={greens[1]} />
      <path
        d="M16 78 C10 66 16 56 28 56 C28 40 44 32 56 40 C62 24 86 24 88 42 C104 44 110 60 102 72"
        fill="none"
        stroke="rgb(255 255 255 / 75%)"
        strokeWidth="2"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <circle cx="38" cy="60" r="4" fill="#ff8f8f" />
      <circle cx="80" cy="50" r="3.5" fill="#fff0a6" />
      <circle cx="94" cy="68" r="3" fill="#ff8f8f" />
    </svg>
  );
}

/** «Прятки»: a toy hides behind one of the bushes and calls out; find it by ear. */
export function HideGame({ set, onHome }: { set: SetId; onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [toy, setToy] = useState("");
  const [count, setCount] = useState(2);
  const [spot, setSpot] = useState(0);
  const [checked, setChecked] = useState<number[]>([]);
  const [shaking, setShaking] = useState<number | null>(null);
  const [calling, setCalling] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const asked = useRef<string[]>([]);
  const lock = useRef(false);
  const solvedRef = useRef(false);
  const where = useRef({ toy: "", spot: 0, count: 2 });
  const paused = usePaused();
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const call = useCallback(() => {
    const { toy: id, spot: s, count: c } = where.current;
    if (!id) return;
    setCalling(true);
    void prepareClips([callSrc(id)]).then(() => playClip(callSrc(id), true, panFor(s, c)));
    later(() => setCalling(false), Math.min(clipMs(callSrc(id)) || 1500, 2400));
  }, [later]);

  const startRound = useCallback(
    (index: number, firstCallAt = 700) => {
      const ids = pool(set);
      const fresh = ids.filter((id) => !asked.current.includes(id));
      const id = pickWeighted(fresh.length ? fresh : ids);
      asked.current = fresh.length ? [...asked.current, id] : [id];
      const bushes = BUSHES[getProgress().level][index];
      const at = Math.floor(Math.random() * bushes);
      where.current = { toy: id, spot: at, count: bushes };
      setRound(index);
      setToy(id);
      setCount(bushes);
      setSpot(at);
      setChecked([]);
      setSolved(false);
      lock.current = false;
      solvedRef.current = false;
      void prepareClips([callSrc(id), ...answerSrcs(id)]).then(() => later(call, firstCallAt));
    },
    [call, later, set],
  );

  const begin = useCallback(() => {
    clearTimers();
    stopClip();
    asked.current = [];
    setFound([]);
    setDone(false);
    void prepareClips([HIDE.intro, HIDE.empty, HIDE.found, VOICE.bravo]).then(() => {
      playClip(HIDE.intro);
      // the first call waits for «Кто-то спрятался! Послушай и найди!» to finish
      startRound(0, (clipMs(HIDE.intro) || 2200) + 400);
    });
  }, [clearTimers, startRound]);

  useEffect(() => {
    begin();
    return () => stopClip();
  }, [begin]);

  // quiet for a while: the toy calls again
  useEffect(() => {
    if (done || solved || !toy || paused) return;
    const t = window.setTimeout(call, CALL_AGAIN_MS);
    return () => window.clearTimeout(t);
  }, [done, solved, toy, paused, checked.length, call]);

  useOnResume(() => {
    if (!done && !solvedRef.current) later(call, 500);
  });

  function look(index: number) {
    if (done || solved || lock.current || checked.includes(index)) return;
    lock.current = true;
    if (index === spot) {
      if (!checked.length) noteHit(toy);
      solvedRef.current = true;
      setSolved(true);
      playYes();
      setFound((list) => [...list, toy]);
      const said = answerSrc(toy);
      later(() => playClip(HIDE.found), 250);
      const foundEnds = 250 + (clipMs(HIDE.found) || 700) + 100;
      later(() => playClip(said), foundEnds);
      later(
        () => playClip(callSrc(toy), true, panFor(spot, count)),
        foundEnds + (clipMs(said) || 1100) + 150,
      );
      later(
        () => {
          if (round + 1 >= ROUNDS) setDone(true);
          else startRound(round + 1);
        },
        foundEnds + (clipMs(said) || 1100) + Math.min(clipMs(callSrc(toy)) || 1500, 2400) + 700,
      );
      return;
    }
    if (!checked.length) noteMiss(toy);
    playSoft();
    setChecked((list) => [...list, index]);
    setShaking(index);
    later(() => setShaking(null), 600);
    later(() => playClip(HIDE.empty), 250);
    later(() => {
      lock.current = false;
      call();
    }, 1400);
  }

  if (done)
    return <Finale set={set} found={found} title="Ты нашёл:" onHome={onHome} onAgain={begin} />;

  // after two empty bushes the toy peeks out a little
  const peek = !solved && checked.length >= 2;

  return (
    <main className="room play hide">
      <TopBar onHome={onHome}>
        <Stars count={found.length} total={ROUNDS} />
      </TopBar>

      <div className="hide-ask">
        <button
          type="button"
          className={calling ? "sound-btn hide-ear is-live" : "sound-btn hide-ear"}
          onClick={() => {
            if (!lock.current) call();
          }}
          aria-label="Послушать ещё раз"
        >
          <span className="sound-disc">
            <SpeakerIcon />
          </span>
        </button>
        <p className="hint-line">Кто спрятался? Найди по голосу!</p>
      </div>

      <div className="bushes" data-count={count} key={round}>
        {Array.from({ length: count }, (_, i) => {
          const here = i === spot;
          const empty = checked.includes(i);
          return (
            <button
              key={i}
              type="button"
              className={`hide-spot${shaking === i ? " is-shaking" : ""}${empty ? " is-empty" : ""}${
                here && solved ? " is-found" : ""
              }${here && peek ? " is-peek" : ""}${here && calling && !solved ? " is-rustle" : ""}`}
              style={{ animationDelay: `${i * 0.08}s` }}
              onClick={() => look(i)}
              aria-label={here && solved ? BY_ID[toy].name : `Куст ${i + 1}`}
              aria-disabled={solved || empty}
            >
              {here && (
                <span className="hider">
                  <img src={cardSrc(toy)} alt="" draggable={false} />
                  {solved && <Notes />}
                </span>
              )}
              <Bush shade={i} />
              {empty && <span className="hide-none">пусто</span>}
              {here && solved && (
                <>
                  <span className="plate hide-plate">{BY_ID[toy].name}</span>
                  <Sparks />
                </>
              )}
            </button>
          );
        })}
      </div>
      <Backdrop set={set} />
    </main>
  );
}
