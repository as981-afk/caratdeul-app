import { memo, useState } from "react";
import Modal from "./Modal";
import SafeImg from "./SafeImg";
import { GROUP_PHOTO_SRC } from "../data/GALLERY";
import "./Hero.css";

function InfoModal({ onClose }) {
  return (
    <Modal label="SEVENTEEN official links" onClose={onClose} className="info-modal">
      <h2 className="info-modal-title">SEVENTEEN</h2>
        <p className="info-modal-sub">Official Links</p>
        <div className="info-links">
          <a className="info-link" href="http://www.seventeen-17.com" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official Homepage</span>
            <span className="info-link-url">seventeen-17.com</span>
          </a>
          <a className="info-link" href="https://www.youtube.com/@pledis17" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official YouTube</span>
            <span className="info-link-url">/ @pledis17</span>
          </a>
          <a className="info-link" href="https://x.com/pledis_17" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official X (Twitter)</span>
            <span className="info-link-url">/ pledis_17</span>
          </a>
          <a className="info-link" href="https://www.instagram.com/saythename_17" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official Instagram</span>
            <span className="info-link-url">/ saythename_17</span>
          </a>
          <a className="info-link" href="https://www.facebook.com/seventeennews" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official Facebook</span>
            <span className="info-link-url">seventeennews</span>
          </a>
          <a className="info-link" href="https://www.tiktok.com/@seventeen17_official" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official TikTok</span>
            <span className="info-link-url">/ seventeen17_official</span>
          </a>
          <a className="info-link" href="https://www.weverse.io/seventeen" target="_blank" rel="noopener noreferrer">
            <span className="info-link-label">Official Weverse</span>
            <span className="info-link-url">weverse.io/seventeen</span>
          </a>
        </div>
    </Modal>
  );
}

export function Hero() {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div className="billboard">
      <SafeImg className="billboard-photo" src={GROUP_PHOTO_SRC} alt="SEVENTEEN group" loading="eager" fetchPriority="high" width={1920} height={1080} />
      <div className="billboard-bg">
        <div className="billboard-gradient-left"></div>
        <div className="billboard-gradient-bottom"></div>
        <div className="billboard-gradient-right"></div>
        <div className="billboard-vignette"></div>
      </div>
      <div className="billboard-content">
        <div className="billboard-tags">
          <span className="billboard-tag billboard-tag--new">N Series</span>
          <span className="billboard-tag">SEVENTEEN</span>
        </div>
        <h1 className="billboard-title">
          <span className="billboard-title-top">GOING SEVENTEEN</span>
          <span className="billboard-title-sub">13 Wishes</span>
        </h1>
        <p className="billboard-desc">
          Thirteen members, one stage. Follow SEVENTEEN through unscripted games,
          late-night talks, and the moments that made Carats fall for them all
          over again.
        </p>
        <div className="billboard-meta">
          <span className="billboard-maturity">TV-PG</span>
        </div>
        <div className="billboard-actions">
          <button className="billboard-btn billboard-btn-play">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M6 4l15 8-15 8V4z" />
            </svg>
            Play
          </button>
          <button className="billboard-btn billboard-btn-info" onClick={() => setShowInfo(true)}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="8" r="1" fill="currentColor"/>
            </svg>
            More Info
          </button>
        </div>
      </div>
      <div className="billboard-fade-top"></div>
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}

export default memo(Hero);
