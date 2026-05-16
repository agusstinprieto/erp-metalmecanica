-- Actualizar el objeto config JSONB del tenant con la URL del acelerador
UPDATE tenants 
SET config = config || jsonb_build_object('software_accelerator_url', 'https://mcvill-software-accelerator.vercel.app')
WHERE id = 'dbae9a89-8d53-4423-814e-3a30cea719a8';
