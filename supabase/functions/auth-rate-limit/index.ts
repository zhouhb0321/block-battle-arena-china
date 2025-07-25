import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitRequest {
  ip_address: string;
  attempt_type: 'login' | 'registration' | 'password_reset';
  identifier?: string; // email or username
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { ip_address, attempt_type, identifier }: RateLimitRequest = await req.json();

    if (!ip_address || !attempt_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get current rate limit record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('auth_rate_limits')
      .select('*')
      .eq('ip_address', ip_address)
      .eq('attempt_type', attempt_type)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching rate limit record:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    
    // Rate limiting rules
    const limits = {
      login: { maxAttempts: 5, windowMs: oneHour, blockDurationMs: 30 * 60 * 1000 }, // 5 attempts per hour, 30min block
      registration: { maxAttempts: 3, windowMs: oneHour, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts per hour, 1hr block
      password_reset: { maxAttempts: 3, windowMs: oneHour, blockDurationMs: 60 * 60 * 1000 } // 3 attempts per hour, 1hr block
    };

    const limit = limits[attempt_type];

    if (existingRecord) {
      // Check if currently blocked
      if (existingRecord.blocked_until && new Date(existingRecord.blocked_until) > now) {
        const blockedUntil = new Date(existingRecord.blocked_until);
        return new Response(
          JSON.stringify({ 
            blocked: true, 
            blocked_until: blockedUntil.toISOString(),
            message: `Too many ${attempt_type} attempts. Try again later.`
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if we're in a new time window
      const firstAttemptTime = new Date(existingRecord.first_attempt);
      const timeSinceFirst = now.getTime() - firstAttemptTime.getTime();

      if (timeSinceFirst > limit.windowMs) {
        // Reset the window
        const { error: updateError } = await supabase
          .from('auth_rate_limits')
          .update({
            attempts: 1,
            first_attempt: now.toISOString(),
            last_attempt: now.toISOString(),
            blocked_until: null
          })
          .eq('id', existingRecord.id);

        if (updateError) {
          console.error('Error resetting rate limit:', updateError);
        }

        return new Response(
          JSON.stringify({ allowed: true, attempts: 1, limit: limit.maxAttempts }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Increment attempts
      const newAttempts = existingRecord.attempts + 1;
      let blockedUntil = null;

      if (newAttempts >= limit.maxAttempts) {
        blockedUntil = new Date(now.getTime() + limit.blockDurationMs).toISOString();
      }

      const { error: updateError } = await supabase
        .from('auth_rate_limits')
        .update({
          attempts: newAttempts,
          last_attempt: now.toISOString(),
          blocked_until: blockedUntil
        })
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Error updating rate limit:', updateError);
      }

      // Log security event for suspicious activity
      if (newAttempts >= limit.maxAttempts) {
        await supabase.from('security_events').insert({
          event_type: `${attempt_type}_rate_limit_exceeded`,
          event_data: {
            ip_address,
            identifier,
            attempts: newAttempts,
            blocked_until: blockedUntil
          },
          ip_address: ip_address,
          user_agent: req.headers.get('user-agent')
        });
      }

      if (blockedUntil) {
        return new Response(
          JSON.stringify({ 
            blocked: true, 
            blocked_until: blockedUntil,
            message: `Too many ${attempt_type} attempts. Account temporarily blocked.`
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          allowed: true, 
          attempts: newAttempts, 
          limit: limit.maxAttempts,
          remaining: limit.maxAttempts - newAttempts
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Create new rate limit record
      const { error: insertError } = await supabase
        .from('auth_rate_limits')
        .insert({
          ip_address,
          attempt_type,
          attempts: 1,
          first_attempt: now.toISOString(),
          last_attempt: now.toISOString()
        });

      if (insertError) {
        console.error('Error creating rate limit record:', insertError);
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          allowed: true, 
          attempts: 1, 
          limit: limit.maxAttempts,
          remaining: limit.maxAttempts - 1
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});