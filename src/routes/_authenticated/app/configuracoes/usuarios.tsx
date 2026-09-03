import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge, Card, Header, Metrica } from "@/components/layout/shell";
import { FormularioUsuario } from "@/routes/_authenticated/admin/clinicas/$id";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { criarUsuarioClinica } from "@/lib/clinica.functions";
import { reenviarConvite } from "@/lib/plataforma.functions";
import { ROLE_LABEL, formatarData, type Role } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/app/configuracoes/usuarios")({
  component: UsuariosClinica,
});

const USUARIO_INICIAL = {
  nome: "",
  email: "",
  telefone: "",
  role: "dentista" as Exclude<Role, "platform_admin">,
  cro: "",
  especialidade: "",
};

function UsuariosClinica() {
  const { data: perfil } = usePerfil();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState(USUARIO_INICIAL);

  const clinica = useQuery({
    queryKey: ["clinica-atual", perfil?.clinica_id],
    enabled: !!perfil?.clinica_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinicas")
        .select("*")
        .eq("id", perfil!.clinica_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const usuarios = useQuery({
    queryKey: ["usuarios-clinica", perfil?.clinica_id],
    enabled: !!perfil?.clinica_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("clinica_id", perfil!.clinica_id!)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      await criarUsuarioClinica({
        data: {
          nome: novo.nome,
          email: novo.email,
          telefone: novo.telefone || null,
          role: novo.role,
          cro: novo.cro || null,
          especialidade: novo.especialidade || null,
          origin: window.location.origin,
        },
      });
    },
    onSuccess: () => {
      toast.success("Usuário criado e convite enviado por e-mail.");
      setAberto(false);
      setNovo(USUARIO_INICIAL);
      void queryClient.invalidateQueries();
    },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Erro ao criar usuário."),
  });

  const alternar = useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase.from("profiles").update({ ativo }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["usuarios-clinica"] });
    },
    onError: () => toast.error("Não foi possível atualizar o usuário."),
  });

  const convite = useMutation({
    mutationFn: async (email: string) =>
      reenviarConvite({ data: { email, origin: window.location.origin } }),
    onSuccess: () => toast.success("Novo link de acesso enviado por e-mail."),
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Erro ao reenviar."),
  });

  if (perfil && perfil.role !== "clinica_admin") {
    return (
      <>
        <Header
          titulo="Usuários"
          nome={perfil.nome ?? "—"}
          role={perfil.role}
          descricao="Configurações da clínica"
        />
        <main className="p-5">
          <Card>
            <p className="p-8 text-center text-sm text-muted-foreground">
              Apenas o administrador da clínica pode gerenciar usuários.
            </p>
          </Card>
        </main>
      </>
    );
  }

  const dentistasAtivos = (usuarios.data ?? []).filter(
    (u) => u.role === "dentista" && u.ativo,
  ).length;
  const limite = clinica.data?.limite_dentistas ?? 0;
  const limiteAtingido = dentistasAtivos >= limite;

  return (
    <>
      <Header
        titulo="Usuários da clínica"
        descricao="Cadastro e gestão da equipe, respeitando os limites do plano"
        nome={perfil?.nome ?? "—"}
        role={(perfil?.role ?? "clinica_admin") as Role}
        acoes={
          <button
            onClick={() => setAberto(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo usuário
          </button>
        }
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica
            rotulo="Dentistas ativos"
            valor={`${dentistasAtivos}/${limite}`}
            detalhe={`Plano ${clinica.data?.plano ?? "—"}`}
          />
          <Metrica rotulo="Usuários" valor={usuarios.data?.length ?? 0} detalhe="Todos os perfis" />
          <Metrica
            rotulo="Vagas de dentista"
            valor={Math.max(limite - dentistasAtivos, 0)}
            detalhe="Disponíveis no plano atual"
          />
        </div>

        {limiteAtingido && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-xs">
            Limite de <strong>{limite} dentista(s)</strong> do plano atingido. Para incluir outro
            dentista, desative um existente ou solicite a ampliação do plano ao suporte.
          </div>
        )}

        <Card titulo="Equipe">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>CRO</th>
                  <th>Especialidade</th>
                  <th>Cadastro</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(usuarios.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.nome ?? "—"}</td>
                    <td className="text-muted-foreground">{u.email}</td>
                    <td>{ROLE_LABEL[u.role as Role]}</td>
                    <td>{u.cro ?? "—"}</td>
                    <td>{u.especialidade ?? "—"}</td>
                    <td className="text-muted-foreground">{formatarData(u.created_at)}</td>
                    <td>{u.ativo ? <Badge tom="sucesso">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                    <td className="space-x-1 text-right whitespace-nowrap">
                      <button
                        onClick={() => u.email && convite.mutate(u.email)}
                        className="rounded border border-input px-2 py-1 text-xs hover:bg-secondary"
                      >
                        Reenviar acesso
                      </button>
                      {u.id !== perfil?.id && (
                        <button
                          onClick={() => alternar.mutate({ userId: u.id, ativo: !u.ativo })}
                          className="rounded border border-input px-2 py-1 text-xs hover:bg-secondary"
                        >
                          {u.ativo ? "Desativar" : "Ativar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(usuarios.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      {usuarios.isPending ? "Carregando…" : "Nenhum usuário cadastrado."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {aberto && (
        <FormularioUsuario
          valores={novo}
          setValores={setNovo}
          onCancelar={() => setAberto(false)}
          onSalvar={() => criar.mutate()}
          salvando={criar.isPending}
        />
      )}
    </>
  );
}
