-- MCVILL ERP: Abastecimiento Seed Data
-- Sample data for testing the procurement module

-- Seed Proveedores
INSERT INTO proveedores (razon_social, rfc, categoria, ciudad, condicion_pago)
VALUES 
('Aceros Industriales del Norte S.A.', 'AIN901010ABC', 'material', 'Monterrey', 'credito_30'),
('Ferretería El Tornillo', 'FTO850505XYZ', 'herramienta', 'Torreón', 'contado'),
('Maquilas Metal-Mecánicas', 'MMM770707M12', 'maquila', 'Saltillo', 'credito_15')
ON CONFLICT DO NOTHING;

-- Seed Materiales Catálogo
INSERT INTO materiales_catalogo (clave, descripcion, tipo, unidad_medida, precio_unitario, stock_actual, stock_minimo)
VALUES 
('MAT-PL-316-1/4', 'Placa Acero Inoxidable 316 1/4"', 'placa', 'kg', 125.50, 450, 100),
('MAT-TB-GALV-2', 'Tubo Galvanizado 2" Cédula 40', 'tubo', 'm', 85.00, 120, 50),
('MAT-EL-7018', 'Electrodo E7018 1/8"', 'consumible', 'kg', 45.00, 25, 10)
ON CONFLICT (clave) DO NOTHING;

-- Seed Operaciones Catálogo
INSERT INTO operaciones_catalogo (clave, nombre, centro_trabajo, tarifa_hora, tiempo_configuracion_default)
VALUES 
('OP-CNC-LASER', 'Corte Láser CNC', 'CNC-01', 1200.00, 30),
('OP-SOLD-MIG', 'Soldadura MIG', 'WELD-02', 450.00, 15),
('OP-DOB-BRAKE', 'Doblez en Prensa', 'BEND-01', 650.00, 20)
ON CONFLICT (clave) DO NOTHING;
