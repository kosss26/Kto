# Turns a long nature recording into a short game clip:
# picks the loudest ~2 s, removes low rumble, normalises, fades, saves mp3.
# Usage: [HP=60] python3 tools/cut-sound.py <source file> <out.mp3> [seconds] [start]
#        (HP = high-pass cutoff in Hz, lower it for deep voices like hippo or deer)
#        (give start to choose the segment by hand)
import os, subprocess, sys, wave
import numpy as np

src, out = sys.argv[1], sys.argv[2]
length = float(sys.argv[3]) if len(sys.argv) > 3 else 2.2
start = float(sys.argv[4]) if len(sys.argv) > 4 else None
tmp = out + ".tmp.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "22050", "-af", f"highpass=f={os.environ.get('HP', '180')}", tmp], check=True)
with wave.open(tmp) as w:
    rate = w.getframerate()
    data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float)
if start is None:
    hop = rate // 20
    frames = len(data) // hop
    energy = np.array([np.mean(data[i * hop:(i + 1) * hop] ** 2) for i in range(frames)])
    win = max(1, int(length * 20))
    if frames <= win:
        start = 0.0
    else:
        sums = np.convolve(energy, np.ones(win), "valid")
        best = int(np.argmax(sums))
        # start a touch before the first loud frame of the window so the onset is not clipped
        seg = energy[best:best + win]
        onset = best + int(np.argmax(seg > seg.max() * 0.15))
        start = max(0.0, (onset - 2) * hop / rate)
dur = min(length, len(data) / rate - start)
subprocess.run([
    "ffmpeg", "-v", "error", "-y", "-ss", f"{start:.2f}", "-t", f"{dur:.2f}", "-i", tmp,
    "-af", f"afftdn=nf=-30,afade=t=in:d=0.03,afade=t=out:st={max(0, dur - 0.25):.2f}:d=0.25,loudnorm=I=-16:TP=-1.5:LRA=7",
    "-ar", "44100", "-ac", "1", "-b:a", "64k", out,
], check=True)
subprocess.run(["rm", "-f", tmp])
print(f"{out}: start {start:.2f}s, {dur:.2f}s")
