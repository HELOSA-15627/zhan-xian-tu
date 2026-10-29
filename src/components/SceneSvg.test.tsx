import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createBlankProject, createText } from "../model/project";
import { SceneSvg } from "./SceneSvg";

describe("scene svg", () => {
  it("renders visible objects from visible layers", () => {
    const project = createBlankProject();
    project.objects = [
      createText(project.layers[0].id, { x: 20, y: 30 }, "渡岛作战"),
    ];

    render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={0}
        interactive={false}
      />,
    );

    expect(screen.getByText("渡岛作战")).toBeInTheDocument();
  });

  it("omits objects from hidden layers", () => {
    const project = createBlankProject();
    project.layers[0].visible = false;
    project.objects = [
      createText(project.layers[0].id, { x: 20, y: 30 }, "不可见"),
    ];

    render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={0}
        interactive={false}
      />,
    );

    expect(screen.queryByText("不可见")).not.toBeInTheDocument();
  });

  it("never renders selection chrome in export mode", () => {
    const project = createBlankProject();
    const text = createText(project.layers[0].id, { x: 20, y: 30 }, "选中文字");
    project.objects = [text];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[text.id]}
        time={null}
        interactive={false}
      />,
    );

    expect(
      container.querySelector('[data-selection="true"]'),
    ).not.toBeInTheDocument();
  });
});
