import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LazyYouTube from "./LazyYouTube";
import LyricsPanel from "./LyricsPanel";
import VideoEngagement from "./VideoEngagement";
import { getLyrics } from "../data/LYRICS";
import { CW_NOMINAL_SECONDS } from "../utils/watchHistory";
import "./VideoPlayer.css";

// Keyboard-first player wrapped around the lazy YouTube iframe.
//
// The demo has no real watch time to read back, so position is a 0–100 value
// that advances ~2%/s while playing, mirroring the nominal resume timeline used
// by Continue Watching. The parent owns persistence and is told about progress
// through onStart / onTick / onSave / onFinish:
//   onStart(pct)  once, when the player opens (also seeds Recently Watched)
//   onTick(pct)   every second — cheap ref update, no storage write
//   onSave(pct)   at most every 5s, on finish, and on unmount
//   onFinish()    once, when the clip reaches 100%
const TICK_PERCENT = 2; // ~2% of the clip per second (a full pass is ~50s)
const SAVE_INTERVAL_MS = 5000;
const SEEK_SECONDS = 5;
const VOLUME_STEP = 5;
const OSD_MS = 900;

const SHORTCUTS = [
  { keys: ["Space"], label: "Play / pause" },
  { keys: ["←", "→"], label: "Seek 5 seconds" },
  { keys: ["↑", "↓"], label: "Volume up / down" },
  { keys: ["M"], label: "Mute / unmute" },
  { keys: ["F"], label: "Full screen" },
  { keys: ["?"], label: "Show / hide this help" },
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const secondsFor = (pct) => Math.round((clamp(pct, 0, 100) / 100) * CW_NOMINAL_SECONDS);
const percentFor = (seconds) => clamp((Math.max(0, seconds) / CW_NOMINAL_SECONDS) * 100, 0, 100);

// Choreography controls: the learning speeds, and the steps the speed radio
// group walks with the arrow keys.
const SPEEDS = [0.5, 0.75, 1];
const speedId = (value) => `vp-speed-${String(value).replace(".", "-")}`;

// Nested controls must keep the browser's own Space activation (the global
// player shortcuts would otherwise swallow it and toggle playback instead).
function keepSpace(e) {
  if (e.key === " " || e.key === "Spacebar") e.stopPropagation();
}

// Shortcuts must never fire while the user is typing.
function isTypingTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

// Best-effort control of the embedded player via YouTube's iframe postMessage
// API (`enablejsapi=1`). It is cross-origin, so failures are expected + ignored.
function command(iframe, func, args = []) {
  const win = iframe?.contentWindow;
  if (!win) return;
  try {
    win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  } catch {
    /* iframe not ready */
  }
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}
function VolumeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z" />
    </svg>
  );
}
function MuteGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4zm11.6 1.1L17 11.5l1.4-1.4 1.1 1.1L18.1 12.6 19.5 14l-1.1 1.1L17 13.7l-1.4 1.4-1.1-1.1 1.4-1.4-1.4-1.4 1.1-1.1z" />
    </svg>
  );
}
function FullscreenGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z" />
    </svg>
  );
}

