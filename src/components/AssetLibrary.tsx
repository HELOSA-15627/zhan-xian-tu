import { useRef, useState, type ChangeEvent } from "react";

import {
  lineDashArray,
  LINE_STYLE_OPTIONS,
} from "../model/lineStyle";
import {
  AFFILIATION_COLORS,
  AFFILIATION_LABELS,
  NATO_ASSETS,
  NATO_TINTS,
  UNIT_ASSETS,
  UNIT_TINTS,
} from "../model/unitAssets";
import { CUSTOM_ASSETS } from "../model/customAssets";
import {
  BRUSH_PRESETS,
} from "../model/brushes";
import { buildTickMarks } from "../model/linePattern";
import { buildTaperedRibbon } from "../model/strokeGeometry";
import { FLAG_ASSETS, defaultFlagArtwork } from "../model/flags";
import {
  readFileAsDataUrl,
  readImageSize,
  validateImageFile,
} from "../import/backgroundImport";
import { useEditorStore } from "../store/editorStore";
import { TacticalSymbol } from "./TacticalSymbol";

function LineStylePreview({
  style,
  color,
}: {
  style: (typeof LINE_STYLE_OPTIONS)[number]["value"];
  color: string;
}) {
  const dash = lineDashArray(style, 3);

  return (
    <svg
      aria-hidden="true"
      className="line-style-preview"
      style={{ color }}
      viewBox="0 0 72 24"
    >
      {style === "double" ? (
        <>
          <path d="M5 8 H67" />
          <path d="M5 16 H67" />
        </>
      ) : style === "ticked" ? (
        <>
          <path d="M5 12 H67" />
          <path
            d={buildTickMarks(
              [
                { x: 5, y: 12 },
                { x: 67, y: 12 },
              ],
              9,
              12,
            )}
          />
        </>
      ) : (
        <path
          d="M5 12 H67"
          strokeDasharray={dash}
          strokeLinecap={style === "dotted" ? "round" : "square"}
        />
      )}
    </svg>
  );
}

