# Long-Form Video Pipeline Guide (Claude → Remotion + FFmpeg → Claude-free autopilot)

> **Status note:** Ye guide user ke message se bana hai. Genspark chat link is environment se
> open nahi hua (network egress block), isliye chat ki existing pipeline ka analysis isme
> **shamil nahi** hai. Chat paste hone par section 10 ke mutabiq diff kiya jayega.
> Jo details official docs se verify nahi ho saki unko **[VERIFY]** mark kiya hai (section 11).

---

## 0. Ek line ka plan

> **Claude ek baar "developer" ban kar factory banata hai. Factory phir bina Claude ke chalti hai.**
> Runtime par LLM sirf **data (JSON)** deta hai, **code kabhi nahi**.

Do phases:

| Phase | Kaun kaam karta hai | Kya banta hai | Kitni baar |
|---|---|---|---|
| **A. Build** | Claude Code (ya agy) + tum | Remotion templates, FFmpeg helpers, orchestrator, tests | Ek baar (phir sirf upgrades) |
| **B. Run** | Plain scripts + Gemini API + TTS API | Har video: topic → final.mp4 | Har video, cron par |

Agar tum Phase B mein Claude ko "video edit karo" bol rahe ho to pipeline abhi Claude-free nahi hai.
Claude-free ka matlab: `npm run job -- --topic "..."` chalao aur koi AI chat session khula na ho.

---

## 1. Genspark chat se guide kyun nahi mil raha (aur fix)

Aam wajah: ek hi prompt mein "tutorial + plan + pipeline + automation" sab maang lena. Chat generic
overview deta hai. Fix: **deliverable format pehle se fix karo, ek stage ek time par.**

Paste-ready master prompt (kisi bhi chat/agent ke liye):

```text
Role: Senior video-automation engineer.
Goal: Ek fully automated long-form (8-20 min) YouTube video factory banana
Stack: Remotion (TypeScript), FFmpeg, Gemini API (script), TTS API (voice). Runtime par koi
Claude/agent session nahi hoga.
Meri language: Roman Urdu. Video language: <URDU/HINDI/ENGLISH>. Niche: <...>.
OS: <Windows/Mac/Linux VPS>. Skill level: <beginner/intermediate>.

Sirf ISI stage ka answer do: <Stage N: e.g. "FFmpeg fundamentals">.
Format (zaroor follow karo):
1. Is stage ka goal + "done when" check (1 command jo pass/fail de)
2. Exact install/run commands (copy-paste)
3. Minimal working code (file paths ke saath)
4. 3 exercises jinka expected output diya ho
5. Common errors + fix
6. Agle stage ko kya input dena hai (file contract)
Generic advice / lambi intro mat likho. Agar koi cheez verify nahi kar sakte to [VERIFY] likho.
```

Phir har stage (section 5) ke liye yehi prompt dobara chalao, sirf `Stage N` badlo.

---

## 2. Architecture

```text
video-factory/
├─ CLAUDE.md                  # Build-phase rules (section 8)
├─ .env                       # GEMINI_API_KEY, TTS_API_KEY  (gitignored)
├─ config/channel.json        # brand colors, fonts, fps, resolution, voice, models
├─ src/                       # Remotion (TypeScript)
│  ├─ Root.tsx                # <Composition> + calculateMetadata
│  ├─ Video.tsx               # scenes ko <Sequence> mein jodta hai
│  ├─ schema.ts               # Zod schema (pipeline aur Remotion dono share karte hain)
│  └─ scenes/                 # Title, Bullets, Stat, Quote, BRoll, Chart, Outro
├─ pipeline/
│  ├─ run.ts                  # orchestrator (stages sequence + resume)
│  ├─ stages/                 # 01_script 02_scenes 03_tts 04_assets 05_render 06_post 07_qa
│  ├─ providers/tts/          # gemini.ts, elevenlabs.ts, piper.ts  (same interface)
│  └─ lib/                    # ffmpeg.ts, hash.ts, manifest.ts, retry.ts
├─ jobs/<slug>/
│  ├─ manifest.json           # har stage ka status + input hash
│  ├─ script.json  scenes.json  props.json
│  ├─ audio/scene-001.wav ...
│  └─ out/segment-01.mp4 ... final.mp4
└─ tests/
```

