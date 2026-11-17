const FILES: Record<string, string> = {
  cow: "/sfx/cow.mp3",
  hen: "/sfx/hen.mp3",
  dog: "/sfx/dog.mp3",
  frog: "/sfx/frog.mp3",
  cat: "/sfx/cat.mp3",
  sheep: "/sfx/sheep.mp3",
  horse: "/sfx/horse.mp3",
  pig: "/sfx/pig.mp3",
  duck: "/sfx/duck.mp3",
  goat: "/sfx/goat.mp3",
  owl: "/sfx/owl.mp3",
  elephant: "/sfx/elephant.mp3",
  bee: "/sfx/bee.mp3",
  bear: "/sfx/bear.mp3",
  fox: "/sfx/fox.mp3",
  lion: "/sfx/lion.mp3",
  monkey: "/sfx/monkey.mp3",
  goose: "/sfx/goose.mp3",
  wolf: "/sfx/wolf.mp3",
  donkey: "/sfx/donkey.mp3",
  crow: "/sfx/crow.mp3",
  parrot: "/sfx/parrot.mp3",
  rooster: "/sfx/rooster.mp3",
  penguin: "/sfx/penguin.mp3",
  tiger: "/sfx/tiger.mp3",
  police: "/sfx/police.mp3",
  fire: "/sfx/fire.mp3",
  ambulance: "/sfx/ambulance.mp3",
  bus: "/sfx/bus.mp3",
  train: "/sfx/train.mp3",
  plane: "/sfx/plane.mp3",
};

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

export function playNo() {
  const audio = context();
  if (!master) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(196, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.16);
}
