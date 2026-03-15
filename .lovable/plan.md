

# Pre-Launch Readiness Test Plan

Based on a thorough code review and security scan, here's the comprehensive verification plan before publishing.

---

## Current Status

The security scan found **11 remaining issues** (3 errors, 8 warnings). The previous migration fixed some but new/deeper issues were detected.

---

## Phase 1: Critical Security Fixes (Must Fix Before Launch)

### Error 1: Badge privilege escalation
`user_badges` INSERT policy only checks `authenticated` — any user can grant any badge to any account.
**Fix**: Change `WITH CHECK` to `(auth.uid() = user_id)`.

### Error 2: Game stats manipulation
`user_profiles` UPDATE allows users to freely modify `rating`, `games_played`, `games_won`, `total_score`, `best_pps`, `best_apm`, `email`, `friend_limit`, `username_changes_used`, etc.
**Fix**: Restrict the UPDATE policy to only allow changes to safe fields (`username`, `avatar_url`). All stats must be updated via server-side functions only.

### Error 3: Battle room passwords exposed
The `battle_rooms` SELECT policy for `status = 'waiting'` exposes `room_password` to all authenticated users.
**Fix**: Create a view or use a security-definer function that excludes `room_password` from public queries.

### Warning: Fabricated records
`battle_records`, `match_games`, `user_session_logs` INSERT policies don't verify the inserting user is a participant.
**Fix**: Add `auth.uid() = winner_id OR auth.uid() = loser_id` (or `= user_id`) checks.

### Code-Level: MFA code in sessionStorage
`AdminAuth.tsx` line 109 stores MFA code in client-side `sessionStorage` and logs it to console (line 130). This is a **critical security flaw** — any user can read the MFA code from browser storage.
**Fix**: Remove the `console.log` of MFA code. Add a comment that this needs server-side MFA in production, or remove the fake MFA entirely since admin access already uses Supabase auth + role checks.

### Code-Level: Duplicate/conflicting CSP
`index.html` and `securityHeaders.ts` both set CSP meta tags with different rules (the JS one is more restrictive and blocks `*.lovable.dev`, `*.supabase.co` connect-src patterns). The `index.html` CSP takes precedence and the JS one may conflict.
**Fix**: Remove the JS-generated CSP from `securityHeaders.ts` (keep only `index.html`), or unify them.

---

## Phase 2: Code Quality for Production

### Remove debug artifacts
- `FixSummary.tsx` — renders an empty Card (development artifact). Remove from `Index.tsx` import.
- ~2700 `console.log/warn/error` calls across 104 files — excessive for production. Not blocking but worth noting.

### Ad financial data still exposed
The `advertisements` table SELECT policies still expose `budget` and `spent` columns to anyone viewing active ads. Create a view with only display fields.

---

## Phase 3: Functional Verification

These are verification items (not code changes):
1. **Auth flow**: Login, register, guest login, password reset, session timeout
2. **Game flow**: Single player start, game over, score saving
3. **Multiplayer**: Room creation, joining by code, battle flow
4. **Subscription**: Checkout redirect, portal access, status check
5. **i18n**: Language switching across all 6 languages
6. **Mobile**: Responsive layout on small screens
7. **PWA**: Service worker caching, offline fallback

---

## Implementation Plan

A single SQL migration to fix all RLS issues (errors + warnings), plus a code edit to fix the MFA console.log and CSP conflict.

### Migration SQL

```sql
-- 1. Fix user_badges: restrict to own user_id
DROP POLICY IF EXISTS "Authenticated can insert user badges" ON user_badges;
CREATE POLICY "Users can insert own badges" ON user_badges
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

-- 2. Fix user_profiles: restrict UPDATE to safe fields only
DROP POLICY IF EXISTS "Users can update own non-privileged fields" ON user_profiles;
CREATE POLICY "Users can update own safe fields" ON user_profiles
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND subscription_tier IS NOT DISTINCT FROM (SELECT up.subscription_tier FROM user_profiles up WHERE up.id = auth.uid())
    AND user_type IS NOT DISTINCT FROM (SELECT up.user_type FROM user_profiles up WHERE up.id = auth.uid())
    AND rank IS NOT DISTINCT FROM (SELECT up.rank FROM user_profiles up WHERE up.id = auth.uid())
    AND rating IS NOT DISTINCT FROM (SELECT up.rating FROM user_profiles up WHERE up.id = auth.uid())
    AND games_played IS NOT DISTINCT FROM (SELECT up.games_played FROM user_profiles up WHERE up.id = auth.uid())
    AND games_won IS NOT DISTINCT FROM (SELECT up.games_won FROM user_profiles up WHERE up.id = auth.uid())
    AND total_score IS NOT DISTINCT FROM (SELECT up.total_score FROM user_profiles up WHERE up.id = auth.uid())
    AND total_lines IS NOT DISTINCT FROM (SELECT up.total_lines FROM user_profiles up WHERE up.id = auth.uid())
    AND best_pps IS NOT DISTINCT FROM (SELECT up.best_pps FROM user_profiles up WHERE up.id = auth.uid())
    AND best_apm IS NOT DISTINCT FROM (SELECT up.best_apm FROM user_profiles up WHERE up.id = auth.uid())
    AND email IS NOT DISTINCT FROM (SELECT up.email FROM user_profiles up WHERE up.id = auth.uid())
    AND friend_limit IS NOT DISTINCT FROM (SELECT up.friend_limit FROM user_profiles up WHERE up.id = auth.uid())
    AND username_changes_used IS NOT DISTINCT FROM (SELECT up.username_changes_used FROM user_profiles up WHERE up.id = auth.uid())
    AND username_changes_count IS NOT DISTINCT FROM (SELECT up.username_changes_count FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 3. Fix battle_rooms: hide room_password via security definer function
CREATE OR REPLACE FUNCTION public.get_waiting_rooms()
RETURNS TABLE (
  id uuid, room_code varchar, mode varchar, status varchar,
  max_players int, current_players int, created_by uuid,
  created_at timestamptz, team_mode boolean, allow_spectators boolean,
  custom_settings jsonb, settings jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, room_code, mode, status, max_players, current_players,
         created_by, created_at, team_mode, allow_spectators,
         custom_settings, settings
  FROM battle_rooms WHERE status = 'waiting';
$$;

-- 4. Fix battle_records INSERT
DROP POLICY IF EXISTS "Authenticated can insert battle records" ON battle_records;
CREATE POLICY "Participants can insert battle records" ON battle_records
  FOR INSERT TO public WITH CHECK (auth.uid() = winner_id OR auth.uid() = loser_id);

-- 5. Fix match_games INSERT
DROP POLICY IF EXISTS "Authenticated can insert game records" ON match_games;
CREATE POLICY "Participants can insert game records" ON match_games
  FOR INSERT TO public WITH CHECK (auth.uid() = winner_id OR auth.uid() = loser_id);

-- 6. Fix user_session_logs INSERT
DROP POLICY IF EXISTS "Authenticated can insert session logs" ON user_session_logs;
CREATE POLICY "Users can insert own session logs" ON user_session_logs
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
```

### Code Changes
1. **AdminAuth.tsx**: Remove `console.log('MFA验证码:', code)` on line 130
2. **securityHeaders.ts**: Remove the JS-generated CSP block (lines 13-29) to avoid conflict with `index.html` CSP
3. **Index.tsx**: Remove unused `FixSummary` import

---

## Manual Dashboard Steps (Unchanged)
1. Enable leaked password protection
2. Upgrade Postgres version