**Language choice:** poori pipeline **TypeScript** mein rakho. Wajah: Remotion TS hai, Zod schema
ek jagah define hota hai, Gemini ka JS SDK bhi hai. Python sirf tab jab local Whisper/Piper chahiye
(subprocess se call karo).

### Data contracts (ye sabse important cheez hai)

Har stage sirf ek file padhta hai aur ek file likhta hai. Isse har stage alag test/replace ho sakta hai.

```jsonc
// jobs/<slug>/scenes.json
{
  "title": "Why Sleep Debt Is Real",
  "language": "ur",
  "scenes": [
    {
      "id": "s001",
      "type": "title",                 // title | bullets | stat | quote | broll | chart | outro
      "narration": "Aap ne kabhi ...",  // TTS ko yehi jata hai
      "onScreenText": ["Sleep Debt"],
      "visual": { "query": "tired person office night", "kind": "stock" },
      "chapter": 1
    }
  ]
}
```

```jsonc
// jobs/<slug>/props.json  (Remotion inputProps — TTS ke baad bana)
{
  "fps": 30,
  "scenes": [
    { "id": "s001", "type": "title", "audio": "audio/s001.wav",
      "audioSeconds": 6.84, "onScreenText": ["Sleep Debt"] }
  ]
}
```

---

## 3. Pipeline stages (Phase B, runtime)

| # | Stage | Input → Output | Tool | Fail hone par |
|---|---|---|---|---|
| 1 | Script | brief → `script.json` | Gemini API, **structured JSON output** | Zod validate; invalid ho to error feed karke ≤2 retry |
| 2 | Scenes | script → `scenes.json` | Gemini API ya rule-based splitter | Same |
| 3 | TTS | narration → `audio/*.wav` | TTS provider (interface ke peeche) | Backoff retry; cache by hash(text+voice+style) |
| 4 | Timing | wav → `props.json` | `ffprobe` duration | — |
| 5 | Assets | visual.query → images/clips | Pexels/Pixabay API, Imagen/Gemini image, local library | Fallback: solid-color/gradient scene |
| 6 | Render | props → `segment-XX.mp4` | Remotion `renderMedia()` | Segment-level retry |
| 7 | Post | segments → `final.mp4` | FFmpeg concat + loudnorm | — |
| 8 | QA | final.mp4 → pass/fail report | ffprobe + blackdetect + silencedetect | Fail = publish mat karo, alert bhejo |
| 9 | Publish (optional) | final.mp4 → YouTube | YouTube Data API v3 | Manual review queue |

### 3.1 Long videos ka asli trick

10–20 min ki video ek render mein mat banao. **Chapter/segment (1–3 min) mein render karo, phir concat.**

- Ek segment fail ho to sirf wahi dobara render hota hai.
- Parallel render (multiple CPU cores/machines).
- **Content-addressed cache:** `hash(scene props + template version)` same hai to purana segment reuse karo.
  Script mein ek line badli to sirf ek segment dobara render hoga.

```bash
# segments ko jodna (sab ke codec/fps/resolution identical hone chahiye)
printf "file 'segment-01.mp4'\nfile 'segment-02.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy joined.mp4
```

### 3.2 Remotion — minimal patterns

```tsx
// src/Root.tsx — duration audio se aati hai, hard-code nahi
import {Composition} from 'remotion';
export const RemotionRoot = () => (
  <Composition
    id="Video"
    component={Video}
    fps={30} width={1920} height={1080}
    durationInFrames={300}                       // placeholder
    defaultProps={{fps: 30, scenes: []}}
    calculateMetadata={async ({props}) => ({
      durationInFrames: props.scenes.reduce(
        (sum, s) => sum + Math.ceil(s.audioSeconds * props.fps), 0),
    })}
  />
);
```

```ts
// pipeline/stages/05_render.ts — Node se programmatic render
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Video', inputProps});
await renderMedia({composition, serveUrl, codec: 'h264', inputProps, outputLocation});
```

Gotchas jo time khaate hain:

- **Assets:** audio/images `staticFile()` se `public/` se serve hote hain. Per-job files ko `public/jobs/<slug>/`
  mein copy karo (ya `bundle()` ka `publicDir` option) — warna "file not found" aata hai. **[VERIFY]**
