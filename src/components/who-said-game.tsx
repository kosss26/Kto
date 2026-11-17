import { useEffect, useMemo, useState } from "react";
import { playCall, playNo, playYes, prefetchCalls, prepareCalls, resumeAudio, speakName, unlockAudio } from "@/lib/who-said/audio";

const ROUNDS = 8;
const COUNTS = [2, 2, 3, 3, 4, 4, 4, 4];

const ANIMALS = [
  { id: "cow", name: "корова" },
  { id: "hen", name: "курица" },
  { id: "dog", name: "собака" },
  { id: "frog", name: "лягушка" },
  { id: "cat", name: "кошка" },
  { id: "sheep", name: "овца" },
  { id: "horse", name: "лошадь" },
  { id: "pig", name: "свинья" },
  { id: "duck", name: "утка" },
  { id: "goat", name: "коза" },
  { id: "owl", name: "сова" },
  { id: "elephant", name: "слон" },
  { id: "bee", name: "пчела" },
  { id: "bear", name: "медведь" },
  { id: "fox", name: "лиса" },
  { id: "lion", name: "лев" },
  { id: "monkey", name: "обезьяна" },
  { id: "goose", name: "гусь" },
  { id: "wolf", name: "волк" },
  { id: "donkey", name: "осёл" },
  { id: "crow", name: "ворона" },
  { id: "parrot", name: "попугай" },
  { id: "rooster", name: "петух" },
  { id: "penguin", name: "пингвин" },
  { id: "tiger", name: "тигр" },
] as const;

const VEHICLES = [
  { id: "police", name: "полицейская машина" },
  { id: "fire", name: "пожарная машина" },
  { id: "ambulance", name: "скорая помощь" },
  { id: "bus", name: "автобус" },
  { id: "train", name: "поезд" },
  { id: "plane", name: "самолёт" },
] as const;

type AnimalId = (typeof ANIMALS)[number]["id"];
type ItemId = AnimalId | (typeof VEHICLES)[number]["id"];
type Mode = "animals" | "transport";
type Phase = "hello" | "play" | "again";

const NAME: Record<ItemId, string> = {
  cow: "корова",
  hen: "курица",
  dog: "собака",
  frog: "лягушка",
  cat: "кошка",
  sheep: "овца",
  horse: "лошадь",
  pig: "свинья",
  duck: "утка",
  goat: "коза",
  owl: "сова",
  elephant: "слон",
  bee: "пчела",
  bear: "медведь",
  fox: "лиса",
  lion: "лев",
  monkey: "обезьяна",
  goose: "гусь",
  wolf: "волк",
  donkey: "осёл",
  crow: "ворона",
  parrot: "попугай",
  rooster: "петух",
  penguin: "пингвин",
  tiger: "тигр",
  police: "полицейская машина",
  fire: "пожарная машина",
  ambulance: "скорая помощь",
  bus: "автобус",
  train: "поезд",
  plane: "самолёт",
};

const ART = [
  "/toys/wordmark4.webp",
  "/toys/bell.webp",
  "/toys/listen.webp",
  "/toys/again.webp",
  "/toys/hen.webp",
  "/toys/cow.webp",
  "/toys/dog.webp",
  "/toys/frog.webp",
  ...ANIMALS.map((animal) => `/toys/card-${animal.id}.webp?v=3`),
  ...VEHICLES.map((ride) => `/toys/card-${ride.id}.webp?v=3`),
];

