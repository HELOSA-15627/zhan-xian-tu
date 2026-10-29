import { ArrowCounterClockwise } from "@phosphor-icons/react/ArrowCounterClockwise";
import { Pause } from "@phosphor-icons/react/Pause";
import { Play } from "@phosphor-icons/react/Play";

type TimelineProps = {
  duration: number;
  time: number;
  playing: boolean;
  onTimeChange: (time: number) => void;
  onToggle: () => void;
  onReset: () => void;
};

function formatTime(value: number): string {
  const safe = Math.max(0, value);
  const minutes = Math.floor(safe / 60);
  const seconds = (safe % 60).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${seconds}`;
}

export function Timeline({
  duration,
  time,
  playing,
  onTimeChange,
  onToggle,
  onReset,
}: TimelineProps) {
  const disabled = duration <= 0;

  return (
    <footer className="timeline" aria-label="箭头动画时间线">
      <button
        aria-label="回到动画起点"
        className="timeline-icon-button"
        disabled={disabled}
        onClick={onReset}
        type="button"
      >
        <ArrowCounterClockwise aria-hidden="true" size={17} />
      </button>
      <button
        aria-label={playing ? "暂停动画" : "播放动画"}
        className="play-button"
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        {playing ? (
          <Pause aria-hidden="true" size={15} weight="fill" />
        ) : (
          <Play aria-hidden="true" size={15} weight="fill" />
        )}
        {playing ? "暂停" : "播放"}
      </button>
      <div className="timeline-center">
        <input
          aria-label="动画进度"
          disabled={disabled}
          max={Math.max(duration, 0.1)}
          min="0"
          onChange={(event) => onTimeChange(Number(event.target.value))}
          step="0.01"
          type="range"
          value={Math.min(time, Math.max(duration, 0.1))}
        />
        {disabled ? (
          <span className="timeline-empty">给箭头开启绘制动画后可播放</span>
        ) : null}
      </div>
      <span className="timeline-time">
        {formatTime(time)} / {formatTime(duration)}
      </span>
    </footer>
  );
}
