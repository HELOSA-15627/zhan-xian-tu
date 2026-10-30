import type {
  MarkerArtworkId,
  NatoArtworkId,
  TacticalSymbol,
  UnitAffiliation,
  UnitArtworkId,
} from "./types";

export const UNIT_TINTS: UnitAffiliation[] = [
  "friendly",
  "hostile",
  "objective",
];

export const AFFILIATION_COLORS: Record<UnitAffiliation, string> = {
  friendly: "#92cf00",
  hostile: "#9b351f",
  objective: "#00d9e0",
};

export const AFFILIATION_LABELS: Record<UnitAffiliation, string> = {
  friendly: "友军",
  hostile: "敌军",
  objective: "目标",
};

type UnitAssetDefinition = {
  id: UnitArtworkId;
  label: string;
  shortLabel: string;
  kind: "unit" | "target" | "arrow";
  defaultAffiliation: UnitAffiliation;
  symbol: TacticalSymbol;
  sourceLayer: number;
};

const definitions: UnitAssetDefinition[] = [
  {
    id: "friendly-fighter",
    label: "战斗机",
    shortLabel: "F-01",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "aviation",
    sourceLayer: 1,
  },
  {
    id: "hostile-fighter",
    label: "飞行体",
    shortLabel: "E-01",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 2,
  },
  {
    id: "friendly-naval",
    label: "舰艇",
    shortLabel: "F-03",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "friendly",
    sourceLayer: 3,
  },
  {
    id: "friendly-artillery",
    label: "火炮",
    shortLabel: "F-04",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "friendly",
    sourceLayer: 4,
  },
  {
    id: "friendly-tank",
    label: "装甲",
    shortLabel: "F-05",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "armor",
    sourceLayer: 5,
  },
  {
    id: "friendly-helicopter",
    label: "直升机",
    shortLabel: "F-06",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "aviation",
    sourceLayer: 6,
  },
  {
    id: "hostile-heavy",
    label: "重型体",
    shortLabel: "E-02",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 7,
  },
  {
    id: "hostile-fortress",
    label: "要塞体",
    shortLabel: "E-03",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "nest",
    sourceLayer: 8,
  },
  {
    id: "hostile-crawler",
    label: "爬行体",
    shortLabel: "E-04",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 9,
  },
  {
    id: "friendly-hovercraft",
    label: "气垫艇",
    shortLabel: "F-02",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "friendly",
    sourceLayer: 10,
  },
  {
    id: "hostile-scout",
    label: "小型体",
    shortLabel: "E-05",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 11,
  },
  {
    id: "hostile-crawler-biped",
    label: "步行体",
    shortLabel: "E-06",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 12,
  },
  {
    id: "hostile-artillery",
    label: "远程体",
    shortLabel: "E-07",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 13,
  },
  {
    id: "target-frame",
    label: "目标框",
    shortLabel: "T-01",
    kind: "target",
    defaultAffiliation: "objective",
    symbol: "objective",
    sourceLayer: 14,
  },
  {
    id: "arrow-head",
    label: "箭头笔尖",
    shortLabel: "A-01",
    kind: "arrow",
    defaultAffiliation: "objective",
    symbol: "objective",
    sourceLayer: 15,
  },
  {
    id: "friendly-fighter-clean",
    label: "新式飞行器",
    shortLabel: "F-07",
    kind: "unit",
    defaultAffiliation: "friendly",
    symbol: "aviation",
    sourceLayer: 16,
  },
  {
    id: "hostile-destroyed",
    label: "击毁目标",
    shortLabel: "E-09",
    kind: "unit",
    defaultAffiliation: "hostile",
    symbol: "hostile",
    sourceLayer: 17,
  },
];