export function AssetLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [assetNotice, setAssetNotice] = useState<string | null>(null);
  const customAssetInputRef = useRef<HTMLInputElement>(null);
  const project = useEditorStore((state) => state.project);
  const activeAffiliation = useEditorStore(
    (state) => state.activeAffiliation,
  );
  const activeArtwork = useEditorStore((state) => state.activeArtwork);
  const activeLineStyle = useEditorStore((state) => state.activeLineStyle);
  const arrowDrawMode = useEditorStore((state) => state.arrowDrawMode);
  const regionDrawMode = useEditorStore((state) => state.regionDrawMode);
  const activeBrush = useEditorStore((state) => state.activeBrush);
  const activeArtworkSource = useEditorStore(
    (state) => state.activeArtworkSource,
  );
  const setActiveSymbol = useEditorStore((state) => state.setActiveSymbol);
  const setActiveAffiliation = useEditorStore(
    (state) => state.setActiveAffiliation,
  );
  const setActiveArtwork = useEditorStore(
    (state) => state.setActiveArtwork,
  );
  const setActiveArtworkSource = useEditorStore(
    (state) => state.setActiveArtworkSource,
  );
  const setActiveLineStyle = useEditorStore(
    (state) => state.setActiveLineStyle,
  );
  const setArrowDrawMode = useEditorStore(
    (state) => state.setArrowDrawMode,
  );
  const setRegionDrawMode = useEditorStore(
    (state) => state.setRegionDrawMode,
  );
  const setActiveBrush = useEditorStore((state) => state.setActiveBrush);
  const setTool = useEditorStore((state) => state.setTool);
  const addCustomArtwork = useEditorStore(
    (state) => state.addCustomArtwork,
  );
  const insertSavedGraphic = useEditorStore(
    (state) => state.insertSavedGraphic,
  );
  const visibleAssets = UNIT_ASSETS.filter(
    (asset) => asset.defaultAffiliation === activeAffiliation,
  );
  const activeColor = AFFILIATION_COLORS[activeAffiliation];
  const visibleNatoTints =
    activeArtworkSource === "nato"
      ? NATO_TINTS
      : activeArtworkSource === "psd"
        ? UNIT_TINTS
        : [];
  const showAffiliationTabs = visibleNatoTints.length > 0;
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const searchResults = normalizedQuery
    ? [
        ...UNIT_ASSETS.filter(
          (asset) =>
            asset.kind !== "arrow" &&
            `${asset.label} ${asset.shortLabel}`
              .toLocaleLowerCase()
              .includes(normalizedQuery),
        ).map((asset) => ({
          source: "psd" as const,
          sourceLabel: "PSD",
          id: asset.id,
          label: asset.label,
          code: asset.shortLabel,
          symbol: asset.symbol,
          affiliation: asset.defaultAffiliation,
        })),
        ...NATO_ASSETS.filter((asset) =>
          `${asset.label} ${asset.shortLabel}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        ).map((asset) => ({
          source: "nato" as const,
          sourceLabel: "NATO",
          id: asset.id,
          label: asset.label,
          code: asset.shortLabel,
          symbol: asset.symbol,
          affiliation:
            activeAffiliation === "hostile"
              ? ("hostile" as const)
              : ("friendly" as const),
        })),
        ...CUSTOM_ASSETS.filter((asset) =>
          `${asset.label} ${asset.shortLabel}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        ).map((asset) => ({
          source: "custom" as const,
          sourceLabel: "原图",
          id: asset.id,
          label: asset.label,
          code: asset.shortLabel,
          symbol: asset.symbol,
          affiliation: "hostile" as const,
        })),
        ...project.customAssets
          .filter((asset) =>
            asset.name.toLocaleLowerCase().includes(normalizedQuery),
          )
          .map((asset) => ({
            source: "custom" as const,
            sourceLabel: "自定义",
            id: asset.id,
            label: asset.name,
            code: "已导入",
            symbol: "friendly" as const,
            affiliation: asset.affiliation,
            customAssetUrl: asset.dataUrl,
          })),
        ...FLAG_ASSETS.filter((flag) =>
          `${flag.chineseName} ${flag.englishName}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        ).map((flag) => ({
          source: "flag" as const,
          sourceLabel: "国旗",
          id: flag.id,
          label: flag.chineseName,
          code: flag.englishName,
          symbol: "friendly" as const,
          affiliation: "friendly" as const,
        })),
      ]
    : [];
  const searchField = (
    <label className="library-search">
      <span>搜索素材</span>
      <input
        aria-label="搜索兵牌或国旗"
        autoComplete="off"
        name="asset-search"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="输入中文或英文名称"
        type="search"
        value={searchQuery}
      />
    </label>
  );

  const handleCustomAssetImport = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      validateImageFile(file);
      const dataUrl = await readFileAsDataUrl(file);
      const size = await readImageSize(dataUrl);
      const affiliation =
        activeAffiliation === "objective"
          ? "friendly"
          : activeAffiliation;
      const id = `custom-asset-${crypto.randomUUID()}` as const;
      const name = file.name.replace(/\.[^.]+$/, "") || "自定义兵牌";
      addCustomArtwork({
        id,
        name,
        dataUrl,
        width: size.width,
        height: size.height,
        affiliation,
      });
      setActiveArtworkSource("custom");
      setActiveAffiliation(affiliation);
      setActiveArtwork(id);
      setActiveSymbol("friendly");
      setTool("marker");
      setAssetNotice(`已导入自定义兵牌：${name}`);
    } catch (error) {
      setAssetNotice(
        error instanceof Error ? error.message : "自定义兵牌导入失败",
      );
    }
  };

  if (normalizedQuery) {
    return (
      <section aria-label="战役图标库">
        {searchField}
        <div className="panel-heading">
          <span>搜索结果</span>
          <span className="count-pill">{searchResults.length} 个</span>
        </div>
        {searchResults.length > 0 ? (
          <div className="symbol-grid">
            {searchResults.map((result) => (
              <button
                aria-label={`搜索结果 ${result.sourceLabel} ${result.label}`}
                className="symbol-card"
                data-artwork-card={result.id}
                data-artwork-source={result.source}
                key={`${result.source}-${result.id}`}
                onClick={() => {
                  setActiveArtworkSource(result.source);
                  setActiveAffiliation(result.affiliation);
                  setActiveArtwork(result.id);
                  setActiveSymbol(result.symbol);
                  setTool("marker");
                }}
                type="button"
              >
                <span className="symbol-card__index">
                  {result.sourceLabel}
                </span>
                <TacticalSymbol
                  affiliation={result.affiliation}
                  artwork={result.id}
                  artworkSource={result.source}
                  color={AFFILIATION_COLORS[result.affiliation]}
                  customAssetUrl={
                    "customAssetUrl" in result
                      ? result.customAssetUrl
                      : undefined
                  }
                  size={56}
                  symbol={result.symbol}
                />
                <span className="symbol-card__name">{result.label}</span>
                <span className="symbol-card__code">{result.code}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-library-result">没有匹配的兵牌或国旗</p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="战役图标库">
      {searchField}
      <div aria-label="素材类型" className="library-source-tabs">
        <button
          aria-label="PSD 原画素材"
          aria-pressed={activeArtworkSource === "psd"}
          onClick={() => {
            setActiveArtworkSource("psd");
            setActiveAffiliation("friendly");
            setActiveArtwork("friendly-tank");
            setActiveSymbol("armor");
          }}
          type="button"
        >
          PSD 原画
        </button>
        <button
          aria-label="NATO 兵牌素材"
          aria-pressed={activeArtworkSource === "nato"}
          onClick={() => {
            const affiliation =
              activeAffiliation === "objective"
                ? "friendly"
                : activeAffiliation;
            setActiveArtworkSource("nato");
            setActiveAffiliation(affiliation);
            setActiveArtwork("nato-infantry");
            setActiveSymbol("friendly");
          }}
          type="button"
        >
          NATO 兵牌
        </button>
        <button
          aria-label="国旗素材"
          aria-pressed={activeArtworkSource === "flag"}
          onClick={() => {
            setActiveArtworkSource("flag");
            setActiveAffiliation("friendly");
            setActiveArtwork(defaultFlagArtwork());
            setActiveSymbol("friendly");
          }}
          type="button"
        >
          国旗
        </button>
        <button
          aria-label="原图素材"
          aria-pressed={activeArtworkSource === "custom"}
          onClick={() => {
            setActiveArtworkSource("custom");
            setActiveAffiliation("hostile");
            setActiveArtwork("custom-nest");
            setActiveSymbol("nest");
          }}
          type="button"
        >
          自定义
        </button>
      </div>
      <div className="panel-heading">
        <span>
          {activeArtworkSource === "psd"
            ? "PSD 原画素材"
            : activeArtworkSource === "nato"
              ? "NATO 兵牌"
              : activeArtworkSource === "custom"
                ? "原图素材"
                : "国旗素材"}
        </span>
        <span className="count-pill">
          {activeArtworkSource === "psd"
            ? visibleAssets.length
            : activeArtworkSource === "nato"
              ? NATO_ASSETS.length
              : activeArtworkSource === "custom"
                ? CUSTOM_ASSETS.length
                : FLAG_ASSETS.length}{" "}
          个
        </span>
      </div>
      <p className="panel-copy">
        {activeArtworkSource === "psd"
          ? "保持 PSD 原始剪影结构，三色透明素材已去除边缘浮色。"
          : activeArtworkSource === "nato"
            ? "独立导入的 APP-6 兵科素材，友军矩形、敌军菱形。"
            : activeArtworkSource === "custom"
              ? "直接使用原始色素材，仅清除主体外浮色，不重绘、不填洞。"
              : "从地图底部裁出的国家国旗，素材库以中文国名标注。"}
      </p>
      {showAffiliationTabs ? (
        <div
          className={`affiliation-tabs ${
            visibleNatoTints.length === 2 ? "affiliation-tabs--two" : ""
          }`}
          aria-label="兵牌阵营"
        >
          {visibleNatoTints.map((affiliation) => (
            <button
              aria-label={`${AFFILIATION_LABELS[affiliation]}素材`}
              aria-pressed={activeAffiliation === affiliation}
              className={`affiliation-tab affiliation-${affiliation}`}
              data-affiliation={affiliation}
              key={affiliation}
              onClick={() => {
                setActiveAffiliation(affiliation);
                if (activeArtworkSource === "psd") {
                  const first = UNIT_ASSETS.find(
                    (asset) => asset.kind === "unit" &&
                      asset.defaultAffiliation === affiliation,
                  );
                  if (first) {
                    setActiveArtwork(first.id);
                    setActiveSymbol(first.symbol);
                  }
                }
              }}
              type="button"
            >
              <i />
              {AFFILIATION_LABELS[affiliation]}
            </button>
          ))}
        </div>
      ) : null}
      {activeArtworkSource === "custom" ? (
        <div className="custom-asset-toolbar">
          <button
            className="button button-quiet"
            onClick={() => customAssetInputRef.current?.click()}
            type="button"
          >
            导入自定义兵牌
          </button>
          <input
            accept="image/png,image/jpeg,image/webp"
            aria-label="选择自定义兵牌图片"
            className="visually-hidden"
            onChange={handleCustomAssetImport}
            ref={customAssetInputRef}
            type="file"
          />
          <span aria-live="polite" role="status">
            {assetNotice ??
              `已存档 ${project.customAssets.length} 个兵牌、${project.savedGraphics.length} 个图形`}
          </span>
        </div>
      ) : null}
      <div className="symbol-grid">
        {activeArtworkSource === "flag"
          ? FLAG_ASSETS.map((flag, index) => (
              <button
                aria-label={`国旗 ${flag.chineseName}`}
                aria-pressed={activeArtwork === flag.id}
                className="symbol-card flag-card"
                data-artwork-card={flag.id}
                data-artwork-source="flag"
                key={flag.id}
                onClick={() => {
                  setActiveSymbol("friendly");
                  setActiveArtwork(flag.id);
                  setTool("marker");
                }}
                type="button"
              >
                <span className="symbol-card__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TacticalSymbol
                  affiliation="friendly"
                  artwork={flag.id}
                  artworkSource="flag"
                  color={activeColor}
                  size={56}
                  symbol="friendly"
                />
                <span className="symbol-card__name">{flag.chineseName}</span>
                <span className="symbol-card__code">{flag.englishName}</span>
              </button>
            ))
          : activeArtworkSource === "custom"
            ? [
                ...CUSTOM_ASSETS.map((asset) => ({
                  ...asset,
                  dataUrl: undefined,
                })),
                ...project.customAssets.map((asset) => ({
                  id: asset.id,
                  symbol: "friendly" as const,
                  label: asset.name,
                  shortLabel: "自定义",
                  dataUrl: asset.dataUrl,
                })),
              ].map(({ id, symbol, label, shortLabel, dataUrl }, index) => (
                <button
                  aria-label={`${
                    dataUrl ? "自定义兵牌" : "原图兵牌"
                  } ${label}`}
                  aria-pressed={activeArtwork === id}
                  className="symbol-card"
                  data-artwork-card={id}
                  data-artwork-source="custom"
                  key={id}
                  onClick={() => {
                    setActiveSymbol(symbol);
                    setActiveAffiliation(
                      id === "custom-nest" ? "hostile" : "friendly",
                    );
                    setActiveArtwork(id);
                    setTool("marker");
                  }}
                  type="button"
                >
                  <span className="symbol-card__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <TacticalSymbol
                    affiliation={
                      id === "custom-nest" ? "hostile" : "friendly"
                    }
                    artwork={id}
                    artworkSource="custom"
                    color={
                      id === "custom-nest"
                        ? AFFILIATION_COLORS.hostile
                        : AFFILIATION_COLORS.friendly
                    }
                    customAssetUrl={dataUrl}
                    size={56}
                    symbol={symbol}
                  />
                  <span className="symbol-card__name">{label}</span>
                  <span className="symbol-card__code">{shortLabel}</span>
                </button>
              ))
          : activeArtworkSource === "psd"
          ? visibleAssets.map(({ id, symbol, label, shortLabel }, index) => (
              <button
                aria-label={`PSD 兵牌 ${label}`}
                aria-pressed={activeArtwork === id}
                className="symbol-card"
                data-artwork-card={id}
                data-artwork-source="psd"
                key={id}
                onClick={() => {
                  setActiveSymbol(symbol);
                  setActiveArtwork(id);
                  setTool(id === "arrow-head" ? "arrow" : "marker");
                }}
                type="button"
              >
                <span className="symbol-card__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TacticalSymbol
                  affiliation={activeAffiliation}
                  artwork={id}
                  artworkSource="psd"
                  color={activeColor}
                  size={56}
                  symbol={symbol}
                />
                <span className="symbol-card__name">{label}</span>
                <span className="symbol-card__code">{shortLabel}</span>
              </button>
            ))
          : NATO_ASSETS.map(({ id, symbol, label, shortLabel }, index) => (
              <button
                aria-label={`NATO 兵牌 ${label}`}
                aria-pressed={activeArtwork === id}
                className="symbol-card"
                data-artwork-card={id}
                data-artwork-source="nato"
                key={id}
                onClick={() => {
                  setActiveSymbol(symbol);
                  setActiveArtwork(id);
                  setTool("marker");
                }}
                type="button"
              >
                <span className="symbol-card__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TacticalSymbol
                  affiliation={activeAffiliation}
                  artwork={id}
                  artworkSource="nato"
                  color={activeColor}
                  size={56}
                  symbol={symbol}
                />
                <span className="symbol-card__name">{label}</span>
                <span className="symbol-card__code">{shortLabel}</span>
              </button>
            ))}
      </div>

      {activeArtworkSource === "custom" ? (
        <div className="saved-graphic-section">
          <div className="panel-heading panel-heading--compact">
            <span>图形素材存档</span>
            <span className="count-pill">
              {project.savedGraphics.length} 个
            </span>
          </div>
          {project.savedGraphics.length > 0 ? (
            <div className="saved-graphic-list">
              {project.savedGraphics.map((graphic) => (
                <button
                  aria-label={`调用图形素材 ${graphic.name}`}
                  className="saved-graphic-card"
                  key={graphic.id}
                  onClick={() => insertSavedGraphic(graphic.id)}
                  type="button"
                >
                  <span>{graphic.name}</span>
                  <small>{graphic.objects.length} 个对象</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="panel-copy">
              在图层面板保存图层或图层组后，可在这里按名称调用。
            </p>
          )}
        </div>
      ) : null}

      <div className="library-divider" />
      <div className="panel-heading panel-heading--compact">
        <span>笔刷与线型</span>
        <span className="count-pill">{LINE_STYLE_OPTIONS.length} 种</span>
      </div>
      <div className="line-style-list">
        {LINE_STYLE_OPTIONS.map((option) => (
          <button
            aria-label={`使用${option.label}线型`}
            aria-pressed={activeLineStyle === option.value}
            className="line-style-card"
            data-line-style={option.value}
            key={option.value}
            onClick={() => setActiveLineStyle(option.value)}
            title={option.description}
            type="button"
          >
            <LineStylePreview color={activeColor} style={option.value} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <div className="library-divider" />
      <div className="panel-heading panel-heading--compact">
        <span>绘制模式</span>
        <span className="count-pill">2 组</span>
      </div>
      <div className="draw-mode-grid">
        <div className="draw-mode-group">
          <span>箭头</span>
          <div className="draw-mode-options">
            {[
              { value: "direct" as const, label: "直接" },
              { value: "polyline" as const, label: "折线" },
            ].map((mode) => (
              <button
                aria-label={`箭头${mode.label}绘制模式`}
                aria-pressed={arrowDrawMode === mode.value}
                className="draw-mode-button"
                key={mode.value}
                onClick={() => setArrowDrawMode(mode.value)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="draw-mode-group">
          <span>区域</span>
          <div className="draw-mode-options">
            {[
              { value: "direct" as const, label: "直接" },
              { value: "polyline" as const, label: "折线" },
            ].map((mode) => (
              <button
                aria-label={`区域${mode.label}绘制模式`}
                aria-pressed={regionDrawMode === mode.value}
                className="draw-mode-button"
                key={mode.value}
                onClick={() => setRegionDrawMode(mode.value)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="panel-copy">
        直接模式按住拖动、松开完成；折线模式单击加点、双击完成。
      </p>

      <div className="panel-heading panel-heading--compact">
        <span>笔刷预设</span>
        <span className="count-pill">{BRUSH_PRESETS.length} 种</span>
      </div>
      <div className="brush-preset-grid">
        {BRUSH_PRESETS.map((preset) => (
          <button
            aria-label={`使用${preset.label}`}
            aria-pressed={activeBrush === preset.id}
            className="brush-preset-card"
            key={preset.id}
            onClick={() => setActiveBrush(preset.id)}
            title={preset.description}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 72 18">
              {preset.startWidth !== preset.endWidth ? (
                <path
                  d={buildTaperedRibbon(
                    [
                      { x: 4, y: 9 },
                      { x: 68, y: 9 },
                    ],
                    preset.startWidth * 0.7,
                    preset.endWidth * 0.7,
                  )}
                  fill={activeColor}
                  stroke="none"
                />
              ) : (
                <path
                  d="M4 9 H68"
                  fill="none"
                  stroke={activeColor}
                  strokeLinecap="butt"
                  strokeWidth={Math.max(1, preset.arrowWidth * 0.55)}
                />
              )}
            </svg>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
