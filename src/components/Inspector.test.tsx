import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createArrow,
  createFreehand,
  createMarker,
  createRegion,
  createText,
} from "../model/project";
import { useEditorStore } from "../store/editorStore";
import { Inspector } from "./Inspector";

describe("inspector", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("updates the selected arrow color", async () => {
    const store = useEditorStore.getState();
    const arrow = createArrow(
      store.project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    );
    store.addObject(arrow);
    store.setSelection([arrow.id]);
    render(<Inspector />);

    const color = screen.getByLabelText("箭头颜色");
    await userEvent.clear(color);
    await userEvent.type(color, "#b9e253");

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      color: "#b9e253",
    });
  });

  it("shows the selected marker label editor", () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    expect(screen.getByLabelText("图标批注")).toBeInTheDocument();
    expect(screen.getByLabelText("图标尺寸")).toBeInTheDocument();
  });

  it("keeps NATO badge size adjustable without changing the default", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    const size = screen.getByLabelText("图标尺寸");
    expect(size).toHaveValue(marker.size);
    await userEvent.clear(size);
    await userEvent.type(size, "132");

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      size: 132,
    });
  });

  it("toggles marker outlines on by default", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, {
      x: 20,
      y: 20,
    });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    const toggle = screen.getByLabelText("启用兵牌描边");
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "marker",
      strokeEnabled: false,
    });
  });

  it("shows flag artwork with its Chinese country label", () => {
    const store = useEditorStore.getState();
    const marker = createMarker(
      store.project.layers[0].id,
      { x: 20, y: 20 },
      "friendly",
      {
        artwork: "flag-north-point",
        artworkSource: "flag",
      },
    );
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    expect(screen.getByLabelText("兵牌素材组")).toHaveValue("flag");
    expect(screen.getByLabelText("兵牌素材")).toHaveValue("flag-north-point");
    expect(screen.getByLabelText("图标批注")).toHaveValue("");
    expect(screen.queryByLabelText("兵牌阵营")).not.toBeInTheDocument();
  });

  it("attaches a selectable flag around a marker", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    await userEvent.selectOptions(
      screen.getByLabelText("挂靠国旗"),
      "flag-north-point",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("国旗挂靠位置"),
      "right",
    );
    fireEvent.change(screen.getByLabelText("挂靠国旗大小"), {
      target: { value: "52" },
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      flagAttachment: {
        artwork: "flag-north-point",
        position: "right",
        size: 52,
      },
    });
  });

  it("changes color through the visible picker and swatches", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    expect(screen.getByLabelText("图标颜色选择器")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "设置图标颜色为敌军色" }),
    );

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      color: "#9b351f",
    });
  });

  it("deletes the selected object from the inspector", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    await userEvent.click(screen.getByRole("button", { name: "删除所选" }));

    expect(useEditorStore.getState().project.objects).toHaveLength(0);
  });

  it("toggles the selected text annotation outline", async () => {
    const store = useEditorStore.getState();
    const text = createText(
      store.project.layers[0].id,
      { x: 40, y: 60 },
      "海岸防线",
    );
    store.addObject(text);
    store.setSelection([text.id]);
    render(<Inspector />);

    const toggle = screen.getByLabelText("启用批注描边");
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      type: "text",
      strokeEnabled: false,
    });
  });

  it("updates the selected arrow line style", async () => {
    const store = useEditorStore.getState();
    const arrow = createArrow(
      store.project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    );
    store.addObject(arrow);
    store.setSelection([arrow.id]);
    render(<Inspector />);

    await userEvent.selectOptions(
      screen.getByLabelText("箭头线型"),
      "dashed",
    );

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      lineStyle: "dashed",
    });
  });

  it("edits marker opacity with full opacity by default", () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 20 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    render(<Inspector />);

    const opacity = screen.getByLabelText("兵牌不透明度");
    expect(opacity).toHaveValue("1");
    expect(screen.getByLabelText("兵牌不透明度值")).toHaveTextContent("100%");
    fireEvent.change(opacity, { target: { value: "0.4" } });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      opacity: 0.4,
    });
    expect(screen.getByLabelText("兵牌不透明度值")).toHaveTextContent("40%");
  });

  it("edits arrow start and end widths independently", () => {
    const store = useEditorStore.getState();
    const arrow = createArrow(
      store.project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    store.addObject(arrow);
    store.setSelection([arrow.id]);
    render(<Inspector />);

    fireEvent.change(screen.getByLabelText("线起点大小"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("线终点大小"), {
      target: { value: "28" },
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      startWidth: 0,
      endWidth: 28,
    });
  });

  it("edits arrowhead size and style separately from line width", async () => {
    const store = useEditorStore.getState();
    const arrow = createArrow(
      store.project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    store.addObject(arrow);
    store.setSelection([arrow.id]);
    render(<Inspector />);

    fireEvent.change(screen.getByLabelText("箭头大小"), {
      target: { value: "900" },
    });
    await userEvent.selectOptions(
      screen.getByLabelText("箭头样式"),
      "spear",
    );

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      headSize: 160,
      headStyle: "spear",
    });
  });

  it("clamps stroke widths to the supported editing range", () => {
    const store = useEditorStore.getState();
    const arrow = createArrow(
      store.project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    store.addObject(arrow);
    store.setSelection([arrow.id]);
    render(<Inspector />);

    fireEvent.change(screen.getByLabelText("线起点大小"), {
      target: { value: "-8" },
    });
    fireEvent.change(screen.getByLabelText("线终点大小"), {
      target: { value: "90" },
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      startWidth: 0,
      endWidth: 64,
    });
  });

  it("updates the selected color in the live stroke preview", () => {
    const store = useEditorStore.getState();
    const arrow = createArrow(
      store.project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    store.addObject(arrow);
    store.setSelection([arrow.id]);
    render(<Inspector />);

    fireEvent.change(screen.getByLabelText("箭头颜色选择器"), {
      target: { value: "#b9e253" },
    });

    expect(screen.getByTestId("arrow-stroke-preview")).toHaveAttribute(
      "data-preview-color",
      "#b9e253",
    );
  });

  it("edits freehand endpoint widths", () => {
    const store = useEditorStore.getState();
    const line = createFreehand(store.project.layers[0].id, [
      { x: 0, y: 0 },
      { x: 80, y: 20 },
    ]);
    store.addObject(line);
    store.setSelection([line.id]);
    render(<Inspector />);

    fireEvent.change(screen.getByLabelText("手绘起点大小"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("手绘终点大小"), {
      target: { value: "18" },
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      startWidth: 2,
      endWidth: 18,
    });
  });

  it("toggles region closure and geometry locking", () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    store.addObject(region);
    store.setSelection([region.id]);
    render(<Inspector />);

    const lock = screen.getByLabelText("闭锁区域形状");
    fireEvent.click(lock);
    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      geometryLocked: true,
    });

    fireEvent.click(screen.getByLabelText("完整闭合区域"));
    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      closed: false,
    });
    expect(screen.getByLabelText("闭锁区域形状")).toBeDisabled();
  });

  it("applies a region shape preset and boundary line style", async () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 40 },
      { x: 70, y: 100 },
    ]);
    store.addObject(region);
    store.setSelection([region.id]);
    render(<Inspector />);

    await userEvent.selectOptions(
      screen.getByLabelText("区域形状预设"),
      "rectangle",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("区域线型"),
      "dashed",
    );

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      shapePreset: "rectangle",
      lineStyle: "dashed",
      points: [
        { x: 20, y: 20 },
        { x: 120, y: 20 },
        { x: 120, y: 100 },
        { x: 20, y: 100 },
      ],
    });
  });

  it("adjusts the number of dashed or dotted region segments", async () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    store.addObject(region);
    store.setSelection([region.id]);
    render(<Inspector />);

    await userEvent.selectOptions(
      screen.getByLabelText("区域线型"),
      "dotted",
    );
    fireEvent.change(screen.getByLabelText("区域段数"), {
      target: { value: "40" },
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      lineStyle: "dotted",
      lineDashCount: 40,
    });
  });

  it("keeps the closed region fill and border on the same color", () => {
    const store = useEditorStore.getState();
    const region = createRegion(store.project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    store.addObject(region);
    store.setSelection([region.id]);
    render(<Inspector />);

    fireEvent.change(screen.getByLabelText("区域颜色选择器"), {
      target: { value: "#b9e253" },
    });

    expect(useEditorStore.getState().project.objects[0]).toMatchObject({
      fill: "#b9e253",
      stroke: "#b9e253",
    });
  });

  it("adjusts the drawing stabilization strength", () => {
    render(<Inspector />);

    const stabilization = screen.getByLabelText("绘制防抖强度");
    expect(stabilization).toHaveValue("0.58");
    fireEvent.change(stabilization, { target: { value: "0.82" } });

    expect(useEditorStore.getState().strokeDamping).toBe(0.82);
  });
});
