import { describe, expect, it } from "vitest";
import { recordingFiles, shouldPlay, wantsPlay } from "./recording";

describe("recordingFiles", () => {
  it("serves the video and its poster side by side under /videos", () => {
    expect(recordingFiles("touch-phone")).toEqual({
      video: "/videos/touch-phone.mp4",
      poster: "/videos/touch-phone.webp",
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
