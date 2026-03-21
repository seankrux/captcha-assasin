// Content Script — Universal captcha detector and solver
// Runs on all pages + inside captcha iframes (all_frames: true)

(function() {
  'use strict';

  let solverActive = false;
  let detectedCaptchas = new Set();

  // ============================================================
  // UNIVERSAL CAPTCHA DETECTION
  // Matches any captcha provider by checking multiple signals
  // ============================================================

  const CAPTCHA_SIGNALS = {
    // Iframe src patterns (parent page)
    iframeSrc: [
      'recaptcha', 'hcaptcha', 'captcha', 'challenge',
      'turnstile', 'funcaptcha', 'mtcaptcha', 'geetest',
      'arkose', 'anticaptcha', 'securimage', 'botdetect'
    ],
    // CSS selectors for captcha containers (parent page)
    containers: [
      '.g-recaptcha', '.h-captcha', '[data-hcaptcha-widget-id]',
      '.cf-turnstile', '[data-sitekey]', '.mtcaptcha',
      '#mtcaptcha-holder', '.geetest_holder', '#funcaptcha',
      '.captcha-container', '.captcha-widget', '.captcha_widget',
      '[id*="captcha"]', '[class*="captcha"]',
      '#arkose-enforcement', '.arkose-challenge',
    ],
    // Image selectors for text/image captchas
    images: [
      'img[src*="captcha"]', 'img[alt*="captcha"]', 'img[alt*="CAPTCHA"]',
      'img[id*="captcha"]', 'img[class*="captcha"]',
      '.captcha-image', '#captchaImage', '#captcha-image',
    ],
    // Inside-iframe detection (when content script runs in captcha iframe)
    inIframe: {
      // Common captcha iframe hostnames
      hosts: [
        'hcaptcha.com', 'recaptcha.net', 'google.com/recaptcha',
        'challenges.cloudflare.com', 'mtcaptcha.com',
        'funcaptcha.com', 'client-api.arkoselabs.com',
        'api.geetest.com', 'captcha-api.com',
      ],
      // DOM elements that indicate a captcha challenge is active
      challengeSelectors: [
        // reCAPTCHA
        '.rc-imageselect-target', '.rc-imageselect-tile', '.rc-imageselect-desc-wrapper',
        '#recaptcha-verify-button', '.rc-imageselect-challenge',
        '.rc-audiochallenge-play-button',
        // hCaptcha
        '.prompt-text', '.task-grid', '.task-image', '.challenge-container',
        '.button-submit',
        // Cloudflare Turnstile
        '#challenge-stage', '.ctp-checkbox-label',
        // mtCaptcha
        '.mtcap-main', '.mtcap-challenge', '.mtcaptcha-image',
        // Generic
        '.challenge', '[class*="challenge"]', '[id*="challenge"]',
      ],
      // Checkbox elements to auto-click
      checkboxSelectors: [
        '.recaptcha-checkbox-border', '#recaptcha-anchor',
        '#checkbox', '.check',
        '.ctp-checkbox-label',
        '[role="checkbox"]',
      ],
    }
  };

  // ============================================================
  // INITIALIZATION
  // ============================================================

  // Mutation observer for dynamically added captchas
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanElement(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Initial scan with delay for late-loading captchas
  setTimeout(() => scanPage(), 800);
  setTimeout(() => scanPage(), 2500);

  // ============================================================
  // SCANNING
  // ============================================================

  function scanPage() {
    const host = window.location.hostname;
    const href = window.location.href;

    // Are we inside a captcha iframe?
    if (window !== window.top) {
      const isCaptchaHost = CAPTCHA_SIGNALS.inIframe.hosts.some(h => host.includes(h));
      const hasCaptchaPath = href.toLowerCase().includes('captcha') || href.includes('challenge');

      if (isCaptchaHost || hasCaptchaPath) {
        handleInsideCaptchaIframe();
        return;
      }
    }

    // Scan parent page for captcha elements
    scanForCaptchaContainers();
    scanForCaptchaIframes();
    scanForCaptchaImages();
  }

  function scanElement(element) {
    if (!element.querySelectorAll) return;

    // Check if element itself or children match
    const tag = element.tagName?.toLowerCase();
    if (tag === 'iframe' && isCaptchaIframe(element)) {
      notifyDetection('iframe_captcha', element);
    }

    // Check for captcha containers
    for (const sel of CAPTCHA_SIGNALS.containers) {
      if (element.matches?.(sel)) {
        notifyDetection('container_captcha', element);
        return;
      }
      const found = element.querySelectorAll(sel);
      found.forEach(el => notifyDetection('container_captcha', el));
    }
  }

  function scanForCaptchaContainers() {
    for (const sel of CAPTCHA_SIGNALS.containers) {
      document.querySelectorAll(sel).forEach(el => {
        notifyDetection('container_captcha', el);
      });
    }
  }

  function scanForCaptchaIframes() {
    document.querySelectorAll('iframe').forEach(iframe => {
      if (isCaptchaIframe(iframe)) {
        notifyDetection('iframe_captcha', iframe);
      }
    });
  }

  function scanForCaptchaImages() {
    for (const sel of CAPTCHA_SIGNALS.images) {
      document.querySelectorAll(sel).forEach(el => {
        notifyDetection('image_captcha', el);
        injectSolveButton(el);
      });
    }
  }

  function isCaptchaIframe(iframe) {
    const src = (iframe.src || '').toLowerCase();
    return CAPTCHA_SIGNALS.iframeSrc.some(signal => src.includes(signal));
  }

  // ============================================================
  // INSIDE CAPTCHA IFRAME — Universal handler
  // ============================================================

  function handleInsideCaptchaIframe() {
    console.log('[CaptchaSolver] Inside captcha iframe:', window.location.hostname);

    // Try auto-clicking checkbox first
    attemptCheckboxClick();

    // Watch for challenge to appear
    const challengeCheck = setInterval(() => {
      if (detectChallenge()) {
        clearInterval(challengeCheck);
        challengeObserver.disconnect();
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
          if (chrome.runtime.lastError) { injectSolverUI(); return; }
          if (response?.settings?.autoSolve) {
            setTimeout(() => solveVisibleChallenge(), response.settings.solveDelay || 500);
          } else {
            injectSolverUI();
          }
        });
      }
    }, 500);

    // Also watch via mutation observer
    const challengeObserver = new MutationObserver(() => {
      if (detectChallenge()) {
        challengeObserver.disconnect();
        clearInterval(challengeCheck);
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
          if (chrome.runtime.lastError) { injectSolverUI(); return; }
          if (response?.settings?.autoSolve) {
            setTimeout(() => solveVisibleChallenge(), response.settings.solveDelay || 500);
          } else {
            injectSolverUI();
          }
        });
      }
    });
    challengeObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Timeout after 20s
    setTimeout(() => {
      clearInterval(challengeCheck);
      challengeObserver.disconnect();
    }, 20000);
  }

  function attemptCheckboxClick() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (chrome.runtime.lastError || !response?.settings?.autoSolve) return;

      const tryClick = setInterval(() => {
        for (const sel of CAPTCHA_SIGNALS.inIframe.checkboxSelectors) {
          const checkbox = document.querySelector(sel);
          if (checkbox) {
            clearInterval(tryClick);
            simulateClick(checkbox);
            return;
          }
        }
      }, 300);

      setTimeout(() => clearInterval(tryClick), 8000);
    });
  }

  function detectChallenge() {
    for (const sel of CAPTCHA_SIGNALS.inIframe.challengeSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) { // visible
        return true;
      }
    }
    return false;
  }

  // ============================================================
  // UNIVERSAL SOLVER — Screenshot + AI Vision
  // ============================================================

  async function solveVisibleChallenge() {
    if (solverActive) return;
    solverActive = true;
    injectSolverUI();
    updateStatus('Capturing challenge...');

    try {
      // Get the challenge text if available
      const challengeText = extractChallengeText();

      // Capture the visible area via tab screenshot
      const screenshot = await requestTabCapture();
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }

      updateStatus('AI analyzing...');

      // Send to AI for analysis
      const response = await sendToAPI(screenshot, challengeText);
      const actions = parseAIResponse(response, challengeText);

      if (actions.type === 'click_tiles') {
        updateStatus(`Clicking ${actions.tiles.length} tiles...`);
        await executeTileClicks(actions.tiles);
        await humanDelay(500, 1000);
        clickSubmitButton();
        updateStatus('Submitted!');
      } else if (actions.type === 'type_text') {
        updateStatus(`Typing: ${actions.text}`);
        typeIntoInput(actions.text);
        updateStatus('Done!');
      } else if (actions.type === 'click_element') {
        updateStatus('Clicking...');
        const el = document.querySelector(actions.selector);
        if (el) simulateClick(el);
        updateStatus('Done!');
      } else {
        updateStatus('Could not determine action');
      }

      chrome.runtime.sendMessage({ type: 'LOG_RESULT', success: true });

      // Check for follow-up challenge
      setTimeout(() => {
        solverActive = false;
        if (detectChallenge()) {
          solveVisibleChallenge();
        } else {
          updateStatus('Solved!');
        }
      }, 2500);

    } catch (err) {
      console.error('[CaptchaSolver] Error:', err);
      updateStatus(`Error: ${err.message}`);
      chrome.runtime.sendMessage({ type: 'LOG_RESULT', success: false, error: err.message });
      solverActive = false;
    }
  }

  function extractChallengeText() {
    // Try known challenge text selectors
    const selectors = [
      '.rc-imageselect-desc-wrapper', '.rc-imageselect-instructions',
      '.rc-imageselect-desc', '.rc-imageselect-desc strong',
      '.prompt-text', '.prompt-padding',
      '.task-description', '.challenge-prompt',
      '.mtcap-title', '.mtcap-label',
      '[class*="prompt"]', '[class*="instruction"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }

    return '';
  }

  // ============================================================
  // IMAGE CAPTURE
  // ============================================================

  async function requestTabCapture() {
    // Strategy 1: Try to capture captcha images directly from DOM (fastest, most reliable)
    const directCapture = await captureNearestCaptchaImage();
    if (directCapture) return directCapture;

    // Strategy 2: Try to capture grid/tile images
    const gridCapture = await captureGridImages();
    if (gridCapture) return gridCapture;

    // Strategy 3: Fall back to tab screenshot
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (response) => {
        if (chrome.runtime.lastError || !response?.screenshot) {
          console.warn('[CaptchaSolver] All capture methods failed');
          resolve(null);
          return;
        }
        const base64 = response.screenshot.split(',')[1];
        resolve(base64);
      });
    });
  }

  async function captureNearestCaptchaImage() {
    // Find captcha images in the current document
    const selectors = [
      'img[src*="captcha"]', 'img[alt*="captcha"]', 'img[id*="captcha"]',
      'img[class*="captcha"]', '.captcha-image', '#captchaImage',
      '.mtcap-image img', '.mtcaptcha-image', 'canvas[class*="captcha"]',
      // Generic: any image near a captcha input or inside a captcha container
      '[class*="captcha"] img', '[id*="captcha"] img',
    ];

    for (const sel of selectors) {
      const imgs = document.querySelectorAll(sel);
      for (const img of imgs) {
        if (img.naturalWidth > 20 && img.naturalHeight > 20) {
          try {
            return await captureImageToBase64(img);
          } catch (e) {
            console.warn('[CaptchaSolver] Direct capture failed for', sel, e.message);
          }
        }
      }
    }

    // Also check for canvas elements (some captchas render on canvas)
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      if (canvas.width > 50 && canvas.height > 20) {
        try {
          return canvas.toDataURL('image/png').split(',')[1];
        } catch (e) {
          // Tainted canvas, can't capture
        }
      }
    }

    return null;
  }

  async function captureImageToBase64(imgEl) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');

      // Try crossOrigin first
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        // Retry without crossOrigin
        const img2 = new Image();
        img2.onload = () => {
          canvas.width = img2.naturalWidth;
          canvas.height = img2.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img2, 0, 0);
          try {
            resolve(canvas.toDataURL('image/png').split(',')[1]);
          } catch (e) {
            reject(e);
          }
        };
        img2.onerror = () => reject(new Error('Image load failed'));
        img2.src = imgEl.src;
      };
      img.src = imgEl.src;
    });
  }

  async function captureGridImages() {
    // Find all tile/grid images and compose them
    const images = document.querySelectorAll(
      '.rc-imageselect-tile img, td[role="button"] img, .task-image img, ' +
      '.task-image .image, [class*="tile"] img, [class*="grid"] img, ' +
      '.challenge img, canvas'
    );

    if (images.length === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const gridSize = Math.ceil(Math.sqrt(images.length));
    const tileSize = 100;
    canvas.width = gridSize * tileSize;
    canvas.height = Math.ceil(images.length / gridSize) * tileSize;
    const ctx = canvas.getContext('2d');

    const promises = Array.from(images).map((img, i) => {
      return new Promise((resolve) => {
        const src = img.src || img.style.backgroundImage?.replace(/url\(['"]?|['"]?\)/g, '');
        if (!src) { resolve(); return; }

        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = () => {
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          ctx.drawImage(tempImg, col * tileSize, row * tileSize, tileSize, tileSize);
          resolve();
        };
        tempImg.onerror = () => resolve();
        tempImg.src = src;
      });
    });

    await Promise.all(promises);
    return canvas.toDataURL('image/png').split(',')[1];
  }


  // ============================================================
  // AI COMMUNICATION
  // ============================================================

  async function sendToAPI(imageBase64, challengeText) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'SOLVE_WITH_AI',
        imageBase64,
        captchaType: 'universal',
        challengeText
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  // ============================================================
  // RESPONSE PARSING
  // ============================================================

  function parseAIResponse(response, challengeText) {
    // Try to extract JSON array (tile indices)
    const arrayMatch = response.match(/\[[\d,\s]*\]/);
    if (arrayMatch) {
      const tiles = JSON.parse(arrayMatch[0]).filter(n => Number.isInteger(n) && n >= 0);
      if (tiles.length > 0) {
        return { type: 'click_tiles', tiles };
      }
    }

    // Try to extract typed text (for text captchas)
    const textMatch = response.match(/^[A-Za-z0-9]{3,10}$/m);
    if (textMatch) {
      return { type: 'type_text', text: textMatch[0] };
    }

    // Check for coordinate-based clicks: {x: N, y: N}
    const coordMatch = response.match(/\{[^}]*"?x"?\s*:\s*(\d+)[^}]*"?y"?\s*:\s*(\d+)/);
    if (coordMatch) {
      return {
        type: 'click_coords',
        x: parseInt(coordMatch[1]),
        y: parseInt(coordMatch[2])
      };
    }

    // Fallback: treat entire response as text answer
    const cleanText = response.replace(/[^A-Za-z0-9\s]/g, '').trim();
    if (cleanText.length > 0 && cleanText.length < 50) {
      return { type: 'type_text', text: cleanText };
    }

    return { type: 'unknown', raw: response };
  }

  // ============================================================
  // ACTION EXECUTION
  // ============================================================

  async function executeTileClicks(tileIndices) {
    // Find clickable tiles
    const tiles = document.querySelectorAll(
      '.rc-imageselect-tile, td[role="button"], .task-image .image, ' +
      '.task-image, [class*="tile"], [class*="cell"]'
    );

    for (const index of tileIndices) {
      if (index < tiles.length) {
        await humanDelay(200, 500);
        simulateClick(tiles[index]);
      }
    }
  }

  function clickSubmitButton() {
    const submitSelectors = [
      '#recaptcha-verify-button', '.rc-button-default',
      '.button-submit', '[type="submit"]',
      'button[class*="verify"]', 'button[class*="submit"]',
      'button[class*="check"]', '.verify-button',
    ];

    for (const sel of submitSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        simulateClick(btn);
        return;
      }
    }
  }

  function typeIntoInput(text) {
    const inputSelectors = [
      'input[type="text"]', 'input:not([type])',
      '#captcha-input', '[name*="captcha"]',
      'input[class*="captcha"]', '.captcha-input',
    ];

    for (const sel of inputSelectors) {
      const input = document.querySelector(sel);
      if (input) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
  }

  // ============================================================
  // TEXT/IMAGE CAPTCHA — Solve button on main page
  // ============================================================

  function injectSolveButton(imgElement) {
    if (imgElement.dataset.solverAttached) return;
    imgElement.dataset.solverAttached = 'true';

    const btn = document.createElement('button');
    btn.textContent = 'AI Solve';
    btn.className = 'captcha-solver-btn';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.textContent = 'Solving...';
      btn.disabled = true;

      try {
        const imageBase64 = await captureImageElement(imgElement);
        const response = await sendToAPI(imageBase64, '');
        const solvedText = response.trim().replace(/[^A-Za-z0-9]/g, '');

        // Find nearby input
        const input = findNearbyInput(imgElement);
        if (input) {
          input.value = solvedText;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          btn.textContent = `Solved: ${solvedText}`;
        } else {
          btn.textContent = solvedText;
          try { navigator.clipboard.writeText(solvedText); } catch {}
        }
        chrome.runtime.sendMessage({ type: 'LOG_RESULT', success: true });
      } catch (err) {
        btn.textContent = `Error`;
        chrome.runtime.sendMessage({ type: 'LOG_RESULT', success: false });
      }

      setTimeout(() => { btn.textContent = 'AI Solve'; btn.disabled = false; }, 5000);
    });

    imgElement.parentElement.style.position = 'relative';
    imgElement.parentElement.appendChild(btn);
  }

  async function captureImageElement(imgEl) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => {
          canvas.width = fallback.naturalWidth;
          canvas.height = fallback.naturalHeight;
          canvas.getContext('2d').drawImage(fallback, 0, 0);
          resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        fallback.onerror = () => reject(new Error('Cannot capture image'));
        fallback.src = imgEl.src;
      };
      img.src = imgEl.src;
    });
  }

  function findNearbyInput(element) {
    const parent = element.closest('form') || element.parentElement?.parentElement;
    if (parent) {
      const input = parent.querySelector('input[type="text"], input:not([type])');
      if (input) return input;
    }
    let sibling = element.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === 'INPUT') return sibling;
      const nested = sibling.querySelector('input[type="text"]');
      if (nested) return nested;
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  // ============================================================
  // NOTIFICATION
  // ============================================================

  function notifyDetection(type, element) {
    const key = type + '_' + (element.id || element.className || Math.random());
    if (detectedCaptchas.has(key)) return;
    detectedCaptchas.add(key);

    console.log(`[CaptchaSolver] Detected ${type}:`, element);
    chrome.runtime.sendMessage({
      type: 'CAPTCHA_DETECTED',
      captchaType: type,
      url: window.location.href
    });
  }

  // ============================================================
  // HUMAN SIMULATION
  // ============================================================

  function simulateClick(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width * (0.3 + Math.random() * 0.4);
    const y = rect.top + rect.height * (0.3 + Math.random() * 0.4);

    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      element.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true,
        clientX: x, clientY: y,
        pointerId: 1, pointerType: 'mouse', view: window
      }));
    }
  }

  function humanDelay(min, max) {
    return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
  }

  // ============================================================
  // SOLVER UI OVERLAY (inside captcha iframe)
  // ============================================================

  function injectSolverUI() {
    if (document.getElementById('captcha-solver-status')) return;

    const container = document.createElement('div');
    container.id = 'captcha-solver-status';
    container.innerHTML = `
      <div class="solver-badge">
        <span class="solver-dot"></span>
        <span class="solver-text">AI Solver Ready</span>
      </div>
      <button id="solver-manual-trigger" class="solver-trigger-btn">Solve Now</button>
    `;
    document.body.appendChild(container);

    document.getElementById('solver-manual-trigger')?.addEventListener('click', () => {
      solverActive = false;
      solveVisibleChallenge();
    });
  }

  function updateStatus(text) {
    const textEl = document.querySelector('#captcha-solver-status .solver-text');
    const dotEl = document.querySelector('#captcha-solver-status .solver-dot');
    if (textEl) textEl.textContent = text;

    // Set dot color based on status
    if (dotEl) {
      dotEl.className = 'solver-dot';
      if (text.startsWith('Error') || text.startsWith('Could not')) {
        dotEl.classList.add('error');
      } else if (text === 'Solved!' || text === 'Submitted!' || text === 'Done!') {
        dotEl.classList.add('solved');
      } else if (text.includes('Analyzing') || text.includes('Capturing') || text.includes('Clicking') || text.includes('Typing')) {
        dotEl.classList.add('solving');
      }
    }

    console.log(`[CaptchaSolver] ${text}`);
  }

})();
