import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { criarPrimeiroAdmin, plataformaPrecisaSetup } from "@/lib/plataforma.functions";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuração inicial — OdontoGestão" },
      {
        name: "description",
        content: "Cadastro do primeiro administrador da plataforma OdontoGestão.",
      },
      { property: "og:title", content: "Configuração inicial — OdontoGestão" },
      {
        property: "og:description",
        content: "Cadastro do primeiro administrador da plataforma OdontoGestão.",
      },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [carregando, setCarregando] = useState(false);

  const setup = useQuery({ queryKey: ["precisa-setup"], queryFn: () => plataformaPrecisaSetup() });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await criarPrimeiroAdmin({ data: form });
      toast.success("Administrador criado. Faça login para continuar.");
      navigate({ to: "/login", replace: true });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Erro ao criar administrador.");
    } finally {
      setCarregando(false);
    }
  }

  if (setup.data && !setup.data.precisaSetup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-sm text-muted-foreground">
          A plataforma já está configurada. Acesse pela tela de login.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm space-y-4 rounded-md border border-border bg-card p-5"
      >
        <div>
          <h1 className="text-base font-semibold">Configuração inicial</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre o administrador da plataforma. Esta tela é desativada após o primeiro cadastro.
          </p>
        </div>
        {(["nome", "email", "senha"] as const).map((campo) => (
          <div key={campo}>
            <label htmlFor={campo} className="mb-1 block text-xs font-medium first-letter:uppercase">
              {campo === "senha" ? "Senha (mínimo 8 caracteres)" : campo}
            </label>
            <input
              id={campo}
              type={campo === "senha" ? "password" : campo === "email" ? "email" : "text"}
              required
              minLength={campo === "senha" ? 8 : 2}
              value={form[campo]}
              onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {carregando ? "Criando…" : "Criar administrador"}
        </button>
      </form>
    </main>
  );
}
