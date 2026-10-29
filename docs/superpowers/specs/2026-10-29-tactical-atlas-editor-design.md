# 战线图志：Web 战术地图编辑器 MVP 设计规格

## 1. 产品定义

战线图志是一个本地优先的 Web 战术地图编辑器。用户导入自定义底图后，可以放置战役战术图标、绘制箭头和区域、添加批注，并通过时间线播放简化的箭头推进动画。

首版解决的是“把战役思路快速画成一张可导出的地图”，不解决在线底图、账号、协作和 GIS 分析。

## 2. 目标用户

- 需要制作架空战役图、战史讲解图或世界观地图的创作者。
- 熟悉观察、箭头、防线、单位标识等军事地图语言，但不一定熟悉专业 GIS。
- 主要使用桌面浏览器，希望保存和导出完全在本地完成。

## 3. MVP 必需能力

### 3.1 底图

- 支持导入 PNG、JPG、JPEG、WebP。
- 导入后自动适配当前视口。
- 支持底图透明度、灰度、对比度和亮度调整。
- 支持替换底图，不改变已有标注。

### 3.2 绘图

- 选择、框选、平移、缩放。
- 放置战役图标：友军、敌军、指挥部、防线、巢穴、目标、装甲、航空。
- 绘制带箭头的直线推进路径。
- 绘制多边形区域和自由手绘线。
- 添加单行或多行文字批注。
- 选中对象后可拖动、旋转、复制、删除，并编辑颜色、线宽、不透明度和尺寸。

### 3.3 图层

- 新建、重命名、显示、隐藏、锁定和删除图层。
- 对象始终归属于一个图层。
- 图层面板按绘制顺序显示对象。
- 支持对象上移、下移和图层切换。

### 3.4 动画

- 每条箭头支持单独开启“绘制出现”动画。
- 可设置持续时间、延迟和重复次数。
- 底部时间线提供播放、暂停、回到起点、拖动进度。
- 动画只作用于箭头，不改变最终静态导出结果。

### 3.5 保存与导出

- 项目自动保存在 IndexedDB。
- 可导出 `.atlas.json` 项目文件，底图以 data URL 内嵌，保证换机器后仍能打开。
- 可导入 `.atlas.json` 项目文件。
- 必须支持导出完整地图 PNG。
- PNG 默认使用地图原始宽高，可选 1x 或 2x；导出内容包含底图和全部可见、未锁定也不影响导出的对象。
- 导出时隐藏选择框、手柄、网格辅助线和界面控件。

### 3.6 历史

- 支持撤销和重做。
- 图标移动、属性修改、绘制、删除、图层调整均产生历史记录。
- 视口缩放和平移不进入历史。

## 4. 明确不做

- 在线地图瓦片。
- 用户账户、云同步、发布和分享链接。
- 多人实时协作。
- GeoJSON、KML、Shapefile 导入导出。
- 布尔几何运算、坐标投影转换和比例尺计算。
- 视频导出。
- 自动识别设定集插画或版权素材。

## 5. 交互模型

### 5.1 主界面

- 顶栏：项目名、导入、保存状态、撤销、重做、导出。
- 左工具轨：选择、平移、图标、箭头、区域、文字、手绘。
- 左面板：图标库、图层、项目信息三个页签。
- 中央：地图画布。
- 右面板：选中对象属性；无选中时显示画布和底图属性。
- 底部：固定时间线与动画控制。

### 5.2 画布操作

- 滚轮以指针位置为中心缩放。
- 空格加拖动、鼠标中键或平移工具移动画布。
- 点击选择对象，Shift 点击追加选择。
- 拖动选框进行框选。
- 选中对象后显示四角缩放手柄、旋转手柄和箭头端点手柄。
- Delete 删除选中对象。
- Ctrl/Cmd+D 复制对象。
- Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Shift+Z 重做。
- Esc 取消当前绘制或退出选择。

### 5.3 箭头动画

- 箭头在静态状态下完整可见。
- 播放时按延迟和持续时间逐步显示描边。
- 时间线进度取所有箭头动画的最大结束时间。
- 在导出 PNG 前始终恢复完整静态状态。

## 6. 视觉系统

### 6.1 视觉概念

界面像一张铺在深色指挥桌上的档案地图。深色框体退到外围，中央地图纸面保持高明度和低纹理，让绘图内容成为唯一主角。品红色只承担实时操作与播放状态，不用于大面积装饰。

### 6.2 颜色

| Token | 值 | 用途 |
|---|---|---|
| ink | `#0b0d12` | 应用最外层背景 |
| graphite | `#141821` | 工具栏和面板 |
| graphite-raised | `#1c2130` | 选中行、浮层和输入框 |
| line | `#343b4f` | 分隔线和边框 |
| paper | `#d8ccb4` | 默认地图纸面 |
| paper-dark | `#a99d86` | 网格和纸面质感 |
| text | `#f2efe8` | 深色界面文字 |
| muted | `#9098aa` | 次级信息 |
| signal | `#e3318d` | 选中、时间线、主操作 |
| friendly | `#b9e253` | 友军和防线 |
| hostile | `#e85a4f` | 敌军和威胁 |
| info | `#5cc7d8` | 支援、航空和信息 |
| warning | `#e8b34a` | 目标、提示和警戒 |

界面只使用 `signal` 作为交互强调色。阵营颜色只出现在地图内容与图标库中。

### 6.3 字体

- UI 正文与标题：`IBM Plex Sans`，中文回退到 `Microsoft YaHei`。
- 坐标、尺寸、时间和编号：`IBM Plex Mono`。
- 地图标签：`Noto Sans SC` 或系统中文无衬线，600 字重。
- 不使用装饰性衬线字体。

