-- Migration: Create ai_token_usage table for tracking token consumption per user
-- ⚠️ IA.AGUS: Zero Hardcoding - Dynamic Tenant Logging

CREATE TABLE IF NOT EXISTS public.ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  module_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own AI usage" ON public.ai_token_usage;
DROP POLICY IF EXISTS "Admins can view all AI usage in their tenant" ON public.ai_token_usage;

-- RLS Policies
CREATE POLICY "Users can view their own AI usage" ON public.ai_token_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI usage in their tenant" ON public.ai_token_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin', 'godmode', 'ceo', 'sistemas')
      AND profiles.tenant_id = ai_token_usage.tenant_id
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user ON public.ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_tenant ON public.ai_token_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON public.ai_token_usage(created_at);
