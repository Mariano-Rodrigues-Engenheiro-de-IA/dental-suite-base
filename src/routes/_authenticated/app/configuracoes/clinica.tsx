import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Card, Header, Metrica } from "@/components/layout/shell";
import { Campo } from "@/routes/_authenticated/admin/clinicas/index";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { UFS, formatarData, formatarMb, type Role } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/app/configuracoes/clinica")({
  component: ConfiguracoesClinica,
});

function ConfiguracoesClinica() {
  const { data: perfil } = usePerfil();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

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
        })
        .eq("id", perfil!.clinica_id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados da clínica atualizados.");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível salvar. Verifique suas permissões."),
  });

  const somenteLeitura = perfil?.role !== "clinica_admin";

  return (
    <>
      <Header
        titulo="Dados da clínica"
        descricao="Informações cadastrais, plano e limites contratados"
        nome={perfil?.nome ?? "—"}
        role={(perfil?.role ?? "recepcao") as Role}
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica
            rotulo="Plano"
            valor={clinica.data?.plano ?? "—"}
            detalhe={`Desde ${formatarData(clinica.data?.created_at)}`}
          />
          <Metrica
            rotulo="Limite de dentistas"
            valor={clinica.data?.limite_dentistas ?? "—"}
            detalhe="Alterável pelo suporte da plataforma"
          />
          <Metrica
            rotulo="Storage"
            valor={formatarMb(0)}
            detalhe={`de ${formatarMb(clinica.data?.limite_storage_mb ?? 0)} contratados`}
          />
        </div>

        <Card titulo="Cadastro">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              salvar.mutate();
            }}
            className="grid gap-3 p-4 md:grid-cols-3"
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
            <div className="md:col-span-3 flex items-center justify-between border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                {somenteLeitura
                  ? "Somente o administrador da clínica pode alterar estes dados."
                  : "As alterações valem para toda a equipe da clínica."}
              </p>
              <button
                type="submit"
                disabled={salvar.isPending || somenteLeitura}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {salvar.isPending ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
