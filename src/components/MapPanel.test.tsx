import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "../store/editorStore";
import { MapPanel } from "./MapPanel";

describe("map panel", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("selects and edits an imported map", async () => {
    const store = useEditorStore.getState();
    store.applyBackground(
      "data:image/png;base64,AAAA",
      1200,
      800,
      "北线地图",
    );
    store.applyBackground(
      "data:image/png;base64,BBBB",
      800,
      600,
      "南线地图",
    );
    render(<MapPanel />);

    const north = screen.getByRole("button", {
      name: "选取地图 北线地图",
    });
    expect(north).not.toHaveAttribute("aria-pressed", "true");
    await userEvent.click(north);

    expect(useEditorStore.getState().project).toMatchObject({
      width: 1200,
      height: 800,
      background: { dataUrl: "data:image/png;base64,AAAA" },
    });

    fireEvent.change(screen.getByLabelText("地图名称"), {
      target: { value: "北线总图" },
    });
    fireEvent.blur(screen.getByLabelText("地图名称"));
    fireEvent.change(screen.getByLabelText("地图不透明度"), {
      target: { value: "0.55" },
    });

    expect(useEditorStore.getState().project.maps[0]).toMatchObject({
      name: "北线总图",
      opacity: 0.55,
    });
    expect(useEditorStore.getState().project.background.opacity).toBe(0.55);
  });

  it("controls overlay visibility and stacking order independently", async () => {
    const store = useEditorStore.getState();
    store.applyBackground(
      "data:image/png;base64,AAAA",
      1200,
      800,
      "底层",
    );
    store.applyBackground(
      "data:image/png;base64,BBBB",
      800,
      600,
      "上层",
    );
    render(<MapPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "隐藏底图 底层" }),
    );
    expect(
      useEditorStore
        .getState()
        .project.maps.find((map) => map.name === "底层")?.visible,
    ).toBe(false);

    await userEvent.click(
      screen.getByRole("button", { name: "下移底图 上层" }),
    );
    expect(useEditorStore.getState().project.maps[0].name).toBe("上层");
  });
});
