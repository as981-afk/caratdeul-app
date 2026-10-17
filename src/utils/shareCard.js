// Renders a shareable quiz/achievement result card to a canvas so it can be
// downloaded as a PNG or copied to the clipboard. No external libraries — just
// the 2D canvas API — which keeps the share flow dependency-free.
//
// The card is drawn at a fixed 1080x1350 (portrait), the usual social-share
// aspect, and scales down cleanly for previews.

const CARD_W = 1080;
const CARD_H = 1350;

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Wraps text to fit `maxWidth`, returning the lines (never more than `maxLines`).
function wrapText(ctx, text, maxWidth, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

// Draws the card onto `canvas`. `data`:
//   { emoji, kicker, title, subtitle, big, lines: string[], c1, c2, footer }
export function drawResultCard(canvas, data) {
  const dpr = 1;
  canvas.width = CARD_W * dpr;
  canvas.height = CARD_H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const c1 = data.c1 || "#f2a9c1";
  const c2 = data.c2 || "#9fc3e8";

  // Background: deep obsidian with a soft diagonal brand gradient.
  ctx.fillStyle = "#0a0b12";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.globalAlpha = 1;

  // Inner panel.
  ctx.fillStyle = "rgba(10, 11, 18, 0.72)";
  roundRect(ctx, 60, 60, CARD_W - 120, CARD_H - 120, 48);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, 60, 60, CARD_W - 120, CARD_H - 120, 48);
  ctx.stroke();

  ctx.textAlign = "center";

  // Kicker ("CARATFLIX QUIZ").
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = '600 30px "Inter", system-ui, sans-serif';
  ctx.fillText(String(data.kicker || "CARATFLIX").toUpperCase(), CARD_W / 2, 170);

  // Emoji medallion.
  ctx.font = '120px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(data.emoji || "💎", CARD_W / 2, 330);

  // Title (quiz name).
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = '700 40px "Fraunces", Georgia, serif';
  ctx.fillText(data.title || "", CARD_W / 2, 415);

  // Big result headline, wrapped.
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 78px "Fraunces", Georgia, serif';
  const bigLines = wrapText(ctx, data.big || "", CARD_W - 240, 3);
  let y = 560;
  for (const line of bigLines) {
    ctx.fillText(line, CARD_W / 2, y);
    y += 92;
  }

  // Subtitle.
  if (data.subtitle) {
    ctx.fillStyle = c1;
    ctx.font = '600 38px "Inter", system-ui, sans-serif';
    ctx.fillText(data.subtitle, CARD_W / 2, y + 10);
    y += 70;
  }

  // Detail lines.
  if (Array.isArray(data.lines) && data.lines.length) {
    ctx.font = '400 34px "Inter", system-ui, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    y += 40;
    for (const line of data.lines.slice(0, 4)) {
      ctx.fillText(line, CARD_W / 2, y);
      y += 54;
    }
  }

  // Footer wordmark.
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = '700 30px "Inter", system-ui, sans-serif';
  ctx.fillText(String(data.footer || "caratflix"), CARD_W / 2, CARD_H - 120);

  return canvas;
}

function makeCanvas(data) {
  const canvas = document.createElement("canvas");
  return drawResultCard(canvas, data);
}

export function resultCardDataUrl(data) {
  try {
    return makeCanvas(data).toDataURL("image/png");
  } catch {
    return null;
  }
}

export function resultCardBlob(data) {
  return new Promise((resolve) => {
    try {
      makeCanvas(data).toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}

export function downloadResultCard(data, filename = "caratflix-result.png") {
  const url = resultCardDataUrl(data);
  if (!url) return false;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

// Copies the card to the clipboard as a PNG. Resolves false (rather than
// throwing) wherever the Clipboard API or image support is unavailable, so the
// caller can fall back to the download button.
export async function copyResultCard(data) {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    const blob = await resultCardBlob(data);
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
