<div align="center">
  <h1>Captcha Assasin</h1>
  <p><strong>Vision AI-powered captcha solver for Chrome with multi-provider support</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
    <img src="https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
  </p>
</div>

---

## Overview

Chrome extension that uses Vision AI to automatically detect and solve captchas across the web. Supports multiple cloud providers and fully offline local LLMs via Ollama.

## Supported Providers

| Provider | Model | Key Format |
|----------|-------|------------|
| Claude (Anthropic) | `claude-sonnet-4-20250514` | `sk-ant-...` |
| GPT-4o (OpenAI) | `gpt-4o` | `sk-...` |
| Gemini (Google) | `gemini-2.0-flash` | `AIza...` |
| Qwen-VL (Alibaba) | `qwen-vl-max` | `sk-...` |
| Ollama (Local) | `llava`, `moondream`, etc. | Model name |

## Features

▸ **Universal Captcha Detection** — reCAPTCHA v2, hCaptcha, mtCaptcha, Cloudflare Turnstile, text/image captchas

▸ **Multi-Provider AI** — Claude, GPT-4o, Gemini, Qwen-VL, or local Ollama

▸ **Local LLM Support** — Run completely offline with Ollama + vision models

▸ **Animated Icon** — Pulsing amber on detect, spinning blue while solving, green on success, red on fail

▸ **API Key Validator** — Live status indicator with actual HTTP status codes

▸ **Human Simulation** — Randomized click coordinates and timing delays

▸ **Auto-Solve** — Configurable delay with toggle on/off

▸ **Premium Dark UI** — shadcn-inspired zinc palette with Inter and JetBrains Mono fonts

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

1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select this folder
5. Click the extension icon to configure

## Configuration

### Cloud Providers

1. Select your provider from the dropdown
2. Enter your API key
3. Click the verify button to validate
4. Save settings

### Local LLM via Ollama

1. Install [Ollama](https://ollama.ai)
2. Pull a vision model: `ollama pull moondream` or `ollama pull llava`
3. Select **Ollama** in the extension provider dropdown
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
    popup.css                    # Dark theme styles
    popup.js                     # Settings logic, key validation
  utils/
    api.js                       # AI provider configs + validation
```

## License

[MIT](LICENSE)

---

<p align="center">Made with 💛 by Sean G</p>
