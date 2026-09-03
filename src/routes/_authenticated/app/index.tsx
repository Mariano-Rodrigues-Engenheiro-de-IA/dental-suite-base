import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Card, Header, Metrica } from "@/components/layout/shell";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type Role } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardClinica,
});

function DashboardClinica() {
  const { data: perfil } = usePerfil();

  const equipe = useQuery({
    queryKey: ["equipe-clinica", perfil?.clinica_id],
    enabled: !!perfil?.clinica_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, ativo")
        .eq("clinica_id", perfil!.clinica_id!)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const dentistas = (equipe.data ?? []).filter((u) => u.role === "dentista" && u.ativo).length;

  return (
    <>
      <Header
        titulo={perfil?.clinicas?.nome ?? "Clínica"}
        descricao={`Painel da clínica · ${ROLE_LABEL[(perfil?.role ?? "recepcao") as Role]}`}
        nome={perfil?.nome ?? "—"}
        role={(perfil?.role ?? "recepcao") as Role}
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica rotulo="Agendamentos hoje" valor="—" detalhe="Agenda na próxima etapa" />
          <Metrica rotulo="Pacientes ativos" valor="—" detalhe="Cadastro na próxima etapa" />
          <Metrica rotulo="Dentistas ativos" valor={dentistas} detalhe="Equipe clínica" />
          <Metrica rotulo="Usuários da clínica" valor={equipe.data?.length ?? 0} detalhe="Total" />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card titulo="Agenda do dia">
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                A agenda será construída na próxima etapa.
              </p>
            </div>
          </Card>
          <Card titulo="Pacientes recentes">
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                O cadastro de pacientes será construído na próxima etapa.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
