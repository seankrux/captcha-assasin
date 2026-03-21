// AI Captcha Solver — Popup UI Logic

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (sel) => document.querySelector(sel);

  const el = {
    autoSolve: $('#autoSolve'),
    provider: $('#provider'),
    apiKey: $('#apiKey'),
    solveDelay: $('#solveDelay'),
    toggleKey: $('#toggleKey'),
    verifyKey: $('#verifyKey'),
    keyIndicator: $('#keyIndicator'),
    keyDot: $('#keyDot'),
    keyIndicatorText: $('#keyIndicatorText'),
    keyStatus: $('#keyStatus'),
    save: $('#save'),
    resetStats: $('#resetStats'),
    status: $('#status'),
    statusDot: $('#statusDot'),
    detected: $('#detected'),
    solved: $('#solved'),
    failed: $('#failed'),
  };

  let keyValidState = null; // null | 'valid' | 'invalid'

  // Load settings
  const { settings } = await msg({ type: 'GET_SETTINGS' });
  if (settings) {
    el.autoSolve.checked = settings.autoSolve ?? true;
    el.provider.value = settings.provider || 'anthropic';
    el.apiKey.value = settings.apiKey || '';
    el.solveDelay.value = settings.solveDelay || 500;

    // Auto-verify if key exists
    if (settings.apiKey) {
      verifyApiKey(settings.provider, settings.apiKey);
    }
  }

  // Load stats
  const { stats } = await msg({ type: 'GET_STATS' });
  if (stats) {
    animateValue(el.detected, stats.detected || 0);
    animateValue(el.solved, stats.solved || 0);
    animateValue(el.failed, stats.failed || 0);
  }

  // Toggle API key visibility
  el.toggleKey.addEventListener('click', () => {
    const isPassword = el.apiKey.type === 'password';
    el.apiKey.type = isPassword ? 'text' : 'password';
  });

  // Verify key button
  el.verifyKey.addEventListener('click', () => {
    const key = el.apiKey.value.trim();
    const provider = el.provider.value;
    if (!key) {
      setKeyState('invalid', 'No key');
      return;
    }
    verifyApiKey(provider, key);
  });

  // Reset indicator when key or provider changes
  el.apiKey.addEventListener('input', () => {
    setKeyState(null, '');
    keyValidState = null;
  });

  el.provider.addEventListener('change', () => {
    setKeyState(null, '');
    keyValidState = null;
    updateProviderHint();
  });

  // Save settings
  el.save.addEventListener('click', async () => {
    const apiKey = el.apiKey.value.trim();
    if (!apiKey) {
      showStatus('API key is required', 'error');
      setKeyState('invalid', 'Missing');
      el.apiKey.focus();
      return;
    }

    const newSettings = {
      provider: el.provider.value,
      apiKey,
      autoSolve: el.autoSolve.checked,
      solveDelay: Math.max(100, Math.min(5000, parseInt(el.solveDelay.value, 10) || 500)),
      humanSimulation: true,
      confidenceThreshold: 0.6,
    };

    el.save.disabled = true;
    el.save.style.opacity = '0.7';

    // Auto-verify on save if not already verified
    if (keyValidState !== 'valid') {
      await verifyApiKey(newSettings.provider, apiKey);
    }

    const response = await msg({ type: 'SAVE_SETTINGS', settings: newSettings });

    if (response?.success) {
      showStatus('Settings saved', 'success');
    } else {
      showStatus('Failed to save', 'error');
    }

    setTimeout(() => {
      el.save.disabled = false;
      el.save.style.opacity = '1';
    }, 400);
  });

  // Reset stats
  el.resetStats.addEventListener('click', async () => {
    await msg({ type: 'RESET_STATS' });
    animateValue(el.detected, 0);
    animateValue(el.solved, 0);
    animateValue(el.failed, 0);
    showStatus('Stats reset', 'success');
  });

  // --- Key Verification ---

  async function verifyApiKey(provider, apiKey) {
    setKeyState('checking', 'Checking...');

    try {
      const result = await msg({
        type: 'VALIDATE_KEY',
        provider,
        apiKey
      });

      if (result.valid && result.warning) {
        // Valid but with warning (e.g., rate limited)
        setKeyState('warning', 'Warning');
        keyValidState = 'valid';
        el.keyStatus.textContent = result.warning;
      } else if (result.valid) {
        setKeyState('valid', result.status ? `${result.status} OK` : 'Active');
        keyValidState = 'valid';
        el.keyStatus.textContent = result.model
          ? `Connected to ${result.model}`
          : 'Key verified — 200 OK';
      } else {
        setKeyState('invalid', 'Failed');
        keyValidState = 'invalid';
        el.keyStatus.textContent = result.error || 'Invalid key';
      }
    } catch (err) {
      setKeyState('invalid', 'Error');
      keyValidState = 'invalid';
      el.keyStatus.textContent = err.message;
    }
  }

  function setKeyState(state, label) {
    el.keyIndicator.className = `key-indicator ${state || ''}`;
    el.keyIndicatorText.textContent = label || '';

    if (!state) {
      el.keyStatus.textContent = 'Click verify to check your key';
    }
  }

  // Update placeholder based on provider
  function updateProviderHint() {
    const provider = el.provider.value;
    const hints = {
      anthropic: 'sk-ant-...',
      openai: 'sk-...',
      gemini: 'AIza...',
      qwen: 'sk-...',
      ollama: 'llava (model name, not a key)',
    };
    el.apiKey.placeholder = hints[provider] || 'Enter key...';

    // Update label for Ollama
    const label = el.apiKey.closest('.field')?.querySelector('.field-label');
    if (label) {
      const labelText = provider === 'ollama' ? 'Model Name' : 'API Key';
      const firstChild = label.childNodes[0];
      if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
        firstChild.textContent = labelText + ' ';
      }
    }
  }
  updateProviderHint();

  // Dynamic version from manifest
  try {
    const ver = chrome.runtime.getManifest().version;
    const verEl = $('#version');
    if (verEl && ver) verEl.textContent = `v${ver}`;
  } catch {}

  // --- Helpers ---

  function msg(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
  }

  function showStatus(text, type = '') {
    el.status.textContent = text;
    el.statusDot.className = `status-dot ${type}`;

    clearTimeout(showStatus._timer);
    showStatus._timer = setTimeout(() => {
      el.status.textContent = 'Ready';
      el.statusDot.className = 'status-dot';
    }, 3000);
  }

  function animateValue(element, target) {
    const current = parseInt(element.textContent, 10) || 0;
    if (current === target) {
      element.textContent = target;
      return;
    }

    const duration = 400;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(current + (target - current) * eased);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }
});
