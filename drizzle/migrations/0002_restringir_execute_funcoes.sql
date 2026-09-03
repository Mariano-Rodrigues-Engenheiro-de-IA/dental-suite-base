REVOKE EXECUTE ON FUNCTION public.auth_clinica_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinica_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_clinica_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinica_admin() TO authenticated, service_role;