import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Building2, LayoutDashboard, Users } from "lucide-react";
import { useEffect } from "react";

import { Sidebar, type ItemMenu } from "@/components/layout/shell";
import { usePerfil } from "@/hooks/use-perfil";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const ITENS: ItemMenu[] = [
  { rotulo: "Visão geral", icone: LayoutDashboard, para: "/admin", grupo: "Plataforma" },
  { rotulo: "Clínicas", icone: Building2, para: "/admin/clinicas", grupo: "Plataforma" },
  { rotulo: "Usuários", icone: Users, para: "/admin/usuarios", grupo: "Plataforma" },
];

function AdminLayout() {
  const { data: perfil, isPending } = usePerfil();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && perfil && perfil.role !== "platform_admin") {
      navigate({ to: "/app", replace: true });
    }
  }, [isPending, perfil, navigate]);

  if (isPending || !perfil || perfil.role !== "platform_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar titulo="OdontoGestão" subtitulo="Painel da plataforma" itens={ITENS} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
