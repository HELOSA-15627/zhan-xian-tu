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

test("lists, selects and edits imported maps", async ({ page }) => {
  const input = page.locator(
    'input[type="file"][accept*="image/png"]',
  );
  await input.setInputFiles({
    name: "northline.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await input.setInputFiles({
    name: "southline.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });

  await page.getByRole("tab", { name: "地图" }).click();
  const north = page.getByRole("button", { name: "选取地图 northline" });
  const south = page.getByRole("button", { name: "选取地图 southline" });
  await expect(north).toBeVisible();
  await expect(south).toHaveAttribute("aria-pressed", "true");

  await north.click();
  await expect(north).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("地图名称").fill("北线主轴");
  await page.getByLabel("地图名称").press("Enter");
  await page.getByLabel("地图不透明度").fill("0.55");
  await expect(
    page.getByRole("button", { name: "选取地图 北线主轴" }),
  ).toBeVisible();
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

test("toggles the outline on a placed unit badge", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);

  const outline = page.locator(
    '.scene-svg [data-object-type="marker"] [data-artwork-layer="outline"]',
  );
  await expect(outline).toHaveCount(1);
  await page.getByLabel("启用兵牌描边").uncheck();
  await expect(outline).toHaveCount(0);
  await page.getByLabel("启用兵牌描边").check();
  await expect(outline).toHaveCount(1);
});

test("hides one layer without hiding the rest of the project", async ({
  page,
}) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.42);

  await page.getByRole("tab", { name: "图层" }).click();
  const visibility = page.getByRole("checkbox", { name: /显示图层/ });
  await visibility.uncheck();
  await expect(page.getByText("已隐藏")).toBeVisible();
  await expect(page.locator('[data-object-type="marker"]')).toHaveCount(0);

  await visibility.check();
  await expect(page.locator('[data-object-type="marker"]')).toHaveCount(1);
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
  ).toHaveCount(1);
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

test("rotates and flips a selected object from transform controls", async ({
  page,
}) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.42);
  await page.getByRole("button", { name: "选择", exact: true }).click();

  const marker = page.locator('[data-object-type="marker"]');
  const markerBox = await marker.boundingBox();
  const rotateBox = await page.locator("[data-rotate-handle]").boundingBox();
  if (!markerBox || !rotateBox) {
    throw new Error("Transform handle has no screen bounds");
  }
  await page.mouse.move(
    rotateBox.x + rotateBox.width / 2,
    rotateBox.y + rotateBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    markerBox.x + markerBox.width / 2 + 70,
    markerBox.y + markerBox.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(marker).not.toHaveAttribute("transform", /rotate\(0\)/);

  await page.getByRole("button", { name: "水平翻转所选" }).click();
  await expect(marker).toHaveAttribute("transform", /scale\(-1/);
});

test("renames and edits a layer without hiding other layers", async ({
  page,
}) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.42);
  await page.getByRole("tab", { name: "图层" }).click();

  const name = page.getByLabel("图层名称 标注图层");
  await name.fill("主标注");
  await name.press("Enter");
  await page.getByLabel("图层不透明度 主标注").fill("0.45");

  await expect(page.getByLabel("图层名称 主标注")).toBeVisible();
  await expect(
    page.locator('[data-object-type="marker"]'),
  ).toBeVisible();
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
  baseURL,
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
  await secondPage.goto(baseURL ?? "/");
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

test("groups layers and recalls a saved graphic", async ({ page }) => {
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);

  await page.getByRole("tab", { name: "图层" }).click();
  await page.getByRole("button", { name: "编组当前图层" }).click();
  await expect(
    page.locator('[data-layer-kind="group"]'),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: /保存图层 .* 为图形素材/ })
    .first()
    .click();

  await page.getByRole("tab", { name: "图标" }).click();
  await page.getByRole("button", { name: "原图素材" }).click();
  const saved = page.getByRole("button", {
    name: /调用图形素材/,
  });
  await expect(saved.first()).toBeVisible();
  await saved.first().click();
  await expect(page.getByTestId("object-count")).toHaveText("2 个对象");
});

