import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  clipMs,
  playClip,
  playTap,
  prepareClips,
  prefetchClips,
  setVolumes,
  startMusic,
  stopClip,
  stopMusic,
  unlockAudio,
} from "@/lib/who-said/audio";
import {
  BY_ID,
  FACTS,
  babyCard,
  ITEMS,
  MIX,
  MODES,
  cardSrc,
  callSrc,
  clipsFor,
  factSrc,
  guestSrc,
  idsFor,
  nameSrc,
  stickerSrc,
  type Mode,
  type SetId,
} from "@/lib/who-said/content";
import { asset } from "@/lib/who-said/assets";

const REST_LINE = asset("/voice/rest.mp3");
import {
  LEVELS,
  addBonusMinutes,
  addPlayTime,
  guestOfDay,
  timeIsUp,
  helloLine,
  isSetComplete,
  meetGuest,
  setToCelebrate,
  useProgress,
} from "@/lib/who-said/progress";
import { startOffline } from "@/lib/who-said/offline";
import { Album } from "./album";
import { LevelIcon, ParentSheet } from "./parents";
import { BabiesGame } from "./games/babies";
import { HideGame } from "./games/hide";
import { HomesGame } from "./games/homes";
import { ListenGame } from "./games/listen";
import { PairsGame } from "./games/pairs";
import { QuizGame } from "./games/quiz";
import { ReverseGame } from "./games/reverse";
import {
  BackIcon,
  Backdrop,
  Hills,
  Logo,
  MusicIcon,
  Notes,
  PlayIcon,
  SetParty,
  ShuffleIcon,
} from "./kit";
import { QuietContext, setPaused, warmImages } from "@/lib/who-said/game-utils";

type GameId = "quiz" | "listen" | "reverse" | "pairs" | "homes" | "babies" | "hide";

const GAMES: {
  id: GameId;
  title: string;
  note: string;
  /** toy ids for the tile picture, or ready image URLs in `art` */
  pics: string[];
  art?: string[];
  mat: string;
  needsSet: boolean;
}[] = [
  {
    id: "quiz",
    title: "Кто сказал?",
    note: "Послушай и найди",
    pics: ["cow", "dog", "duck"],
    mat: "#bfe3a5",
    needsSet: true,
  },
  {
    id: "listen",
    title: "Послушать",
    note: "Нажми на зверя",
    pics: ["hamster", "rabbit"],
    mat: "#f7c9dc",
    needsSet: true,
  },
  {
    id: "reverse",
    title: "Чей голос?",
    note: "Найди колокольчик",
    pics: ["zebra"],
    mat: "#fff0a6",
    needsSet: true,
  },
  {
    id: "pairs",
    title: "Найди пару",
    note: "Открывай карточки",
    pics: ["fox", "fox"],
    mat: "#d8cdf5",
    needsSet: true,
  },
  {
    id: "homes",
    title: "Кто где живёт",
    note: "Отведи домой",
    pics: ["dolphin", "squirrel"],
    mat: "#bfe0f5",
    needsSet: false,
  },
  {
    id: "hide",
    title: "Прятки",
    note: "Найди по голосу",
    pics: ["fox"],
    mat: "#bfe3a5",
    needsSet: true,
  },
  {
    id: "babies",
    title: "Мама и малыш",
    note: "Найди малыша",
    pics: [],
    art: [cardSrc("cow"), babyCard("cow")],
    mat: "#ffd9a8",
    needsSet: false,
  },
];

const SET_MATS = ["#bfe3a5", "#f7c9dc", "#ffd9a8", "#fff0a6", "#bfe0f5", "#d8cdf5"];
const MUSIC_KEY = "kto-skazal:music";

