// Central configuration for the TTS app.
// Change the voice, rate, pitch or output folder here.

export const config = {
  // Pick any Edge voice. Some common ones:
  //   en-US-AriaNeural, en-US-GuyNeural, en-GB-SoniaNeural,
  //   ur-PK-AsadNeural, ur-PK-UzmaNeural, hi-IN-SwaraNeural
  voice: "en-US-AriaNeural",

  // Speech rate and pitch (SSML-style values).
  rate: "0%",   // e.g. "+10%", "-20%"
  pitch: "0Hz", // e.g. "+2Hz", "-5Hz"

  // Where generated audio files are saved.
  outputDir: "output",

  // Audio output format.
  format: "audio-24khz-48kbitrate-mono-mp3",
};
