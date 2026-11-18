import { useState } from "react";
import { playClip, playTap, prepareClips, setVolumes } from "@/lib/who-said/audio";
import { BY_ID, ITEMS, MODES, cardSrc, type Mode } from "@/lib/who-said/content";
import { NAMES, nameLine } from "@/lib/who-said/names";
import { syncOffline, useOffline } from "@/lib/who-said/offline";
import {
  LEVELS,
  learning,
  minutesToday,
  minutesWeek,
  setChild,
  setLevel,
  setSettings,
  useProgress,
  type Level,
} from "@/lib/who-said/progress";

export function LevelIcon({ level }: { level: Level }) {
  const filled = level === "baby" ? 1 : level === "middle" ? 2 : 3;
  return (
    <span className="level-dots" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < filled ? "is-on" : ""} />
      ))}
    </span>
  );
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

const LIMITS = [0, 10, 15, 20, 30, 45];
type Tab = "game" | "time" | "progress" | "sound";

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={on ? "switch is-on" : "switch"}
      onClick={() => {
        playTap();
        onChange(!on);
      }}
    >
      <span className="switch-label">{label}</span>
      <span className="switch-track" aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = `vol-${label}`;
  return (
    <label className="slider" htmlFor={id}>
      <span className="slider-label">{label}</span>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">{Math.round(value * 100)}%</span>
    </label>
  );
}

function ToyChips({ ids, empty }: { ids: string[]; empty: string }) {
  if (!ids.length) return <p className="parents-note">{empty}</p>;
  return (
    <div className="toy-chips">
      {ids.slice(0, 18).map((id) => (
        <span key={id} className="toy-chip">
          <img src={cardSrc(id)} alt="" />
          {BY_ID[id].name}
        </span>
      ))}
    </div>
  );
}

/** «Для взрослых»: everything a parent may want to change, in four tabs. */
export function ParentSheet({ onClose }: { onClose: () => void }) {
  const progress = useProgress();
  const { settings } = progress;
  const [tab, setTab] = useState<Tab>("game");

  const setVolume = (key: "voice" | "sounds" | "music", v: number) => {
    const volume = { ...settings.volume, [key]: v };
    setSettings({ volume });
    setVolumes(volume);
  };

  const toggleSet = (mode: Mode, on: boolean) => {
    const off = on ? settings.off.filter((m) => m !== mode) : [...settings.off, mode];
    // at least one set stays on
    if (off.length >= MODES.length) return;
    setSettings({ off });
  };

  const { known, confused } = learning();
  const plays = Object.values(progress.plays).reduce((a, b) => a + (b ?? 0), 0);
  const today = minutesToday();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet parents"
        role="dialog"
        aria-modal="true"
        aria-label="Для взрослых"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="parents-head">
          <p className="sheet-title">Для взрослых</p>
          <button type="button" className="parents-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="parents-tabs" role="tablist">
          {(
            [
              ["game", "Игра"],
              ["time", "Время"],
              ["progress", "Успехи"],
              ["sound", "Звук"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "parents-tab is-on" : "parents-tab"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "game" && (
          <div className="parents-body">
            <p className="parents-h">Сложность</p>
            {LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={progress.level === level.id ? "level-option is-on" : "level-option"}
                onClick={() => {
                  playTap();
                  setLevel(level.id);
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
            <p className="parents-h">Наборы</p>
            <p className="parents-note">
              Выключенные наборы пропадают из игр, «Вперемешку» и гостей дня. Альбом остаётся целым.
            </p>
            {MODES.map((m) => (
              <Switch
                key={m.id}
                label={m.label}
                on={!settings.off.includes(m.id)}
                onChange={(on) => toggleSet(m.id, on)}
              />
            ))}
            <p className="parents-h">Подсказки</p>
            <Switch
              label="Факт после ответа («Корова даёт молоко»)"
              on={settings.facts}
              onChange={(facts) => setSettings({ facts })}
            />
          </div>
        )}

        {tab === "time" && (
          <div className="parents-body">
            <p className="parents-h">Сколько можно играть в день</p>
            <div className="limit-row">
              {LIMITS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={settings.limit === m ? "limit is-on" : "limit"}
                  onClick={() => {
                    playTap();
                    setSettings({ limit: m });
                  }}
                >
                  {m ? `${m} мин` : "Без лимита"}
                </button>
              ))}
            </div>
            <p className="parents-note">
              Когда время выйдет, текущая игра доиграется до конца, а потом зверята скажут «Пора
              отдохнуть!» и лягут спать до завтра. Добавить время можно удержанием кнопки на экране
              отдыха.
            </p>
            <div className="stat-row">
              <span className="stat">
                <b>{today}</b> мин сегодня
              </span>
              <span className="stat">
                <b>{minutesWeek()}</b> мин за неделю
              </span>
            </div>
          </div>
        )}

        {tab === "progress" && (
          <div className="parents-body">
            <div className="stat-row">
              <span className="stat">
                <b>{progress.stickers.length}</b> из {ITEMS.length} наклеек
              </span>
              <span className="stat">
                <b>{plays}</b> игр пройдено
              </span>
            </div>
            <p className="parents-h">Узнаёт уверенно</p>
            <ToyChips ids={known} empty="Пока мало ответов — сыграйте пару игр «Кто сказал?»." />
            <p className="parents-h">Путает</p>
            <ToyChips ids={confused} empty="Никого не путает. Отлично!" />
            <p className="parents-note">
              Кого ребёнок путает, игра показывает чаще, пока он их не запомнит.
            </p>
          </div>
        )}

        {tab === "sound" && (
          <div className="parents-body">
            <p className="parents-h">Громкость</p>
            <Slider
              label="Голос"
              value={settings.volume.voice}
              onChange={(v) => setVolume("voice", v)}
            />
            <Slider
              label="Звери и звуки"
              value={settings.volume.sounds}
              onChange={(v) => setVolume("sounds", v)}
            />
            <Slider
              label="Музыка"
              value={settings.volume.music}
              onChange={(v) => setVolume("music", v)}
            />
            <OfflineRow />
            <p className="credits-line">
              Звуки: BBC Sound Effects, xeno-canto, Wikimedia Commons · Голос: Silero · Музыка:
              Kevin MacLeod «Carefree» (CC BY 4.0)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
