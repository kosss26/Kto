export type Mode = "farm" | "pets" | "forest" | "zoo" | "sea" | "city";
/** A set on the start screen: one of the six, or everything shuffled together. */
export type SetId = Mode | "mix";

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
  { id: "guineapig", name: "морская свинка", mode: "pets", sound: true },
  { id: "chinchilla", name: "шиншилла", mode: "pets" },
  { id: "ferret", name: "хорёк", mode: "pets" },
  { id: "rat", name: "крыса", mode: "pets", sound: true },
  { id: "mouse", name: "мышка", mode: "pets" },
  { id: "gerbil", name: "песчанка", mode: "pets" },
  { id: "degu", name: "дегу", mode: "pets" },
  { id: "budgie", name: "попугайчик", mode: "pets", sound: true },
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
  { id: "squirrel", name: "белка", mode: "forest", sound: true },
  { id: "hedgehog", name: "ёжик", mode: "forest", sound: true },
  { id: "deer", name: "олень", mode: "forest", sound: true },
  { id: "moose", name: "лось", mode: "forest", sound: true },
  { id: "boar", name: "кабан", mode: "forest", sound: true },
  { id: "raccoon", name: "енот", mode: "forest" },
  { id: "beaver", name: "бобр", mode: "forest" },
  { id: "badger", name: "барсук", mode: "forest" },
  { id: "cricket", name: "сверчок", mode: "forest", sound: true },
  { id: "swan", name: "лебедь", mode: "forest", sound: true },
  { id: "stork", name: "аист", mode: "forest", sound: true },
  { id: "elephant", name: "слон", mode: "zoo", sound: true },
  { id: "lion", name: "лев", mode: "zoo", sound: true },
  { id: "tiger", name: "тигр", mode: "zoo", sound: true },
  { id: "monkey", name: "обезьяна", mode: "zoo", sound: true },
  { id: "parrot", name: "попугай", mode: "zoo", sound: true },
  { id: "giraffe", name: "жираф", mode: "zoo" },
  { id: "zebra", name: "зебра", mode: "zoo", sound: true },
  { id: "rhino", name: "носорог", mode: "zoo" },
  { id: "hippo", name: "бегемот", mode: "zoo", sound: true },
  { id: "camel", name: "верблюд", mode: "zoo", sound: true },
  { id: "kangaroo", name: "кенгуру", mode: "zoo" },
  { id: "koala", name: "коала", mode: "zoo", sound: true },
  { id: "panda", name: "панда", mode: "zoo" },
  { id: "crocodile", name: "крокодил", mode: "zoo" },
  { id: "snake", name: "змея", mode: "zoo", sound: true },
  { id: "flamingo", name: "фламинго", mode: "zoo", sound: true },
  { id: "ostrich", name: "страус", mode: "zoo", sound: true },
  { id: "peacock", name: "павлин", mode: "zoo", sound: true },
  { id: "gecko", name: "ящерица", mode: "zoo", sound: true },
  { id: "penguin", name: "пингвин", mode: "sea", sound: true },
  { id: "seagull", name: "чайка", mode: "sea", sound: true },
  { id: "dolphin", name: "дельфин", mode: "sea", sound: true },
  { id: "orca", name: "косатка", mode: "sea", sound: true },
  { id: "seal", name: "тюлень", mode: "sea", sound: true },
  { id: "walrus", name: "морж", mode: "sea" },
  { id: "otter", name: "выдра", mode: "sea", sound: true },
  { id: "octopus", name: "осьминог", mode: "sea" },
  { id: "crab", name: "краб", mode: "sea" },
  { id: "turtle", name: "черепаха", mode: "sea" },
  { id: "seahorse", name: "морской конёк", mode: "sea" },
  { id: "jellyfish", name: "медуза", mode: "sea" },
  { id: "starfish", name: "морская звезда", mode: "sea" },
  { id: "stingray", name: "скат", mode: "sea" },
  { id: "shark", name: "акула", mode: "sea" },
  { id: "clownfish", name: "рыбка-клоун", mode: "sea" },
  { id: "police", name: "полиция", mode: "city", sound: true },
  { id: "fire", name: "пожарная машина", mode: "city", sound: true },
  { id: "ambulance", name: "скорая помощь", mode: "city", sound: true },
  { id: "bus", name: "автобус", mode: "city", sound: true },
  { id: "train", name: "поезд", mode: "city", sound: true },
  { id: "plane", name: "самолёт", mode: "city", sound: true },
  { id: "tractor", name: "трактор", mode: "city", sound: true },
  { id: "excavator", name: "экскаватор", mode: "city" },
  { id: "bulldozer", name: "бульдозер", mode: "city" },
  { id: "dumptruck", name: "самосвал", mode: "city" },
  { id: "crane", name: "кран", mode: "city" },
  { id: "mixer", name: "бетономешалка", mode: "city" },
  { id: "roller", name: "каток", mode: "city" },
  { id: "forklift", name: "погрузчик", mode: "city" },
  { id: "combine", name: "комбайн", mode: "city" },
];

