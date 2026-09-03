import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge, Card, Header } from "@/components/layout/shell";
import { usePerfil } from "@/hooks/use-perfil";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, formatarData, type Role } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: UsuariosGlobais,
});

function UsuariosGlobais() {
  const { data: perfil } = usePerfil();
  const [busca, setBusca] = useState("");
  const [clinicaId, setClinicaId] = useState("");
  const [role, setRole] = useState("");

  const clinicas = useQuery({
    queryKey: ["clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinicas")
        .select("id, nome")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const usuarios = useQuery({
    queryKey: ["usuarios-globais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, clinicas(nome)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<
        Record<string, unknown> & {
          id: string;
          nome: string | null;
          email: string | null;
          role: string;
          ativo: boolean;
          clinica_id: string | null;
          created_at: string;
          clinicas: { nome: string } | null;
        }
      >;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios.data ?? []).filter((u) => {
      if (clinicaId === "plataforma" && u.clinica_id !== null) return false;
      if (clinicaId && clinicaId !== "plataforma" && u.clinica_id !== clinicaId) return false;
      if (role && u.role !== role) return false;
      if (!termo) return true;
      return [u.nome, u.email].some((v) => (v ?? "").toLowerCase().includes(termo));
    });
  }, [usuarios.data, busca, clinicaId, role]);

  return (
    <>
      <Header
        titulo="Usuários da plataforma"
        descricao="Listagem global com filtro por clínica e perfil"
        nome={perfil?.nome ?? "—"}
        role="platform_admin"
      />
      <main className="flex-1 space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1 max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="w-full rounded-md border border-input bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <select
            value={clinicaId}
            onChange={(e) => setClinicaId(e.target.value)}
            className="rounded-md border border-input bg-card px-2 py-2 text-sm"
          >
            <option value="">Todas as clínicas</option>
            <option value="plataforma">Equipe da plataforma</option>
            {(clinicas.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-input bg-card px-2 py-2 text-sm"
          >
            <option value="">Todos os perfis</option>
            {Object.entries(ROLE_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Clínica</th>
                  <th>Perfil</th>
                  <th>CRO</th>
                  <th>Cadastro</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.nome ?? "—"}</td>
                    <td className="text-muted-foreground">{u.email}</td>
                    <td>{u.clinicas?.nome ?? "Plataforma"}</td>
                    <td>{ROLE_LABEL[u.role as Role]}</td>
                    <td>{(u["cro"] as string | null) ?? "—"}</td>
                    <td className="text-muted-foreground">{formatarData(u.created_at)}</td>
                    <td>{u.ativo ? <Badge tom="sucesso">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      {usuarios.isPending ? "Carregando…" : "Nenhum usuário encontrado."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
