export type Role = "platform_admin" | "clinica_admin" | "dentista" | "recepcao";

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: "Admin da plataforma",
  clinica_admin: "Admin da clínica",
  dentista: "Dentista",
  recepcao: "Recepção",
};

export const PLANOS = [
  { valor: "basico", label: "Básico", dentistas: 5, storage: 5000 },
  { valor: "profissional", label: "Profissional", dentistas: 15, storage: 20000 },
  { valor: "avancado", label: "Avançado", dentistas: 40, storage: 100000 },
] as const;

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export function formatarMb(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
  return `${mb} MB`;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
