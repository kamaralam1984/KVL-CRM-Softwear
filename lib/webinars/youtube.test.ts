import { describe, it, expect } from "vitest";
import { extractYoutubeVideoId } from "./youtube";

describe("extractYoutubeVideoId (Phase 45)", () => {
  it("extracts from a standard watch URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a watch URL with extra query params", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PL123")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a youtu.be short URL", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a youtu.be URL with a trailing query param", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from an /embed/ URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from a /live/ URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("accepts a bare 11-character video id", () => {
    expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("works without the www prefix", () => {
    expect(extractYoutubeVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for an empty string", () => {
    expect(extractYoutubeVideoId("")).toBeNull();
  });

  it("returns null for a non-YouTube URL", () => {
    expect(extractYoutubeVideoId("https://vimeo.com/12345678")).toBeNull();
  });

  it("returns null for a malformed/garbage string", () => {
    expect(extractYoutubeVideoId("not a url at all")).toBeNull();
  });

  it("returns null for a YouTube URL with no video id", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/")).toBeNull();
  });
});
