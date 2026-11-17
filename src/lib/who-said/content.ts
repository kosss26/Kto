export type Mode = "animals" | "transport";

export type Item = {
  id: string;
  name: string;
  mode: Mode;
};

// Корова, курица, собака и лягушка вернутся, когда для них будут войлочные игрушки (звуки уже есть в /sfx).
export const ITEMS: Item[] = [
  { id: "cat", name: "кошка", mode: "animals" },
  { id: "sheep", name: "овца", mode: "animals" },
  { id: "horse", name: "лошадь", mode: "animals" },
  { id: "pig", name: "свинья", mode: "animals" },
  { id: "duck", name: "утка", mode: "animals" },
  { id: "goat", name: "коза", mode: "animals" },
  { id: "owl", name: "сова", mode: "animals" },
  { id: "elephant", name: "слон", mode: "animals" },
  { id: "bee", name: "пчела", mode: "animals" },
  { id: "bear", name: "медведь", mode: "animals" },
  { id: "fox", name: "лиса", mode: "animals" },
  { id: "lion", name: "лев", mode: "animals" },
  { id: "monkey", name: "обезьяна", mode: "animals" },
  { id: "goose", name: "гусь", mode: "animals" },
  { id: "wolf", name: "волк", mode: "animals" },
  { id: "donkey", name: "осёл", mode: "animals" },
  { id: "crow", name: "ворона", mode: "animals" },
  { id: "parrot", name: "попугай", mode: "animals" },
  { id: "rooster", name: "петух", mode: "animals" },
  { id: "penguin", name: "пингвин", mode: "animals" },
  { id: "tiger", name: "тигр", mode: "animals" },
  { id: "police", name: "полицейская машина", mode: "transport" },
  { id: "fire", name: "пожарная машина", mode: "transport" },
  { id: "ambulance", name: "скорая помощь", mode: "transport" },
  { id: "bus", name: "автобус", mode: "transport" },
  { id: "train", name: "поезд", mode: "transport" },
  { id: "plane", name: "самолёт", mode: "transport" },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

export const MODES: { id: Mode; label: string; cover: string }[] = [
  { id: "animals", label: "Животные", cover: "pig" },
  { id: "transport", label: "Машины", cover: "bus" },
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
