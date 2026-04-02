-- Bulletproof GHL OAuth token refresh: DB-level locking to prevent race conditions
-- Problem: 27+ edge functions each try to refresh the token independently. When two
-- refresh simultaneously, one rotates the refresh token and the other gets invalid_grant.

ALTER TABLE ghl_oauth_tokens
  ADD COLUMN IF NOT EXISTS refresh_lock_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_lock_by TEXT,
  ADD COLUMN IF NOT EXISTS health_status TEXT NOT NULL DEFAULT 'healthy';

-- Optimistic lock acquisition: only one function can refresh at a time
CREATE OR REPLACE FUNCTION acquire_ghl_refresh_lock(p_locker TEXT)
RETURNS TABLE(id UUID, refresh_token TEXT, expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE ghl_oauth_tokens
  SET refresh_lock_until = now() + interval '10 seconds',
      refresh_lock_by = p_locker
  WHERE (refresh_lock_until IS NULL OR refresh_lock_until < now())
  RETURNING ghl_oauth_tokens.id, ghl_oauth_tokens.refresh_token,
            ghl_oauth_tokens.expires_at, ghl_oauth_tokens.updated_at;
END;
$$;

-- Lock release + save new tokens atomically
CREATE OR REPLACE FUNCTION release_ghl_refresh_lock(
  p_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE ghl_oauth_tokens
  SET access_token = p_access_token,
      refresh_token = p_refresh_token,
      expires_at = p_expires_at,
      refresh_lock_until = NULL,
      refresh_lock_by = NULL,
      health_status = 'healthy',
      updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Health status update (called by monitoring + alert system)
CREATE OR REPLACE FUNCTION update_ghl_health_status(p_status TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE ghl_oauth_tokens SET health_status = p_status, updated_at = now();
END;
$$;
