import { render, screen } from "@testing-library/react";
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
    render(<LayerPanel />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: /显示图层/ }),
    );

    expect(useEditorStore.getState().project.layers[0].visible).toBe(false);
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
});
