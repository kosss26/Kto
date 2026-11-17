# Generates the spoken lines with Vosk TTS (vosk-model-tts-ru-0.7-multi, Apache-2.0),
# female voice F02 (speaker 1, trained on "Natasha" from the SOVA dataset):
#   public/voice/where-<id>.mp3  "Где корова?"
#   public/voice/this-<id>.mp3   "Это корова!"
#   public/voice/bravo.mp3, public/voice/again.mp3
# Usage: python3 tools/make-voice.py <path to vosk-model-tts-ru-0.7-multi> [only-missing]
#        (pip install vosk-tts tokenizers onnxruntime)
import os, re, subprocess, sys, tempfile
from vosk_tts import Model, Synth

SPEAKER = 1
synth = Synth(Model(model_path=sys.argv[1]))
only_missing = len(sys.argv) > 2
src = open("src/lib/who-said/content.ts", encoding="utf-8").read()
items = re.findall(r'\{ id: "(\w+)", name: "([^"]+)"', src)
out = "public/voice"
os.makedirs(out, exist_ok=True)

lines = {"bravo": "Молодец!", "again": "Попробуй ещё!"}
for item_id, name in items:
    lines[f"where-{item_id}"] = f"Где {name}?"
    lines[f"this-{item_id}"] = f"Это {name}!"

with tempfile.TemporaryDirectory() as tmp:
    for key, text in lines.items():
        target = f"{out}/{key}.mp3"
        if only_missing and os.path.exists(target):
            continue
        wav = f"{tmp}/{key}.wav"
        synth.synth(text, wav, speaker_id=SPEAKER, speech_rate=0.92)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav,
                        "-af", "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.12,areverse,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.08",
                        "-ar", "44100", "-ac", "1", "-b:a", "64k", target], check=True)
print(len(lines), "lines")
