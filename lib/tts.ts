import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Convert text to speech using Microsoft Edge TTS.
 * Runs server-side only (Node.js runtime).
 *
 * @param text  - The text to speak.
 * @param voice - Edge voice name (defaults to en-US-AriaNeural).
 * @returns MP3 audio as a Buffer.
 */
export async function synthesize(
  text: string,
  voice = "en-US-AriaNeural"
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", reject);
  });
}
