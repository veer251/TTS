// Command-line usage:
//   npm run tts -- "Text to speak" [outputName] [voice]
//
// Examples:
//   npm run tts -- "Hello world"
//   npm run tts -- "Assalam o alaikum" salam ur-PK-AsadNeural
import { synthesize } from "./tts.js";

async function main() {
  const [, , text, outputName, voice] = process.argv;

  if (!text) {
    console.log('Usage: npm run tts -- "Text to speak" [outputName] [voice]');
    process.exit(1);
  }

  const overrides = voice ? { voice } : {};
  const filePath = await synthesize(text, outputName || "speech", overrides);
  console.log(`✅ Audio saved to: ${filePath}`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
