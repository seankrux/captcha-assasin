// Extension icon animator — premium animated badge states
// Uses OffscreenCanvas to generate dynamic icons

const ICON_SIZES = [16, 32, 48, 128];

// Color palette
const COLORS = {
  idle: { bg: '#6c5ce7', accent: '#a78bfa', check: '#ffffff' },
  detecting: { bg: '#6c5ce7', pulse: '#f59e0b', ring: '#fbbf24' },
  solving: { bg: '#6c5ce7', pulse: '#3b82f6', ring: '#60a5fa' },
  solved: { bg: '#22c55e', accent: '#4ade80', check: '#ffffff' },
  failed: { bg: '#ef4444', accent: '#f87171', cross: '#ffffff' },
};

let animationTimer = null;
let stateTimer = null;
let animationFrame = 0;
let currentState = 'idle';
let pendingCaptchaCount = 0;

/**
 * Set the icon state with animation.
 * States: 'idle' | 'detecting' | 'solving' | 'solved' | 'failed'
 */
function setIconState(state, count) {
  const prevState = currentState;
  currentState = state;
  animationFrame = 0;

  if (typeof count === 'number') {
    pendingCaptchaCount = count;
  }

  // Clear any running timers
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
  if (stateTimer) {
    clearTimeout(stateTimer);
    stateTimer = null;
  }

  switch (state) {
    case 'detecting':
      // Pulsing amber ring — captcha found
      pendingCaptchaCount = Math.max(pendingCaptchaCount, 1);
      chrome.action.setBadgeText({ text: String(pendingCaptchaCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });

      animationTimer = setInterval(() => {
        animationFrame++;
        drawIcon(state, animationFrame);
      }, 80);

      stateTimer = setTimeout(() => {
        if (currentState === 'detecting') setIconState('idle');
      }, 8000);
      break;

    case 'solving':
      // Spinning blue ring — AI working
      chrome.action.setBadgeText({ text: String(pendingCaptchaCount || '...') });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });

      animationTimer = setInterval(() => {
        animationFrame++;
        drawIcon(state, animationFrame);
      }, 50);
      break;

    case 'solved':
      // Flash green then settle
      pendingCaptchaCount = Math.max(0, pendingCaptchaCount - 1);
      drawIcon(state, 0);
      chrome.action.setBadgeText({ text: pendingCaptchaCount > 0 ? String(pendingCaptchaCount) : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });

      stateTimer = setTimeout(() => {
        if (currentState === 'solved') setIconState('idle');
      }, 4000);
      break;

    case 'failed':
      // Flash red
      drawIcon(state, 0);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

      stateTimer = setTimeout(() => {
        if (currentState === 'failed') {
          chrome.action.setBadgeText({ text: '' });
          setIconState('idle');
        }
      }, 4000);
      break;

    default:
      // Idle — static icon, show count if any pending
      drawIcon('idle', 0);
      if (pendingCaptchaCount > 0) {
        chrome.action.setBadgeText({ text: String(pendingCaptchaCount) });
        chrome.action.setBadgeBackgroundColor({ color: '#6c5ce7' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
      break;
  }
}

/**
 * Draw the icon for a given state and animation frame.
 */
function drawIcon(state, frame) {
  const imageData = {};

  for (const size of ICON_SIZES) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const s = size; // shorthand
    const cx = s / 2;
    const cy = s / 2;

    // Clear
    ctx.clearRect(0, 0, s, s);

    switch (state) {
      case 'idle':
        drawIdleIcon(ctx, s, cx, cy);
        break;

      case 'detecting':
        drawDetectingIcon(ctx, s, cx, cy, frame);
        break;

      case 'solving':
        drawSolvingIcon(ctx, s, cx, cy, frame);
        break;

      case 'solved':
        drawSolvedIcon(ctx, s, cx, cy);
        break;

      case 'failed':
        drawFailedIcon(ctx, s, cx, cy);
        break;
    }

    imageData[size] = ctx.getImageData(0, 0, s, s);
  }

  chrome.action.setIcon({ imageData });
}

// --- Icon drawing functions ---

function drawIdleIcon(ctx, s, cx, cy) {
  // Rounded rect background
  const r = s * 0.22;
  drawRoundedRect(ctx, 0, 0, s, s, r);
  ctx.fillStyle = COLORS.idle.bg;
  ctx.fill();

  // "AI" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${s * 0.38}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI', cx, cy - s * 0.06);

  // Small checkmark
  drawCheckmark(ctx, cx, cy + s * 0.22, s * 0.18, '#4ade80', s * 0.06);
}

function drawDetectingIcon(ctx, s, cx, cy, frame) {
  // Background
  drawRoundedRect(ctx, 0, 0, s, s, s * 0.22);
  ctx.fillStyle = COLORS.idle.bg;
  ctx.fill();

  // Pulsing ring
  const pulse = Math.sin(frame * 0.15) * 0.5 + 0.5;
  const ringAlpha = 0.3 + pulse * 0.7;
  const ringWidth = s * 0.06 + pulse * s * 0.03;

  ctx.strokeStyle = `rgba(251, 191, 36, ${ringAlpha})`;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow dot
  const glowSize = s * 0.08 + pulse * s * 0.04;
  ctx.fillStyle = `rgba(251, 191, 36, ${0.6 + pulse * 0.4})`;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.05, glowSize, 0, Math.PI * 2);
  ctx.fill();

  // "AI" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${s * 0.32}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI', cx, cy + s * 0.08);
}

function drawSolvingIcon(ctx, s, cx, cy, frame) {
  // Background
  drawRoundedRect(ctx, 0, 0, s, s, s * 0.22);
  ctx.fillStyle = COLORS.idle.bg;
  ctx.fill();

  // Spinning arc
  const startAngle = (frame * 0.12) % (Math.PI * 2);
  const sweepAngle = Math.PI * 1.2;

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.3, startAngle, startAngle + sweepAngle);
  ctx.stroke();

  // Second arc (trailing)
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.3, startAngle + sweepAngle + 0.3, startAngle + Math.PI * 2);
  ctx.stroke();

  // "AI" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${s * 0.3}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI', cx, cy);
}

function drawSolvedIcon(ctx, s, cx, cy) {
  // Green background
  drawRoundedRect(ctx, 0, 0, s, s, s * 0.22);
  ctx.fillStyle = COLORS.solved.bg;
  ctx.fill();

  // Big checkmark
  drawCheckmark(ctx, cx, cy, s * 0.3, '#ffffff', s * 0.1);
}

function drawFailedIcon(ctx, s, cx, cy) {
  // Red background
  drawRoundedRect(ctx, 0, 0, s, s, s * 0.22);
  ctx.fillStyle = COLORS.failed.bg;
  ctx.fill();

  // X mark
  const armLen = s * 0.22;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = s * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - armLen, cy - armLen);
  ctx.lineTo(cx + armLen, cy + armLen);
  ctx.moveTo(cx + armLen, cy - armLen);
  ctx.lineTo(cx - armLen, cy + armLen);
  ctx.stroke();
}

// --- Helpers ---

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCheckmark(ctx, cx, cy, size, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx - size * 0.3, cy + size * 0.7);
  ctx.lineTo(cx + size, cy - size * 0.5);
  ctx.stroke();
}

// Export
if (typeof globalThis !== 'undefined') {
  globalThis.setIconState = setIconState;
}