- Video b-roll ke liye `<OffthreadVideo>` use karo, `<Video>` nahi (render mein zyada stable).
- Heavy CSS (bade blur/box-shadow/filter) render slow karte hain.
- Saare `@remotion/*` packages **same exact version** par pin karo.
- **Benchmark pehle:** apne har scene type ka 10-sec clip render karke time napo, phir 10-min video ka
  time extrapolate karo. Isse VPS size decide hota hai.

### 3.3 FFmpeg cheat sheet

```bash
# audio duration (seconds)
ffprobe -v error -show_entries format=duration -of csv=p=0 in.wav

# raw PCM (24kHz, 16-bit, mono) ko wav banana
ffmpeg -f s16le -ar 24000 -ac 1 -i in.pcm out.wav

# loudness normalize (YouTube ~ -14 LUFS ke aas-paas), video copy
ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy -c:a aac -b:a 192k out.mp4

# QA: black frames aur lambi silence pakadna
ffmpeg -i final.mp4 -vf blackdetect=d=0.5:pix_th=0.10 -an -f null -
ffmpeg -i final.mp4 -af silencedetect=noise=-50dB:d=2 -vn -f null -

# thumbnail frame
ffmpeg -ss 00:00:05 -i final.mp4 -frames:v 1 thumb.jpg

# music ko voice ke neeche (sidechain ducking)
ffmpeg -i voice.wav -i music.mp3 -filter_complex \
  "[1:a][0:a]sidechaincompress=threshold=0.05:ratio=8[m];[0:a][m]amix=inputs=2" mix.wav
```

### 3.4 TTS module (provider-agnostic)

```ts
export interface TtsProvider {
  synthesize(opts: {text: string; voice: string; style?: string}): Promise<Buffer>; // wav
}
```

Rules:

- Text ko **sentence boundary** par chunk karo (bahut lambi text par voice drift/timeout).
- Cache key = `sha256(provider + model + voice + style + text)`. Same line dobara generate nahi hogi.
- 429/5xx par exponential backoff; concurrency limit rakho.
- Har scene ka alag wav → duration seedhi `ffprobe` se → forced alignment ki zaroorat nahi.
- **Word-level captions** chahiye to Whisper (local `faster-whisper`, ya Remotion ka whisper.cpp package **[VERIFY]**)
  audio par chalao. Sasta shortcut: scene text ko duration ke hisaab se proportional split karo.
- Providers: Gemini TTS, Google Cloud TTS, ElevenLabs, OpenAI TTS, local (Piper/Kokoro). **Urdu/Hindi quality
  har provider par khud sunke test karo** — ye decide karne wali cheez hai.

Gemini side (Python `google-genai` sample; API shape badalta rehta hai **[VERIFY]**):

```python
resp = client.models.generate_content(
    model=TTS_MODEL,                       # config se, hard-code mat karo
    contents=text,
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")))))
pcm = resp.candidates[0].content.parts[0].inline_data.data
```

### 3.5 Script generation (Gemini API, structured output)

```python
class Scene(BaseModel): id: str; type: str; narration: str; onScreenText: list[str]; chapter: int
class Script(BaseModel): title: str; scenes: list[Scene]

resp = client.models.generate_content(
    model=GEMINI_MODEL,                    # config se
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json", response_schema=Script))
```

**Model IDs kabhi code mein hard-code mat karo** — `config/channel.json` mein rakho, kyunki naam
tezi se badalte hain.

---

## 4. Claude-free autopilot kaise setup karein

### Level 1 — Deterministic scripts (zaroori)

```bash
npm run job -- --topic "Sleep debt" --lang ur     # topic → final.mp4
```

- Har stage **idempotent** hai: `manifest.json` mein `inputHash` same ho to stage skip.
- `kill -9` ke baad dobara chalao → wahin se resume.

### Level 2 — LLM sirf API se

- Sab LLM calls Gemini API se, **schema-validated JSON** ke saath. Prompt files repo mein (`pipeline/prompts/*.md`).
- Invalid JSON: error message model ko wapas do, ≤2 retry, phir job `failed` mark karo.

### Level 3 — Antigravity CLI (`agy`) — optional, sirf maintenance ke liye

Search results ke mutabiq Antigravity CLI (`agy`) ne Gemini CLI ko replace kiya (Gemini CLI free/Pro/Ultra
users ke liye **18 June 2026** ko band). Headless: `agy -p "prompt"`; headless mein shell commands by default
**soft-deny** hote hain jab tak permission grant na karo. Isliye:

