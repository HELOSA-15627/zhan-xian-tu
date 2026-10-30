import nestUrl from "../assets/custom/nest.png";
import type {
  CustomArtworkId,
  TacticalSymbol as TacticalSymbolName,
} from "./types";

type CustomAssetDefinition = {
  id: CustomArtworkId;
  label: string;
  shortLabel: string;
  symbol: TacticalSymbolName;
};

const definitions: CustomAssetDefinition[] = [
  {
    id: "custom-nest",
    label: "巢穴",
    shortLabel: "原图",
    symbol: "nest",
  },
];

export type CustomAsset = CustomAssetDefinition & {
  url: string;
};

export const CUSTOM_ASSETS: CustomAsset[] = definitions.map((definition) => ({
  ...definition,
  url: nestUrl,
}));

export const CUSTOM_ASSETS_BY_ID = new Map(
  CUSTOM_ASSETS.map((asset) => [asset.id, asset]),
);

export function customArtworkAssetFor(id: CustomArtworkId): string {
  return CUSTOM_ASSETS_BY_ID.get(id)?.url ?? "";
}

export function isCustomArtwork(value: unknown): value is CustomArtworkId {
  return (
    typeof value === "string" &&
    CUSTOM_ASSETS_BY_ID.has(value as CustomArtworkId)
  );
}
