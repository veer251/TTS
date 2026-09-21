# TTS Platform

A Text-to-Speech web app built with **Next.js (App Router) + TypeScript**, using **Microsoft Edge TTS** via the [`msedge-tts`](https://www.npmjs.com/package/msedge-tts) npm library. Free, no API key needed.

## Project structure

```
TTS/
├── app/
│   ├── api/tts/route.ts   # POST endpoint that returns MP3 audio
│   ├── globals.css        # global styles
│   ├── layout.tsx         # root layout
│   └── page.tsx           # home page
├── components/
│   └── TTSForm.tsx        # client UI: text input, voice picker, player
├── lib/
│   └── tts.ts             # server-side Edge TTS helper
├── types/
│   └── index.ts           # shared TypeScript types
├── public/                # static assets
├── .env.local             # local env vars (gitignored)
├── next.config.ts
├── package.json
└── tsconfig.json
```

> `node_modules/` is created automatically by `npm install` — it is not committed.

## Setup

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

Then open http://localhost:3000

## Build & start (production)

```bash
npm run build
npm start
```

## How it works

- The browser sends text + voice to `POST /api/tts`.
- The server ([`lib/tts.ts`](lib/tts.ts)) generates MP3 audio with Edge TTS and streams it back.
- The UI plays the returned audio.

Available voices are listed in [`components/TTSForm.tsx`](components/TTSForm.tsx) — e.g. `en-US-AriaNeural`, `ur-PK-AsadNeural`, `hi-IN-SwaraNeural`.