const imageModules = import.meta.glob("../assets/units/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

function variantUrls(
  id: UnitArtworkId,
): Record<UnitAffiliation, string> {
  return {
    friendly: imageModules[`../assets/units/${id}-friendly.png`],
    hostile: imageModules[`../assets/units/${id}-hostile.png`],
    objective: imageModules[`../assets/units/${id}-objective.png`],
  };
}

export type UnitAsset = UnitAssetDefinition & {
  variants: Record<UnitAffiliation, string>;
};

export const UNIT_ASSETS: UnitAsset[] = definitions.map((definition) => ({
  ...definition,
  variants: variantUrls(definition.id),
}));

export const UNIT_ASSETS_BY_ID = new Map(
  UNIT_ASSETS.map((asset) => [asset.id, asset]),
);

export function unitArtworkAssetFor(
  id: UnitArtworkId,
  tint: UnitAffiliation,
): string {
  return (
    UNIT_ASSETS_BY_ID.get(id)?.variants[tint] ??
    UNIT_ASSETS_BY_ID.get("friendly-tank")?.variants[tint] ??
    ""
  );
}

export function arrowHeadAssetForTint(tint: UnitAffiliation): string {
  return unitArtworkAssetFor("arrow-head", tint);
}

export function defaultArtworkForSymbol(
  symbol: TacticalSymbol,
  affiliation?: UnitAffiliation,
): MarkerArtworkId {
  if (symbol === "objective") return "target-frame";
  if (affiliation === "objective") return "friendly-fighter";
  if (affiliation === "hostile") {
    return symbol === "nest" ? "custom-nest" : "hostile-crawler";
  }

  switch (symbol) {
    case "hostile":
      return "hostile-crawler";
    case "nest":
      return "custom-nest";
    case "armor":
      return "friendly-tank";
    case "aviation":
      return "friendly-fighter";
    case "headquarters":
    case "defense":
    case "friendly":
      return "friendly-tank";
  }
}

export function affiliationForSymbol(
  symbol: TacticalSymbol,
): UnitAffiliation {
  if (symbol === "objective") return "objective";
  if (symbol === "hostile" || symbol === "nest") return "hostile";
  return "friendly";
}

export const NATO_TINTS: UnitAffiliation[] = ["friendly", "hostile"];

type NatoAssetDefinition = {
  id: NatoArtworkId;
  label: string;
  shortLabel: string;
  symbol: TacticalSymbol;
};

const natoDefinitions: NatoAssetDefinition[] = [
  { id: "nato-infantry", label: "步兵", shortLabel: "INF", symbol: "friendly" },
  { id: "nato-armor", label: "装甲", shortLabel: "ARM", symbol: "armor" },
  {
    id: "nato-artillery",
    label: "炮兵",
    shortLabel: "ART",
    symbol: "friendly",
  },
  { id: "nato-recon", label: "侦察", shortLabel: "REC", symbol: "friendly" },
  {
    id: "nato-rotary",
    label: "陆航",
    shortLabel: "ROT",
    symbol: "aviation",
  },
  {
    id: "nato-fixed-wing",
    label: "航空",
    shortLabel: "AIR",
    symbol: "aviation",
  },
  { id: "nato-naval", label: "海军", shortLabel: "NAV", symbol: "friendly" },
  {
    id: "nato-headquarters",
    label: "指挥",
    shortLabel: "HQ",
    symbol: "headquarters",
  },
];

const natoImageModules = import.meta.glob("../assets/nato/*.svg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

export type NatoAsset = NatoAssetDefinition & {
  variants: Partial<Record<UnitAffiliation, string>>;
};

function natoFileId(id: NatoArtworkId): string {
  return id.replace("nato-", "");
}

export const NATO_ASSETS: NatoAsset[] = natoDefinitions.map((definition) => ({
  ...definition,
  variants: {
    friendly:
      natoImageModules[
        `../assets/nato/${natoFileId(definition.id)}-friendly.svg`
      ],
    hostile:
      natoImageModules[
        `../assets/nato/${natoFileId(definition.id)}-hostile.svg`
      ],
  },
}));

export const NATO_ASSETS_BY_ID = new Map(
  NATO_ASSETS.map((asset) => [asset.id, asset]),
);

export function natoArtworkAssetFor(
  id: NatoArtworkId,
  tint: UnitAffiliation,
): string {
  return (
    NATO_ASSETS_BY_ID.get(id)?.variants[tint] ??
    NATO_ASSETS_BY_ID.get("nato-infantry")?.variants.friendly ??
    ""
  );
}

export function artworkSourceFor(
  artwork: MarkerArtworkId,
): "psd" | "nato" | "flag" | "custom" {
  if (artwork.startsWith("nato-")) return "nato";
  if (artwork.startsWith("flag-")) return "flag";
  if (artwork.startsWith("custom-")) return "custom";
  return "psd";
}

export function isNatoArtwork(value: unknown): value is NatoArtworkId {
  return typeof value === "string" && NATO_ASSETS_BY_ID.has(value as NatoArtworkId);
}

export function isPsdArtwork(value: unknown): value is UnitArtworkId {
  return typeof value === "string" && UNIT_ASSETS_BY_ID.has(value as UnitArtworkId);
}

export function defaultNatoArtworkForSymbol(
  symbol: TacticalSymbol,
): NatoArtworkId {
  switch (symbol) {
    case "armor":
      return "nato-armor";
    case "aviation":
      return "nato-rotary";
    case "headquarters":
      return "nato-headquarters";
    case "nest":
    case "hostile":
      return "nato-infantry";
    case "defense":
      return "nato-artillery";
    case "objective":
    case "friendly":
      return "nato-infantry";
  }
}
