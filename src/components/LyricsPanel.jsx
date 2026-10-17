import { useCallback, useEffect, useMemo, useRef } from "react";
import { prefersReducedMotion } from "../utils/format";
import { activeLineIndex } from "../data/LYRICS";
import { useStoredValue } from "../hooks/useStoredValue";
import "./LyricsPanel.css";

// Language toggles, in render order. `id` matches the line object's field name.
const LANGS = [
  { id: "ko", short: "KO", label: "Korean" },
  { id: "rom", short: "Rom", label: "Romanization" },
  { id: "en", short: "EN", label: "English" },
  { id: "fil", short: "FIL", label: "Filipino" },
];

// Korean + English read well as a default; the choice is remembered globally.
const LANGS_KEY = "caratflix-lyrics-langs";
const DEFAULT_LANGS = ["ko", "en"];

// Only the ids we know about, in canonical order, so a stale/edited stored value
// can never break rendering.
function normalize(list) {
  if (!Array.isArray(list)) return DEFAULT_LANGS;
  const kept = LANGS.filter((l) => list.includes(l.id)).map((l) => l.id);
  return kept.length ? kept : DEFAULT_LANGS;
}

const clock = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Synced lyrics for the player: highlights the current line, keeps it in view,
// and seeks when a line is clicked. Layout (beside the video on wide screens,
// collapsed underneath on mobile) is owned by VideoPlayer's `.video-player-layout`.
export function LyricsPanel({ lines, currentTime, onSeek }) {
  const [storedLangs, setStoredLangs] = useStoredValue(LANGS_KEY, DEFAULT_LANGS);
  const langs = useMemo(() => normalize(storedLangs), [storedLangs]);
  const shown = useMemo(() => LANGS.filter((l) => langs.includes(l.id)), [langs]);

  const listRef = useRef(null);
  const activeRef = useRef(null);
  const activeIndex = useMemo(() => activeLineIndex(lines, currentTime), [lines, currentTime]);

  const toggleLang = useCallback(
    (id) => {
      setStoredLangs((prev) => {
        const current = normalize(prev);
        // Keep at least one language on so the panel is never blank.
        if (current.includes(id)) {
          return current.length === 1 ? current : current.filter((x) => x !== id);
        }
        return LANGS.filter((l) => l.id === id || current.includes(l.id)).map((l) => l.id);
      });
    },
    [setStoredLangs]
  );

  // Keep the active line centred in the list. Scrolls only the list (not the
  // page/modal) and honours prefers-reduced-motion.
  useEffect(() => {
    const list = listRef.current;
    const el = activeRef.current;
    if (!list || !el) return;
    const top = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
    list.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [activeIndex, langs]);

  return (
    <section className="lyrics-panel" aria-label="Lyrics">
      <header className="lyrics-head">
        <span className="lyrics-title">Lyrics</span>
        <div className="lyrics-langs" role="group" aria-label="Lyrics languages">
          {LANGS.map((l) => {
            const on = langs.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                className={`lyrics-lang${on ? " lyrics-lang--on" : ""}`}
                aria-pressed={on}
                title={`${l.label} ${on ? "on" : "off"}`}
                onClick={() => toggleLang(l.id)}
              >
                {l.short}
              </button>
            );
          })}
        </div>
      </header>

      <div className="lyrics-list" ref={listRef}>
        {lines.map((line, i) => (
          <button
            key={i}
            type="button"
            ref={i === activeIndex ? activeRef : null}
            className={`lyrics-line${i === activeIndex ? " lyrics-line--active" : ""}`}
            aria-current={i === activeIndex ? "true" : undefined}
            onClick={() => onSeek(line.start)}
            title={`Seek to ${clock(line.start)}`}
          >
            {shown.map((l) =>
              line[l.id] ? (
                <span key={l.id} className={`lyrics-text lyrics-text--${l.id}`}>
                  {line[l.id]}
                </span>
              ) : null
            )}
          </button>
        ))}
      </div>

      <p className="lyrics-note">Sample lyrics · tap a line to jump</p>
    </section>
  );
}

export default LyricsPanel;
