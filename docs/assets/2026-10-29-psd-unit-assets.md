# PSD 兵牌素材映射

来源：`C:\Users\13743\Pictures\图标.psd`

## 分色

| 阵营 | 颜色 |
|---|---|
| 友军 | `#92cf00` |
| 敌军 | `#9b351f` |
| 目标 | `#00d9e0` |

每个 PSD 可见图层均导出友军、敌军、目标三套 PNG。

## 图层映射

| PSD 层级 | 素材 ID | 界面名称 |
|---:|---|---|
| 1 | `friendly-fighter` | 战斗机 |
| 2 | `hostile-fighter` | 飞行体 |
| 3 | `friendly-naval` | 舰艇 |
| 4 | `friendly-artillery` | 火炮 |
| 5 | `friendly-tank` | 装甲 |
| 6 | `friendly-helicopter` | 直升机 |
| 7 | `hostile-heavy` | 重型体 |
| 8 | `hostile-fortress` | 要塞体 |
| 9 | `hostile-crawler` | 爬行体 |
| 10 | `friendly-hovercraft` | 气垫艇 |
| 11 | `hostile-scout` | 小型体 |
| 12 | `hostile-crawler-biped` | 步行体 |
| 13 | `hostile-artillery` | 远程体 |
| 14 | `target-frame` | 目标框 |
| 15 | `arrow-head` | 箭头笔尖 |
| 16 | `friendly-fighter-clean` | 新式飞行器 |
| 17 | `hostile-nest` | 巢穴 |
| 18 | `hostile-destroyed` | 击毁目标 |

## 清理流程

1. 按 PSD 图层边界裁切主体。
2. 从 alpha 通道重建透明边缘。
3. 将所有可见像素统一为当前阵营纯色。
4. 将原始 alpha 小于 32 的底晕归零，并再次清除归一化后小于 16 的弱边缘。
5. 保留有效 alpha 16 至 255 的平滑抗锯齿主体边缘。
6. 每个图层导出三份透明 PNG 到 `src/assets/units`。

## 2026-10-31 追加素材

新增素材来源：

| 素材 ID | 来源文件 |
|---|---|
| `friendly-fighter-clean` | `D:\不知道干啥的先放着\抠图输出_飞行器红叉\绿色飞行器_透明.png` |
| `hostile-nest` | `D:\不知道干啥的先放着\抠图输出\巢穴_透明.png` |
| `hostile-destroyed` | `D:\不知道干啥的先放着\抠图输出_飞行器红叉\红叉_透明.png` |

追加清理使用 `scripts/process_user_assets.py`：

1. 以 alpha `20` 建立主体掩码。
2. 使用 `3×3` 闭运算补齐窄缝。
3. 以外轮廓完整填充内部缺口，同时保留 X 形等外部凹口。
4. 轻微模糊 alpha 后清除低于 `10` 的浮边。
5. 所有有效像素重新着色为友军、敌军、目标三套纯色。

应用内的黑色主体外轮廓由 SVG 滤镜单独生成，不烘焙进 PNG。

## NATO 图形来源

框架结构参考 NATO APP-6／MIL-STD-2525 公共说明，并以 MIT 许可的
[milsymbol](https://github.com/spatialillusions/milsymbol) 文档和实现作为
公开校验来源。应用内友军使用矩形框，敌军使用菱形框；目标使用用户 PSD
中的目标框。NATO 兵牌是独立素材组，不会改变 PSD 原画的外部结构。

PSD 原画和派生素材由项目使用者提供。应用运行时只打包重新着色、去底的 PNG，
不打包 PSD 文件、背景或其他未使用的图层内容。
