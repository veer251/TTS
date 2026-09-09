import { NextRequest, NextResponse } from "next/server";
import { synthesize } from "@/lib/tts";
import type { TTSRequest } from "@/types";

// Edge TTS needs the Node.js runtime (not the Edge runtime).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text, voice }: TTSRequest = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const audio = await synthesize(text, voice);

    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synthesis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
