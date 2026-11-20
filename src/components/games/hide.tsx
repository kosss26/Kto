import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "@/lib/who-said/assets";
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
import { useOnResume, usePaused, useQuiet, useTimers, shuffle } from "@/lib/who-said/game-utils";
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
const panFor = (spot: number, count: number) => {
  // two columns on screen; with three, the last one sits alone in the middle
  if (count === 3 && spot === 2) return 0;
  return spot % 2 === 0 ? -0.75 : 0.75;
};

/** Felt hiding places that fit each world (cut from assets/felt-sheets/hiding.png). */
const SPOTS: Record<SetId, string[]> = {
  farm: ["hay", "fence", "bush"],
  pets: ["boxes", "bush"],
  forest: ["stump", "spruce", "bush"],
  zoo: ["rock", "grass"],
  sea: ["coral", "rock"],
  city: ["boxes", "rock", "fence"],
  mix: ["bush", "hay", "fence", "stump", "spruce", "rock", "grass", "coral", "boxes"],
};

/** Different hiding places in one round where the world has enough of them. */
function pickSpots(set: SetId, count: number) {
  const kinds = shuffle(SPOTS[set]);
  return Array.from({ length: count }, (_, i) => kinds[i % kinds.length]);
}

function Spot({ kind }: { kind: string }) {
  return (
    <img className="bush-art" src={asset(`/felt/hide-${kind}.webp`)} alt="" draggable={false} />
  );
}

/** «Прятки»: a toy hides behind one of the bushes and calls out; find it by ear. */
export function HideGame({ set, onHome }: { set: SetId; onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [toy, setToy] = useState("");
  const [count, setCount] = useState(2);
  const [spot, setSpot] = useState(0);
  const [kinds, setKinds] = useState<string[]>([]);
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
      setKinds(pickSpots(set, bushes));
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
    // the hiding places show at once; on a slow network the voice catches up when it arrives
    startRound(0, 2800);
    void prepareClips([HIDE.intro, HIDE.empty, HIDE.found, VOICE.bravo]).then(() =>
      playClip(HIDE.intro),
    );
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
              aria-label={here && solved ? BY_ID[toy].name : `Укрытие ${i + 1}`}
              aria-disabled={solved || empty}
            >
              {here && (
                <span className="hider">
                  <img src={cardSrc(toy)} alt="" draggable={false} />
                  {solved && <Notes />}
                </span>
              )}
              <Spot kind={kinds[i] ?? "bush"} />
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