- **Core pipeline `agy` par depend mat karo.** Wo agentic tool hai, deterministic factory nahi.
- Use karo: nightly "logs padho, failing template ka fix PR banao" jaise maintenance kaam ke liye. **[VERIFY]** flags: `agy --help`.

### Scheduling aur ops

- Trigger: `cron` / systemd timer / GitHub Actions — `jobs/queue/*.json` mein topics daalo, runner ek-ek uthaye.
- **Docker image** (Node + FFmpeg + Chrome ke Linux libs + fonts) — "meri machine par chalta hai" band karne ke liye.
- Logs har stage ke, aur fail par alert (Telegram/email webhook).
- Cost log: har video ka API usage + render time `jobs/<slug>/cost.json` mein.
- Dependencies **exact versions** par pin karo + lockfile commit.

### "Claude-free" acceptance test

- [ ] Fresh machine par: clone → `.env` bharo → `docker compose run job --topic "..."` → `final.mp4`
- [ ] Koi Claude/agent session khula nahi
- [ ] `kill -9` ke baad resume hota hai
- [ ] Same topic dobara chalao → cache hits, naya kaam sirf jo badla
- [ ] QA stage ek jaan-boojh kar kharab video (khali audio) ko reject karta hai
- [ ] Cron se 3 din lagatar bina intervention chala

---

## 5. Learning + build plan (tutorials in order)

Har phase ka ek "done when" hai. Wo pass nahi hua to agle phase par mat jao.

| Phase | Seekhna/banana | Done when |
|---|---|---|
| **0 Setup** | Node 20+, FFmpeg, Git, API keys, VS Code | `node -v && ffmpeg -version && ffprobe -version` chalte hain |
| **1 FFmpeg basics** | ffprobe, concat, mux audio, loudnorm, subtitles burn, blackdetect (3.3) | Ek 30-sec clip ko normalize+subtitle karke output dekh liya |
| **2 Remotion basics** | `<Composition>`, `<Sequence>`, `useCurrentFrame`, `interpolate`, `spring`, `<Audio>`, `staticFile`, `calculateMetadata`, `inputProps` | `props.json` se 5 scene types wala 60-sec video render hua + render time napa |
| **3 TTS module** | Provider interface, chunking, cache, ffprobe timing | 10 lines ka narration → wav → props.json, duration sahi |
| **4 Script stage** | Gemini structured output, Zod validation, prompt design | Topic → valid `scenes.json`, 10 topics par 10/10 valid |
| **5 Orchestrator** | manifest, hash cache, resume, retry | `kill -9` ke baad resume + cache-hit dikha |
| **6 Long-form** | Segment render + concat + assets stage + captions | 10-min video bani, ek scene edit par sirf ek segment re-render |
| **7 QA + Publish** | blackdetect/silencedetect/loudness gates, contact-sheet, YouTube upload | Bad video reject hoti hai, good video queue mein jati hai |
| **8 Autopilot** | Docker, cron, alerts, cost log (section 4) | Acceptance test (section 4) sab tick |

### Editing rules jo "quality" decide karte hain (scene templates mein bake karo)

- Pehle 30 sec mein hook + promise; intro mein channel branding nahi.
- Har 3-6 sec par visual change; har 20-40 sec par pattern interrupt (zoom, stat card, quote, question).
- Ek design system: 2 fonts, 4-5 colors, safe margins, 6-8 scene types, 3 motion presets. Zyada variety = kharab consistency.
- Captions hamesha on; keywords highlight.
- Music voice se ~15-20 dB neeche + ducking; loudness -14 LUFS ke aas-paas.

---

## 6. Build phase mein Claude Code ka sahi use

Claude ko **contracts + tests** do, "video bana do" mat bolo.

```text
1. "schema.ts (Zod) aur jobs/example/scenes.json ke basis par 5 Remotion scene components likho.
   Har component ke liye ek snapshot test (still frame render)."
2. "pipeline/providers/tts/gemini.ts likho TtsProvider interface ke saath. Pehle cache aur retry
   ke tests likho, phir implementation."
3. "pipeline/run.ts orchestrator likho: manifest.json, inputHash skip, resume. Fail hone par
   exit code non-zero."
4. "ffmpeg QA stage likho: blackdetect + silencedetect + loudness. Ek jaan-boojh kar kharab fixture
   par fail hona chahiye."
5. "Dockerfile likho jo Remotion render + ffmpeg chalaye; `docker compose run` se end-to-end test."
```

