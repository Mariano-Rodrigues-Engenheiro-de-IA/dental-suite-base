import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/dominio";

export type PerfilAtual = {
  id: string;
  nome: string | null;
  email: string | null;
  role: Role;
  clinica_id: string | null;
  ativo: boolean;
  clinicas: { id: string; nome: string; ativa: boolean; plano: string } | null;
};

export function usePerfil() {
  return useQuery<PerfilAtual | null>({
    queryKey: ["perfil-atual"],
    staleTime: 30_000,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, role, clinica_id, ativo, clinicas(id, nome, ativa, plano)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as PerfilAtual | null) ?? null;
    },
  });
}

export function rotaInicialPorRole(role: Role | undefined | null): string {
  return role === "platform_admin" ? "/admin" : "/app";
}