test("imports a custom badge into the custom asset group", async ({
  page,
}) => {
  await page.getByRole("button", { name: "原图素材" }).click();
  await page
    .getByLabel("选择自定义兵牌图片")
    .setInputFiles({
      name: "custom-badge.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });

  await expect(
    page.getByRole("button", {
      name: "自定义兵牌 custom-badge",
    }),
  ).toBeVisible();
  await expect(page.getByText(/已导入自定义兵牌/)).toBeVisible();
});

test("opens the new basemap filter and contour controls", async ({
  page,
}) => {
  const input = page.locator(
    'input[type="file"][accept*="image/png"]',
  );
  await input.setInputFiles({
    name: "contour-map.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await page.getByLabel("底图虚化").fill("6");
  await page.getByLabel("底图噪点").fill("0.16");
  await page.getByLabel("显示自动等高线").check();
  await page.waitForTimeout(700);
  await expect
    .poll(() =>
      page
        .locator("[data-background-image]")
        .getAttribute("href"),
    )
    .toMatch(/^blob:/);
  await expect(page.locator("[data-background-noise]")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".canvas-transform")
        .evaluate((element) => getComputedStyle(element).filter),
    )
    .toBe("none");

  const background = await page.evaluate(async () => {
    const request = indexedDB.open("tactical-atlas");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction("projects", "readonly");
      const get = transaction.objectStore("projects").get("current");
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    database.close();
    return value as {
      background?: {
        blur?: number;
        noise?: number;
        contourEnabled?: boolean;
      };
    };
  });

  expect(background.background).toMatchObject({
    blur: 6,
    noise: 0.16,
    contourEnabled: true,
  });
});

test("switches independent map trees and controls overlay visibility", async ({
  page,
}) => {
  const input = page.locator(
    'input[type="file"][accept*="image/png"]',
  );
  await input.setInputFiles({
    name: "map-a.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await page.getByRole("button", { name: "PSD 兵牌 装甲" }).click();
  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await expect(page.getByTestId("object-count")).toHaveText("1 个对象");

  await input.setInputFiles({
    name: "map-b.png",
    mimeType: "image/png",
    buffer: ONE_PIXEL_PNG,
  });
  await expect(page.getByTestId("object-count")).toHaveText("0 个对象");
  const secondBox = await canvas.boundingBox();
  if (!secondBox) throw new Error("Second map canvas has no layout box");
  await page.mouse.click(
    secondBox.x + secondBox.width * 0.6,
    secondBox.y + secondBox.height * 0.6,
  );
  await expect(page.getByTestId("object-count")).toHaveText("1 个对象");
  await expect(page.locator("[data-map-overlay-id]")).toHaveCount(2);

  await page.getByRole("tab", { name: "地图" }).click();
  await page.getByRole("button", { name: "选取地图 map-a" }).click();
  await expect(page.getByTestId("object-count")).toHaveText("1 个对象");
  await page.getByRole("button", { name: "隐藏底图 map-b" }).click();
  await expect(page.locator("[data-map-overlay-id]")).toHaveCount(1);
});

test("generates a cached raster contour layer instead of a giant path", async ({
  page,
}) => {
  const gradientBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 128, 0);
    gradient.addColorStop(0, "#303030");
    gradient.addColorStop(0.5, "#b8b8b8");
    gradient.addColorStop(1, "#f3f3f3");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 96);
    context.fillStyle = "#1666d8";
    context.fillRect(58, 0, 12, 96);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const input = page.locator(
    'input[type="file"][accept*="image/png"]',
  );
  await input.setInputFiles({
    name: "contour-gradient.png",
    mimeType: "image/png",
    buffer: Buffer.from(gradientBase64, "base64"),
  });

  await expect(page.getByLabel("排除蓝色水系")).toBeChecked();
  await page
    .getByRole("button", { name: "生成或更新等高线" })
    .click();
  await expect(page.getByText(/已缓存栅格等高线/)).toBeVisible();
  await expect(
    page.locator("[data-background-contour-raster]"),
  ).toBeVisible();
  await expect(page.locator("[data-background-contours]")).toHaveCount(0);

  const canvas = page.getByTestId("map-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Map canvas has no layout box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 500);
  await expect(
    page.locator("[data-background-contour-raster]"),
  ).toBeVisible();
});
