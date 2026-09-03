import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const clinicaSchema = z.object({
  nome: z.string().min(2),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  plano: z.string().default("basico"),
  limite_dentistas: z.number().int().min(1).default(5),
  limite_storage_mb: z.number().int().min(100).default(5000),
});

const criarClinicaSchema = z.object({
  clinica: clinicaSchema,
  admin: z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    telefone: z.string().optional().nullable(),
  }),
  origin: z.string().url(),
});

/** Cria a clínica e convida o primeiro usuário clinica_admin por e-mail. */
export const criarClinicaComAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarClinicaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("is_platform_admin");
    if (ehAdmin !== true) throw new Error("Acesso restrito ao administrador da plataforma.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { registrarLog } = await import("./audit.server");

    const c = data.clinica;
    const { data: clinica, error: erroClinica } = await supabaseAdmin
      .from("clinicas")
      .insert({
        nome: c.nome,
        cnpj: c.cnpj ?? null,
        telefone: c.telefone ?? null,
        email: c.email || null,
        endereco: c.endereco ?? null,
        cidade: c.cidade ?? null,
        uf: c.uf ?? null,
        plano: c.plano,
        limite_dentistas: c.limite_dentistas,
        limite_storage_mb: c.limite_storage_mb,
      })
      .select()
      .single();
    if (erroClinica || !clinica) throw new Error(erroClinica?.message ?? "Erro ao criar clínica.");

    const { data: convite, error: erroConvite } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.admin.email,
      {
        redirectTo: `${data.origin}/definir-senha`,
        data: { nome: data.admin.nome, role: "clinica_admin", clinica_id: clinica.id },
      },
    );

    if (erroConvite || !convite?.user) {
      await supabaseAdmin.from("clinicas").delete().eq("id", clinica.id);
      throw new Error(
        erroConvite?.message?.includes("already")
          ? "Já existe um usuário com este e-mail."
          : (erroConvite?.message ?? "Erro ao convidar o administrador da clínica."),
      );
    }

    const { error: erroProfile } = await supabaseAdmin.from("profiles").upsert({
      id: convite.user.id,
      clinica_id: clinica.id,
      nome: data.admin.nome,
      email: data.admin.email,
      telefone: data.admin.telefone ?? null,
      role: "clinica_admin",
    });
    if (erroProfile) throw new Error(erroProfile.message);

    await registrarLog({
      clinica_id: null,
      user_id: context.userId,
      acao: "criar_clinica",
      entidade: "clinicas",
      entidade_id: clinica.id,
    });

    return { clinicaId: clinica.id as string };
  });

/** Reenvia o convite de acesso para um usuário já cadastrado. */
export const reenviarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("role, clinica_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil || (perfil.role !== "platform_admin" && perfil.role !== "clinica_admin")) {
      throw new Error("Sem permissão para reenviar convites.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alvo } = await supabaseAdmin
      .from("profiles")
      .select("id, clinica_id")
      .eq("email", data.email)
      .maybeSingle();
    if (!alvo) throw new Error("Usuário não encontrado.");
    if (perfil.role === "clinica_admin" && alvo.clinica_id !== perfil.clinica_id) {
      throw new Error("Este usuário não pertence à sua clínica.");
    }

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: `${data.origin}/definir-senha` },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cria o primeiro platform_admin. Só funciona enquanto não existir nenhum. */
export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        nome: z.string().min(2),
        email: z.string().email(),
        senha: z.string().min(8),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "platform_admin");
    if ((count ?? 0) > 0) throw new Error("A plataforma já possui um administrador.");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, role: "platform_admin" },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Erro ao criar administrador.");

    const { error: erroProfile } = await supabaseAdmin.from("profiles").upsert({
      id: criado.user.id,
      nome: data.nome,
      email: data.email,
      role: "platform_admin",
      clinica_id: null,
    });
    if (erroProfile) throw new Error(erroProfile.message);
    return { ok: true };
  });

/** Indica se a plataforma ainda precisa do cadastro do primeiro administrador. */
export const plataformaPrecisaSetup = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "platform_admin");
  return { precisaSetup: (count ?? 0) === 0 };
});
