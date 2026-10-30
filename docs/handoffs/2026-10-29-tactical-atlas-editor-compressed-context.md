# 战线图志：压缩上下文

> 压缩日期：2026-10-29  
> 来源对话：`开发战役地图编辑器MVP`（`01a186c4-d356-7c23-b2d2-290fb632a6a6`）与续接对话 `开发战役地图编辑器MVP (2)`（`01a18707-3dec-7080-9e0d-79f26e7d1d2a`）  
> 项目目录：`D:\不知道干啥的先放着\tactical-atlas-editor`

## 新会话开场

继续开发 `D:\不知道干啥的先放着\tactical-atlas-editor` 中的“战线图志”战术地图编辑器。先读取本文件、`docs/superpowers/specs/2026-10-29-tactical-atlas-editor-design.md`、`docs/superpowers/plans/2026-10-29-tactical-atlas-editor-mvp.md` 和实际工作树，再继续处理。当前最高优先级是把用户提供的 14 张参考图作为视觉基准，修正单位图标、画笔、线型和整体样式；白屏修复已在工作树中完成但仍未提交。

## 用户目标

制作一个本地优先的战役战术地图编辑器 MVP，主要能力如下：

- 导入自定义 PNG、JPG、JPEG、WebP 底图。
- 在底图上放置战役战术图标，绘制箭头、区域、文字和自由手绘线。
- 编辑对象颜色、线宽、尺寸、旋转、透明度和图层。
- 为箭头设置延迟、持续时间，并通过底部时间线播放简单的推进动画。
- 本地自动保存，导入导出 `.atlas.json` 项目文件，导出完整 PNG。
- 首版弱化联网底图，绘制体验和视觉呈现优先。

当前实现选择为 Web-only MVP。项目需要能通过本地服务器运行，也应能直接打开单文件构建产物，避免用户双击 HTML 后白屏。

## 最新视觉要求

用户看过初版预览后明确否定了原来的“原创抽象战术符号”方案，要求：

- 单位图标、笔刷、线型和其他样式直接以用户提供的参考图为基准。
- 不是只沿用抽象的军事地图语言，而是按照参考图复刻形状、尺寸关系、描边、颜色、填充和排布。
- 旧设计规格中“图标采用原创抽象符号”的视觉限制已经被这次反馈覆盖。
- 参考图只用于视觉复刻；不要把设定集整页扫描、作品 Logo 或原画直接打包成应用运行时素材。优先用 SVG、CSS、Canvas 重新绘制。

14 张参考图已经复制到：

`D:\不知道干啥的先放着\tactical-atlas-editor\tmp\tactical-atlas-reference-images\`

新会话必须直接打开这些图片检查，不要只根据本摘要想象视觉。不要把这些图片重新以内嵌内容粘贴进请求，否则可能再次触发 `413 Payload Too Large`。

原始用户消息中的临时路径位于 `C:\Users\13743\AppData\Local\Temp\codex-clipboard-*.png`；上面的项目内目录是持久副本。

## 资料与应用参考

设定资料：

- `E:\MZ\102\艺术设定集、杂志\设定资料\ATE设定集beta版.pdf`
- `E:\MZ\102\艺术设定集、杂志\设定资料\中文版Muv-Luv Alternative Integral Works.pdf`

已归纳出的旧视觉规律仅作为背景，最新参考图优先：

- 深紫或黑色战役底图、浅色陆地、细网格、品红边界和编号节点。
- 黄色双线防线，敌我推进使用宽色带或半透明粗箭头。
- 纸面战术图使用固定阵营色：友军绿、敌军红、支援蓝、警示粉。
- 单位和编队多采用平涂矩形、菱形、楔形、飞机或机甲俯视剪影。
- 地图上少写长文字，更多使用短标签、编号圆章、引线、说明卡和时间线面板。

功能参考应用：

`D:\地图书\Di Map Editor\`

已确认其功能包括底图导入与滤镜、图层、标记、线条、多边形、文字、图例、属性、复制粘贴、撤销重做、距离和面积测量、图片导出，以及线段开始到结束的动画。它只作为功能边界参考，不作为当前视觉参考。

## 已确认范围

MVP 包含：

- 选择、框选、平移、缩放。
- 友军、敌军、指挥部、防线、巢穴、目标、装甲、航空等图标。
- 箭头、区域、文字、自由手绘线。
- 图层显示、隐藏、锁定、删除、对象移层和上下移动。
- 撤销、重做、复制、删除。
- IndexedDB 自动保存。
- `.atlas.json` 导入导出，底图以 data URL 内嵌。
- 原生尺寸或 2x PNG 导出，导出时不含选择框、手柄和编辑器控件。
- 箭头动画延迟、持续时间和时间线拖动。

MVP 不做：

- 在线地图瓦片或在线底图。
- 账号、云同步、发布、分享链接或多人协作。
- GeoJSON、KML、Shapefile。
- 投影转换、布尔几何、复杂 GIS 分析。
- 视频导出。

## 技术架构

- React 19
- TypeScript
- Vite 8
- Zustand
- Phosphor Icons
- SVG 地图场景
- IndexedDB
- Vitest + Testing Library
- Playwright
- `vite-plugin-singlefile` 生成可直接打开的 `dist/index.html`

关键模块：

- `src/model/types.ts`：项目、图层、对象和动画类型。
- `src/model/project.ts`：项目及对象工厂。
- `src/model/geometry.ts`：屏幕坐标、世界坐标、缩放和平移。
- `src/model/animation.ts`：箭头动画时间和 dash offset。
- `src/store/editorStore.ts`：编辑器状态、选择和 50 步历史。
- `src/persistence/projectRepository.ts`：IndexedDB 自动保存。
- `src/export/exportProject.ts`：项目 JSON 导入导出。
- `src/export/exportPng.ts`：无界面 SVG 序列化和 PNG 导出。
- `src/components/MapCanvas.tsx`：画布视口与绘图交互。
- `src/components/SceneSvg.tsx`：纯 SVG 场景。
- `src/components/TacticalSymbol.tsx`：当前战术图标实现，是视觉修正的重点文件。
- `src/components/AssetLibrary.tsx`、`ToolRail.tsx`、`Inspector.tsx`：素材、工具和属性面板。
- `src/styles/tokens.css`、`global.css`：视觉 token、壳体与纸张样式。

地图和对象坐标必须独立于视口 transform。静态导出不得包含选择框、缩放手柄、网格辅助线和编辑器界面。

## 当前工程状态

当前 Git 基线：

```text
2a7d871 feat: complete tactical atlas editor mvp
```

MVP 代码、单元测试、设计规格、实施计划、README 和 Playwright 测试已经存在。

工作树未提交改动：

- 修改 `index.html`：使用 `file://` 打开根入口时自动跳到 `dist/index.html`。
- 修改 `vite.config.ts`：`base: "./"`，启用 `viteSingleFile()`，内联大资源。
- 修改 `package.json`、`package-lock.json`：加入 `vite-plugin-singlefile`，`test:e2e` 会先构建。
- 新增 `tests/e2e/standalone.spec.ts`：验证通过 `file://` 打开 `dist/index.html` 后能显示编辑器。
- 新增 `启动编辑器.cmd`：优先直接打开 `dist/index.html`，没有构建产物时启动本地开发服务器。
- `tmp/` 未跟踪，其中有调试脚本、参考应用拆解内容和上述 14 张视觉参考图。

