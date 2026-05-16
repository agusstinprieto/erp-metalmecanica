-- Añadir URL del Acelerador de Software a la configuración del tenant
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS software_accelerator_url TEXT;

-- Actualizar McVill Global con una URL de ejemplo (placeholder para ser reemplazado por la real de Vercel)
UPDATE tenants 
SET software_accelerator_url = 'https://mcvill-software-accelerator.vercel.app'
WHERE id = 'dbae9a89-8d53-4423-814e-3a30cea719a8';
