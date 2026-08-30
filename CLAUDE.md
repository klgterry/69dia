# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server on :3000 (Turbopack)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint (next/core-web-vitals)
```

There is **no test suite** — no test runner is installed and `package.json` has no `test` script. Verify changes by running `npm run dev` and exercising the affected page.

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

- **GET** forwards a fixed whitelist of query params (`action`, `username`, `season`, `playerA`, `playerB`, `limit`) to `NEXT_PUBLIC_GAS_URL`, `cache: "no-store"`. On JSON parse failure it returns the raw text with GAS's status code, so a client doing `.json()` can still blow up.
- **POST** passes the request body straight through; the operation is named by `action` inside the body (`getPlayersInfo`, `registerResult`).
- ~25 GET `action` values are in use (e.g. `getCurrentSeasonSummary`, `getUserSummary`, `getSeasonPrevRank`, `getGameHistory`, `getUserDuoStats`, `getWeeklyRanking`, `getPrizeData`, `getRules`, `getAwardData`, `getLeaderboard`).

### Everything renders client-side

Every page and most shared components are `"use client"` and fetch their own data in `useEffect` against `/api/gasApi?action=...`. There are no Server Components, no server data fetching, and no `loading.js` / `error.js` / `global-error.js`. Loading and error state is hand-rolled per page, and most `.catch` handlers only `console.error`, leaving the UI stuck on a spinner.

GAS response shapes are inconsistent (array vs `{ok, result}` vs `{players}`, `PLAYER` vs `username`), so consumers normalize defensively — see `app/week/page.js` `fetchLeaderboardForAllSeason`.

### Season list is hardcoded in two places

The season dropdown array (`{ TITLE: "26. 8월 시즌" }`, ~19 entries) is duplicated in `app/page.js` and `components/HeadToHeadSlide2.jsx`, even though a `getSeasonList` action exists (its call sites are commented out). **Opening a new season means editing both arrays and deploying** — this is what the `N차커밋(N월 시즌 시작)` commits do.

### Team balancing lives in the client

`app/ready/page.js` (~1500 lines, one `TeamPage` component, ~37 `useState`) contains the team-generation feature: input parsing (`parsePlayersInput`), MMR math (`calculateEffectiveMMR`), and the balancing algorithm (`seedHardSplit`, `buildTeamsByPairSplit`, `violatesPairSplit`, `buildTeamsByProposal` — pair constraints + randomness). Results are written back via `POST { action: "registerResult" }`. These are pure functions worth extracting/testing before modifying.

### Known duplication (change all copies together)

- `app/user/page.js` and `app/user-popup/page.js` are near-identical (~1000 lines each; the popup is opened via `window.open` with `?name=&season=`). A fix in one almost always needs the same fix in the other.
- The image-based nav bar (`{name, path}` array + `background-image` / `_hover.png` swap) is copy-pasted into ~9 page files.
- `classIconMap` (`"드" → "druid"`, etc.) is redefined in `app/history/page.js`, `components/DuoBalance.js`, `components/UserFullHistory.jsx`.
- Viewport-forcing helpers exist in 4 files (`app/ViewportFixer.js`, `components/ViewportFixer.js`, `components/ForceViewport.js`, `components/LayoutWrapper.js`); only `app/ViewportFixer.js` is mounted (in `app/layout.js`).
- `app/rule/page.js` and `app/setting/page.js` share the same rules-fetching/grouping logic; `rule` is unlinked from the nav.

### Dead / incomplete code

`components/MatchList.jsx` and `components/UserInfo.jsx` are empty. `app/api/gasApi.js` (`getUserInfo` helper) is never imported. `app/chat/page.js` POSTs to `/api/ask`, which does not exist. `chart.js` / `react-chartjs-2` are dependencies with no imports (charts use `recharts`).

### Config notes

- Both `next.config.js` and `next.config.mjs` exist; Next resolves `.js` first, so `.mjs` is ignored.
- Popup windows (`popup1`, `popup2`, and the user popup) gate re-display with `localStorage` expiry timestamps.
- The working tree carries large LF↔CRLF diffs and there is no `.gitattributes` / `.editorconfig`; scope commits to real changes and avoid reformatting whole files.

## Conventions

- Commit messages follow `N차커밋(한글 설명)` and land directly on `master`.
- UI text, comments, and log messages are primarily Korean.
