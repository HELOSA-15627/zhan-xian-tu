import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  createArrow,
  createArrowPath,
  createBlankProject,
  createFreehand,
  createMarker,
  createRegion,
  createText,
} from "../model/project";
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

  it("removes the text annotation outline when disabled", () => {
    const project = createBlankProject();
    const text = createText(
      project.layers[0].id,
      { x: 20, y: 30 },
      "无描边批注",
    );
    text.strokeEnabled = false;
    project.objects = [text];

    render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const node = screen.getByText("无描边批注");

    expect(node).toHaveAttribute("stroke", "none");
    expect(node).toHaveAttribute("stroke-width", "0");
    expect(node).not.toHaveAttribute("paint-order");
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

  it("renders marker silhouettes without radar-like decoration", () => {
    const project = createBlankProject();
    project.objects = [
      createMarker(project.layers[0].id, { x: 70, y: 90 }, "armor"),
    ];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    expect(
      container.querySelector('[data-marker-style="atlas"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-marker-decoration="aura"]'),
    ).not.toBeInTheDocument();
  });

  it("renders arrow and freehand line style metadata", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 40, y: 40 },
      { x: 240, y: 120 },
    );
    arrow.lineStyle = "double";
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    expect(
      container.querySelector('[data-object-type="arrow"][data-line-style="double"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-line-role="rail"]').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("draws arrows along a smooth open path and separates the head", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 240, y: 40 },
      "solid",
      "objective",
      [
        { x: 20, y: 80 },
        { x: 90, y: 130 },
        { x: 160, y: 52 },
        { x: 240, y: 40 },
      ],
    );
    project.objects = [arrow];

    const { container, rerender } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={0.5}
        interactive={false}
      />,
    );

    const shaft = container.querySelector('[data-line-role="shaft"]');
    expect(shaft?.getAttribute("d")).toContain("C");
    expect(shaft?.getAttribute("d")).not.toContain("Z");
    expect(shaft?.getAttribute("d")).not.toContain("240 40");
    expect(
      container.querySelector('[data-arrow-head="true"]'),
    ).toHaveAttribute("opacity", "1");

    rerender(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    expect(
      container.querySelector('[data-arrow-head="true"]'),
    ).toHaveAttribute("opacity", "1");
  });

  it("moves the arrowhead with the animated line head", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 240, y: 40 },
      "solid",
      "objective",
      [
        { x: 20, y: 80 },
        { x: 90, y: 130 },
        { x: 160, y: 52 },
        { x: 240, y: 40 },
      ],
    );
    project.objects = [arrow];

    const { container, rerender } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={0.2}
        interactive={false}
      />,
    );
    const early = container
      .querySelector("[data-arrow-head-point]")
      ?.getAttribute("data-arrow-head-point");

    rerender(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={0.8}
        interactive={false}
      />,
    );
    const late = container
      .querySelector("[data-arrow-head-point]")
      ?.getAttribute("data-arrow-head-point");

    expect(late).not.toBe(early);
    expect(
      container.querySelector('[data-arrow-head="true"]'),
    ).toHaveAttribute("data-head-origin", "base");
  });

  it("animates a solid arrow by path clipping instead of a second dash pass", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 240, y: 40 },
      "solid",
      "objective",
      [
        { x: 20, y: 80 },
        { x: 90, y: 130 },
        { x: 160, y: 52 },
        { x: 240, y: 40 },
      ],
    );
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={0.4}
        interactive={false}
      />,
    );
    const shaft = container.querySelector('[data-line-role="shaft"]');

    expect(shaft).not.toHaveAttribute("stroke-dashoffset");
    expect(shaft).toHaveAttribute(
      "data-line-end",
      container
        .querySelector("[data-arrow-head]")
        ?.getAttribute("data-head-base-point"),
    );
  });

  it("joins the shaft to the arrow base without extra outlines", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 240, y: 40 },
    );
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    const shaft = container.querySelector('[data-line-role="shaft"]');
    const head = container.querySelector('[data-arrow-head="true"]');
    expect(shaft).toHaveAttribute("data-line-end", head?.getAttribute("data-head-base-point"));
    expect(
      container.querySelector(
        '[data-object-type="arrow"] [stroke="#171a1c"], [data-object-type="arrow"] [stroke="#181a1c"]',
      ),
    ).not.toBeInTheDocument();
  });

  it("renders uneven endpoint widths as a filled tapered geometry", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 240, y: 80 },
    );
    arrow.startWidth = 0;
    arrow.endWidth = 28;
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const shaft = container.querySelector('[data-line-role="shaft"]');

    expect(shaft).toHaveAttribute("data-width-shape", "tapered");
    expect(shaft).toHaveAttribute("fill", arrow.color);
    expect(shaft).toHaveAttribute("stroke", "none");
  });

  it("renders independently sized vector arrowhead styles", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 240, y: 80 },
    );
    arrow.headSize = 72;
    arrow.headStyle = "chevron";
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const head = container.querySelector("[data-arrow-head]");

    expect(head).toHaveAttribute("data-head-size", "72");
    expect(head).toHaveAttribute("data-head-style", "chevron");
    expect(
      head?.querySelector("[data-arrow-head-fill]"),
    ).toHaveAttribute("fill", arrow.color);
    expect(head?.querySelector("image")).not.toBeInTheDocument();
  });

  it("connects a chevron shaft to its central notch", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    );
    arrow.headSize = 100;
    arrow.headStyle = "chevron";
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const head = container.querySelector("[data-arrow-head]");
    const [headX, headY] = (
      head?.getAttribute("data-arrow-head-point") ?? ""
    ).split(",").map(Number);
    const [lineX, lineY] = (
      head?.getAttribute("data-head-base-point") ?? ""
    ).split(",").map(Number);

    expect(Math.hypot(headX - lineX, headY - lineY)).toBeCloseTo(56, 1);
  });

  it("renders marker opacity on the complete badge", () => {
    const project = createBlankProject();
    const marker = createMarker(project.layers[0].id, { x: 40, y: 50 });
    marker.opacity = 0.35;
    project.objects = [marker];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    expect(container.querySelector('[data-object-type="marker"]')).toHaveAttribute(
      "opacity",
      "0.35",
    );
  });

  it("renders an attached flag at the chosen badge position and size", () => {
    const project = createBlankProject();
    const marker = createMarker(project.layers[0].id, { x: 40, y: 50 });
    marker.flagAttachment = {
      artwork: "flag-north-point",
      position: "top",
      size: 48,
    };
    project.objects = [marker];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const flag = container.querySelector("[data-attached-flag]");

    expect(flag).toHaveAttribute("data-flag-position", "top");
    expect(flag).toHaveAttribute("data-flag-size", "48");
    expect(flag?.querySelector("image")?.getAttribute("href")).toMatch(
      /\/flags\/flag-north-point\.png$/,
    );
  });

  it("draws sharp straight region edges without vertex dots", () => {
    const project = createBlankProject();
    project.objects = [
      createRegion(project.layers[0].id, [
        { x: 20, y: 20 },
        { x: 120, y: 20 },
        { x: 70, y: 100 },
      ]),
    ];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const boundary = container.querySelector(
      '[data-object-type="region"] [data-line-role="boundary"]',
    );

    expect(boundary).toHaveAttribute("stroke-linejoin", "miter");
    expect(boundary).toHaveAttribute("stroke-linecap", "butt");
    expect(
      container.querySelectorAll('[data-region-vertex-dot="true"]'),
    ).toHaveLength(0);
  });

  it("fills a closed region with the border color at fill opacity", () => {
    const project = createBlankProject();
    const region = createRegion(project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    region.stroke = "#22aa66";
    region.fill = "#aa2266";
    region.opacity = 0.3;
    project.objects = [region];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const boundary = container.querySelector(
      '[data-object-type="region"] [data-line-role="boundary"]',
    );

    expect(boundary).toHaveAttribute("fill", "#22aa66");
    expect(boundary).toHaveAttribute("fill-opacity", "0.3");
    expect(
      container.querySelector('[data-object-type="region"]'),
    ).not.toHaveAttribute("opacity", "0.3");
  });

  it("renders region shape presets and boundary line styles", () => {
    const project = createBlankProject();
    const region = createRegion(project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    region.shapePreset = "ellipse";
    region.lineStyle = "dashed";
    region.lineDashCount = 8;
    project.objects = [region];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const root = container.querySelector('[data-object-type="region"]');
    const boundary = root?.querySelector('[data-line-role="boundary"]');

    expect(root).toHaveAttribute("data-region-shape", "ellipse");
    expect(boundary).toHaveAttribute("stroke-dasharray");
  });

  it("adds a full-region hit target without changing export visuals", () => {
    const project = createBlankProject();
    project.objects = [
      createRegion(project.layers[0].id, [
        { x: 20, y: 20 },
        { x: 120, y: 20 },
        { x: 70, y: 100 },
      ]),
    ];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive
      />,
    );
    const hit = container.querySelector(
      '[data-object-type="region"] [data-line-role="hit"]',
    );

    expect(hit).toHaveAttribute("fill", "transparent");
    expect(hit).toHaveAttribute("pointer-events", "all");
  });

  it("keeps an explicitly opened region boundary unclosed", () => {
    const project = createBlankProject();
    const region = createRegion(project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 120, y: 20 },
      { x: 70, y: 100 },
    ]);
    region.closed = false;
    project.objects = [region];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const boundary = container.querySelector(
      '[data-object-type="region"] [data-line-role="boundary"]',
    );

    expect(boundary?.tagName.toLowerCase()).toBe("polyline");
    expect(boundary).toHaveAttribute("fill", "none");
  });

  it("keeps freehand strokes open", () => {
    const project = createBlankProject();
    project.objects = [
      createFreehand(project.layers[0].id, [
        { x: 20, y: 20 },
        { x: 80, y: 40 },
        { x: 120, y: 30 },
      ]),
    ];
    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    const path = container.querySelector(
      '[data-object-type="freehand"] [data-line-role="band"]',
    );
    expect(path?.getAttribute("d")).not.toContain("Z");
  });

  it("keeps double defense rails open and free of extra outlines", () => {
    const project = createBlankProject();
    project.objects = [
      createFreehand(project.layers[0].id, [
        { x: 20, y: 20 },
        { x: 70, y: 45 },
        { x: 120, y: 30 },
      ]),
    ];
    const freehand = project.objects[0];
    if (freehand.type !== "freehand") throw new Error("Expected freehand");
    freehand.lineStyle = "double";

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );

    const rails = [
      ...container.querySelectorAll(
        '[data-object-type="freehand"] [data-line-role="rail"]',
      ),
    ];
    expect(rails).toHaveLength(2);
    expect(rails.every((rail) => !rail.getAttribute("d")?.includes("Z"))).toBe(
      true,
    );
    expect(
      rails.every(
        (rail) =>
          rail.getAttribute("stroke-linecap") === "butt" &&
          rail.getAttribute("stroke-linejoin") === "miter",
      ),
    ).toBe(true);
    expect(
      container.querySelector('[stroke="#171a1c"], [stroke="#181a1c"]'),
    ).not.toBeInTheDocument();
  });

  it("tints the PSD arrowhead with the arrow line color", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 220, y: 80 },
    );
    arrow.color = "#d13a8f";
    arrow.headStyle = "psd";
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const filter = container.querySelector(
      '[data-arrow-head-filter="line-color"]',
    );
    const head = container.querySelector(
      '[data-arrow-head-image="psd"]',
    );

    expect(filter?.querySelector("feFlood")).toHaveAttribute(
      "flood-color",
      "#d13a8f",
    );
    expect(head).toHaveAttribute("filter");
    expect(
      container.querySelector(
        '[data-object-type="arrow"] [data-artwork-outline]',
      ),
    ).not.toBeInTheDocument();
  });

  it("bridges a PSD shaft with a flat connector instead of entering the head", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    );
    arrow.headSize = 40;
    arrow.headStyle = "psd";
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const head = container.querySelector("[data-arrow-head]");
    const [headX, headY] = (
      head?.getAttribute("data-arrow-head-point") ?? ""
    ).split(",").map(Number);
    const [lineX, lineY] = (
      head?.getAttribute("data-head-base-point") ?? ""
    ).split(",").map(Number);
    const distanceFromTip = Math.hypot(headX - lineX, headY - lineY);
    const connector = container.querySelector(
      '[data-arrow-head-connector="psd"]',
    );

    expect(distanceFromTip).toBeCloseTo(40, 1);
    expect(connector).toHaveAttribute("fill", arrow.color);
    expect(connector?.tagName.toLowerCase()).toBe("rect");
  });

  it("clips a wide dotted PSD shaft at the arrowhead base", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    );
    arrow.headSize = 40;
    arrow.headStyle = "psd";
    arrow.lineStyle = "dotted";
    arrow.width = 10;
    arrow.startWidth = 10;
    arrow.endWidth = 10;
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const head = container.querySelector("[data-arrow-head]");
    const [headX, headY] = (
      head?.getAttribute("data-arrow-head-point") ?? ""
    ).split(",").map(Number);
    const [lineX, lineY] = (
      head?.getAttribute("data-head-base-point") ?? ""
    ).split(",").map(Number);
    const shaft = container.querySelector(
      '[data-object-type="arrow"] [data-line-role="shaft"]',
    );
    const clip = container.querySelector(
      '[data-arrow-head-clip="psd"]',
    );
    const clipId = clip?.getAttribute("id");

    expect(Math.hypot(headX - lineX, headY - lineY)).toBeCloseTo(40, 1);
    expect(clipId).toMatch(/^arrow-head-clip-/);
    expect(shaft?.parentElement).toHaveAttribute(
      "clip-path",
      `url(#${clipId})`,
    );
    expect(
      head?.querySelector('[data-arrow-head-connector="psd"]'),
    ).toBeInTheDocument();
  });

  it("renders a sharp arrow with straight segments and mitered corners", () => {
    const project = createBlankProject();
    const arrow = createArrowPath(
      project.layers[0].id,
      [
        { x: 20, y: 160 },
        { x: 120, y: 80 },
        { x: 240, y: 150 },
      ],
      "solid",
      "objective",
      undefined,
      "sharp",
    );
    project.objects = [arrow];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const shaft = container.querySelector(
      '[data-object-type="arrow"] [data-line-role="shaft"]',
    );
    const pathData = shaft?.getAttribute("d") ?? "";

    expect(pathData).toContain("M");
    expect(pathData).toContain("L");
    expect(pathData).not.toContain("C");
    expect(shaft).toHaveAttribute("stroke-linejoin", "miter");
  });

  it("renders phase dashes and ticked defense bars as open geometry", () => {
    const project = createBlankProject();
    const arrow = createArrow(
      project.layers[0].id,
      { x: 20, y: 80 },
      { x: 220, y: 80 },
    );
    arrow.lineStyle = "phase";
    const line = createFreehand(project.layers[0].id, [
      { x: 30, y: 180 },
      { x: 130, y: 170 },
      { x: 230, y: 190 },
    ]);
    line.lineStyle = "ticked";
    project.objects = [arrow, line];

    const { container } = render(
      <SceneSvg
        project={project}
        selectedIds={[]}
        time={null}
        interactive={false}
      />,
    );
    const phase = container.querySelector(
      '[data-object-type="arrow"] [data-line-role="shaft"]',
    );
    const tick = container.querySelector(
      '[data-object-type="freehand"] [data-line-role="tick"]',
    );

    expect(phase?.getAttribute("stroke-dasharray")).toMatch(/.+/);
    expect(tick).toBeInTheDocument();
    expect(tick?.getAttribute("d")).not.toContain("Z");
    expect(
      container.querySelector(
        '[data-object-type="freehand"] [stroke="#171a1c"]',
      ),
    ).not.toBeInTheDocument();
  });
});
