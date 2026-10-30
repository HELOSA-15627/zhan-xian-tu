import type {
  FlagArtworkId,
  FlagAttachment,
  FlagAttachmentPosition,
} from "./types";

type FlagDefinition = {
  slug: string;
  englishName: string;
  chineseName: string;
};

export type FlagAsset = FlagDefinition & {
  id: FlagArtworkId;
  url: string;
};

const definitions: FlagDefinition[] = [
  { slug: "adamas", englishName: "Adamas", chineseName: "阿达马斯" },
  { slug: "amber", englishName: "Amber", chineseName: "安伯" },
  { slug: "aurelia", englishName: "Aurelia", chineseName: "奥雷利亚" },
  { slug: "belka", englishName: "Belka", chineseName: "贝尔卡" },
  { slug: "brasilium", englishName: "Brasilium", chineseName: "巴西利姆" },
  { slug: "carranza", englishName: "Carranza", chineseName: "卡兰萨" },
  { slug: "cayenne", englishName: "Cayenne", chineseName: "卡宴" },
  {
    slug: "central-sotoa",
    englishName: "Central Sotoa",
    chineseName: "中索托阿",
  },
  { slug: "comona", englishName: "Comona", chineseName: "科莫纳" },
  {
    slug: "east-clavis",
    englishName: "East Clavis",
    chineseName: "东克拉维斯",
  },
  { slug: "emmeria", englishName: "Emmeria", chineseName: "埃梅里亚" },
  { slug: "erusea", englishName: "Erusea", chineseName: "埃鲁塞亚" },
  {
    slug: "estovakia",
    englishName: "Estovakia",
    chineseName: "埃斯托瓦基亚",
  },
  { slug: "fato", englishName: "Fato", chineseName: "法托" },
  {
    slug: "central-usea",
    englishName: "Federation of Central Usea",
    chineseName: "中尤西亚联邦",
  },
  { slug: "gebet", englishName: "Gebet", chineseName: "盖贝特" },
  {
    slug: "islamic-european-union",
    englishName: "Islamic European Union",
    chineseName: "伊斯兰欧洲联盟",
  },
  { slug: "indus", englishName: "Indus", chineseName: "因杜斯" },
  { slug: "kaluga", englishName: "Kaluga", chineseName: "卡卢加" },
  {
    slug: "karabastan",
    englishName: "Karabastan",
    chineseName: "卡拉巴斯坦",
  },
  { slug: "leasath", englishName: "Leasath", chineseName: "利萨思" },
  { slug: "levant", englishName: "Levant", chineseName: "黎凡特" },
  {
    slug: "nordennavic",
    englishName: "Nordennavic",
    chineseName: "诺登纳维克",
  },
  { slug: "nordland", englishName: "Nordland", chineseName: "诺德兰" },
  { slug: "north-point", englishName: "North Point", chineseName: "北角" },
  { slug: "osea", englishName: "Osea", chineseName: "欧西亚" },
  {
    slug: "perfanesia",
    englishName: "Perfanesia",
    chineseName: "佩尔法尼西亚",
  },
  {
    slug: "rasheedi-tamudia",
    englishName: "Rasheedi Tamudia",
    chineseName: "拉希德塔穆迪亚",
  },
  { slug: "ratio", englishName: "Ratio", chineseName: "拉提奥" },
  { slug: "recta", englishName: "Recta", chineseName: "雷克塔" },
  { slug: "romny", englishName: "Romny", chineseName: "罗姆尼" },
  { slug: "san-martin", englishName: "San Martin", chineseName: "圣马丁" },
  {
    slug: "san-salvacion",
    englishName: "San Salvacion",
    chineseName: "圣萨尔瓦西翁",
  },
  { slug: "sapin", englishName: "Sapin", chineseName: "萨平" },
  { slug: "serica", englishName: "Serica", chineseName: "塞里卡" },
  { slug: "sotoa", englishName: "Sotoa", chineseName: "索托阿" },
  { slug: "south-sotoa", englishName: "South Sotoa", chineseName: "南索托阿" },
  { slug: "ugellas", englishName: "Ugellas", chineseName: "乌格拉斯" },
  { slug: "ustio", englishName: "Ustio", chineseName: "乌斯提奥" },
  { slug: "valga", englishName: "Valga", chineseName: "瓦尔加" },
  { slug: "valverde", englishName: "Valverde", chineseName: "巴尔韦德" },
  { slug: "vedia", englishName: "Vedia", chineseName: "维迪亚" },
  { slug: "verusa", englishName: "Verusa", chineseName: "维鲁萨" },
  { slug: "wellow", englishName: "Wellow", chineseName: "韦洛" },
  {
    slug: "west-clavis",
    englishName: "West Clavis",
    chineseName: "西克拉维斯",
  },
  { slug: "wielvakia", englishName: "Wielvakia", chineseName: "维尔瓦基亚" },
  {
    slug: "yuktobania",
    englishName: "Yuktobania",
    chineseName: "尤克托巴尼亚",
  },
];

const flagImages = import.meta.glob("../assets/flags/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

export const FLAG_ASSETS: FlagAsset[] = definitions.map((definition) => {
  const id = `flag-${definition.slug}` as FlagArtworkId;
  return {
    ...definition,
    id,
    url: flagImages[`../assets/flags/${id}.png`] ?? "",
  };
});

export const FLAG_ASSETS_BY_ID = new Map(
  FLAG_ASSETS.map((flag) => [flag.id, flag]),
);

export const FLAG_ATTACHMENT_POSITIONS: Array<{
  value: FlagAttachmentPosition;
  label: string;
}> = [
  { value: "top", label: "上方" },
  { value: "right", label: "右侧" },
  { value: "bottom", label: "下方" },
  { value: "left", label: "左侧" },
  { value: "center", label: "中心" },
];

export const DEFAULT_FLAG_ATTACHMENT_SIZE = 36;
export const MIN_FLAG_ATTACHMENT_SIZE = 12;
export const MAX_FLAG_ATTACHMENT_SIZE = 120;

export function defaultFlagArtwork(): FlagArtworkId {
  return "flag-adamas";
}

export function flagArtworkAssetFor(id: FlagArtworkId): string {
  return FLAG_ASSETS_BY_ID.get(id)?.url ?? "";
}

export function flagArtworkName(id: FlagArtworkId): string {
  return FLAG_ASSETS_BY_ID.get(id)?.chineseName ?? "国旗";
}

export function isFlagArtwork(value: unknown): value is FlagArtworkId {
  return (
    typeof value === "string" &&
    value.startsWith("flag-") &&
    FLAG_ASSETS_BY_ID.has(value as FlagArtworkId)
  );
}

export function normalizeFlagAttachment(
  value: unknown,
): FlagAttachment | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!isFlagArtwork(candidate.artwork)) return undefined;
  const position = FLAG_ATTACHMENT_POSITIONS.some(
    (option) => option.value === candidate.position,
  )
    ? (candidate.position as FlagAttachmentPosition)
    : "top";
  const size =
    typeof candidate.size === "number" && Number.isFinite(candidate.size)
      ? candidate.size
      : DEFAULT_FLAG_ATTACHMENT_SIZE;

  return {
    artwork: candidate.artwork,
    position,
    size: Math.min(
      MAX_FLAG_ATTACHMENT_SIZE,
      Math.max(MIN_FLAG_ATTACHMENT_SIZE, size),
    ),
  };
}
