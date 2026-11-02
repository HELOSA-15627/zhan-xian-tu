import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900, name: "layout-1440" },
  { width: 1024, height: 768, name: "layout-1024" },
]) {
  test(`keeps the editor workspace usable at ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const page = await browser.newPage({ viewport });
    await page.goto("/");
    const start = page.getByRole("button", { name: "直接开始绘制" });
    if (await start.isVisible()) await start.click();

    await expect(
      page.getByRole("main", { name: "战术地图编辑器" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/${viewport.name}.png`,
      fullPage: true,
    });
    const inspector = page.getByRole("complementary", {
      name: "属性检查器",
    });
    if (!(await inspector.isVisible())) {
      await page.getByRole("button", { name: "打开属性面板" }).click();
    }
    await expect(inspector).toBeVisible();
    if (viewport.width <= 1180) {
      await page.screenshot({
        path: "test-results/layout-1024-inspector.png",
        fullPage: true,
      });
    }
    await page.close();
  });
}
