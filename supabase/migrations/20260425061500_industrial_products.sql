-- Seed de Productos Industriales y BOM para McVill Forge
-- Paso 1: Insertar Productos (Ensambles Finales)
INSERT INTO products (sku, name, description, revision, status)
VALUES 
('PROD-COL-IPR8', 'Columna IPR-8 Reforzada', 'Columna estructural principal para naves industriales con refuerzo en base.', 'A', 'active'),
('PROD-TRB-4FT', 'Trabe de Conexión 4ft', 'Trabe horizontal para unión de marcos rígidos.', 'B', 'active'),
('PROD-PL-ANC', 'Placa de Anclaje 12x12', 'Placa base para cimentación con perforaciones para pernos.', 'A', 'active')
ON CONFLICT (sku) DO NOTHING;

-- Paso 2: Definir BOM (Lista de Materiales)
-- Columna IPR-8 consume Perfil IPR, Electrodos y Pintura
INSERT INTO bom_items (product_id, component_name, material_id, quantity, unit)
SELECT 
    p.id, 
    'Perfil IPR 8" x 4"', 
    m.id, 
    6.0, -- 6 metros por columna
    'm'
FROM products p, materials m
WHERE p.sku = 'PROD-COL-IPR8' AND m.sku = 'STL-IPR-0804'
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (product_id, component_name, material_id, quantity, unit)
SELECT 
    p.id, 
    'Electrodos E7018', 
    m.id, 
    2.5, -- 2.5 kg por columna
    'kg'
FROM products p, materials m
WHERE p.sku = 'PROD-COL-IPR8' AND m.sku = 'CNS-WLD-7018'
ON CONFLICT DO NOTHING;

-- Placa de Anclaje consume Placa de Acero
INSERT INTO bom_items (product_id, component_name, material_id, quantity, unit)
SELECT 
    p.id, 
    'Placa de Acero 1/2"', 
    m.id, 
    0.25, -- 0.25 pzas (4 placas por placa completa)
    'pza'
FROM products p, materials m
WHERE p.sku = 'PROD-PL-ANC' AND m.sku = 'STL-PL-A36-12'
ON CONFLICT DO NOTHING;

-- Trabe consume Perfil IPR
INSERT INTO bom_items (product_id, component_name, material_id, quantity, unit)
SELECT 
    p.id, 
    'Perfil IPR 8" x 4"', 
    m.id, 
    4.0, -- 4 metros
    'm'
FROM products p, materials m
WHERE p.sku = 'PROD-TRB-4FT' AND m.sku = 'STL-IPR-0804'
ON CONFLICT DO NOTHING;
