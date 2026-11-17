import { useCallback, useEffect, useState } from "react";
import {
  playTap,
  prefetchClips,
  resumeAudio,
  startMusic,
  stopClip,
  stopMusic,
  unlockAudio,
} from "@/lib/who-said/audio";
import { ITEMS, MIX, MODES, cardSrc, clipsFor, idsFor, type SetId } from "@/lib/who-said/content";
import { LEVELS, setLevel, useProgress, type Level } from "@/lib/who-said/progress";
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
  const progress = useProgress();

  useEffect(() => {
    setMusicOn(readMusicPref());
    prefetchClips(clipsFor("farm"));
    warmImages([
      ...MODES.map((item) => item.cover),
      ...GAMES.flatMap((g) => g.pics),
      ...idsFor("farm"),
    ]);
    const onBack = () => resumeAudio();
    document.addEventListener("visibilitychange", onBack);
    return () => document.removeEventListener("visibilitychange", onBack);
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
    setScreen((prev) => ({
      at: "play",
      game,
      set: chosen,
      run: prev.at === "play" ? prev.run + 1 : 0,
    }));
  }

  function openGame(game: GameId) {
    unlockAudio();
    playTap();
    if (GAMES.find((g) => g.id === game)?.needsSet) setScreen({ at: "sets", game });
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
    setScreen({ at: "menu" });
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
      <button
        type="button"
        className="level-chip"
        onClick={() => {
          playTap();
          setLevelOpen(true);
        }}
        aria-label={`Сложность: ${LEVELS.find((l) => l.id === progress.level)?.label}`}
      >
        <LevelIcon level={progress.level} />
        {LEVELS.find((l) => l.id === progress.level)?.label}
      </button>
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
          setScreen({ at: "album" });
        }}
      >
        <span className="album-stack" aria-hidden="true">
          {(progress.stickers.length ? progress.stickers.slice(-3) : ["cat", "fox", "dolphin"]).map(
            (id, i) => (
              <img
                key={`${id}-${i}`}
                src={cardSrc(id)}
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
        <div className="sheet-backdrop" onClick={() => setLevelOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Сложность"
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
                  setLevelOpen(false);
                }}
              >
                <LevelIcon level={level.id} />
                <span className="level-text">
                  <span className="level-name">{level.label}</span>
                  <span className="level-note">{level.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Hills />
      <p className="credits">Звуки: BBC, xeno-canto · Голос: Silero · Музыка: K. MacLeod</p>
    </main>
  );
}
