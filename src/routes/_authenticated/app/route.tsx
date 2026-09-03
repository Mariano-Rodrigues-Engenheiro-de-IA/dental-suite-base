import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Stethoscope,
  Users,
  UserCog,
} from "lucide-react";

import { Sidebar, type ItemMenu } from "@/components/layout/shell";
import { usePerfil } from "@/hooks/use-perfil";
import type { Role } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

/** Menu por perfil. Recepção não enxerga itens clínicos (prontuário/odontograma). */
function menuPorRole(role: Role): ItemMenu[] {
  const itens: ItemMenu[] = [
    { rotulo: "Dashboard", icone: LayoutDashboard, para: "/app", grupo: "Clínica" },
    { rotulo: "Agenda", icone: CalendarDays, desabilitado: true, grupo: "Clínica" },
    { rotulo: "Pacientes", icone: Users, desabilitado: true, grupo: "Clínica" },
  ];

  if (role === "dentista" || role === "clinica_admin") {
    itens.push(
      { rotulo: "Prontuário", icone: ClipboardList, desabilitado: true, grupo: "Atendimento" },
      { rotulo: "Odontograma", icone: Stethoscope, desabilitado: true, grupo: "Atendimento" },
    );
  }

  if (role === "clinica_admin") {
    itens.push(
      {
        rotulo: "Usuários",
        icone: UserCog,
        para: "/app/configuracoes/usuarios",
        grupo: "Configurações",
      },
      {
        rotulo: "Dados da clínica",
        icone: Building2,
        para: "/app/configuracoes/clinica",
        grupo: "Configurações",
      },
    );
  }

  return itens;
}

function AppLayout() {
  const { data: perfil, isPending } = usePerfil();

  if (isPending || !perfil) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!perfil.clinica_id) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm rounded-md border border-border bg-card p-5 text-center">
          <p className="text-sm font-semibold">Sem clínica vinculada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Seu usuário ainda não está associado a nenhuma clínica. Fale com o administrador da
            plataforma.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        titulo={perfil.clinicas?.nome ?? "Clínica"}
        subtitulo="Ambiente da clínica"
        itens={menuPorRole(perfil.role)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
