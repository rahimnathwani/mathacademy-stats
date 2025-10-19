# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Math Academy Stats is a cross-browser extension (Chrome/Firefox) built with WXT framework, React, and TypeScript. It fetches and analyzes user activity data from Math Academy's API, providing statistics, visualizations, and data export capabilities.

## Development Commands

### Development
```bash
pnpm run dev           # Chrome development server with hot reload
pnpm run dev:firefox   # Firefox development server with hot reload
```

### Building
```bash
pnpm run build         # Build Chrome extension (output: .output/chrome-mv3/)
pnpm run build:firefox # Build Firefox extension (output: .output/firefox-mv2/)
pnpm run compile       # Type check without emitting files
```

### Packaging
```bash
pnpm run zip           # Create zip for Chrome
pnpm run zip:firefox   # Create zip for Firefox
```

## Architecture

### Entry Points (entrypoints/)
WXT uses a file-based entrypoint system. Each file defines a specific extension component:

- **popup/**: Extension popup UI
  - `App.tsx` - Main popup component with buttons for fetching data, exports, and navigation
  - `fetchActivities.ts` - Paginated API fetching with caching, hostname detection, and deduplication
  - `downloads.ts` - JSON/CSV export functionality
  - `stats.ts` - XP per minute statistics calculation (filters activities >2 hours, calculates percentiles)

- **stats/**: Statistics page (opened in new tab)
  - `StatsTable.tsx` - Displays XP/minute statistics by course with percentiles and threshold analysis
  - Reads data from `browser.storage.local` set by popup

- **overview/**: Overview page with charts (opened in new tab)
  - `OverviewPage.tsx` - Main overview UI with time range selection and course filtering
  - `overview-calculations.ts` - Daily aggregation, XP attainment, activity type counting, course transition detection
  - `chart-data.ts` - Prepares data for uPlot charting library
  - Reads activities from `browser.storage.local` set by popup

- **background.ts**: Minimal background script (required for extensions)
- **content.ts**: Content script (if needed for page interaction)

### Type Definitions (types/)
- `mathacademy.ts` - Core data models: Activity, Course, Topic, Test, CourseStats
- `browser.d.ts` - Browser extension API type augmentations

### Data Flow
1. **Fetch**: Popup calls Math Academy API (`/api/previous-tasks/`) with pagination and deduplication
   - Automatically detects hostname (mathacademy.com or www.mathacademy.com)
   - Uses localStorage cache (key: `mathacademyActivitiesCache`)
   - Stops when encountering cached activities (incremental updates)
   - Fetches 3-year window with 1000-day overlap on empty pages

2. **Store**: Raw activities and computed stats stored in `browser.storage.local`

3. **Display**: Stats/Overview pages read from storage and render tables/charts

### Statistics Calculation
- Filters activities completed within 2 hours of starting
- Calculates XP per minute: `pointsAwarded / durationMinutes`
- Groups by course (using `test.course.name`)
- Computes percentiles (25th, 50th, 75th) and threshold percentages

### Overview Calculations
- Daily aggregation of XP and activity counts
- XP attainment rate: earned vs possible XP (diagnostics treated as 100% attainment)
- Activity type classification: lessons, reviews, multisteps, quizzes, diagnostics
- Course transition detection for timeline annotations
- Time range filtering: 7/30/90 days or all-time

## Key Technical Details

### WXT Framework
- File-based entrypoint system (files in `entrypoints/` auto-registered)
- Supports both Manifest V3 (Chrome) and V2 (Firefox) from single codebase
- Config in `wxt.config.ts`

### Browser APIs
- Uses `browser` global (polyfilled by WXT for cross-browser compatibility)
- Storage: `browser.storage.local` for cross-page data sharing
- Tabs: `browser.tabs.create()` and `browser.tabs.query()` for navigation and hostname detection
- Runtime: `browser.runtime.getURL()` for extension internal URLs

### Charting
- uPlot library for efficient time-series visualization on overview page
- Custom legend implementation for better label visibility

### Path Aliases
- `@/` resolves to project root (configured via WXT's TypeScript setup)

## Common Gotchas

### Date Formatting in API
The `fetchActivities.ts` uses PST-formatted dates in API URLs (`toPSTPathString`) to match Math Academy's expected format.

### Hostname Detection
The extension auto-detects whether user is on `mathacademy.com` or `www.mathacademy.com` by querying active tab, ensuring API calls work regardless of which domain is used.

### Activity Filtering
Statistics intentionally exclude activities taking >2 hours (completed - started) to focus on typical learning sessions and exclude outliers where user left page open.

### Diagnostic Handling
Diagnostics are treated specially in XP attainment calculations - their earned XP is used as both numerator and denominator (100% attainment assumption) since diagnostics don't have fixed base point values.

### Course Attribution
Activities use `test.course.name` (not `topic.course.name`) because this represents the course the user was in when completing the activity, even if reviewing material from a prior course.
