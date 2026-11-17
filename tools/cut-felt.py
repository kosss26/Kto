# Cuts the felt-toy sheets (3x3 toys each, transparent background) into one
# clean image per toy: drops the semi-transparent noise around the toys,
# keeps only the toy itself, makes its body fully opaque.
# Usage: python3 tools/cut-felt.py assets/felt-sheets public/cards [preview.png]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEETS = {
    "sheet-1.png": ["cat", "sheep", "horse", "pig", "duck", "goat", "owl", "elephant", "bee"],
    "sheet-2.png": ["bear", "fox", "lion", "monkey", "goose", "wolf", "donkey", "crow", "parrot"],
    "sheet-3.png": ["rooster", "penguin", "tiger", "police", "fire", "ambulance", "bus", "train", "plane"],
}
OUT = 360
src_dir, out_dir = sys.argv[1], sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
tiles = []

for sheet, names in SHEETS.items():
    img = np.array(Image.open(f"{src_dir}/{sheet}").convert("RGBA"))
    alpha = img[:, :, 3].astype(float)
    solid = alpha >= 140
    solid = ndi.binary_opening(solid, iterations=2)
    labels, count = ndi.label(solid)
    sizes = ndi.sum(solid, labels, range(1, count + 1))
    keep = np.argsort(sizes)[::-1][:9] + 1
    centres = ndi.center_of_mass(solid, labels, keep)
    order = sorted(zip(keep, centres), key=lambda kc: (int(kc[1][0] // 418), kc[1][1]))
    for (lab, _), name in zip(order, names):
        body = labels == lab
        # small pin-holes inside the toy are filled; real gaps (between legs) stay open
        holes = ndi.binary_fill_holes(body) & ~body
        hl, hn = ndi.label(holes)
        if hn:
            hsize = ndi.sum(holes, hl, range(1, hn + 1))
            small = np.isin(hl, np.where(hsize < 60)[0] + 1)
            body = body | small
        reach = ndi.binary_dilation(body, iterations=3)
        a = np.where(reach, alpha, 0)
        a[a < 40] = 0
        core = ndi.binary_erosion(body, iterations=2)
        a = np.where(core, 255, a)
        ys, xs = np.where(a > 0)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = img[y0:y1, x0:x1].copy()
        rgba[:, :, 3] = a[y0:y1, x0:x1].clip(0, 255).astype("uint8")
        rgba[rgba[:, :, 3] == 0, :3] = 0
        toy = Image.fromarray(rgba, "RGBA")
        h, w = rgba.shape[:2]
        side = int(max(h, w) * 1.1)
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(toy, ((side - w) // 2, (side - h) // 2))
        canvas = canvas.resize((OUT, OUT), Image.LANCZOS)
        canvas.save(f"{out_dir}/{name}.webp", "WEBP", quality=88, method=6)
        tiles.append(canvas)

if preview:
    cols = 9
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGBA", (OUT * cols, OUT * rows), (60, 45, 70, 255))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, ((i % cols) * OUT, (i // cols) * OUT))
    sheet.convert("RGB").resize((OUT * cols // 3, OUT * rows // 3)).save(preview)
