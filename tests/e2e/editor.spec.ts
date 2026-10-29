import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4pQAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "直接开始绘制" });
  if (await start.isVisible()) await start.click();
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
  await page.getByRole("button", { name: "友军图标" }).click();
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

  await page.getByRole("button", { name: "播放动画" }).click();
  await page.waitForTimeout(250);
  const dashOffset = await page
    .locator('[data-object-type="arrow"] line')
    .last()
    .getAttribute("stroke-dashoffset");
  expect(Number(dashOffset)).toBeGreaterThan(0);
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

test("restores the latest local draft", async ({ page }) => {
  await page.getByRole("button", { name: "友军图标" }).click();
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
  await page.getByRole("button", { name: "友军图标" }).click();
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
