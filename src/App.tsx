import {
  ArrowUpRight,
  Crosshair,
  Cursor,
  DownloadSimple,
  Hand,
  MapTrifold,
  MapPin,
  Polygon,
  TextT,
} from "@phosphor-icons/react";

const tools = [
  { label: "选择", icon: Cursor },
  { label: "平移", icon: Hand },
  { label: "图标", icon: MapPin },
  { label: "箭头", icon: ArrowUpRight },
  { label: "区域", icon: Polygon },
  { label: "文字", icon: TextT },
];

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <MapTrifold aria-hidden="true" size={20} weight="duotone" />
          <div>
            <strong>战线图志</strong>
            <span>未命名战役</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="save-state">本地草稿</span>
          <button className="button button-primary" type="button">
            <DownloadSimple aria-hidden="true" size={16} />
            导出 PNG
          </button>
        </div>
      </header>

      <aside aria-label="绘图工具" className="tool-rail">
        {tools.map(({ label, icon: Icon }, index) => (
          <button
            aria-label={label}
            aria-pressed={index === 0}
            className="tool-button"
            key={label}
            type="button"
          >
            <Icon aria-hidden="true" size={20} />
          </button>
        ))}
      </aside>

      <aside aria-label="资源与图层" className="left-panel">
        <div className="panel-heading">
          <span>作战资源</span>
          <span className="count-pill">8 个图标</span>
        </div>
        <p className="panel-copy">选择图标，然后在地图上落位。</p>
        <div className="symbol-grid" aria-label="战役图标库">
          {["友军", "敌军", "指挥部", "防线"].map((label) => (
            <button className="symbol-card" key={label} type="button">
              <span aria-hidden="true" className="symbol-preview" />
              {label}
            </button>
          ))}
        </div>
      </aside>

      <main aria-label="战术地图编辑器" className="workspace">
        <section aria-label="地图画布" className="map-stage">
          <div className="map-paper">
            <div className="map-crosshair" aria-hidden="true">
              <Crosshair size={44} weight="thin" />
            </div>
            <div className="empty-callout">
              <strong>建立第一条战线</strong>
              <span>导入底图，或从左侧选择图标直接开始绘制。</span>
              <button className="button button-secondary" type="button">
                导入底图
              </button>
            </div>
          </div>
        </section>
      </main>

      <aside aria-label="属性检查器" className="inspector">
        <div className="panel-heading">
          <span>画布属性</span>
          <span className="coordinate">1600 × 900</span>
        </div>
        <label className="field">
          <span>地图名称</span>
          <input defaultValue="未命名战役" />
        </label>
        <label className="field">
          <span>底图不透明度</span>
          <input defaultValue="100" type="range" />
        </label>
      </aside>

      <footer className="timeline" aria-label="箭头动画时间线">
        <button className="play-button" type="button">
          播放
        </button>
        <div className="timeline-track" aria-hidden="true">
          <span />
        </div>
        <span className="timeline-time">00:00 / 00:04</span>
      </footer>
    </div>
  );
}

export default App;
