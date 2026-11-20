# Cuts the felt-toy sheets (up to 3x3 toys each, transparent background) into one
# clean image per toy: drops the semi-transparent noise around the toys,
# keeps only the toy itself, makes its body fully opaque.
# Usage: python3 tools/cut-felt.py assets/felt-sheets public/cards [preview.png]
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# sheet -> (rows, toys in reading order, alpha floor for the haze around toys)
SHEETS = {
    "sheet-1.png": (3, ["cat", "sheep", "horse", "pig", "duck", "goat", "owl", "elephant", "bee"], 40),
    "sheet-2.png": (3, ["bear", "fox", "lion", "monkey", "goose", "wolf", "donkey", "crow", "parrot"], 40),
    "sheet-3.png": (3, ["rooster", "penguin", "tiger", "police", "fire", "ambulance", "bus", "train", "plane"], 40),
    "sheet-4.png": (3, ["turkey", "pigeon", "sparrow", "cuckoo", "woodpecker", "nightingale", "seagull", "peacock", "cricket"], 40),
    "sheet-5.png": (2, ["rhino", "seal", "dolphin", "walrus", "otter", "orca", "gecko", "robin"], 40),
    "sheet-6.png": (2, ["crocodile", "snake", "stork", "swan", "flamingo", "ostrich"], 150),
    "sheet-7.png": (3, ["hare", "raccoon", "beaver", "badger", "giraffe", "zebra", "panda", "koala", "kangaroo"], 40),
    "sheet-8.png": (2, ["cow", "dog", "hen", "frog"], 40),
    "sheet-9.png": (3, ["rabbit", "hamster", "chinchilla", "ferret", "rat", "mouse", "gerbil", "degu", "budgie"], 40),
    "sheet-10.png": (3, ["octopus", "crab", "turtle", "seahorse", "jellyfish", "starfish", "stingray", "shark", "clownfish"], 40),
    "sheet-11.png": (2, ["guineapig", "squirrel", "deer", "moose", "boar", "hedgehog", "camel", "hippo"], 40),
    "sheet-13.png": (2, ["home-house", "home-farm", "home-forest", "home-sea", "home-hot"], 150),
    # babies («Мама и малыш»), cut with: python3 tools/cut-felt.py assets/baby-sheets public/felt
    "babies-1.png": (3, ["baby-elephant", "baby-lion", "baby-monkey", "baby-parrot", "baby-penguin", "baby-tiger", "baby-giraffe", "baby-zebra", "baby-panda"], 40),
    "babies-2.png": (3, ["baby-kangaroo", "baby-camel", "baby-hippo", "baby-rhino", "baby-seal", "baby-dolphin", "baby-walrus", "baby-otter", "baby-orca"], 150),
    "babies-3.png": (2, ["baby-crow", "baby-owl", "baby-sparrow", "baby-cuckoo", "baby-woodpecker", "baby-nightingale", "baby-seagull", "baby-turkey", "baby-robin", "baby-stork"], 150),
    "babies-4.png": (3, ["baby-octopus", "baby-crab", "baby-turtle", "baby-seahorse", "baby-jellyfish", "baby-starfish", "baby-stingray", "baby-shark", "baby-clownfish"], 200),
    "babies-5.png": (3, ["baby-frog", "baby-bee", "baby-cricket", "baby-gecko", "baby-crocodile", "baby-snake", "baby-swan", "baby-flamingo", "baby-ostrich"], 150),
    "hiding.png": (3, ["hide-bush", "hide-hay", "hide-fence", "hide-stump", "hide-spruce", "hide-rock", "hide-grass", "hide-coral", "hide-boxes"], 150),
    # new sets, cut with: python3 tools/cut-felt.py assets/new-sets public/felt
    "music.png": (3, ["drum", "trumpet", "violin", "piano", "guitar", "accordion", "xylophone", "flute", "tambourine"], 150),
    "insects.png": (3, ["grasshopper", "mosquito", "fly", "bumblebee", "ladybird", "butterfly", "dragonfly", "cicada", "beetle"], 170),
    "home.png": (3, ["doorbell", "kettle", "alarmclock", "telephone", "vacuum", "washer", "cuckooclock", "rubberduck", "toilet"], 150),
    "weather.png": (3, ["rain", "thunder", "wind", "snowman", "campfire", "waterfall", "wave", "sun", "rainbow"], 150),
    # scenes made of several pieces (a bell and its notes): pieces closer than 40 px stay together
    "tiles.png": (3, ["tile-quiz", "tile-listen", "tile-reverse", "tile-pairs", "tile-homes", "tile-hide", "tile-babies", "tile-album", "tile-mix"], 150, 40),
    "sheet-12.png": (3, ["tractor", "excavator", "bulldozer", "dumptruck", "crane", "mixer", "roller", "forklift", "combine"], 40),
}
OUT = 360
src_dir, out_dir = sys.argv[1], sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
tiles = []