// "?" overlay listing the shortcuts. Sits inside the modal, over the video.
function ShortcutsHelp({ onClose }) {
  return (
    <div className="video-player-help" onClick={onClose}>
      <div
        className="video-player-help-panel"
        role="dialog"
        aria-label="Player keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="video-player-help-head">
          <span>Keyboard shortcuts</span>
          <button type="button" className="video-player-help-close" onClick={onClose} aria-label="Close shortcuts">
            ✕
          </button>
        </div>
        <ul className="video-player-help-list">
          {SHORTCUTS.map((s) => (
            <li key={s.label}>
              <span className="video-player-help-keys">
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
              <span className="video-player-help-label">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function VideoPlayer({
  videoId,
  title,
  thumb,
  autoplay,
  startTime = 0,
  choreography = false,
  onStart,
  onTick,
  onSave,
  onFinish,
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const progressRef = useRef(0);
  const playingRef = useRef(true);
  const startedRef = useRef(false);
  const volumeRef = useRef(100);
  const mutedRef = useRef(false);
  const helpOpenRef = useRef(false);
  const lastSaveRef = useRef(0);
  const finishedRef = useRef(false);
  const osdTimerRef = useRef(null);
  // Choreography helpers. The clock reads these through refs so changing the
  // rate or the loop never restarts the playback timer.
  const rateRef = useRef(1);
  const loopRef = useRef({ a: null, b: null, active: false });

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [progress, setProgress] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [osd, setOsd] = useState(null);
  const [rate, setRate] = useState(1);
  const [mirrored, setMirrored] = useState(false);
  const [loop, setLoop] = useState({ a: null, b: null, active: false });

  // Latest callbacks without restarting the timer.
  const cbRef = useRef({ onStart, onTick, onSave, onFinish });
  useEffect(() => {
    cbRef.current = { onStart, onTick, onSave, onFinish };
  });

  const flash = useCallback((message) => {
    setOsd(message);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => setOsd(null), OSD_MS);
  }, []);

  const applyProgress = useCallback((next) => {
    progressRef.current = clamp(next, 0, 100);
    setProgress(progressRef.current);
    return progressRef.current;
  }, []);

  // Seed the resume position and run the simulated playback clock. Mount-only:
  // the starting point is fixed per opened video, and callbacks are read through
  // cbRef so a parent re-render never restarts the timer.
  useEffect(() => {
    applyProgress(percentFor(startTime));
    cbRef.current.onStart?.(progressRef.current);
    lastSaveRef.current = Date.now();
    const id = setInterval(() => {
      if (!startedRef.current || !playingRef.current || finishedRef.current) return;
      // Playback rate scales the simulated clock so the progress bar, resume
      // point and loop all stay in step with the slowed-down video.
      let next = applyProgress(progressRef.current + TICK_PERCENT * rateRef.current);
      const { a, b, active } = loopRef.current;
      if (active && b != null && next >= b) {
        next = applyProgress(a ?? 0);
        command(iframeRef.current, "seekTo", [secondsFor(next), true]);
      }
      cbRef.current.onTick?.(next);
      const finished = next >= 100;
      if (finished || Date.now() - lastSaveRef.current >= SAVE_INTERVAL_MS) {
        lastSaveRef.current = Date.now();
        cbRef.current.onSave?.(next);
        if (finished) {
          finishedRef.current = true;
          cbRef.current.onFinish?.();
        }
      }
    }, 1000);
    return () => {
      clearInterval(id);
      if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
      // Persist whatever position was reached when the modal goes away.
      cbRef.current.onSave?.(progressRef.current);
    };
  }, [applyProgress, startTime]);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    playingRef.current = true;
    setStarted(true);
    setPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!startedRef.current) {
      start();
      flash("Playing");
      return;
    }
    const next = !playingRef.current;
    playingRef.current = next;
    setPlaying(next);
    command(iframeRef.current, next ? "playVideo" : "pauseVideo");
    flash(next ? "Playing" : "Paused");
  }, [start, flash]);

  const toggleMute = useCallback(() => {
    if (!startedRef.current) start();
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    command(iframeRef.current, next ? "mute" : "unMute");
    if (!next) command(iframeRef.current, "setVolume", [volumeRef.current]);
    flash(next ? "Muted" : "Unmuted");
  }, [start, flash]);

  const changeVolume = useCallback(
    (delta) => {
      const next = clamp(volumeRef.current + delta, 0, 100);
      volumeRef.current = next;
      setVolume(next);
      const nowMuted = next === 0;
      mutedRef.current = nowMuted;
      setMuted(nowMuted);
      command(iframeRef.current, nowMuted ? "mute" : "unMute");
      command(iframeRef.current, "setVolume", [next]);
      flash(`Volume ${next}%`);
    },
    [flash]
  );

  const seekTo = useCallback(
    (next) => {
      const pct = applyProgress(next);
      if (startedRef.current) command(iframeRef.current, "seekTo", [secondsFor(pct), true]);
      return pct;
    },
    [applyProgress]
  );

  const seekBy = useCallback(
    (seconds) => {
      seekTo(progressRef.current + (seconds / CW_NOMINAL_SECONDS) * 100);
      flash(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    },
    [seekTo, flash]
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        /* fullscreen blocked (e.g. iframe sandbox) */
      });
    }
    flash("Full screen");
  }, [flash]);

  const toggleHelp = useCallback(() => {
    setHelpOpen((open) => {
      helpOpenRef.current = !open;
      return !open;
    });
  }, []);

  // --- Choreography controls ---------------------------------------------------
  // Playback speed is pushed to the embed (when the iframe accepts it) and into
  // the simulated clock, so progress and resume timing match what is on screen.
  const changeRate = useCallback(
    (next) => {
      rateRef.current = next;
      setRate(next);
      command(iframeRef.current, "setPlaybackRate", [next]);
      flash(`Speed ${next}x`);
    },
    [flash]
  );

  const toggleMirror = useCallback(() => {
    // CSS-only flip of the picture (see .video-player-media--mirrored); the
    // embed itself is untouched.
    const next = !mirrored;
    setMirrored(next);
    flash(next ? "Mirrored" : "Mirror off");
  }, [mirrored, flash]);

  // A / B points are taken from the current position. Setting a point past its
  // partner clears the partner, so A always precedes B.
  const markLoopPoint = useCallback(
    (point) => {
      const value = Math.round(progressRef.current);
      const next = { ...loopRef.current, [point]: value };
      if (point === "a" && next.b != null && value >= next.b) next.b = null;
      if (point === "b" && next.a != null && value <= next.a) next.a = null;
      next.active = next.a != null && next.b != null && next.a < next.b;
      loopRef.current = next;
      setLoop(next);
      flash(point === "a" ? `A point ${value}%` : `B point ${value}%`);
    },
    [flash]
  );

  const toggleLoop = useCallback(() => {
    const prev = loopRef.current;
    if (prev.a == null || prev.b == null || prev.a >= prev.b) return;
    const next = { ...prev, active: !prev.active };
    loopRef.current = next;
    setLoop(next);
    flash(next.active ? `Looping A–B (${next.a}–${next.b}%)` : "Loop off");
  }, [flash]);

  const clearLoop = useCallback(() => {
    const next = { a: null, b: null, active: false };
    loopRef.current = next;
    setLoop(next);
    flash("A–B cleared");
  }, [flash]);

  // Global shortcuts. Ignored while typing, and while a modifier is held so
  // browser/OS combos keep working. Escape closes the help overlay first (the
  // capture listener runs before the modal's own Escape-to-close).
  useEffect(() => {
    const onKeyCapture = (e) => {
      if (e.key === "Escape" && helpOpenRef.current) {
        e.stopImmediatePropagation();
        e.preventDefault();
        helpOpenRef.current = false;
        setHelpOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;
      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-SEEK_SECONDS);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(SEEK_SECONDS);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(VOLUME_STEP);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-VOLUME_STEP);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "?":
          toggleHelp();
          break;
        default:
          break;
      }
    };
    document.addEventListener("keydown", onKeyCapture, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKeyCapture, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [togglePlay, seekBy, changeVolume, toggleFullscreen, toggleMute, toggleHelp]);

  const scrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    seekTo(((e.clientX - rect.left) / rect.width) * 100);
  };

  // Synced lyrics (when this video has any): the panel reads the live position
  // off the simulated clock and seeks back through the same seekTo path.
  const lyrics = useMemo(() => getLyrics(videoId), [videoId]);
  const currentSeconds = (progress / 100) * CW_NOMINAL_SECONDS;
  const seekToSeconds = useCallback(
    (seconds) => {
      if (!startedRef.current) start();
      seekTo(percentFor(seconds));
    },
    [start, seekTo]
  );

  return (
    <>
    <div className={`video-player-layout${lyrics ? " video-player-layout--split" : ""}`}>
      <div className="video-player" ref={containerRef}>
        <div className={`video-player-media${mirrored && choreography ? " video-player-media--mirrored" : ""}`}>
          <LazyYouTube
            videoId={videoId}
            title={title}
            thumb={thumb}
            autoplay={autoplay}
            start={startTime}
            started={started}
            onStart={start}
            iframeRef={iframeRef}
          />
        </div>

        <button
          type="button"
          className="video-player-help-fab"
          onClick={toggleHelp}
          aria-label="Keyboard shortcuts"
          aria-expanded={helpOpen}
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>

        {started && (
          <div className="video-player-controls">
            <button type="button" className="video-player-scrub" onClick={scrub} aria-label={`Seek (${Math.round(progress)}%)`}>
              <span className="video-player-scrub-track">
                {choreography && loop.a != null && loop.b != null && loop.a < loop.b && (
                  <span
                    className={`video-player-scrub-ab${loop.active ? " video-player-scrub-ab--on" : ""}`}
                    style={{ left: `${loop.a}%`, width: `${loop.b - loop.a}%` }}
                  />
                )}
                <span className="video-player-scrub-fill" style={{ width: `${progress}%` }} />
              </span>
            </button>
            <div className="video-player-buttons">
              <button
                type="button"
                className="video-player-btn"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause (Space)" : "Play (Space)"}
              >
                {playing ? <PauseGlyph /> : <PlayGlyph />}
              </button>
              <button
                type="button"
                className="video-player-btn"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? "Unmute" : "Mute"}
                title={muted ? "Unmute (M)" : "Mute (M)"}
              >
                {muted ? <MuteGlyph /> : <VolumeGlyph />}
              </button>
              <span className="video-player-volume">{volume}%</span>
              <span className="video-player-spacer" />
              <button
                type="button"
                className="video-player-btn"
                onClick={toggleFullscreen}
                aria-label="Full screen"
                title="Full screen (F)"
              >
                <FullscreenGlyph />
              </button>
            </div>

            {/* Choreography-only extras: learning speeds, a mirror flip and an
                A–B loop. They only exist for choreography clips, so the other
                videos keep the plain player. */}
            {choreography && (
              <div className="video-player-choreo">
                <div className="video-player-speed" role="radiogroup" aria-label="Playback speed">
                  {SPEEDS.map((value, i) => (
                    <button
                      key={value}
                      id={speedId(value)}
                      type="button"
                      role="radio"
                      aria-checked={rate === value}
                      tabIndex={rate === value ? 0 : -1}
                      className={`video-player-opt${rate === value ? " video-player-opt--on" : ""}`}
                      onClick={() => changeRate(value)}
                      onKeyDown={(e) => {
                        keepSpace(e);
                        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                        e.preventDefault();
                        // The arrows belong to this radio group, not to the
                        // player's global seek shortcut.
                        e.stopPropagation();
                        const step = e.key === "ArrowRight" ? 1 : -1;
                        const next = SPEEDS[(i + step + SPEEDS.length) % SPEEDS.length];
                        changeRate(next);
                        document.getElementById(speedId(next))?.focus();
                      }}
                      title={`Play at ${value}x speed`}
                    >
                      {value}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={`video-player-opt${mirrored ? " video-player-opt--on" : ""}`}
                  aria-pressed={mirrored}
                  onClick={toggleMirror}
                  onKeyDown={keepSpace}
                  title="Mirror the video to learn the moves"
                >
                  ⇄ Mirror
                </button>

                <button
                  type="button"
                  className="video-player-opt"
                  onClick={() => markLoopPoint("a")}
                  onKeyDown={keepSpace}
                  title="Mark the loop start at the current position"
                >
                  Set A
                </button>
                <button
                  type="button"
                  className="video-player-opt"
                  onClick={() => markLoopPoint("b")}
                  onKeyDown={keepSpace}
                  title="Mark the loop end at the current position"
                >
                  Set B
                </button>
                <button
                  type="button"
                  className={`video-player-opt${loop.active ? " video-player-opt--on" : ""}`}
                  aria-pressed={loop.active}
                  disabled={loop.a == null || loop.b == null || loop.a >= loop.b}
                  onClick={toggleLoop}
                  onKeyDown={keepSpace}
                  title="Loop the A–B section"
                >
                  ⤾ Loop
                </button>
                <span className="video-player-ab" role="status" aria-live="polite">
                  {loop.a != null || loop.b != null
                    ? `A ${loop.a ?? "–"}% · B ${loop.b ?? "–"}%`
                    : "A–B not set"}
                </span>
                {(loop.a != null || loop.b != null) && (
                  <button
                    type="button"
                    className="video-player-opt"
                    onClick={clearLoop}
                    onKeyDown={keepSpace}
                    title="Clear the A and B points"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {osd && (
          <div className="video-player-osd" role="status" aria-live="polite">
            {osd}
          </div>
        )}

        {helpOpen && <ShortcutsHelp onClose={toggleHelp} />}
      </div>

      {lyrics && <LyricsPanel lines={lyrics} currentTime={currentSeconds} onSeek={seekToSeconds} />}
    </div>
    <VideoEngagement key={videoId} videoId={videoId} currentTime={currentSeconds} onSeek={seekToSeconds} />
    </>
  );
}

export default VideoPlayer;
