import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useId, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge, Card, Header } from "@/components/layout/shell";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { criarClinicaComAdmin } from "@/lib/plataforma.functions";
import { PLANOS, UFS, formatarData, formatarMb } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/admin/clinicas/")({
  component: ClinicasPage,
});

const FORM_INICIAL = {
  nome: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  uf: "",
  plano: "basico",
  limite_dentistas: 5,
  limite_storage_mb: 5000,
  admin_nome: "",
  admin_email: "",
  admin_telefone: "",
};

function ClinicasPage() {
  const { data: perfil } = usePerfil();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const clinicas = useQuery({
    queryKey: ["clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinicas")
        .select("*")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const contagens = useQuery({
    queryKey: ["clinicas-contagem-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("clinica_id, role")
        .is("deleted_at", null);
      if (error) throw error;
      const mapa: Record<string, { total: number; dentistas: number }> = {};
      for (const p of data) {
        if (!p.clinica_id) continue;
        mapa[p.clinica_id] ??= { total: 0, dentistas: 0 };
        mapa[p.clinica_id]!.total += 1;
        if (p.role === "dentista") mapa[p.clinica_id]!.dentistas += 1;
      }
      return mapa;
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      await criarClinicaComAdmin({
        data: {
          clinica: {
            nome: form.nome,
            cnpj: form.cnpj || null,
            telefone: form.telefone || null,
            email: form.email || null,
            endereco: form.endereco || null,
            cidade: form.cidade || null,
            uf: form.uf || null,
            plano: form.plano,
            limite_dentistas: Number(form.limite_dentistas),
            limite_storage_mb: Number(form.limite_storage_mb),
          },
          admin: {
            nome: form.admin_nome,
            email: form.admin_email,
            telefone: form.admin_telefone || null,
          },
          origin: window.location.origin,
        },
      });
    },
    onSuccess: () => {
      toast.success("Clínica criada e convite enviado ao administrador.");
      setAberto(false);
      setForm(FORM_INICIAL);
      void queryClient.invalidateQueries();
    },
    onError: (erro) =>
      toast.error(erro instanceof Error ? erro.message : "Erro ao criar a clínica."),
  });

  const alternarAtiva = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from("clinicas").update({ ativa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situação da clínica atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["clinicas"] });
    },
    onError: () => toast.error("Não foi possível atualizar a clínica."),
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clinicas.data ?? [];
    return (clinicas.data ?? []).filter((c) =>
      [c.nome, c.cidade, c.cnpj, c.email].some((v) => (v ?? "").toLowerCase().includes(termo)),
    );
  }, [busca, clinicas.data]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    criar.mutate();
  }

  return (
    <>
      <Header
        titulo="Clínicas"
        descricao="Cadastro, plano e situação de cada clínica da plataforma"
        nome={perfil?.nome ?? "—"}
        role="platform_admin"
        acoes={
          <button
            onClick={() => setAberto(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Nova clínica
          </button>
        }
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cidade, CNPJ…"
            className="w-full rounded-md border border-input bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-ring"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clínica</th>
                  <th>Cidade/UF</th>
                  <th>Plano</th>
                  <th>Dentistas</th>
                  <th>Usuários</th>
                  <th>Storage</th>
                  <th>Cadastro</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => {
                  const cont = contagens.data?.[c.id];
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          to="/admin/clinicas/$id"
                          params={{ id: c.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.nome}
                        </Link>
                        <div className="text-xs text-muted-foreground">{c.cnpj ?? "sem CNPJ"}</div>
                      </td>
                      <td className="text-muted-foreground">
                        {[c.cidade, c.uf].filter(Boolean).join("/") || "—"}
                      </td>
                      <td className="capitalize">{c.plano}</td>
                      <td className="tabular-nums">
                        {cont?.dentistas ?? 0}/{c.limite_dentistas}
                      </td>
                      <td className="tabular-nums">{cont?.total ?? 0}</td>
                      <td className="tabular-nums">{formatarMb(c.limite_storage_mb)}</td>
                      <td className="text-muted-foreground">{formatarData(c.created_at)}</td>
                      <td>
                        {c.ativa ? (
                          <Badge tom="sucesso">Ativa</Badge>
                        ) : (
                          <Badge tom="erro">Inativa</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => alternarAtiva.mutate({ id: c.id, ativa: !c.ativa })}
                          className="rounded border border-input px-2 py-1 text-xs hover:bg-secondary"
                        >
                          {c.ativa ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      {clinicas.isPending ? "Carregando…" : "Nenhuma clínica encontrada."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-6">
          <form
            onSubmit={enviar}
            className="w-full max-w-2xl space-y-4 rounded-md border border-border bg-card p-5"
          >
            <div>
              <h2 className="text-sm font-semibold">Nova clínica</h2>
              <p className="text-xs text-muted-foreground">
                A clínica é criada junto com o primeiro usuário administrador, que recebe convite por
                e-mail.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Campo
                label="Nome da clínica"
                obrigatorio
                className="md:col-span-2"
                valor={form.nome}
                onChange={(v) => setForm({ ...form, nome: v })}
              />
              <Campo
                label="CNPJ"
                valor={form.cnpj}
                onChange={(v) => setForm({ ...form, cnpj: v })}
              />
              <Campo
                label="Telefone"
                valor={form.telefone}
                onChange={(v) => setForm({ ...form, telefone: v })}
              />
              <Campo
                label="E-mail da clínica"
                tipo="email"
                valor={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Campo
                label="Cidade"
                valor={form.cidade}
                onChange={(v) => setForm({ ...form, cidade: v })}
              />
              <Campo
                label="Endereço"
                className="md:col-span-2"
                valor={form.endereco}
                onChange={(v) => setForm({ ...form, endereco: v })}
              />
              <div>
                <label className="mb-1 block text-xs font-medium">UF</label>
                <select
                  value={form.uf}
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
                  value={form.plano}
                  onChange={(e) => {
                    const plano = PLANOS.find((p) => p.valor === e.target.value)!;
                    setForm({
                      ...form,
                      plano: plano.valor,
                      limite_dentistas: plano.dentistas,
                      limite_storage_mb: plano.storage,
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
                valor={String(form.limite_dentistas)}
                onChange={(v) => setForm({ ...form, limite_dentistas: Number(v) })}
              />
              <Campo
                label="Limite de storage (MB)"
                tipo="number"
                valor={String(form.limite_storage_mb)}
                onChange={(v) => setForm({ ...form, limite_storage_mb: Number(v) })}
              />
            </div>

            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Administrador da clínica
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Campo
                  label="Nome"
                  obrigatorio
                  valor={form.admin_nome}
                  onChange={(v) => setForm({ ...form, admin_nome: v })}
                />
                <Campo
                  label="E-mail"
                  tipo="email"
                  obrigatorio
                  valor={form.admin_email}
                  onChange={(v) => setForm({ ...form, admin_email: v })}
                />
                <Campo
                  label="Telefone"
                  valor={form.admin_telefone}
                  onChange={(v) => setForm({ ...form, admin_telefone: v })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criar.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {criar.isPending ? "Criando…" : "Criar clínica e convidar admin"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function Campo({
  label,
  valor,
  onChange,
  tipo = "text",
  obrigatorio,
  className,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  obrigatorio?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium">
        {label}
        {obrigatorio && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={id}
        type={tipo}
        required={obrigatorio}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
      />
    </div>
  );
}
