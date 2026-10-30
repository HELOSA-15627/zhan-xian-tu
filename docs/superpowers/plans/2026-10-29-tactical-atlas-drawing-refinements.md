# Tactical Atlas Drawing Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善兵牌透明度、可变宽笔触、沿轨迹移动的箭头、直角区域绘制、区域闭锁和地图对象拖动，同时移除线条与箭头的额外描边。

> **Implementation status (2026-10-29):** 已实现并通过完整验证。新增要求“绘制防抖强度可调”也已落地：设置范围 `0..1`，默认 `0.58`，连续绘制使用 `1 - damping` 作为平滑跟随系数。提交步骤保留待用户决定。

**Architecture:** 保留现有 React、Zustand、SVG 场景和纯 SVG 导出架构。新增独立笔触几何模块，统一计算平滑中心线、首尾宽度、箭头头部位置和切线方向；数据模型增加线宽插值与区域闭锁字段，旧项目加载时补齐默认值。

**Tech Stack:** React 19、TypeScript、Zustand、SVG、Vitest、Testing Library、Playwright、Vite。

**Spec:** `docs/superpowers/specs/2026-10-29-tactical-atlas-editor-design.md`

## Global Constraints

- PSD 素材保持原始剪影、目标框和箭头结构，不套额外兵牌框架。
- PSD 与 NATO 兵牌是两个独立素材组。
- 所有地图线条和箭头不得增加深色描边、轮廓滤镜或第二层边框。
- 双轨防线必须是两条开放路径，不得互相闭合。
- 手绘线和箭头中心线不得自动闭合；区域仅在完成时形成闭合边界。
- 所有连续绘制工具必须使用指针防抖；单点落位工具必须有移动阈值。
- 连续绘制的防抖强度必须可调并持久化到浏览器本地设置，默认 `0.58`。
- 地图对象拖拽不得写入大量中间历史记录，释放鼠标时只记录一次最终位置。
- 导出 PNG 必须复用同一场景渲染逻辑，不能依赖编辑器专属控件。
- 每个行为改动遵循红灯、绿灯、重构。

---

### Task 1: Extend Stroke and Region Data Models

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/model/project.ts`
- Modify: `src/persistence/projectRepository.ts`
- Test: `src/model/project.test.ts`
- Test: `src/persistence/projectRepository.test.ts`

**Interfaces:**

```ts
type TaperedLine = {
  width: number;
  startWidth: number;
  endWidth: number;
};

type ArrowObject = TaperedLine & {
  type: "arrow";
  points: Point[];
  tint: UnitAffiliation;
  // existing fields remain
};

type FreehandObject = TaperedLine & {
  type: "freehand";
  points: Point[];
  // existing fields remain
};

type RegionObject = {
  type: "region";
  points: Point[];
  closed: boolean;
  geometryLocked: boolean;
  // existing fields remain
};
```

- [ ] **Step 1: Write failing factory tests**

```ts
it("creates arrows and freehand lines with uniform endpoint widths", () => {
  const arrow = createArrow("layer-1", { x: 0, y: 0 }, { x: 100, y: 0 });
  const line = createFreehand("layer-1", [
    { x: 0, y: 0 },
    { x: 40, y: 10 },
  ]);

  expect(arrow).toMatchObject({ width: 10, startWidth: 10, endWidth: 10 });
  expect(line).toMatchObject({ strokeWidth: 4, startWidth: 4, endWidth: 4 });
});

