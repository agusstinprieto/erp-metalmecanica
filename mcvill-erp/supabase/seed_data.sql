-- Seeding para McVill Forge

-- 1. Insertar Cursos HSE
INSERT INTO hse_courses (tenant_id, title, description, duration_hours, category, validity_months)
VALUES 
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Manejo de Montacargas (NOM-006-STPS)', 'Capacitación teórica y práctica para operadores de montacargas.', 8, 'NOM', 12),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Seguridad en Trabajos en Altura (NOM-009-STPS)', 'Prevención de caídas y uso de equipo de protección personal.', 6, 'NOM', 24),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Primeros Auxilios Nivel 1', 'Atención básica de emergencias médicas en el taller.', 4, 'Certificación', 12),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Uso de Extintores y Combate de Incendios', 'Identificación de tipos de fuego y uso correcto de extintores.', 4, 'DC-3', 12);

-- 2. Insertar Base de Conocimiento para IA (Cerebro Neural)
INSERT INTO ai_knowledge (tenant_id, category, title, content)
VALUES 
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Operations', 'Horarios de Turnos', 'McVill opera en tres turnos principales: Turno Matutino (06:00 - 14:00), Turno Vespertino (14:00 - 22:00) y Turno Nocturno (22:00 - 06:00). El tiempo de comida es de 30 minutos.'),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Security', 'Política de EPP', 'Es obligatorio el uso de casco, botas de seguridad con casquillo, y lentes de protección en todo momento dentro de las áreas de producción y almacén.'),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'HR', 'Días de Descanso Obligatorio', 'McVill sigue el calendario oficial de días feriados de México. Los días laborados en festivo se pagan conforme a la ley (pago triple).'),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Maintenance', 'Procedimiento LOTO', 'Antes de intervenir cualquier máquina CNC o brazo robótico, se debe aplicar el procedimiento Lock-Out Tag-Out (Candadeo y Etiquetado) sin excepciones.'),
('dbae9a89-8d53-4423-814e-3a30cea719a8', 'Operations', 'Capacidad de Carga Grúa Viajera', 'La grúa viajera principal del Taller A tiene una capacidad nominal de 15 toneladas. No exceder el límite para evitar incidentes estructurales.');
