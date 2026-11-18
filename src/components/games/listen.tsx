import { useEffect, useRef, useState } from "react";
import { clipMs, playClip, prefetchClips, prepareClips, stopClip } from "@/lib/who-said/audio";
import { BY_ID, callSrc, matAt, nameSrc, type SetId } from "@/lib/who-said/content";
import { activeIdsFor } from "@/lib/who-said/progress";
import { CardFace, Backdrop, Notes, TopBar } from "../kit";
import { useQuiet, useTimers } from "@/lib/who-said/game-utils";

/** «Просто послушать»: every toy of the set on the table; tap one to hear it and its name. No tasks, no mistakes. */
export function ListenGame({ set, onHome }: { set: SetId; onHome: () => void }) {
  const ids = activeIdsFor(set);
  const [playing, setPlaying] = useState<string | null>(null);
  const tapId = useRef(0);
  const { later, clearTimers } = useTimers();
  useQuiet(true);

  useEffect(() => {
    // the mix holds every toy: fetch lazily as they are tapped
    if (set !== "mix") prefetchClips(ids.flatMap((id) => [callSrc(id), nameSrc(id)]));
    return () => stopClip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  async function tap(id: string) {
    const mine = ++tapId.current;
    clearTimers();
    setPlaying(id);
    await prepareClips([callSrc(id), nameSrc(id)]);
    if (mine !== tapId.current) return; // another toy was tapped meanwhile
    const hasCall = BY_ID[id].sound;
    // a real call first, then the name; toys without a call just get their name
    if (hasCall) {
      playClip(callSrc(id), true);
      later(() => playClip(nameSrc(id)), Math.min(clipMs(callSrc(id)), 2400) + 150);
    } else {
      playClip(nameSrc(id));
    }
    const total = (hasCall ? Math.min(clipMs(callSrc(id)), 2400) + 150 : 0) + clipMs(nameSrc(id));
    later(() => setPlaying(null), total + 200);
  }

  return (
    <main className="room play listen">
      <TopBar onHome={onHome}>
        <p className="screen-title">Нажми на зверя</p>
      </TopBar>
      <div className="listen-grid">
        {ids.map((id, index) => (
          <button
            key={id}
            type="button"
            className={playing === id ? "card mini is-playing" : "card mini"}
            style={{
              animationDelay: `${Math.min(index, 12) * 0.04}s`,
              ["--mat" as string]: matAt(index, 0),
            }}
            onClick={() => tap(id)}
            aria-label={BY_ID[id].name}
          >
            <CardFace id={id} />
            <span className="mini-name">{BY_ID[id].name}</span>
            {playing === id && <Notes />}
          </button>
        ))}
      </div>
      <Backdrop set={set} />
    </main>
  );
}
