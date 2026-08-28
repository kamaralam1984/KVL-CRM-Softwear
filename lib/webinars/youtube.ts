// Phase 45 — Webinar Funnels. Extracts a YouTube video id from whatever URL
// format staff paste in when creating a youtube_live webinar — the room's
// `<iframe src="https://www.youtube.com/embed/{id}">` needs just the id,
// not the full URL. Pure function, no API/key needed (a plain embed iframe
// is not an API integration — see lib/webinars's header note on this).

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare 11-char id pasted directly.
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const vParam = url.searchParams.get("v");
      if (vParam && YOUTUBE_ID_PATTERN.test(vParam)) return vParam;

      const pathMatch = url.pathname.match(/^\/(embed|live|shorts)\/([A-Za-z0-9_-]{11})/);
      if (pathMatch) return pathMatch[2];
    }

    return null;
  } catch {
    return null; // not a valid URL and not a bare id
  }
}
