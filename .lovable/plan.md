

# Security Audit & Fix Plan

The security scan found **16 issues** (2 critical errors, 14 warnings). Here's the fix plan organized by severity.

---

## Critical Fixes (Errors)

### 1. Password reset tokens accessible to all users
The `password_reset_tokens` table has `USING (true)` for ALL commands — any user (even unauthenticated) can read, modify, or delete reset tokens for any account.

**Fix**: Replace the policy to restrict access to `service_role` only.

### 2. Users can self-assign premium subscription tiers
The `user_profiles` UPDATE policy has no `WITH CHECK`, allowing users to set `subscription_tier`, `user_type`, and `rank` to arbitrary values.

**Fix**: Add a `WITH CHECK` that prevents modifying privileged columns, or create a restricted update policy.

---

## Important Fixes (Warnings)

### 3. Users can overwrite their own ELO rating
The `league_rankings` UPDATE policy lets users set `elo_rating`, `peak_rating`, `rank_tier` etc. to any value.

**Fix**: Drop the user-level UPDATE policy. Ranking changes should only happen via service_role.

### 4. Players can alter match outcomes
The `ranked_matches` UPDATE policy lets players change `winner_id`, ratings, and status.

**Fix**: Drop user-level UPDATE or restrict to only non-sensitive fields (e.g. status changes for forfeiting).

### 5. Advertisement budget data exposed
All authenticated users can see `budget`, `spent`, `frequency_cap` etc.

**Fix**: Drop the overly broad policy; keep only the `is_active = true` policy for regular users.

### 6. Overly permissive RLS (WITH CHECK true) on 8 tables
Tables like `security_events`, `user_session_logs`, `match_games`, `battle_records`, `ad_clicks`, `ad_impressions`, `user_badges`, `password_reset_tokens` have INSERT policies with `WITH CHECK (true)`.

**Fix**: For system-insert tables (match_games, battle_records, security_events, etc.), change to `auth.role() = 'authenticated'` or `service_role` as appropriate. Some like `ad_impressions` may intentionally allow anonymous inserts.

### 7. Auth configuration
- OTP expiry too long — requires manual change in Supabase dashboard
- Leaked password protection disabled — requires manual toggle in dashboard
- Postgres version has security patches — requires upgrade in dashboard

---

## Database Migration (SQL)

The implementation will execute a single migration covering items 1-6:

```sql
-- 1. Fix password_reset_tokens: restrict to service_role only
DROP POLICY "System can manage password reset tokens" ON password_reset_tokens;
CREATE POLICY "Service role manages tokens" ON password_reset_tokens
  FOR ALL TO public USING (auth.role() = 'service_role');

-- 2. Fix user_profiles: restrict privileged column updates
DROP POLICY "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update own non-privileged fields" ON user_profiles
  FOR UPDATE TO public
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND subscription_tier IS NOT DISTINCT FROM (SELECT subscription_tier FROM user_profiles WHERE id = auth.uid())
    AND user_type IS NOT DISTINCT FROM (SELECT user_type FROM user_profiles WHERE id = auth.uid())
    AND rank IS NOT DISTINCT FROM (SELECT rank FROM user_profiles WHERE id = auth.uid())
  );

-- 3. Fix league_rankings: remove user UPDATE
DROP POLICY "Users can update their own ranking" ON league_rankings;

-- 4. Fix ranked_matches: remove user UPDATE
DROP POLICY "Users can update their own matches" ON ranked_matches;

-- 5. Fix advertisements: remove broad authenticated policy
DROP POLICY "Authenticated users can view all advertisements" ON advertisements;

-- 6. Fix overly permissive INSERT policies
DROP POLICY "System can insert battle records" ON battle_records;
CREATE POLICY "Authenticated can insert battle records" ON battle_records
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "System can insert game records" ON match_games;
CREATE POLICY "Authenticated can insert game records" ON match_games
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "System can insert security events" ON security_events;
CREATE POLICY "Authenticated or service can insert security events" ON security_events
  FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

DROP POLICY "System can insert user badges" ON user_badges;
CREATE POLICY "Authenticated can insert user badges" ON user_badges
  FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');
```

## Manual Steps (Not automatable)

After the code fix, you should go to the Supabase dashboard and:
1. **Reduce OTP expiry** — Auth settings
2. **Enable leaked password protection** — Auth settings
3. **Upgrade Postgres version** — Infrastructure settings

---

## Summary

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | Password reset tokens exposed | Error | Restrict to service_role |
| 2 | Self-assign subscription tier | Error | WITH CHECK on privileged cols |
| 3 | ELO rating manipulation | Warn | Drop user UPDATE policy |
| 4 | Match outcome tampering | Warn | Drop user UPDATE policy |
| 5 | Ad budget data exposed | Warn | Drop broad SELECT policy |
| 6 | Permissive INSERT policies | Warn | Restrict to authenticated |
| 7 | Auth config (OTP/passwords/PG) | Warn | Manual dashboard changes |