function readMusicPref() {
  try {
    return window.localStorage.getItem(MUSIC_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * «Гость дня»: one toy visits the shelf each day. Tapping it plays its voice and a fact;
 * the first tap leaves its sticker in the album (and may complete a set).
 */
function GuestOfDay({ onParty }: { onParty: (mode: Mode) => void }) {
  const [guest, setGuest] = useState<{ id: string; met: boolean } | null>(null);
  const [talking, setTalking] = useState(false);
  const [gift, setGift] = useState(false);
  const timers = useRef<number[]>([]);

  const off = useProgress().settings.off;
  useEffect(() => {
    // re-checked when a grown-up switches sets off, so the guest never comes from a hidden set
    setGuest(guestOfDay());
  }, [off]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  if (!guest) return null;
  const id = guest.id;

  async function tap() {
    unlockAudio();
    const voice = BY_ID[id].sound ? callSrc(id) : nameSrc(id);
    await prepareClips([voice, nameSrc(id), factSrc(id)]);
    setTalking(true);
    playClip(voice, true);
    const first = Math.min(clipMs(voice) || 1200, 2400) + 200;
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    if (BY_ID[id].sound) later(() => playClip(nameSrc(id)), first);
    const factAt = BY_ID[id].sound ? first + (clipMs(nameSrc(id)) || 1000) + 150 : first;
    later(() => playClip(factSrc(id)), factAt);
    later(() => setTalking(false), factAt + (clipMs(factSrc(id)) || 1800));
    if (!guest?.met) {
      const isNew = meetGuest();
      setGuest({ id, met: true });
      if (isNew) {
        setGift(true);
        later(() => setGift(false), 2600);
        const complete = setToCelebrate(id);
        if (complete) later(() => onParty(complete), factAt + (clipMs(factSrc(id)) || 1800) + 400);
      }
    }
  }

  return (
    <button
      type="button"
      className={`guest${talking ? " is-talking" : ""}${guest.met ? "" : " is-new"}`}
      onClick={() => void tap()}
      aria-label={`Гость дня: ${BY_ID[id].name}. ${FACTS[id] ?? ""}`}
    >
      <span className="guest-tag">{guest.met ? "Гость дня" : "Привет!"}</span>
      <img src={cardSrc(id)} alt="" draggable={false} />
      {talking && <Notes />}
      {gift && <span className="guest-gift">+ наклейка!</span>}
    </button>
  );
}

/** «Пора отдохнуть!»: today's time is up; the toys fall asleep until tomorrow. */
function RestScreen({ onMore }: { onMore: () => void }) {
  const said = useRef(false);
  useEffect(() => {
    stopMusic();
    const speak = () => {
      if (said.current) return;
      said.current = true;
      unlockAudio();
      void prepareClips([REST_LINE]).then(() => playClip(REST_LINE));
    };
    speak();
    window.addEventListener("pointerdown", speak, { once: true });
    return () => window.removeEventListener("pointerdown", speak);
  }, []);
  return (
    <main className="room hello rest">
      <div className="rest-moon" aria-hidden="true" />
      <h1 className="praise rest-title">Пора отдохнуть!</h1>
      <p className="rest-note">Зверята ложатся спать. Поиграем завтра!</p>
      <div className="rest-toys" aria-hidden="true">
        {["cat", "bear", "owl", "hamster"].map((id) => (
          <span key={id} className="rest-toy">
            <img src={cardSrc(id)} alt="" />
            <i>z</i>
          </span>
        ))}
      </div>
      <HoldButton
        className="rest-more"
        label="Для взрослых: удерживайте, чтобы добавить 10 минут"
        onHold={onMore}
      >
        Для взрослых: ещё 10 минут
      </HoldButton>
      <Hills />
    </main>
  );
}

const HOLD_MS = 2500;

/**
 * Opens only after a 2.5 s press, so a child tapping around can't change the settings.
 * The ring fills while held; a short tap shows how to open it.
 */
function HoldButton({
  className,
  label,
  onHold,
  children,
}: {
  className: string;
  label: string;
  onHold: () => void;
  children: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const timer = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);

  function stop(showHint: boolean) {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
      if (showHint) {
        setHint(true);
        if (hintTimer.current) window.clearTimeout(hintTimer.current);
        hintTimer.current = window.setTimeout(() => setHint(false), 2200);
      }
    }
    setHolding(false);
  }

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    },
    [],
  );

  return (
    <span className="hold-wrap">
      <button
        type="button"
        className={`${className} hold-btn${holding ? " is-holding" : ""}`}
        style={{ ["--hold" as string]: `${HOLD_MS}ms` }}
        aria-label={label}
        onPointerDown={() => {
          setHint(false);
          setHolding(true);
          timer.current = window.setTimeout(() => {
            timer.current = null;
            setHolding(false);
            onHold();
          }, HOLD_MS);
        }}
        onPointerUp={() => stop(true)}
        onPointerLeave={() => stop(false)}
        onPointerCancel={() => stop(false)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          // keyboard users (grown-ups) open it with Enter
          if (e.key === "Enter") onHold();
        }}
      >
        <span className="hold-fill" aria-hidden="true" />
        {children}
      </button>
      {hint && <span className="hold-hint">Для взрослых: подержите кнопку</span>}
    </span>
  );
}

