// Simple example: generate one audio file and exit.
import { synthesize } from "./tts.js";

async function main() {
  const text = "Hello! This is a test of the Edge text to speech app.";
  const filePath = await synthesize(text, "hello");
  console.log(`✅ Audio saved to: ${filePath}`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
