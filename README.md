# TTS

A simple Text-to-Speech app using **Microsoft Edge TTS** (via the [`msedge-tts`](https://www.npmjs.com/package/msedge-tts) npm library). Free, no API key needed.

## Project structure

```
TTS/
├── src/
│   ├── index.js    # example: generate one audio file
│   ├── cli.js      # command-line usage
│   ├── tts.js      # Edge TTS wrapper (synthesize, listVoices)
│   └── config.js   # voice, rate, pitch, output settings
├── output/         # generated audio files (gitignored)
├── package.json
└── README.md
```

## Setup

```bash
npm install
```

## Usage

Run the example:

```bash
npm start
```

Generate speech from the command line:

```bash
npm run tts -- "Hello world"
npm run tts -- "Assalam o alaikum" salam ur-PK-AsadNeural
```

Arguments: `"text"` `[outputName]` `[voice]`

## Configuration

Edit [`src/config.js`](src/config.js) to change the default voice, rate, pitch, and output folder.

Common voices: `en-US-AriaNeural`, `en-US-GuyNeural`, `en-GB-SoniaNeural`, `ur-PK-AsadNeural`, `ur-PK-UzmaNeural`, `hi-IN-SwaraNeural`.