白屏根因已经确认：

- 直接打开源码 `index.html` 时，浏览器尝试从 `file:///D:/src/main.tsx` 加载模块并被 CORS 阻止。
- 直接打开旧版 `dist/index.html` 时，旧的绝对路径 `/assets/...` 被解析到 `file:///D:/assets/...`，CSS 和 JS 均加载失败。

白屏修复已经落到工作树，但尚未提交。

## 验证状态

本轮重新验证通过：

```text
npm run typecheck
npm test -- --run
```

结果：

- 类型检查通过。
- 15 个测试文件、43 个测试全部通过。

重新构建通过：

```text
npm run build
```

生成的 `dist/index.html` 为约 1.02 MB 的单文件构建。

独立打开测试通过：

```text
npx playwright test tests/e2e/standalone.spec.ts
```

结果：1 个测试通过。`file://` 下的编辑器主界面和“直接开始绘制”按钮可见。

`tests/e2e/editor.spec.ts` 还覆盖底图导入、图标、箭头、动画、PNG 导出、自动保存恢复和项目文件往返；白屏修复后尚未重新跑完整套 E2E。

## 已完成但尚未满足的部分

核心编辑能力已经实现，但用户明确认为视觉不符合要求。当前界面仍接近“深色指挥终端 + 原创造型地图符号”，而最新参考图要求更具体的图标、笔刷和样式复刻。

不要继续沿着旧的抽象图标系统微调。下一步应先逐张检查 14 张参考图，建立明确的视觉映射，再改 `TacticalSymbol.tsx`、`SceneSvg.tsx`、`AssetLibrary.tsx`、工具线型、选中状态和说明卡样式。

## 下一步

1. 读取本文件、设计规格、计划、README 和 `git status`，不要把未提交改动误认为已提交。
2. 逐张打开 `tmp/tactical-atlas-reference-images/` 的 14 张图片，记录每张图用于哪类图标、箭头、防线、笔刷、标签或面板。
3. 给出最小视觉映射表，而不是重新做一轮空泛的风格描述。
4. 先补或更新测试，再修改图标、线型、画笔预览、地图对象和界面样式。
5. 保持本地优先、SVG 场景和无界面 PNG 导出架构。
6. 完整验证：

```text
npm run typecheck
npm test -- --run
npm run build
npx playwright test
```

7. 手动检查 `dist/index.html` 双击打开、1440x900 与 1024x768 布局、图标辨识度、箭头动画和 PNG 导出。
8. 将白屏修复与视觉复刻拆成两个提交。

## 注意事项

- 原对话失败的请求包含 14 张大图，单次请求触发 HTTP 413。后续只传图片路径，不要重复内嵌图片。
- `context-compression` 的默认策略应以“完成任务的总 token”衡量，不能为了节省请求 token 丢失文件路径、测试结果或用户约束。
- 最新用户反馈优先于旧视觉规格；代码、Git 状态和实际文件优先于对话记忆。
- 不要声称完整 E2E 已通过，除非当前工作树真的重新跑过。
