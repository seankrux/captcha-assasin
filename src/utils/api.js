// Vision API clients for captcha solving

const PROVIDERS = {
  anthropic: {
    name: 'Claude (Anthropic)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    buildRequest(apiKey, imageBase64, prompt) {
      return {
        url: this.endpoint,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
                },
                { type: 'text', text: prompt }
              ]
            }]
          })
        }
      };
    },
    parseResponse(data) {
      return data.content?.[0]?.text || '';
    },
    // Lightweight validation — list models endpoint
    async validateKey(apiKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      if (res.status === 401) return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
      if (res.status === 403) return { valid: false, error: 'Key forbidden (403). Check permissions.' };
      if (res.status === 429) return { valid: true, warning: 'Key valid but rate-limited (429).' };
      if (res.status === 529) return { valid: true, warning: 'Key valid. API overloaded (529).' };
      return { valid: true, status: 200 };
    }
  },

  openai: {
    name: 'GPT-4o (OpenAI)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    buildRequest(apiKey, imageBase64, prompt) {
      return {
        url: this.endpoint,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                { type: 'text', text: prompt }
              ]
            }]
          })
        }
      };
    },
    parseResponse(data) {
      return data.choices?.[0]?.message?.content || '';
    },
    async validateKey(apiKey) {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.status === 401) return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
      if (res.status === 429) return { valid: true, warning: 'Key valid but rate-limited (429).' };
      if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
      return { valid: true, status: 200 };
    }
  },

  gemini: {
    name: 'Gemini (Google)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    buildRequest(apiKey, imageBase64, prompt) {
      // Support both API key and OAuth token
      const isOAuth = apiKey.startsWith('ya29.') || apiKey.length > 100;
      const url = isOAuth ? this.endpoint : `${this.endpoint}?key=${apiKey}`;
      const headers = { 'Content-Type': 'application/json' };
      if (isOAuth) headers['Authorization'] = `Bearer ${apiKey}`;

      return {
        url,
        options: {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: 'image/png', data: imageBase64 } },
                { text: prompt }
              ]
            }]
          })
        }
      };
    },
    parseResponse(data) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
    async validateKey(apiKey) {
      const isOAuth = apiKey.startsWith('ya29.') || apiKey.length > 100;
      const url = isOAuth
        ? 'https://generativelanguage.googleapis.com/v1beta/models'
        : `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const headers = isOAuth ? { 'Authorization': `Bearer ${apiKey}` } : {};

      const res = await fetch(url, { headers });
      if (res.status === 401) return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
      if (res.status === 403) return { valid: false, error: 'Key forbidden (403). Check API is enabled in GCP.' };
      if (res.status === 429) return { valid: true, warning: 'Key valid but rate-limited (429). Wait or upgrade plan.' };
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { valid: false, error: `HTTP ${res.status}: ${body.substring(0, 100)}` };
      }
      return { valid: true, status: 200 };
    }
  },

  ollama: {
    name: 'Ollama (Local)',
    endpoint: 'http://localhost:11434/api/chat',
    buildRequest(apiKey, imageBase64, prompt) {
      // apiKey is used as the model name for Ollama (e.g., "llava", "llava:13b")
      const model = apiKey || 'llava';
      return {
        url: this.endpoint,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{
              role: 'user',
              content: prompt,
              images: [imageBase64]
            }],
            stream: false
          })
        }
      };
    },
    parseResponse(data) {
      return data.message?.content || '';
    },
    async validateKey(apiKey) {
      const VISION_MODELS = ['llava', 'bakllava', 'minicpm-v', 'cogvlm', 'moondream', 'nanollava', 'llava-llama3', 'llava-phi3'];
      try {
        const model = apiKey || 'llava';
        const res = await fetch('http://localhost:11434/api/tags');
        if (!res.ok) return { valid: false, error: 'Ollama not running on localhost:11434' };
        const data = await res.json();
        const models = data.models?.map(m => m.name) || [];
        const hasModel = models.some(m => m.startsWith(model.split(':')[0]));
        if (!hasModel) {
          const available = models.slice(0, 5).join(', ') || 'none';
          return { valid: false, error: `Model "${model}" not found. Available: ${available}. Need vision model: ollama pull llava` };
        }
        // Check if it's a vision model
        const isVision = VISION_MODELS.some(v => model.toLowerCase().includes(v));
        if (!isVision) {
          return {
            valid: true,
            warning: `"${model}" may not support images. For captchas use a vision model: llava, minicpm-v, moondream`,
            model
          };
        }
        return { valid: true, model, status: 200 };
      } catch {
        return { valid: false, error: 'Cannot connect to Ollama at localhost:11434. Is it running?' };
      }
    }
  },

  qwen: {
    name: 'Qwen-VL (Alibaba)',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    buildRequest(apiKey, imageBase64, prompt) {
      return {
        url: this.endpoint,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'qwen-vl-max',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                { type: 'text', text: prompt }
              ]
            }]
          })
        }
      };
    },
    parseResponse(data) {
      return data.choices?.[0]?.message?.content || '';
    },
    async validateKey(apiKey) {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.status === 401 || res.status === 403) return { valid: false, error: 'Invalid API key' };
      return { valid: true };
    }
  }
};

/**
 * Validate an API key for the given provider.
 * Makes a lightweight request to check auth.
 */
async function validateApiKey(provider, apiKey) {
  // Ollama uses the key field as model name, allow short strings
  if (provider !== 'ollama' && (!apiKey || apiKey.length < 8)) {
    return { valid: false, error: 'Key too short' };
  }
  const p = PROVIDERS[provider];
  if (!p?.validateKey) {
    return { valid: false, error: 'Unknown provider' };
  }
  try {
    const result = await p.validateKey(apiKey);
    // Add status code info for better UX
    return result;
  } catch (err) {
    return { valid: false, error: `Network error: ${err.message}` };
  }
}

/**
 * Send a captcha image to the configured vision AI for analysis.
 */
async function solveCaptchaWithAI(imageBase64, captchaType, challengeText) {
  const { settings } = await chrome.storage.local.get('settings');
  const providerKey = settings?.provider || 'anthropic';
  const provider = PROVIDERS[providerKey];
  const apiKey = settings?.apiKey;

  if (!provider) {
    throw new Error(`Unknown provider: "${providerKey}". Open settings and select a valid provider.`);
  }

  if (!apiKey) {
    throw new Error('No API key configured. Open extension settings.');
  }

  const prompt = buildPrompt(captchaType, challengeText);
  const { url, options } = provider.buildRequest(apiKey, imageBase64, prompt);

  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return provider.parseResponse(data);
}

function buildPrompt(captchaType, challengeText) {
  switch (captchaType) {
    case 'recaptcha_grid':
      return `You are a captcha solving assistant. This is a reCAPTCHA image grid challenge.

The challenge says: "${challengeText}"

The image shows a grid of tiles (typically 3x3 or 4x4).
Analyze each tile and determine which ones match the challenge description.

Return ONLY a JSON array of tile indices (0-indexed, left-to-right, top-to-bottom) that match.
Example: [0, 3, 6]

If no tiles match, return an empty array: []
Do NOT include any explanation, just the JSON array.`;

    case 'recaptcha_dynamic':
      return `You are a captcha solving assistant. This is a reCAPTCHA image that may refresh tiles.

The challenge says: "${challengeText}"

Analyze the image grid and identify which tiles contain the requested object.
Return ONLY a JSON array of tile indices (0-indexed, left-to-right, top-to-bottom).
Example: [1, 4, 7]`;

    case 'hcaptcha':
      return `You are a captcha solving assistant. This is an hCaptcha image grid challenge.

The challenge says: "${challengeText}"

Analyze each tile in the grid and determine which ones match.
Return ONLY a JSON array of tile indices (0-indexed, left-to-right, top-to-bottom).
Example: [2, 5, 8]`;

    case 'text_captcha':
      return `You are a captcha solving assistant. This image contains distorted text that needs to be read.

Read the text in the image carefully. The text may be warped, rotated, or have noise/lines over it.
Return ONLY the text you see, with no explanation or extra characters.`;

    case 'universal':
      return `You are a captcha solving assistant. Analyze this screenshot of a captcha challenge.

${challengeText ? `The challenge text says: "${challengeText}"` : 'Identify what the captcha is asking.'}

Determine the type of captcha and solve it:

1. **Image grid** (select matching tiles): Return ONLY a JSON array of tile indices (0-indexed, left-to-right, top-to-bottom). Example: [0, 3, 6]

2. **Text/OCR captcha** (read distorted text): Return ONLY the text characters you see.

3. **Slider captcha**: Return the word "SLIDER" followed by the pixel distance to slide.

4. **Click captcha** (click specific object): Return JSON object {"x": pixel_x, "y": pixel_y} of where to click.

Return ONLY your answer with no explanation. For image grids, return the JSON array. For text, return just the text.`;

    default:
      return `Analyze this captcha image and solve it.
If it's a text captcha, return just the text.
If it's an image selection grid with the prompt "${challengeText || 'unknown'}", return a JSON array of matching tile indices.`;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.solveCaptchaWithAI = solveCaptchaWithAI;
  globalThis.validateApiKey = validateApiKey;
  globalThis.PROVIDERS = PROVIDERS;
}
