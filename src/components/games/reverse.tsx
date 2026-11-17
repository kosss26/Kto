import { useCallback, useEffect, useRef, useState } from "react";
import { clipMs, playClip, playSoft, playYes, prepareClips, stopClip } from "@/lib/who-said/audio";
import {
  BY_ID,
  ITEMS,
  VOICE,
  callSrc,
  cardSrc,
  howSrc,
  praiseSrc,
  soundIdsFor,
  similarTo,
  type SetId,
} from "@/lib/who-said/content";
import { getProgress, type Level } from "@/lib/who-said/progress";
import { CardFace, CheckIcon, Finale, Hills, SpeakerIcon, Sparks, Stars, TopBar } from "../kit";
import { shuffle, useQuiet, useTimers } from "@/lib/who-said/game-utils";

const ROUNDS = 8;
/** Bells per round for each level. */
const COUNTS: Record<Level, number[]> = {
  baby: [2, 2, 2, 2, 2, 2, 2, 2],
  middle: [2, 2, 3, 3, 3, 3, 3, 3],
  pro: [3, 3, 3, 3, 3, 3, 3, 3],
};
const BELL_COLORS = ["#ffc93c", "#ff8fb1", "#7cc4f0"];

/** Toys with a real call in this set; a set with too few borrows from all of them. */
function pool(set: SetId) {
  const own = soundIdsFor(set);
  return own.length >= 4 ? own : ITEMS.filter((item) => item.sound).map((item) => item.id);
}

/** «Наоборот»: we show a toy, the child finds its voice among 2–3 bells. Every tap plays that bell. */
export function ReverseGame({ set, onHome }: { set: SetId; onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState("");
  const [bells, setBells] = useState<string[]>([]);
  const [tried, setTried] = useState<string[]>([]);
  const [live, setLive] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const asked = useRef<string[]>([]);
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const startRound = useCallback(
    (index: number) => {
      const ids = pool(set);
      const fresh = ids.filter((id) => !asked.current.includes(id));
      const choicePool = fresh.length ? fresh : ids;
      const next = choicePool[Math.floor(Math.random() * choicePool.length)];
      asked.current = fresh.length ? [...asked.current, next] : [next];
      const level = getProgress().level;
      const rest = ids.filter((id) => id !== next);
      const alike = level === "pro" ? shuffle(similarTo(next, rest)).slice(0, 2) : [];
      const others = [...alike, ...shuffle(rest.filter((id) => !alike.includes(id)))].slice(
        0,
        COUNTS[level][index] - 1,
      );
      const order = shuffle([next, ...others]);
      setRound(index);
      setTarget(next);
      setBells(order);
      setTried([]);
      setSolved(false);
      setLive(null);
      void prepareClips([howSrc(next), ...order.map(callSrc)]).then(() => playClip(howSrc(next)));
    },
    [set],
  );

  const begin = useCallback(() => {
    clearTimers();
    stopClip();
    asked.current = [];
    setFound([]);
    setDone(false);
    void prepareClips([VOICE.again, VOICE.bravo]);
    startRound(0);
  }, [clearTimers, startRound]);

  useEffect(() => {
    begin();
    return () => stopClip();
  }, [begin]);

  function ring(id: string) {
    if (solved || done) return;
    setLive(id);
    playClip(callSrc(id), true);
    const len = Math.min(clipMs(callSrc(id)) || 1500, 2600);
    if (id === target) {
      setSolved(true);
      setFound((list) => [...list, id]);
      // let the right voice play out, then cheer and move on
      later(() => {
        playYes();
        const praise = praiseSrc();
        void prepareClips([praise]).then(() => playClip(praise));
        setLive(null);
      }, len);
      later(() => {
        if (round + 1 >= ROUNDS) setDone(true);
        else startRound(round + 1);
      }, len + 1700);
      return;
    }
    later(() => {
      setLive(null);
      setTried((list) => [...list, id]);
      playSoft();
    }, len);
  }

  if (done)
    return (
      <Finale set={set} found={found} title="Ты узнал голоса:" onHome={onHome} onAgain={begin} />
    );

  return (
    <main className="room play reverse">
      <TopBar onHome={onHome}>
        <Stars count={found.length} total={ROUNDS} />
      </TopBar>

      <button
        type="button"
        className={solved ? "card hero is-good" : "card hero"}
        onClick={() => target && playClip(howSrc(target))}
        aria-label={target ? `${BY_ID[target].name}. Повторить вопрос` : "Повторить вопрос"}
        key={`hero-${round}`}
        style={{ ["--mat" as string]: "#fff0a6" }}
      >
        {target && <CardFace id={target} />}
        <span className="badge" aria-hidden="true">
          <CheckIcon />
        </span>
        <span className="plate" aria-hidden={!solved}>
          {target ? BY_ID[target].name : ""}
        </span>
        <Sparks />
      </button>

      <p className="hint-line">Чей голос? Нажимай на колокольчики</p>

      <div className="bells" data-count={bells.length} key={`bells-${round}`}>
        {bells.map((id, index) => {
          const wrong = tried.includes(id);
          const right = solved && id === target;
          return (
            <button
              key={id}
              type="button"
              className={`bell${live === id ? " is-live" : ""}${wrong ? " is-wrong" : ""}${right ? " is-right" : ""}`}
              style={{
                ["--bell" as string]: BELL_COLORS[index % BELL_COLORS.length],
                animationDelay: `${index * 0.08}s`,
              }}
              onClick={() => ring(id)}
              aria-label={`Голос ${index + 1}`}
              aria-disabled={solved}
            >
              <span className="wave w1" aria-hidden="true" />
              <span className="bell-disc">
                {/* after the round each bell shows whose voice it was */}
                {solved || wrong ? <img src={cardSrc(id)} alt={BY_ID[id].name} /> : <SpeakerIcon />}
              </span>
            </button>
          );
        })}
      </div>
      <Hills />
    </main>
  );
}
