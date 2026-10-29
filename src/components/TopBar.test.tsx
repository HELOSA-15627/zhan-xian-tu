import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMarker } from "../model/project";
import { useEditorStore } from "../store/editorStore";
import { TopBar } from "./TopBar";

function renderTopBar() {
  return render(
    <TopBar
      onExportPng={vi.fn()}
      onExportProject={vi.fn()}
      onImportImage={vi.fn()}
      onImportProject={vi.fn()}
      saveState="已自动保存"
    />,
  );
}

describe("top bar object actions", () => {
  beforeEach(() => {
    useEditorStore.getState().createNewProject();
  });

  it("duplicates and deletes selected objects", async () => {
    const store = useEditorStore.getState();
    const marker = createMarker(store.project.layers[0].id, { x: 20, y: 30 });
    store.addObject(marker);
    store.setSelection([marker.id]);
    renderTopBar();

    await userEvent.click(screen.getByRole("button", { name: "复制所选" }));
    expect(useEditorStore.getState().project.objects).toHaveLength(2);

    useEditorStore
      .getState()
      .setSelection(
        useEditorStore.getState().project.objects.map((object) => object.id),
      );
    await userEvent.click(screen.getByRole("button", { name: "删除所选" }));
    expect(useEditorStore.getState().project.objects).toHaveLength(0);
  });
});