type Screen =
  | { at: "menu" }
  | { at: "album" }
  | { at: "sets"; game: GameId }
  | { at: "play"; game: GameId; set: SetId; run: number };

/** Up to three stars: how many times the set was played to the end. */
function SetStars({ plays }: { plays: number }) {
  return (
    <span className="set-stars" aria-label={`Пройдено ${plays} раз`}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < plays ? "is-on" : ""} />
      ))}
    </span>
  );
}

export function WhoSaidGame() {
  const [screen, setScreen] = useState<Screen>({ at: "menu" });
  const [set, setSet] = useState<SetId>("farm");
  const [musicOn, setMusicOn] = useState(true);
  const [quiet, setQuiet] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [party, setParty] = useState<Mode | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // ---- Android «Назад»: every screen is one step in the browser history ----
  // menu = 0, sets / album / «Кто где живёт» = 1, a game picked through sets = 2; the settings sheet adds a step too.
  const depthOf = (s: Screen) =>
    s.at === "menu" ? 0 : s.at === "play" && GAMES.find((g) => g.id === s.game)?.needsSet ? 2 : 1;

  function go(next: Screen) {
    if (depthOf(next) > depthOf(screenRef.current)) {
      window.history.pushState({ ...window.history.state, kto: depthOf(next), sheet: false }, "");
    }
    setScreen(next);
  }

  useEffect(() => {
    // a reload in the middle of a game starts on the shelf
    if (window.history.state?.kto || window.history.state?.sheet) {
      window.history.replaceState({ ...window.history.state, kto: 0, sheet: false }, "");
    }
    const onPop = (e: PopStateEvent) => {
      const depth: number = e.state?.kto ?? 0;
      setLevelOpen(Boolean(e.state?.sheet));
      const now = screenRef.current;
      if (depth >= depthOf(now)) return;
      stopClip();
      setQuiet(false);
      if (depth === 1 && now.at === "play") setScreen({ at: "sets", game: now.game });
      else setScreen({ at: "menu" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function openSheet() {
    window.history.pushState({ ...window.history.state, kto: 0, sheet: true }, "");
    setLevelOpen(true);
  }

  function closeSheet() {
    if (window.history.state?.sheet) window.history.back();
    else setLevelOpen(false);
  }
  const progress = useProgress();

  // parents' volumes apply from the first sound
  useEffect(() => {
    setVolumes(progress.settings.volume);
  }, [progress.settings.volume]);

  // count play time while a game is on screen and the app is in front
  const playing = screen.at === "play";
  useEffect(() => {
    if (!playing) return;
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") addPlayTime(10);
    }, 10000);
    return () => window.clearInterval(tick);
  }, [playing]);

  // read only after mount: the server can't know today's play time, the page must hydrate as the shelf
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const resting = mounted && screen.at !== "play" && timeIsUp();

  // the chosen set was switched off by a grown-up: pick the first one still on
  useEffect(() => {
    const off = progress.settings.off;
    if (set !== "mix" && off.includes(set)) {
      setSet(MODES.find((m) => !off.includes(m.id))?.id ?? "mix");
    }
  }, [progress.settings.off, set]);

  useEffect(() => {
    setMusicOn(readMusicPref());
    startOffline();
    // No zoom: iOS Safari ignores user-scalable=no, so pinch and double-tap are stopped here.
    const stopGesture = (e: Event) => e.preventDefault();
    const stopPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    let lastTouch = 0;
    const stopDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouch < 320 && !(e.target as HTMLElement).closest("input")) e.preventDefault();
      lastTouch = now;
    };
    document.addEventListener("gesturestart", stopGesture);
    document.addEventListener("gesturechange", stopGesture);
    document.addEventListener("touchmove", stopPinch, { passive: false });
    document.addEventListener("touchend", stopDoubleTap, { passive: false });
    prefetchClips(clipsFor("farm"));
    warmImages([
      ...MODES.map((item) => item.cover),
      ...GAMES.flatMap((g) => g.pics),
      ...idsFor("farm"),
    ]);
    // app hidden or screen locked: everything freezes and continues on return
    const onBack = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      document.removeEventListener("gesturestart", stopGesture);
      document.removeEventListener("gesturechange", stopGesture);
      document.removeEventListener("touchmove", stopPinch);
      document.removeEventListener("touchend", stopDoubleTap);
    };
  }, []);

  // Music plays on the menus and the finish screen, never over the riddles.
  // Browsers only allow sound after the first tap, so a tap anywhere starts it too.
  const musicNow = musicOn && (screen.at !== "play" || !quiet);
  useEffect(() => {
    if (!musicNow) {
      stopMusic();
      return;
    }
    const kick = () => startMusic();
    const delay = window.setTimeout(kick, screen.at === "play" ? 2600 : 0);
    window.addEventListener("pointerdown", kick, { once: true });
    return () => {
      window.clearTimeout(delay);
      window.removeEventListener("pointerdown", kick);
    };
  }, [musicNow, screen.at]);

  const greeted = useRef(false);
  useEffect(() => {
    if (screen.at !== "menu" || greeted.current) return;
    const hello = () => {
      greeted.current = true;
      const line = helloLine();
      const guest = guestOfDay();
      // the guest introduces itself until the child has met it today
      const guestLine = !guest.met ? guestSrc(guest.id) : "";
      if (!line && !guestLine) return;
      unlockAudio();
      void prepareClips([line, guestLine].filter(Boolean)).then(() => {
        if (line) playClip(line);
        if (guestLine) window.setTimeout(() => playClip(guestLine), line ? clipMs(line) + 250 : 0);
      });
    };
    window.addEventListener("pointerdown", hello, { once: true });
    return () => window.removeEventListener("pointerdown", hello);
  }, [screen.at]);

  const setQuietStable = useCallback((q: boolean) => setQuiet(q), []);

  function toggleMusic() {
    playTap();
    const next = !musicOn;
    setMusicOn(next);
    try {
      window.localStorage.setItem(MUSIC_KEY, next ? "on" : "off");
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }

  function play(game: GameId, chosen: SetId) {
    // time's up: the rest screen shows instead of a new game
    if (timeIsUp()) {
      playTap();
      if (screenRef.current.at === "play") goMenu();
      return;
    }
    unlockAudio();
    playTap();
    stopMusic();
    setQuiet(true);
    const prev = screenRef.current;
    go({ at: "play", game, set: chosen, run: prev.at === "play" ? prev.run + 1 : 0 });
  }

  function openGame(game: GameId) {
    unlockAudio();
    playTap();
    if (GAMES.find((g) => g.id === game)?.needsSet) go({ at: "sets", game });
    else play(game, "mix");
  }

  function pickSet(next: SetId) {
    playTap();
    setSet(next);
    prefetchClips(clipsFor(next));
    if (next !== "mix") warmImages(idsFor(next));
  }

  const goMenu = () => {
    playTap();
    stopClip();
    setQuiet(false);
    // walk the history back to the shelf, so «Назад» afterwards leaves the game as expected
    const depth: number = window.history.state?.kto ?? 0;
    if (depth > 0) window.history.go(-depth);
    else setScreen({ at: "menu" });
  };

  const musicButton = (
    <button
      type="button"
      className={musicOn ? "music-btn" : "music-btn is-off"}
      onClick={toggleMusic}
      aria-label={musicOn ? "Выключить музыку" : "Включить музыку"}
      aria-pressed={musicOn}
    >
      <MusicIcon on={musicOn} />
    </button>
  );

  if (screen.at === "play") {
    const props = { set: screen.set, onHome: goMenu };
    const key = `${screen.game}-${screen.run}`;
    return (
      <QuietContext.Provider value={setQuietStable}>
        {screen.game === "quiz" && <QuizGame key={key} {...props} />}
        {screen.game === "listen" && <ListenGame key={key} {...props} />}
        {screen.game === "reverse" && <ReverseGame key={key} {...props} />}
        {screen.game === "pairs" && <PairsGame key={key} {...props} />}
        {screen.game === "homes" && <HomesGame key={key} onHome={goMenu} />}
        {screen.game === "babies" && <BabiesGame key={key} onHome={goMenu} />}
        {screen.game === "hide" && <HideGame key={key} {...props} />}
      </QuietContext.Provider>
    );
  }

  if (resting)
    return (
      <QuietContext.Provider value={setQuietStable}>
        <RestScreen onMore={() => addBonusMinutes(10)} />
      </QuietContext.Provider>
    );

  if (screen.at === "album") return <Album onBack={goMenu} />;

  if (screen.at === "sets") {
    const game = GAMES.find((g) => g.id === screen.game)!;
    const parade =
      set === "mix" ? MIX.parade : (MODES.find((item) => item.id === set)?.parade ?? []);
    return (
      <main className="room hello sets-screen">
        {musicButton}
        <header className="sets-head">
          <button
            type="button"
            className="round-btn is-white is-small"
            onClick={goMenu}
            aria-label="Назад"
          >
            <BackIcon />
          </button>
          <h1 className="sets-title">{game.title}</h1>
        </header>

        <div className="sets" role="radiogroup" aria-label="Кого берём">
          {MODES.filter((item) => !progress.settings.off.includes(item.id)).map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={set === item.id}
              className={`set${set === item.id ? " is-on" : ""}${isSetComplete(item.id, progress.stickers) ? " is-gold" : ""}`}
              style={{ ["--mat" as string]: SET_MATS[index] }}
              onClick={() => pickSet(item.id)}
            >
              <span className="set-pic">
                <img src={cardSrc(item.cover)} alt="" />
              </span>
              <span className="set-name">{item.label}</span>
              <SetStars plays={progress.plays[item.id] ?? 0} />
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={set === "mix"}
            className={set === "mix" ? "set mix is-on" : "set mix"}
            onClick={() => pickSet("mix")}
          >
            <span className="mix-pics">
              {MIX.covers.map((id) => (
                <img key={id} src={cardSrc(id)} alt="" />
              ))}
            </span>
            <span className="set-name">
              <ShuffleIcon />
              {MIX.label}
            </span>
            <SetStars plays={progress.plays.mix ?? 0} />
          </button>
        </div>

        <button
          type="button"
          className="play-btn"
          onClick={() => play(screen.game, set)}
          aria-label="Играть"
        >
          <span className="play-disc">
            <PlayIcon />
          </span>
          <span className="play-word">Играть</span>
        </button>

        <div className="parade" aria-hidden="true">
          {parade.map((id) => (
            <img key={id} src={cardSrc(id)} alt="" />
          ))}
        </div>
        <Backdrop set={set} />
      </main>
    );
  }

  return (
    <main className="room hello menu">
      <HoldButton
        className="level-chip"
        label={`Настройки для взрослых: удерживайте. Сложность: ${LEVELS.find((l) => l.id === progress.level)?.label}`}
        onHold={() => {
          playTap();
          openSheet();
        }}
      >
        <LevelIcon level={progress.level} />
        {LEVELS.find((l) => l.id === progress.level)?.label}
      </HoldButton>
      {musicButton}
      <Logo />
      <nav className="games" aria-label="Игры">
        {GAMES.map((game, index) => (
          <button
            key={game.id}
            type="button"
            className={`game-tile is-${game.id}`}
            style={{ ["--mat" as string]: game.mat, animationDelay: `${index * 0.06}s` }}
            onClick={() => openGame(game.id)}
          >
            <span className="game-art" aria-hidden="true">
              {(game.art ?? game.pics.map(cardSrc)).map((src, i) => (
                <img key={`${src}-${i}`} src={src} alt="" />
              ))}
              <span className="game-badge" />
            </span>
            <span className="game-text">
              <span className="game-title">{game.title}</span>
              <span className="game-note">{game.note}</span>
            </span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="album-btn"
        onClick={() => {
          playTap();
          go({ at: "album" });
        }}
      >
        <span className="album-stack" aria-hidden="true">
          {(progress.stickers.length ? progress.stickers.slice(-3) : ["cat", "fox", "dolphin"]).map(
            (id, i) => (
              <img
                key={`${id}-${i}`}
                src={progress.stickers.length ? stickerSrc(id) : cardSrc(id)}
                alt=""
                className={progress.stickers.length ? "" : "is-ghost"}
              />
            ),
          )}
        </span>
        <span className="album-label">Мои наклейки</span>
        <span className="album-count">
          {progress.stickers.length} из {ITEMS.length}
        </span>
      </button>
      {levelOpen && <ParentSheet onClose={closeSheet} />}
      <GuestOfDay onParty={setParty} />
      {party && <SetParty mode={party} onClose={() => setParty(null)} />}
      <Hills />
      <p className="credits">Звуки: BBC, xeno-canto · Голос: Silero · Музыка: K. MacLeod</p>
    </main>
  );
}
