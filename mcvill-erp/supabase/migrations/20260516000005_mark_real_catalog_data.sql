-- Migration: mark real McVill catalog data as 'import' (not seed)
-- 'import' = real data loaded from actual McVill/Caterpillar sources — do NOT delete at go-live.
--   materiales   → McVill's actual steel catalog (grades 1E-0166, 1E-0170, AR400, etc.)
--   catalogo_ilc → Caterpillar ILC hardware catalog used for quoting.

SET session_replication_role = replica;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'materiales' AND column_name = 'data_source'
  ) THEN
    UPDATE public.materiales SET data_source = 'import' WHERE data_source = 'seed';
    RAISE NOTICE 'Marked materiales as import: % rows', (SELECT COUNT(*) FROM public.materiales WHERE data_source = 'import');
  ELSE
    RAISE NOTICE 'materiales has no data_source column, skipping';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_ilc' AND column_name = 'data_source'
  ) THEN
    UPDATE public.catalogo_ilc SET data_source = 'import' WHERE data_source = 'seed';
    RAISE NOTICE 'Marked catalogo_ilc as import: % rows', (SELECT COUNT(*) FROM public.catalogo_ilc WHERE data_source = 'import');
  ELSE
    RAISE NOTICE 'catalogo_ilc has no data_source column, skipping';
  END IF;
END;
$$;

SET session_replication_role = DEFAULT;
