import { asset } from "./assets";
// Every clip (animal call or voice line) is addressed by its URL.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const raw = new Map<string, Promise<ArrayBuffer>>();
const buffers = new Map<string, AudioBuffer>();
let clipNode: AudioBufferSourceNode | null = null;
/** Separate volume for the spoken lines, for animal calls and effects, and for the music (parents' corner). */
let voiceBus: GainNode | null = null;
let soundBus: GainNode | null = null;
const volumes = { voice: 1, sounds: 1, music: 1 };
let paused = false;

function context() {
  if (!ctx) ctx = new AudioContext({ latencyHint: "interactive" });
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    voiceBus = ctx.createGain();
    soundBus = ctx.createGain();
    voiceBus.gain.value = volumes.voice;
    soundBus.gain.value = volumes.sounds;
    voiceBus.connect(master);
    soundBus.connect(master);
  }
  if (ctx.state === "suspended" && !paused) void ctx.resume();
  return ctx;
}

const busFor = (url: string) => (url.includes("/voice/") ? voiceBus : soundBus);

export function setVolumes(next: { voice: number; sounds: number; music: number }) {
  Object.assign(volumes, next);
  if (voiceBus) voiceBus.gain.value = volumes.voice;
  if (soundBus) soundBus.gain.value = volumes.sounds;
  if (music) music.volume = MUSIC_BASE * volumes.music;
}

// ---------- iPhone / iPad silent switch ----------
// iOS mutes Web Audio when the ring/silent switch is on. Telling it this page is a media player
// (iOS 17+: navigator.audioSession) or keeping a silent <audio> element playing (older iOS)
// moves the page to the "playback" category, which plays through the silent switch.

let silentEl: HTMLAudioElement | null = null;

function silentWavUrl() {
  const rate = 8000;
  const samples = rate / 2;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const text = (o: number, t: string) =>
    [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

const isAppleTouch = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1));

function playThroughSilentSwitch() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) {
    try {
      session.type = "playback";
      return;
    } catch {
      /* fall back to the silent element */
    }
  }
  if (!isAppleTouch()) return;
  if (!silentEl) {
    silentEl = document.createElement("audio");
    silentEl.src = silentWavUrl();
    silentEl.loop = true;
    silentEl.setAttribute("playsinline", "");
    silentEl.setAttribute("x-webkit-airplay", "deny");
    silentEl.preload = "auto";
  }
  if (silentEl.paused && !paused) void silentEl.play().catch(() => {});
}

/** Call from a tap: opens the audio context and lets sound play even with the silent switch on. */
export function unlockAudio() {
  playThroughSilentSwitch();
  const audio = context();
  const buffer = audio.createBuffer(1, 1, audio.sampleRate);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.connect(audio.destination);
  src.start();
  return audio;
}

// ---------- pause when the app is hidden ----------

let musicWasPlaying = false;

/** App went to the background / screen locked: freeze every sound exactly where it is. */
export function pauseAudio() {
  if (paused) return;
  paused = true;
  if (ctx && ctx.state === "running") void ctx.suspend();
  musicWasPlaying = Boolean(music && !music.paused);
  music?.pause();
  silentEl?.pause();
}

/** Back in the app: carry on from the same place. */
export function resumeAudio() {
  paused = false;
  if (ctx && ctx.state !== "running") void ctx.resume();
  if (silentEl) void silentEl.play().catch(() => {});
  if (musicWasPlaying && music) void music.play().catch(() => {});
  musicWasPlaying = false;
}

function bytes(url: string) {
  let pending = raw.get(url);
  if (!pending) {
    pending = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return res.arrayBuffer();
    });
    pending.catch(() => raw.delete(url));
    raw.set(url, pending);
  }
  return pending;
}

/** Start downloading without an AudioContext (allowed before the first tap). */
export function prefetchClips(urls: string[]) {
  for (const url of urls) void bytes(url).catch(() => {});
}

/** Download and decode; a clip that fails to load is skipped, never blocks the game. */
export async function prepareClips(urls: string[]) {
  const audio = context();
  await Promise.all(
    urls.map(async (url) => {
      if (buffers.has(url)) return;
      try {
        const data = await bytes(url);
        buffers.set(url, await audio.decodeAudioData(data.slice(0)));
      } catch {
        /* missing clip: the game goes on silently for this one */
      }
    }),
  );
}

/** Length of a decoded clip in ms (0 if it is not loaded). */
export function clipMs(url: string) {
  const buffer = buffers.get(url);
  return buffer ? Math.round(buffer.duration * 1000) : 0;
}

export function stopClip() {
  if (!clipNode) return;
  try {
    clipNode.stop();
  } catch {
    /* already ended */
  }
  clipNode.disconnect();
  clipNode = null;
}

/** Plays one clip; a new clip cuts the previous one off. */
export function playClip(url: string, wobble = false) {
  const audio = context();
  const buffer = buffers.get(url);
  if (!buffer || !master) return;
  stopClip();
  const src = audio.createBufferSource();
  const gain = audio.createGain();
  const now = audio.currentTime;
  src.buffer = buffer;
  if (wobble) src.playbackRate.value = 0.98 + Math.random() * 0.05;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.95, now + 0.02);
  src.connect(gain);
  gain.connect(busFor(url) ?? master);
  src.start();
  clipNode = src;
  src.onended = () => {
    gain.disconnect();
    if (clipNode === src) clipNode = null;
  };
}

/** Plays a clip on top of whatever is playing (the chorus); quieter, never cuts other clips. */
export function playLayer(url: string, delay = 0, gain = 0.55) {
  const audio = context();
  const buffer = buffers.get(url);
  if (!buffer || !master) return;
  const src = audio.createBufferSource();
  const g = audio.createGain();
  const at = audio.currentTime + delay;
  src.buffer = buffer;
  src.playbackRate.value = 0.97 + Math.random() * 0.06;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.03);
  src.connect(g);
  g.connect(busFor(url) ?? master);
  src.start(at);
  src.onended = () => g.disconnect();
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
  gain.connect(soundBus ?? master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
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
  gain.connect(soundBus ?? master);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** Little xylophone run for the finish. */
export function playFanfare() {
  [523, 659, 784, 1047].forEach((freq, index) => chime(freq, index * 0.11, 0.1, 0.3));
  chime(1319, 0.5, 0.08, 0.5);
}

// Background music: a plain <audio> element, streamed and looped, quiet under everything else.
export const MUSIC_URL = asset("/music/carefree.mp3");

let music: HTMLAudioElement | null = null;
const MUSIC_BASE = 0.22;

export function startMusic() {
  if (typeof window === "undefined") return;
  if (!music) {
    music = new Audio(MUSIC_URL);
    music.loop = true;
    music.volume = MUSIC_BASE * volumes.music;
    music.preload = "auto";
  }
  if (music.paused && !paused && volumes.music > 0) void music.play().catch(() => {});
}

export function stopMusic() {
  music?.pause();
}
