import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from "react";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { useLocalStorageList } from "./hooks/useLocalStorageList";
import { setActiveProfileId } from "./utils/profiles";
import {
  getCurrentAccount,
  loadCachedAccount,
  onAccountChange,
  signOutAccount,
} from "./utils/supabaseAuth";
import { SyncProvider } from "./context/SyncContext.jsx";
import { CW_KEY, RECENT_KEY, removeFromCW } from "./utils/watchHistory";
import { scrollToIdWhenReady } from "./utils/format";
import SessionContext from "./context/SessionContext.jsx";
import { FavoritesProvider, useFavoritesContext } from "./context/FavoritesContext.jsx";
import { ProfileProvider, useProfiles } from "./context/ProfileContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { BadgeProvider } from "./context/BadgeContext.jsx";
import { ThemeProvider } from "./ThemeContext";
import { useScrollSpy } from "./hooks/useScrollSpy";
import { useWatched } from "./hooks/useWatched";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useUrlState } from "./hooks/useUrlState";
import { SECTION_IDS } from "./data/SECTION_IDS";
import { MEMBERS } from "./data/MEMBERS";
import { NANA_TOUR } from "./data/NANA_TOUR";

import AuthFlow from "./components/AuthFlow";
import ProfilePicker from "./components/ProfilePicker";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import ContinueWatching from "./components/ContinueWatching";
import RecentlyWatchedRow from "./components/RecentlyWatchedRow";
import VideoRow from "./components/VideoRow";
import VideoModal from "./components/VideoModal";
import MyBiasRow from "./components/MyBiasRow";
import EventBanners from "./components/EventBanners";
import RowSkeleton from "./components/RowSkeleton";
import { MemberPageSkeleton, MembersPageSkeleton } from "./components/MemberSkeletons";
import "./App.css";

// Everything below the fold — plus the catalogues they render — is split into
// its own chunks and streamed in behind a skeleton, so the first paint only
// waits for the shell, the hero, and the member strip.
const LatestVideo = lazyWithRetry(() => import("./components/LatestVideo"));
const MyListRow = lazyWithRetry(() => import("./components/MyListRow"));
const MyListPage = lazyWithRetry(() => import("./components/MyListPage"));
const GoSeRow = lazyWithRetry(() => import("./components/GoSeRow"));
const ConcertsRow = lazyWithRetry(() => import("./components/ConcertsRow"));
const SideTracksRow = lazyWithRetry(() => import("./components/SideTracksRow"));
const MVRow = lazyWithRetry(() => import("./components/MVRow"));
const ChoreographyRow = lazyWithRetry(() => import("./components/ChoreographyRow"));
const ChoreographyPage = lazyWithRetry(() => import("./components/ChoreographyPage"));
const BrowseVideosPage = lazyWithRetry(() => import("./components/BrowseVideosPage"));
const VideosPage = lazyWithRetry(() => import("./components/VideosPage"));
const SearchResults = lazyWithRetry(() => import("./components/SearchResults"));
const MembersPage = lazyWithRetry(() => import("./components/MembersPage"));
const MemberPage = lazyWithRetry(() => import("./components/MemberPage"));
const EraPage = lazyWithRetry(() => import("./components/EraPage"));
const PreferencesPage = lazyWithRetry(() => import("./components/PreferencesPage"));
const QuizPage = lazyWithRetry(() => import("./components/QuizPage"));
const GoalsPage = lazyWithRetry(() => import("./components/GoalsPage"));
const BadgesPage = lazyWithRetry(() => import("./components/BadgesPage"));
const CaratPick = lazyWithRetry(() => import("./components/CaratPick"));
const FancamFocus = lazyWithRetry(() => import("./components/FancamFocus"));
const MemberPlaylistRow = lazyWithRetry(() => import("./components/MemberPlaylistRow"));
// The command palette is only fetched the first time it is opened (Ctrl/Cmd+K
// or the navbar hint button), so its chunk stays out of the initial load.
const CommandPalette = lazyWithRetry(() => import("./components/CommandPalette"));

