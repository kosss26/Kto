# Turns every felt toy into a die-cut sticker: thick white border following the
# silhouette, a soft drop shadow and a diagonal gloss.
# Usage: python3 tools/make-stickers.py public/felt public/stickers [preview.png]
import glob, os, sys
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy import ndimage as ndi

SRC, OUT = sys.argv[1], sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
SIZE = 360
os.makedirs(OUT, exist_ok=True)
tiles = []

for path in sorted(glob.glob(f"{SRC}/*.webp")):
    name = os.path.basename(path)[:-5]
    if name.startswith("home-"):
        continue
    toy = Image.open(path).convert("RGBA")
    # work on a padded canvas so the border never touches the edge
    pad = 40
    big = Image.new("RGBA", (toy.width + 2 * pad, toy.height + 2 * pad), (0, 0, 0, 0))
    big.alpha_composite(toy, (pad, pad))
    a = np.array(big)[:, :, 3]
    solid = a > 90
    solid = ndi.binary_fill_holes(ndi.binary_closing(solid, iterations=6))
    # border ≈ 6% of the toy size, rounded corners via a disc structuring element
    r = max(8, int(0.055 * max(toy.size)))
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    disc = xx * xx + yy * yy <= r * r
    border = ndi.binary_dilation(solid, structure=disc)
    border = ndi.binary_fill_holes(border)
    bmask = Image.fromarray((border * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.2))

    sticker = Image.new("RGBA", big.size, (0, 0, 0, 0))
    # shadow
    shadow = Image.new("RGBA", big.size, (60, 40, 70, 0))
    shadow.putalpha(bmask.point(lambda v: v * 0.35).filter(ImageFilter.GaussianBlur(7)))
    sticker.alpha_composite(shadow, (0, 6))
    # white paper with a faint edge line
    paper = Image.new("RGBA", big.size, (255, 255, 255, 0))
    paper.putalpha(bmask)
    sticker.alpha_composite(paper)
    edge = Image.new("RGBA", big.size, (200, 190, 215, 0))
    inner = bmask.filter(ImageFilter.MinFilter(3))
    edge.putalpha(ImageChops.subtract(bmask, inner).point(lambda v: v * 0.6))
    sticker.alpha_composite(edge)
    # the toy
    sticker.alpha_composite(big)
    # diagonal gloss, clipped to the sticker
    gloss = Image.new("L", big.size, 0)
    d = ImageDraw.Draw(gloss)
    w, h = big.size
    d.polygon([(0, int(h * 0.05)), (int(w * 0.55), 0), (0, int(h * 0.55))], fill=70)
    gloss = gloss.filter(ImageFilter.GaussianBlur(18))
    gloss = ImageChops.multiply(gloss, bmask)
    shine = Image.new("RGBA", big.size, (255, 255, 255, 0))
    shine.putalpha(gloss)
    sticker.alpha_composite(shine)

    bbox = sticker.getbbox()
    sticker = sticker.crop(bbox)
    side = max(sticker.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(sticker, ((side - sticker.width) // 2, (side - sticker.height) // 2))
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    sq.save(f"{OUT}/{name}.webp", "WEBP", quality=86, method=6)
    tiles.append(sq)

if preview:
    cols = 10
    T = 180
    rows = (len(tiles) + cols - 1) // cols
    s = Image.new("RGBA", (T * cols, T * rows), (191, 224, 245, 255))
    for i, t in enumerate(tiles):
        s.alpha_composite(t.resize((T, T)), ((i % cols) * T, (i // cols) * T))
    s.convert("RGB").save(preview)
print(len(tiles), "stickers")
