-- Seed Industrial para McVill Forge
-- Insertar Materiales Base
INSERT INTO materials (name, sku, category, unit, stock_quantity, min_stock, unit_cost, metadata)
VALUES 
('Placa de Acero A36 1/2"', 'STL-PL-A36-12', 'Acero', 'pza', 45.0, 10.0, 1250.00, '{"origin": "Altos Hornos", "dimensions": "4x10 ft"}'),
('Perfil IPR 8" x 4"', 'STL-IPR-0804', 'Acero', 'm', 120.0, 30.0, 450.50, '{"weight_per_m": "15kg"}'),
('Electrodo E7018 1/8"', 'CNS-WLD-7018', 'Consumibles', 'kg', 250.0, 50.0, 85.00, '{"brand": "Lincoln Electric"}'),
('Pintura Epóxica Gris Industrial', 'CHM-PNT-EPX-GR', 'Pintura', 'gal', 15.0, 20.0, 1100.00, '{"ral": "7040"}'),
('Disco de Corte 4 1/2"', 'TLS-DSC-CRT-45', 'Herramientas', 'pza', 8.0, 25.0, 45.00, '{"max_rpm": "13000"}');

-- Insertar Movimientos Iniciales para Trazabilidad
INSERT INTO inventory_movements (material_id, type, quantity, reason, metadata)
SELECT id, 'IN', 50, 'Carga inicial de inventario - Protocolo Apertura', '{"operator": "SISTEMA_AGUS"}' FROM materials;

-- Simular consumo bajo en un material (Pintura y Discos) para activar alertas
UPDATE materials SET stock_quantity = 15 WHERE sku = 'CHM-PNT-EPX-GR';
UPDATE materials SET stock_quantity = 8 WHERE sku = 'TLS-DSC-CRT-45';