// Query string that returns to the plain home view — the same reset a Navbar
// link performs (clear the search + filters, drop the view). Shared with the
// command palette's navigate() helper. The `ch*` keys are the choreography
// page's own filters (see hooks/useUrlState.js).
const CLEAR_VIEW = {
  view: "",
  id: "",
  q: "",
  member: "",
  unit: "",
  type: "",
  year: "",
  chtype: "",
  chmember: "",
  chera: "",
  chsort: "",
};

// Shown for the brief moment the Supabase session is being restored on boot.
// Reuses the login screen shell so there is no flash of unstyled content.
function BootSplash() {
  return (
    <div className="login-page" role="status" aria-live="polite">
      <div className="login-bg">
        <div className="login-glow login-glow--rose"></div>
        <div className="login-glow login-glow--serenity"></div>
      </div>
      <div className="login-card">
        <div className="login-logo">CARATFLIX</div>
      </div>
    </div>
  );
}

// Top-level gate. The account (login identity) comes first; a profile must then
// be chosen before anything protected renders — so a signed-in visitor always
// passes through "Who's watching?".
export default function App() {
  // `account` is `{ id, username, email }` or null when signed out. The session
  // is restored asynchronously from Supabase, so `undefined` means "still
  // loading" while `null` means signed out.
  const [account, setAccount] = useState(() =>
    // Render immediately from the cached account (if any); the effect below
    // validates it against the real Supabase session.
    loadCachedAccount() ?? undefined
  );

  // Restore the persisted session (per device) on boot and follow auth changes —
  // sign-in/out, token refresh, or another tab. Each device keeps its own
  // session, so signing out here never affects the user's other devices.
  useEffect(() => {
    let alive = true;
    getCurrentAccount()
      .then((next) => { if (alive) setAccount(next ?? null); })
      .catch(() => {
        // Network hiccup: keep the cached account (offline boot) instead of
        // dropping the user back to the login screen.
        if (alive) setAccount((current) => (current === undefined ? null : current));
      });
    const unsubscribe = onAccountChange((next) => setAccount(next));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const handleLogin = (nextAccount) => {
    setAccount(nextAccount);
  };

  const handleLogout = async () => {
    // Forget the chosen profile so the next login starts at the picker.
    setActiveProfileId(null);
    // Only sign the *current device* out — other devices keep their sessions.
    await signOutAccount();
    setAccount(null);
  };

  if (account === undefined) return <BootSplash />;

  const user = account ? account.username : null;

  return (
    // key={account.id} remounts the profile store per account, so profiles and
    // their data never leak between accounts.
    <ProfileProvider key={account?.id || "anon"} accountId={account?.id || null} accountName={user}>
      <ThemeProvider>
        {account ? (
          <ProfileRouter user={user} onLogout={handleLogout} />
        ) : (
          <AuthFlow onLogin={handleLogin} />
        )}
      </ThemeProvider>
    </ProfileProvider>
  );
}

// Requires BOTH a login (rendered by App) and a selected profile. Without a
// profile the picker takes over; with one, the profile-scoped app renders.
function ProfileRouter({ user, onLogout }) {
  const { activeProfile, profilesLoading, accountId } = useProfiles();

  if (profilesLoading) return <BootSplash />;

  if (!activeProfile) {
    return <ProfilePicker onLogout={onLogout} />;
  }

  return (
    <SyncProvider accountId={accountId} profileId={activeProfile.id}>
      <FavoritesProvider user={activeProfile.id}>
        <AppContent
          key={activeProfile.id}
          user={user}
          profileId={activeProfile.id}
          onLogout={onLogout}
        />
      </FavoritesProvider>
    </SyncProvider>
  );
}

function AppContent({ user, profileId, onLogout }) {
  const { activeProfile, updateProfile } = useProfiles();
  // Search + the members views are mirrored onto the URL query string
  // (q / member / unit / type / year / view / id) so every view is shareable and
  // survives a reload. The hook owns replaceState + popstate handling.
  const [urlState, updateUrl] = useUrlState();
  const query = urlState.q;
  const setQuery = useCallback((q) => updateUrl({ q }), [updateUrl]);
  const view = urlState.view;
  const filters = useMemo(
    () => ({ member: urlState.member, unit: urlState.unit, type: urlState.type, year: urlState.year }),
    [urlState.member, urlState.unit, urlState.type, urlState.year]
  );
  const cwDefault = useCallback(() => [], []);
  const recentDefault = useCallback(() => [], []);

  // Every per-profile list is keyed by the profile id, so switching profiles
  // swaps My List / Continue Watching / history completely. (Legacy account-
  // keyed data was migrated onto the first profile in utils/profiles.js.)
  const [cwItems, refreshCW] = useLocalStorageList({ user: profileId, key: CW_KEY, separator: "-", value: cwDefault });
  const [recentItems, refreshRecent] = useLocalStorageList({ user: profileId, key: RECENT_KEY, separator: "-", value: recentDefault });
  const { favs, toggleFav, setFavMembers, replaceFavs, refreshFavs } = useFavoritesContext();
  const { watched, refreshWatched, markWatched, unmarkWatched, progressFor, isWatched } = useWatched(profileId);

  // Video opened from the Continue Watching row (resumes at its saved time) and
  // the full-page My List view — both rendered from here so they sit above the
  // rows regardless of which row a click came from.
  const [resumeItem, setResumeItem] = useState(null);
  const [showList, setShowList] = useState(false);
  // Command palette (Ctrl/Cmd+K). It is mounted only while open, so the lazy
  // chunk is requested on first open rather than on initial render.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const handleRemoveFromCW = useCallback((videoId) => {
    removeFromCW(profileId, videoId);
    refreshCW();
  }, [profileId, refreshCW]);

  // The profile's avatar lives on its record and is the single shared source of
  // truth for every avatar in the app.
  const avatar = activeProfile?.avatar || null;
  const setAvatar = useCallback(
    (id) => {
      updateProfile(profileId, { avatar: id || "" });
      return true;
    },
    [profileId, updateProfile]
  );

  const searchTerm = useDebouncedValue(query.trim().toLowerCase(), 300);
  const filtersActive = Boolean(filters.member || filters.unit || filters.type || filters.year);
  const searchActive = searchTerm.length > 0 || filtersActive;
  const searchPending = query.trim().length > 0 && searchTerm !== query.trim().toLowerCase();
  const activeSection = useScrollSpy(SECTION_IDS);

  // A search replaces the whole page: show it from the top rather than from
  // wherever the user happened to have scrolled to.
  const wasSearchActive = useRef(false);
  useEffect(() => {
    if (searchActive && !wasSearchActive.current) window.scrollTo({ top: 0, behavior: "auto" });
    wasSearchActive.current = searchActive;
  }, [searchActive]);

  // Scroll the full-page views to the top when they open.
  useEffect(() => {
    if (view) window.scrollTo({ top: 0, behavior: "auto" });
  }, [view, urlState.id]);

  // Search filters (written straight to the URL so a filtered search is
  // shareable) and the members views. Opening a member leaves any active search
  // behind and shows the profile instead. `leaveView` also clears the filters so
  // a nav click can always get back to the plain home page.
  const setFilter = useCallback((key, value) => updateUrl({ [key]: value }), [updateUrl]);
  const clearFilters = useCallback(() => updateUrl({ member: "", unit: "", type: "", year: "" }), [updateUrl]);
  const leaveView = useCallback(
    () => updateUrl({ view: "", id: "", member: "", unit: "", type: "", year: "", chtype: "", chmember: "", chera: "", chsort: "" }),
    [updateUrl]
  );
  const openMembers = useCallback(
    () => updateUrl({ view: "members", id: "", q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );
  const openMember = useCallback(
    (id) => updateUrl({ view: "member", id, q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );
  // The era timeline owns which chapter is selected; the URL only carries it
  // once a chip is clicked (EraPage falls back to the richest chapter).
  const openEras = useCallback(
    () => updateUrl({ view: "eras", id: "", q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );
  const selectEra = useCallback((id) => updateUrl({ view: "eras", id }), [updateUrl]);
  const openPreferences = useCallback(
    () => updateUrl({ view: "preferences", id: "", q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );
  const openQuizzes = useCallback(
    () => updateUrl({ view: "quizzes", id: "", q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );
  const openGoals = useCallback(
    () => updateUrl({ view: "goals", id: "", q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );
  const openBadges = useCallback(
    () => updateUrl({ view: "badges", id: "", q: "", member: "", unit: "", type: "", year: "" }),
    [updateUrl]
  );

  // Choreography page. Its filters live under their own URL keys (`ch*`) so the
  // search filters above — and the search takeover they trigger — stay untouched
  // while the page is open. Opening the page from a nav link starts it unfiltered.
  const choreoFilters = useMemo(
    () => ({
      type: urlState.chtype,
      member: urlState.chmember,
      era: urlState.chera,
      sort: urlState.chsort,
    }),
    [urlState.chtype, urlState.chmember, urlState.chera, urlState.chsort]
  );
  const setChoreoFilter = useCallback((key, value) => updateUrl({ [`ch${key}`]: value }), [updateUrl]);
  const clearChoreoFilters = useCallback(
    () => updateUrl({ chtype: "", chmember: "", chera: "", chsort: "" }),
    [updateUrl]
  );
  const openChoreography = useCallback(() => updateUrl({ ...CLEAR_VIEW, view: "choreography" }), [updateUrl]);

  // The every-video index. Its single filter is local to the page, so opening it
  // only has to reset whatever the previous view left in the URL.
  const openBrowse = useCallback(() => updateUrl({ ...CLEAR_VIEW, view: "browse" }), [updateUrl]);

  // The channel feed (newest uploads from the RSS import). Its filter and pager
  // are local to the page, so like the browse page opening it only has to reset
  // whatever the previous view left in the URL.
  const openVideos = useCallback(() => updateUrl({ ...CLEAR_VIEW, view: "videos" }), [updateUrl]);

  // One small view switch for the command palette, so it does not have to be
  // wired to each of the open* handlers above. Mirrors a Navbar link: clear the
  // search + filters, close the My List overlay, then point the URL at the view.
  const navigate = useCallback(
    (view, id) => {
      setShowList(view === "my-list");
      if (view === "member" && id) {
        updateUrl({ ...CLEAR_VIEW, view: "member", id });
      } else if (view && view !== "home" && view !== "my-list") {
        updateUrl({ ...CLEAR_VIEW, view });
      } else {
        updateUrl(CLEAR_VIEW);
      }
    },
    [updateUrl]
  );

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Ctrl/Cmd+K toggles the palette. Unlike the navbar's other shortcuts this one
  // deliberately ignores what is focused — it has to work while typing in
  // another field — and suppresses the browser's own Ctrl/⌘+K.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fancam focus on the home page: which member the generated playlist is
  // showing. Kept local (not in the URL) because the `member` query param is
  // already spoken for by the search filters.
  const [focusMemberId, setFocusMemberId] = useState(null);
  const handleFancamFocus = useCallback((id) => {
    setFocusMemberId(id);
    scrollToIdWhenReady("member-playlist");
  }, []);

  const handleWatchEnd = useCallback(() => {
    refreshCW();
    refreshRecent();
    refreshWatched();
  }, [refreshCW, refreshRecent, refreshWatched]);

  const sessionValue = useMemo(
    () => ({
      user,
      profile: activeProfile,
      profileId,
      avatar,
      setAvatar,
      favs,
      toggleFav,
      setFavMembers,
      replaceFavs,
      refreshFavs,
      watched,
      markWatched,
      unmarkWatched,
      progressFor,
      isWatched,
      openMember,
      openMembers,
    }),
    [user, activeProfile, profileId, avatar, setAvatar, favs, toggleFav, setFavMembers, replaceFavs, refreshFavs, watched, markWatched, unmarkWatched, progressFor, isWatched, openMember, openMembers]
  );

  const stats = useMemo(
    () => ({
      list: (favs.videos?.length || 0) + (favs.members?.length || 0),
      watching: cwItems.length,
      history: recentItems.length,
    }),
    [favs, cwItems, recentItems]
  );

  // Token that changes whenever local activity the badge engine watches moves
  // (watched videos, Continue Watching, history, My List). BadgeProvider uses it
  // to re-evaluate achievements; comment / reaction / quiz writes notify it
  // through the engagement event instead.
  const badgeToken = `${Object.keys(watched).length}:${cwItems.length}:${recentItems.length}:${favs.videos?.length || 0}:${favs.members?.length || 0}`;

  // Keys the view wrapper so each top-level view animates in as it replaces the
  // previous one. Home keeps a constant key, so it never remounts needlessly.
  const routeKey = searchActive
    ? "search"
    : view === "member" && urlState.id
    ? `member:${urlState.id}`
    : view === "members"
    ? "members"
    : view === "eras"
    ? `eras:${urlState.id || "default"}`
    : view === "preferences"
    ? "preferences"
    : view === "quizzes"
    ? "quizzes"
    : view === "goals"
    ? "goals"
    : view === "badges"
    ? "badges"
    : view === "choreography"
    ? "choreography"
    : view === "browse"
    ? "browse"
    : view === "videos"
    ? "videos"
    : showList
    ? "my-list"
    : "home";

  return (
    <SessionContext.Provider value={sessionValue}>
      <ToastProvider>
        <BadgeProvider profile={activeProfile} refreshToken={badgeToken}>
          <div>
            <a className="skip-link" href="#main-content">Skip to content</a>
            <Navbar
              query={query}
              onQuery={setQuery}
              user={user}
              onLogout={onLogout}
              activeSection={searchActive ? null : activeSection}
              stats={stats}
              onWatchEnd={handleWatchEnd}
              searchPending={searchPending}
              view={view}
              onOpenMembers={openMembers}
              onOpenEras={openEras}
              onOpenChoreography={openChoreography}
              onOpenBrowse={openBrowse}
              onOpenVideos={openVideos}
              onOpenPreferences={openPreferences}
              onOpenQuizzes={openQuizzes}
              onOpenGoals={openGoals}
              onOpenBadges={openBadges}
              onLeaveView={leaveView}
              onOpenCommandPalette={openPalette}
            />
            <main id="main-content" tabIndex={-1}>
              <div className="route-fade" key={routeKey}>
                {searchActive ? (
                  <Suspense fallback={<RowSkeleton title="Search results" cards={4} />}>
                    <SearchResults
                      query={searchTerm}
                      rawQuery={query.trim()}
                      filters={filters}
                      onFilter={setFilter}
                      onClearFilters={clearFilters}
                      onWatchEnd={handleWatchEnd}
                      onQuery={setQuery}
                    />
                  </Suspense>
                ) : view === "member" && urlState.id ? (
                  <Suspense fallback={<MemberPageSkeleton />}>
                    <MemberPage id={urlState.id} onClose={leaveView} onWatchEnd={handleWatchEnd} />
                  </Suspense>
                ) : view === "members" ? (
                  <Suspense fallback={<MembersPageSkeleton />}>
                    <MembersPage onClose={leaveView} />
                  </Suspense>
                ) : view === "eras" ? (
                  <Suspense fallback={<MembersPageSkeleton />}>
                    <EraPage id={urlState.id} onSelectEra={selectEra} onClose={leaveView} onWatchEnd={handleWatchEnd} />
                  </Suspense>
                ) : view === "preferences" ? (
                  <Suspense fallback={<RowSkeleton title="Preferences" cards={2} />}>
                    <PreferencesPage onClose={leaveView} />
                  </Suspense>
                ) : view === "quizzes" ? (
                  <Suspense fallback={<RowSkeleton title="Quizzes" cards={2} />}>
                    <QuizPage onClose={leaveView} />
                  </Suspense>
                ) : view === "goals" ? (
                  <Suspense fallback={<RowSkeleton title="Community goals" cards={2} />}>
                    <GoalsPage onClose={leaveView} />
                  </Suspense>
                ) : view === "badges" ? (
                  <Suspense fallback={<RowSkeleton title="Achievements" cards={3} />}>
                    <BadgesPage onClose={leaveView} />
                  </Suspense>
                ) : view === "choreography" ? (
                  <Suspense fallback={<RowSkeleton title="Choreography" />}>
                    <ChoreographyPage
                      filters={choreoFilters}
                      onFilter={setChoreoFilter}
                      onClearFilters={clearChoreoFilters}
                      onClose={leaveView}
                      onWatchEnd={handleWatchEnd}
                    />
                  </Suspense>
                ) : view === "browse" ? (
                  <Suspense fallback={<RowSkeleton title="Browse all videos" />}>
                    <BrowseVideosPage onClose={leaveView} onWatchEnd={handleWatchEnd} />
                  </Suspense>
                ) : view === "videos" ? (
                  <Suspense fallback={<RowSkeleton title="Latest videos" />}>
                    <VideosPage onClose={leaveView} />
                  </Suspense>
                ) : showList ? (
                  <Suspense fallback={<RowSkeleton title="My List" cards={4} />}>
                    <MyListPage onClose={() => setShowList(false)} onWatchEnd={handleWatchEnd} />
                  </Suspense>
                ) : (
                  <>
                    <Hero />
                    <Suspense fallback={<RowSkeleton title="Carat Pick" cards={1} />}>
                      <CaratPick onWatchEnd={handleWatchEnd} />
                    </Suspense>
                    <EventBanners notifications={activeProfile?.notifications} />
                    <MyBiasRow members={MEMBERS} onOpenMembers={openMembers} />
                    <Suspense fallback={<RowSkeleton id="member-playlist" title="Member playlist" />}>
                      <FancamFocus
                        label="Fancam focus"
                        hint="Focus the generated playlist below on one member"
                        value={focusMemberId}
                        onFocus={handleFancamFocus}
                      />
                      <MemberPlaylistRow
                        selectedMemberId={focusMemberId}
                        onMemberChange={setFocusMemberId}
                        onWatchEnd={handleWatchEnd}
                      />
                    </Suspense>
                    <Suspense fallback={<RowSkeleton title="Latest video" cards={1} />}>
                      <LatestVideo />
                    </Suspense>
                    <ContinueWatching items={cwItems} onOpen={setResumeItem} onRemove={handleRemoveFromCW} />
                    <RecentlyWatchedRow items={recentItems} />
                    <Suspense fallback={<RowSkeleton id="my-list" title="My List" cards={4} />}>
                      <MyListRow onWatchEnd={handleWatchEnd} onOpenList={() => setShowList(true)} />
                    </Suspense>
                    <VideoRow id="nana-tour" title="Nana Tour" items={NANA_TOUR} countLabel="episodes" onWatchEnd={handleWatchEnd} />
                    <Suspense fallback={<RowSkeleton id="going-seventeen" title="Going Seventeen" />}>
                      <GoSeRow onWatchEnd={handleWatchEnd} />
                    </Suspense>
                    <Suspense fallback={<RowSkeleton id="concerts" title="Concerts" />}>
                      <ConcertsRow onWatchEnd={handleWatchEnd} />
                    </Suspense>
                    <Suspense fallback={<RowSkeleton id="side-tracks" title="Side Tracks" />}>
                      <SideTracksRow onWatchEnd={handleWatchEnd} />
                    </Suspense>
                    <Suspense fallback={<RowSkeleton id="mvs" title="Music videos" />}>
                      <MVRow onWatchEnd={handleWatchEnd} />
                    </Suspense>
                    <Suspense fallback={<RowSkeleton id="choreography" title="Choreography" />}>
                      <ChoreographyRow onWatchEnd={handleWatchEnd} onOpenAll={openChoreography} />
                    </Suspense>
                  </>
                )}
              </div>
            </main>
            {resumeItem && (
              <VideoModal
                item={resumeItem}
                startTime={resumeItem.currentTime || 0}
                onClose={() => setResumeItem(null)}
                onWatchEnd={handleWatchEnd}
              />
            )}
            {paletteOpen && (
              <Suspense fallback={null}>
                <CommandPalette
                  onClose={closePalette}
                  navigate={navigate}
                  onLogout={onLogout}
                  onSearch={setQuery}
                />
              </Suspense>
            )}
            <Footer />
          </div>
        </BadgeProvider>
      </ToastProvider>
    </SessionContext.Provider>
  );
}
