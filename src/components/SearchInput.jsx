import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { MEMBERS } from "../data/MEMBERS";
import { normalize, MEMBER_ALIASES, QUICK_PICKS } from "../utils/searchMatch";
import "./SearchInput.css";

// The dropdown stays small: a handful of recent searches plus the member
// matches for what is being typed, never enough to bury the results below.
const MAX_RECENT = 5;
const MAX_MEMBERS = 3;

export function SearchInput({
  query,
  onQuery,
  pending = false,
  inputRef,
  history = [],
  onRecord,
  onClearHistory,
}) {
  const wrapRef = useRef(null);
  // Blocks Enter/Escape/arrow handling while an IME candidate window owns the
  // keystrokes, so committing a composition never clears the field or opens a
  // result behind the user's back.
  const composingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const groups = useMemo(() => {
    const qn = normalize(query.trim());
    const qc = qn.replace(/\s+/g, "");
    const match = (text) => text.includes(qn) || (qc.length >= 3 && text.replace(/\s+/g, "").includes(qc));
    const out = [];
    if (qn) {
      const recent = history.filter((t) => match(normalize(t))).slice(0, MAX_RECENT);
      if (recent.length) {
        out.push({ label: "Recent searches", clear: true, entries: recent.map((t) => ({ text: t, icon: "⌕" })) });
      }
      const members = MEMBERS.filter((m) => match(normalize(`${m.name} ${m.fullName} ${MEMBER_ALIASES[m.name] || ""}`)))
        .slice(0, MAX_MEMBERS);
      if (members.length) {
        out.push({ label: "Members", entries: members.map((m) => ({ text: m.name, icon: "♡" })) });
      }
    } else {
      if (history.length) {
        out.push({
          label: "Recent searches",
          clear: true,
          entries: history.slice(0, MAX_RECENT).map((t) => ({ text: t, icon: "⌕" })),
        });
      }
      out.push({ label: "Try", entries: QUICK_PICKS.map((t) => ({ text: t, icon: "★" })) });
    }
    return out;
  }, [query, history]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);
  const show = open && flat.length > 0;
  const activeId = show && active >= 0 ? `sug-${active}` : undefined;

  const applyTerm = useCallback(
    (term) => {
      onQuery(term);
      onRecord?.(term);
      setOpen(false);
      setActive(-1);
      inputRef?.current?.focus();
    },
    [onQuery, onRecord, inputRef]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (e.nativeEvent.isComposing || composingRef.current) {
        e.stopPropagation();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!show || !flat.length) return;
        e.preventDefault();
        e.stopPropagation();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i < 0 ? (step > 0 ? 0 : flat.length - 1) : (i + step + flat.length) % flat.length));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (show) {
          // The dropdown owns Enter while it is open: apply the highlighted
          // pick, otherwise commit the typed term.
          e.stopPropagation();
          setOpen(false);
          if (active >= 0 && flat[active]) applyTerm(flat[active].text);
          else onRecord?.(query.trim());
          setActive(-1);
          return;
        }
        onRecord?.(query.trim());
        // Not suppressed: the results list below can still open its
        // highlighted entry.
        return;
      }
      if (e.key === "Tab" && show) {
        const pick = flat[active >= 0 ? active : 0];
        if (pick) {
          e.preventDefault();
          applyTerm(pick.text);
        }
        return;
      }
      if (e.key === "Escape") {
        // Stop the global handlers from acting on a stale query: the cascade
        // is close suggestions → clear the field → leave it.
        e.stopPropagation();
        if (show) {
          setOpen(false);
          setActive(-1);
        } else if (query) {
          onQuery("");
          setActive(-1);
          setOpen(true);
        } else {
          setOpen(false);
          e.currentTarget.blur();
        }
      }
    },
    [show, flat, active, query, onQuery, onRecord, applyTerm]
  );

  // Close on clicks anywhere outside the field (mousedown on an option is
  // swallowed by its own handler so focus never leaves the input).
  useEffect(() => {
    if (!show) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [show]);

  const optionIndexes = [];
  groups.forEach((group) => {
    group.entries.forEach((entry) => optionIndexes.push({ group, entry }));
  });

  return (
    <form
      className={`search-wrap${pending ? " search-wrap--pending" : ""}`}
      role="search"
      ref={wrapRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (show && active >= 0 && flat[active]) applyTerm(flat[active].text);
        else {
          onRecord?.(query.trim());
          setOpen(false);
        }
      }}
    >
      <span className="search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search... ( / )"
        value={query}
        onChange={(e) => {
          onQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false);
        }}
        role="combobox"
        aria-label="Search SEVENTEEN content"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls="search-suggestions"
        aria-activedescendant={activeId}
        autoComplete="off"
      />
      {pending && <span className="search-pending" aria-hidden="true" />}
      <span className="sr-only" role="status">{pending ? "Searching" : ""}</span>
      {query && (
        <button
          type="button"
          className="search-clear"
          onClick={() => {
            onQuery("");
            setActive(-1);
            setOpen(true);
            inputRef?.current?.focus();
          }}
          aria-label="Clear search"
          title="Clear search (Esc)"
        >
          ✕
        </button>
      )}
      {show && (
        <div className="search-suggest" id="search-suggestions" role="listbox" aria-label="Search suggestions">
          {groups.map((group) => (
            <div className="search-suggest-group" key={group.label}>
              <div className="search-suggest-head">
                <span>{group.label}</span>
                {group.clear && (
                  <button type="button" className="search-suggest-clear" onClick={onClearHistory}>
                    Clear
                  </button>
                )}
              </div>
              {optionIndexes
                .filter((o) => o.group === group)
                .map((o) => {
                  const index = optionIndexes.indexOf(o);
                  return (
                    <div
                      key={o.entry.text}
                      id={`sug-${index}`}
                      className="search-suggest-item"
                      role="option"
                      aria-selected={index === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyTerm(o.entry.text)}
                    >
                      <span className="search-suggest-icon" aria-hidden="true">
                        {o.entry.icon}
                      </span>
                      <span className="search-suggest-text">{o.entry.text}</span>
                      <span className="search-suggest-go" aria-hidden="true">↵</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

export default memo(SearchInput);
