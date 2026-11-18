import { useCallback, useEffect, useRef, useState } from "react";
import { clipMs, playClip, playSoft, playYes, prepareClips, stopClip } from "@/lib/who-said/audio";
import { BY_ID, callSrc, matAt, nameSrc, type SetId } from "@/lib/who-said/content";
import { activeIdsFor, getProgress, praiseLine, type Level } from "@/lib/who-said/progress";
import { CardFace, Finale, Backdrop, TopBar } from "../kit";
import { shuffle, useQuiet, useTimers } from "@/lib/who-said/game-utils";

/** Pairs per board: each win makes the next board a little bigger. The age level picks where to start. */
const LEVELS = [2, 3, 4, 6];
const START: Record<Level, number> = { baby: 0, middle: 1, pro: 2 };

type Tile = { key: number; id: string };

/** The sound a tile makes when it is turned: its own call, or the voice naming it. */
function voiceOf(id: string) {
  return BY_ID[id].sound ? callSrc(id) : nameSrc(id);
}

/** «Найди пару»: memory game; every turned card speaks, so pairs can be found by ear too. */
export function PairsGame({ set, onHome }: { set: SetId; onHome: () => void }) {
  const [level, setLevel] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [shake, setShake] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const openRef = useRef<number[]>([]);
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const deal = useCallback(
    (lvl: number) => {
      clearTimers();
      stopClip();
      const all = activeIdsFor(set);
      // toys with their own call first: they make the best pairs to find by ear
      const voiced = shuffle(all.filter((id) => BY_ID[id].sound));
      const silent = shuffle(all.filter((id) => !BY_ID[id].sound));
      const picked = [...voiced, ...silent].slice(0, LEVELS[lvl]);
      const deck = shuffle([...picked, ...picked]).map((id, key) => ({ key, id }));
      void prepareClips(picked.flatMap((id) => [voiceOf(id), nameSrc(id)]));
      setLevel(lvl);
      setTiles(deck);
      {
        openRef.current = [];
        setOpen([]);
      }
      setMatched([]);
      setShake([]);
      setDone(false);
    },
    [clearTimers, set],
  );

  useEffect(() => {
    deal(START[getProgress().level]);
    return () => stopClip();
  }, [deal]);

  function turn(tile: Tile) {
    // openRef is updated at once, so three fast taps can't turn three cards
    const now = openRef.current;
    if (done || now.length >= 2 || now.includes(tile.key) || matched.includes(tile.id)) return;
    const next = [...now, tile.key];
    openRef.current = next;
    setOpen(next);
    void prepareClips([voiceOf(tile.id)]).then(() => playClip(voiceOf(tile.id), true));
    if (next.length < 2) return;

    const first = tiles.find((t) => t.key === next[0]);
    if (!first) return;
    const wait = Math.min(clipMs(voiceOf(tile.id)) || 1200, 2200);
    if (first.id === tile.id) {
      later(() => {
        playYes();
        playClip(nameSrc(tile.id));
        const now = [...matched, tile.id];
        setMatched(now);
        {
          openRef.current = [];
          setOpen([]);
        }
        if (now.length === LEVELS[level]) {
          later(() => {
            const praise = praiseLine();
            void prepareClips([praise]).then(() => playClip(praise));
          }, 1200);
          later(() => setDone(true), 2600);
        }
      }, wait);
    } else {
      later(() => {
        playSoft();
        setShake(next);
      }, wait);
      later(() => {
        setShake([]);
        {
          openRef.current = [];
          setOpen([]);
        }
      }, wait + 700);
    }
  }

  if (done)
    return (
      <Finale
        set={set}
        found={matched}
        title="Ты нашёл пары:"
        onHome={onHome}
        onAgain={() => deal(Math.min(level + 1, LEVELS.length - 1))}
      />
    );

  return (
    <main className="room play pairs">
      <TopBar onHome={onHome}>
        <p className="screen-title">Найди пару</p>
      </TopBar>
      <div className="pairs-grid" data-count={tiles.length}>
        {tiles.map((tile, index) => {
          const isOpen = open.includes(tile.key) || matched.includes(tile.id);
          const isMatched = matched.includes(tile.id);
          return (
            <button
              key={`${level}-${tile.key}`}
              type="button"
              className={`flip${isOpen ? " is-open" : ""}${isMatched ? " is-matched" : ""}${shake.includes(tile.key) ? " is-wobble" : ""}`}
              style={{
                animationDelay: `${index * 0.04}s`,
                ["--mat" as string]: matAt(index % 6, 0),
              }}
              onClick={() => turn(tile)}
              aria-label={isOpen ? BY_ID[tile.id].name : `Карточка ${index + 1}`}
            >
              <span className="flip-inner">
                <span className="flip-back" aria-hidden="true" />
                <span className="flip-front">
                  <CardFace id={tile.id} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Backdrop set={set} />
    </main>
  );
}
