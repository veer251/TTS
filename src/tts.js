// Thin wrapper around the msedge-tts library.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { config } from "./config.js";

/**
 * Convert text to a speech file.
 *
 * @param {string} text       - The text to speak.
 * @param {string} outputName - File name (without extension) to save as.
 * @param {object} [overrides]- Optional { voice, rate, pitch } overrides.
 * @returns {Promise<string>} Path to the generated audio file.
 */
export async function synthesize(text, outputName = "speech", overrides = {}) {
  if (!text || !text.trim()) {
    throw new Error("No text provided to synthesize.");
  }

  const voice = overrides.voice ?? config.voice;
  const rate = overrides.rate ?? config.rate;
  const pitch = overrides.pitch ?? config.pitch;

  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    voice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    { rate, pitch }
  );

  const { audioFilePath } = await tts.toFile(
    `${config.outputDir}/${outputName}`,
    text
  );

  return audioFilePath;
}

/**
 * List all available Edge voices.
 * @returns {Promise<Array>} Array of voice metadata objects.
 */
export async function listVoices() {
  const tts = new MsEdgeTTS();
  return tts.getVoices();
}
