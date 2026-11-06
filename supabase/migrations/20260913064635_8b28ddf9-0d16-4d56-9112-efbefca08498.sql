ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tasks_completed_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_tasks_completed(_property_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.properties
     SET tasks_completed_count = tasks_completed_count + 1
   WHERE id = _property_id
  RETURNING tasks_completed_count INTO new_count;
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_tasks_completed(uuid) TO authenticated;

ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.activity_items REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.properties; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;