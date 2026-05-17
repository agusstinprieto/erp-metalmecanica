-- Add project_id column to work_orders to align with code expectations
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES engineering_projects(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_project ON work_orders(project_id);