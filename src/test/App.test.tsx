import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "../App";

describe("application shell", () => {
  it("shows the project identity and mandatory PNG export action", () => {
    render(<App />);

    expect(screen.getByRole("main", { name: "战术地图编辑器" })).toBeInTheDocument();
    expect(screen.getByText("战线图志")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 PNG" })).toBeInTheDocument();
  });
});
