-- =============================================================================
-- BANCO / TESORERÍA: bank_accounts + bank_transactions
-- =============================================================================

-- ── bank_accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  banco         text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('cheques', 'ahorro', 'inversion', 'efectivo')),
  moneda        text NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  saldo_inicial numeric(14,2) NOT NULL DEFAULT 0,
  saldo_actual  numeric(14,2) NOT NULL DEFAULT 0,
  cuenta_clabe  text,
  activo        boolean NOT NULL DEFAULT true,
  notas         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_accounts_isolation" ON public.bank_accounts;
CREATE POLICY "bank_accounts_isolation" ON public.bank_accounts
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND auth_user_tenant()::text = tenant_id::text
  );

CREATE INDEX IF NOT EXISTS bank_accounts_tenant_idx ON public.bank_accounts (tenant_id);

-- ── bank_transactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  fecha       date NOT NULL,
  concepto    text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto       numeric(14,2) NOT NULL CHECK (monto > 0),
  referencia  text,
  categoria   text,
  conciliado  boolean NOT NULL DEFAULT false,
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_transactions_isolation" ON public.bank_transactions;
CREATE POLICY "bank_transactions_isolation" ON public.bank_transactions
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND auth_user_tenant()::text = tenant_id::text
  );

CREATE INDEX IF NOT EXISTS bank_transactions_tenant_idx    ON public.bank_transactions (tenant_id);
CREATE INDEX IF NOT EXISTS bank_transactions_account_idx   ON public.bank_transactions (account_id);
CREATE INDEX IF NOT EXISTS bank_transactions_fecha_idx     ON public.bank_transactions (fecha DESC);
