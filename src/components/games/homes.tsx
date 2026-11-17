import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clipMs, playClip, playSoft, playYes, prepareClips, stopClip } from "@/lib/who-said/audio";
import {
  BY_ID,
  HOMES,
  HOME_IDS,
  VOICE,
  homeAskSrc,
  homeOf,
  livesSrc,
  type HomeId,
} from "@/lib/who-said/content";
import { getProgress, type Level } from "@/lib/who-said/progress";
import { CardFace, Finale, Hills, Stars, TopBar } from "../kit";
import { shuffle, useQuiet, useTimers } from "@/lib/who-said/game-utils";

const ROUNDS = 8;
/** Homes on screen per round for each level. */
const HOME_COUNTS: Record<Level, number[]> = {
  baby: [2, 2, 2, 2, 2, 2, 2, 2],
  middle: [2, 2, 2, 3, 3, 3, 3, 3],
  pro: [3, 3, 3, 4, 4, 4, 4, 4],
};

/** Little felt pictures of each home, drawn in code. */
function HomeArt({ id }: { id: HomeId }) {
  switch (id) {
    case "house":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M10 30 32 12l22 18" fill="#e96a6a" />
          <rect x="15" y="28" width="34" height="26" rx="3" fill="#fff4e0" />
          <rect x="27" y="38" width="10" height="16" rx="2" fill="#a77bea" />
          <path d="M43 33c-2-3-6-1-4 2l4 3 4-3c2-3-2-5-4-2Z" fill="#ff6b8b" />
          <path
            d="M10 30 32 12l22 18"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
            strokeDasharray="3 2.5"
          />
        </svg>
      );
    case "farm":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M8 28 32 12l24 16v26H8Z" fill="#d9483b" />
          <path d="M8 28 32 12l24 16" fill="none" stroke="#fff" strokeWidth="2.4" />
          <rect x="24" y="34" width="16" height="20" fill="#fff4e0" />
          <path d="M24 34l16 20M40 34 24 54" stroke="#d9483b" strokeWidth="2.4" />
          <circle cx="32" cy="25" r="3.5" fill="#fff4e0" />
          <path d="M9 53h46" stroke="#fff" strokeWidth="1.4" strokeDasharray="3 2.5" />
        </svg>
      );
    case "forest":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M22 8 8 34h8L6 50h32L28 34h8Z" fill="#3f9a55" />
          <path d="M44 16 33 38h6l-8 13h26l-8-13h6Z" fill="#5bb36a" />
          <rect x="19.5" y="50" width="5" height="7" rx="1" fill="#8a5a3a" />
          <rect x="41.5" y="51" width="5" height="6" rx="1" fill="#8a5a3a" />
          <path
            d="M22 13 11 33M44 21l-9 16"
            stroke="#fff"
            strokeWidth="1.3"
            strokeDasharray="3 2.5"
          />
        </svg>
      );
    case "sea":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="46" cy="18" r="8" fill="#ffc93c" />
          <path d="M4 34c6-6 10-6 15 0s10 6 15 0 10-6 15 0 10 6 11 0v26H4Z" fill="#3fa2e8" />
          <path d="M4 46c6-6 10-6 15 0s10 6 15 0 10-6 15 0 10 6 11 0v14H4Z" fill="#2b7fc4" />
          <path
            d="M4 38c6-6 10-6 15 0s10 6 15 0 10-6 15 0"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
            strokeDasharray="3 2.5"
          />
        </svg>
      );
    case "hot":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="48" cy="14" r="8" fill="#ff9d2e" />
          <path d="M4 54c10-8 46-8 56 0v6H4Z" fill="#f1c76a" />
          <path
            d="M30 54c1-12 3-24 4-30"
            stroke="#8a5a3a"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M34 24c-8-6-17-4-20 2 7-2 13-1 20-2ZM34 24c7-8 16-7 19-1-7-1-12 0-19 1ZM34 24c-2-8-8-12-14-11 6 3 10 6 14 11ZM34 24c4-7 10-9 15-7-6 1-10 3-15 7Z"
            fill="#3f9a55"
          />
        </svg>
      );
  }
}

type Fly = { x: number; y: number } | null;

