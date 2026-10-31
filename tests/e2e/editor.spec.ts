import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4pQAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).not.toHaveText("准备自动保存");
  const start = page.getByRole("button", { name: "直接开始绘制" });
  if (await start.isVisible()) {
    await start.click();
    await expect(start).toBeHidden();
  }
});

test("imports a custom basemap", async ({ page }) => {
  await page
    .locator('input[type="file"][accept*="image/png"]')
    .setInputFiles({
      name: "northline.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });

  await expect(page.getByText("底图已导入")).toBeVisible();
  await expect(page.getByText("northline", { exact: true })).toBeVisible();
});

test("draws and exports a tactical map", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");

  await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.4);
  await expect(page.getByTestId("object-count")).toHaveText("1 个对象");

  await page.getByRole("button", { name: "箭头", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.62);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.36, {
    steps: 8,
  });
  await page.mouse.up();

  await expect(page.getByTestId("object-count")).toHaveText("2 个对象");
  await expect(page.getByRole("button", { name: "播放动画" })).toBeEnabled();
  await expect(
    page.locator('[data-object-type="arrow"] [data-arrow-head="true"]'),
  ).toHaveAttribute("opacity", "1");
  await expect(
    page.locator(
      '[data-object-type="arrow"] [stroke="#171a1c"], [data-object-type="arrow"] [stroke="#181a1c"]',
    ),
  ).toHaveCount(0);

  const headBeforePlayback = await page
    .locator("[data-arrow-head-point]")
    .getAttribute("data-arrow-head-point");
  await page.getByRole("button", { name: "播放动画" }).click();
  await page.waitForTimeout(250);
  await expect(
    page.locator('[data-object-type="arrow"] [data-arrow-head="true"]'),
  ).toHaveAttribute("opacity", "1");
  expect(
    await page
      .locator("[data-arrow-head-point]")
      .getAttribute("data-arrow-head-point"),
  ).not.toBe(headBeforePlayback);
  await page.getByRole("button", { name: "暂停动画" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG" }).click();
  const pngDownload = await download;
  expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);
  const pngPath = await pngDownload.path();
  if (!pngPath) throw new Error("PNG download path is unavailable");
  const png = readFileSync(pngPath);
  expect(png.readUInt32BE(16)).toBe(1600);
  expect(png.readUInt32BE(20)).toBe(900);
});

test("applies the reference unit and line language", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();

  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.42);
  await expect(
    page.locator(
      '.scene-svg [data-symbol-style="psd"][data-symbol="armor"]',
    ),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "使用防线双轨线型" }).click();
  await page.getByRole("button", { name: "箭头", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.24, box.y + box.height * 0.72);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.34, {
    steps: 8,
  });
  await page.mouse.up();

  await page.getByRole("button", { name: "选择", exact: true }).click();
  await page.getByRole("tab", { name: "图层" }).click();
  await page.getByRole("button", { name: "推进箭头", exact: true }).click();
  await expect(page.getByLabel("箭头线型")).toHaveValue("double");
  await expect(
    page.locator('[data-object-type="arrow"][data-line-style="double"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-line-role="rail"]')).toHaveCount(2);
  const railPaths = await page
    .locator('[data-object-type="arrow"] [data-line-role="rail"] path')
    .evaluateAll((items) => items.map((item) => item.getAttribute("d") ?? ""));
  expect(railPaths.every((path) => !path.includes("Z"))).toBe(true);
});

test("draws NATO badges and natural multi-direction arrows", async ({
  page,
}) => {
  await page.getByRole("button", { name: "敌军素材" }).click();
  await page.getByRole("button", { name: "PSD 兵牌 重型体" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.35);

  await expect(
    page.locator('.scene-svg [data-symbol-style="psd"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.scene-svg [data-unit-artwork="hostile-heavy"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.scene-svg [data-symbol-style="psd"] [data-artwork-layer="outline"][data-artwork-outline="psd-black"]',
    ),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "NATO 兵牌素材" }).click();
  await page.getByRole("button", { name: "NATO 兵牌 装甲" }).click();
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.3);
  await expect(
    page.locator(
      '.scene-svg [data-symbol-style="nato"][data-frame="diamond"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.scene-svg [data-symbol-style="nato"] [data-artwork-layer="outline"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '.scene-svg [data-symbol-style="nato"] [data-artwork-layer="fill"]',
    ),
  ).not.toHaveAttribute("filter");

  await page.getByRole("button", { name: "箭头", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.82, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.42, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.58, {
    steps: 8,
  });
  await page.mouse.up();

  const shaft = page.locator('[data-object-type="arrow"] [data-line-role="shaft"]');
  await expect(shaft).toHaveCount(1);
  await expect(shaft).not.toHaveAttribute("d", /Z/);
  await expect(shaft).toHaveAttribute("d", /C/);
});

