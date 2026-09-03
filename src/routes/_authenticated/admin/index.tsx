import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Card, Header, Metrica } from "@/components/layout/shell";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { formatarMb } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: perfil } = usePerfil();

  const metricas = useQuery({
    queryKey: ["admin-metricas"],
    queryFn: async () => {
      const [clinicas, usuarios] = await Promise.all([
        supabase.from("clinicas").select("id, ativa, limite_storage_mb").is("deleted_at", null),
        supabase.from("profiles").select("id, role, ativo").is("deleted_at", null),
      ]);
      if (clinicas.error) throw clinicas.error;
      if (usuarios.error) throw usuarios.error;
      return {
        totalClinicas: clinicas.data.length,
        clinicasAtivas: clinicas.data.filter((c) => c.ativa).length,
        totalUsuarios: usuarios.data.length,
        usuariosAtivos: usuarios.data.filter((u) => u.ativo).length,
        dentistas: usuarios.data.filter((u) => u.role === "dentista").length,
        storageContratado: clinicas.data.reduce((s, c) => s + (c.limite_storage_mb ?? 0), 0),
      };
    },
  });

  const m = metricas.data;

  return (
    <>
      <Header
        titulo="Visão geral da plataforma"
        descricao="Indicadores consolidados de clínicas e usuários"
        nome={perfil?.nome ?? "—"}
        role="platform_admin"
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica
            rotulo="Clínicas ativas"
            valor={m?.clinicasAtivas ?? "—"}
            detalhe={`${m?.totalClinicas ?? 0} cadastradas no total`}
          />
          <Metrica
            rotulo="Usuários"
            valor={m?.totalUsuarios ?? "—"}
            detalhe={`${m?.usuariosAtivos ?? 0} ativos`}
          />
          <Metrica
            rotulo="Dentistas"
            valor={m?.dentistas ?? "—"}
            detalhe="Somando todas as clínicas"
          />
          <Metrica
            rotulo="Storage consumido"
            valor={formatarMb(0)}
            detalhe={`de ${formatarMb(m?.storageContratado ?? 0)} contratados`}
          />
        </div>

        <Card titulo="Próximas etapas do produto">
          <div className="grid gap-px bg-border md:grid-cols-3">
            {[
              { t: "Agenda", d: "Agendamentos, salas e confirmações por clínica." },
              { t: "Pacientes e prontuário", d: "Cadastro, anamnese e histórico clínico." },
              { t: "Odontograma", d: "Registro gráfico por dente e por procedimento." },
            ].map((i) => (
              <div key={i.t} className="bg-card p-4">
                <p className="text-sm font-medium">{i.t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{i.d}</p>
                <p className="mt-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  Não implementado nesta etapa
                </p>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
