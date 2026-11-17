import { useEffect, useRef, useState } from "react";
import { clipMs, playClip, prepareClips, stopClip } from "@/lib/who-said/audio";
import {
  BY_ID,
  ITEMS,
  MODES,
  callSrc,
  cardSrc,
  idsFor,
  nameSrc,
  stickerSrc,
  type Mode,
} from "@/lib/who-said/content";
import { useTimers } from "@/lib/who-said/game-utils";
import { useProgress } from "@/lib/who-said/progress";
import { BackIcon, Hills } from "./kit";

const TAB_MATS = ["#bfe3a5", "#f7c9dc", "#ffd9a8", "#fff0a6", "#bfe0f5", "#d8cdf5"];

/** «Мои наклейки»: every toy, collected ones in colour, the rest as silhouettes to look forward to. */
export function Album({ onBack }: { onBack: () => void }) {
  const { stickers } = useProgress();
  const [tab, setTab] = useState<Mode>("farm");
  const [playing, setPlaying] = useState<string | null>(null);
  const tapId = useRef(0);
  const { later, clearTimers } = useTimers();
  const have = new Set(stickers);
  const ids = idsFor(tab);

  useEffect(() => () => stopClip(), []);

  async function tap(id: string) {
    if (!have.has(id)) return;
    const mine = ++tapId.current;
    clearTimers();
    setPlaying(id);
    await prepareClips([callSrc(id), nameSrc(id)]);
    if (mine !== tapId.current) return;
    if (BY_ID[id].sound) {
      playClip(callSrc(id), true);
      later(() => playClip(nameSrc(id)), Math.min(clipMs(callSrc(id)), 2400) + 150);
    } else {
      playClip(nameSrc(id));
    }
    later(() => setPlaying(null), 1600);
  }

  return (
    <main className="room play album">
      <header className="sets-head">
        <button
          type="button"
          className="round-btn is-white is-small"
          onClick={onBack}
          aria-label="Назад"
        >
          <BackIcon />
        </button>
        <h1 className="sets-title">Наклейки</h1>
        <span className="album-count">
          {stickers.length} из {ITEMS.length}
        </span>
      </header>

      <div className="album-tabs" role="tablist" aria-label="Наборы">
        {MODES.map((mode, index) => {
          const got = idsFor(mode.id).filter((id) => have.has(id)).length;
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={tab === mode.id}
              aria-label={`${mode.label}: ${got} из ${idsFor(mode.id).length}`}
              className={tab === mode.id ? "album-tab is-on" : "album-tab"}
              style={{ ["--mat" as string]: TAB_MATS[index] }}
              onClick={() => setTab(mode.id)}
            >
              <img src={cardSrc(mode.cover)} alt="" />
              <span>{got}</span>
            </button>
          );
        })}
      </div>

      <div className="album-page">
        {ids.map((id, index) => {
          const got = have.has(id);
          // a small fixed tilt per toy, so stickers look hand-placed but don't jump around
          const tilt = ((id.charCodeAt(0) + id.length * 7) % 9) - 4;
          return (
            <button
              key={id}
              type="button"
              className={`slot${got ? " is-got" : ""}${playing === id ? " is-playing" : ""}`}
              style={{
                ["--tilt" as string]: `${tilt}deg`,
                animationDelay: `${Math.min(index, 15) * 0.03}s`,
              }}
              onClick={() => tap(id)}
              aria-label={got ? BY_ID[id].name : "Ещё не найдена"}
              aria-disabled={!got}
            >
              <img src={got ? stickerSrc(id) : cardSrc(id)} alt="" draggable={false} />
              <span className="slot-name">{got ? BY_ID[id].name : "?"}</span>
            </button>
          );
        })}
      </div>
      <Hills />
    </main>
  );
}
