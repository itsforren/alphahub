-- Add team column to support_agents for categorizing agents (Customer Service, Tech Support, etc.)
ALTER TABLE public.support_agents
ADD COLUMN IF NOT EXISTS team text DEFAULT 'customer_service';

-- Add comment explaining the column
COMMENT ON COLUMN public.support_agents.team IS 'Team categorization: customer_service, tech_support, management, etc.';

-- Add link_preview column to chat_messages for caching OG metadata
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS link_preview jsonb DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.chat_messages.link_preview IS 'Cached Open Graph metadata for URLs in the message';