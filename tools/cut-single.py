# Cleans single toy PNGs (one toy per file, transparent background with haze around it)
# into the game's 360x360 WebP format. File → id map comes from manifest.json (adult_ids[0]).
# Usage: python3 tools/cut-single.py assets/baby-singles public/felt baby-
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = 360
for entry in json.load(open(f"{src}/manifest.json", encoding="utf-8")):
    img = np.array(Image.open(f"{src}/{entry['file']}").convert("RGBA"))
    alpha = img[:, :, 3].astype(float)
    solid = ndi.binary_opening(alpha >= 160, iterations=2)
    labels, n = ndi.label(solid)
    sizes = ndi.sum(solid, labels, range(1, n + 1))
    body = labels == (int(np.argmax(sizes)) + 1)
    holes = ndi.binary_fill_holes(body) & ~body
    hl, hn = ndi.label(holes)
    if hn:
        hs = ndi.sum(holes, hl, range(1, hn + 1))
        body |= np.isin(hl, np.where(hs < 60)[0] + 1)
    reach = ndi.binary_dilation(body, iterations=3)
    a = np.where(reach, alpha, 0)
    a[a < 120] = 0
    a = np.where(ndi.binary_erosion(body, iterations=2), 255, a)
    ys, xs = np.where(a > 0)
    rgba = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    rgba[:, :, 3] = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype("uint8")
    rgba[rgba[:, :, 3] == 0, :3] = 0
    h, w = rgba.shape[:2]
    side = int(max(h, w) * 1.1)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(rgba, "RGBA"), ((side - w) // 2, (side - h) // 2))
    canvas.resize((OUT, OUT), Image.LANCZOS).save(f"{out}/{prefix}{entry['adult_ids'][0]}.webp", "WEBP", quality=88, method=6)
    print(entry["adult_ids"][0], entry["baby_name_ru"])
