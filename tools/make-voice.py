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
meta = {m[0]: (m[1], bool(m[2])) for m in re.findall(r'\{ id: "(\w+)", name: "[^"]+", mode: "(\w+)"(, sound: true)?', src)}
WHERE = {"pets": "дома", "farm": "на ферме", "forest": "в лесу", "sea": "в море", "zoo": "в жарких странах"}
out = "public/voice"
os.makedirs(out, exist_ok=True)

lines = {"bravo": "Молодец!", "again": "Попробуй ещё!",
         "praise-1": "Правильно!", "praise-2": "Верно!", "praise-3": "Ура!", "praise-4": "Отлично!"}
facts = dict(re.findall(r'^  (\w+): "([^"]+)",$', src, re.M))
for item_id, name in items:
    lines[f"where-{item_id}"] = f"Где {name}?"
    lines[f"this-{item_id}"] = f"Это {name}!"
    lines[f"guest-{item_id}"] = f"Сегодня к нам в гости — {name}!"
    # variety after a right answer
    lines[f"yes-{item_id}-1"] = f"Да, это {name}!"
    lines[f"yes-{item_id}-2"] = f"Правильно, {name}!"
    lines[f"yes-{item_id}-3"] = f"Верно! Это {name}."
    if item_id in facts:
        lines[f"fact-{item_id}"] = facts[item_id]
    mode, has_sound = meta[item_id]
    if has_sound:
        verb = "звучит" if mode == "city" else "говорит"
        lines[f"how-{item_id}"] = f"Как {verb} {name}?"
    if mode in WHERE and item_id != "panda":
        lines[f"homeq-{item_id}"] = f"Где живёт {name}?"
        lines[f"lives-{item_id}"] = f"{name[0].upper() + name[1:]} живёт {WHERE[mode]}."

SET_DONE = {
    "farm": "Ура! Все домашние животные в альбоме!",
    "pets": "Ура! Все питомцы в альбоме!",
    "forest": "Ура! Все лесные жители в альбоме!",
    "zoo": "Ура! Весь зоопарк в альбоме!",
    "sea": "Ура! Все морские жители в альбоме!",
    "city": "Ура! Все машины в альбоме!",
}
for mode, text in SET_DONE.items():
    lines[f"setdone-{mode}"] = text

names_src = open("src/lib/who-said/names.ts", encoding="utf-8").read()
for name_id, child in re.findall(r'\{ id: "(\w+)", name: "([^"]+)" \}', names_src):
    lines[f"name-{name_id}-hi"] = f"Привет, {child}! Во что поиграем?"
    lines[f"name-{name_id}-bravo"] = f"Молодец, {child}!"
    lines[f"name-{name_id}-smart"] = f"Умница, {child}!"

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
                        "-ar", "24000", "-ac", "1", "-b:a", "40k", "-map_metadata", "-1", target], check=True)
print(len(lines), "lines")
