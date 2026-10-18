import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useTheme } from "../ThemeContext";
import { useProfiles } from "../context/ProfileContext.jsx";
import { MEMBERS } from "../data/MEMBERS";
import { ACCENTS } from "../data/AVATARS";
import { MEMBER_ALIASES } from "../utils/searchMatch";
import { memberId } from "../utils/memberMatch";
import { prefersReducedMotion } from "../utils/format";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";

// Focusable nodes inside the palette, used by the Tab trap. Same selector the
// shared Modal uses so the two dialogs behave identically.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Groups render in this fixed order; filtering + sorting happens *inside* each
// group so a search never shuffles the headings around the list.
const GROUP_ORDER = ["Navigate", "Members", "Actions", "Search"];

// Static entries of the Navigate group. `keywords` widen matching without
// polluting the visible label ("badge" still finds Achievements).
const NAV_COMMANDS = [
  { id: "home", label: "Home", icon: "⌂", view: "home" },
  { id: "members", label: "Members", icon: "★", view: "members" },
  { id: "eras", label: "Eras", icon: "◈", view: "eras" },
  { id: "choreography", label: "Choreography", icon: "✦", view: "choreography", keywords: ["dance", "practice", "fancam"] },
  { id: "browse", label: "All videos", icon: "☰", view: "browse", keywords: ["browse", "index", "every", "catalogue", "catalog"] },
  { id: "videos", label: "Latest videos", icon: "▶", view: "videos", keywords: ["youtube", "channel", "uploads", "newest", "rss", "feed"] },
  { id: "quizzes", label: "Quizzes", icon: "🧠", view: "quizzes" },
  { id: "goals", label: "Goals", icon: "🎯", view: "goals" },
  { id: "badges", label: "Achievements", icon: "🏅", view: "badges", keywords: ["badges", "badge"] },
  { id: "preferences", label: "Preferences", icon: "⚙", view: "preferences" },
  { id: "my-list", label: "My List", icon: "▤", view: "my-list", keywords: ["saved", "favorites"] },
];

