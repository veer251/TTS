"use client";

import { useState } from "react";
import type { Voice } from "@/types";

const VOICES: Voice[] = [
  { id: "en-US-AriaNeural", label: "English (US) – Aria" },
  { id: "en-US-GuyNeural", label: "English (US) – Guy" },
  { id: "en-GB-SoniaNeural", label: "English (UK) – Sonia" },
  { id: "ur-PK-AsadNeural", label: "Urdu (PK) – Asad" },
  { id: "ur-PK-UzmaNeural", label: "Urdu (PK) – Uzma" },
  { id: "hi-IN-SwaraNeural", label: "Hindi (IN) – Swara" },
];

export default function TTSForm() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<string>(VOICES[0].id);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setAudioUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate audio.");
      }

      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="field">
        <label htmlFor="text">Text</label>
        <textarea
          id="text"
          placeholder="Type something to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="voice">Voice</label>
        <select
          id="voice"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleGenerate} disabled={loading || !text.trim()}>
        {loading ? "Generating..." : "Generate speech"}
      </button>

      {error && <p className="error">{error}</p>}

      {audioUrl && (
        <audio controls src={audioUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
