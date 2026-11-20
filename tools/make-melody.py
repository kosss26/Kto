# Builds a short instrument tune from single recorded notes (University of Iowa MIS).
# Usage: python3 tools/make-melody.py <out.mp3> <note> <note> ...
#   note = <file>[#n]:<seconds>   (#n takes the n-th note of a recorded run, e.g. a guitar scale)
# Each note starts at its onset, rings for <seconds> (overlapping the next a little),
# the last one decays naturally; the tune is loudness-normalised like the other sounds.
import subprocess, sys
import numpy as np

RATE = 44100


def load(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(float)


def onsets(x):
    hop = RATE // 100
    env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    loud = env > env.max() * 0.08
    starts, quiet_for = [], 99
    for i, on in enumerate(loud):
        if on and quiet_for >= 15:
            starts.append(i * hop)
        quiet_for = 0 if on else quiet_for + 1
    return starts


def note(spec):
    path, secs = spec.rsplit(":", 1)
    index = 0
    if "#" in path:
        path, n = path.rsplit("#", 1)
        index = int(n)
    x = load(path)
    start = max(0, onsets(x)[index] - RATE // 200)
    return x[start:], float(secs)


out, specs = sys.argv[1], sys.argv[2:]
notes = [note(s) for s in specs]
tail = 0.9
total = sum(d for _, d in notes[:-1]) + notes[-1][1] + tail
mix = np.zeros(int(total * RATE) + RATE)
at = 0
for i, (x, d) in enumerate(notes):
    last = i == len(notes) - 1
    ring = d + (tail if last else 0.12)
    seg = x[: int(ring * RATE)].copy()
    seg /= max(1e-6, np.abs(seg).max())
    fade = int((0.4 if last else 0.08) * RATE)
    fade = min(fade, len(seg))
    seg[-fade:] *= np.linspace(1, 0, fade) ** 2
    mix[at:at + len(seg)] += seg
    at += int(d * RATE)
mix = mix[: at + int(tail * RATE)]
tmp = out + ".tmp.f32"
(mix / np.abs(mix).max() * 0.9).astype(np.float32).tofile(tmp)
subprocess.run([
    "ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "1", "-i", tmp,
    "-af", "highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "44100", "-ac", "1", "-b:a", "64k", out,
], check=True)
subprocess.run(["rm", "-f", tmp])
print(f"{out}: {len(mix) / RATE:.2f}s")
