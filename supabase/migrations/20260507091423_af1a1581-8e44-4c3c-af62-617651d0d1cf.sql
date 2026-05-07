
ALTER TABLE public.auth_rate_limits
  ADD COLUMN IF NOT EXISTS identifier text;

-- Drop legacy uniqueness assumption (none enforced) and add a partial-safe unique index
CREATE UNIQUE INDEX IF NOT EXISTS auth_rate_limits_ip_type_ident_uidx
  ON public.auth_rate_limits (attempt_type, ip_address, COALESCE(identifier, ''));
