import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge, Card, Header, Metrica } from "@/components/layout/shell";
import { Campo } from "./index";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { criarUsuarioClinica } from "@/lib/clinica.functions";
import { PLANOS, ROLE_LABEL, UFS, formatarData, formatarMb, type Role } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/admin/clinicas/$id")({
  component: DetalheClinica,
});

const USUARIO_INICIAL = {
  nome: "",
  email: "",
  telefone: "",
  role: "dentista" as Exclude<Role, "platform_admin">,
  cro: "",
  especialidade: "",
};

function DetalheClinica() {
  const { id } = Route.useParams();
  const { data: perfil } = usePerfil();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [novoUsuario, setNovoUsuario] = useState(USUARIO_INICIAL);
  const [aberto, setAberto] = useState(false);

  const clinica = useQuery({
    queryKey: ["clinica", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const usuarios = useQuery({
    queryKey: ["clinica-usuarios", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("clinica_id", id)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (clinica.data) {
      setForm({
        nome: clinica.data.nome ?? "",
        cnpj: clinica.data.cnpj ?? "",
        telefone: clinica.data.telefone ?? "",
        email: clinica.data.email ?? "",
        endereco: clinica.data.endereco ?? "",
        cidade: clinica.data.cidade ?? "",
        uf: clinica.data.uf ?? "",
        plano: clinica.data.plano,
        limite_dentistas: String(clinica.data.limite_dentistas),
        limite_storage_mb: String(clinica.data.limite_storage_mb),
      });
    }
  }, [clinica.data]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clinicas")
        .update({
          nome: form["nome"] ?? "",
          cnpj: form["cnpj"] || null,
          telefone: form["telefone"] || null,
          email: form["email"] || null,
          endereco: form["endereco"] || null,
          cidade: form["cidade"] || null,
          uf: form["uf"] || null,
          plano: form["plano"] ?? "basico",
          limite_dentistas: Number(form["limite_dentistas"] ?? 5),
          limite_storage_mb: Number(form["limite_storage_mb"] ?? 5000),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados da clínica atualizados.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível salvar as alterações."),
  });

  const criarUsuario = useMutation({
    mutationFn: async () => {
      await criarUsuarioClinica({
        data: {
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          telefone: novoUsuario.telefone || null,
          role: novoUsuario.role,
          cro: novoUsuario.cro || null,
          especialidade: novoUsuario.especialidade || null,
          clinica_id: id,
          origin: window.location.origin,
        },
      });
    },
    onSuccess: () => {
      toast.success("Usuário convidado por e-mail.");
      setAberto(false);
      setNovoUsuario(USUARIO_INICIAL);
      void queryClient.invalidateQueries();
    },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Erro ao criar usuário."),
  });

  const alternarUsuario = useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase.from("profiles").update({ ativo }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["clinica-usuarios", id] });
    },
    onError: () => toast.error("Não foi possível atualizar o usuário."),
  });

  const dentistasAtivos = (usuarios.data ?? []).filter(
    (u) => u.role === "dentista" && u.ativo,
  ).length;

  return (
    <>
      <Header
        titulo={clinica.data?.nome ?? "Clínica"}
        descricao="Detalhes, plano, limites e usuários da clínica"
        nome={perfil?.nome ?? "—"}
        role="platform_admin"
        acoes={
          <Link
            to="/admin/clinicas"
            className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Clínicas
          </Link>
        }
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica
            rotulo="Situação"
            valor={clinica.data?.ativa ? "Ativa" : "Inativa"}
            detalhe={`Desde ${formatarData(clinica.data?.created_at)}`}
          />
          <Metrica
            rotulo="Dentistas"
            valor={`${dentistasAtivos}/${clinica.data?.limite_dentistas ?? 0}`}
            detalhe="Ativos / limite do plano"
          />
          <Metrica
            rotulo="Usuários"
            valor={usuarios.data?.length ?? 0}
            detalhe="Todos os perfis da clínica"
          />
          <Metrica
            rotulo="Storage"
            valor={formatarMb(0)}
            detalhe={`de ${formatarMb(clinica.data?.limite_storage_mb ?? 0)}`}
          />
        </div>

        <Card titulo="Dados cadastrais e plano">
          <form
            className="grid gap-3 p-4 md:grid-cols-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvar.mutate();
            }}
          >
            <Campo
              label="Nome"
              obrigatorio
              className="md:col-span-2"
              valor={form["nome"] ?? ""}
              onChange={(v) => setForm({ ...form, nome: v })}
            />
            <Campo
              label="CNPJ"
              valor={form["cnpj"] ?? ""}
              onChange={(v) => setForm({ ...form, cnpj: v })}
            />
            <Campo
              label="Telefone"
              valor={form["telefone"] ?? ""}
              onChange={(v) => setForm({ ...form, telefone: v })}
            />
            <Campo
              label="E-mail"
              tipo="email"
              valor={form["email"] ?? ""}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Campo
              label="Cidade"
              valor={form["cidade"] ?? ""}
              onChange={(v) => setForm({ ...form, cidade: v })}
            />
            <Campo
              label="Endereço"
              className="md:col-span-2"
              valor={form["endereco"] ?? ""}
              onChange={(v) => setForm({ ...form, endereco: v })}
            />
            <div>
              <label className="mb-1 block text-xs font-medium">UF</label>
              <select
                value={form["uf"] ?? ""}
                onChange={(e) => setForm({ ...form, uf: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Plano</label>
              <select
                value={form["plano"] ?? "basico"}
                onChange={(e) => {
                  const plano = PLANOS.find((p) => p.valor === e.target.value)!;
                  setForm({
                    ...form,
                    plano: plano.valor,
                    limite_dentistas: String(plano.dentistas),
                    limite_storage_mb: String(plano.storage),
                  });
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                {PLANOS.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Campo
              label="Limite de dentistas"
              tipo="number"
              valor={form["limite_dentistas"] ?? ""}
              onChange={(v) => setForm({ ...form, limite_dentistas: v })}
            />
            <Campo
              label="Limite de storage (MB)"
              tipo="number"
              valor={form["limite_storage_mb"] ?? ""}
              onChange={(v) => setForm({ ...form, limite_storage_mb: v })}
            />
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={salvar.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {salvar.isPending ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Card>

        <Card
          titulo="Usuários da clínica"
          acoes={
            <button
              onClick={() => setAberto(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <Plus className="h-3.5 w-3.5" /> Novo usuário
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>CRO</th>
                  <th>Especialidade</th>
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
                    <td>{u.ativo ? <Badge tom="sucesso">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                    <td className="text-right">
                      <button
                        onClick={() => alternarUsuario.mutate({ userId: u.id, ativo: !u.ativo })}
                        className="rounded border border-input px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {(usuarios.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum usuário nesta clínica.
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
          valores={novoUsuario}
          setValores={setNovoUsuario}
          onCancelar={() => setAberto(false)}
          onSalvar={() => criarUsuario.mutate()}
          salvando={criarUsuario.isPending}
        />
      )}
    </>
  );
}

export function FormularioUsuario({
  valores,
  setValores,
  onCancelar,
  onSalvar,
  salvando,
}: {
  valores: typeof USUARIO_INICIAL;
  setValores: (v: typeof USUARIO_INICIAL) => void;
  onCancelar: () => void;
  onSalvar: () => void;
  salvando: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSalvar();
        }}
        className="w-full max-w-xl space-y-4 rounded-md border border-border bg-card p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">Novo usuário</h2>
          <p className="text-xs text-muted-foreground">
            O usuário recebe um convite por e-mail para definir a própria senha.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Campo
            label="Nome"
            obrigatorio
            valor={valores.nome}
            onChange={(v) => setValores({ ...valores, nome: v })}
          />
          <Campo
            label="E-mail"
            tipo="email"
            obrigatorio
            valor={valores.email}
            onChange={(v) => setValores({ ...valores, email: v })}
          />
          <Campo
            label="Telefone"
            valor={valores.telefone}
            onChange={(v) => setValores({ ...valores, telefone: v })}
          />
          <div>
            <label className="mb-1 block text-xs font-medium">Perfil de acesso</label>
            <select
              value={valores.role}
              onChange={(e) =>
                setValores({ ...valores, role: e.target.value as typeof valores.role })
              }
              className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              <option value="dentista">Dentista</option>
              <option value="recepcao">Recepção</option>
              <option value="clinica_admin">Admin da clínica</option>
            </select>
          </div>
          {valores.role === "dentista" && (
            <>
              <Campo
                label="CRO"
                valor={valores.cro}
                onChange={(v) => setValores({ ...valores, cro: v })}
              />
              <Campo
                label="Especialidade"
                valor={valores.especialidade}
                onChange={(v) => setValores({ ...valores, especialidade: v })}
              />
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {salvando ? "Enviando convite…" : "Criar e convidar"}
          </button>
        </div>
      </form>
    </div>
  );
}
