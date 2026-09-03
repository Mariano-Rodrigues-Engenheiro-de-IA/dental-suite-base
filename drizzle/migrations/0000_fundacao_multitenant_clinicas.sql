-- ============ TABELAS ============
CREATE TABLE public.clinicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  uf text,
  plano text NOT NULL DEFAULT 'basico',
  limite_dentistas int NOT NULL DEFAULT 5,
  limite_storage_mb int NOT NULL DEFAULT 5000,
  ativa boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL,
  nome text,
  email text,
  telefone text,
  role text NOT NULL DEFAULT 'recepcao' CHECK (role IN ('platform_admin','clinica_admin','dentista','recepcao')),
  cro text,
  especialidade text,
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.logs_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid,
  user_id uuid,
  acao text NOT NULL,
  entidade text,
  entidade_id uuid,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_clinica ON public.profiles(clinica_id);
CREATE INDEX idx_logs_clinica ON public.logs_acesso(clinica_id, created_at DESC);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE ON public.clinicas TO authenticated;
GRANT ALL ON public.clinicas TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- append-only: sem UPDATE/DELETE para ninguem
GRANT SELECT, INSERT ON public.logs_acesso TO authenticated;
GRANT SELECT, INSERT ON public.logs_acesso TO service_role;

-- ============ FUNCOES SECURITY DEFINER ============
CREATE OR REPLACE FUNCTION public.auth_clinica_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinica_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'platform_admin' AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_clinica_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'clinica_admin' AND ativo = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_clinica_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinica_admin() TO authenticated;

-- ============ RLS ============
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

-- clinicas
CREATE POLICY "platform_admin gerencia clinicas (select)" ON public.clinicas
  FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "platform_admin cria clinicas" ON public.clinicas
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "platform_admin edita clinicas" ON public.clinicas
  FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "membros leem propria clinica" ON public.clinicas
  FOR SELECT TO authenticated USING (id = public.auth_clinica_id() AND deleted_at IS NULL);
CREATE POLICY "clinica_admin edita propria clinica" ON public.clinicas
  FOR UPDATE TO authenticated
  USING (id = public.auth_clinica_id() AND public.is_clinica_admin())
  WITH CHECK (id = public.auth_clinica_id() AND public.is_clinica_admin());

-- profiles
CREATE POLICY "usuario le proprio profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "usuario edita proprio profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "platform_admin le todos profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "platform_admin edita profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "membros leem profiles da propria clinica" ON public.profiles
  FOR SELECT TO authenticated
  USING (clinica_id IS NOT NULL AND clinica_id = public.auth_clinica_id());
CREATE POLICY "clinica_admin edita profiles da propria clinica" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_clinica_admin() AND clinica_id = public.auth_clinica_id() AND role <> 'platform_admin')
  WITH CHECK (public.is_clinica_admin() AND clinica_id = public.auth_clinica_id() AND role <> 'platform_admin');

-- logs_acesso: APPEND-ONLY
CREATE POLICY "insere log da propria clinica" ON public.logs_acesso
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (public.is_platform_admin() AND clinica_id IS NULL)
      OR clinica_id = public.auth_clinica_id()
    )
  );
CREATE POLICY "le logs da propria clinica" ON public.logs_acesso
  FOR SELECT TO authenticated
  USING (clinica_id = public.auth_clinica_id() OR (public.is_platform_admin() AND clinica_id IS NULL));

-- ============ TRIGGER: profile automatico no signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, clinica_id, role, telefone, cro, especialidade)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'clinica_id','')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'role', 'recepcao'),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cro',
    NEW.raw_user_meta_data->>'especialidade'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
