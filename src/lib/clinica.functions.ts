import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rolesPermitidos = ["clinica_admin", "dentista", "recepcao"] as const;

const novoUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  telefone: z.string().optional().nullable(),
  role: z.enum(rolesPermitidos),
  cro: z.string().optional().nullable(),
  especialidade: z.string().optional().nullable(),
  origin: z.string().url(),
  /** Preenchido apenas quando o platform_admin cria usuário para uma clínica. */
  clinica_id: z.string().uuid().optional(),
});

/**
 * Cria um usuário dentro de uma clínica, respeitando o limite de dentistas do plano.
 * clinica_admin cria apenas na própria clínica; platform_admin pode informar a clínica.
 */
export const criarUsuarioClinica = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => novoUsuarioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("role, clinica_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil) throw new Error("Perfil não encontrado.");

    let clinicaId: string;
    if (perfil.role === "platform_admin") {
      if (!data.clinica_id) throw new Error("Informe a clínica do usuário.");
      clinicaId = data.clinica_id;
    } else if (perfil.role === "clinica_admin") {
      if (!perfil.clinica_id) throw new Error("Seu perfil não está vinculado a uma clínica.");
      clinicaId = perfil.clinica_id;
    } else {
      throw new Error("Sem permissão para criar usuários.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { registrarLog } = await import("./audit.server");

    const { data: clinica } = await supabaseAdmin
      .from("clinicas")
      .select("id, nome, ativa, limite_dentistas")
      .eq("id", clinicaId)
      .maybeSingle();
    if (!clinica) throw new Error("Clínica não encontrada.");
    if (!clinica.ativa) throw new Error("Clínica inativa: não é possível criar novos usuários.");

    if (data.role === "dentista") {
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("clinica_id", clinicaId)
        .eq("role", "dentista")
        .eq("ativo", true)
        .is("deleted_at", null);
      if ((count ?? 0) >= clinica.limite_dentistas) {
        throw new Error(
          `Limite do plano atingido: ${clinica.limite_dentistas} dentista(s) ativos. ` +
            `Desative um dentista existente ou solicite a ampliação do plano.`,
        );
      }
    }

    const { data: convite, error: erroConvite } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${data.origin}/definir-senha`,
        data: { nome: data.nome, role: data.role, clinica_id: clinicaId },
      },
    );
    if (erroConvite || !convite?.user) {
      throw new Error(
        erroConvite?.message?.includes("already")
          ? "Já existe um usuário com este e-mail."
          : (erroConvite?.message ?? "Erro ao convidar usuário."),
      );
    }

    const { error: erroProfile } = await supabaseAdmin.from("profiles").upsert({
      id: convite.user.id,
      clinica_id: clinicaId,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone ?? null,
      role: data.role,
      cro: data.cro ?? null,
      especialidade: data.especialidade ?? null,
    });
    if (erroProfile) throw new Error(erroProfile.message);

    await registrarLog({
      clinica_id: perfil.role === "platform_admin" ? null : clinicaId,
      user_id: context.userId,
      acao: "criar_usuario",
      entidade: "profiles",
      entidade_id: convite.user.id,
    });

    return { usuarioId: convite.user.id as string };
  });
