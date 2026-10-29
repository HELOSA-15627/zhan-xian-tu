# Tactical Atlas Editor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Web tactical map editor that imports a custom raster basemap, supports vector tactical annotations and arrow animation, and exports the finished map as PNG plus a portable project file.

**Architecture:** React owns the application shell and editor controls. A pure SVG scene renders the basemap, objects, animation and selection chrome inside a transformable canvas viewport. Zustand stores project state and bounded undo/redo history; IndexedDB persists the project locally; export code serializes the same SVG scene for PNG output.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, Phosphor Icons, Vitest, Testing Library, Playwright, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-10-29-tactical-atlas-editor-design.md`

## Global Constraints

- The application is web-only for this MVP.
- Imported basemap formats are PNG, JPG, JPEG and WebP.
- PNG export is mandatory.
- Project export and import use the `.atlas.json` extension.
- No online basemap, account, cloud sync, collaboration, GIS projection or video export.
- UI accent is `#e3318d`; faction colors are restricted to map content.
- No copied character art, logos or scanned pages from the reference books.
- Every behavior change follows red-green-refactor.
- The map and object coordinates are independent of the viewport transform.
- A static export must never contain selection outlines, handles, timeline controls or editor chrome.

---

### Task 1: Scaffold and Visual Tokens

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/App.tsx`

**Interfaces:**
- Consumes: none.
- Produces: Vite React entry point, type-check command, unit-test command, production build command and named CSS tokens from the spec.

- [ ] Create the Vite React TypeScript application configuration and install runtime and test dependencies.
- [ ] Add the complete token palette and global typography from the design spec.
- [ ] Add an application shell landmark with `main`, top bar, tool rail, side panels and timeline regions.
- [ ] Run `npm run typecheck` and `npm run build`.
- [ ] Expected: both commands exit successfully.
- [ ] Commit the scaffold.

### Task 2: Data Model and Project Factories

**Files:**
- Create: `src/model/types.ts`
- Create: `src/model/project.ts`
- Test: `src/model/project.test.ts`

**Interfaces:**
- Consumes: token names and TypeScript environment from Task 1.
- Produces:
  - `createId(prefix: string): string`
  - `createLayer(name: string): Layer`
  - `createBlankProject(title?: string): AtlasProject`
  - `createMarker(layerId: string, point: Point, symbol?: TacticalSymbol): MarkerObject`
  - `createArrow(layerId: string, start: Point, end: Point): ArrowObject`
  - `createRegion(layerId: string, points: Point[]): RegionObject`
  - `createText(layerId: string, point: Point, text?: string): TextObject`
  - `createFreehand(layerId: string, points: Point[]): FreehandObject`
  - `duplicateObject(object: SceneObject): SceneObject`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  createArrow,
  createBlankProject,
  createFreehand,
  createMarker,
  createRegion,
  createText,
  duplicateObject,
} from "./project";

describe("project factories", () => {
  it("creates a project with one editable annotation layer", () => {
    const project = createBlankProject("测试地图");
    expect(project.title).toBe("测试地图");
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0].locked).toBe(false);
  });

  it("creates every object type on the requested layer", () => {
    const layerId = "layer-1";
    const point = { x: 40, y: 80 };
    const objects = [
      createMarker(layerId, point),
      createArrow(layerId, point, { x: 240, y: 180 }),
      createRegion(layerId, [point, { x: 100, y: 100 }]),
      createText(layerId, point, "指挥部"),
      createFreehand(layerId, [point, { x: 60, y: 90 }]),
    ];
    expect(objects.map((object) => object.type)).toEqual([
      "marker",
      "arrow",
      "region",
      "text",
      "freehand",
    ]);
    expect(objects.every((object) => object.layerId === layerId)).toBe(true);
  });

  it("duplicates with a fresh identity and offset position", () => {
    const marker = createMarker("layer-1", { x: 10, y: 20 });
    const copy = duplicateObject(marker);
    expect(copy.id).not.toBe(marker.id);
    expect(copy.type).toBe("marker");
    if (copy.type === "marker") {
      expect(copy.x).toBe(22);
      expect(copy.y).toBe(32);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --run src/model/project.test.ts`
Expected: FAIL because `src/model/project.ts` does not exist.

- [ ] **Step 3: Implement the model and factories**

```ts
export type Point = { x: number; y: number };
export type TacticalSymbol =
  | "friendly"
  | "hostile"
  | "headquarters"
  | "defense"
  | "nest"
  | "objective"
  | "armor"
  | "aviation";
```

Use the complete union types from the design spec. Generate IDs with `crypto.randomUUID()` and a readable prefix.

