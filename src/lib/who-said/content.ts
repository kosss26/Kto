export type Mode = "farm" | "forest" | "zoo" | "city";

export type Item = {
  id: string;
  name: string;
  mode: Mode;
};

// Корова, курица, собака и лягушка вернутся, когда для них будут войлочные игрушки (звуки уже есть в /sfx).
export const ITEMS: Item[] = [
  { id: "cat", name: "кошка", mode: "farm" },
  { id: "sheep", name: "овца", mode: "farm" },
  { id: "horse", name: "лошадь", mode: "farm" },
  { id: "pig", name: "свинья", mode: "farm" },
  { id: "duck", name: "утка", mode: "farm" },
  { id: "goat", name: "коза", mode: "farm" },
  { id: "owl", name: "сова", mode: "forest" },
  { id: "elephant", name: "слон", mode: "zoo" },
  { id: "bee", name: "пчела", mode: "forest" },
  { id: "bear", name: "медведь", mode: "forest" },
  { id: "fox", name: "лиса", mode: "forest" },
  { id: "lion", name: "лев", mode: "zoo" },
  { id: "monkey", name: "обезьяна", mode: "zoo" },
  { id: "goose", name: "гусь", mode: "farm" },
  { id: "wolf", name: "волк", mode: "forest" },
  { id: "donkey", name: "осёл", mode: "farm" },
  { id: "crow", name: "ворона", mode: "forest" },
  { id: "parrot", name: "попугай", mode: "zoo" },
  { id: "rooster", name: "петух", mode: "farm" },
  { id: "penguin", name: "пингвин", mode: "zoo" },
  { id: "tiger", name: "тигр", mode: "zoo" },
  { id: "police", name: "полицейская машина", mode: "city" },
  { id: "fire", name: "пожарная машина", mode: "city" },
  { id: "ambulance", name: "скорая помощь", mode: "city" },
  { id: "bus", name: "автобус", mode: "city" },
  { id: "train", name: "поезд", mode: "city" },
  { id: "plane", name: "самолёт", mode: "city" },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

export const MODES: { id: Mode; label: string; cover: string; parade: string[] }[] = [
  { id: "farm", label: "Домашние", cover: "pig", parade: ["sheep", "pig", "cat", "duck"] },
  { id: "forest", label: "Лесные", cover: "fox", parade: ["bear", "fox", "owl", "wolf"] },
  { id: "zoo", label: "Зоопарк", cover: "lion", parade: ["elephant", "lion", "monkey", "penguin"] },
  { id: "city", label: "Машины", cover: "bus", parade: ["bus", "police", "train", "plane"] },
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