/** One short fact the voice tells after a right answer. */
export const FACTS: Record<string, string> = {
  cat: "Кошка мурлычет, когда ей хорошо.",
  dog: "Собака — верный друг человека.",
  cow: "Корова даёт молоко.",
  pig: "Свинка любит валяться в грязи.",
  sheep: "Из шерсти овечки вяжут тёплые свитера.",
  goat: "Коза ловко лазает по горам.",
  horse: "Лошадь быстро скачет.",
  donkey: "Ослик возит тяжёлые грузы.",
  hen: "Курица несёт яички.",
  rooster: "Петух будит всех по утрам.",
  duck: "Утка плавает в пруду.",
  goose: "Гусь громко гогочет.",
  turkey: "Индюк распускает хвост веером.",
  pigeon: "Голуби живут рядом с людьми в городе.",
  sparrow: "Воробей весело прыгает по земле.",
  rabbit: "Кролик любит морковку.",
  hamster: "Хомяк прячет еду за щёки.",
  guineapig: "Морская свинка громко свистит, когда хочет кушать.",
  chinchilla: "Шиншилла очень мягкая и пушистая.",
  ferret: "Хорёк любит играть и прятаться.",
  rat: "Крыса очень умная.",
  mouse: "Мышка живёт в маленькой норке.",
  gerbil: "Песчанка роет норки в песке.",
  degu: "Дегу любит грызть веточки.",
  budgie: "Попугайчик умеет повторять слова.",
  bear: "Медведь зимой спит в берлоге.",
  fox: "У лисы пушистый рыжий хвост.",
  wolf: "Волк воет на луну.",
  owl: "Сова не спит ночью.",
  crow: "Ворона очень умная птица.",
  bee: "Пчела делает мёд.",
  frog: "Лягушка ловит комаров.",
  cuckoo: "Кукушка кричит «ку-ку».",
  woodpecker: "Дятел стучит клювом по дереву.",
  nightingale: "Соловей очень красиво поёт.",
  robin: "У малиновки красная грудка.",
  hare: "Заяц быстро бегает и далеко прыгает.",
  squirrel: "Белка собирает орешки на зиму.",
  hedgehog: "У ёжика колючие иголки.",
  deer: "У оленя большие ветвистые рога.",
  moose: "Лось — самый большой олень.",
  boar: "Кабан роет землю носом.",
  raccoon: "Енот полощет еду в воде.",
  beaver: "Бобр строит плотины из веток.",
  badger: "Барсук живёт в глубокой норе.",
  cricket: "Сверчок стрекочет тёплыми вечерами.",
  swan: "Лебедь плавает по озеру.",
  stork: "Аист вьёт гнездо на крыше.",
  elephant: "У слона длинный хобот.",
  lion: "Лев — царь зверей.",
  tiger: "У тигра полосатая шубка.",
  monkey: "Обезьяна любит бананы.",
  parrot: "Попугай умеет говорить.",
  giraffe: "У жирафа очень длинная шея.",
  zebra: "Зебра в чёрно-белую полоску.",
  rhino: "У носорога рог прямо на носу.",
  hippo: "Бегемот любит купаться.",
  camel: "Верблюд живёт в пустыне.",
  kangaroo: "Кенгуру носит малыша в сумке.",
  koala: "Коала ест листья эвкалипта.",
  panda: "Панда ест бамбук.",
  crocodile: "У крокодила очень много зубов.",
  snake: "Змея ползает без ног.",
  flamingo: "Фламинго любит стоять на одной ноге.",
  ostrich: "Страус — самая большая птица.",
  peacock: "У павлина красивый хвост.",
  gecko: "Ящерица любит греться на солнышке.",
  penguin: "Пингвин не летает, а плавает.",
  seagull: "Чайка летает над морем.",
  dolphin: "Дельфин очень умный.",
  orca: "Косатка чёрно-белая и очень сильная.",
  seal: "Тюлень отдыхает на льдинах.",
  walrus: "У моржа длинные клыки.",
  otter: "Выдра любит плавать на спинке.",
  octopus: "У осьминога восемь ног.",
  crab: "Краб ходит боком.",
  turtle: "Черепаха носит домик на спине.",
  seahorse: "Морской конёк плавает стоя.",
  jellyfish: "Медуза прозрачная, как желе.",
  starfish: "У морской звезды пять лучей.",
  stingray: "Скат плоский, как блинчик.",
  shark: "У акулы острые зубы.",
  clownfish: "Рыбка-клоун оранжевая с белыми полосками.",
  police: "Полиция следит за порядком.",
  fire: "Пожарные тушат огонь.",
  ambulance: "Скорая помощь спешит к больным.",
  bus: "Автобус возит людей.",
  train: "Поезд едет по рельсам.",
  plane: "Самолёт летает высоко в небе.",
  tractor: "Трактор работает в поле.",
  excavator: "Экскаватор копает ямы ковшом.",
  bulldozer: "Бульдозер двигает землю.",
  dumptruck: "Самосвал возит песок.",
  crane: "Кран поднимает тяжёлые грузы.",
  mixer: "Бетономешалка мешает бетон.",
  roller: "Каток делает дорогу ровной.",
  forklift: "Погрузчик поднимает тяжёлые коробки.",
  combine: "Комбайн собирает урожай.",
};

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

