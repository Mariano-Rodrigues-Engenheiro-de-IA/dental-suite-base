import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir senha — OdontoGestão" },
      { name: "description", content: "Defina a senha de acesso da sua conta na plataforma." },
      { property: "og:title", content: "Definir senha — OdontoGestão" },
      {
        property: "og:description",
        content: "Defina a senha de acesso da sua conta na plataforma.",
      },
    ],
  }),
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      toast.error(
        "Não foi possível definir a senha. O link de convite pode ter expirado — solicite um novo.",
      );
      return;
    }
    toast.success("Senha definida com sucesso.");
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form
        onSubmit={salvar}
        className="w-full max-w-sm space-y-4 rounded-md border border-border bg-card p-5"
      >
        <div>
          <h1 className="text-base font-semibold">Definir senha</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Crie sua senha de acesso para entrar na plataforma.
          </p>
        </div>
        <div>
          <label htmlFor="senha" className="mb-1 block text-xs font-medium">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            required
            minLength={8}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
        <div>
          <label htmlFor="confirmacao" className="mb-1 block text-xs font-medium">
            Confirmar senha
          </label>
          <input
            id="confirmacao"
            type="password"
            required
            minLength={8}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {carregando ? "Salvando…" : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
