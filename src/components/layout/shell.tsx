import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Role } from "@/lib/dominio";

export type ItemMenu = {
  rotulo: string;
  icone: LucideIcon;
  para?: string;
  desabilitado?: boolean;
  grupo?: string;
};

export function Sidebar({
  titulo,
  subtitulo,
  itens,
}: {
  titulo: string;
  subtitulo: string;
  itens: ItemMenu[];
}) {
  const grupos = itens.reduce<Record<string, ItemMenu[]>>((acc, item) => {
    const chave = item.grupo ?? "";
    (acc[chave] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="border-b border-sidebar-border px-4 py-3">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{titulo}</p>
        <p className="truncate text-xs text-sidebar-foreground/70">{subtitulo}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {Object.entries(grupos).map(([grupo, lista]) => (
          <div key={grupo} className="mb-4">
            {grupo && (
              <p className="px-2 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {grupo}
              </p>
            )}
            <ul className="space-y-0.5">
              {lista.map((item) => (
                <li key={item.rotulo}>
                  {item.desabilitado || !item.para ? (
                    <span
                      title="Disponível em uma próxima etapa"
                      className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/40"
                    >
                      <item.icone className="h-4 w-4" />
                      {item.rotulo}
                      <span className="ml-auto rounded border border-sidebar-border px-1 text-[0.6rem] uppercase">
                        em breve
                      </span>
                    </span>
                  ) : (
                    <Link
                      to={item.para}
                      activeOptions={{ exact: item.para.split("/").length <= 2 }}
                      activeProps={{
                        className: "bg-sidebar-accent text-sidebar-accent-foreground",
                      }}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    >
                      <item.icone className="h-4 w-4" />
                      {item.rotulo}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function Header({
  titulo,
  descricao,
  nome,
  role,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  nome: string;
  role: Role;
  acoes?: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold">{titulo}</h1>
        {descricao && <p className="truncate text-xs text-muted-foreground">{descricao}</p>}
      </div>
      {acoes}
      <div className="flex items-center gap-3 border-l border-border pl-3 text-right">
        <div className="leading-tight">
          <p className="text-xs font-medium">{nome}</p>
          <p className="text-[0.7rem] text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
        <button
          onClick={sair}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </div>
    </header>
  );
}

export function Card({
  titulo,
  children,
  acoes,
  className,
}: {
  titulo?: string;
  children: ReactNode;
  acoes?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      {(titulo || acoes) && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <h2 className="flex-1 text-sm font-semibold">{titulo}</h2>
          {acoes}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metrica({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

export function Badge({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "sucesso" | "alerta" | "erro";
}) {
  const tons = {
    neutro: "bg-secondary text-secondary-foreground",
    sucesso: "bg-success/12 text-success",
    alerta: "bg-warning/15 text-warning-foreground",
    erro: "bg-destructive/12 text-destructive",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[0.7rem] font-medium",
        tons[tom],
      )}
    >
      {children}
    </span>
  );
}