test("edits badge opacity and tapered arrows", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");

  await page.mouse.click(box.x + box.width * 0.34, box.y + box.height * 0.36);
  const opacity = page.getByLabel("兵牌不透明度", { exact: true });
  await expect(opacity).toHaveValue("1");
  await opacity.fill("0.4");
  await expect(page.locator('[data-object-type="marker"]')).toHaveAttribute(
    "opacity",
    "0.4",
  );

  await page.getByRole("button", { name: "箭头", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.64);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.78, {
    steps: 6,
  });
  await page.mouse.move(box.x + box.width * 0.76, box.y + box.height * 0.44, {
    steps: 8,
  });
  await page.mouse.up();

  await page.getByLabel("线起点大小").fill("0");
  await page.getByLabel("线终点大小").fill("32");
  const shaft = page.locator(
    '[data-object-type="arrow"] [data-line-role="shaft"]',
  );
  await expect(shaft).toHaveAttribute("data-width-shape", "tapered");
  await expect(shaft).toHaveAttribute("stroke", "none");
});

test("edits arrowhead size and selects additional arrow styles", async ({
  page,
}) => {
  await page.getByRole("button", { name: "箭头", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.38, {
    steps: 8,
  });
  await page.mouse.up();

  await page.getByLabel("箭头大小").fill("76");
  await page.getByLabel("箭头样式").selectOption("chevron");
  const head = page.locator('[data-arrow-head="true"]');
  await expect(head).toHaveAttribute("data-head-size", "76");
  await expect(head).toHaveAttribute("data-head-style", "chevron");
  await expect(head.locator("[data-arrow-head-fill]")).toHaveAttribute(
    "stroke",
    "none",
  );
});

test("draws folded arrows and directly closed regions", async ({ page }) => {
  await page.getByRole("button", { name: "箭头折线绘制模式" }).click();
  await page.getByRole("button", { name: "箭头", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  const points = [
    { x: box.x + box.width * 0.25, y: box.y + box.height * 0.65 },
    { x: box.x + box.width * 0.47, y: box.y + box.height * 0.5 },
    { x: box.x + box.width * 0.72, y: box.y + box.height * 0.38 },
  ];

  await page.mouse.click(points[0].x, points[0].y);
  await page.mouse.click(points[1].x, points[1].y);
  await page.mouse.dblclick(points[2].x, points[2].y);

  await expect(page.locator('[data-object-type="arrow"]')).toHaveCount(1);
  await expect(page.locator('[data-object-type="arrow"]')).toHaveAttribute(
    "data-path-points",
    "3",
  );
  await expect(page.locator('[data-object-type="arrow"]')).toHaveAttribute(
    "data-path-mode",
    "sharp",
  );
  await expect(
    page.locator(
      '[data-object-type="arrow"] [data-line-role="shaft"]',
    ),
  ).not.toHaveAttribute("d", /\bC\b/);

  await page.getByRole("button", { name: "区域直接绘制模式" }).click();
  await page.getByRole("button", { name: "区域", exact: true }).click();
  await page.mouse.move(
    box.x + box.width * 0.32,
    box.y + box.height * 0.3,
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.58,
    box.y + box.height * 0.28,
    { steps: 5 },
  );
  await page.mouse.move(
    box.x + box.width * 0.54,
    box.y + box.height * 0.48,
    { steps: 5 },
  );
  await page.mouse.up();

  await expect(page.locator('[data-object-type="region"]')).toHaveCount(1);
  await expect(
    page.locator('[data-object-type="region"] [data-line-role="boundary"]'),
  ).toHaveAttribute("data-region-closed", "true");
});

test("recolors a PSD arrow and keeps its folded shaft attached", async ({
  page,
}) => {
  await page.getByRole("button", { name: "使用警戒点线线型" }).click();
  await page.getByRole("button", { name: "箭头折线绘制模式" }).click();
  await page.getByRole("button", { name: "箭头", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  const points = [
    { x: box.x + box.width * 0.28, y: box.y + box.height * 0.62 },
    { x: box.x + box.width * 0.5, y: box.y + box.height * 0.48 },
    { x: box.x + box.width * 0.72, y: box.y + box.height * 0.58 },
  ];
  await page.mouse.click(points[0].x, points[0].y);
  await page.mouse.click(points[1].x, points[1].y);
  await page.mouse.dblclick(points[2].x, points[2].y);
  await page.getByLabel("箭头颜色选择器").fill("#ff00a8");

  const arrow = page.locator('[data-object-type="arrow"]');
  await expect(arrow).toHaveAttribute("data-line-style", "dotted");
  await expect(
    arrow.locator('[data-arrow-head-filter="line-color"] feFlood'),
  ).toHaveAttribute("flood-color", "#ff00a8");
  await expect(
    arrow.locator('[data-arrow-head-connector="psd"]'),
  ).toHaveCount(1);
  await expect(
    arrow.locator('[data-arrow-head-clip="psd"]'),
  ).toHaveCount(1);
  await expect(
    arrow.locator('[data-arrow-shaft-clip="psd"]'),
  ).toHaveCount(1);
  const headSize = Number(
    await arrow.locator("[data-arrow-head]").getAttribute("data-head-size"),
  );
  const [headX, headY] = (
    (await arrow
      .locator("[data-arrow-head]")
      .getAttribute("data-arrow-head-point")) ?? ""
  ).split(",").map(Number);
  const [lineX, lineY] = (
    (await arrow
      .locator("[data-arrow-head]")
      .getAttribute("data-head-base-point")) ?? ""
  ).split(",").map(Number);

  expect(
    Math.abs(Math.hypot(headX - lineX, headY - lineY) - headSize),
  ).toBeLessThan(0.1);
});

test("applies a ticked defense line and tapered brush", async ({ page }) => {
  await page.getByRole("button", { name: "使用栅栏防线线型" }).click();
  await page.getByRole("button", { name: "使用渐细笔" }).click();
  await page.getByRole("button", { name: "箭头直接绘制模式" }).click();
  await page.getByRole("button", { name: "箭头", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.76, box.y + box.height * 0.48, {
    steps: 10,
  });
  await page.mouse.up();

  await expect(
    page.locator('[data-object-type="arrow"] [data-line-role="tick"]'),
  ).toHaveCount(1);
  await expect(page.getByLabel("箭头线宽")).toHaveValue("12");
  await expect(page.getByLabel("线起点大小")).toHaveValue("12");
  await expect(page.getByLabel("线终点大小")).toHaveValue("2");
});

test("places a Chinese-labelled flag from the flag asset group", async ({
  page,
}) => {
  await page.getByRole("button", { name: "国旗素材" }).click();
  await expect(
    page.getByRole("button", { name: /^国旗 / }),
  ).toHaveCount(47);
  await page.getByRole("button", { name: "国旗 北角" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.32);

  await expect(
    page.locator(
      '[data-object-type="marker"] [data-unit-artwork="flag-north-point"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-object-type="marker"] .scene-label'),
  ).toHaveCount(0);
});

test("places the original nest artwork without recoloring", async ({ page }) => {
  await page.getByRole("button", { name: "原图素材" }).click();
  await page.getByRole("button", { name: "原图兵牌 巢穴" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.34);

  const nest = page.locator(
    '[data-object-type="marker"] [data-unit-artwork="custom-nest"]',
  );
  await expect(nest).toHaveCount(1);
  await expect(nest).not.toHaveAttribute("filter");
  await expect(
    page.locator('[data-object-type="marker"] [data-artwork-layer="outline"]'),
  ).toHaveCount(0);
  expect(await nest.getAttribute("href")).toMatch(/\/custom\/nest\.png$/);
});

test("attaches a selectable flag to a placed marker", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.44, box.y + box.height * 0.36);

  await page
    .getByLabel("挂靠国旗", { exact: true })
    .selectOption("flag-north-point");
  await page.getByLabel("国旗挂靠位置").selectOption("right");
  await page.getByLabel("挂靠国旗大小").fill("52");

  const flag = page.locator('[data-object-type="marker"] [data-attached-flag]');
  await expect(flag).toHaveCount(1);
  await expect(flag).toHaveAttribute("data-flag-position", "right");
  await expect(flag).toHaveAttribute("data-flag-size", "52");
  expect(
    await flag.locator("image").getAttribute("href"),
  ).toMatch(/\/flags\/flag-north-point\.png$/);
});

test("applies region shape presets and boundary line styles", async ({
  page,
}) => {
  await page.getByRole("button", { name: "区域", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  const points = [
    { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 },
    { x: box.x + box.width * 0.65, y: box.y + box.height * 0.32 },
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.62 },
  ];
  await page.mouse.click(points[0].x, points[0].y);
  await page.mouse.click(points[1].x, points[1].y);
  await page.mouse.dblclick(points[2].x, points[2].y);

  await page.getByLabel("区域形状预设").selectOption("rectangle");
  await page.getByLabel("区域线型").selectOption("dashed");
  const root = page.locator('[data-object-type="region"]');
  const boundary = root.locator('[data-line-role="boundary"]');

  await expect(root).toHaveAttribute("data-region-shape", "rectangle");
  await expect(boundary).toHaveAttribute("stroke-dasharray", /./);
  expect((await boundary.getAttribute("points"))?.trim().split(/\s+/)).toHaveLength(
    4,
  );
  const dashesBefore = await boundary.getAttribute("stroke-dasharray");
  await page.getByLabel("区域段数").fill("36");
  const dashesAfter = await boundary.getAttribute("stroke-dasharray");
  expect(dashesAfter).not.toBe(dashesBefore);
});

test("searches badges and flags by Chinese or English name", async ({ page }) => {
  const search = page.getByLabel("搜索兵牌或国旗");
  await search.fill("装甲");
  await expect(
    page.getByRole("button", { name: "搜索结果 PSD 装甲" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "搜索结果 NATO 装甲" }),
  ).toBeVisible();

  await search.fill("north point");
  await expect(
    page.getByRole("button", { name: "搜索结果 国旗 北角" }),
  ).toBeVisible();

  await search.fill("巢穴");
  await expect(
    page.getByRole("button", { name: "搜索结果 原图 巢穴" }),
  ).toBeVisible();
});

test("previews object movement and corner resizing while dragging", async ({
  page,
}) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  const start = {
    x: box.x + box.width * 0.38,
    y: box.y + box.height * 0.42,
  };
  await page.mouse.click(start.x, start.y);

  await page.getByRole("button", { name: "选择", exact: true }).click();
  const marker = page.locator('[data-object-type="marker"]');
  const transformBeforeDrag = await marker.getAttribute("transform");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 46, start.y + 28, { steps: 6 });
  await expect(marker).not.toHaveAttribute(
    "transform",
    transformBeforeDrag ?? "",
  );
  await page.mouse.up();

  const handle = page.locator('[data-resize-handle="se"]');
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("Resize handle has no screen bounds");
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 52,
    handleBox.y + handleBox.height / 2 + 32,
    { steps: 6 },
  );
  await expect(marker).toHaveAttribute("transform", /scale\(/);
  await page.mouse.up();
});

test("toggles the outline on a text annotation", async ({ page }) => {
  await page.getByRole("button", { name: "文字", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(
    box.x + box.width * 0.42,
    box.y + box.height * 0.44,
  );

  const text = page.locator('[data-object-type="text"] text').first();
  await expect(text).toHaveAttribute("stroke", "#d8ccb4");
  await page.getByLabel("启用批注描边").uncheck();
  await expect(text).toHaveAttribute("stroke", "none");
  await expect(text).toHaveAttribute("stroke-width", "0");
});

test("drags a locked region and adds a node after unlocking", async ({
  page,
}) => {
  await page.getByRole("button", { name: "区域", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  const points = [
    { x: box.x + box.width * 0.28, y: box.y + box.height * 0.3 },
    { x: box.x + box.width * 0.58, y: box.y + box.height * 0.3 },
    { x: box.x + box.width * 0.42, y: box.y + box.height * 0.62 },
  ];
  await page.mouse.click(points[0].x, points[0].y);
  await page.mouse.click(points[1].x, points[1].y);
  await page.mouse.dblclick(points[2].x, points[2].y);

  const boundary = page.locator(
    '[data-object-type="region"] [data-line-role="boundary"]',
  );
  await expect(boundary).toHaveAttribute("stroke-linejoin", "miter");
  await expect(boundary).toHaveAttribute("fill-opacity", "0.22");
  expect(await boundary.getAttribute("fill")).toBe(
    await boundary.getAttribute("stroke"),
  );
  await expect(page.locator("[data-region-vertex-dot]")).toHaveCount(0);
  const beforeDrag = await boundary.getAttribute("points");

  await page.getByLabel("闭锁区域形状").check();
  await page.getByRole("button", { name: "选择", exact: true }).click();
  const regionBox = await page
    .locator('[data-object-type="region"]')
    .boundingBox();
  if (!regionBox) throw new Error("Region has no screen bounds");
  await page.mouse.move(
    regionBox.x + regionBox.width * 0.5,
    regionBox.y + regionBox.height * 0.35,
  );
  await page.mouse.down();
  await page.mouse.move(
    regionBox.x + regionBox.width * 0.5 + 30,
    regionBox.y + regionBox.height * 0.35 + 20,
    { steps: 5 },
  );
  await page.mouse.up();
  const afterDrag = await boundary.getAttribute("points");
  expect(afterDrag).not.toBe(beforeDrag);

  await page.getByLabel("闭锁区域形状").uncheck();
  await page.getByRole("button", { name: "区域", exact: true }).click();
  const worldPoints = (afterDrag ?? "")
    .trim()
    .split(/\s+/)
    .map((point) => {
      const [x, y] = point.split(",").map(Number);
      return { x, y };
    });
  const svgBox = await page.locator(".scene-svg").boundingBox();
  if (!svgBox) throw new Error("Scene SVG has no screen bounds");
  const midpoint = {
    x: (worldPoints[0].x + worldPoints[1].x) / 2,
    y: (worldPoints[0].y + worldPoints[1].y) / 2,
  };
  await page.mouse.click(
    svgBox.x + (midpoint.x / 1600) * svgBox.width,
    svgBox.y + (midpoint.y / 900) * svgBox.height,
  );

  const pointCount = (await boundary.getAttribute("points"))
    ?.trim()
    .split(/\s+/).length;
  expect(pointCount).toBe(worldPoints.length + 1);
});

test("selects an existing region by clicking inside it", async ({ page }) => {
  await page.getByRole("button", { name: "区域", exact: true }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  const points = [
    { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 },
    { x: box.x + box.width * 0.62, y: box.y + box.height * 0.3 },
    { x: box.x + box.width * 0.46, y: box.y + box.height * 0.62 },
  ];
  await page.mouse.click(points[0].x, points[0].y);
  await page.mouse.click(points[1].x, points[1].y);
  await page.mouse.dblclick(points[2].x, points[2].y);

  await page.getByRole("button", { name: "选择", exact: true }).click();
  await page.mouse.click(box.x + box.width * 0.82, box.y + box.height * 0.2);
  await expect(page.getByText("项目与底图")).toBeVisible();

  await page.getByRole("button", { name: "区域", exact: true }).click();
  await page.mouse.click(
    (points[0].x + points[1].x + points[2].x) / 3,
    (points[0].y + points[1].y + points[2].y) / 3,
  );

  await expect(page.getByText("区域属性", { exact: true })).toBeVisible();
  await expect(page.getByLabel("区域颜色", { exact: true })).toBeVisible();
});

test("restores the latest local draft", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");

  await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.44);
  await page.waitForTimeout(750);
  await page.reload();
  await page.waitForTimeout(750);

  await expect(page.getByTestId("object-count")).toHaveText("1 个对象");
});

test("exports and reopens a portable project file", async ({
  page,
  browser,
}) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "项目文件", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.atlas\.json$/);
  const path = await download.path();
  if (!path) throw new Error("Project download path is unavailable");
  const projectBuffer = readFileSync(path);

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("http://127.0.0.1:4173/");
  await secondPage.waitForTimeout(600);
  const start = secondPage.getByRole("button", { name: "直接开始绘制" });
  if (await start.isVisible()) await start.click();
  await secondPage
    .locator('input[type="file"][accept*=".atlas"]')
    .setInputFiles({
      name: "portable.atlas.json",
      mimeType: "application/json",
      buffer: projectBuffer,
    });

  await expect(secondPage.getByTestId("object-count")).toHaveText("1 个对象");
  await secondContext.close();
});
