# Makes the plain background of a Codex sheet transparent, so tools/cut-felt.py can cut it.
# The background is the colour of the corners; everything not reachable from the edges through
# background-coloured pixels is kept whole (cream felt inside a toy stays opaque).
# Usage: python3 tools/remove-bg.py <in.png> <out.png> [tolerance]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
tol = float(sys.argv[3]) if len(sys.argv) > 3 else 14
img = np.array(Image.open(src).convert("RGB")).astype(float)
h, w = img.shape[:2]
corners = np.concatenate([img[:8, :8], img[:8, -8:], img[-8:, :8], img[-8:, -8:]]).reshape(-1, 3)
bg = np.median(corners, axis=0)
dist = np.abs(img - bg).max(axis=2)
# smooth a little so felt fuzz doesn't open channels into the toys
dist = ndi.gaussian_filter(dist, 1.2)
near = dist < tol
labels, _ = ndi.label(near)
edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
background = np.isin(labels, edge[edge > 0])
# soft edge: fade over the last few pixels of the background next to a toy
inside = ~background
ramp = ndi.distance_transform_edt(background)
soft = np.clip(1 - (ramp - 0.5) / 2.5, 0, 1)
alpha = np.where(inside, 1.0, np.where(dist > tol * 0.5, soft, 0))
rgba = np.dstack([img, alpha * 255]).clip(0, 255).astype("uint8")
Image.fromarray(rgba, "RGBA").save(out)
print(f"{out}: background {bg.astype(int).tolist()}, kept {inside.mean():.0%}")
