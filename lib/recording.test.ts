import { describe, expect, it, vi } from "vitest";
import { openFullscreen, recordingFiles, shouldPlay, wantsPlay } from "./recording";

describe("recordingFiles", () => {
  it("serves the video, its poster and its mask side by side under /videos", () => {
    expect(recordingFiles("touch-phone")).toEqual({
      video: "/videos/touch-phone.mp4",
      poster: "/videos/touch-phone.webp",
      mask: "/videos/touch-phone-mask.png",
    });
  });
});

describe("wantsPlay", () => {
  it("moves by default", () => {
    expect(wantsPlay({ choice: null, reducedMotion: false })).toBe(true);
  });

  it("stays still by default for a reader who asked for less motion", () => {
    expect(wantsPlay({ choice: null, reducedMotion: true })).toBe(false);
  });

  it("follows the reader's last press either way", () => {
    expect(wantsPlay({ choice: false, reducedMotion: false })).toBe(false);
    expect(wantsPlay({ choice: true, reducedMotion: true })).toBe(true);
  });
});

describe("shouldPlay", () => {
  it("plays only while the stage is on screen", () => {
    expect(shouldPlay({ choice: null, reducedMotion: false, inView: true })).toBe(true);
    expect(shouldPlay({ choice: null, reducedMotion: false, inView: false })).toBe(false);
    expect(shouldPlay({ choice: true, reducedMotion: true, inView: false })).toBe(false);
  });

  it("never plays once paused", () => {
    expect(shouldPlay({ choice: false, reducedMotion: false, inView: true })).toBe(false);
  });
});

describe("openFullscreen", () => {
  it("takes the standard call where the browser has it", () => {
    const calls: string[] = [];
    openFullscreen({
      requestFullscreen: () => (calls.push("standard"), Promise.resolve()),
      webkitEnterFullscreen: () => void calls.push("webkit"),
    });
    expect(calls).toEqual(["standard"]);
  });

  it("falls back to iPhone Safari's own player", () => {
    const calls: string[] = [];
    openFullscreen({ webkitEnterFullscreen: () => void calls.push("webkit") });
    expect(calls).toEqual(["webkit"]);
  });

  it("handles the standard call's refusal itself", () => {
    const refused = Promise.reject(new Error("no gesture"));
    const handled = vi.spyOn(refused, "catch");
    openFullscreen({ requestFullscreen: () => refused });
    expect(handled).toHaveBeenCalledOnce();
  });

  it("takes Safari's refusal before the video has metadata", () => {
    const enter = vi.fn(() => {
      throw new DOMException("no metadata yet", "InvalidStateError");
    });
    expect(() => openFullscreen({ webkitEnterFullscreen: enter })).not.toThrow();
    expect(enter).toHaveBeenCalledOnce();
  });

  it("does nothing where there is no way to go fullscreen", () => {
    expect(() => openFullscreen({})).not.toThrow();
  });
});
