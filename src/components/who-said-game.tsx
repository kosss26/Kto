import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  playClip,
  playTap,
  prepareClips,
  prefetchClips,
  resumeAudio,
  startMusic,
  stopClip,
  stopMusic,
  unlockAudio,
} from "@/lib/who-said/audio";
import {
  ITEMS,
  MIX,
  MODES,
  cardSrc,
  clipsFor,
  idsFor,
  stickerSrc,
  type SetId,
} from "@/lib/who-said/content";
import {
  LEVELS,
  helloLine,
  setChild,
  setLevel,
  useProgress,
  type Level,
} from "@/lib/who-said/progress";
import { NAMES, nameLine } from "@/lib/who-said/names";
import { startOffline, syncOffline, useOffline } from "@/lib/who-said/offline";
import { Album } from "./album";
import { HomesGame } from "./games/homes";
import { ListenGame } from "./games/listen";
import { PairsGame } from "./games/pairs";
import { QuizGame } from "./games/quiz";
import { ReverseGame } from "./games/reverse";
import { BackIcon, Hills, Logo, MusicIcon, PlayIcon, ShuffleIcon } from "./kit";
import { QuietContext, warmImages } from "@/lib/who-said/game-utils";

type GameId = "quiz" | "listen" | "reverse" | "pairs" | "homes";

const GAMES: {
  id: GameId;
  title: string;
  note: string;
  pics: string[];
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

const norm = (text: string) => text.trim().toLowerCase().replaceAll("ё", "е");

/** «Как зовут ребёнка?»: names that have recorded lines; tapping one says hello with it. */
function NamePicker() {
  const { child } = useProgress();
  const current = NAMES.find((n) => n.id === child);
  const [query, setQuery] = useState("");
  const q = norm(query);
  const matches = q ? NAMES.filter((n) => norm(n.name).startsWith(q)).slice(0, 8) : [];

  function choose(id: string) {
    playTap();
    setChild(id);
    setQuery("");
    // the new name's lines should work offline too
    void syncOffline();
    if (id) {
      const line = nameLine(id, "hi");
      void prepareClips([line]).then(() => playClip(line));
    }
  }

  return (
    <div className="name-picker">
      <p className="sheet-title">Как зовут ребёнка?</p>
      <p className="name-current">
        {current ? (
          <>
            Игра говорит: «Молодец, <b>{current.name}</b>!»
            <button type="button" className="name-clear" onClick={() => choose("")}>
              без имени
            </button>
          </>
        ) : (
          "Начните вводить имя — игра будет хвалить ребёнка по имени"
        )}
      </p>
      <input
        id="child-name"
        className="name-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Например, Маша"
        autoComplete="off"
        enterKeyHint="done"
      />
      {q && (
        <div className="name-chips">
          {matches.map((n) => (
            <button key={n.id} type="button" className="name-chip" onClick={() => choose(n.id)}>
              {n.name}
            </button>
          ))}
          {!matches.length && (
            <p className="name-missing">Такого имени пока нет в озвучке — его можно добавить.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** «Без интернета»: how far the background download has got. */
function OfflineRow() {
  const offline = useOffline();
  if (offline.stage === "off") return null;
  const pct =
    offline.stage === "ready" ? 100 : Math.round((offline.done / Math.max(1, offline.total)) * 100);
  return (
    <div className="offline-row">
      <p className="sheet-title">Без интернета</p>
      {offline.stage === "ready" ? (
        <p className="offline-note is-ready">Готово: игра работает без интернета</p>
      ) : offline.stage === "error" ? (
        <p className="offline-note">
          Скачано {pct}% — часть файлов не загрузилась.
          <button type="button" className="name-clear" onClick={() => void syncOffline()}>
            докачать
          </button>
        </p>
      ) : (
        <p className="offline-note">Скачиваю картинки и звуки… {pct}%</p>
      )}
      <span className="offline-bar" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
    </div>
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

function LevelIcon({ level }: { level: Level }) {
  const filled = level === "baby" ? 1 : level === "middle" ? 2 : 3;
  return (
    <span className="level-dots" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < filled ? "is-on" : ""} />
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
    const onBack = () => resumeAudio();
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
      const line = helloLine();
      greeted.current = true;
      if (!line) return;
      unlockAudio();
      void prepareClips([line]).then(() => playClip(line));
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
      </QuietContext.Provider>
    );
  }

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
          {MODES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={set === item.id}
              className={set === item.id ? "set is-on" : "set"}
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
        <Hills />
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
              {game.pics.map((id, i) => (
                <img key={`${id}-${i}`} src={cardSrc(id)} alt="" />
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
      {levelOpen && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="sheet-title">Сложность</p>
            {LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={progress.level === level.id ? "level-option is-on" : "level-option"}
                onClick={() => {
                  playTap();
                  setLevel(level.id);
                  closeSheet();
                }}
              >
                <LevelIcon level={level.id} />
                <span className="level-text">
                  <span className="level-name">{level.label}</span>
                  <span className="level-note">{level.note}</span>
                </span>
              </button>
            ))}
            <NamePicker />
            <OfflineRow />
          </div>
        </div>
      )}
      <Hills />
      <p className="credits">Звуки: BBC, xeno-canto · Голос: Silero · Музыка: K. MacLeod</p>
    </main>
  );
}