- [ ] **Step 4: Run the test and verify pass**

Run: `npm test -- --run src/model/project.test.ts`
Expected: PASS with three tests.

- [ ] **Step 5: Commit**

```bash
git add src/model
git commit -m "feat: add project data model"
```

### Task 3: Geometry and Viewport Transform

**Files:**
- Create: `src/model/geometry.ts`
- Test: `src/model/geometry.test.ts`

**Interfaces:**
- Consumes: `Point` from Task 2.
- Produces:
  - `type Viewport = { x: number; y: number; scale: number }`
  - `screenToWorld(point: Point, viewport: Viewport): Point`
  - `worldToScreen(point: Point, viewport: Viewport): Point`
  - `fitViewport(canvas: Size, viewportSize: Size, padding?: number): Viewport`
  - `zoomAt(viewport: Viewport, pointer: Point, nextScale: number): Viewport`
  - `clampScale(scale: number): number`

- [ ] **Step 1: Write failing transform tests**

```ts
it("round-trips a point through screen and world coordinates", () => {
  const viewport = { x: 120, y: 80, scale: 1.75 };
  const world = { x: 310, y: 240 };
  expect(screenToWorld(worldToScreen(world, viewport), viewport)).toEqual(world);
});

it("fits the map inside a padded viewport", () => {
  expect(fitViewport({ width: 1600, height: 900 }, { width: 1000, height: 700 }, 40))
    .toEqual({ scale: 0.575, x: 40, y: 121.25 });
});

it("keeps the pointer world position fixed while zooming", () => {
  const viewport = { x: 0, y: 0, scale: 1 };
  const pointer = { x: 300, y: 200 };
  const before = screenToWorld(pointer, viewport);
  const next = zoomAt(viewport, pointer, 2);
  expect(screenToWorld(pointer, next)).toEqual(before);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/model/geometry.test.ts`
Expected: FAIL because the geometry module does not exist.

- [ ] **Step 3: Implement geometry**

```ts
export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  };
}
```

Implement the inverse and zoom formulas with unrounded internal values. Round only the test-facing exported viewport in `fitViewport` to four decimal places.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/model/geometry.test.ts`
Expected: PASS with three tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/geometry.ts src/model/geometry.test.ts
git commit -m "feat: add map viewport geometry"
```

### Task 4: Undoable Editor Store

**Files:**
- Create: `src/store/editorStore.ts`
- Test: `src/store/editorStore.test.ts`

**Interfaces:**
- Consumes: project factories, object unions and geometry viewport.
- Produces:
  - `useEditorStore`
  - Store actions: `setTool`, `setSelection`, `setViewport`, `addObject`, `updateObject`, `removeSelected`, `duplicateSelected`, `addLayer`, `toggleLayer`, `undo`, `redo`, `loadProject`, `createNewProject`
  - State fields: `project`, `selectedIds`, `tool`, `viewport`, `past`, `future`

- [ ] **Step 1: Write failing store tests**

```ts
it("adds an object and undoes it", () => {
  const store = useEditorStore.getState();
  const layerId = store.project.layers[0].id;
  const marker = createMarker(layerId, { x: 50, y: 50 });
  store.addObject(marker);
  expect(useEditorStore.getState().project.objects).toHaveLength(1);
  useEditorStore.getState().undo();
  expect(useEditorStore.getState().project.objects).toHaveLength(0);
  useEditorStore.getState().redo();
  expect(useEditorStore.getState().project.objects).toHaveLength(1);
});

it("updates an object without recording viewport changes", () => {
  const marker = createMarker(useEditorStore.getState().project.layers[0].id, { x: 0, y: 0 });
  useEditorStore.getState().addObject(marker);
  const historyLength = useEditorStore.getState().past.length;
  useEditorStore.getState().updateObject(marker.id, { x: 80 });
  useEditorStore.getState().setViewport({ x: 20, y: 20, scale: 2 });
  expect(useEditorStore.getState().past).toHaveLength(historyLength + 1);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/store/editorStore.test.ts`
Expected: FAIL because the store module does not exist.

- [ ] **Step 3: Implement bounded history**

