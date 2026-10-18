import { useState } from "react";
import { copyResultCard, downloadResultCard } from "../utils/shareCard";
import "./ResultCard.css";

// Shareable result card.
//
// The visual on screen is a DOM preview of the same layout the canvas exporter
// draws (utils/shareCard.js), so what the user sees is what they share. Copy
// uses the async Clipboard image API where available and falls back to a plain
// text caption, so sharing works even in browsers without image clipboard
// support.
export default function ResultCard({ data, caption, onShared }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const flash = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus((cur) => (cur === message ? "" : cur)), 2200);
  };

  const handleDownload = () => {
    const ok = downloadResultCard(data, `${data.slug || "caratflix-result"}.png`);
    flash(ok ? "Image downloaded" : "Download failed");
    if (ok) onShared?.();
  };

  const handleCopyImage = async () => {
    setBusy(true);
    const ok = await copyResultCard(data);
    setBusy(false);
    flash(ok ? "Image copied" : "Image copy unavailable — try Download");
    if (ok) onShared?.();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(caption || `${data.big} — ${data.title}`);
      flash("Caption copied");
      onShared?.();
    } catch {
      flash("Copy unavailable");
    }
  };

  return (
    <div className="result-card">
      <div
        className="result-card-art"
        style={{ "--c1": data.c1 || "var(--rose)", "--c2": data.c2 || "var(--serenity)" }}
      >
        <span className="result-card-kicker">{(data.kicker || "caratflix").toUpperCase()}</span>
        <span className="result-card-emoji" aria-hidden="true">{data.emoji}</span>
        <span className="result-card-quiz">{data.title}</span>
        <span className="result-card-big">{data.big}</span>
        {data.subtitle && <span className="result-card-sub">{data.subtitle}</span>}
        {Array.isArray(data.lines) && data.lines.length > 0 && (
          <ul className="result-card-lines">
            {data.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <span className="result-card-footer">caratflix</span>
      </div>

      <div className="result-card-share">
        <button type="button" className="result-card-btn result-card-btn--primary" onClick={handleDownload}>
          <span aria-hidden="true">⤓</span> Download image
        </button>
        <button type="button" className="result-card-btn" onClick={handleCopyImage} disabled={busy}>
          <span aria-hidden="true">⧉</span> Copy image
        </button>
        <button type="button" className="result-card-btn" onClick={handleCopyText}>
          <span aria-hidden="true">⌘</span> Copy caption
        </button>
      </div>
      <p className="result-card-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
