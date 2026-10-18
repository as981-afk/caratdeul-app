import { useState, useEffect, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useTheme } from "../ThemeContext";
import { useSession } from "../context/SessionContext.jsx";
import { useProfiles } from "../context/ProfileContext.jsx";
import { scrollToId, prefersReducedMotion } from "../utils/format";
import { downloadUserData, importUserDataFromFile } from "../utils/dataPort";
import { pickRandomVideo } from "../utils/surprise";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { SECTION_IDS, SECTION_LABELS } from "../data/SECTION_IDS";
import AvatarCircle from "./AvatarCircle";
import AvatarPickerModal from "./AvatarPickerModal";
import ProfileModal from "./ProfileModal";
import ProfileViewModal from "./ProfileViewModal";
import VideoModal from "./VideoModal";
import SearchInput from "./SearchInput";
import "./Navbar.css";

// Lightweight auto-dismissing success toast. Rendered in a portal so it is not
// trapped by the navbar's backdrop-filter containing block.
function Toast({ message, onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return createPortal(
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-check" aria-hidden="true">✓</span>
      <span>{message}</span>
    </div>,
    document.body
  );
}

// Sections hidden from the header nav row. They stay tracked by scroll-spy
// and reachable from the profile dropdown — just not shown as header links.
const HEADER_HIDDEN = new Set(["continue-watching", "recently-watched"]);

// The "Browse" dropdown lists the home-page content rows. It is derived from
// SECTION_IDS so the labels stay single-sourced; Members ("my-bias") and My List
// are promoted to their own top-level entries, so they are filtered out here.
const BROWSE_IDS = SECTION_IDS.filter(
  (id) => !HEADER_HIDDEN.has(id) && id !== "my-bias" && id !== "my-list"
);

// Drawer icon per section/view id (inline SVG — no icon dependency).
const DRAWER_ICON_BY_ID = {
  "nana-tour": "tv",
  "going-seventeen": "play",
  concerts: "music",
  "side-tracks": "headphones",
  mvs: "film",
  eras: "history",
  choreography: "dance",
  browse: "collection",
  videos: "tv",
  quizzes: "quiz",
  goals: "target",
  badges: "award",
};

// Small stroke icons used by the mobile drawer. Every one is decorative — the
// adjacent label carries the meaning — so the svg is aria-hidden.
function DrawerIcon({ name }) {
  let body = <circle cx="12" cy="12" r="8" />;
  switch (name) {
    case "home":
      body = (
        <>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.6V20h13V9.6" />
        </>
      );
      break;
    case "tv":
      body = (
        <>
          <rect x="2.5" y="7" width="19" height="13" rx="2" />
          <path d="m8 3 4 4 4-4" />
        </>
      );
      break;
    case "play":
      body = (
        <>
          <rect x="2.5" y="5" width="19" height="15" rx="2" />
          <path d="m10 9 5 3-5 3z" />
        </>
      );
      break;
    case "music":
      body = (
        <>
          <path d="M9 18V6l10-2v12" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="16.5" cy="16" r="2.5" />
        </>
      );
      break;
    case "headphones":
      body = (
        <>
          <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
          <path d="M4 13h3v7H5a1 1 0 0 1-1-1z" />
          <path d="M20 13h-3v7h2a1 1 0 0 0 1-1z" />
        </>
      );
      break;
    case "film":
      body = (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
        </>
      );
      break;
    case "dance":
      // Choreography: a stick figure mid-step.
      body = (
        <>
          <circle cx="13" cy="4.6" r="2.1" />
          <path d="M13 7v6" />
          <path d="M13 9.5 7 11" />
          <path d="m13 9.5 6 1.5" />
          <path d="m13 13-3.5 7" />
          <path d="m13 13 4 7" />
        </>
      );
      break;
    case "collection":
      // The whole catalogue: stacked shelves.
      body = (
        <>
          <rect x="3" y="4" width="18" height="4" rx="1.4" />
          <rect x="3" y="10" width="18" height="4" rx="1.4" />
          <rect x="3" y="16" width="18" height="4" rx="1.4" />
        </>
      );
      break;
    case "users":
      body = (
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.3a3.2 3.2 0 0 1 0 6" />
          <path d="M17.5 20a5.5 5.5 0 0 0-2.1-4.3" />
        </>
      );
      break;
    case "bookmark":
      body = <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />;
      break;
    case "history":
      body = (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v5h5" />
          <path d="M12 8v4l3 2" />
        </>
      );
      break;
    case "quiz":
      body = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.4a2.6 2.6 0 1 1 3.7 2.4c-.7.35-1.1.9-1.1 1.8" />
          <path d="M12 17h.01" />
        </>
      );
      break;
    case "target":
      body = (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.6" fill="currentColor" />
        </>
      );
      break;
    case "award":
      body = (
        <>
          <circle cx="12" cy="9" r="5" />
          <path d="m8.6 13.4-1.6 7 5-2.6 5 2.6-1.6-7" />
        </>
      );
      break;
    case "clock":
      body = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
      break;
    case "surprise":
      body = (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
          <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
        </>
      );
      break;
    case "sun":
      body = (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
        </>
      );
      break;
    case "moon":
      body = <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />;
      break;
    case "logout":
      body = (
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </>
      );
      break;
    default:
      body = <circle cx="12" cy="12" r="8" />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}

export function Navbar({ query, onQuery, user, onLogout, activeSection, stats, onWatchEnd, searchPending, view, onOpenMembers, onOpenEras, onOpenChoreography, onOpenBrowse, onOpenVideos, onOpenPreferences, onOpenQuizzes, onOpenGoals, onOpenBadges, onLeaveView, onOpenCommandPalette }) {
  const { theme, toggleTheme } = useTheme();
  const { favs, avatar, profile, profileId } = useSession();
  const { clearProfile, updateProfile } = useProfiles();
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const profileToggleRef = useRef(null);
  const importRef = useRef(null);
  const burgerRef = useRef(null);
  const drawerRef = useRef(null);
  // Touch swipe-to-close state for the drawer (right-only).
  const touchStartX = useRef(null);
  const dragXRef = useRef(0);
  // Set right before expanding the collapsed search so the freshly mounted input
  // can grab focus (the field does not exist until then).
  const focusSearchRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // True once "Sign Out" has been pressed once — the second press commits.
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Live drag offset while swiping the drawer closed (touch only).
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Collapsed search: renders an icon button until expanded (click or "/").
  const [searchOpen, setSearchOpen] = useState(false);
  // The field also stays open whenever there is a query (deep link / restore),
  // so this is derived rather than mirrored into state by an effect.
  const showSearch = searchOpen || Boolean(query);
  // null | "view" | "edit" — "view" is the read-only display, "edit" the form.
  const [profileModal, setProfileModal] = useState(null);
  // Gallery photo picker (rendered as a sibling on top of the profile view/edit).
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // Random pick from "Surprise me", rendered in a modal below.
  const [surprise, setSurprise] = useState(null);
  const { history: searchHistory, record: recordSearch, clear: clearSearchHistory } = useSearchHistory(profileId);

  // Top-level nav model. Browse groups the home-page rows (active whenever one
  // of them is the scroll-spy target); Members / My List are direct links;
  // Explore gathers the secondary views. Actions clear the search / leave the
  // current view the same way the old flat links did.
  const browseItems = BROWSE_IDS.map((id) => ({
    id,
    label: SECTION_LABELS[id] || id,
    current: activeSection === id,
    action: () => goTo(id),
  }));
  const exploreItems = [
    onOpenBrowse && { id: "browse", label: "All videos", current: view === "browse", action: onOpenBrowse },
    onOpenVideos && {
      id: "videos",
      label: "Latest videos",
      current: view === "videos",
      action: onOpenVideos,
    },
    onOpenEras && { id: "eras", label: "Eras", current: view === "eras", action: onOpenEras },
    onOpenChoreography && {
      id: "choreography",
      label: "Choreography",
      current: view === "choreography",
      action: onOpenChoreography,
    },
    onOpenQuizzes && { id: "quizzes", label: "Quizzes", current: view === "quizzes", action: onOpenQuizzes },
    onOpenGoals && { id: "goals", label: "Goals", current: view === "goals", action: onOpenGoals },
    onOpenBadges && { id: "badges", label: "Achievements", current: view === "badges", action: onOpenBadges },
  ].filter(Boolean);
  const homeActive = activeSection === null && !view;
  const membersActive = view === "members" || view === "member";
  const myListActive = activeSection === "my-list";
  const continuesActive = activeSection === "continue-watching";
  const recentlyActive = activeSection === "recently-watched";

  // Closes the dropdown and hands focus back to its toggle, so keyboard users
  // are never dropped on <body> after picking a menu entry.
  const dismissMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirmSignOut(false);
    profileToggleRef.current?.focus();
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDragging(false);
    dragXRef.current = 0;
    touchStartX.current = null;
    setDragX(0);
    burgerRef.current?.focus();
  }, []);

  // Scrolls to a section, leaving room for the sticky navbar. Mirrors
  // scrollToIdWhenReady's wait-for-lazy-rows loop, then lands the section just
  // below the bar so its heading is never hidden underneath it.
  const scrollToSection = useCallback((id) => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    const jump = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      const bar = document.querySelector(".navbar");
      const offset = (bar?.offsetHeight || 0) + 12;
      window.scrollTo({
        top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset),
        behavior,
      });
      return true;
    };
    if (id == null) {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    let attempts = 0;
    const attempt = () => {
      if (jump()) {
        if (attempts > 0) window.setTimeout(jump, 280);
        return;
      }
      attempts += 1;
      if (attempts > 120) return;
      window.requestAnimationFrame(attempt);
    };
    attempt();
  }, []);

  // Chooses a drawer / nav entry: close the drawer, then scroll to the section
  // (the rows may still be mounting behind a lazy boundary, hence the polling).
  const goTo = useCallback(
    (id) => {
      const fromDrawer = drawerOpen;
      setMenuOpen(false);
      setConfirmSignOut(false);
      setDrawerOpen(false);
      if (fromDrawer) burgerRef.current?.focus();
      if (query) onQuery("");
      onLeaveView?.();
      scrollToSection(id);
    },
    [query, onQuery, drawerOpen, onLeaveView, scrollToSection]
  );

  // --- Drawer swipe-to-close (touch) ------------------------------------------
  const onDrawerTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    setDragging(true);
  }, []);

  const onDrawerTouchMove = useCallback((e) => {
    if (touchStartX.current == null) return;
    const dx = Math.max(0, e.touches[0].clientX - touchStartX.current);
    dragXRef.current = dx;
    setDragX(dx);
  }, []);

  const onDrawerTouchEnd = useCallback(() => {
    if (touchStartX.current == null) return;
    touchStartX.current = null;
    setDragging(false);
    const dx = dragXRef.current;
    dragXRef.current = 0;
    setDragX(0);
    if (dx > 70) closeDrawer();
  }, [closeDrawer]);

  // --- Search field (collapsed icon <-> expanded input) -----------------------
  const openSearch = useCallback(() => {
    focusSearchRef.current = true;
    setSearchOpen(true);
  }, []);

  // Grab focus once the expanded input has mounted.
  useEffect(() => {
    if (!showSearch) return;
    if (focusSearchRef.current) {
      focusSearchRef.current = false;
      inputRef.current?.focus();
    }
  }, [showSearch]);

  const onSearchBlur = useCallback(
    (e) => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      if (query) return;
      setSearchOpen(false);
    },
    [query]
  );

  const openProfileView = useCallback(() => {
    dismissMenu();
    setProfileModal("view");
  }, [dismissMenu]);

  const openProfileEdit = useCallback(() => {
    dismissMenu();
    setProfileModal("edit");
  }, [dismissMenu]);

  // Opens the Carat avatar picker on top of whichever profile modal is open (or none).
  const openAvatarPicker = useCallback(() => {
    dismissMenu();
    setAvatarPickerOpen(true);
  }, [dismissMenu]);

  // Dismiss any profile modal. The profile data comes from ProfileContext, so
  // edits made in the modal are already reflected — nothing to re-read here.
  const closeProfile = useCallback(() => {
    setProfileModal(null);
  }, []);

  const handleExitAccount = useCallback(() => {
    setMenuOpen(false);
    setConfirmSignOut(false);
    onLogout();
  }, [onLogout]);

  // --- Surprise me ------------------------------------------------------------
  // Invoked from the drawer's "Surprise me" entry (which closes the drawer first).
  const handleSurprise = useCallback(async () => {
    try {
      const item = await pickRandomVideo();
      if (item) setSurprise(item);
      else setToast("Nothing to play yet — check back soon.");
    } catch {
      setToast("Could not pick a video right now.");
    }
  }, []);

  const closeSurprise = useCallback(() => {
    setSurprise(null);
    onWatchEnd?.();
  }, [onWatchEnd]);

  // --- Export / import --------------------------------------------------------
  const handleExport = useCallback(() => {
    dismissMenu();
    try {
      downloadUserData(profileId, profile);
      setToast("Backup downloaded.");
    } catch {
      setToast("Export failed — please try again.");
    }
  }, [dismissMenu, profileId, profile]);

  const handleImportFile = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ""; // allow re-picking the same file later
      dismissMenu();
      if (!file) return;
      try {
        await importUserDataFromFile(profileId, updateProfile, file);
        // Every list hook keeps its own cached copy, so reload to re-read them.
        setToast("Backup imported.");
        window.setTimeout(() => window.location.reload(), 700);
      } catch (err) {
        setToast(err?.message || "Import failed.");
      }
    },
    [dismissMenu, profileId, updateProfile]
  );

  // --- Profile switching ------------------------------------------------------
  const handleSwitchProfile = useCallback(() => {
    dismissMenu();
    clearProfile();
  }, [dismissMenu, clearProfile]);

  // Drawer helpers: an entry runs its action then closes the drawer. Handlers
  // are invoked from event callbacks (never during render) so ref reads stay
  // out of the render path.
  const runFromDrawer = useCallback(
    (e, fn) => {
      if (e) e.preventDefault();
      closeDrawer();
      fn?.();
    },
    [closeDrawer]
  );

  // --- Global shortcuts --------------------------------------------------------
  useEffect(() => {
    const isTyping = (t) => {
      const tag = t && t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
    };
    const onKey = (e) => {
      if (e.key === "/" && !isTyping(e.target)) {
        e.preventDefault();
        if (!showSearch) openSearch();
        else inputRef.current?.focus();
      } else if (e.key === "Escape") {
        // The search field handles its own Escape (and stops it here); this
        // covers everything else, one layer at a time: drawer, menu, query,
        // then collapsing the search field.
        if (drawerOpen) {
          closeDrawer();
        } else if (menuOpen) {
          dismissMenu();
        } else if (query) {
          onQuery("");
          inputRef.current?.focus();
        } else if (searchOpen) {
          setSearchOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, onQuery, drawerOpen, menuOpen, closeDrawer, dismissMenu, searchOpen, showSearch, openSearch]);

  // Close the profile menu on outside clicks.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmSignOut(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // Translucent bar at the top of the page, more opaque once scrolled past 40px.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 40);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Drawer: lock the page behind it and park focus on the first entry.
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector("a, button")?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  // Focus trap for the drawer (Tab cycles inside it, Escape closes).
  const onDrawerKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeDrawer();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = drawerRef.current?.querySelectorAll("a[href], button:not([disabled])");
      if (!nodes || !nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [closeDrawer]
  );

  return (
    <div className={`navbar${scrolled ? " navbar--solid" : ""}`}>
      <button
        type="button"
        className="logo"
        title="CARATFLIX — back to top"
        onClick={() => {
          if (query) onQuery("");
          onLeaveView?.();
          setMenuOpen(false);
          setDrawerOpen(false);
          scrollToId(null);
        }}
      >
        CARATFLIX
      </button>
      {/* Right cluster: search · theme · profile · menu button (far right). */}
      <div className="navbar-right">
        <div className={`search-bar${showSearch ? " search-bar--searching" : ""}`}>
        <div className="nav-search" onBlur={onSearchBlur}>
          {showSearch ? (
            <SearchInput
              inputRef={inputRef}
              query={query}
              onQuery={onQuery}
              pending={searchPending}
              history={searchHistory}
              onRecord={recordSearch}
              onClearHistory={clearSearchHistory}
            />
          ) : (
            /* Collapsed search: the magnifier launches the command palette. The
               inline field is still reachable with the "/" shortcut (see the
               keydown handler below), so the URL-backed search flow is intact. */
            <button
              type="button"
              className="search-toggle"
              onClick={onOpenCommandPalette || openSearch}
              aria-label="Search"
              aria-keyshortcuts="Control+K Meta+K"
              title="Search"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>
          )}
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <div className="nav-user" ref={menuRef}>
          <button
            ref={profileToggleRef}
            className="profile-toggle"
            onClick={() => {
              if (menuOpen) {
                setMenuOpen(false);
                setConfirmSignOut(false);
              } else setMenuOpen(true);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`Account menu for ${profile?.name || user}`}
            title="Account menu"
          >
            <AvatarCircle user={profile?.name || user} avatar={avatar} className="profile-avatar" />
            <span className="nav-username">{profile?.name || user}</span>
            <span className={`profile-caret${menuOpen ? " profile-caret--open" : ""}`}>▾</span>
          </button>
          <div className={`profile-menu${menuOpen ? " profile-menu--open" : ""}`} role="menu" aria-hidden={!menuOpen} inert={!menuOpen}>
              <div
                className="profile-menu-header"
                role="button"
                tabIndex={0}
                onClick={openProfileView}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openProfileView();
                  }
                }}
              >
                <AvatarCircle user={profile?.name || user} avatar={avatar} className="profile-menu-avatar" />
                <div className="profile-menu-user">
                  <div className="profile-menu-name-row">
                    <span className="profile-menu-name">{profile?.name || user}</span>
                    {profile.status && <span className="profile-menu-flair">{profile.status}</span>}
                  </div>
                  <span className="profile-menu-sub">@{user} · CARAT</span>
                  <div className="profile-menu-badges">
                    {profile.favoriteUnit && profile.favoriteUnit !== "All" && (
                      <span className="profile-menu-badge">▣ {profile.favoriteUnit}</span>
                    )}
                    {Array.isArray(favs?.members) && favs.members.length > 0 && (
                      <span className="profile-menu-badge">
                        ♡ {favs.members.length} {favs.members.length === 1 ? "bias" : "biases"}
                      </span>
                    )}
                    {profile.biasWrecker && <span className="profile-menu-badge">⚡ {profile.biasWrecker}</span>}
                  </div>
                  {profile.bio && <p className="profile-menu-bio">{profile.bio}</p>}
                </div>
                <span className="profile-menu-view" aria-hidden="true">›</span>
              </div>
              {/* Stats double as shortcuts into their sections. */}
              <div className="profile-menu-stats">
                <button className="profile-stat" role="menuitem" onClick={() => { dismissMenu(); goTo("my-list"); }} aria-label={`My List, ${stats.list} saved`}>
                  <span className="profile-stat-value">{stats.list}</span>
                  <span className="profile-stat-label">My List</span>
                </button>
                <button className="profile-stat" role="menuitem" onClick={() => { dismissMenu(); goTo("continue-watching"); }} aria-label={`Continue watching, ${stats.watching} in progress`}>
                  <span className="profile-stat-value">{stats.watching}</span>
                  <span className="profile-stat-label">Continue</span>
                </button>
                <button className="profile-stat" role="menuitem" onClick={() => { dismissMenu(); goTo("recently-watched"); }} aria-label={`History, ${stats.history} watched`}>
                  <span className="profile-stat-value">{stats.history}</span>
                  <span className="profile-stat-label">History</span>
                </button>
              </div>
              <div className="profile-menu-items">
                <button className="profile-item" role="menuitem" onClick={handleSwitchProfile}>
                  <span className="profile-item-icon">⇄</span> Switch Profile
                </button>
                {onOpenPreferences && (
                  <button
                    className="profile-item"
                    role="menuitem"
                    onClick={() => { dismissMenu(); onOpenPreferences(); }}
                  >
                    <span className="profile-item-icon">⚙</span> Preferences
                  </button>
                )}
                <button className="profile-item" role="menuitem" onClick={openProfileView}>
                  <span className="profile-item-icon">◎</span> View Profile
                </button>
                <button className="profile-item" role="menuitem" onClick={openProfileEdit}>
                  <span className="profile-item-icon">✎</span> Edit Profile
                </button>
                <button className="profile-item" role="menuitem" onClick={openAvatarPicker}>
                  <span className="profile-item-icon">◉</span> Change avatar
                </button>
                <button className="profile-item" role="menuitem" onClick={openProfileEdit} title="Choose your bias members">
                  <span className="profile-item-icon">♡</span> Edit Biases
                </button>
                <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenMembers?.(); }}>
                  <span className="profile-item-icon">★</span> Members
                </button>
                {onOpenBrowse && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenBrowse(); }}>
                    <span className="profile-item-icon">☰</span> All videos
                  </button>
                )}
                {onOpenVideos && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenVideos(); }}>
                    <span className="profile-item-icon">▶</span> Latest videos
                  </button>
                )}
                {onOpenEras && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenEras(); }}>
                    <span className="profile-item-icon">◈</span> Eras
                  </button>
                )}
                {onOpenChoreography && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenChoreography(); }}>
                    <span className="profile-item-icon">✦</span> Choreography
                  </button>
                )}
                {onOpenQuizzes && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenQuizzes(); }}>
                    <span className="profile-item-icon">🧠</span> Quizzes
                  </button>
                )}
                {onOpenGoals && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenGoals(); }}>
                    <span className="profile-item-icon">🎯</span> Goals
                  </button>
                )}
                {onOpenBadges && (
                  <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); onOpenBadges(); }}>
                    <span className="profile-item-icon">🏅</span> Achievements
                  </button>
                )}
                <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); goTo("my-list"); }}>
                  <span className="profile-item-icon">▤</span> My List
                </button>
                <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); goTo("continue-watching"); }}>
                  <span className="profile-item-icon">▶</span> Continue Watching
                </button>
                <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); goTo("recently-watched"); }}>
                  <span className="profile-item-icon">⏱</span> Recently Watched
                </button>
                <button className="profile-item" role="menuitem" onClick={() => { dismissMenu(); toggleTheme(); }}>
                  <span className="profile-item-icon">{theme === "dark" ? "☀" : "☾"}</span>
                  Theme: {theme === "dark" ? "Dark" : "Light"}
                </button>
                <button className="profile-item" role="menuitem" onClick={handleExport} title="Download your list, history and profile as JSON">
                  <span className="profile-item-icon">⤓</span> Export My Data
                </button>
                <button
                  className="profile-item"
                  role="menuitem"
                  onClick={() => { dismissMenu(); importRef.current?.click(); }}
                  title="Restore a CARATFLIX backup file"
                >
                  <span className="profile-item-icon">⤒</span> Import My Data
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={handleImportFile}
                />
              </div>
              <div className="profile-menu-sep"></div>
              {confirmSignOut ? (
                <div className="profile-exit-confirm">
                  <button
                    className="profile-item-exit profile-item-exit--confirm"
                    role="menuitem"
                    autoFocus
                    onClick={handleExitAccount}
                  >
                    Sign out @{user}?
                  </button>
                  <button
                    className="profile-item-cancel"
                    role="menuitem"
                    onClick={() => {
                      setConfirmSignOut(false);
                      profileToggleRef.current?.focus();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="profile-item-exit"
                  role="menuitem"
                  onClick={() => setConfirmSignOut(true)}
                  title="Sign out of your account"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              )}
            </div>
        </div>
      </div>
        <button
          ref={burgerRef}
          type="button"
          className="nav-burger"
          aria-expanded={drawerOpen}
          aria-label="Open menu"
          title="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          ☰
        </button>
      </div>
      {profileModal === "view" && (
        <ProfileViewModal
          user={user}
          onClose={closeProfile}
          onEdit={openProfileEdit}
          onChangePhoto={openAvatarPicker}
        />
      )}
      {profileModal === "edit" && (
        <ProfileModal
          user={user}
          displayName={profile?.name || ""}
          onClose={closeProfile}
          onSaved={(message) => setToast(message)}
          onChangePhoto={openAvatarPicker}
        />
      )}
      {avatarPickerOpen && (
        <AvatarPickerModal onClose={() => setAvatarPickerOpen(false)} />
      )}
      {surprise && (
        <VideoModal item={surprise} onClose={closeSurprise} onWatchEnd={closeSurprise} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {drawerOpen &&
        createPortal(
          <div className="nav-drawer-layer" onKeyDown={onDrawerKeyDown}>
            <div className="nav-drawer-backdrop" onClick={closeDrawer} />
            <div
              className={`nav-drawer${dragging ? " nav-drawer--dragging" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              ref={drawerRef}
              style={dragX ? { transform: `translateX(${dragX}px)` } : undefined}
              onTouchStart={onDrawerTouchStart}
              onTouchMove={onDrawerTouchMove}
              onTouchEnd={onDrawerTouchEnd}
              onTouchCancel={onDrawerTouchEnd}
            >
              <div className="nav-drawer-head">
                <span className="nav-drawer-title">Menu</span>
                <button type="button" className="nav-drawer-close" onClick={closeDrawer} aria-label="Close menu" title="Close menu">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <nav className="nav-drawer-nav">
                <ul className="nav-drawer-links nav-drawer-links--top">
                  <li>
                    <a href="#main-content" aria-current={homeActive ? "page" : undefined} onClick={(e) => runFromDrawer(e, () => goTo(null))}>
                      <span className="nav-drawer-icon"><DrawerIcon name="home" /></span>
                      Home
                    </a>
                  </li>
                </ul>
                <div className="nav-drawer-group">
                  <span className="nav-drawer-group-title">Browse</span>
                  <ul className="nav-drawer-links">
                    {browseItems.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} aria-current={item.current ? "page" : undefined} onClick={(e) => runFromDrawer(e, () => goTo(item.id))}>
                          <span className="nav-drawer-icon"><DrawerIcon name={DRAWER_ICON_BY_ID[item.id] || "play"} /></span>
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="nav-drawer-group">
                  <span className="nav-drawer-group-title">Discover</span>
                  <ul className="nav-drawer-links">
                    {onOpenMembers && (
                      <li>
                        <a href="#members" aria-current={membersActive ? "page" : undefined} onClick={(e) => runFromDrawer(e, onOpenMembers)}>
                          <span className="nav-drawer-icon"><DrawerIcon name="users" /></span>
                          Members
                        </a>
                      </li>
                    )}
                    <li>
                      <a href="#my-list" aria-current={myListActive ? "page" : undefined} onClick={(e) => runFromDrawer(e, () => goTo("my-list"))}>
                        <span className="nav-drawer-icon"><DrawerIcon name="bookmark" /></span>
                        My List
                      </a>
                    </li>
                    <li>
                      <a
                        href="#continue-watching"
                        aria-current={continuesActive ? "page" : undefined}
                        onClick={(e) => runFromDrawer(e, () => goTo("continue-watching"))}
                        aria-label={`Continue Watching, ${stats?.watching ?? 0} in progress`}
                      >
                        <span className="nav-drawer-icon"><DrawerIcon name="play" /></span>
                        Continue Watching
                        {stats?.watching > 0 && <span className="nav-drawer-count">{stats.watching}</span>}
                      </a>
                    </li>
                    <li>
                      <a
                        href="#recently-watched"
                        aria-current={recentlyActive ? "page" : undefined}
                        onClick={(e) => runFromDrawer(e, () => goTo("recently-watched"))}
                        aria-label={`Recently Watched, ${stats?.history ?? 0} watched`}
                      >
                        <span className="nav-drawer-icon"><DrawerIcon name="clock" /></span>
                        Recently Watched
                        {stats?.history > 0 && <span className="nav-drawer-count">{stats.history}</span>}
                      </a>
                    </li>
                  </ul>
                </div>
                {exploreItems.length > 0 && (
                  <div className="nav-drawer-group">
                    <span className="nav-drawer-group-title">Explore</span>
                    <ul className="nav-drawer-links">
                      {exploreItems.map((item) => (
                        <li key={item.id}>
                          <a href={`#${item.id}`} aria-current={item.current ? "page" : undefined} onClick={(e) => runFromDrawer(e, item.action)}>
                            <span className="nav-drawer-icon"><DrawerIcon name={DRAWER_ICON_BY_ID[item.id] || "quiz"} /></span>
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="nav-drawer-links">
                  <li>
                    <button
                      type="button"
                      onClick={(e) => runFromDrawer(e, handleSurprise)}
                      title="Play a random video"
                    >
                      <span className="nav-drawer-icon"><DrawerIcon name="surprise" /></span>
                      Surprise me
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

Navbar.propTypes = {
  query: PropTypes.string,
  onQuery: PropTypes.func,
  user: PropTypes.string,
  onLogout: PropTypes.func,
  activeSection: PropTypes.string,
  stats: PropTypes.shape({
    list: PropTypes.number,
    watching: PropTypes.number,
    history: PropTypes.number,
  }),
  onWatchEnd: PropTypes.func,
  searchPending: PropTypes.bool,
  view: PropTypes.string,
  onOpenMembers: PropTypes.func,
  onOpenEras: PropTypes.func,
  onOpenChoreography: PropTypes.func,
  onOpenBrowse: PropTypes.func,
  onOpenVideos: PropTypes.func,
  onOpenPreferences: PropTypes.func,
  onOpenQuizzes: PropTypes.func,
  onOpenGoals: PropTypes.func,
  onOpenBadges: PropTypes.func,
  onLeaveView: PropTypes.func,
  onOpenCommandPalette: PropTypes.func,
};

export default memo(Navbar);
