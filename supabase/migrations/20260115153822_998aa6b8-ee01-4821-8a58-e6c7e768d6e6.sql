-- Add ticket_number column for human-readable ticket IDs
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS ticket_number SERIAL;

-- Create an index for faster lookups by ticket_number
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);

-- Reset all SLA deadlines to now + 24 hours based on priority (fresh start)
UPDATE public.support_tickets
SET sla_deadline = CASE 
  WHEN priority = 'urgent' THEN NOW() + INTERVAL '4 hours'
  WHEN priority = 'high' THEN NOW() + INTERVAL '8 hours'
  WHEN priority = 'normal' THEN NOW() + INTERVAL '24 hours'
  WHEN priority = 'low' THEN NOW() + INTERVAL '48 hours'
  ELSE NOW() + INTERVAL '24 hours'
END
WHERE status NOT IN ('resolved', 'closed');