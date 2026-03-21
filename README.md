# AI Captcha Solver

Chrome extension that uses Vision AI to solve captchas automatically. Supports multiple AI providers and local LLMs.

## Features

- **Universal captcha detection** — reCAPTCHA v2, hCaptcha, mtCaptcha, Cloudflare Turnstile, text/image captchas, and more
- **Multi-provider AI** — Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), Qwen-VL (Alibaba), or local Ollama
- **Local LLM support** — Run completely offline with Ollama + vision models (moondream, llava)
- **Animated icon** — Pulsing amber on detect, spinning blue while solving, green on success, red on fail
- **Badge counter** — Shows number of detected captchas
- **API key validator** — Live green/red/yellow indicator with actual HTTP status codes
- **Human simulation** — Randomized click coordinates and timing delays
- **Auto-solve** — Configurable delay, toggle on/off
- **Premium dark UI** — shadcn-inspired zinc palette, Inter + JetBrains Mono fonts

## Installation

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder
5. Click the extension icon to configure

## Configuration

### Cloud Providers (API Key)

| Provider | Model | Key Format |
|----------|-------|------------|
| Claude | claude-sonnet-4 | `sk-ant-...` |
| GPT-4o | gpt-4o | `sk-...` |
| Gemini | gemini-2.0-flash | `AIza...` |
| Qwen-VL | qwen-vl-max | `sk-...` |

### Local LLM (Ollama)

1. Install [Ollama](https://ollama.ai)
2. Pull a vision model: `ollama pull moondream` (1.7GB) or `ollama pull llava` (4.7GB)
3. Select "Ollama - Local LLM" in the extension
4. Enter the model name (e.g., `moondream`)

## How It Works

1. **Detection** — Content script scans pages for captcha elements (iframes, images, containers with captcha-related attributes)
2. **Capture** — Grabs the captcha image directly from the DOM or via tab screenshot
3. **Analysis** — Sends the image to your chosen Vision AI with a solving prompt
4. **Action** — Parses the AI response and clicks tiles, types text, or submits the form
5. **Feedback** — Icon animates and badge updates with solve status

## Supported Captcha Types

| Type | Detection | Solving |
|------|-----------|---------|
| reCAPTCHA v2 (image grid) | Iframe + DOM | AI tile selection |
| hCaptcha (image grid) | Iframe + DOM | AI tile selection |
| Text/OCR captcha | Image element | AI text recognition |
| mtCaptcha | Container + image | AI text recognition |
| Cloudflare Turnstile | Iframe | Auto-click |
| FunCaptcha/Arkose | Iframe | Screenshot + AI |
| Generic image captcha | `img[src*=captcha]` | AI Solve button |

## Project Structure

```
manifest.json                    # MV3 manifest
icons/                           # Extension icons (16, 48, 128px)
src/
  background/
    service-worker.js            # Message routing, API calls, tab capture
    icon-animator.js             # Animated extension icon states
  content/
    detector.js                  # Universal captcha detector + solver
    overlay.css                  # In-page solver badge styles
  popup/
    popup.html                   # Settings UI
    popup.css                    # shadcn-inspired dark theme
    popup.js                     # Settings logic, key validation
  utils/
    api.js                       # AI provider configs + validation
```

## Privacy

- No data collected or transmitted except to your chosen AI provider
- API keys stored locally in Chrome storage
- No analytics, no tracking
- Ollama mode is fully offline

## License

MIT
