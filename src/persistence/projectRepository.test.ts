import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import {
  createArrow,
  createBlankProject,
  createFreehand,
  createMarker,
  createRegion,
} from "../model/project";
import {
  clearProject,
  loadProject,
  parseProjectFile,
  saveProject,
  serializeProject,
} from "./projectRepository";

afterEach(async () => {
  await clearProject();
});

describe("project repository", () => {
  it("round-trips a project through IndexedDB", async () => {
    const project = createBlankProject("测试");
    project.objects.push(createMarker(project.layers[0].id, { x: 10, y: 20 }));

    await saveProject(project);

    expect(await loadProject()).toEqual(project);
  });

  it("rejects invalid project JSON", () => {
    expect(() => parseProjectFile('{"hello":"world"}')).toThrow(
      "项目文件格式无效",
    );
  });

  it("serializes and parses a portable project", () => {
    const project = createBlankProject("北境防线");
    const text = serializeProject(project);

    expect(parseProjectFile(text)).toEqual(project);
  });

  it("upgrades pre-line-style projects without losing objects", () => {
    const project = createBlankProject("旧项目");
    const marker = createMarker(project.layers[0].id, { x: 10, y: 20 });
    const arrow = createArrow(
      project.layers[0].id,
      { x: 30, y: 40 },
      { x: 130, y: 80 },
    );
    project.objects.push(marker, arrow);
    const legacy = JSON.parse(serializeProject(project)) as Record<
      string,
      unknown
    >;
    const legacyObjects = legacy.objects as Array<Record<string, unknown>>;
    delete legacyObjects[1].lineStyle;

    const parsed = parseProjectFile(JSON.stringify(legacy));

    expect(parsed.objects).toHaveLength(2);
    expect(parsed.objects[0]).toMatchObject({ type: "marker", x: 10, y: 20 });
    expect(parsed.objects[1]).toMatchObject({
      type: "arrow",
      lineStyle: "solid",
    });
  });

  it("upgrades old strokes to tapered fields without changing their width", () => {
    const project = createBlankProject("旧笔触");
    const arrow = createArrow(
      project.layers[0].id,
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    );
    const freehand = createFreehand(project.layers[0].id, [
      { x: 20, y: 20 },
      { x: 80, y: 40 },
    ]);
    project.objects.push(arrow, freehand);
    const legacy = JSON.parse(serializeProject(project)) as {
      objects: Array<Record<string, unknown>>;
    };
    delete legacy.objects[0].startWidth;
    delete legacy.objects[0].endWidth;
    delete legacy.objects[0].headSize;
    delete legacy.objects[0].headStyle;
    delete legacy.objects[1].startWidth;
    delete legacy.objects[1].endWidth;

    const parsed = parseProjectFile(JSON.stringify(legacy));

    expect(parsed.objects[0]).toMatchObject({
      type: "arrow",
      width: 10,
      startWidth: 10,
      endWidth: 10,
      headSize: 34,
      headStyle: "psd",
    });
    expect(parsed.objects[1]).toMatchObject({
      type: "freehand",
      strokeWidth: 4,
      startWidth: 4,
      endWidth: 4,
    });
  });

  it("upgrades old regions and markers without losing their appearance", () => {
    const project = createBlankProject("旧区域");
    const marker = createMarker(project.layers[0].id, { x: 10, y: 20 });
    const region = createRegion(project.layers[0].id, [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 40, y: 60 },
    ]);
    region.fill = "#aa2266";
    region.stroke = "#22aa66";
    project.objects.push(marker, region);
    const legacy = JSON.parse(serializeProject(project)) as {
      objects: Array<Record<string, unknown>>;
    };
    delete legacy.objects[0].opacity;
    delete legacy.objects[1].closed;
    delete legacy.objects[1].geometryLocked;
    delete legacy.objects[1].shapePreset;
    delete legacy.objects[1].lineStyle;
    delete legacy.objects[1].lineDashCount;

    const parsed = parseProjectFile(JSON.stringify(legacy));

    expect(parsed.objects[0]).toMatchObject({
      type: "marker",
      opacity: 1,
    });
    expect(parsed.objects[1]).toMatchObject({
      type: "region",
      closed: true,
      geometryLocked: false,
      shapePreset: "custom",
      lineStyle: "solid",
      lineDashCount: 24,
      fill: "#22aa66",
      stroke: "#22aa66",
    });
  });

  it("upgrades legacy markers to NATO frames and PSD artwork", () => {
    const project = createBlankProject("旧兵牌");
    const marker = createMarker(
      project.layers[0].id,
      { x: 20, y: 30 },
      "hostile",
    );
    project.objects.push(marker);
    const legacy = JSON.parse(serializeProject(project)) as {
      objects: Array<Record<string, unknown>>;
    };
    delete legacy.objects[0].affiliation;
    delete legacy.objects[0].artwork;

    const parsed = parseProjectFile(JSON.stringify(legacy));
    expect(parsed.objects[0]).toMatchObject({
      type: "marker",
      affiliation: "hostile",
      artwork: "hostile-crawler",
      artworkSource: "psd",
      size: 88,
    });
  });

  it("preserves imported NATO artwork independently from PSD artwork", () => {
    const project = createBlankProject("NATO");
    project.objects.push(
      createMarker(project.layers[0].id, { x: 40, y: 50 }, "armor", {
        affiliation: "hostile",
        artwork: "nato-armor",
        artworkSource: "nato",
      }),
    );

    const parsed = parseProjectFile(serializeProject(project));

    expect(parsed.objects[0]).toMatchObject({
      type: "marker",
      artwork: "nato-armor",
      artworkSource: "nato",
      affiliation: "hostile",
    });
  });

  it("preserves flag artwork without adding an annotation", () => {
    const project = createBlankProject("国旗");
    project.objects.push(
      createMarker(project.layers[0].id, { x: 40, y: 50 }, "friendly", {
        artwork: "flag-north-point",
        artworkSource: "flag",
      }),
    );

    const parsed = parseProjectFile(serializeProject(project));

    expect(parsed.objects[0]).toMatchObject({
      type: "marker",
      artwork: "flag-north-point",
      artworkSource: "flag",
      label: "",
    });
  });

  it("preserves a marker flag attachment through project files", () => {
    const project = createBlankProject("挂靠国旗");
    const marker = createMarker(
      project.layers[0].id,
      { x: 40, y: 50 },
      "armor",
    );
    marker.flagAttachment = {
      artwork: "flag-yuktobania",
      position: "bottom",
      size: 38,
    };
    project.objects.push(marker);

    const parsed = parseProjectFile(serializeProject(project));

    expect(parsed.objects[0]).toMatchObject({
      flagAttachment: {
        artwork: "flag-yuktobania",
        position: "bottom",
        size: 38,
      },
    });
  });
});
