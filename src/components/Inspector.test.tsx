import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { createArrow, createMarker } from "../model/project";
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
});
