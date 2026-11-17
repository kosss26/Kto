export type Mode = "farm" | "pets" | "forest" | "zoo" | "sea" | "city";

export type Item = {
  id: string;
  /** Shown on the plate and spoken by the voice. */
  name: string;
  mode: Mode;
  /** true: a real recording of its call (/sfx). Otherwise the voice asks "Где …?". */
  sound?: boolean;
};

export const ITEMS: Item[] = [
  { id: "cat", name: "кошка", mode: "farm", sound: true },
  { id: "dog", name: "собака", mode: "farm", sound: true },
  { id: "cow", name: "корова", mode: "farm", sound: true },
  { id: "pig", name: "свинья", mode: "farm", sound: true },
  { id: "sheep", name: "овца", mode: "farm", sound: true },
  { id: "goat", name: "коза", mode: "farm", sound: true },
  { id: "horse", name: "лошадь", mode: "farm", sound: true },
  { id: "donkey", name: "осёл", mode: "farm", sound: true },
  { id: "hen", name: "курица", mode: "farm", sound: true },
  { id: "rooster", name: "петух", mode: "farm", sound: true },
  { id: "duck", name: "утка", mode: "farm", sound: true },
  { id: "goose", name: "гусь", mode: "farm", sound: true },
  { id: "turkey", name: "индюк", mode: "farm", sound: true },
  { id: "pigeon", name: "голубь", mode: "farm", sound: true },
  { id: "sparrow", name: "воробей", mode: "farm", sound: true },
  { id: "rabbit", name: "кролик", mode: "pets" },
  { id: "hamster", name: "хомяк", mode: "pets" },
  { id: "guineapig", name: "морская свинка", mode: "pets" },
  { id: "chinchilla", name: "шиншилла", mode: "pets" },
  { id: "ferret", name: "хорёк", mode: "pets" },
  { id: "rat", name: "крыса", mode: "pets" },
  { id: "mouse", name: "мышка", mode: "pets" },
  { id: "gerbil", name: "песчанка", mode: "pets" },
  { id: "degu", name: "дегу", mode: "pets" },
  { id: "budgie", name: "попугайчик", mode: "pets" },
  { id: "bear", name: "медведь", mode: "forest", sound: true },
  { id: "fox", name: "лиса", mode: "forest", sound: true },
  { id: "wolf", name: "волк", mode: "forest", sound: true },
  { id: "owl", name: "сова", mode: "forest", sound: true },
  { id: "crow", name: "ворона", mode: "forest", sound: true },
  { id: "bee", name: "пчела", mode: "forest", sound: true },
  { id: "frog", name: "лягушка", mode: "forest", sound: true },
  { id: "cuckoo", name: "кукушка", mode: "forest", sound: true },
  { id: "woodpecker", name: "дятел", mode: "forest", sound: true },
  { id: "nightingale", name: "соловей", mode: "forest", sound: true },
  { id: "robin", name: "малиновка", mode: "forest", sound: true },
  { id: "hare", name: "заяц", mode: "forest" },
  { id: "squirrel", name: "белка", mode: "forest" },
  { id: "hedgehog", name: "ёжик", mode: "forest" },
  { id: "deer", name: "олень", mode: "forest" },
  { id: "moose", name: "лось", mode: "forest" },
  { id: "boar", name: "кабан", mode: "forest" },
  { id: "raccoon", name: "енот", mode: "forest" },
  { id: "beaver", name: "бобр", mode: "forest" },
  { id: "badger", name: "барсук", mode: "forest" },
  { id: "cricket", name: "сверчок", mode: "forest" },
  { id: "swan", name: "лебедь", mode: "forest" },
  { id: "stork", name: "аист", mode: "forest" },
  { id: "elephant", name: "слон", mode: "zoo", sound: true },
  { id: "lion", name: "лев", mode: "zoo", sound: true },
  { id: "tiger", name: "тигр", mode: "zoo", sound: true },
  { id: "monkey", name: "обезьяна", mode: "zoo", sound: true },
  { id: "parrot", name: "попугай", mode: "zoo", sound: true },
  { id: "giraffe", name: "жираф", mode: "zoo" },
  { id: "zebra", name: "зебра", mode: "zoo" },
  { id: "rhino", name: "носорог", mode: "zoo" },
  { id: "hippo", name: "бегемот", mode: "zoo" },
  { id: "camel", name: "верблюд", mode: "zoo" },
  { id: "kangaroo", name: "кенгуру", mode: "zoo" },
  { id: "koala", name: "коала", mode: "zoo" },
  { id: "panda", name: "панда", mode: "zoo" },
  { id: "crocodile", name: "крокодил", mode: "zoo" },
  { id: "snake", name: "змея", mode: "zoo" },
  { id: "flamingo", name: "фламинго", mode: "zoo" },
  { id: "ostrich", name: "страус", mode: "zoo" },
  { id: "peacock", name: "павлин", mode: "zoo" },
  { id: "gecko", name: "ящерица", mode: "zoo" },
  { id: "penguin", name: "пингвин", mode: "sea", sound: true },
  { id: "seagull", name: "чайка", mode: "sea", sound: true },
  { id: "dolphin", name: "дельфин", mode: "sea" },
  { id: "orca", name: "косатка", mode: "sea" },
  { id: "seal", name: "тюлень", mode: "sea" },
  { id: "walrus", name: "морж", mode: "sea" },
  { id: "otter", name: "выдра", mode: "sea" },
  { id: "octopus", name: "осьминог", mode: "sea" },
  { id: "crab", name: "краб", mode: "sea" },
  { id: "turtle", name: "черепаха", mode: "sea" },
  { id: "seahorse", name: "морской конёк", mode: "sea" },
  { id: "jellyfish", name: "медуза", mode: "sea" },
  { id: "starfish", name: "морская звезда", mode: "sea" },
  { id: "stingray", name: "скат", mode: "sea" },
  { id: "shark", name: "акула", mode: "sea" },
  { id: "clownfish", name: "рыбка-клоун", mode: "sea" },
  { id: "police", name: "полиция", mode: "city" },
  { id: "fire", name: "пожарная машина", mode: "city" },
  { id: "ambulance", name: "скорая помощь", mode: "city" },
  { id: "bus", name: "автобус", mode: "city" },
  { id: "train", name: "поезд", mode: "city" },
  { id: "plane", name: "самолёт", mode: "city" },
  { id: "tractor", name: "трактор", mode: "city" },
  { id: "excavator", name: "экскаватор", mode: "city" },
  { id: "bulldozer", name: "бульдозер", mode: "city" },
  { id: "dumptruck", name: "самосвал", mode: "city" },
  { id: "crane", name: "кран", mode: "city" },
  { id: "mixer", name: "бетономешалка", mode: "city" },
  { id: "roller", name: "каток", mode: "city" },
  { id: "forklift", name: "погрузчик", mode: "city" },
  { id: "combine", name: "комбайн", mode: "city" },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

export const MODES: { id: Mode; label: string; cover: string; parade: string[] }[] = [
  { id: "farm", label: "Домашние", cover: "cow", parade: ["sheep", "pig", "cow", "duck"] },
  { id: "pets", label: "Питомцы", cover: "hamster", parade: ["rabbit", "hamster", "guineapig", "budgie"] },
  { id: "forest", label: "Лесные", cover: "fox", parade: ["hedgehog", "fox", "bear", "squirrel"] },
  { id: "zoo", label: "Зоопарк", cover: "giraffe", parade: ["elephant", "giraffe", "lion", "zebra"] },
  { id: "sea", label: "Море", cover: "dolphin", parade: ["turtle", "octopus", "dolphin", "crab"] },
  { id: "city", label: "Машины", cover: "excavator", parade: ["tractor", "bus", "excavator", "train"] },
];

export function idsFor(mode: Mode) {
  return ITEMS.filter((item) => item.mode === mode).map((item) => item.id);
}

export function cardSrc(id: string) {
  return `/felt/${id}.webp`;
}

/** Pastel felt colours for the card mats; cards in one round never share a colour. */
export const MATS = ["#bfe3a5", "#ffd9a8", "#bfe0f5", "#f7c9dc", "#fff0a6", "#d8cdf5"];

export function matAt(index: number, round: number) {
  return MATS[(index + round * 2) % MATS.length];
}

/** What the child hears as the riddle: the animal's own call, or the voice asking for it. */
export function callSrc(id: string) {
  return BY_ID[id].sound ? `/sfx/${id}.mp3` : `/voice/where-${id}.mp3`;
}

/** Voice naming the toy after a right answer. */
export function nameSrc(id: string) {
  return `/voice/this-${id}.mp3`;
}

export const VOICE = { bravo: "/voice/bravo.mp3", again: "/voice/again.mp3" };

/** Every clip one set needs: riddles, names, praise. */
export function clipsFor(mode: Mode) {
  const ids = idsFor(mode);
  return [...ids.map(callSrc), ...ids.map(nameSrc), VOICE.bravo, VOICE.again];
}
