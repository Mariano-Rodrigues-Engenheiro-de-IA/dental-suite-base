# Dental Hub

Crie a fundação de um SaaS multi-tenant para clínicas odontológicas.

Stack: React + Tailwind + Supabase. Português do Brasil em toda a interface.

CONTEXTO

É um produto vendido para múltiplas clínicas odontológicas. Existe um painel

de administração da plataforma (dono do SaaS) que gerencia todas as clínicas,

e cada clínica tem seu próprio ambiente isolado. Nesta primeira etapa NÃO

construa agenda, prontuário, anamnese nem odontograma — apenas a fundação.

MODELO DE DADOS (Supabase)

Tabela `clinicas`:

id uuid PK, nome text, cnpj text, telefone text, email text,

endereco text, cidade text, uf text,

plano text default 'basico', limite_dentistas int default 5,

limite_storage_mb int default 5000,

ativa boolean default true, created_at timestamptz default now()

Tabela `profiles` (1:1 com auth.users):

id uuid PK references auth.users, clinica_id uuid null references clinicas,

nome text, email text, telefone text,

role text check (role in ('platform_admin','clinica_admin','dentista','recepcao')),

cro text, especialidade text, ativo boolean default true,

created_at timestamptz default now()

-- platform_admin tem clinica_id NULL

Tabela `logs_acesso` (append-only, auditoria LGPD):

id uuid PK, clinica_id uuid, user_id uuid, acao text,

entidade text, entidade_id uuid, ip text, user_agent text,

created_at timestamptz default now()

SEGURANÇA — REQUISITO CRÍTICO

Este sistema armazena dados de saúde (dado pessoal sensível pela LGPD).

O isolamento entre clínicas NÃO pode depender de filtro no frontend.

1. Habilite RLS em TODAS as tabelas.

2. Crie funções SECURITY DEFINER em SQL:

   - auth_clinica_id() → retorna o clinica_id do profile do usuário logado

   - auth_role() → retorna o role do usuário logado

   - is_platform_admin() → boolean

3. Política padrão de leitura/escrita em tabelas de clínica:

   clinica_id = auth_clinica_id()

   Platform admin NÃO tem acesso automático a dados clínicos —

   apenas a `clinicas`, `profiles` e métricas agregadas.

4. `logs_acesso` aceita apenas INSERT. Sem UPDATE, sem DELETE, para ninguém.

5. Nenhuma tabela deve permitir DELETE físico de dados de paciente no futuro —

   já prepare o padrão com coluna deleted_at (soft delete).

TELAS

A) Login unificado (/login)

Após autenticar, redireciona por role:

platform_admin → /admin | demais → /app

B) Painel da plataforma (/admin) — só platform_admin

- Dashboard: total de clínicas ativas, total de usuários, storage consumido

- /admin/clinicas: listagem com busca, criar, editar, ativar/desativar clínica

- Ao criar clínica: formulário cria a clínica E o primeiro usuário

  clinica_admin junto, com convite por e-mail

- /admin/clinicas/:id: detalhe da clínica, usuários dela, plano e limites

- /admin/usuarios: listagem global de usuários com filtro por clínica

C) Área da clínica (/app)

- Layout com sidebar e header mostrando o nome da clínica logada

- Dashboard placeholder (cards vazios para agenda e pacientes)

- /app/configuracoes/usuarios: clinica_admin cria e gerencia usuários

  da própria clínica (dentista, recepcao, outro admin), respeitando

  limite_dentistas do plano. Bloqueia criação acima do limite com mensagem clara.

- /app/configuracoes/clinica: dados da clínica, editável pelo clinica_admin

MENU LATERAL

Renderize os itens conforme o role do usuário. Recepção não deve enxergar

itens de prontuário. Deixe placeholders desabilitados para Agenda,

Pacientes e Odontograma — serão construídos nas próximas etapas.

DESIGN

Interface limpa e profissional, densidade alta de informação (é software de

uso diário em clínica). Paleta sóbria, sem gradientes decorativos.

Tipografia legível, tabelas com boa densidade. Responsivo, mas priorize

desktop — o uso real é em computador de recepção e consultório.

NÃO FAÇA NESTA ETAPA

Não crie agenda, pacientes, prontuário, anamnese, odontograma ou anexos.

Não crie dados fictícios (mock) além do necessário para o seed inicial de

um platform_admin.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dental-suite-base.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2df15d6-b000-4953-9ff7-2b7d89c3a10b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
