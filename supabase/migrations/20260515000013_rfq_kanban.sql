-- RFQ Cotizaciones Kanban (Formato PM_F001 McVill)
CREATE TABLE IF NOT EXISTS rfq_cotizaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ident            INTEGER,
  rfq_interno      TEXT,
  rfq_externo      TEXT,
  cliente          TEXT NOT NULL,
  descripcion      TEXT,
  contacto_cliente TEXT,
  pm_asignado      TEXT,
  cant_np          INTEGER DEFAULT 1,
  eau              TEXT,
  cant_aceros      INTEGER DEFAULT 0,
  cant_procesos    INTEGER DEFAULT 0,
  cant_subensambles INTEGER DEFAULT 0,
  cant_hardwares   INTEGER DEFAULT 0,
  riesgo_score     INTEGER,
  riesgo_nivel     TEXT CHECK (riesgo_nivel IN ('LOW','MEDIUM','HIGH')),
  sla_dias         INTEGER,
  fecha_recepcion  DATE,
  fecha_ingenieria DATE,
  fecha_compromiso DATE,
  fecha_envio      DATE,
  alcance_general  TEXT,
  tiene_solido_3d  BOOLEAN DEFAULT FALSE,
  tiene_planos_2d  BOOLEAN DEFAULT FALSE,
  tiene_bom        BOOLEAN DEFAULT FALSE,
  estado           TEXT NOT NULL DEFAULT 'factibilidad'
                   CHECK (estado IN ('factibilidad','cotizacion','revision','enviada','declinada')),
  desempeno        TEXT CHECK (desempeno IN ('1-Excelente','2-Bueno','3-Malo')),
  motivo_declinacion TEXT,
  comentario_pm    TEXT,
  monto_estimado   NUMERIC(12,2),
  tenant_id        TEXT DEFAULT 'mcvill',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_estado ON rfq_cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_rfq_tenant ON rfq_cotizaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfq_pm     ON rfq_cotizaciones(pm_asignado);

CREATE OR REPLACE FUNCTION update_rfq_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rfq_updated_at ON rfq_cotizaciones;
CREATE TRIGGER trg_rfq_updated_at
  BEFORE UPDATE ON rfq_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION update_rfq_updated_at();

ALTER TABLE rfq_cotizaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rfq_all ON rfq_cotizaciones;
CREATE POLICY rfq_all ON rfq_cotizaciones FOR ALL USING (true) WITH CHECK (true);

-- Seed: RFQs activos — datos reales del Status Quotes 2026 McVill
INSERT INTO rfq_cotizaciones
  (ident,rfq_interno,rfq_externo,cliente,descripcion,contacto_cliente,pm_asignado,
   cant_np,eau,cant_aceros,cant_procesos,cant_subensambles,cant_hardwares,
   riesgo_score,riesgo_nivel,sla_dias,fecha_recepcion,alcance_general,
   tiene_solido_3d,tiene_planos_2d,tiene_bom,estado,desempeno,comentario_pm)
VALUES
  (452,'541','CAT-CMSA-452','CAT CMSA','Subcontrato Oxicorte — 9 NPs',
   'Ramón Vázquez','Ruben Delgado',9,'SEMANAL',3,2,0,0,7,'MEDIUM',10,
   '2026-05-10','CORTE',false,true,false,'factibilidad',NULL,'Pendiente análisis de procesos'),

  (451,'542','CAT-ACU-4479191','CAT ACUÑA','4479191 BRACKET AS — 217 EAU',
   'Ramón Vázquez','Eduardo Flores',1,'217',1,2,0,0,4,'LOW',5,
   '2026-05-13','BRACKET',false,true,false,'factibilidad',NULL,NULL),

  (450,'540','WB-2026-450','WABTEC','BCC-RFQ-010 Medium Assemblies — 5 NPs',
   'Olivia Nuriulú','Sandra Rodríguez',5,'750-2000',3,4,2,1,9,'HIGH',20,
   '2026-05-08','ENSAMBLE',false,true,false,'factibilidad',NULL,'Revisar proceso de soldadura'),

  (323,'539','NS-2026-323','New Standard','Varios Metal Fabrications — 8 NPs',
   'Tina Andreoli','Sandra Rodríguez',8,'varios',3,3,1,0,7,'MEDIUM',10,
   '2026-05-02','FABRICACIÓN',false,true,false,'cotizacion',NULL,NULL),

  (449,'538','KOM-2026-449','KOMATSU','Housing V37/V47/V57 — 3 NPs',
   'Fernando Aguirre','Sandra Rodríguez',3,'22-44',3,5,0,0,8,'MEDIUM',10,
   '2026-05-01','MAQUINADO',true,true,false,'cotizacion',NULL,'Revisar maquinado CNC'),

  (288,'537','JD-25-288','JOHN DEERE','BELLCRANK SHIFTABLE PTO + CLEVIS DRAWBAR',
   'Mario Ruíz','Elias Salas',2,'1600-20',2,4,1,0,7,'MEDIUM',10,
   '2026-04-20','ENSAMBLE',false,true,false,'revision',NULL,NULL),

  (312,'535','KONE-2026-312','KONE','72 NPs Varios — Fabricación Estructural',
   'Krutika Sharma','Elias Salas',72,'125-98125',4,6,3,2,12,'HIGH',20,
   '2026-04-15','VARIOS',false,true,true,'revision',NULL,'Esperando aprobación de Dirección'),

  (426,'536','BUH-2026-426','BUHLER','Painting Parts MVRT-12005 — 21 NPs',
   'Patrick Riedener','Sandra Rodríguez',21,'40-60',2,3,1,1,6,'MEDIUM',10,
   '2026-04-25','PINTURA',false,true,false,'revision',NULL,'En revisión por Ing. Manuel'),

  (292,'534','JD-25-292','JOHN DEERE','7 NPs Varios — Estructural',
   'Mario Ruíz','Elias Salas',7,'varios',3,4,2,1,10,'HIGH',20,
   '2026-04-22','VARIOS',false,true,false,'revision',NULL,NULL),

  (318,'533','AG-2026-318','ALFAGOMMA','Brackets AG — 17 NPs',
   'Fausto Vitela','Sandra Rodríguez',17,'15-574',2,3,1,3,8,'MEDIUM',10,
   '2026-04-10','BRACKETS',false,true,false,'enviada','2-Bueno','Enviada en tiempo');