Use a `recordProject(next)` helper that pushes a structured clone of the current project to `past`, clears `future`, and caps history at 50 entries. `setViewport`, `setTool` and selection changes bypass history.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/store/editorStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: add undoable editor state"
```

### Task 5: Arrow Animation and Timeline

**Files:**
- Create: `src/model/animation.ts`
- Create: `src/components/Timeline.tsx`
- Test: `src/model/animation.test.ts`

**Interfaces:**
- Consumes: `ArrowObject` and `AnimationSpec`.
- Produces:
  - `getAnimationEnd(arrow: ArrowObject): number`
  - `getTimelineDuration(objects: SceneObject[]): number`
  - `getArrowAnimationProgress(animation: AnimationSpec, time: number): number`
  - `arrowDashState(length: number, progress: number): { dasharray: string; dashoffset: number }`
  - `Timeline` component props `{ duration: number; time: number; playing: boolean; onTimeChange(time: number): void; onToggle(): void; onReset(): void }`

- [ ] **Step 1: Write failing animation tests**

```ts
it("returns a clamped progress for delayed arrows", () => {
  const animation = { enabled: true, delay: 1, duration: 2, repeat: 0 };
  expect(getArrowAnimationProgress(animation, 0.5)).toBe(0);
  expect(getArrowAnimationProgress(animation, 2)).toBe(0.5);
  expect(getArrowAnimationProgress(animation, 4)).toBe(1);
});

