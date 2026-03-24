<div align="center">
  <h1>Captcha Assasin</h1>
  <p><strong>Vision AI-powered captcha solver for Chrome with multi-provider support</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
    <img src="https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  </p>
</div>

---

## Overview

Captcha Assasin is a Chrome extension that uses vision-capable AI models to detect, interpret, and solve captchas directly in the browser. It is designed as a flexible multi-provider system, supporting frontier cloud models and fully local vision models through Ollama in the same product flow.

## Why Captcha Assasin?

Most captcha solvers force a single deployment model: either a hosted API or a closed, opaque backend. Captcha Assasin stands out with a dual approach that combines:

- Bring-your-own-key support for leading cloud vision models
- Fully local inference through Ollama for privacy-sensitive or offline workflows

That makes it a stronger portfolio project than a typical single-provider integration. The same extension UX can route captcha analysis through Claude, GPT-4o, Gemini, Qwen-VL, or local vision models without changing the core solving experience.

## Architecture

Captcha Assasin uses a layered pipeline to turn live captcha challenges into structured actions:

1. **Detection layer** scans the DOM, images, and nested iframes for reCAPTCHA, hCaptcha, Turnstile, mtCaptcha, FunCaptcha, and generic captcha signals.
2. **Capture layer** extracts the nearest captcha image when possible, composites challenge grids when needed, and falls back to tab screenshots for difficult iframe-based challenges.
3. **Vision inference layer** sends the captured image to a provider adapter in `src/utils/api.js`, which normalizes requests across Claude, GPT-4o, Gemini, Qwen-VL, and local Ollama models.
4. **Execution layer** parses the model response into tile clicks, text entry, or element actions, then applies human-like timing and randomized interactions before submitting.

The extension architecture separates detection, capture, inference, and action execution across content scripts, the background service worker, and provider-specific adapters. This keeps the system easy to extend with new captcha heuristics or additional model backends.

## Supported Providers

| Provider | Model | Key Format |
|----------|-------|------------|
| Claude (Anthropic) | `claude-sonnet-4-20250514` | `sk-ant-...` |
| GPT-4o (OpenAI) | `gpt-4o` | `sk-...` |
| Gemini (Google) | `gemini-2.0-flash` | `AIza...` |
| Qwen-VL (Alibaba) | `qwen-vl-max` | `sk-...` |
| Ollama (Local) | `llava`, `moondream`, etc. | Model name |

## Supported Models

| Model | Provider | Local/Cloud | Notes |
|-------|----------|-------------|-------|
| `claude-sonnet-4-20250514` | Anthropic | Cloud | Strong multimodal reasoning for instruction-heavy image challenges |
| `gpt-4o` | OpenAI | Cloud | General-purpose vision model with fast response times and broad tooling support |
| `gemini-2.0-flash` | Google | Cloud | Low-latency multimodal model with API key or OAuth support |
| `qwen-vl-max` | Alibaba | Cloud | Vision-language model available through DashScope's compatible chat API |
| `llava` | Ollama | Local | Default local vision model path in the extension |
| `moondream` | Ollama | Local | Lightweight option that works well for OCR-style captcha recognition |
| `minicpm-v` | Ollama | Local | Efficient local multimodal model supported by the validation flow |
| `bakllava`, `cogvlm`, `nanollava`, `llava-llama3`, `llava-phi3` | Ollama | Local | Additional local vision models the extension recognizes as compatible |

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

## Getting Started

### Install the extension

1. Clone or download this repository to your machine.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select this project folder.
5. Pin the extension and open the popup to configure a provider.

### Choose your inference path

1. Select a provider from the dropdown in the popup.
2. Enter your API key for a cloud model, or enter an Ollama model name for local execution.
3. Click the verify button to validate connectivity.
4. Save settings and browse normally; the extension will detect supported captchas automatically.

### Optional: run locally with Ollama

1. Install [Ollama](https://ollama.ai).
2. Pull a vision-capable local model:

```bash
ollama pull llava
# or
ollama pull moondream
```

3. Make sure Ollama is running on `http://localhost:11434`.
4. In the extension, choose **Ollama** and enter the model name you pulled.

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

## Contributing

Contributions are welcome, especially in areas that improve solver accuracy, model coverage, and extension UX.

1. Fork the repository and create a focused feature branch.
2. Keep changes scoped and document any new provider, captcha type, or prompt logic.
3. Test your changes against at least one supported captcha flow and, if relevant, one cloud provider or local Ollama model.
4. Open a pull request with a concise summary of the problem, the implementation approach, and the expected behavior change.

If you add a new provider or model, update the adapter logic in `src/utils/api.js`, the popup provider configuration, and the README tables so documentation stays aligned with the product.

<p align="center">Made with 💛 by <a href="https://www.seanguillermo.com"><strong>Sean G</strong></a></p>
