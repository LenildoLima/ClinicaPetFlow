# 🐾 PetFlow — Documentação Completa

> Sistema de gestão para clínicas veterinárias desenvolvido com React, Supabase e Edge Functions.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Banco de Dados](#banco-de-dados)
5. [Edge Functions](#edge-functions)
6. [Páginas e Funcionalidades](#páginas-e-funcionalidades)
7. [Controle de Acesso](#controle-de-acesso)
8. [Como Instalar e Rodar](#como-instalar-e-rodar)
9. [Deploy](#deploy)

---

## Visão Geral

O **PetFlow** é um sistema completo de gestão para clínicas veterinárias. Permite o controle de tutores, pets, consultas, prontuários clínicos, financeiro e caixa diário, com acesso diferenciado por cargo (Administrador, Veterinário e Recepcionista).

### Funcionalidades principais
- Cadastro de tutores e pets
- Agendamento e gestão de consultas
- Prontuário eletrônico com prescrições e exames
- Controle financeiro de cobranças e pagamentos
- Controle de caixa diário
- Autenticação e controle de acesso por cargo
- Upload de fotos de perfil

---

## Arquitetura e Tecnologias

| Camada | Tecnologia |
|---|---|
| 🎨 Frontend | React + Vite + TypeScript |
| 🎨 Estilização | Tailwind CSS + shadcn/ui |
| 🗄️ Banco de Dados | Supabase (PostgreSQL) |
| 🔐 Autenticação | Supabase Auth |
| 📦 Storage | Supabase Storage (bucket: avatars) |
| ⚙️ Backend/API | Supabase Edge Functions (Deno) |
| 🔀 Roteamento | React Router |
| 📅 Datas | date-fns |
| 🧩 Ícones | lucide-react |

### Observação sobre fuso horário
O Supabase salva todas as datas em **UTC**. O frontend sempre converte para o horário de Brasília (`America/Sao_Paulo` — UTC-3) ao exibir datas e horários. Ao salvar, o offset `-03:00` é aplicado.

---

## Estrutura de Pastas

```
PetFlow/
├── frontend/                        # Aplicação React + Vite
│   ├── public/                      # Assets estáticos
│   ├── src/
│   │   ├── components/              # Componentes reutilizáveis
│   │   │   ├── ui/                  # Componentes shadcn/ui
│   │   │   ├── AppLayout.tsx        # Layout principal (Sidebar + Content)
│   │   │   └── ProtectedRoute.tsx   # Guarda de rotas autenticadas
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Contexto de autenticação
│   │   ├── hooks/
│   │   │   └── useToast.ts          # Hook de notificações
│   │   ├── lib/
│   │   │   └── supabase.ts          # Configuração do cliente Supabase
│   │   ├── pages/                   # Páginas da aplicação
│   │   │   ├── Login.tsx            # Login e cadastro
│   │   │   ├── Dashboard.tsx        # Painel principal
│   │   │   ├── Tutores.tsx          # Gestão de tutores
│   │   │   ├── Pets.tsx             # Gestão de pets
│   │   │   ├── Agenda.tsx           # Agenda (admin/recepcionista)
│   │   │   ├── MinhaAgenda.tsx      # Agenda (veterinário)
│   │   │   ├── Prontuarios.tsx      # Listagem de prontuários
│   │   │   ├── Prontuario.tsx       # Detalhe do prontuário
│   │   │   ├── Financeiro.tsx       # Gestão financeira
│   │   │   ├── Caixa.tsx            # Controle de caixa
│   │   │   └── Configuracoes.tsx    # Configurações do sistema
│   │   ├── App.tsx                  # Rotas e providers
│   │   └── main.tsx                 # Ponto de entrada
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── supabase/
│   └── functions/                   # Edge Functions (Deno)
│       ├── enviar-lembrete-consulta/
│       │   └── index.ts
│       ├── calcular-financeiro/
│       │   └── index.ts
│       ├── buscar-historico-pet/
│       │   └── index.ts
│       ├── relatorio-dashboard/
│       │   └── index.ts
│       └── cancelar-consulta/
│           └── index.ts
│
├── .gitignore
└── README.md
```

---

## Banco de Dados

### Tabelas

#### `usuarios`
Perfis dos usuários do sistema (veterinários, recepcionistas, admin).

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Referência ao auth.users |
| nome | TEXT | Nome completo |
| email | TEXT | E-mail |
| telefone | TEXT | Telefone |
| cargo | TEXT | admin / veterinario / recepcionista |
| crmv | TEXT | Registro veterinário (só veterinários) |
| foto_url | TEXT | URL da foto no Storage |
| ativo | BOOLEAN | Se o usuário está ativo |

> ⚠️ O cargo **admin** só pode ser definido diretamente no banco pelo programador. O formulário de cadastro permite apenas `veterinario` e `recepcionista`.

---

#### `tutores`
Donos dos pets.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| nome | TEXT | Nome completo |
| cpf | TEXT | CPF |
| email | TEXT | E-mail |
| telefone | TEXT | Telefone (obrigatório) |
| whatsapp | TEXT | WhatsApp |
| endereco | TEXT | Endereço |
| bairro | TEXT | Bairro |
| cidade | TEXT | Cidade |
| estado | TEXT | Estado |
| cep | TEXT | CEP (busca automática via ViaCEP) |
| observacoes | TEXT | Observações gerais |
| ativo | BOOLEAN | Se o tutor está ativo |

---

#### `pets`
Animais cadastrados.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| tutor_id | UUID (FK) | Referência ao tutor |
| nome | TEXT | Nome do animal |
| especie | TEXT | cao / gato / passaro / roedor / reptil / outro |
| raca | TEXT | Raça |
| sexo | TEXT | macho / femea / nao_informado |
| data_nascimento | DATE | Data de nascimento |
| castrado | BOOLEAN | Se é castrado |
| microchip | TEXT | Código do microchip |
| foto_url | TEXT | URL da foto |
| observacoes | TEXT | Observações |

---

#### `consultas`
Agendamentos e atendimentos.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| pet_id | UUID (FK) | Referência ao pet |
| tutor_id | UUID (FK) | Referência ao tutor |
| veterinario_id | UUID (FK) | Referência ao veterinário |
| tipo | TEXT | consulta / retorno / cirurgia / exame / vacina / banho_tosa / emergencia |
| status | TEXT | agendado / confirmado / em_atendimento / concluido / cancelado / faltou |
| data_hora | TIMESTAMPTZ | Data e hora da consulta (salvo em UTC) |
| duracao_minutos | INT | Duração estimada |
| motivo | TEXT | Motivo da consulta |
| observacoes | TEXT | Observações |
| criado_por | UUID (FK) | Quem criou o registro |

---

#### `prontuarios`
Registros clínicos dos atendimentos.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| consulta_id | UUID (FK) | Consulta vinculada |
| pet_id | UUID (FK) | Pet atendido |
| veterinario_id | UUID (FK) | Veterinário responsável |
| data_atendimento | TIMESTAMPTZ | Data e hora do atendimento |
| peso | DECIMAL | Peso em kg |
| temperatura | DECIMAL | Temperatura em °C |
| frequencia_cardiaca | INT | FC em bpm |
| frequencia_respiratoria | INT | FR em mpm |
| queixa_principal | TEXT | Queixa relatada |
| anamnese | TEXT | Histórico clínico |
| exame_fisico | TEXT | Resultado do exame físico |
| hipotese_diagnostica | TEXT | Hipótese diagnóstica |
| diagnostico | TEXT | Diagnóstico definitivo |
| tratamento | TEXT | Tratamento prescrito |
| orientacoes | TEXT | Orientações ao tutor |
| retorno_em | DATE | Data sugerida de retorno |

---

#### `prescricoes`
Receitas médicas vinculadas ao prontuário.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| prontuario_id | UUID (FK) | Prontuário vinculado |
| pet_id | UUID (FK) | Pet |
| veterinario_id | UUID (FK) | Veterinário |
| medicamentos | JSONB | Lista de medicamentos |
| data_emissao | DATE | Data de emissão |

**Formato do campo `medicamentos` (JSONB):**
```json
[
  {
    "nome": "Amoxicilina",
    "dose": "250mg",
    "frequencia": "12h",
    "duracao": "7 dias",
    "via": "oral"
  }
]
```

---

#### `exames`
Exames solicitados e resultados.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| prontuario_id | UUID (FK) | Prontuário vinculado |
| pet_id | UUID (FK) | Pet |
| tipo | TEXT | Tipo do exame |
| resultado | TEXT | Resultado |
| arquivo_url | TEXT | Link do arquivo |
| data_solicitacao | DATE | Data de solicitação |
| data_resultado | DATE | Data do resultado |
| laboratorio | TEXT | Laboratório |

---

#### `vacinas`
Histórico de vacinação.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| pet_id | UUID (FK) | Pet |
| nome | TEXT | Nome da vacina |
| fabricante | TEXT | Fabricante |
| lote | TEXT | Lote |
| data_aplicacao | DATE | Data de aplicação |
| data_reforco | DATE | Data do próximo reforço |
| veterinario_id | UUID (FK) | Veterinário que aplicou |

---

#### `financeiro`
Cobranças e pagamentos.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| consulta_id | UUID (FK) | Consulta vinculada |
| tutor_id | UUID (FK) | Tutor |
| descricao | TEXT | Descrição da cobrança |
| valor_total | DECIMAL | Valor bruto |
| desconto | DECIMAL | Desconto aplicado |
| valor_final | DECIMAL | Valor final (calculado por trigger) |
| forma_pagamento | TEXT | dinheiro / pix / cartao_debito / cartao_credito / boleto / outro |
| status | TEXT | pendente / pago / cancelado / reembolsado |
| data_vencimento | DATE | Data de vencimento |
| data_pagamento | DATE | Data do pagamento |
| criado_por | UUID (FK) | Quem criou |

---

#### `financeiro_itens`
Itens detalhados de cada cobrança.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| financeiro_id | UUID (FK) | Cobrança vinculada |
| descricao | TEXT | Descrição do item |
| quantidade | INT | Quantidade |
| valor_unitario | DECIMAL | Valor unitário |
| valor_total | DECIMAL | Calculado automaticamente |

---

#### `servicos`
Catálogo de serviços e preços da clínica.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| nome | TEXT | Nome do serviço |
| categoria | TEXT | consulta / exame / cirurgia / vacina / medicamento / banho_tosa / outro |
| preco | DECIMAL | Preço padrão |
| ativo | BOOLEAN | Se está disponível |

---

#### `caixa`
Controle do caixa diário.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| data | DATE | Data do caixa |
| status | TEXT | aberto / fechado |
| aberto_por | UUID (FK) | Quem abriu |
| fechado_por | UUID (FK) | Quem fechou |
| saldo_inicial | DECIMAL | Saldo ao abrir |
| total_entradas | DECIMAL | Soma das entradas |
| total_saidas | DECIMAL | Soma das saídas |
| saldo_final | DECIMAL | Saldo ao fechar |

---

#### `caixa_movimentacoes`
Movimentações do caixa.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| caixa_id | UUID (FK) | Caixa do dia |
| tipo | TEXT | entrada / saida |
| descricao | TEXT | Descrição |
| valor | DECIMAL | Valor |
| forma_pagamento | TEXT | Forma de pagamento |
| consulta_id | UUID (FK) | Consulta vinculada (opcional) |
| registrado_por | UUID (FK) | Quem registrou |

---

### Triggers
- `trg_usuarios_atualizado` — atualiza `atualizado_em` ao editar usuário
- `trg_tutores_atualizado` — atualiza `atualizado_em` ao editar tutor
- `trg_pets_atualizado` — atualiza `atualizado_em` ao editar pet
- `trg_consultas_atualizado` — atualiza `atualizado_em` ao editar consulta
- `trg_prontuarios_atualizado` — atualiza `atualizado_em` ao editar prontuário
- `trg_financeiro_atualizado` — atualiza `atualizado_em` ao editar financeiro
- `trg_financeiro_valor_final` — calcula `valor_final = valor_total - desconto`

---

## Edge Functions

Todas as funções estão em `supabase/functions/` e rodam no runtime **Deno**.

### `relatorio-dashboard`
**Método:** GET  
Retorna estatísticas completas para o dashboard: cards com totais, gráfico dos últimos 7 dias e próximas consultas do dia.

### `buscar-historico-pet`
**Método:** GET `?pet_id=uuid`  
Retorna o histórico completo do pet em paralelo: dados, consultas, prontuários, vacinas e exames.

### `calcular-financeiro`
**Método:** POST  
Gera cobrança ao concluir consulta e atualiza o status da consulta para `concluido`.

**Body:**
```json
{
  "consulta_id": "uuid",
  "forma_pagamento": "pix",
  "desconto": 0,
  "itens": [
    { "descricao": "Consulta", "quantidade": 1, "valor_unitario": 150.00 }
  ]
}
```

### `cancelar-consulta`
**Método:** POST  
Cancela a consulta e o financeiro pendente vinculado.

**Body:**
```json
{
  "consulta_id": "uuid",
  "motivo_cancelamento": "Tutor solicitou"
}
```

### `enviar-lembrete-consulta`
**Método:** GET  
Busca consultas do dia seguinte com status `agendado` e retorna os dados para envio de lembretes.

---

## Páginas e Funcionalidades

### Login (`/login`)
- Formulário de login com email e senha
- Formulário de cadastro com: foto, nome, email, telefone, cargo (veterinário/recepcionista), CRMV (veterinários), senha
- Após login redireciona conforme cargo

### Dashboard (`/`)
- Acesso: Admin
- Cards: consultas hoje, agendadas, concluídas, tutores, pets, faturamento do dia
- Gráfico de consultas dos últimos 7 dias
- Lista de próximas consultas do dia

### Tutores (`/tutores`)
- Acesso: Admin, Recepcionista
- Listagem com busca por nome
- Cadastro com busca automática de endereço por CEP (ViaCEP)
- Edição e exclusão

### Pets (`/pets`)
- Acesso: Admin, Veterinário, Recepcionista
- Listagem com busca por nome
- Cadastro vinculado ao tutor
- Edição e exclusão

### Agenda (`/agenda`)
- Acesso: Admin, Recepcionista
- Filtros: Hoje, Esta Semana, Este Mês, Data específica
- Nova consulta com: tutor, pet, veterinário, tipo, data/hora, motivo, observações
- Troca de status da consulta
- Botão "Abrir Prontuário"

### Minha Agenda (`/minha-agenda`)
- Acesso: Veterinário
- Mesma estrutura da Agenda porém filtrando apenas consultas do veterinário logado

### Prontuários (`/prontuarios`)
- Acesso: Admin, Veterinário
- Listagem com busca e filtros
- Detalhe completo com dados clínicos, prescrições, exames e vacinas
- Impressão de receita e prontuário completo

### Financeiro (`/financeiro`)
- Acesso: Admin, Recepcionista
- Cards: faturamento do dia, pendente, total do mês
- Listagem com filtros por período, status e forma de pagamento
- Nova cobrança com itens do catálogo ou personalizados
- Registrar pagamento
- Cancelar cobrança

### Caixa (`/caixa`)
- Acesso: Admin, Recepcionista
- Abrir/Fechar caixa diário com saldo inicial
- Registrar entradas e saídas
- Histórico de caixas anteriores

### Configurações (`/configuracoes`)
- Acesso: Admin
- Gerenciamento de usuários
- Catálogo de serviços e preços

---

## Controle de Acesso

### Menus por cargo

| Página | Admin | Veterinário | Recepcionista |
|---|---|---|---|
| Dashboard | ✅ | ❌ | ❌ |
| Tutores | ✅ | ❌ | ✅ |
| Pets | ✅ | ✅ | ✅ |
| Agenda | ✅ | ❌ | ✅ |
| Minha Agenda | ❌ | ✅ | ❌ |
| Prontuários | ✅ | ✅ | ❌ |
| Financeiro | ✅ | ❌ | ✅ |
| Caixa | ✅ | ❌ | ✅ |
| Configurações | ✅ | ❌ | ❌ |

### Redirecionamento após login
- `admin` → `/dashboard`
- `veterinario` → `/minha-agenda`
- `recepcionista` → `/agenda`

---

## Como Instalar e Rodar

### Pré-requisitos
- Node.js 18+
- NPM ou Bun
- Supabase CLI
- Conta no Supabase

### 1. Clonar o repositório
```bash
git clone https://github.com/LenildoLima/petflow-care.git
cd petflow-care
```

### 2. Instalar dependências do frontend
```bash
cd frontend
npm install
```

### 3. Configurar variáveis de ambiente
Criar o arquivo `frontend/.env`:
```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

### 4. Rodar o frontend
```bash
cd frontend
npm run dev
```
Acesse: `http://localhost:5173`

### 5. Deploy das Edge Functions
```bash
cd ..
supabase login
supabase link --project-ref SEU_PROJECT_ID
supabase functions deploy enviar-lembrete-consulta --use-api
supabase functions deploy calcular-financeiro --use-api
supabase functions deploy buscar-historico-pet --use-api
supabase functions deploy relatorio-dashboard --use-api
supabase functions deploy cancelar-consulta --use-api
```

---

## Deploy

### Frontend
O frontend pode ser deployado em:
- **Vercel** — recomendado (conectar repositório GitHub diretamente)
- **Netlify**
- **Lovable** (já configurado)

### Backend
As Edge Functions já estão deployadas no Supabase em:
`https://xvtupvwzzvludrhfqdai.supabase.co/functions/v1/`

---

## 📌 Observações Importantes

1. **Admin** nunca deve ser criado pelo formulário público — sempre via banco de dados alterando o campo `cargo` diretamente
2. **Fuso horário** — todas as datas são salvas em UTC e exibidas em `America/Sao_Paulo`
3. **Storage** — fotos de perfil ficam no bucket `avatars` com acesso público
4. **RLS** — todas as tabelas têm Row Level Security habilitado, acesso apenas para usuários autenticados

---

*Documentação gerada em 29 de Março de 2026.*
*Versão: 1.0*