// Marks the substring of `text` that the query matched, so the reason an entry
// is listed is visible at a glance.
function Highlight({ text, query }) {
  const needle = query.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="cmdk-mark">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

Highlight.propTypes = {
  text: PropTypes.string.isRequired,
  query: PropTypes.string,
};

// Command palette (Ctrl/Cmd+K): a filtered launcher for views, members and
// profile actions, plus a "search videos for …" fallback.
//
// The parent mounts it only while it is open (the same pattern VideoModal uses),
// so its whole lifetime is one open/close cycle: state starts fresh on open and
// the focus/scroll-lock effects clean themselves up on close.
//
// - Match: case-insensitive substring on the label (prefix matches sort first),
//   then on hidden keywords, then the trailing search entry.
// - Keyboard: Up/Down + Home/End move, Enter runs, Escape closes; the active
//   row is kept scrolled into view.
// - Accessibility: dialog + combobox + listbox/option with aria-activedescendant,
//   a Tab trap, focus returned to the previously focused element on close, and
//   the page scroll locked while open.
export function CommandPalette({ onClose, navigate, onLogout, onSearch }) {
  const { theme, accent, toggleTheme, setAccent } = useTheme();
  const { clearProfile } = useProfiles();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  // The full, unfiltered command set. Rebuilt when a handler or the current
  // theme/accent changes so the labels ("Toggle theme", "Current") stay honest.
  const commands = useMemo(() => {
    const items = [];

    for (const nav of NAV_COMMANDS) {
      items.push({
        id: `nav-${nav.id}`,
        group: "Navigate",
        label: nav.label,
        icon: nav.icon,
        keywords: nav.keywords,
        run: () => navigate(nav.view),
      });
    }

    for (const member of MEMBERS) {
      items.push({
        id: `member-${memberId(member)}`,
        group: "Members",
        label: member.name,
        icon: "♡",
        hint: member.unit,
        keywords: [member.fullName, member.position, member.unit, MEMBER_ALIASES[member.name]].filter(Boolean),
        run: () => navigate("member", memberId(member)),
      });
    }

    items.push({
      id: "action-theme",
      group: "Actions",
      label: "Toggle theme",
      icon: theme === "dark" ? "☀" : "☾",
      hint: theme === "dark" ? "Dark → Light" : "Light → Dark",
      keywords: ["dark", "light", "appearance"],
      run: () => toggleTheme(),
    });

    for (const option of ACCENTS) {
      items.push({
        id: `action-accent-${option.id}`,
        group: "Actions",
        label: `Accent: ${option.label}`,
        icon: "◐",
        hint: accent === option.id ? "Current" : undefined,
        keywords: ["color", "colour", "gradient", option.id],
        run: () => setAccent(option.id),
      });
    }

    items.push({
      id: "action-profile",
      group: "Actions",
      label: "Switch profile",
      icon: "⇄",
      keywords: ["account", "who is watching"],
      run: () => clearProfile(),
    });

    items.push({
      id: "action-logout",
      group: "Actions",
      label: "Log out",
      icon: "⤴",
      keywords: ["sign out", "exit"],
      run: () => onLogout?.(),
    });

    return items;
  }, [navigate, theme, toggleTheme, accent, setAccent, clearProfile, onLogout]);

  const trimmed = query.trim();

  // Command matches, ranked inside each fixed group.
  const commandResults = useMemo(() => {
    const needle = trimmed.toLowerCase();
    const buckets = new Map(GROUP_ORDER.map((group) => [group, []]));

    commands.forEach((cmd, index) => {
      const bucket = buckets.get(cmd.group);
      if (!bucket) return;
      if (!needle) {
        bucket.push({ cmd, rank: 0, index });
        return;
      }
      const label = cmd.label.toLowerCase();
      const at = label.indexOf(needle);
      let rank = -1;
      if (at === 0) rank = 0;
      else if (at > 0) rank = 1;
      else {
        const haystack = [label, ...(cmd.keywords || []).map((k) => k.toLowerCase())].join(" ");
        if (haystack.includes(needle)) rank = 2;
      }
      if (rank >= 0) bucket.push({ cmd, rank, index });
    });

    const out = [];
    for (const group of GROUP_ORDER) {
      const bucket = buckets.get(group);
      bucket.sort((a, b) => a.rank - b.rank || a.index - b.index);
      for (const entry of bucket) out.push(entry.cmd);
    }
    return out;
  }, [commands, trimmed]);

  // The trailing "search videos for …" row. It exists for any non-empty query,
  // so an unmatched query still has something useful to do.
  const options = useMemo(() => {
    if (!trimmed) return commandResults;
    return [
      ...commandResults,
      {
        id: "search-videos",
        group: "Search",
        label: `Search videos for "${trimmed}"`,
        icon: "⌕",
        run: () => onSearch?.(trimmed),
      },
    ];
  }, [commandResults, trimmed, onSearch]);

  // A query no command matched: the listbox then reports it (the search
  // fallback below stays available).
  const noCommandMatches = trimmed.length > 0 && commandResults.length === 0;

  // Group the (already ordered) options for rendering, carrying the flat index
  // each one needs for aria-activedescendant + the scroll-into-view lookup.
  const groups = useMemo(() => {
    const out = [];
    let index = 0;
    for (const cmd of options) {
      const item = { cmd, index };
      index += 1;
      const last = out[out.length - 1];
      if (last && last.label === cmd.group) last.items.push(item);
      else out.push({ label: cmd.group, items: [item] });
    }
    return out;
  }, [options]);

  // Clamped during render (rather than mirrored into state by an effect) so a
  // shrinking list can never point at a row that no longer exists.
  const activeIndex = options.length === 0 ? 0 : Math.min(active, options.length - 1);

  const runCommand = useCallback(
    (cmd) => {
      if (!cmd) return;
      onClose();
      cmd.run();
    },
    [onClose]
  );

  // Move focus into the field, and hand it back to whatever had it before on
  // close. Runs once per open because the parent unmounts the palette on close.
  useEffect(() => {
    const previous = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (previous && document.contains(previous) && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  // Lock the page behind the palette (ref-counted, so it plays nice with any
  // modal that already holds a lock).
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  // Escape / Tab / arrow / Enter. Registered in the capture phase so Escape can
  // stop propagation before the navbar's own window-level Escape handler runs.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // Only real tab stops (options sit at tabindex="-1"; the input + close
        // button are the entire dialog's tab order).
        const nodes = panelRef.current
          ? Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
              (n) => n.tabIndex >= 0 && (n.offsetParent !== null || n === document.activeElement)
            )
          : [];
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (options.length === 0) return;
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((activeIndex + step + options.length) % options.length);
        return;
      }
      if (e.key === "Home" || e.key === "End") {
        if (options.length === 0) return;
        e.preventDefault();
        setActive(e.key === "Home" ? 0 : options.length - 1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        runCommand(options[activeIndex]);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose, options, activeIndex, runCommand]);

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmdk-index="${activeIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [activeIndex, options]);

  const activeId = options.length > 0 ? `cmdk-option-${activeIndex}` : undefined;

  return createPortal(
    <div
      className="cmdk-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" ref={panelRef}>
        <div className="cmdk-head">
          <span className="cmdk-search-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            value={query}
            placeholder="Type a command or search videos…"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            role="combobox"
            aria-label="Command or search"
            aria-autocomplete="list"
            aria-expanded={options.length > 0}
            aria-controls="cmdk-listbox"
            aria-activedescendant={activeId}
            autoComplete="off"
            spellCheck="false"
          />
          <button type="button" className="cmdk-close" onClick={onClose} aria-label="Close command palette">
            ✕
          </button>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {/* Report an unmatched *command* query; the Search group below is the
              fallback, so the note never leaves the user stuck. */}
          {noCommandMatches && <div className="cmdk-empty" role="status">No results</div>}
          <div id="cmdk-listbox" role="listbox" aria-label="Commands">
            {groups.map((group) => (
              <div className="cmdk-group" key={group.label} role="group" aria-label={group.label}>
                <div className="cmdk-group-title" aria-hidden="true">{group.label}</div>
                {group.items.map(({ cmd, index }) => (
                  <button
                    key={cmd.id}
                    id={`cmdk-option-${index}`}
                    data-cmdk-index={index}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === activeIndex}
                    className={`cmdk-option${index === activeIndex ? " cmdk-option--active" : ""}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => runCommand(cmd)}
                  >
                    <span className="cmdk-option-icon" aria-hidden="true">{cmd.icon}</span>
                    <span className="cmdk-option-label">
                      <Highlight text={cmd.label} query={query} />
                    </span>
                    {cmd.hint && <span className="cmdk-option-hint">{cmd.hint}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="cmdk-foot">
          <span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> navigate</span>
          <span><kbd className="cmdk-kbd">Enter</kbd> select</span>
          <span><kbd className="cmdk-kbd">Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

CommandPalette.propTypes = {
  onClose: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired,
  onLogout: PropTypes.func,
  onSearch: PropTypes.func,
};

export default CommandPalette;
