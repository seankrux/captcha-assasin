# 🛡️ AI Captcha Solver

**AI-Powered Captcha Solver for Chrome**

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

Chrome extension that uses Vision AI to automatically detect and solve captchas. Supports multiple cloud providers and fully offline local LLMs via Ollama.

## Supported Providers

| Provider | Model | Key Format |
|----------|-------|------------|
| Claude (Anthropic) | `claude-sonnet-4-20250514` | `sk-ant-...` |
| GPT-4o (OpenAI) | `gpt-4o` | `sk-...` |
| Gemini (Google) | `gemini-2.0-flash` | `AIza...` |
| Qwen-VL (Alibaba) | `qwen-vl-max` | `sk-...` |
| Ollama (Local) | `llava`, `moondream`, etc. | Model name |

## Features

- **Universal captcha detection** — reCAPTCHA v2, hCaptcha, mtCaptcha, Cloudflare Turnstile, text/image captchas, and more
- **Multi-provider AI** — Claude, GPT-4o, Gemini, Qwen-VL, or local Ollama
- **Local LLM support** — Run completely offline with Ollama + vision models (moondream, llava)
- **Animated icon** — Pulsing amber on detect, spinning blue while solving, green on success, red on fail
- **Badge counter** — Shows number of detected captchas
- **API key validator** — Live green/red/yellow indicator with actual HTTP status codes
- **Human simulation** — Randomized click coordinates and timing delays
- **Auto-solve** — Configurable delay, toggle on/off
- **Premium dark UI** — shadcn-inspired zinc palette, Inter + JetBrains Mono fonts

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

## Installation

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder
5. Click the extension icon to configure

## Configuration

### Cloud Providers (API Key)

1. Select your provider from the dropdown
2. Enter your API key
3. Click the verify button to validate
4. Save settings

### Local LLM (Ollama)

1. Install [Ollama](https://ollama.ai)
2. Pull a vision model: `ollama pull moondream` (1.7 GB) or `ollama pull llava` (4.7 GB)
3. Select **Ollama — Local LLM** in the extension
4. Enter the model name (e.g., `moondream`)

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

## License

MIT

---

Made with 💛 by Sean G