it("creates regions closed and geometry-unlocked by default", () => {
  const region = createRegion("layer-1", [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 50, y: 80 },
  ]);

  expect(region.closed).toBe(true);
  expect(region.geometryLocked).toBe(false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- --run src/model/project.test.ts
```

Expected: FAIL because `startWidth`, `endWidth`, `closed` and `geometryLocked` are absent.

- [ ] **Step 3: Add fields and migration defaults**

Use `width` and `strokeWidth` as the default values for both endpoint widths. For old regions, set `closed = true` and `geometryLocked = false`. Clamp all widths to `0..64`.

- [ ] **Step 4: Add persistence migration tests**

```ts
it("upgrades old strokes to tapered fields without changing their width", () => {
  const arrow = createArrow("layer", { x: 0, y: 0 }, { x: 100, y: 0 });
  const legacy = JSON.parse(serializeProject({ ...project, objects: [arrow] }));
  delete legacy.objects[0].startWidth;
  delete legacy.objects[0].endWidth;

  expect(parseProjectFile(JSON.stringify(legacy)).objects[0]).toMatchObject({
    width: arrow.width,
    startWidth: arrow.width,
    endWidth: arrow.width,
  });
});
```

- [ ] **Step 5: Run model and persistence tests**

Run:

```powershell
npm test -- --run src/model/project.test.ts src/persistence/projectRepository.test.ts
```

Expected: PASS.

---

### Task 2: Build Tapered, Open Stroke Geometry

**Files:**
- Create: `src/model/strokeGeometry.ts`
- Create: `src/model/strokeGeometry.test.ts`
- Modify: `src/model/path.ts`

**Interfaces:**

```ts
export type StrokeFrame = {
  point: Point;
  angle: number;
  distance: number;
};

export function sampleSmoothPath(points: Point[], samplesPerSegment?: number): Point[];
export function pathFrameAtProgress(points: Point[], progress: number): StrokeFrame;
export function buildTaperedRibbon(
  points: Point[],
  startWidth: number,
  endWidth: number,
): string;
export function buildOpenOffsetPath(points: Point[], offset: number): string;
```

- [ ] **Step 1: Write failing geometry tests**

```ts
it("moves the stroke head along the actual path", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  expect(pathFrameAtProgress(path, 0).point).toEqual({ x: 0, y: 0 });
  expect(pathFrameAtProgress(path, 0.5).point).toEqual({ x: 100, y: 0 });
  expect(pathFrameAtProgress(path, 1).point).toEqual({ x: 100, y: 100 });
});

it("creates a wedge when endpoint widths differ", () => {
  const ribbon = buildTaperedRibbon(
    [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    0,
    20,
  );

  expect(ribbon).toContain("M");
  expect(ribbon).toContain("Z");
});

it("creates two independent open rail paths", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 40, y: 20 },
    { x: 100, y: 0 },
  ];

  expect(buildOpenOffsetPath(points, 4)).not.toContain("Z");
  expect(buildOpenOffsetPath(points, -4)).not.toContain("Z");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- --run src/model/strokeGeometry.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement sampled centerline and ribbon generation**

`sampleSmoothPath` evaluates the existing Catmull-Rom-to-Bezier path at fixed intervals. `pathFrameAtProgress` walks the sampled polyline by arc length and returns the current point and tangent. `buildTaperedRibbon` offsets the sampled centerline by half the interpolated width on both sides, joins at the butt endpoints without round caps, and closes only the filled ribbon geometry.

- [ ] **Step 4: Implement open double rails**

`buildOpenOffsetPath` offsets each source point by its local normal and runs `smoothPathData` without a closing command. This is the only double-line geometry used by freehand and defense arrows.

- [ ] **Step 5: Run tests**

Run:

```powershell
npm test -- --run src/model/strokeGeometry.test.ts src/model/path.test.ts
```

Expected: PASS.

---

### Task 3: Render Variable-Width Lines and Moving Arrowheads

**Files:**
- Modify: `src/components/SceneSvg.tsx`
- Test: `src/components/SceneSvg.test.tsx`

**Interfaces:**

- Consumes: `pathFrameAtProgress`, `buildTaperedRibbon`, `buildOpenOffsetPath`
- Produces: `data-arrow-head-point`, `data-line-role="shaft"` and `data-line-role="rail"` SVG metadata for tests

- [ ] **Step 1: Write failing arrow animation tests**

```tsx
it("moves the arrowhead with the animated line head", () => {
  const { container, rerender } = render(
    <SceneSvg project={project} selectedIds={[]} time={0.2} interactive={false} />,
  );
  const early = container.querySelector("[data-arrow-head-point]")
    ?.getAttribute("data-arrow-head-point");

  rerender(
    <SceneSvg project={project} selectedIds={[]} time={0.8} interactive={false} />,
  );
  const late = container.querySelector("[data-arrow-head-point]")
    ?.getAttribute("data-arrow-head-point");

  expect(late).not.toBe(early);
});

it("joins the shaft to the arrow base without extra outlines", () => {
  const { container } = render(
    <SceneSvg project={project} selectedIds={[]} time={null} interactive={false} />,
  );

  expect(container.querySelector('[data-line-role="shaft"]')).toBeInTheDocument();
  expect(container.querySelector('[data-arrow-head="true"]')).toHaveAttribute(
    "data-head-origin",
    "base",
  );
  expect(
    container.querySelector('[data-object-type="arrow"] [stroke="#171a1c"]'),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Write failing variable-width tests**

```tsx
it("renders uneven endpoint widths as a filled geometry", () => {
  arrow.startWidth = 0;
  arrow.endWidth = 28;

  const { container } = render(<SceneSvg project={project} ... />);
  const shaft = container.querySelector('[data-line-role="shaft"]');

  expect(shaft).toHaveAttribute("data-width-shape", "tapered");
  expect(shaft).toHaveAttribute("fill", arrow.color);
  expect(shaft).toHaveAttribute("stroke", "none");
});
```

- [ ] **Step 3: Implement animated head position**

At every animation time, calculate the current head frame from progress. Position the arrow asset tip at that point, rotate it from the local tangent, and end the visible shaft at the arrow base. Do not place the arrow at the final endpoint during partial playback.

- [ ] **Step 4: Implement fill-only line rendering**

- Equal start/end widths: use one colored path with `stroke` matching the chosen color, `strokeLinecap="butt"`, `strokeLinejoin="miter"` and no extra outline pass.
- Unequal widths: use a filled tapered ribbon with `stroke="none"`.
- Double rail: use two independent open paths, each without an outline layer.
- Arrowhead: use the selected PSD arrow image with no filter, outline or duplicate black layer.

- [ ] **Step 5: Run scene tests**

Run:

```powershell
npm test -- --run src/components/SceneSvg.test.tsx
```

Expected: PASS.

---

### Task 4: Draw Straight-Edge Regions and Add Closed/Locked Geometry

**Files:**
- Modify: `src/components/MapCanvas.tsx`
- Modify: `src/components/SceneSvg.tsx`
- Modify: `src/model/project.ts`
- Test: `src/components/MapCanvas.test.tsx`
- Test: `src/components/SceneSvg.test.tsx`

**Interfaces:**

```ts
export function insertRegionVertex(region: RegionObject, point: Point): RegionObject;
```

- [ ] **Step 1: Write failing straight-edge region tests**

```tsx
it("draws region boundaries with straight, butt-ended lines and no vertex dots", () => {
  const { container } = render(<SceneSvg project={regionProject} ... />);
  const boundary = container.querySelector(
    '[data-object-type="region"] [data-line-role="boundary"]',
  );

  expect(boundary).toHaveAttribute("stroke-linejoin", "miter");
  expect(boundary).toHaveAttribute("stroke-linecap", "butt");
  expect(
    container.querySelectorAll('[data-region-vertex-dot="true"]'),
  ).toHaveLength(0);
});
```

- [ ] **Step 2: Write failing lock and node insertion tests**

```tsx
it("allows dragging a locked region but blocks node insertion", () => {
  const region = createRegion("layer", [
    { x: 20, y: 20 },
    { x: 120, y: 20 },
    { x: 70, y: 100 },
  ]);
  region.geometryLocked = true;

  expect(canInsertRegionVertex(region)).toBe(false);
  expect(canDragRegion(region)).toBe(true);
});

it("inserts a vertex on the nearest segment after unlocking", () => {
  const result = insertRegionVertex(region, { x: 70, y: 22 });

  expect(result.points).toHaveLength(region.points.length + 1);
  expect(result.points[1]).toEqual({ x: 70, y: 20 });
});
```

- [ ] **Step 3: Implement straight region rendering**

Render the region boundary as a sharp polygon/path with `strokeLinejoin="miter"`, `strokeLinecap="butt"`, and solid color. Do not render preview vertex circles. Region fill remains controlled by the existing fill color.

- [ ] **Step 4: Implement region selection, drag and insertion**

- Select tool drag moves markers and closed regions regardless of `geometryLocked`.
- Region tool is ignored for geometry insertion when `geometryLocked` is true.
- With the region unlocked and selected, a click near a boundary inserts a vertex projected onto the nearest segment.
- Preserve the closed boundary after insertion.

- [ ] **Step 5: Run interaction tests**

Run:

```powershell
npm test -- --run src/components/MapCanvas.test.tsx src/components/SceneSvg.test.tsx
```

Expected: PASS.

---

### Task 5: Expose Opacity, Taper, Region Lock and Visual Colors

**Files:**
- Modify: `src/components/Inspector.tsx`
- Modify: `src/components/AssetLibrary.tsx`
- Modify: `src/styles/global.css`
- Test: `src/components/Inspector.test.tsx`
- Test: `src/components/AssetLibrary.test.tsx`

**Interfaces:**

- Marker opacity range: `0..1`, step `0.05`, default `1`.
- Stroke start/end width range: `0..64`, step `1`.
- Region checkboxes: `closed`, `geometryLocked`.

- [ ] **Step 1: Write failing inspector tests**

```tsx
it("edits marker opacity and defaults to fully opaque", () => {
  expect(marker.opacity).toBe(1);
  expect(screen.getByLabelText("兵牌不透明度")).toHaveValue("1");
});

it("edits start and end widths", async () => {
  await userEvent.clear(screen.getByLabelText("线起点大小"));
  await userEvent.type(screen.getByLabelText("线起点大小"), "0");
  await userEvent.clear(screen.getByLabelText("线终点大小"));
  await userEvent.type(screen.getByLabelText("线终点大小"), "28");

  expect(object).toMatchObject({ startWidth: 0, endWidth: 28 });
});

it("locks a closed region without disabling dragging", async () => {
  await userEvent.click(screen.getByLabelText("闭锁区域形状"));
  expect(region.geometryLocked).toBe(true);
});
```

- [ ] **Step 2: Implement marker opacity and stroke controls**

Add range inputs for marker opacity, arrow width, arrow start width, arrow end width, freehand width, freehand start width and freehand end width. Add a live line preview using the current color and width values.

- [ ] **Step 3: Implement region controls**

Add:

- `完整闭合区域`
- `闭锁区域形状`

Disable `闭锁区域形状` when the region is not closed. Show current fill and border colors through the existing color picker, hex input and swatches.

- [ ] **Step 4: Verify color previews**

Line-style cards must use the currently selected color. Changing a color picker or swatch must immediately update:

- selected object on the canvas;
- inspector controls;
- line-style preview;
- export scene.

- [ ] **Step 5: Run UI tests**

Run:

```powershell
npm test -- --run src/components/Inspector.test.tsx src/components/AssetLibrary.test.tsx
```

Expected: PASS.

---

### Task 6: Complete Browser Acceptance and Documentation

**Files:**
- Modify: `tests/e2e/editor.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-10-29-tactical-atlas-editor-design.md`

**Interfaces:**

- Consumes all previous tasks.
- Produces repeatable browser-level proof for drawing, dragging, locking and export.

- [ ] **Step 1: Add browser tests**

```ts
test("animates a tapered arrow along its brush path", async ({ page }) => {
  // draw curved arrow
  await expect(
    page.locator('[data-object-type="arrow"] [data-arrow-head="true"]'),
  ).toBeVisible();
  const before = await page
    .locator("[data-arrow-head-point]")
    .getAttribute("data-arrow-head-point");
  await page.getByRole("button", { name: "播放动画" }).click();
  await page.waitForTimeout(300);
  const during = await page
    .locator("[data-arrow-head-point]")
    .getAttribute("data-arrow-head-point");
  expect(during).not.toBe(before);
});

test("drags markers and closed regions but keeps locked geometry", async ({
  page,
}) => {
  // verify drag positions and locked-region behavior
});
```

- [ ] **Step 2: Run full unit and static checks**

Run:

```powershell
npm run typecheck
npm test -- --run
```

Expected: PASS.

- [ ] **Step 3: Build and run Playwright**

Run:

```powershell
npm run build
npx playwright test
npx playwright test tests/e2e/standalone.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Visually inspect**

Confirm at 1440×900 and 1024×768:

- PSD assets retain their original structure;
- NATO asset group remains separate;
- marker opacity is 100% by default;
- lines and arrowheads have no outline pass;
- arrowhead tracks the animated line head;
- double rails remain open;
- region corners are sharp with no vertex dots;
- markers and regions can be dragged;
- locked regions drag but do not gain nodes;
- color changes are visible before and after export.

- [ ] **Step 5: Commit**

```powershell
git add src tests docs README.md
git commit -m "feat: refine brush paths and region editing"
```

## Self-Review

- PSD/NATO asset separation is preserved and not reopened by this plan.
- No outline pass remains for map lines or arrowheads.
- Arrowhead movement is derived from the animated path head, not the final endpoint.
- Region closure and geometry locking are separate states.
- Marker and region dragging are explicit acceptance criteria.
- Opacity, line width, start width, end width and color controls each have UI and test coverage.
- Old project files receive deterministic width and region defaults.
