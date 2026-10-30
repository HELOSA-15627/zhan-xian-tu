import { useId } from "react";

import type {
  CustomArtworkId,
  FlagArtworkId,
  MarkerArtworkId,
  NatoArtworkId,
  TacticalSymbol as TacticalSymbolName,
  UnitAffiliation,
  UnitArtworkId,
  UnitArtworkSource,
} from "../model/types";
import { customArtworkAssetFor } from "../model/customAssets";
import { flagArtworkAssetFor } from "../model/flags";
import {
  AFFILIATION_COLORS,
  affiliationForSymbol,
  defaultArtworkForSymbol,
  natoArtworkAssetFor,
  unitArtworkAssetFor,
} from "../model/unitAssets";

type TacticalSymbolProps = {
  symbol: TacticalSymbolName;
  color: string;
  size: number;
  affiliation?: UnitAffiliation;
  artwork?: MarkerArtworkId;
  artworkSource?: UnitArtworkSource;
};

export function TacticalSymbol({
  symbol,
  color,
  size,
  affiliation: requestedAffiliation,
  artwork: requestedArtwork,
  artworkSource: requestedArtworkSource,
}: TacticalSymbolProps) {
  const filterId = `artwork-tint-${useId().replace(/:/g, "")}`;
  const outlineFilterId = `artwork-outline-${useId().replace(/:/g, "")}`;
  const affiliation =
    requestedAffiliation ?? affiliationForSymbol(symbol);
  const artwork =
    requestedArtwork ?? defaultArtworkForSymbol(symbol, affiliation);
  const artworkSource =
    requestedArtworkSource ??
    (artwork.startsWith("nato-")
      ? "nato"
      : artwork.startsWith("flag-")
        ? "flag"
        : artwork.startsWith("custom-")
          ? "custom"
        : "psd");
  const artworkUrl =
    artworkSource === "flag"
      ? flagArtworkAssetFor(artwork as FlagArtworkId)
      : artworkSource === "nato"
      ? natoArtworkAssetFor(artwork as NatoArtworkId, affiliation)
      : artworkSource === "custom"
        ? customArtworkAssetFor(artwork as CustomArtworkId)
      : unitArtworkAssetFor(artwork as UnitArtworkId, affiliation);
  const tint = /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : AFFILIATION_COLORS[affiliation];

  return (
    <svg
      aria-hidden="true"
      className="tactical-symbol"
      data-affiliation={affiliation}
      data-frame={
        artworkSource === "nato"
          ? affiliation === "hostile"
            ? "diamond"
            : "rectangle"
          : undefined
      }
      data-symbol={symbol}
      data-symbol-style={artworkSource}
      height={size * 0.75}
      shapeRendering="geometricPrecision"
      viewBox="-56 -42 112 84"
      width={size}
    >
      <defs>
        {artworkSource === "psd" ? (
          <>
            <filter id={filterId}>
              <feFlood floodColor={tint} />
              <feComposite in2="SourceAlpha" operator="in" />
            </filter>
            <filter
              data-outline-filter="psd-black"
              id={outlineFilterId}
            >
              <feMorphology
                in="SourceAlpha"
                operator="dilate"
                radius="1.35"
                result="expanded"
              />
              <feFlood floodColor="#000000" result="black" />
              <feComposite
                in="black"
                in2="expanded"
                operator="in"
                result="outline"
              />
            </filter>
          </>
        ) : null}
      </defs>
      {artworkSource === "psd" ? (
        <image
          data-artwork-layer="outline"
          data-artwork-outline="psd-black"
          filter={`url(#${outlineFilterId})`}
          height="84"
          href={artworkUrl}
          preserveAspectRatio="xMidYMid meet"
          width="112"
          x="-56"
          y="-42"
        />
      ) : null}
      <image
        data-artwork-layer="fill"
        data-artwork-source={artworkSource}
        data-unit-artwork={artwork}
        filter={artworkSource === "psd" ? `url(#${filterId})` : undefined}
        height="84"
        href={artworkUrl}
        preserveAspectRatio="xMidYMid meet"
        width="112"
        x="-56"
        y="-42"
      />
    </svg>
  );
}