it("finds the longest arrow animation", () => {
  const objects = [
    createArrow("layer", { x: 0, y: 0 }, { x: 1, y: 1 }),
    createArrow("layer", { x: 0, y: 0 }, { x: 2, y: 2 }),
  ];
  objects[1].animation.delay = 3;
  expect(getTimelineDuration(objects)).toBe(4);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/model/animation.test.ts`
Expected: FAIL because `animation.ts` does not exist.

- [ ] **Step 3: Implement animation math and timeline**

Default arrow duration is `1.2`, delay is `0`, repeat is `0`. Timeline duration is 0 when no arrow has enabled animation.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/model/animation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model/animation.ts src/model/animation.test.ts src/components/Timeline.tsx
git commit -m "feat: add arrow animation timeline"
```

### Task 6: SVG Scene and Tactical Symbols

**Files:**
- Create: `src/components/TacticalSymbol.tsx`
- Create: `src/components/SceneSvg.tsx`
- Test: `src/components/SceneSvg.test.tsx`

**Interfaces:**
- Consumes: project objects, viewport and animation time.
- Produces:
  - `TacticalSymbol({ symbol, color, size }: TacticalSymbolProps)`
  - `SceneSvg({ project, selectedIds, selectionHandles, time, interactive }: SceneSvgProps)`

- [ ] **Step 1: Write failing component tests**

```tsx
it("renders visible objects from visible layers", () => {
  const project = createBlankProject();
  project.objects = [createText(project.layers[0].id, { x: 20, y: 30 }, "渡岛作战")];
  render(<SceneSvg project={project} selectedIds={[]} time={0} interactive={false} />);
  expect(screen.getByText("渡岛作战")).toBeInTheDocument();
});

it("omits objects from hidden layers", () => {
  const project = createBlankProject();
  project.layers[0].visible = false;
  project.objects = [createText(project.layers[0].id, { x: 20, y: 30 }, "不可见")];
  render(<SceneSvg project={project} selectedIds={[]} time={0} interactive={false} />);
  expect(screen.queryByText("不可见")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/components/SceneSvg.test.tsx`
Expected: FAIL because the SVG scene does not exist.

- [ ] **Step 3: Implement original tactical symbols and scene rendering**

Use SVG geometry only. Build markers as distinct combinations of diamond, chevron, ring, crosshair and flag. Do not copy any reference-book logo or illustration. Render the basemap with `<image preserveAspectRatio="xMidYMid slice">`.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/components/SceneSvg.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TacticalSymbol.tsx src/components/SceneSvg.tsx src/components/SceneSvg.test.tsx
git commit -m "feat: render tactical map scene"
```

### Task 7: Drawing Canvas Interactions

**Files:**
- Create: `src/components/MapCanvas.tsx`
- Test: `src/components/MapCanvas.test.tsx`

**Interfaces:**
- Consumes: `useEditorStore`, geometry helpers and `SceneSvg`.
- Produces: pointer-driven select, pan, marker, arrow, region, text and freehand interactions plus wheel zoom.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it("places a marker when clicking with the marker tool", async () => {
  useEditorStore.getState().createNewProject();
  useEditorStore.getState().setTool("marker");
  render(<MapCanvas />);
  await userEvent.click(screen.getByTestId("map-canvas"), { clientX: 120, clientY: 90 });
  expect(useEditorStore.getState().project.objects[0]?.type).toBe("marker");
});

it("creates an arrow from pointer down to pointer up", async () => {
  useEditorStore.getState().createNewProject();
  useEditorStore.getState().setTool("arrow");
  render(<MapCanvas />);
  const canvas = screen.getByTestId("map-canvas");
  await userEvent.pointer([
    { target: canvas, coords: { clientX: 100, clientY: 100 }, keys: "[MouseLeft>]" },
    { target: canvas, coords: { clientX: 260, clientY: 180 }, keys: "[/MouseLeft]" },
  ]);
  expect(useEditorStore.getState().project.objects[0]?.type).toBe("arrow");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/components/MapCanvas.test.tsx`
Expected: FAIL because `MapCanvas` does not exist.

- [ ] **Step 3: Implement pointer interactions**

Use `getBoundingClientRect()` and `screenToWorld()` for all map coordinates. Use pointer capture while drawing or dragging. Reserve `Space` for temporary pan. Disable drawing on locked or hidden layers.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/components/MapCanvas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapCanvas.tsx src/components/MapCanvas.test.tsx
git commit -m "feat: add drawing canvas interactions"
```

### Task 8: Library, Inspector and Layer Panels

**Files:**
- Create: `src/components/ToolRail.tsx`
- Create: `src/components/AssetLibrary.tsx`
- Create: `src/components/LayerPanel.tsx`
- Create: `src/components/Inspector.tsx`
- Create: `src/components/TopBar.tsx`
- Test: `src/components/Inspector.test.tsx`
- Test: `src/components/LayerPanel.test.tsx`

**Interfaces:**
- Consumes: editor store, imported image file and tactical symbols.
- Produces: complete editor chrome and accessible controls with labels.

- [ ] **Step 1: Write failing panel tests**

```tsx
it("updates the selected arrow color", async () => {
  const store = useEditorStore.getState();
  const arrow = createArrow(store.project.layers[0].id, { x: 0, y: 0 }, { x: 100, y: 100 });
  store.addObject(arrow);
  store.setSelection([arrow.id]);
  render(<Inspector />);
  const color = screen.getByLabelText("箭头颜色");
  await userEvent.clear(color);
  await userEvent.type(color, "#b9e253");
  expect(useEditorStore.getState().project.objects[0]).toMatchObject({ color: "#b9e253" });
});

it("toggles layer visibility", async () => {
  render(<LayerPanel />);
  const toggle = screen.getByRole("checkbox", { name: /显示图层/ });
  await userEvent.click(toggle);
  expect(useEditorStore.getState().project.layers[0].visible).toBe(false);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/components/Inspector.test.tsx src/components/LayerPanel.test.tsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the editor chrome**

Use Phosphor icons with one weight. Add explicit labels for unlabeled icon buttons. Use true inputs and buttons, visible focus rings, and no custom div-button controls.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/components/Inspector.test.tsx src/components/LayerPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat: add editor panels and controls"
```

### Task 9: IndexedDB Persistence and Project Import

**Files:**
- Create: `src/persistence/projectRepository.ts`
- Test: `src/persistence/projectRepository.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AtlasProject`.
- Produces:
  - `saveProject(project: AtlasProject): Promise<void>`
  - `loadProject(): Promise<AtlasProject | null>`
  - `clearProject(): Promise<void>`
  - `parseProjectFile(text: string): AtlasProject`
  - `serializeProject(project: AtlasProject): string`

- [ ] **Step 1: Write failing persistence tests**

```ts
import "fake-indexeddb/auto";

it("round-trips a project through IndexedDB", async () => {
  const project = createBlankProject("测试");
  await saveProject(project);
  expect(await loadProject()).toEqual(project);
});

it("rejects invalid project JSON", () => {
  expect(() => parseProjectFile('{"hello":"world"}')).toThrow("项目文件格式无效");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/persistence/projectRepository.test.ts`
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement persistence**

Use IndexedDB database `tactical-atlas`, store `projects`, key `current`. Validate `version`, `layers`, `objects`, and numeric width and height before accepting a project. Add a 500ms debounced autosave effect in `App`.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/persistence/projectRepository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/persistence src/App.tsx
git commit -m "feat: persist projects locally"
```

### Task 10: PNG and Project Export

**Files:**
- Create: `src/export/exportProject.ts`
- Create: `src/export/exportPng.ts`
- Test: `src/export/exportProject.test.ts`
- Test: `src/export/exportPng.test.ts`
- Modify: `src/components/TopBar.tsx`

**Interfaces:**
- Consumes: `AtlasProject`, `SceneSvg` serialization and the current background data.
- Produces:
  - `downloadProject(project: AtlasProject, filename?: string): void`
  - `buildSceneSvg(project: AtlasProject): string`
  - `renderProjectToPng(project: AtlasProject, scale: 1 | 2): Promise<Blob>`
  - `downloadPng(project: AtlasProject, scale: 1 | 2): Promise<void>`

- [ ] **Step 1: Write failing export tests**

```ts
it("serializes the scene at the native map dimensions", () => {
  const project = createBlankProject();
  project.width = 1280;
  project.height = 720;
  const svg = buildSceneSvg(project);
  expect(svg).toContain('width="1280"');
  expect(svg).toContain('height="720"');
  expect(svg).not.toContain("selection-handle");
});

it("rejects unsupported export scales", async () => {
  await expect(renderProjectToPng(createBlankProject(), 3 as never)).rejects.toThrow(
    "导出倍率必须是 1 或 2",
  );
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/export/exportPng.test.ts src/export/exportProject.test.ts`
Expected: FAIL because export modules do not exist.

- [ ] **Step 3: Implement export**

Build a standalone SVG string with the basemap, background filters, grid, objects and labels. Hide all selection-only markup. Convert the SVG to an image and draw it onto a canvas at `width * scale` and `height * scale`, then encode PNG. Use a Blob download helper.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/export/exportPng.test.ts src/export/exportProject.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/export src/components/TopBar.tsx
git commit -m "feat: export map project and png"
```

### Task 11: Responsive Assembly and Empty States

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`
- Create: `src/components/WelcomeOverlay.tsx`
- Test: `src/components/WelcomeOverlay.test.tsx`

**Interfaces:**
- Consumes: import action and new project action.
- Produces: complete application assembly plus import prompt, autosave error, empty and narrow-screen states.

- [ ] **Step 1: Write failing empty-state test**

```tsx
it("offers basemap import and blank drawing", async () => {
  render(<WelcomeOverlay open onClose={() => {}} onImport={() => {}} />);
  expect(screen.getByRole("button", { name: "导入底图" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "直接开始绘制" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- --run src/components/WelcomeOverlay.test.tsx`
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement responsive shell**

At widths below 1100px collapse the left panel and inspector into drawers. Keep the canvas and top export action accessible. Below 760px show a clear notice that precise drawing is optimized for desktop but still allow importing and exporting.

- [ ] **Step 4: Run test and verify pass**

Run: `npm test -- --run src/components/WelcomeOverlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles/global.css src/components/WelcomeOverlay.tsx src/components/WelcomeOverlay.test.tsx
git commit -m "feat: assemble responsive editor experience"
```

### Task 12: Browser Validation and Visual QA

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/editor.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete application.
- Produces: repeatable end-to-end proof for import, drawing, animation, autosave and PNG export.

- [ ] **Step 1: Write the failing end-to-end test**

```ts
test("draws and exports a tactical map", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "直接开始绘制" }).click();
  await page.getByRole("button", { name: "友军图标" }).click();
  await page.getByTestId("map-canvas").click({ position: { x: 420, y: 300 } });
  await page.getByRole("button", { name: "箭头" }).click();
  const canvas = page.getByTestId("map-canvas");
  await canvas.dragTo(canvas, {
    sourcePosition: { x: 260, y: 260 },
    targetPosition: { x: 620, y: 360 },
  });
  await expect(page.getByText("1 个对象")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG" }).click();
  await expect((await download).suggestedFilename()).toMatch(/\.png$/);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm run test:e2e -- --grep "draws and exports"`
Expected: FAIL until all application interactions are wired.

- [ ] **Step 3: Complete wiring and fix interface mismatches**

Ensure every visible control has a stable accessible name. Confirm the selected marker and arrow both appear in the object count.

- [ ] **Step 4: Run build, unit tests and end-to-end tests**

Run:

```bash
npm run typecheck
npm test -- --run
npm run build
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 5: Capture desktop and narrow screenshots**

Use Playwright because the Browser plugin is not available in this session. Capture at 1440x900 and 1024x768, inspect them with `view_image`, and record:

- toolbar and panel density;
- map legibility;
- selected and unselected states;
- timeline readability;
- PNG download success.

- [ ] **Step 6: Run interface guideline audit**

Fetch the current Web Interface Guidelines and review `src/**.tsx` and `src/styles/**.css`. Fix contrast, focus, keyboard, form-label, reduced-motion and hit-target findings.

- [ ] **Step 7: Manual export verification**

Export a project containing a raster basemap, marker, arrow and text. Verify the PNG opens, has the expected dimensions and contains no selection chrome. Re-import the `.atlas.json` file and verify the object count.

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts tests/e2e README.md
git commit -m "test: verify editor export workflow"
```