for sheet, (rows, names, floor, *rest) in SHEETS.items():
    merge = rest[0] if rest else 0
    if not __import__("os").path.exists(f"{src_dir}/{sheet}"):
        continue
    img = np.array(Image.open(f"{src_dir}/{sheet}").convert("RGBA"))
    alpha = img[:, :, 3].astype(float)
    solid = alpha >= max(140, floor + 40)
    cell = img.shape[0] / rows
    solid = ndi.binary_opening(solid, iterations=2)
    if merge:
        # a scene: tiny specks go, then nearby pieces are labelled as one
        specks, n = ndi.label(solid)
        big = ndi.sum(solid, specks, range(1, n + 1)) >= 150
        solid = np.isin(specks, np.where(big)[0] + 1)
        # ...but never across the sheet's grid lines; a toy poking over a line is cut there,
        # and the small sliver left in the neighbour's cell is dropped
        cols = -(-len(names) // rows)
        lines = np.zeros_like(solid)
        for k in range(1, rows):
            lines[int(k * cell) - 1 : int(k * cell) + 1] = True
        for k in range(1, cols):
            x = int(k * img.shape[1] / cols)
            lines[:, x - 1 : x + 1] = True
        solid &= ~lines
        pieces, n = ndi.label(solid)
        size = ndi.sum(solid, pieces, range(1, n + 1))
        touch = set(np.unique(pieces[ndi.binary_dilation(lines, iterations=2)])) - {0}
        sliver = [i + 1 for i in range(n) if i + 1 in touch and size[i] < 4000]
        solid &= ~np.isin(pieces, sliver)
        grown = ndi.binary_dilation(solid, iterations=merge) & ~lines
        groups, count = ndi.label(grown)
        labels = np.where(solid, groups, 0)
    else:
        labels, count = ndi.label(solid)
    sizes = ndi.sum(solid, labels, range(1, count + 1))
    keep = np.argsort(sizes)[::-1][: len(names)] + 1
    centres = ndi.center_of_mass(solid, labels, keep)
    order = sorted(zip(keep, centres), key=lambda kc: (int(kc[1][0] // cell), kc[1][1]))
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
        a[a < floor] = 0
        core = ndi.binary_erosion(body, iterations=2)
        a = np.where(core, 255, a)
        ys, xs = np.where(a > 0)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = img[y0:y1, x0:x1].copy()
        rgba[:, :, 3] = a[y0:y1, x0:x1].clip(0, 255).astype("uint8")
        rgba[rgba[:, :, 3] == 0, :3] = 0
        toy = Image.fromarray(rgba, "RGBA")
        h, w = rgba.shape[:2]
        if merge:
            # scenes for wide tiles keep their own shape, with a small margin
            scene = Image.new("RGBA", (w + 12, h + 12), (0, 0, 0, 0))
            scene.paste(toy, (6, 6))
            scene.save(f"{out_dir}/{name}.webp", "WEBP", quality=88, method=6)
            continue
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
