import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { createMarker } from "../model/project";
import { useEditorStore } from "../store/editorStore";
import { LayerPanel } from "./LayerPanel";

describe("layer panel", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("toggles layer visibility", async () => {
    const { container } = render(<LayerPanel />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: /显示图层/ }),
    );

    expect(useEditorStore.getState().project.layers[0].visible).toBe(false);
    expect(
      container.querySelector('[data-layer-visible="false"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("已隐藏")).toBeInTheDocument();
  });

  it("lists objects on their layer", () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    marker.label = "第 16 大队";
    store.addObject(marker);
    render(<LayerPanel />);

    expect(screen.getByText("第 16 大队")).toBeInTheDocument();
  });

  it("adds a new layer", async () => {
    render(<LayerPanel />);

    await userEvent.click(screen.getByRole("button", { name: "新建图层" }));

    expect(useEditorStore.getState().project.layers).toHaveLength(2);
  });

  it("adds a child layer beneath the active annotation layer", async () => {
    render(<LayerPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "新建子图层" }),
    );

    const layers = useEditorStore.getState().project.layers;
    expect(layers[1].parentId).toBe(layers[0].id);
    expect(
      document.querySelector('[data-layer-depth="1"]'),
    ).toBeInTheDocument();
  });

  it("groups the active layer and renders the hierarchy", async () => {
    render(<LayerPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "编组当前图层" }),
    );

    const layers = useEditorStore.getState().project.layers;
    expect(layers.some((layer) => layer.kind === "group")).toBe(true);
    expect(
      document.querySelector('[data-layer-kind="group"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-layer-depth="1"]'),
    ).toBeInTheDocument();
  });

  it("saves a layer as a reusable named graphic", async () => {
    const store = useEditorStore.getState();
    const layer = store.project.layers[0];
    layer.name = "北线部队";

    render(<LayerPanel />);
    await userEvent.click(
      screen.getByRole("button", {
        name: "保存图层 北线部队 为图形素材",
      }),
    );

    expect(useEditorStore.getState().project.savedGraphics).toHaveLength(1);
    expect(
      useEditorStore.getState().project.savedGraphics[0].name,
    ).toBe("北线部队");
  });

  it("renames layers and edits their opacity", async () => {
    const store = useEditorStore.getState();
    store.addLayer("上层");
    render(<LayerPanel />);

    const name = screen.getByLabelText("图层名称 上层");
    fireEvent.change(name, { target: { value: "预备队" } });
    fireEvent.blur(name);
    fireEvent.change(screen.getByLabelText("图层不透明度 预备队"), {
      target: { value: "0.4" },
    });

    expect(useEditorStore.getState().project.layers[1]).toMatchObject({
      name: "预备队",
      opacity: 0.4,
    });
  });

  it("reorders layers and moves objects to another layer", async () => {
    const store = useEditorStore.getState();
    const layer = store.project.layers[0];
    const marker = createMarker(layer.id, { x: 20, y: 20 });
    marker.label = "移动单位";
    store.addObject(marker);
    store.addLayer("上层");
    render(<LayerPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "前移图层 标注图层" }),
    );
    expect(useEditorStore.getState().project.layers[1].id).toBe(layer.id);

    await userEvent.selectOptions(
      screen.getByLabelText("移动对象 移动单位 到图层"),
      useEditorStore.getState().project.layers[0].id,
    );
    expect(useEditorStore.getState().project.objects[0].layerId).toBe(
      useEditorStore.getState().project.layers[0].id,
    );
  });

  it("deletes objects and non-final layers from visible controls", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    marker.label = "可删除单位";
    store.addObject(marker);
    store.addLayer("临时图层");
    render(<LayerPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "删除对象 可删除单位" }),
    );
    expect(useEditorStore.getState().project.objects).toHaveLength(0);

    await userEvent.click(
      screen.getByRole("button", { name: "删除图层 临时图层" }),
    );
    expect(useEditorStore.getState().project.layers).toHaveLength(1);
  });
});
