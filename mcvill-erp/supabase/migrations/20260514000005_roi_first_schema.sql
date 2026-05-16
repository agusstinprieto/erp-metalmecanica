CREATE TABLE IF NOT EXISTS materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion_mp TEXT NOT NULL,
  grado TEXT,
  espesor NUMERIC, -- En milímetros
  ancho NUMERIC, -- En metros
  largo NUMERIC, -- En metros
  peso_mp NUMERIC, -- En kilogramos
  origen TEXT, -- ej. 'NACIONAL', 'IMPORTACION'
  ton_min TEXT, -- ej. '40', 'FCST'
  tiempo_entrega TEXT, -- ej. '4 MESES', '2 SEMANAS'
  precio_mp_usd_ton NUMERIC,
  precio_limpieza_usd_ton NUMERIC,
  precio_flete_usd_ton NUMERIC,
  precio_total_usd_ton NUMERIC NOT NULL, -- El valor crítico para el cotizador
  comentarios TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por descripción o grado
CREATE INDEX IF NOT EXISTS idx_materiales_descripcion ON materiales(descripcion_mp);

CREATE TABLE IF NOT EXISTS catalogo_ilc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itm_nbr TEXT UNIQUE NOT NULL, -- Número de parte (ej. '0007244')
  cost NUMERIC NOT NULL, -- Costo en USD
  cust_prc TEXT, -- ej. 'Commercial'
  box_qty NUMERIC, -- Cantidad por caja
  lc_itm_typ TEXT, -- Tipo de ítem (ej. 'SPP', 'WPC')
  notes TEXT, -- Notas (ej. 'ONLY FOR EXPORT FROM US')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_ilc_itm ON catalogo_ilc(itm_nbr);

CREATE TABLE IF NOT EXISTS parametros_globales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_cambio NUMERIC NOT NULL DEFAULT 19.56,
  porcentaje_desperdicio NUMERIC NOT NULL DEFAULT 0.30, -- 30%
  porcentaje_indirectos NUMERIC NOT NULL DEFAULT 0.30, -- 30%
  porcentaje_utilidad NUMERIC NOT NULL DEFAULT 0.18, -- 18%
  costo_minuto_laser NUMERIC DEFAULT 0, -- Rellenar con catálogo de máquinas
  costo_minuto_cobot NUMERIC DEFAULT 25.4,
  costo_minuto_doblez NUMERIC DEFAULT 0,
  valido_desde TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activo BOOLEAN DEFAULT TRUE
);

-- Insertar parámetros por defecto
INSERT INTO parametros_globales (tipo_cambio, porcentaje_desperdicio, porcentaje_indirectos, porcentaje_utilidad)
VALUES (19.56, 0.30, 0.30, 0.18);

CREATE TABLE IF NOT EXISTS evaluacion_factibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_numero TEXT, -- ej. 'SN-0326' o '262'
  cliente TEXT,
  nombre_contacto TEXT,
  correo_contacto TEXT,
  fecha_evaluacion DATE DEFAULT CURRENT_DATE,
  
  -- Campos core de la pieza
  numero_parte TEXT,
  descripcion_pieza TEXT,
  eau NUMERIC, -- Estimated Annual Usage
  peso_fw_kg NUMERIC,
  
  -- El checklist en formato JSONB (Estructura: { "aprobado": boolean, "comentarios": "...", "mitigacion": "..." })
  revision_bom JSONB,
  caracteristicas_especiales JSONB,
  requisitos_soldadura JSONB,
  infraestructura_especial JSONB,
  acabados_empaque JSONB,
  
  -- Dictamen final
  es_factible BOOLEAN DEFAULT NULL, -- Null = Pendiente, True = Pasa a cotización, False = Rechazado
  coordinador_proyecto TEXT, -- o UUID referenciando auth.users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotizaciones_express (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factibilidad_id UUID REFERENCES evaluacion_factibilidad(id) ON DELETE CASCADE,
  
  -- Inputs de la calculadora
  peso_neto_fw NUMERIC NOT NULL,
  desperdicio_aplicado NUMERIC NOT NULL,
  precio_acero_aplicado NUMERIC NOT NULL, -- USD/KG en ese momento
  
  -- Desglose de costos calculados (Snapshot para historial)
  costo_acero_usd NUMERIC NOT NULL,
  costo_hardware_usd NUMERIC DEFAULT 0,
  costo_ingenieria_usd NUMERIC DEFAULT 0,
  costo_operaciones_usd NUMERIC DEFAULT 0,
  costo_soldadura_usd NUMERIC DEFAULT 0,
  costo_pintura_usd NUMERIC DEFAULT 0,
  
  -- Totales
  subtotal_usd NUMERIC NOT NULL,
  indirectos_usd NUMERIC NOT NULL,
  utilidad_usd NUMERIC NOT NULL,
  precio_venta_final_usd NUMERIC NOT NULL,
  
  creado_por TEXT, -- Usuario que generó la cotización
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
