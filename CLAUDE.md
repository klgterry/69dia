# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server on :3000 (Turbopack)
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint (next/core-web-vitals)
npm test           # Vitest (watch)
npm run test:run   # Vitest (single run)
```

Run one test file: `npx vitest run lib/teamBalancer.test.js` (add `-t "name"` to filter).
Tests live in `lib/**/*.test.js` and cover pure logic only (no component/DOM tests). Beyond tests, verify UI changes by running `npm run dev` and exercising the affected page.

> Do not run `npm run build` while `npm run dev` is running — both use `.next/` and the build corrupts the dev server's manifest (every page then 500s). Stop dev first, or `rm -rf .next` and restart it.

## Required setup

Create `.env.local` at the repo root:

```
NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/.../exec
```

Without this the app builds but every data request returns `500 { error: "GAS_URL not configured" }`. `next.config.js` re-exposes the value as `GAS_URL`; despite the `NEXT_PUBLIC_` prefix it is only read server-side in `app/api/gasApi/route.js`.

## Architecture

**Stack:** Next.js 15 App Router, React 18.3, JavaScript (no TypeScript), Tailwind CSS v4. Deployed on Vercel.

### The backend is a Google Sheet

There is no application database. `app/api/gasApi/route.js` is the **only** server-side code — a thin proxy to a Google Apps Script (GAS) web app backed by Google Sheets.

- **GET** forwards a fixed whitelist of query params (`action`, `username`, `season`, `playerA`, `playerB`, `limit`) to `NEXT_PUBLIC_GAS_URL`, `cache: "no-store"`. GAS is flaky under load (slow responses, occasional HTML error pages), so GET retries once with backoff and normalizes a non-JSON response to `502 { error: "GAS invalid response" }`.
- **POST** passes the request body straight through; the operation is named by `action` inside the body (`getPlayersInfo`, `registerResult`). Not retried (not idempotent).
- ~25 GET `action` values are in use (e.g. `getCurrentSeasonSummary`, `getUserSummary`, `getSeasonPrevRank`, `getGameHistory`, `getUserDuoStats`, `getWeeklyRanking`, `getPrizeData`, `getRules`, `getAwardData`, `getLeaderboard`).

Client-side, prefer `lib/gasClient.js` (`gasGet(action, params)` / `gasPost(action, payload)`) over a raw `fetch` — it checks `res.ok`, rejects non-JSON, and throws `GasError` on a `{ error }` payload. Several older call sites still use bare `fetch(...).then(r => r.json())` and swallow failures.

### Everything renders client-side

Every page and most shared components are `"use client"` and fetch their own data in `useEffect` against `/api/gasApi`. There are no Server Components and no server data fetching. `app/error.js` and `app/global-error.js` catch render-time exceptions; there is no `loading.js`. Per-page loading/error state is hand-rolled — some components now show `components/LoadError.jsx` on failure, but many `.catch` handlers still only `console.error` and leave a spinner.

GAS response shapes are inconsistent (array vs `{ok, result}` vs `{players}`, `PLAYER` vs `username`), so consumers normalize defensively — see `app/week/page.js` `fetchLeaderboardForAllSeason`.

### Season list is hardcoded in two places

The season dropdown array (`{ TITLE: "26. 8월 시즌" }`, ~19 entries) is duplicated in `app/page.js` and `components/HeadToHeadSlide2.jsx`, even though a `getSeasonList` action exists (its call sites are commented out). **Opening a new season means editing both arrays and deploying** — this is what the `N차커밋(N월 시즌 시작)` commits do. (Note: `components/user/useUserProfile.js` does call `getSeasonList` at runtime.)

### Team balancing

`app/ready/page.js` (~1300 lines, one `TeamPage` component, ~35 `useState`) is the team-generation UI. The pure logic is extracted to **`lib/teamBalancer.js`** and unit-tested (`lib/teamBalancer.test.js`): `parsePlayersInput` (returns `{ parsed, errors }`, caller shows the alert), `calculateEffectiveMMR`, `getPlayerCount`, `checkClassDistribution` (returns `{ ok, missing }`), and the balancing functions `buildTeamsByPairSplit` / `buildTeamsByProposal` / `violatesPairSplit` (each takes an injectable `rng` defaulting to `Math.random`). Results are written back via `POST { action: "registerResult" }`.

### Shared user-profile code

`app/user/page.js` and `app/user-popup/page.js` are now thin shells (~110 / ~25 lines). The popup is opened via `window.open` with `?name=&season=`. Everything shared lives in `components/user/`:

- `useUserProfile(selectedUser, initialSeasonTitle)` — all the profile data-loading state and effects.
- `UserProfilePanel.jsx` — the `player_bg.png` detail card.
- `profileSections.jsx` — the leaf sections (`UserSeasonStats`, `UserDuoStats`, `UserRecentGames`, `UserAwards`, `UserStatsExtra`).

### Known duplication (change all copies together)

- The image-based nav bar (`{name, path}` array + `background-image` / `_hover.png` swap) is copy-pasted into ~9 page files.
- `classIconMap` (`"드" → "druid"`, etc.) is redefined in `app/history/page.js`, `components/DuoBalance.js`, `components/UserFullHistory.jsx`.
- Viewport-forcing helpers exist in 4 files (`app/ViewportFixer.js`, `components/ViewportFixer.js`, `components/ForceViewport.js`, `components/LayoutWrapper.js`); only `app/ViewportFixer.js` is mounted (in `app/layout.js`).
- `app/rule/page.js` and `app/setting/page.js` share the same rules-fetching/grouping logic; `rule` is unlinked from the nav.

### Dead / incomplete code

`components/MatchList.jsx` and `components/UserInfo.jsx` are empty. `app/api/gasApi.js` (`getUserInfo` helper) is never imported. `app/chat/page.js` POSTs to `/api/ask`, which does not exist. `chart.js` / `react-chartjs-2` are dependencies with no imports (charts use `recharts`).

### Config notes

- Both `next.config.js` and `next.config.mjs` exist; Next resolves `.js` first, so `.mjs` is ignored.
- `.gitattributes` enforces LF (`* text=auto eol=lf`); `.vscode/settings.json` sets `files.eol` to `\n`. Editing on Windows no longer produces CRLF churn.
- Popup windows (`popup1`, `popup2`, and the user popup) gate re-display with `localStorage` expiry timestamps.

## Conventions

- Commit messages follow `N차커밋(한글 설명)` and land directly on `master`.
- UI text, comments, and log messages are primarily Korean.
