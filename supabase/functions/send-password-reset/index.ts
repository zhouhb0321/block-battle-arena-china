import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate-limit configuration for password reset requests.
// Note: ad-hoc DB-backed limiter — IP can be spoofed via proxy pools, and DB
// counters race under concurrency. Acceptable as a basic abuse mitigation
// until proper edge limiting infra exists. Per project policy, do NOT add
// rate limiting elsewhere.
const IP_WINDOW_MS = 60 * 60 * 1000;     // 1 hour
const IP_MAX = 10;                        // 10 reset requests / IP / hour
const EMAIL_WINDOW_MS = 60 * 60 * 1000;   // 1 hour
const EMAIL_MAX = 3;                      // 3 reset requests / email / hour
const BLOCK_MS = 30 * 60 * 1000;          // 30 min block when exceeded

// Constant-ish response delay to mitigate timing-based user enumeration.
const TIMING_DELAY_MS = 350;

const SAFE_RESPONSE = {
  status: 200,
  body: { message: 'If the email exists, a reset link has been sent.' },
};

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-real-ip')
      ?? '0.0.0.0';
}

function isValidEmail(email: string): boolean {
  return typeof email === 'string'
    && email.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Atomically count + (optionally) block a given (ip, identifier, attempt_type) bucket.
 * Returns true when the request is allowed, false when rate-limited.
 */
async function checkAndBump(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  identifier: string | null,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const attemptType = 'password_reset';
  const now = new Date();

  const { data: existing } = await supabase
    .from('auth_rate_limits')
    .select('*')
    .eq('attempt_type', attemptType)
    .eq('ip_address', ip)
    .eq('identifier', identifier ?? '')
    .maybeSingle();

  if (existing) {
    if (existing.blocked_until && new Date(existing.blocked_until) > now) {
      return false;
    }

    const firstAt = new Date(existing.first_attempt).getTime();
    if (now.getTime() - firstAt > windowMs) {
      await supabase.from('auth_rate_limits').update({
        attempts: 1,
        first_attempt: now.toISOString(),
        last_attempt: now.toISOString(),
        blocked_until: null,
      }).eq('id', existing.id);
      return true;
    }

    const newAttempts = (existing.attempts ?? 0) + 1;
    const blockedUntil = newAttempts > max
      ? new Date(now.getTime() + BLOCK_MS).toISOString()
      : null;

    await supabase.from('auth_rate_limits').update({
      attempts: newAttempts,
      last_attempt: now.toISOString(),
      blocked_until: blockedUntil,
    }).eq('id', existing.id);

    return newAttempts <= max;
  }

  await supabase.from('auth_rate_limits').insert({
    ip_address: ip,
    identifier: identifier ?? '',
    attempt_type: attemptType,
    attempts: 1,
    first_attempt: now.toISOString(),
    last_attempt: now.toISOString(),
  });
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Always run a constant-time delay alongside the request handling so that
  // rate-limited / unknown / known-email paths all return on roughly the
  // same wall-clock budget. Prevents timing-based user enumeration.
  const timingDelay = new Promise((r) => setTimeout(r, TIMING_DELAY_MS));

  const safeOk = async () => {
    await timingDelay;
    return new Response(JSON.stringify(SAFE_RESPONSE.body), {
      status: SAFE_RESPONSE.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isValidEmail(email)) {
      // Generic safe response — never confirm the email is invalid vs unknown.
      return await safeOk();
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ip = getClientIp(req);

    // Per-IP limit
    const ipAllowed = await checkAndBump(supabase, ip, null, IP_WINDOW_MS, IP_MAX);
    if (!ipAllowed) {
      await supabase.from('security_events').insert({
        event_type: 'password_reset_rate_limited_ip',
        event_data: { ip, attempts: '>' + IP_MAX },
        ip_address: ip,
        user_agent: req.headers.get('user-agent'),
        severity: 'warn',
      });
      return await safeOk();
    }

    // Per-email limit (stored under same IP row keyed by identifier=email)
    const emailAllowed = await checkAndBump(supabase, ip, email, EMAIL_WINDOW_MS, EMAIL_MAX);
    if (!emailAllowed) {
      await supabase.from('security_events').insert({
        event_type: 'password_reset_rate_limited_email',
        event_data: { ip, attempts: '>' + EMAIL_MAX },
        ip_address: ip,
        user_agent: req.headers.get('user-agent'),
        severity: 'warn',
      });
      return await safeOk();
    }

    // O(1) lookup — no listUsers enumeration.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      return await safeOk();
    }

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });
    if (tokenError) throw tokenError;

    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/reset-password?token=${resetToken}`,
      },
    });
    if (resetError) throw resetError;

    return await safeOk();
  } catch (error) {
    console.error('Password reset error:', error);
    // Still return the unified safe response — never reveal failure mode.
    return await safeOk();
  }
});
