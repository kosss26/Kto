import { useCallback, useEffect, useRef, useState } from "react";
import { clipMs, playClip, playSoft, playYes, prepareClips, stopClip } from "@/lib/who-said/audio";
import {
  BABIES,
  LOOKALIKE_BABIES,
  BY_ID,
  VOICE,
  WHOSE_BABY,
  answerSrc,
  answerSrcs,
  babyCard,
  babyThisSrc,
  babyWhereSrc,
  cardSrc,
  matAt,
  similarTo,
} from "@/lib/who-said/content";
import { useOnResume, usePaused, useQuiet, useTimers, shuffle } from "@/lib/who-said/game-utils";
import { activeIdsFor, getProgress, type Level } from "@/lib/who-said/progress";
import { CheckIcon, Finale, Hills, Notes, Sparks, Stars, TopBar } from "../kit";

const ROUNDS = 8;
const COUNTS: Record<Level, number[]> = {
  baby: [2, 2, 2, 2, 2, 2, 2, 2],
  middle: [2, 2, 3, 3, 3, 3, 4, 4],
  pro: [3, 3, 4, 4, 4, 4, 4, 4],
};

/** Round kinds: the mum is shown and the baby is asked for, or the other way round. */
type Kind = "find-baby" | "find-mum";

type Round = { kind: Kind; target: string; choices: string[] };

/** Mums whose baby is drawn, minus the sets switched off by a grown-up. */
function pool() {
  const active = new Set(activeIdsFor("mix"));
  const all = Object.keys(BABIES).filter((id) => !LOOKALIKE_BABIES.has(id));
  const ids = all.filter((id) => active.has(id));
  return ids.length >= 4 ? ids : all;
}

/** «Мама и малыш»: find the baby of the shown mum, or the mum of the shown baby. */
export function BabiesGame({ onHome }: { onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [asleep, setAsleep] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const asked = useRef<string[]>([]);
  const tapLock = useRef(false);
  const solvedRef = useRef(false);
  const paused = usePaused();
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const question = (r: Round) => (r.kind === "find-baby" ? babyWhereSrc(r.target) : WHOSE_BABY);

  const startRound = useCallback((i: number) => {
    const ids = pool();
    const fresh = ids.filter((id) => !asked.current.includes(id));
    const from = fresh.length ? fresh : ids;
    const target = from[Math.floor(Math.random() * from.length)];
    asked.current = fresh.length ? [...asked.current, target] : [target];
    const level = getProgress().level;
    const rest = ids.filter((id) => id !== target);
    const alike = level === "pro" ? shuffle(similarTo(target, rest)).slice(0, 2) : [];
    const others = [...alike, ...shuffle(rest.filter((id) => !alike.includes(id)))].slice(
      0,
      COUNTS[level][i] - 1,
    );
    const next: Round = {
      kind: i % 2 === 0 ? "find-baby" : "find-mum",
      target,
      choices: shuffle([target, ...others]),
    };
    setIndex(i);
    setRound(next);
    setAsleep([]);
    setSolved(false);
    tapLock.current = false;
    solvedRef.current = false;
    const clips = [question(next), babyThisSrc(target), ...answerSrcs(target)];
    void prepareClips(clips).then(() => playClip(question(next)));
  }, []);

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

  // quiet for a while: ask again
  useEffect(() => {
    if (!round || solved || done || paused) return;
    const t = window.setTimeout(() => playClip(question(round)), 8000);
    return () => window.clearTimeout(t);
  }, [round, solved, done, paused, asleep.length]);

  useOnResume(() => {
    if (round && !done && !solvedRef.current) later(() => playClip(question(round)), 500);
  });

  function choose(id: string) {
    if (!round || done || solved || tapLock.current || asleep.includes(id)) return;
    tapLock.current = true;
    if (id === round.target) {
      solvedRef.current = true;
      setSolved(true);
      playYes();
      // «Это слонёнок!» when a baby was found, «Да, это слон!» when the mum was
      const said = round.kind === "find-baby" ? babyThisSrc(id) : answerSrc(id);
      later(() => playClip(said), 300);
      setFound((list) => [...list, id]);
      later(
        () => {
          if (index + 1 >= ROUNDS) setDone(true);
          else startRound(index + 1);
        },
        Math.max(1900, 300 + (clipMs(said) || 1200) + 700),
      );
      return;
    }
    later(() => (tapLock.current = false), 350);
    playSoft();
    setAsleep((list) => [...list, id]);
    later(() => playClip(VOICE.again), 300);
    later(() => playClip(question(round)), 1500);
  }

  if (done)
    return (
      <Finale set="mix" found={found} title="Мамы нашли малышей:" onHome={onHome} onAgain={begin} />
    );
  if (!round) return null;

  const findBaby = round.kind === "find-baby";
  const heroSrc = findBaby ? cardSrc(round.target) : babyCard(round.target);
  const pic = (id: string) => (findBaby ? babyCard(id) : cardSrc(id));
  const hint = !solved && asleep.length >= 2;

  return (
    <main className="room play babies">
      <TopBar onHome={onHome}>
        <Stars count={found.length} total={ROUNDS} />
      </TopBar>

      <button
        type="button"
        className={`card hero${findBaby ? " is-mum" : " is-baby"}`}
        key={`hero-${index}`}
        onClick={() => playClip(question(round))}
        aria-label={`${findBaby ? BY_ID[round.target].name : BABIES[round.target]}. Повторить вопрос`}
        style={{ ["--mat" as string]: findBaby ? "#ffd9a8" : "#f7c9dc" }}
      >
        <span className="card-face">
          <img src={heroSrc} alt="" draggable={false} />
        </span>
        <span className="hero-tag">{findBaby ? "Мама" : "Малыш"}</span>
      </button>

      <p className="hint-line">{findBaby ? "Где её малыш?" : "Где его мама?"}</p>

      <div
        className={`cards${solved ? " is-solved" : ""}`}
        data-count={round.choices.length}
        key={index}
      >
        {round.choices.map((id, i) => {
          const good = solved && id === round.target;
          const sleeping = asleep.includes(id);
          const state = good
            ? " is-good"
            : sleeping
              ? " is-asleep"
              : hint && id === round.target
                ? " is-hint"
                : "";
          return (
            <button
              key={id}
              type="button"
              className={`card${state}`}
              style={{ animationDelay: `${i * 0.07}s`, ["--mat" as string]: matAt(i, index) }}
              onClick={() => choose(id)}
              aria-label={findBaby ? BABIES[id] : BY_ID[id].name}
              aria-disabled={solved || sleeping}
            >
              <span className="card-face">
                <img src={pic(id)} alt="" draggable={false} />
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
                {findBaby ? BABIES[id] : BY_ID[id].name}
              </span>
              <Sparks />
              {good && <Notes />}
            </button>
          );
        })}
      </div>
      <Hills />
    </main>
  );
}
