import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WelcomeOverlay } from "./WelcomeOverlay";

describe("welcome overlay", () => {
  it("offers basemap import and blank drawing", () => {
    render(
      <WelcomeOverlay
        onClose={() => undefined}
        onImport={() => undefined}
        open
      />,
    );

    expect(screen.getByRole("button", { name: "导入底图" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "直接开始绘制" }),
    ).toBeInTheDocument();
  });

  it("uses the import action and closes", async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    render(
      <WelcomeOverlay onClose={onClose} onImport={onImport} open />,
    );

    screen.getByRole("button", { name: "导入底图" }).click();

    expect(onImport).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });
});
