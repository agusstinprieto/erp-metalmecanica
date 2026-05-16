create table if not exists public.minutas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  titulo text not null,
  fecha date not null default current_date,
  lugar text,
  participantes text,
  acta_texto text,
  acuerdos text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.minutas enable row level security;

create policy "tenant_isolation" on public.minutas
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "tenant_insert" on public.minutas for insert
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "tenant_update" on public.minutas for update
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "tenant_delete" on public.minutas for delete
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));
