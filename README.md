# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Channel videos (YouTube sync)

The uploads from the [SEVENTEEN channel](https://www.youtube.com/@pledis17) are
pulled in ahead of time by a local Node script and written to
`src/data/youtubeVideos.json`. There is no server and no runtime call: the browser
never talks to YouTube for data, it just imports that static JSON. Videos are
never downloaded or re-hosted — playback is the official
`youtube-nocookie.com/embed/<id>` iframe.

### Refreshing the list

```bash
npm run sync:youtube
```

`vite build` runs the same script as a `prebuild` step, so a build refreshes the
list automatically. **A failed sync never breaks the build**: the existing JSON is
left untouched and the script exits 0. `prebuild` passes `--quiet`; `--offline`
skips the network entirely.

Two data sources, one output:

| Source | Needs a key? | Covers |
| --- | --- | --- |
| YouTube Data API v3 | yes (`YOUTUBE_API_KEY`) | the channel's **entire** uploads playlist, with duration, view count and all thumbnail sizes |
| Channel RSS/Atom feed | no | only the **~15 most recent** uploads, no duration or view counts |

The API is used when a key is present, otherwise the script falls back to the
feed. The more videos the API has already archived, the less that 15-video feed
window matters, because every run is **incremental**: entries already in the file
are kept and incoming ones are merged on top (newest first, deduped by video id),
so nothing falls out of the file when the feed rolls over.

### Getting an API key

1. Open [console.cloud.google.com](https://console.cloud.google.com) and create
   (or pick) a project.
2. **APIs & Services → Library →** enable **YouTube Data API v3**.
3. **APIs & Services → Credentials → Create credentials → API key**, and restrict
   the key to YouTube Data API v3.

Then copy `.env.example` to `.env` (gitignored) and paste the key in:

```bash
YOUTUBE_API_KEY=your-key-here
```

The key is read from `process.env.YOUTUBE_API_KEY` at build time only. Nothing
key-shaped ever reaches the bundle, and the browser never sees it.

### Scheduling the sync

The repo is on GitHub, so the key can live as a repository secret and a workflow
can refresh the JSON on a schedule. `.github/workflows/sync-videos.yml` does
exactly that: set `YOUTUBE_API_KEY` under **Settings → Secrets and variables →
Actions**, then the cron job re-runs the sync and commits the changed file. A run
without the secret still succeeds, via the keyless RSS fallback.

### What it writes

| File | Contents |
| --- | --- |
| `src/data/youtubeVideos.json` | `{ channel, videos }` — every known upload, newest first |

`channel` is `{ id, title, handle, url }`. Each video is:

```jsonc
{
  "id": "…",
  "title": "…",
  "description": "…",                    // trimmed excerpt
  "publishedAt": "2026-10-16T12:59:59+00:00",
  "duration": { "iso": "PT3M21S", "seconds": 201 },   // null without a key
  "thumbnails": { "maxres": null, "high": "…", "medium": "…", "default": "…" },
  "viewCount": 1234567,                  // null without a key
  "url": "https://www.youtube.com/watch?v=…"
}
```

Thumbnails are read in that order — maxres, then high, then medium — so a video
with no maxres still resolves to something. The file is committed, so the app
renders a real list before the script has ever run.

`--resolve` re-derives the channel id from the `@pledis17` handle (it is pinned as
`CHANNEL_ID` in the script, which is what lets a normal run need a single API
call, or none at all on the feed fallback).

### Where the data shows up

- **Latest videos** (`?view=videos`): a responsive grid of thumbnail, duration
  badge, title, upload date and view count, with a title filter and a client-side
  "Load more" pager. Clicking a card opens a dialog that shows the poster first
  and only mounts the `youtube-nocookie.com` iframe once you press play.
- **My List**: every card on that page has a ♡ that saves the video, and saved
  uploads appear in the "Favorite Uploads" row and on the My List page. Saved
  videos play through the app's shared watch modal, so they also feed Continue
  Watching and the watched/progress state.
- Each card and the dialog both link out with "Open on YouTube".

The service worker (`public/sw.js`) only handles same-origin GET requests, so the
embed iframe and its requests are never intercepted; the JSON is same-origin and
is cached like the rest of the shell.

The hand-curated catalogues (`src/data/MVS.js`, `src/data/GOING_SEVENTEEN.js`, …)
are separate and stay as they are — they are the app's own data, and channel
uploads are deliberately kept out of them because they carry no member or era
attribution.

## Accounts + cloud data (Supabase)

Accounts are handled by **Supabase Auth** and data lives in **Supabase Postgres**,
so one email + password account works on every device at once. Login and sign-up
talk to Supabase directly — there is no local account store, so an account
created on one device is accepted on all of them. Each device keeps its own
session, so signing out uses `signOut({ scope: "local" })` and leaves the other
devices signed in.

Connect a Supabase project (Auth + Postgres) before using the app. The client is
`src/lib/supabase.js`; account helpers live in `src/utils/supabaseAuth.js`;
profiles in `src/utils/supabaseProfiles.js`; and the My List / watch-progress
mirror in `src/context/SyncContext.jsx` + `src/lib/supabaseSync.js`.

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste `supabase/migrations/0001_init.sql`,
   **Run**. This creates `public.profiles`, `public.my_list`, and
   `public.watch_progress`, all with Row Level Security.
3. **Authentication → Sign In / Providers → Email**: while testing, turn
   **off** "Confirm email" so sign-up logs in immediately. (If it stays on, a
   new user must click the confirmation link before their first sign-in.)
4. **Project Settings → API**: copy the **Project URL** and the
   **publishable** (or legacy **anon public**) key into `.env` (copy
   `.env.example` first if needed):

   ```bash
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
5. Restart `npm run dev`.

Once configured, the login screen is **email** sign-in and data lives in
Postgres, so every device signed into the same account sees the same profiles,
theme/accent, My List, and Continue Watching. If a build has no Supabase
configuration it says so up front instead of falling back to a local-only
account that other devices could never see.

The publishable/anon key is safe in client code — it only grants what the RLS
policies allow. Never put the `service_role` / secret key in `.env`.

### Where data lives

| Data | Where it lives |
| --- | --- |
| Credentials (email + password) | Supabase Auth (server-side hashing) |
| Session | per device (Supabase session) |
| Profiles, theme, accent | `public.profiles` (mirrored to a local cache) |
| My List | `public.my_list` (mirrored to a local cache) |
| Watched state + Continue Watching | `public.watch_progress` (mirrored to a local cache) |
| Recently watched, badges, comments, quiz | browser `localStorage` (per device) |

Reads always come from the local cache first, so the first paint is instant and
the app still opens offline. Remote changes are pulled when a profile loads and
when the tab regains focus; local changes are pushed up (debounced) as you make
them. A network failure keeps the local copy and logs a warning — it never
blocks the UI.

No password (or hash) is ever written by this app once Supabase is configured.




