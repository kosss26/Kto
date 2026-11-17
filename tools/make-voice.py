# Generates the spoken lines with Silero TTS v5 (ru), voice "xenia":
#   public/voice/where-<id>.mp3  "Где корова?"
#   public/voice/this-<id>.mp3   "Это корова!"
#   public/voice/fact-<id>.mp3  "Корова даёт молоко."
#   public/voice/bravo.mp3, public/voice/again.mp3
# Silero models are licensed CC BY-NC 4.0 — fine for this personal, non-commercial app.
# Usage: python3 tools/make-voice.py <path to v5_ru.pt from models.silero.ai> [only-missing]
#        (pip install torch --index-url https://download.pytorch.org/whl/cpu)
import os, re, subprocess, sys, tempfile, wave
import numpy as np
import torch

SPEAKER = "xenia"
RATE = 48000
torch.set_num_threads(4)
model = torch.package.PackageImporter(sys.argv[1]).load_pickle("tts_models", "model")
only_missing = len(sys.argv) > 2

src = open("src/lib/who-said/content.ts", encoding="utf-8").read()
items = re.findall(r'\{ id: "(\w+)", name: "([^"]+)"', src)
out = "public/voice"
os.makedirs(out, exist_ok=True)

lines = {"bravo": "Молодец!", "again": "Попробуй ещё!"}
facts = dict(re.findall(r'^  (\w+): "([^"]+)",$', src, re.M))
for item_id, name in items:
    lines[f"where-{item_id}"] = f"Где {name}?"
    lines[f"this-{item_id}"] = f"Это {name}!"
    if item_id in facts:
        lines[f"fact-{item_id}"] = facts[item_id]

with tempfile.TemporaryDirectory() as tmp:
    for key, text in lines.items():
        target = f"{out}/{key}.mp3"
        if only_missing and os.path.exists(target):
            continue
        audio = model.apply_tts(text=text, speaker=SPEAKER, sample_rate=RATE, put_accent=True, put_yo=True)
        pcm = (audio.numpy() * 32767).clip(-32768, 32767).astype(np.int16)
        wav = f"{tmp}/{key}.wav"
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav,
                        "-af", "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.12,areverse,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.08",
                        "-ar", "44100", "-ac", "1", "-b:a", "64k", target], check=True)
print(len(lines), "lines")
