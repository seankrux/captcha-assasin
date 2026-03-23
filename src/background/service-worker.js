// AI Captcha Solver — Background Service Worker
// Handles API calls, tab capture, icon animation, and settings

importScripts('../utils/api.js', 'icon-animator.js');

const DEFAULT_SETTINGS = {
  provider: 'anthropic',
  apiKey: '',
  autoSolve: true,
  solveDelay: 500,
  confidenceThreshold: 0.6,
  humanSimulation: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  await chrome.storage.local.set({
    stats: { detected: 0, solved: 0, failed: 0 }
  });
  setIconState('idle');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'CAPTCHA_DETECTED': {
      const { settings } = await chrome.storage.local.get('settings');
      const { stats } = await chrome.storage.local.get('stats');
      if (stats) {
        stats.detected++;
        await chrome.storage.local.set({ stats });
        setIconState('detecting', stats.detected);
      } else {
        setIconState('detecting');
      }
      return { shouldSolve: settings?.autoSolve ?? true, settings };
    }

    case 'GET_SETTINGS': {
      const { settings } = await chrome.storage.local.get('settings');
      return { settings: settings || DEFAULT_SETTINGS };
    }

    case 'SAVE_SETTINGS': {
      await chrome.storage.local.set({ settings: message.settings });
      return { success: true };
    }

    case 'GET_STATS': {
      const { stats } = await chrome.storage.local.get('stats');
      return { stats: stats || { detected: 0, solved: 0, failed: 0 } };
    }

    case 'RESET_STATS': {
      await chrome.storage.local.set({
        stats: { detected: 0, solved: 0, failed: 0 }
      });
      return { success: true };
    }

    case 'VALIDATE_KEY': {
      const result = await validateApiKey(message.provider, message.apiKey);
      return result;
    }

    case 'SOLVE_WITH_AI': {
      // Animate icon — solving in progress
      setIconState('solving');
      try {
        const result = await solveCaptchaWithAI(
          message.imageBase64,
          message.captchaType,
          message.challengeText
        );
        return { result };
      } catch (err) {
        setIconState('failed');
        throw err;
      }
    }

    case 'CAPTURE_TAB': {
      try {
        // Try to get the window ID from sender, fallback to current window
        let windowId = sender?.tab?.windowId;
        if (!windowId) {
          const currentWindow = await chrome.windows.getCurrent();
          windowId = currentWindow.id;
        }
        const screenshot = await chrome.tabs.captureVisibleTab(
          windowId,
          { format: 'png' }
        );
        return { screenshot };
      } catch (err) {
        // Tab capture failed
        return { screenshot: null, error: err.message };
      }
    }

    case 'LOG_RESULT': {
      const { stats } = await chrome.storage.local.get('stats');
      if (stats) {
        if (message.success) {
          stats.solved++;
          setIconState('solved');
        } else {
          stats.failed++;
          setIconState('failed');
        }
        await chrome.storage.local.set({ stats });
      }
      return { ok: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}
