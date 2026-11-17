import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { playClip, playFanfare, prepareClips } from "@/lib/who-said/audio";
import { BY_ID, cardSrc, matAt, stickerSrc, type SetId } from "@/lib/who-said/content";
import { bravoLine, finishGame } from "@/lib/who-said/progress";
import { useQuiet, useTimers } from "@/lib/who-said/game-utils";

// ---------- icons ----------

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 4.5l8 7" />
      <path d="M6.5 10v9.5h11V10" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  );
}

export function AgainIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4.8h-4.8" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 5.8v12.4a1 1 0 0 0 1.5.86l10-6.2a1 1 0 0 0 0-1.72l-10-6.2a1 1 0 0 0-1.5.86Z" />
    </svg>
  );
}

export function ShuffleIcon() {
  return (
    <svg className="shuffle" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h3.5c2.2 0 3.6 1 4.8 3l1.4 2.4c1.2 2 2.6 3 4.8 3H21" />
      <path d="M3 17h3.5c1.5 0 2.6-.5 3.5-1.5M14 8.5c.9-1 2-1.5 3.5-1.5H21" />
      <path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 13 21 15.5 18.5 18" />
    </svg>
  );
}

export function MusicIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 17.5V5.5l10-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15.5" r="2.5" />
      {!on && <path className="slash" d="M3.5 3.5l17 17" />}
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path className="cone" d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
      <path d="M15.2 9a4.2 4.2 0 0 1 0 6" />
      <path d="M17.8 6.5a7.8 7.8 0 0 1 0 11" />
    </svg>
  );
}

// ---------- shared pieces ----------

const LOGO_COLORS = ["#ff6b5e", "#ffb627", "#4cbf6a", "#3fa2e8", "#a77bea", "#ff6fa8"];

export function Logo() {
  const lines = ["Кто", "сказал?"];
  let n = 0;
  return (
    <h1 className="logo" aria-label="Кто сказал?">
      {lines.map((line) => (
        <span className="logo-line" key={line} aria-hidden="true">
          {[...line].map((ch, i) => {
            const color = LOGO_COLORS[n++ % LOGO_COLORS.length];
            return (
              <span key={i} className="logo-ch" style={{ color, animationDelay: `${n * 0.06}s` }}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/** Felt hills along the bottom of every screen. */
export function Hills() {
  return (
    <svg className="hills" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      <path className="hill-back" d="M0 70 C70 30 140 40 200 62 C260 84 330 38 400 54 V120 H0Z" />
      <path className="hill-front" d="M0 92 C80 64 150 70 220 88 C290 106 350 76 400 82 V120 H0Z" />
      <path className="stitch" d="M0 100 C80 72 150 78 220 96 C290 114 350 84 400 90" />
    </svg>
  );
}

export function Stars({ count, total }: { count: number; total: number }) {
  return (
    <ol className="track" aria-label={`Готово ${count} из ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className={
            i < count ? "track-star is-on" : i === count ? "track-star is-now" : "track-star"
          }
        />
      ))}
    </ol>
  );
}

export function TopBar({ onHome, children }: { onHome: () => void; children?: ReactNode }) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="round-btn is-white is-small"
        onClick={onHome}
        aria-label="Домой"
      >
        <HomeIcon />
      </button>
      {children ?? <span />}
      <span className="topbar-spacer" aria-hidden="true" />
    </header>
  );
}

/** Stars, "Молодец!", the toys of this game, home / again. */
export function Finale({
  set,
  found,
  title = "Ты угадал:",
  onHome,
  onAgain,
}: {
  set: SetId;
  found: string[];
  title?: string;
  onHome: () => void;
  onAgain: () => void;
}) {
  const { later } = useTimers();
  const [sticker, setSticker] = useState<string | null>(null);
  const awarded = useRef(false);
  useQuiet(false);
  useEffect(() => {
    // one sticker per finished game (the ref keeps a dev double-run from paying twice)
    if (!awarded.current) {
      awarded.current = true;
      setSticker(finishGame(set, found));
    }
    playFanfare();
    later(() => {
      const line = bravoLine();
      void prepareClips([line]).then(() => playClip(line));
    }, 700);
  }, [found, later, set]);
  return (
    <main className="room done">
      <div className="stars" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <h1 className="praise">Молодец!</h1>
      {sticker && (
        <div className="new-sticker">
          <span className="sticker-shine" aria-hidden="true" />
          <span className="sticker-ribbon">Новая наклейка!</span>
          <img className="sticker-img" src={stickerSrc(sticker)} alt={BY_ID[sticker].name} />
        </div>
      )}
      {found.length > 0 && <p className="recap-title">{title}</p>}
      <ul className="recap" data-count={found.length}>
        {found.map((id, index) => (
          <li
            key={`${id}-${index}`}
            style={{
              animationDelay: `${0.35 + index * 0.07}s`,
              ["--mat" as string]: matAt(index, 0),
            }}
          >
            <img src={cardSrc(id)} alt={BY_ID[id].name} />
          </li>
        ))}
      </ul>
      <div className="finale-actions">
        <button type="button" className="round-btn is-white" onClick={onHome} aria-label="Домой">
          <HomeIcon />
        </button>
        <button type="button" className="round-btn is-go" onClick={onAgain} aria-label="Играть ещё">
          <AgainIcon />
        </button>
      </div>
      <Hills />
    </main>
  );
}

export function Sparks() {
  return (
    <span className="sparks" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/** The felt card face: pastel mat with stitching and the toy. */
export function CardFace({ id, style }: { id: string; style?: CSSProperties }) {
  return (
    <span className="card-face" style={style}>
      <img src={cardSrc(id)} alt="" draggable={false} />
    </span>
  );
}
