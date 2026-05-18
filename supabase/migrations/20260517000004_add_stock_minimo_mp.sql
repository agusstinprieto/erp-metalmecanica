-- Add stock_minimo_mp to materiales table
-- Required by Dashboard, PlanningView, and agentService to track low-stock alerts
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS stock_minimo_mp NUMERIC;