---

## 7. Risk: fully automated faceless channels

YouTube ka **"inauthentic content"** (pehle "repetitious content") policy mass-produced, repetitive
content ko monetization se roak sakta hai **[VERIFY current policy]**. Automation ka matlab template-spam
nahi hona chahiye: har video mein original angle/research/value ho, aur realistic synthetic media par
disclosure ka setting sahi rakho. Pipeline mein ek **human review gate** (publish se pehle 2 min ka check)
rakhna sasta insurance hai.

---

## 8. `CLAUDE.md` starter (video-factory repo ke root mein)

```md
# video-factory conventions
- TypeScript strict. Schemas in src/schema.ts (Zod) are the single source of truth.
- Stages are pure: read one file, write one file, idempotent, keyed by inputHash.
- Never hard-code model IDs, voices or API keys; read from config/channel.json and .env.
- LLM output at runtime = validated JSON only. Never generate/execute code at runtime.
- Every new stage needs a test and a fixture under tests/fixtures.
- Pin exact dependency versions; all @remotion/* packages must share one version.
- Run `npm test` and `npm run lint` before finishing.
```

---

## 9. Tools ka role summary

| Tool | Build phase | Run phase |
|---|---|---|
| Claude Code | Templates/pipeline likhta hai | **Nahi** |
| Remotion | — | Scenes ko frames/mp4 banata hai |
| FFmpeg | — | Timing, concat, loudness, QA, thumbnails |
| Gemini API | — | Script/scene JSON |
| TTS API | — | Narration wav |
| `agy` CLI | Developer helper (optional) | Sirf maintenance (optional) |
| cron/Docker | — | Autopilot |

---

## 10. Genspark chat ka analysis (jab paste karoge)

Chat text paste karo (ya export). Phir main ye check karunga:

1. Kya usme **data contracts** (JSON schemas) hain, ya sirf "Claude se bolo video banao" wala flow?
2. Kya koi stage Claude ke runtime session par depend karta hai (edits, template code generation)?
3. Kya render **segment-wise + cache** hai, ya ek baar mein poori video?
4. TTS aur Gemini calls mein retry/cache/validation hai?
5. Resume/idempotency aur QA gates hain?
6. Section 5 ke kaunse phases already done hain, kaunse baaki?

## Jo mujhe tumse chahiye

- Video **language** (Urdu/Hindi/English) aur **niche**
- Target **length** (8/12/20 min) aur **daily volume**
- Tumhari machine: Windows/Mac/Linux, ya VPS (RAM/CPU)
- Ab tak kya kaam kar raha hai (kaunse tools install, kaunse scripts bane)
- Voice ka example jo pasand ho (Urdu TTS quality decide karegi provider)

---

## 11. Jo verify nahi ho saka **[VERIFY]**

Is session mein `remotion.dev`, `ai.google.dev`, `antigravity.google`, `genspark.ai` blocked the, sirf search
summaries mile. In par bharosa karne se pehle docs se confirm karo:

| Item | Kahan check karein |
|---|---|
| Remotion license (mera yaad: individuals/chhoti teams free, badi companies ko paid license) | remotion.dev/docs/license |
| `bundle({publicDir})` aur per-job assets ka behavior | remotion.dev/docs/bundle |
| Remotion whisper.cpp / captions packages | remotion.dev/docs/captions |
| Gemini TTS current model IDs (search: `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`), request shape, PCM sample rate, Urdu support | ai.google.dev/gemini-api/docs/speech-generation |
| `agy` headless flags, auth on servers, output format | antigravity.google/docs/cli/headless |
| YouTube inauthentic-content policy ki current wording | support.google.com/youtube |

## Sources (search results se)

- [Headless mode - Antigravity CLI](https://antigravity.google/docs/cli/headless/)
- [Antigravity CLI hands-on guide (DEV)](https://dev.to/arindam_1729/antigravity-cli-a-hands-on-guide-to-googles-terminal-coding-agent-5bc7)
- [Text-to-speech generation (TTS) | Gemini API](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Render videos programmatically from a dataset | Remotion](https://www.remotion.dev/docs/dataset-render)
- [renderMedia() | Remotion](https://www.remotion.dev/docs/renderer/render-media)
- [npx remotion render | Remotion](https://www.remotion.dev/docs/cli/render)
