# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Math Academy Stats is a cross-browser extension (Chrome/Firefox) built with WXT framework, React, and TypeScript. It fetches and analyzes user activity data from Math Academy's API, providing statistics, visualizations, and data export capabilities.

## Development Commands

```bash
pnpm run dev           # Chrome development server with hot reload
pnpm run dev:firefox   # Firefox development server with hot reload
pnpm run build         # Build Chrome extension (output: .output/chrome-mv3/)
pnpm run build:firefox # Build Firefox extension (output: .output/firefox-mv2/)
pnpm run compile       # Type check without emitting files
pnpm run lint          # ESLint
pnpm run format        # Prettier (format:check to verify only)
pnpm run check         # compile + lint + format:check (CI runs this plus both builds)
pnpm run zip           # Create zip for Chrome (zip:firefox for Firefox)
```

## Architecture

### Entry Points (entrypoints/)

WXT uses a file-based entrypoint system. Each HTML file at the top level is a page (opened in a new tab from the popup); its React code lives in the same-named directory.

- **popup/**: Extension popup UI
  - `App.tsx` - Report list (data-driven via `REPORT_PAGES`), fetch/refresh, exports
  - `fetchActivities.ts` - Paginated API fetching with localStorage caching, hostname detection, and deduplication
  - `downloads.ts` - JSON/CSV export
  - `stats.ts` - XP-per-minute statistics (used by the stats page)
- **overview/**: Daily overview with uPlot time-series charts (`overview-calculations.ts` for aggregation, `chart-data.ts` for chart series)
- **stats/**: XP/minute percentile + threshold tables by course and activity type
- **histograms/**: XP/min distributions per course for lessons and reviews
- **daily-xp/**: Histogram of daily XP totals
- **heatmap/**: GitHub-style activity calendar
- **task-types/**: Activity counts and XP by category
- **weekday/**: Average XP by day of week
- **frontier/**: Upcoming ("frontier") topics fetched live from the knowledge-graph API; needs `studentId`/`courseId` from the Math Academy page via the content scripts
- **background.ts**: Empty; exists because WXT needs the entrypoint
- **content-isolated.ts / content-main.ts**: Bridge to read `studentId`/`courseId` from the page's JS context (MAIN world reads the variables, ISOLATED world relays them over `window.postMessage` to the extension)

### Shared Code

- `components/` - `PageStatus` (loading/error/empty screens), `CategoricalBarChart` (uPlot bar chart)
- `hooks/` - `useStoredActivities` (loads activities every report page starts from)
- `utils/` - `storage.ts` (storage keys + helpers), `dates.ts` (`toLocalDateKey`), `classify-activity.ts` (single source of truth for lesson/review/quiz/multistep/diagnostic categorization)
- `types/mathacademy.ts` - Core data models: Activity, Course, Topic, Test, CourseStats, knowledge-graph types
- `docs/api-samples/` - Example API responses for `/api/previous-tasks/` and the knowledge graph

### Data Flow

1. **Fetch**: Popup calls `/api/previous-tasks/` with pagination and deduplication; caches in localStorage (key `mathacademyActivitiesCache`); stops when it hits a cached activity (incremental updates); fetches a 3-year window with 1000-day jumps on empty pages
2. **Store**: Raw activities are saved to `browser.storage.local` (key in `utils/storage.ts`) when a report is opened
3. **Display**: Report pages read from storage via `useStoredActivities` and render tables/charts (uPlot)

## Key Technical Details

- **WXT**: file-based entrypoints; MV3 (Chrome) and MV2 (Firefox) from one codebase; config in `wxt.config.ts`
- **Browser APIs**: `browser` global (polyfilled by WXT); `browser.storage.local` for cross-page data; `browser.tabs` for navigation and hostname detection
- **Path alias**: `@/` resolves to project root
- **PublicPath**: `browser.runtime.getURL` paths are typechecked against WXT's generated `PublicPath` union

## Common Gotchas

- **Content script registration**: WXT builds the content-script entrypoints but does not put MAIN-world scripts in the manifest; both are registered manually in `wxt.config.ts`. Removing that block silently drops them from the manifest.
- **API date format**: `fetchActivities.ts` formats cursor dates as PST strings (`toPSTPathString`) because that's what the API expects in the URL path.
- **Hostname detection**: API calls target whichever of `mathacademy.com` / `www.mathacademy.com` the user is logged in to (detected from the active tab).
- **Outlier filtering**: XP/min statistics exclude activities with duration > 2 hours (user likely left the page open).
- **Diagnostics**: treated as 100% attainment (earned XP used as both numerator and denominator) because diagnostics have no fixed base point value.
- **Course attribution**: use `test.course.name`, not `topic.course.name` — it reflects the course the user was in, even when reviewing material from a prior course.
- **Quiz detection**: some quizzes have a non-quiz `type`; `classifyActivity` checks the test name first. Always use it instead of ad-hoc type checks.
- **Daily grouping**: always via `toLocalDateKey` (local timezone), never `toISOString()` (UTC shifts evening activities to the wrong day).
