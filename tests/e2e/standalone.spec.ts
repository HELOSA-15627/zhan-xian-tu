import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("standalone build renders when opened from the filesystem", async ({
  browser,
}) => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const target = pathToFileURL(
    path.resolve(process.cwd(), "dist/index.html"),
  ).href;

  await page.goto(target, { waitUntil: "load" });
  await page.waitForTimeout(800);

  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("main", { name: "战术地图编辑器" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "直接开始绘制" }),
  ).toBeVisible();

  await page.close();
});
