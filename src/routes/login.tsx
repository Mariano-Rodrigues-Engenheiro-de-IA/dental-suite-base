import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { plataformaPrecisaSetup } from "@/lib/plataforma.functions";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — OdontoGestão" },
      {
        name: "description",
        content: "Acesse sua conta na plataforma de gestão para clínicas odontológicas.",
      },
      { property: "og:title", content: "Entrar — OdontoGestão" },
      {
        property: "og:description",
        content: "Acesse sua conta na plataforma de gestão para clínicas odontológicas.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  const setup = useQuery({
    queryKey: ["precisa-setup"],
    queryFn: () => plataformaPrecisaSetup(),
  });

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) {
      setCarregando(false);
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("role, ativo")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!perfil || perfil.ativo === false) {
      await supabase.auth.signOut();
      setCarregando(false);
      toast.error("Seu acesso está inativo. Fale com o administrador da clínica.");
      return;
    }
    navigate({ to: perfil.role === "platform_admin" ? "/admin" : "/app", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xl font-semibold tracking-tight">OdontoGestão</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Plataforma de gestão para clínicas odontológicas
          </p>
        </div>

        <form
          onSubmit={entrar}
          className="space-y-4 rounded-md border border-border bg-card p-5 shadow-sm"
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              placeholder="voce@clinica.com.br"
            />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1 block text-xs font-medium">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Perdeu o acesso? Solicite um novo convite ao administrador.
          </p>
        </form>

        {setup.data?.precisaSetup && (
          <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            Nenhum administrador da plataforma cadastrado.{" "}
            <Link to="/setup" className="font-medium underline">
              Configurar agora
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
