import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "../store/editorStore";
import { AssetLibrary } from "./AssetLibrary";

describe("asset library", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("offers reference-derived brush and line presets", async () => {
    render(<AssetLibrary />);

    const rail = screen.getByRole("button", {
      name: "使用防线双轨线型",
    });
    await userEvent.click(rail);

    expect(useEditorStore.getState().activeLineStyle).toBe("double");
    expect(rail).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("防线双轨")).toBeInTheDocument();
  });

  it("switches drawing modes and applies a new brush preset", async () => {
    render(<AssetLibrary />);

    await userEvent.click(
      screen.getByRole("button", { name: "箭头折线绘制模式" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "区域直接绘制模式" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "使用渐细笔" }));

    expect(useEditorStore.getState()).toMatchObject({
      arrowDrawMode: "polyline",
      regionDrawMode: "direct",
      activeBrush: "taper",
    });
  });

  it("switches among friendly, hostile and objective PSD artwork", async () => {
    render(<AssetLibrary />);

    expect(screen.getByRole("button", { name: "友军素材" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("button", { name: /^PSD 兵牌 / })).toHaveLength(7);

    await userEvent.click(screen.getByRole("button", { name: "敌军素材" }));
    expect(useEditorStore.getState().activeAffiliation).toBe("hostile");
    expect(screen.getAllByRole("button", { name: /^PSD 兵牌 / })).toHaveLength(8);
  });

  it("imports NATO badges as a separate asset group", async () => {
    render(<AssetLibrary />);

    await userEvent.click(
      screen.getByRole("button", { name: "NATO 兵牌素材" }),
    );

    expect(useEditorStore.getState().activeArtworkSource).toBe("nato");
    expect(screen.getAllByRole("button", { name: /^NATO 兵牌 / })).toHaveLength(8);
    expect(
      screen.queryByRole("button", { name: "目标素材" }),
    ).not.toBeInTheDocument();
  });

  it("shows extracted country flags in their own source group", async () => {
    render(<AssetLibrary />);

    await userEvent.click(screen.getByRole("button", { name: "国旗素材" }));

    expect(useEditorStore.getState().activeArtworkSource).toBe("flag");
    expect(useEditorStore.getState().activeArtwork).toBe("flag-adamas");
    expect(screen.getAllByRole("button", { name: /^国旗 / })).toHaveLength(47);
    expect(
      screen.getByRole("button", { name: "国旗 北角" }),
    ).toBeInTheDocument();
  });

  it("searches PSD, NATO and flag assets by name", async () => {
    render(<AssetLibrary />);
    const search = screen.getByLabelText("搜索兵牌或国旗");

    await userEvent.type(search, "装甲");
    expect(
      screen.getByRole("button", { name: "搜索结果 PSD 装甲" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "搜索结果 NATO 装甲" }),
    ).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "north point");
    expect(
      screen.getByRole("button", { name: "搜索结果 国旗 北角" }),
    ).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "巢穴");
    expect(
      screen.getByRole("button", { name: "搜索结果 原图 巢穴" }),
    ).toBeInTheDocument();
  });

  it("shows the original nest in a separate custom artwork group", async () => {
    render(<AssetLibrary />);

    await userEvent.click(screen.getByRole("button", { name: "原图素材" }));

    expect(useEditorStore.getState().activeArtworkSource).toBe("custom");
    expect(useEditorStore.getState().activeArtwork).toBe("custom-nest");
    expect(
      screen.getByRole("button", { name: "原图兵牌 巢穴" }),
    ).toBeInTheDocument();
  });

  it("lists imported custom badges and selects them for drawing", async () => {
    useEditorStore.getState().addCustomArtwork({
      id: "custom-asset-test",
      name: "自定义飞行器",
      dataUrl: "data:image/png;base64,AAAA",
      width: 128,
      height: 96,
      affiliation: "friendly",
    });
    render(<AssetLibrary />);

    await userEvent.click(screen.getByRole("button", { name: "原图素材" }));
    await userEvent.click(
      screen.getByRole("button", { name: "自定义兵牌 自定义飞行器" }),
    );

    expect(useEditorStore.getState()).toMatchObject({
      activeArtworkSource: "custom",
      activeArtwork: "custom-asset-test",
      tool: "marker",
    });
  });

  it("recalls saved layer graphics from the custom library", async () => {
    const store = useEditorStore.getState();
    store.saveLayerAsGraphic(
      store.project.layers[0].id,
      "存档编队",
    );
    render(<AssetLibrary />);

    await userEvent.click(screen.getByRole("button", { name: "原图素材" }));
    await userEvent.click(
      screen.getByRole("button", { name: "调用图形素材 存档编队" }),
    );

    expect(
      useEditorStore.getState().project.layers.some(
        (layer) => layer.kind === "group" && layer.name === "存档编队",
      ),
    ).toBe(true);
  });
});
