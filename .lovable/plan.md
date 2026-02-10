

# Plan: Friend System E2E Testing + Enhanced Global Top 500 Leaderboard Page

## Overview

Two main tasks:
1. **Manual E2E Testing** of the friend system (search, request, messaging) - this is a verification task, not code changes
2. **Enhanced Global Top 500 Leaderboard Page** - upgrade `LeaderboardView.tsx` with i18n, filtering, search, share links, and a back button

---

## Task 1: Friend System E2E Verification

This is a testing/verification task. I will navigate the app in the browser to:
- Open the Friend System panel
- Search for a user by username
- Attempt to send a friend request
- Open the private chat dialog
- Verify real-time message subscription is set up
- Report any bugs found

No code changes needed unless bugs are discovered.

---

## Task 2: Enhanced Global Top 500 Leaderboard Page

### Current Issues
- All UI text in `LeaderboardView.tsx` is hardcoded in Chinese (no i18n)
- No username search or filtering
- No share replay link button
- No back button to return to home
- Date formatting hardcoded to `zh-CN` locale

### Changes

#### 2a. Update `LeaderboardView.tsx`
- Add `useLanguage()` hook and replace all hardcoded Chinese strings with `t()` calls
- Add `onBack` prop for navigation back to home
- Add username search/filter input at the top
- Add a "Share Replay Link" button next to each "Watch Replay" button (using the existing `/replay/:id` route)
- Use locale-aware date formatting based on current language
- Add PPS/APM range filters (optional enhancement)

#### 2b. Update `src/contexts/LanguageContext.tsx`
Add ~30 new translation keys under `leaderboard.*` namespace across all 6 languages:
- `leaderboard.title` - "Global Leaderboard"
- `leaderboard.refresh` - "Refresh"
- `leaderboard.sprint40Tab` - "40-Line Sprint - Top 500"
- `leaderboard.timeAttack2Tab` - "2-Min Time Attack - Top 500"
- `leaderboard.sprint40Title` - "40-Line Sprint - Fastest 500"
- `leaderboard.timeAttack2Title` - "2-Min Time Attack - Top 500 Scores"
- `leaderboard.noData` - "No leaderboard data yet"
- `leaderboard.loading` - "Loading leaderboard..."
- `leaderboard.playable` - "Playable"
- `leaderboard.incomplete` - "Incomplete data"
- `leaderboard.watchReplay` - "Watch Replay"
- `leaderboard.cantPlay` - "Can't play"
- `leaderboard.score` - "Score"
- `leaderboard.lines` - "Lines"
- `leaderboard.points` - "pts"
- `leaderboard.searchPlayer` - "Search player..."
- `leaderboard.shareReplay` - "Share"
- `leaderboard.linkCopied` - "Replay link copied!"

#### 2c. Update `src/pages/Index.tsx`
- Pass `onBack` handler to `LeaderboardView`

---

## Technical Details

### Files Modified
| File | Change |
|------|--------|
| `src/components/LeaderboardView.tsx` | Add i18n, search filter, share button, back button, locale-aware dates |
| `src/contexts/LanguageContext.tsx` | Add ~30 `leaderboard.*` keys x 6 languages |
| `src/pages/Index.tsx` | Pass `onBack` prop to LeaderboardView |

### No Database Changes Required
All data queries remain the same - only UI/UX improvements.

