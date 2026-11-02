import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import {
  createArrow,
  createBlankProject,
  createFreehand,
  createMarker,
  createRegion,
  createText,
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

  it("round-trips imported maps and upgrades a legacy single background", () => {
    const project = createBlankProject("地图列表");
    project.maps = [
      {
        id: "map-north",
        name: "北线",
        dataUrl: "data:image/png;base64,AAAA",
        width: 1200,
        height: 800,
        opacity: 1,
        grayscale: 0,
        contrast: 1,
        brightness: 1,
        blur: 0,
        noise: 0,
        contourEnabled: false,
        contourLevels: 8,
        contourOpacity: 0.35,
        contourPaths: [],
        contourImage: null,
        excludeBlue: true,
        visible: true,
        layers: structuredClone(project.layers),
        objects: structuredClone(project.objects),
      },
      {
        id: "map-south",
        name: "南线",
        dataUrl: "data:image/png;base64,BBBB",
        width: 800,
        height: 600,
        opacity: 0.6,
        grayscale: 20,
        contrast: 1.2,
        brightness: 0.9,
        blur: 0,
        noise: 0,
        contourEnabled: false,
        contourLevels: 8,
        contourOpacity: 0.35,
        contourPaths: [],
        contourImage: null,
        excludeBlue: true,
        visible: true,
        layers: structuredClone(project.layers),
        objects: structuredClone(project.objects),
      },
    ];
    project.activeMapId = "map-south";
    project.width = 800;
    project.height = 600;
    project.background = {
      dataUrl: "data:image/png;base64,BBBB",
      opacity: 0.6,
      grayscale: 20,
      contrast: 1.2,
      brightness: 0.9,
      blur: 0,
      noise: 0,
      contourEnabled: false,
      contourLevels: 8,
      contourOpacity: 0.35,
      contourPaths: [],
      contourImage: null,
      excludeBlue: true,
    };

    expect(parseProjectFile(serializeProject(project))).toEqual(project);

    const legacy = JSON.parse(serializeProject(project)) as {
      maps?: unknown;
      activeMapId?: unknown;
      background: Record<string, unknown>;
    };
    delete legacy.maps;
    delete legacy.activeMapId;
    legacy.background = {
      dataUrl: "data:image/png;base64,CCCC",
      opacity: 1,
      grayscale: 0,
      contrast: 1,
      brightness: 1,
    };
    const parsed = parseProjectFile(JSON.stringify(legacy));

    expect(parsed.maps).toHaveLength(1);
    expect(parsed.maps[0]).toMatchObject({
      name: "地图列表",
      dataUrl: "data:image/png;base64,CCCC",
      width: 800,
      height: 600,
    });
    expect(parsed.activeMapId).toBe(parsed.maps[0].id);
  });

  it("migrates legacy global annotations into the active basemap tree", () => {
    const project = createBlankProject("迁移地图");
    project.objects.push(
      createMarker(project.layers[0].id, { x: 30, y: 40 }),
    );
    const legacy = JSON.parse(serializeProject(project)) as {
      maps: Array<Record<string, unknown>>;
      activeMapId: string;
    };
    legacy.maps = [
      {
        id: "legacy-map",
        name: "旧底图",
        dataUrl: "data:image/png;base64,AAAA",
        width: 1600,
        height: 900,
        opacity: 1,
        grayscale: 0,
        contrast: 1,
        brightness: 1,
      },
    ];
    legacy.activeMapId = "legacy-map";

    const parsed = parseProjectFile(JSON.stringify(legacy));
    expect(parsed.maps[0].visible).toBe(true);
    expect(parsed.maps[0].layers).toHaveLength(1);
    expect(parsed.maps[0].objects).toHaveLength(1);
  });

  it("round-trips independent layer trees for multiple basemaps", () => {
    const project = createBlankProject("平行底图");
    const firstLayer = project.layers[0];
    const firstMarker = createMarker(firstLayer.id, { x: 20, y: 30 });
    const secondLayer = {
      ...createBlankProject().layers[0],
      id: "layer-second",
      name: "第二底图图层",
    };
    const secondMarker = createMarker(secondLayer.id, { x: 80, y: 90 });
    const base = {
      width: 1000,
      height: 700,
      opacity: 1,
      grayscale: 0,
      contrast: 1,
      brightness: 1,
      blur: 0,
      noise: 0,
      contourEnabled: false,
      contourLevels: 8,
      contourOpacity: 0.35,
      contourPaths: [],
      contourImage: null,
      excludeBlue: true,
      visible: true,
    };
    project.maps = [
      {
        ...base,
        id: "map-one",
        name: "第一底图",
        dataUrl: "data:image/png;base64,AAAA",
        layers: [firstLayer],
        objects: [firstMarker],
      },
      {
        ...base,
        id: "map-two",
        name: "第二底图",
        dataUrl: "data:image/png;base64,BBBB",
        layers: [secondLayer],
        objects: [secondMarker],
      },
    ];
    project.activeMapId = "map-two";
    project.layers = [secondLayer];
    project.objects = [secondMarker];

    const parsed = parseProjectFile(serializeProject(project));
    expect(parsed.maps[0].objects[0]).toMatchObject({ x: 20, y: 30 });
    expect(parsed.maps[1].objects[0]).toMatchObject({ x: 80, y: 90 });
  });

  it("preserves disabled annotation outlines and upgrades older text", () => {
    const project = createBlankProject("批注描边");
    const text = createText(project.layers[0].id, { x: 20, y: 40 }, "岸防");
    text.strokeEnabled = false;
    project.objects.push(text);

    const parsed = parseProjectFile(serializeProject(project));
    expect(parsed.objects[0]).toMatchObject({
      type: "text",
      strokeEnabled: false,
    });

    const legacy = JSON.parse(serializeProject(project)) as {
      objects: Array<Record<string, unknown>>;
    };
    delete legacy.objects[0].strokeEnabled;
    expect(parseProjectFile(JSON.stringify(legacy)).objects[0]).toMatchObject({
      type: "text",
      strokeEnabled: true,
    });
  });

  it("preserves marker outline choices and defaults older markers to outlined", () => {
    const project = createBlankProject("兵牌描边");
    const marker = createMarker(project.layers[0].id, { x: 20, y: 40 });
    marker.strokeEnabled = false;
    project.objects.push(marker);

    const parsed = parseProjectFile(serializeProject(project));
    expect(parsed.objects[0]).toMatchObject({
      type: "marker",
      strokeEnabled: false,
    });

    const legacy = JSON.parse(serializeProject(project)) as {
      objects: Array<Record<string, unknown>>;
    };
    delete legacy.objects[0].strokeEnabled;
    expect(parseProjectFile(JSON.stringify(legacy)).objects[0]).toMatchObject({
      type: "marker",
      strokeEnabled: true,
    });
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
    delete legacyObjects[1].pathMode;
    delete legacyObjects[0].scaleX;
    delete legacyObjects[0].scaleY;
    delete legacyObjects[0].flipX;
    delete legacyObjects[0].flipY;

    const parsed = parseProjectFile(JSON.stringify(legacy));

    expect(parsed.objects).toHaveLength(2);
    expect(parsed.objects[0]).toMatchObject({
      type: "marker",
      x: 10,
      y: 20,
      scaleX: 1,
      scaleY: 1,
      flipX: false,
      flipY: false,
    });
    expect(parsed.objects[1]).toMatchObject({
      type: "arrow",
      lineStyle: "solid",
      pathMode: "smooth",
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
