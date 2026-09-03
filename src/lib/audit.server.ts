/**
 * Registro de auditoria (LGPD) — tabela append-only `logs_acesso`.
 * Uso exclusivo no servidor.
 */
export type RegistroAuditoria = {
  clinica_id: string | null;
  user_id: string;
  acao: string;
  entidade?: string | null;
  entidade_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
};

export async function registrarLog(registro: RegistroAuditoria): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("logs_acesso").insert({
    clinica_id: registro.clinica_id,
    user_id: registro.user_id,
    acao: registro.acao,
    entidade: registro.entidade ?? null,
    entidade_id: registro.entidade_id ?? null,
    ip: registro.ip ?? null,
    user_agent: registro.user_agent ?? null,
  });
  if (error) console.error("Falha ao registrar log de acesso:", error.message);
}
