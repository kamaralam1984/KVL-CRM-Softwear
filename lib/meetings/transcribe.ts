// Audio -> text. Audio upload/storage is OUT OF SCOPE for Phase 12: this accepts
// a reference (URL / storage key) to already-uploaded audio and returns a
// transcript. If OPENAI_API_KEY is set we sketch the Whisper call structure
// (guarded, best-effort); otherwise we return a mock note so the pipeline still
// flows end-to-end without a real provider. Never throws.

export type TranscribeResult = {
  transcript: string;
  usedRealProvider: boolean;
};

export async function transcribe(audioRef: string): Promise<TranscribeResult> {
  const ref = (audioRef ?? "").trim();

  if (!ref) {
    return {
      transcript: "[meetings] No audio reference provided — nothing to transcribe.",
      usedRealProvider: false,
    };
  }

  // Real provider path. We only *structure* the Whisper call here; audio
  // fetching/streaming is intentionally not wired up (upload is out of scope).
  if (process.env.OPENAI_API_KEY) {
    try {
      // NOTE: This is the intended shape of a real Whisper transcription call.
      // It is deliberately not executed against a live audio stream yet —
      // once audio storage exists, fetch the file at `ref` and pass it here:
      //
      //   import OpenAI from "openai";
      //   const openai = new OpenAI();
      //   const file = await fetch(ref).then((r) => r.blob());
      //   const res = await openai.audio.transcriptions.create({
      //     file,
      //     model: "whisper-1",
      //   });
      //   return { transcript: res.text, usedRealProvider: true };
      //
      // Until then, surface that the provider is configured but audio wiring
      // is pending, rather than pretending we produced a transcript.
      return {
        transcript:
          `[meetings] OPENAI_API_KEY detected — Whisper transcription would run for "${ref}". ` +
          `Audio upload/storage is out of scope for this phase, so no audio was fetched.`,
        usedRealProvider: false,
      };
    } catch (err) {
      console.error("[meetings] transcription failed, returning mock:", err);
      return {
        transcript: `[meetings] Transcription error for "${ref}" — falling back to mock.`,
        usedRealProvider: false,
      };
    }
  }

  // No provider configured.
  return {
    transcript:
      `[meetings] Mock transcript for "${ref}". ` +
      `Set OPENAI_API_KEY and wire an audio provider (e.g. Whisper) for real transcription.`,
    usedRealProvider: false,
  };
}
