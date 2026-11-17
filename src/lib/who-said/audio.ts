import { ITEMS } from "./content";

const FILES: Record<string, string> = Object.fromEntries(ITEMS.map((item) => [item.id, `/sfx/${item.id}.mp3`]));

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const raw = new Map<string, ArrayBuffer>();
const buffers = new Map<string, AudioBuffer>();
let callNode: AudioBufferSourceNode | null = null;

function context() {
  if (!ctx) ctx = new AudioContext({ latencyHint: "interactive" });
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  const audio = context();
  const buffer = audio.createBuffer(1, 1, audio.sampleRate);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.connect(audio.destination);
  src.start();
  return audio;
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function prefetchCalls() {
  for (const [id, url] of Object.entries(FILES)) {
    if (raw.has(id)) continue;
    void fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => raw.set(id, buf));
  }
}

export async function prepareCalls() {
  const audio = context();
  await Promise.all(
    Object.entries(FILES).map(async ([id, url]) => {
      if (buffers.has(id)) return;
      let bytes = raw.get(id);
      if (!bytes) {
        const response = await fetch(url);
        bytes = await response.arrayBuffer();
        raw.set(id, bytes);
      }
      const clip = bytes;
      buffers.set(id, await audio.decodeAudioData(clip.slice(0)));
    }),
  );
}

function stopCall() {
  if (!callNode) return;
  try {
    callNode.stop();
  } catch {
    /* already ended */
  }
  callNode.disconnect();
  callNode = null;
}

export function playCall(id: string) {
  const audio = context();
  const buffer = buffers.get(id);
  if (!buffer || !master) return;
  stopCall();
  const src = audio.createBufferSource();
  const gain = audio.createGain();
  const now = audio.currentTime;
  src.buffer = buffer;
  src.playbackRate.value = 0.98 + Math.random() * 0.05;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.95, now + 0.02);
  src.connect(gain);
  gain.connect(master);
  src.start();
  callNode = src;
  src.onended = () => {
    gain.disconnect();
    if (callNode === src) callNode = null;
  };
}

function chime(freq: number, delay: number, peak: number, dur: number) {
  const audio = context();
  if (!master) return;
  const now = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function speakName(name: string) {
  if (typeof speechSynthesis === "undefined") return;
  const utter = new SpeechSynthesisUtterance(name);
  utter.lang = "ru-RU";
  utter.rate = 0.9;
  utter.pitch = 1.12;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

export function playYes() {
  chime(523, 0, 0.12, 0.18);
  chime(784, 0.09, 0.1, 0.22);
}

/** Soft "oh-oh": two gentle falling notes, never a buzzer. */
export function playSoft() {
  chime(440, 0, 0.06, 0.2);
  chime(370, 0.16, 0.05, 0.26);
}

/** Wooden knock for every tap. */
export function playTap() {
  const audio = context();
  if (!master) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(820, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** Little xylophone run for the finish. */
export function playFanfare() {
  [523, 659, 784, 1047].forEach((freq, index) => chime(freq, index * 0.11, 0.1, 0.3));
  chime(1319, 0.5, 0.08, 0.5);
}

export function stopVoice() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
