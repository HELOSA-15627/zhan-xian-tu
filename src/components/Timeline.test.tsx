import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Timeline } from "./Timeline";

describe("timeline", () => {
  it("switches between play and pause labels", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <Timeline
        duration={4}
        time={1}
        playing={false}
        onTimeChange={() => undefined}
        onToggle={onToggle}
        onReset={() => undefined}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "播放动画" }));
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <Timeline
        duration={4}
        time={1}
        playing
        onTimeChange={() => undefined}
        onToggle={onToggle}
        onReset={() => undefined}
      />,
    );
    expect(
      screen.getByRole("button", { name: "暂停动画" }),
    ).toBeInTheDocument();
  });

  it("emits a numeric time when the scrubber moves", () => {
    const onTimeChange = vi.fn();
    render(
      <Timeline
        duration={4}
        time={1}
        playing={false}
        onTimeChange={onTimeChange}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("动画进度"), {
      target: { value: "2.5" },
    });
    expect(onTimeChange).toHaveBeenCalledWith(2.5);
  });

  it("disables playback when no arrow is animated", () => {
    render(
      <Timeline
        duration={0}
        time={0}
        playing={false}
        onTimeChange={() => undefined}
        onToggle={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "播放动画" })).toBeDisabled();
    expect(
      screen.getByText("给箭头开启绘制动画后可播放"),
    ).toBeInTheDocument();
  });
});
