-- Add 'automation_complete' value to onboarding_status enum
ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'automation_complete';