### 6.4 形状与材质

- 壳体和控件使用 4px 小圆角，地图对象保持锐利几何。
- 面板以边界和色阶分层，不使用悬浮大卡片。
- 地图区域叠加极细网格、经纬刻度和少量等高线纹理。
- 图标采用原创抽象符号，不使用设定集中的角色、标志或扫描图。

### 6.5 排版原则

- 左对齐所有工作界面信息。
- 短标签使用 11-12px；控件正文 13px；面板标题 15px。
- 时间线和坐标信息使用等宽数字，但不滥用全大写标签。
- 空状态文案直接说明下一步操作。

## 7. 技术架构

### 7.1 技术栈

- React 19
- TypeScript
- Vite
- Zustand
- Phosphor Icons
- Vitest
- Testing Library
- Playwright
- fake-indexeddb

地图采用 SVG 渲染图层，底图使用 SVG `<image>`。画布容器只负责视口变换、输入捕获和缩放手柄。

### 7.2 模块

| 模块 | 职责 |
|---|---|
| `src/model/types.ts` | 项目、图层、对象、工具和动画类型 |
| `src/model/project.ts` | 创建空白项目、工厂函数、对象操作 |
| `src/model/geometry.ts` | 坐标转换、视口适配、缩放和平移 |
| `src/model/animation.ts` | 箭头动画时长、延迟、进度和 dash offset |
| `src/store/editorStore.ts` | 编辑器状态、选择、历史和属性修改 |
| `src/persistence/projectRepository.ts` | IndexedDB 自动保存和加载 |
| `src/export/exportProject.ts` | 项目 JSON 导入导出 |
| `src/export/exportPng.ts` | SVG 场景序列化和 PNG 下载 |
| `src/components/MapCanvas.tsx` | 画布视口和绘图交互 |
| `src/components/SceneSvg.tsx` | 无界面依赖的纯 SVG 场景 |
| `src/components/Inspector.tsx` | 对象和底图属性 |
| `src/components/Timeline.tsx` | 箭头动画播放控制 |
| `src/components/AssetLibrary.tsx` | 战术图标与底图 |
| `src/components/LayerPanel.tsx` | 图层及对象管理 |

### 7.3 数据模型

```ts
type Point = { x: number; y: number };

type TacticalSymbol =
  | "friendly"
  | "hostile"
  | "headquarters"
  | "defense"
  | "nest"
  | "objective"
  | "armor"
  | "aviation";

type AnimationSpec = {
  enabled: boolean;
  delay: number;
  duration: number;
  repeat: number;
};

type SceneObject =
  | {
      id: string;
      layerId: string;
      type: "marker";
      x: number;
      y: number;
      size: number;
      rotation: number;
      opacity: number;
      color: string;
      symbol: TacticalSymbol;
      label: string;
    }
  | {
      id: string;
      layerId: string;
      type: "arrow";
      start: Point;
      end: Point;
      color: string;
      width: number;
      opacity: number;
      dashed: boolean;
      animation: AnimationSpec;
      label: string;
    }
  | {
      id: string;
      layerId: string;
      type: "region";
      points: Point[];
      fill: string;
      stroke: string;
      strokeWidth: number;
      opacity: number;
      label: string;
    }
  | {
      id: string;
      layerId: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
      rotation: number;
      opacity: number;
    }
  | {
      id: string;
      layerId: string;
      type: "freehand";
      points: Point[];
      color: string;
      strokeWidth: number;
      opacity: number;
      label: string;
    };
```

### 7.4 保存格式

```ts
type AtlasProject = {
  version: 1;
  id: string;
  title: string;
  width: number;
  height: number;
  updatedAt: string;
  background: {
    dataUrl: string | null;
    opacity: number;
    grayscale: number;
    contrast: number;
    brightness: number;
  };
  layers: Layer[];
  objects: SceneObject[];
};
```

## 8. 错误与空状态

- 底图读取失败：显示“无法读取这张图片，请选择 PNG、JPG 或 WebP 文件”。
- 项目解析失败：显示文件格式错误，不覆盖当前项目。
- IndexedDB 不可用：继续允许编辑，顶部显示“当前无法自动保存，请导出项目文件”。
- 空画布：显示虚线网格和“导入底图或直接开始绘制”。
- 无图层对象：图层行显示“此图层还没有标注”。
- 动画无箭头：时间线禁用播放并显示“给箭头开启绘制动画后可播放”。

## 9. 验收标准

- 能在 1440x900 和 1024x768 桌面视口正常使用。
- 拖入一张 1600x900 PNG 后，底图和画布尺寸正确更新。
- 能绘制至少 8 类图标、箭头、区域、文字和手绘线。
- 箭头播放时从起点到终点逐步出现，拖动时间线可改变进度。
- 撤销、重做可恢复对象创建、移动和删除。
- 刷新页面后恢复最后一次自动保存。
- 导出项目 JSON 后可重新导入且对象数量、属性和底图保持不变。
- 导出 PNG 后，像素尺寸等于地图宽高乘以导出倍率，且不包含选择框和编辑器控件。
- 构建、单元测试和浏览器核心流程测试通过。

## 10. 素材与版权边界

- 设定集仅用于归纳色彩、线型、标注层级与图形语法。
- 不把设定集扫描页、角色、组织徽标、作品 Logo 或机甲原画打包进应用。
- 内置图标、示例地图和界面纹理由项目原创绘制。
