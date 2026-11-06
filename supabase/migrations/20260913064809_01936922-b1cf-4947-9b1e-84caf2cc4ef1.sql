REVOKE EXECUTE ON FUNCTION public.increment_tasks_completed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_tasks_completed(uuid) TO authenticated;