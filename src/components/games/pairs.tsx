import { useCallback, useEffect, useState } from "react";
import { clipMs, playClip, playSoft, playYes, prepareClips, stopClip } from "@/lib/who-said/audio";
import {
  BY_ID,
  callSrc,
  idsFor,
  matAt,
  nameSrc,
  praiseSrc,
  type SetId,
} from "@/lib/who-said/content";
import { CardFace, Finale, Hills, TopBar } from "../kit";
import { shuffle, useQuiet, useTimers } from "@/lib/who-said/game-utils";

/** Pairs per level: each win makes the next board a little bigger. */
const LEVELS = [3, 4, 6];

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
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const deal = useCallback(
    (lvl: number) => {
      clearTimers();
      stopClip();
      const all = idsFor(set);
      // toys with their own call first: they make the best pairs to find by ear
      const voiced = shuffle(all.filter((id) => BY_ID[id].sound));
      const silent = shuffle(all.filter((id) => !BY_ID[id].sound));
      const picked = [...voiced, ...silent].slice(0, LEVELS[lvl]);
      const deck = shuffle([...picked, ...picked]).map((id, key) => ({ key, id }));
      void prepareClips(picked.flatMap((id) => [voiceOf(id), nameSrc(id)]));
      setLevel(lvl);
      setTiles(deck);
      setOpen([]);
      setMatched([]);
      setShake([]);
      setDone(false);
    },
    [clearTimers, set],
  );

  useEffect(() => {
    deal(0);
    return () => stopClip();
  }, [deal]);

  function turn(tile: Tile) {
    if (done || open.length >= 2 || open.includes(tile.key) || matched.includes(tile.id)) return;
    const next = [...open, tile.key];
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
        setOpen([]);
        if (now.length === LEVELS[level]) {
          later(() => {
            const praise = praiseSrc();
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
        setOpen([]);
      }, wait + 700);
    }
  }

  if (done)
    return (
      <Finale
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
      <Hills />
    </main>
  );
}
