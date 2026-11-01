import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TacticalSymbol as TacticalSymbolName } from "../model/types";
import { TacticalSymbol } from "./TacticalSymbol";

const symbols: TacticalSymbolName[] = [
  "friendly",
  "hostile",
  "headquarters",
  "defense",
  "nest",
  "objective",
  "armor",
  "aviation",
];

describe("tactical symbol", () => {
  it.each(symbols)(
    "renders %s as a flat reference-style silhouette",
    (symbol) => {
      const expectedStyle = symbol === "nest" ? "custom" : "psd";
      const { container } = render(
        <TacticalSymbol color="#7bcf79" size={44} symbol={symbol} />,
      );

      const root = container.querySelector(
        `[data-symbol-style='${expectedStyle}']`,
      );
      expect(root).toHaveAttribute("data-symbol", symbol);
      expect(root?.querySelector("[data-unit-artwork]")).not.toBeNull();
      expect(root).not.toHaveAttribute("data-frame");
    },
  );

  it("keeps PSD artwork as a standalone silhouette", () => {
    const { container } = render(
      <TacticalSymbol
        affiliation="friendly"
        artwork="friendly-tank"
        color="#92cf00"
        size={72}
        symbol="armor"
      />,
    );

    expect(
      container.querySelector('[data-symbol-style="psd"]'),
    ).not.toHaveAttribute("data-frame");
    expect(
      container.querySelector('[data-unit-artwork="friendly-tank"]'),
    ).toBeInTheDocument();
    expect(container.querySelector("feFlood")).toHaveAttribute(
      "flood-color",
      "#92cf00",
    );
  });

  it("adds a black outline behind user-provided PSD artwork", () => {
    const { container } = render(
      <TacticalSymbol
        affiliation="friendly"
        artwork="friendly-tank"
        color="#92cf00"
        size={72}
        symbol="armor"
      />,
    );

    expect(
      container.querySelector('[data-artwork-layer="outline"]'),
    ).toHaveAttribute("data-artwork-outline", "psd-black");
    expect(
      container.querySelector('[data-outline-filter="psd-black"] feFlood'),
    ).toHaveAttribute("flood-color", "#000000");
  });

  it("can hide the badge outline without hiding its fill", () => {
    const { container } = render(
      <TacticalSymbol
        affiliation="friendly"
        artwork="friendly-tank"
        artworkSource="psd"
        color="#92cf00"
        size={88}
        strokeEnabled={false}
        symbol="friendly"
      />,
    );

    expect(
      container.querySelector('[data-artwork-layer="outline"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-artwork-layer="fill"]'),
    ).toBeInTheDocument();
  });

  it("renders imported NATO symbols as their own asset group", () => {
    const { container } = render(
      <TacticalSymbol
        affiliation="hostile"
        artwork="nato-armor"
        artworkSource="nato"
        color="#9b351f"
        size={72}
        symbol="armor"
      />,
    );

    expect(
      container.querySelector('[data-symbol-style="nato"]'),
    ).toHaveAttribute("data-frame", "diamond");
    expect(
      container.querySelector('[data-artwork-source="nato"]'),
    ).toHaveAttribute("data-unit-artwork", "nato-armor");
    expect(
      container.querySelector('[data-artwork-layer="outline"]'),
    ).toBeInTheDocument();
  });

  it("renders country flags without tint or badge outlines", () => {
    const { container } = render(
      <TacticalSymbol
        affiliation="friendly"
        artwork="flag-north-point"
        artworkSource="flag"
        color="#92cf00"
        size={72}
        symbol="friendly"
      />,
    );
    const root = container.querySelector('[data-symbol-style="flag"]');

    expect(root).not.toHaveAttribute("data-frame");
    expect(
      root?.querySelector('[data-unit-artwork="flag-north-point"]'),
    ).not.toHaveAttribute("filter");
    expect(
      root
        ?.querySelector('[data-unit-artwork="flag-north-point"]')
        ?.getAttribute("href"),
    ).toMatch(/\/flags\/flag-north-point\.png$/);
    expect(
      root?.querySelector('[data-artwork-layer="outline"]'),
    ).not.toBeInTheDocument();
  });

  it("renders the original nest without recoloring or badge outlines", () => {
    const { container } = render(
      <TacticalSymbol
        affiliation="hostile"
        artwork="custom-nest"
        artworkSource="custom"
        color="#9b351f"
        size={72}
        symbol="nest"
      />,
    );
    const root = container.querySelector('[data-symbol-style="custom"]');
    const image = root?.querySelector('[data-unit-artwork="custom-nest"]');

    expect(image).not.toHaveAttribute("filter");
    expect(
      root?.querySelector('[data-artwork-layer="outline"]'),
    ).not.toBeInTheDocument();
    expect(image?.getAttribute("href")).toMatch(/\/custom\/nest\.png$/);
  });
});