function warmImages() {
  if (typeof window === "undefined") return;
  for (const src of ART) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function deal(ids: readonly ItemId[], count: number, previous: ItemId | null) {
  const pool = ids.filter((id) => id !== previous);
  const target = pool[Math.floor(Math.random() * pool.length)];
  const others = shuffle(ids.filter((id) => id !== target)).slice(0, count - 1);
  return { target, choices: shuffle([target, ...others]) };
}

export function WhoSaidGame() {
  const [phase, setPhase] = useState<Phase>("hello");
  const [mode, setMode] = useState<Mode>("animals");
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<ItemId>("cow");
  const [choices, setChoices] = useState<ItemId[]>(["cow", "hen"]);
  const [misses, setMisses] = useState(0);
  const [ringing, setRinging] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrongId, setWrongId] = useState<ItemId | null>(null);
  const [found, setFound] = useState(0);
  const [saving, setSaving] = useState(false);

  const hint = misses >= 2;

  useEffect(() => {
    prefetchCalls();
    warmImages();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    const onBack = () => resumeAudio();
    document.addEventListener("visibilitychange", onBack);
    return () => document.removeEventListener("visibilitychange", onBack);
  }, []);

  const beads = useMemo(() => Array.from({ length: ROUNDS }, (_, i) => i < found), [found]);

  function ring(id: ItemId) {
    setRinging(true);
    playCall(id);
    window.setTimeout(() => setRinging(false), 900);
  }

  function idsFor(nextMode: Mode) {
    return (nextMode === "transport" ? VEHICLES : ANIMALS).map((item) => item.id);
  }

  function begin() {
    unlockAudio();
    const next = deal(idsFor(mode), COUNTS[0], null);
    setTarget(next.target);
    setChoices(next.choices);
    setRound(0);
    setMisses(0);
    setSolved(false);
    setFound(0);
    setPhase("play");
    void prepareCalls().then(() => ring(next.target));
  }

  function nextRound(foundNow: number) {
    const upcoming = round + 1;
    if (upcoming >= ROUNDS) {
      setPhase("again");
      return;
    }
    const next = deal(idsFor(mode), COUNTS[upcoming], target);
    setRound(upcoming);
    setTarget(next.target);
    setChoices(next.choices);
    setMisses(0);
    setSolved(false);
    ring(next.target);
    setFound(foundNow);
  }

  function choose(id: ItemId) {
    if (phase !== "play" || solved) return;
    if (id === target) {
      setSolved(true);
      playYes();
      if (mode === "animals") speakName(NAME[id]);
      const foundNow = found + 1;
      setFound(foundNow);
      window.setTimeout(() => nextRound(foundNow), 1600);
      return;
    }
    setMisses((n) => n + 1);
    setWrongId(id);
    window.setTimeout(() => setWrongId(null), 700);
    playNo();
    window.setTimeout(() => ring(target), 280);
  }

  async function saveSource() {
    setSaving(true);
    try {
      const response = await fetch("/kto-skazal.zip?v=2", { cache: "no-store" });
      const blob = await response.blob();
      const file = new File([blob], "kto-skazal.zip", { type: "application/zip" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Кто сказал — исходник" });
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "kto-skazal.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setSaving(false);
    }
  }

  if (phase === "hello" || phase === "again") {
    const again = phase === "again";
    return (
      <main className="meadow hello">
        <h1 className="wordmark">
          <img src="/toys/wordmark4.webp" alt="Кто сказал" />
        </h1>
        <div className="modes" role="tablist" aria-label="Что угадываем">
          <button
            type="button"
            className={mode === "animals" ? "mode is-on" : "mode"}
            aria-pressed={mode === "animals"}
            onClick={() => setMode("animals")}
          >
            Животные
          </button>
          <button
            type="button"
            className={mode === "transport" ? "mode is-on" : "mode"}
            aria-pressed={mode === "transport"}
            onClick={() => setMode("transport")}
          >
            Транспорт
          </button>
        </div>
        <button type="button" className="bell-button" onClick={begin}>
          <img className="bell is-idle" src="/toys/bell.webp" alt="" />
          <img
            className="listen-word"
            src={again ? "/toys/again.webp" : "/toys/listen.webp"}
            alt={again ? "Ещё" : "Слушай"}
          />
        </button>
        <div className={mode === "transport" ? "parade is-rides" : "parade"} aria-hidden="true">
          {mode === "transport" ? (
            <>
              <img src="/toys/card-police.webp?v=3" alt="" />
              <img src="/toys/card-fire.webp?v=3" alt="" />
              <img src="/toys/card-ambulance.webp?v=3" alt="" />
              <img src="/toys/card-bus.webp?v=3" alt="" />
            </>
          ) : (
            <>
              <img src="/toys/hen.webp" alt="" />
              <img src="/toys/cow.webp" alt="" />
              <img src="/toys/dog.webp" alt="" />
              <img src="/toys/frog.webp" alt="" />
            </>
          )}
        </div>
        <p className="credits">
          {mode === "animals"
            ? "Звуки животных — записи с Wikimedia Commons"
            : "Машины называет голос, без сирен"}
        </p>
        <button type="button" className="source-link" onClick={saveSource} disabled={saving}>
          {saving ? "Готовлю файл…" : "Скачать исходник"}
        </button>
      </main>
    );
  }

  return (
    <main className="meadow play">
      <header className="stage">
        <button
          type="button"
          className={ringing ? "replay is-live" : "replay"}
          onClick={() => ring(target)}
          aria-label="Послушать ещё раз"
        >
          <img className={ringing ? "bell is-ringing" : "bell"} src="/toys/bell.webp" alt="" />
          <span className="ping" aria-hidden="true" />
        </button>
        <ol className="beads" aria-label="Раунды">
          {beads.map((on, index) => (
            <li key={index} className={on ? "bead is-on" : "bead"} />
          ))}
        </ol>
      </header>
      <div className="table">
        <div className={solved ? "grid is-solved" : "grid"} data-count={choices.length} key={round}>
        {choices.map((id) => {
          const showHint = hint && id === target && !solved;
          const good = solved && id === target;
          const state = good ? " is-good" : wrongId === id ? " is-wrong" : showHint ? " is-hint" : "";
          return (
            <button
              key={id}
              type="button"
              className={`animal${state}`}
              onClick={() => choose(id)}
              aria-label={NAME[id]}
              disabled={solved}
            >
              <span className="plaque">
                <img className="board" src={`/toys/card-${id}.webp?v=3`} alt="" />
                <span className="sparks" aria-hidden="true">
                  <i /><i /><i /><i /><i />
                </span>
                <span className="seal yes" aria-hidden="true">
                  <svg viewBox="0 0 64 64">
                    <path d="M16 34l10 10 22-24" />
                  </svg>
                </span>
                <span className="seal no" aria-hidden="true">
                  <svg viewBox="0 0 64 64">
                    <path d="M20 20l24 24M44 20L20 44" />
                  </svg>
                </span>
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </main>
  );
}
