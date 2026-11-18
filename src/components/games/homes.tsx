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
import { activeIdsFor, getProgress, type Level } from "@/lib/who-said/progress";
import { CardFace, Finale, Hills, Stars, TopBar } from "../kit";
import { shuffle, useQuiet, useTimers, useOnResume } from "@/lib/who-said/game-utils";
import { asset } from "@/lib/who-said/assets";

const ROUNDS = 8;
/** Homes on screen per round for each level. */
const HOME_COUNTS: Record<Level, number[]> = {
  baby: [2, 2, 2, 2, 2, 2, 2, 2],
  middle: [2, 2, 2, 3, 3, 3, 3, 3],
  pro: [3, 3, 3, 4, 4, 4, 4, 4],
};

/** Felt picture of each home (cut from assets/felt-sheets/sheet-13.png). */
function HomeArt({ id }: { id: HomeId }) {
  return <img src={asset(`/felt/home-${id}.webp`)} alt="" draggable={false} />;
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
  const busyRef = useRef(false);
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
    busyRef.current = false;
    void prepareClips([homeAskSrc(id), livesSrc(id)]).then(() => playClip(homeAskSrc(id)));
  }, []);

  const begin = useCallback(() => {
    clearTimers();
    stopClip();
    // one toy from as many different homes as possible
    // toys of the sets the parents switched off sit this game out
    const active = new Set(activeIdsFor("mix"));
    const usable = HOME_IDS.filter((id) => active.has(id));
    const ids = usable.length >= 2 ? usable : HOME_IDS;
    const byHome = HOMES.map((h) => shuffle(ids.filter((id) => homeOf(id) === h.id)));
    const picked: string[] = [];
    const rounds = Math.min(ROUNDS, ids.length);
    for (let i = 0; picked.length < rounds; i++) {
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

  useOnResume(() => {
    if (!done && !busyRef.current && animal) later(() => playClip(homeAskSrc(animal)), 500);
  });

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
    if (busy || busyRef.current || !animal) return;
    if (homeOf(animal) === home) {
      busyRef.current = true;
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
