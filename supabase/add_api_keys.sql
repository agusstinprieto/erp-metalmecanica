-- Agregar columnas de API Keys a la tabla de tenants para evitar hardcoding
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT,
ADD COLUMN IF NOT EXISTS together_api_key TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