export const MODES: { id: Mode; label: string; cover: string; parade: string[] }[] = [
  { id: "farm", label: "Домашние", cover: "cow", parade: ["sheep", "pig", "cow", "duck"] },
  {
    id: "pets",
    label: "Питомцы",
    cover: "hamster",
    parade: ["rabbit", "hamster", "guineapig", "budgie"],
  },
  { id: "forest", label: "Лесные", cover: "fox", parade: ["hedgehog", "fox", "bear", "squirrel"] },
  {
    id: "zoo",
    label: "Зоопарк",
    cover: "giraffe",
    parade: ["elephant", "giraffe", "lion", "zebra"],
  },
  { id: "sea", label: "Море", cover: "dolphin", parade: ["turtle", "octopus", "dolphin", "crab"] },
  {
    id: "city",
    label: "Машины",
    cover: "excavator",
    parade: ["tractor", "bus", "excavator", "train"],
  },
];

export const MIX = {
  label: "Вперемешку",
  covers: ["cow", "giraffe", "dolphin", "excavator"],
  parade: ["hamster", "giraffe", "octopus", "tractor"],
};

export function idsFor(set: SetId) {
  return ITEMS.filter((item) => set === "mix" || item.mode === set).map((item) => item.id);
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

/** Voice telling the fact. */
export function factSrc(id: string) {
  return `/voice/fact-${id}.mp3`;
}

/** Voice naming the toy after a right answer. */
export function nameSrc(id: string) {
  return `/voice/this-${id}.mp3`;
}

export const VOICE = { bravo: "/voice/bravo.mp3", again: "/voice/again.mp3" };

/** Every clip one set needs: riddles, names, praise. The mix loads round by round instead. */
export function clipsFor(set: SetId) {
  if (set === "mix") return [VOICE.bravo, VOICE.again];
  const ids = idsFor(set);
  return [...ids.map(callSrc), ...ids.map(nameSrc), ...ids.map(factSrc), VOICE.bravo, VOICE.again];
}

export function roundClips(ids: string[]) {
  return [...ids.map(callSrc), ...ids.map(nameSrc), ...ids.map(factSrc)];
}

// ---------- «Кто где живёт» ----------

export type HomeId = "house" | "farm" | "forest" | "sea" | "hot";

export const HOMES: { id: HomeId; label: string; mat: string }[] = [
  { id: "house", label: "Дом", mat: "#f7c9dc" },
  { id: "farm", label: "Ферма", mat: "#ffd9a8" },
  { id: "forest", label: "Лес", mat: "#bfe3a5" },
  { id: "sea", label: "Море", mat: "#bfe0f5" },
  { id: "hot", label: "Жаркие страны", mat: "#fff0a6" },
];

const HOME_OF_MODE: Partial<Record<Mode, HomeId>> = {
  pets: "house",
  farm: "farm",
  forest: "forest",
  sea: "sea",
  zoo: "hot",
};

/** Panda lives in cool mountain forests, so it sits this game out. */
export function homeOf(id: string): HomeId | null {
  if (id === "panda") return null;
  return HOME_OF_MODE[BY_ID[id].mode] ?? null;
}

export const HOME_IDS = ITEMS.map((item) => item.id).filter((id) => homeOf(id));

export const homeAskSrc = (id: string) => `/voice/homeq-${id}.mp3`;
export const livesSrc = (id: string) => `/voice/lives-${id}.mp3`;

// ---------- «Наоборот» ----------

/** Toys with a real recording: only they can be guessed by voice in reverse. */
export function soundIdsFor(set: SetId) {
  return idsFor(set).filter((id) => BY_ID[id].sound);
}

export const howSrc = (id: string) => `/voice/how-${id}.mp3`;

export const PRAISE = [
  "/voice/praise-1.mp3",
  "/voice/praise-2.mp3",
  "/voice/praise-3.mp3",
  "/voice/praise-4.mp3",
];

export function praiseSrc() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}
