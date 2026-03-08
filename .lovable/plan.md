

# Stripe Payment Integration, Session Logging & Replay Traceability

## Current State

1. **Stripe**: `STRIPE_SECRET_KEY` is already in Supabase secrets. `SubscriptionPlans.tsx` calls a `create-checkout` edge function that doesn't exist yet. `RevenueManagement.tsx` uses mock data for payment records. No `stripe-webhook` function exists.
2. **Session logging**: `useSessionLogger` logs login/game_start/game_end to `user_session_logs` table, but logout is not logged, and there's no page navigation tracking or session duration calculation.
3. **Replay traceability**: `compressed_replays` has `id`, `match_id`, `game_id` columns but `game_id` and `match_id` are nullable with no enforced 1:1 relationship to `game_matches`. No unique constraint ensures one replay per game.

---

## Plan

### 1. Enable Stripe & Create Edge Functions

Use the Stripe enablement tool to activate the Stripe integration, which will provide the patterns for creating checkout sessions and webhook handling.

**Edge Functions to create:**

- **`create-checkout`**: Creates a Stripe Checkout session for the selected plan. Maps plan IDs to Stripe Price IDs. Creates/retrieves Stripe customer by user email. Returns checkout URL.
- **`stripe-webhook`**: Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`. Updates `subscribers` table with subscription status, tier, and end date.

**Database: `payment_records` table (new)**
- `id`, `user_id`, `stripe_payment_intent_id` (unique), `stripe_invoice_id`, `amount`, `currency`, `payment_type` (subscription/donation/one-time), `status` (succeeded/pending/failed/refunded), `description`, `created_at`
- RLS: users can view own records, admins can view all

### 2. Admin Payment Management UI

**File: `src/RevenueManagement.tsx`**
- Replace mock `fetchPaymentRecords` with real query to `payment_records` table
- Replace mock `fetchRevenueData` with aggregation query on `payment_records`
- Add Stripe account status indicator (connected/not connected)
- Currency display: use `$` (USD) instead of `¥`

### 3. Enhance Session Logging

**File: `src/hooks/useSessionLogger.ts`**
- Add `logout` event logging in `signOut` flow
- Add `page_view` session type for navigation tracking
- Add `session_duration` field to session_data (calculated from login to logout)
- Capture browser language, screen resolution, timezone in session_data

**File: `src/contexts/AuthContext.tsx`**
- Call `logUserSession('logout')` before signing out

### 4. Replay-Game 1:1 Traceability

**Database migration:**
- Add `game_match_id` column to `compressed_replays` referencing `game_matches(id)` with a unique constraint, ensuring each game has at most one replay
- Add index on `game_match_id` for fast lookups

**Code changes:**
- When saving a replay in `useReplayRecorderV4.ts`, pass the `game_match_id` to link the replay to its game record
- In `GameRecordManagement.tsx`, add a "View Replay" button that navigates to the linked replay by `game_match_id`

---

## Technical Details

### Stripe Checkout Flow
```text
User clicks Subscribe → SubscriptionPlans calls create-checkout edge function
→ Edge function creates Stripe Customer (if needed) + Checkout Session
→ Returns checkout URL → User redirected to Stripe
→ Payment completes → Stripe sends webhook → stripe-webhook edge function
→ Updates subscribers table + inserts payment_record
```

### payment_records table schema
```sql
CREATE TABLE public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,           -- in cents
  currency text NOT NULL DEFAULT 'usd',
  payment_type text NOT NULL,        -- 'subscription', 'donation', 'one_time'
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text UNIQUE,
  stripe_invoice_id text,
  stripe_subscription_id text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Files Modified/Created

| File | Changes |
|------|---------|
| `supabase/functions/create-checkout/index.ts` | New: Stripe checkout session creation |
| `supabase/functions/stripe-webhook/index.ts` | New: Webhook handler for payment events |
| `supabase/config.toml` | Add function configs with verify_jwt = false |
| `src/RevenueManagement.tsx` | Replace mock data with real payment_records queries |
| `src/hooks/useSessionLogger.ts` | Add logout/page_view logging, richer session_data |
| `src/contexts/AuthContext.tsx` | Call logout logger in signOut |
| `src/hooks/useReplayRecorderV4.ts` | Link replay to game_match_id |
| Database migration | Create payment_records table, add game_match_id to compressed_replays |