/** «Кто где живёт»: drag the toy (or just tap a home) to where it lives. */
export function HomesGame({ onHome }: { onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [animal, setAnimal] = useState("");
  const [homes, setHomes] = useState<HomeId[]>([]);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [flyTo, setFlyTo] = useState<Fly>(null);
  const [wrongHome, setWrongHome] = useState<HomeId | null>(null);
  const [hover, setHover] = useState<HomeId | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const homeRefs = useRef<Partial<Record<HomeId, HTMLButtonElement | null>>>({});
  const order = useRef<string[]>([]);
  const { later, clearTimers } = useTimers();
  useQuiet(!done);

  const startRound = useCallback((index: number) => {
    const id = order.current[index];
    const own = homeOf(id) as HomeId;
    const others = shuffle(HOMES.map((h) => h.id).filter((h) => h !== own)).slice(
      0,
      HOME_COUNTS[getProgress().level][index] - 1,
    );
    // keep the homes in a fixed left-to-right order so they don't jump around between rounds
    const shown = HOMES.map((h) => h.id).filter((h) => h === own || others.includes(h));
    setRound(index);
    setAnimal(id);
    setHomes(shown);
    setFlyTo(null);
    setDrag(null);
    setWrongHome(null);
    setBusy(false);
    void prepareClips([homeAskSrc(id), livesSrc(id)]).then(() => playClip(homeAskSrc(id)));
  }, []);

  const begin = useCallback(() => {
    clearTimers();
    stopClip();
    // one toy from as many different homes as possible
    const byHome = HOMES.map((h) => shuffle(HOME_IDS.filter((id) => homeOf(id) === h.id)));
    const picked: string[] = [];
    for (let i = 0; picked.length < ROUNDS; i++) {
      const list = byHome[i % byHome.length];
      const next = list.shift();
      if (next) picked.push(next);
    }
    order.current = shuffle(picked);
    setPlaced([]);
    setDone(false);
    void prepareClips([VOICE.again, VOICE.bravo]);
    startRound(0);
  }, [clearTimers, startRound]);

  useEffect(() => {
    begin();
    return () => stopClip();
  }, [begin]);

  function homeAt(x: number, y: number): HomeId | null {
    for (const id of homes) {
      const el = homeRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }

  function drop(home: HomeId) {
    if (busy || !animal) return;
    if (homeOf(animal) === home) {
      setBusy(true);
      const target = homeRefs.current[home]?.getBoundingClientRect();
      const card = cardRef.current?.getBoundingClientRect();
      if (target && card) {
        setFlyTo({
          x: target.left + target.width / 2 - (card.left + card.width / 2) + (drag?.dx ?? 0),
          y: target.top + target.height / 2 - (card.top + card.height / 2) + (drag?.dy ?? 0),
        });
      }
      setDrag(null);
      playYes();
      later(() => playClip(livesSrc(animal)), 350);
      setPlaced((list) => [...list, animal]);
      const wait = 350 + (clipMs(livesSrc(animal)) || 1600) + 500;
      later(() => {
        if (round + 1 >= ROUNDS) setDone(true);
        else startRound(round + 1);
      }, wait);
      return;
    }
    playSoft();
    setDrag(null);
    setWrongHome(home);
    later(() => setWrongHome(null), 600);
    later(() => playClip(VOICE.again), 250);
  }

  function onDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (busy) return;
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!drag && Math.hypot(dx, dy) < 8) return;
    setDrag({ dx, dy });
    setHover(homeAt(e.clientX, e.clientY));
  }

  function onUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    start.current = null;
    setHover(null);
    if (!drag) {
      // a plain tap on the toy repeats the question
      playClip(homeAskSrc(animal));
      return;
    }
    const home = homeAt(e.clientX, e.clientY);
    if (home) drop(home);
    else setDrag(null);
  }

  if (done)
    return <Finale set="mix" found={placed} title="Все дома:" onHome={onHome} onAgain={begin} />;

  const transform = flyTo
    ? `translate(${flyTo.x}px, ${flyTo.y}px) scale(0.25)`
    : drag
      ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.06) rotate(${Math.max(-8, Math.min(8, drag.dx / 20))}deg)`
      : undefined;

  return (
    <main className="room play homes">
      <TopBar onHome={onHome}>
        <Stars count={placed.length} total={ROUNDS} />
      </TopBar>

      <p className="hint-line">Где живёт? Перетащи в домик</p>

      <div className="homes-stage">
        {animal && (
          <button
            key={`animal-${round}`}
            ref={cardRef}
            type="button"
            className={`card hero drag${drag ? " is-dragging" : ""}${flyTo ? " is-flying" : ""}`}
            style={{ transform, ["--mat" as string]: "#fff0a6" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => {
              start.current = null;
              setDrag(null);
              setHover(null);
            }}
            aria-label={`${BY_ID[animal].name}. Повторить вопрос`}
          >
            <CardFace id={animal} />
          </button>
        )}
      </div>

      <div className="home-row" data-count={homes.length} key={`homes-${round}`}>
        {homes.map((id, index) => {
          const meta = HOMES.find((h) => h.id === id)!;
          return (
            <button
              key={id}
              ref={(el) => {
                homeRefs.current[id] = el;
              }}
              type="button"
              className={`home${hover === id ? " is-hover" : ""}${wrongHome === id ? " is-wobble" : ""}`}
              style={{ ["--mat" as string]: meta.mat, animationDelay: `${index * 0.07}s` }}
              onClick={() => drop(id)}
              aria-label={meta.label}
            >
              <span className="home-art">
                <HomeArt id={id} />
              </span>
              <span className="home-name">{meta.label}</span>
            </button>
          );
        })}
      </div>
      <Hills />
    </main>
  );
}
