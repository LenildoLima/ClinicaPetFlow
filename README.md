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
8. [Fluxo de Atendimento](#fluxo-de-atendimento)
9. [PWA](#pwa)
10. [Como Instalar e Rodar](#como-instalar-e-rodar)
11. [Deploy](#deploy)

---

## Visão Geral

O **PetFlow** é um sistema completo de gestão para clínicas veterinárias. Permite o controle de tutores, pets, consultas, prontuários clínicos, estoque, financeiro e caixa diário, com acesso diferenciado por cargo (Administrador, Veterinário e Recepcionista).

### Funcionalidades principais
- Cadastro de tutores e pets com histórico clínico completo
- Agendamento e gestão de consultas por cargo
- Prontuário eletrônico com prescrições, exames e vacinas
- Integração automática estoque → prontuário → financeiro
- Cobrança automática gerada ao finalizar atendimento
- Fluxo rascunho → revisão → pagamento no financeiro
- Controle de estoque com baixa automática
- Controle de caixa diário com histórico em tempo real
- Relatórios em PDF (financeiro, consultas, estoque, veterinários)
- PWA instalável no celular e PC
- Autenticação e controle de acesso por cargo
- Upload de fotos de perfil no Storage

---

## Arquitetura e Tecnologias

| Camada | Tecnologia |
|---|---|
| 🎨 Frontend | React + Vite + TypeScript |
| 🎨 Estilização | Tailwind CSS + shadcn/ui |
| 🗄️ Banco de Dados | Supabase (PostgreSQL) |
| 🔐 Autenticação | Supabase Auth |
| 📦 Storage | Supabase Storage (buckets: avatars, produtos) |
| ⚙️ Backend/API | Supabase Edge Functions (Deno) |
| 🔀 Roteamento | React Router |
| 📊 Gráficos | Recharts |
| 📄 PDF | jsPDF |
| 📱 PWA | vite-plugin-pwa |
| 🧩 Ícones | lucide-react |

### Observação sobre fuso horário
O Supabase salva todas as datas em **UTC**. O frontend sempre converte para o horário de Brasília (`America/Sao_Paulo` — UTC-3) ao exibir datas e horários. Ao salvar, o offset `-03:00` é aplicado.

---

## Estrutura de Pastas

```
PetFlow/
├── frontend/                        # Aplicação React + Vite
│   ├── public/                      # Assets estáticos e ícones PWA
│   │   ├── icon-192x192.png         # Ícone PWA pequeno
│   │   ├── icon-512x512.png         # Ícone PWA grande
│   │   └── apple-touch-icon.png     # Ícone para iPhone
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
│   │   │   ├── Dashboard.tsx        # Painel principal (admin)
│   │   │   ├── Tutores.tsx          # Gestão de tutores
│   │   │   ├── Pets.tsx             # Gestão de pets
│   │   │   ├── PetHistorico.tsx     # Histórico clínico do pet
│   │   │   ├── Agenda.tsx           # Agenda (admin/recepcionista)
│   │   │   ├── MinhaAgenda.tsx      # Agenda (veterinário)
│   │   │   ├── Prontuarios.tsx      # Listagem de prontuários
│   │   │   ├── Prontuario.tsx       # Prontuário durante atendimento
│   │   │   ├── Financeiro.tsx       # Gestão financeira
│   │   │   ├── Caixa.tsx            # Controle de caixa
│   │   │   ├── Estoque.tsx          # Gestão de estoque
│   │   │   ├── Servicos.tsx         # Catálogo de serviços
│   │   │   ├── Relatorios.tsx       # Relatórios em PDF
│   │   │   └── Configuracoes.tsx    # Configurações e perfil
│   │   ├── App.tsx                  # Rotas e providers
│   │   └── main.tsx                 # Ponto de entrada
│   ├── package.json
│   ├── vite.config.ts               # Configuração Vite + PWA
│   ├── vercel.json                  # Configuração de rotas SPA
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
Perfis dos usuários do sistema.

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
| observacoes | TEXT | Observações do agendamento |
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
| observacoes | TEXT | Observações gerais |
| data_emissao | DATE | Data de emissão |

**Formato do campo `medicamentos` (JSONB):**
```json
[
  {
    "nome": "Amoxicilina",
    "dose": "250mg",
    "frequencia": "12h",
    "duracao": "7 dias",
    "via": "oral",
    "preco": 4.00,
    "venderNaClinica": true,
    "quantidade": 1
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
| veterinario_id | UUID (FK) | Veterinário |
| tipo | TEXT | Tipo do exame |
| descricao | TEXT | Descrição / motivo |
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
| observacoes | TEXT | Observações |

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
| status | TEXT | rascunho / pendente / pago / cancelado / reembolsado |
| data_vencimento | DATE | Data de vencimento |
| data_pagamento | DATE | Data do pagamento |
| criado_por | UUID (FK) | Quem criou |

> ⚠️ O status **rascunho** é gerado automaticamente ao finalizar o atendimento. A recepcionista revisa e confirma para **pendente**.

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
| obrigatorio | BOOLEAN | Se pode ser removido pela recepcionista |

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
| saldo_inicial | DECIMAL | Saldo ao abrir (= saldo final do dia anterior) |
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

#### `estoque_categorias`
Categorias de produtos do estoque.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| nome | TEXT | Nome da categoria |
| descricao | TEXT | Descrição |
| ativo | BOOLEAN | Se está ativa |

---

#### `estoque_produtos`
Produtos do estoque da clínica.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| categoria_id | UUID (FK) | Categoria do produto |
| nome | TEXT | Nome do produto |
| descricao | TEXT | Descrição |
| marca | TEXT | Marca/fabricante |
| unidade | TEXT | unidade / caixa / frasco / kg / g / ml / l / saco |
| preco_custo | DECIMAL | Preço de custo |
| preco_venda | DECIMAL | Preço de venda |
| estoque_atual | INT | Quantidade atual |
| estoque_minimo | INT | Alerta quando atingir |
| codigo_barras | TEXT | Código de barras |
| foto_url | TEXT | URL da foto |
| ativo | BOOLEAN | Se está ativo |

---

#### `estoque_movimentacoes`
Histórico de movimentações do estoque.

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID (PK) | Identificador único |
| produto_id | UUID (FK) | Produto |
| tipo | TEXT | entrada / saida / venda / ajuste |
| quantidade | INT | Quantidade movimentada |
| quantidade_anterior | INT | Estoque antes da movimentação |
| quantidade_atual | INT | Estoque após a movimentação |
| motivo | TEXT | Motivo da movimentação |
| consulta_id | UUID (FK) | Consulta vinculada (opcional) |
| financeiro_id | UUID (FK) | Financeiro vinculado (opcional) |
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

### `cancelar-consulta`
**Método:** POST
Cancela a consulta e o financeiro pendente vinculado.

### `enviar-lembrete-consulta`
**Método:** GET
Busca consultas do dia seguinte com status `agendado` e retorna os dados para envio de lembretes.

---

## Páginas e Funcionalidades

### Login (`/login`)
- Formulário de login com email e senha
- Formulário de cadastro com: foto, nome, email, telefone, cargo, CRMV, senha
- Após login redireciona conforme cargo

### Dashboard (`/`)
- Acesso: Admin
- Cards: consultas hoje, agendadas, concluídas, tutores, pets, faturamento do dia, a receber
- Gráfico de barras com consultas dos últimos 7 dias
- Lista de próximas consultas do dia

### Tutores (`/tutores`)
- Acesso: Admin, Recepcionista
- Listagem, cadastro, edição e exclusão
- Busca automática de endereço por CEP (ViaCEP)

### Pets (`/pets`)
- Acesso: Admin, Veterinário, Recepcionista
- Listagem, cadastro, edição e exclusão
- Botão "Ver Histórico" → `/pets/:id`

### Histórico do Pet (`/pets/:id`)
- Acesso: Todos
- Dados completos do pet e tutor
- Cards: consultas, vacinas, exames, última visita, próx. reforço
- Abas: Consultas, Prontuários, Vacinas, Exames
- Badge para reforço atrasado ou próximo

### Agenda (`/agenda`)
- Acesso: Admin, Recepcionista
- Filtros por período e data específica
- Nova consulta completa com observações
- Troca de status e acesso ao prontuário

### Minha Agenda (`/minha-agenda`)
- Acesso: Veterinário
- Consultas filtradas pelo veterinário logado

### Prontuários (`/prontuarios`)
- Acesso: Admin, Veterinário
- Listagem com busca e filtros
- Detalhe: dados clínicos, prescrições, exames e vacinas
- Impressão de receita completa e prontuário completo

### Prontuário durante atendimento (`/prontuario/:id`)
- Acesso: Admin, Veterinário
- Fluxo em duas etapas: salvar clínico → adicionar itens → finalizar
- Prescrições: busca do estoque, baixa automática
- Exames: busca preço no catálogo automaticamente
- Vacinas: select do estoque, baixa automática
- Ao finalizar: gera rascunho no financeiro automaticamente

### Financeiro (`/financeiro`)
- Acesso: Admin, Recepcionista
- Cards de resumo financeiro
- Status rascunho → revisão → pendente → pago
- Modal de revisão para desmarcar itens opcionais

### Caixa (`/caixa`)
- Acesso: Admin, Recepcionista
- Abre com saldo do dia anterior automaticamente
- Vincula consulta e preenche valor automaticamente
- Histórico em tempo real para caixa aberto
- Alerta se caixa de dia anterior ficou aberto

### Estoque (`/estoque`)
- Acesso: Admin, Recepcionista (veterinário visualiza)
- Cards de alerta por nível de estoque
- Abas: Produtos, Movimentações, Categorias
- Tipos de movimentação: entrada / saída / venda / ajuste

### Serviços (`/servicos`)
- Acesso: Admin
- Catálogo de serviços e preços
- Usado para busca automática de preços no prontuário

### Relatórios (`/relatorios`)
- Acesso: Admin
- 4 relatórios em PDF: Financeiro, Consultas, Estoque, Veterinários

### Configurações (`/configuracoes`)
- Acesso: Todos
- Meu Perfil: editar dados, foto e senha
- Usuários (admin): gerenciar equipe

---

## Controle de Acesso

### Sidebar por cargo (com grupos)

**Admin:** Dashboard | Agenda, Tutores, Pets, Prontuários | Financeiro, Caixa | Estoque, Serviços | Relatórios, Configurações

**Veterinário:** Minha Agenda, Pets, Prontuários | Configurações

**Recepcionista:** Agenda, Tutores, Pets | Financeiro, Caixa | Estoque | Configurações

### Redirecionamento após login
- `admin` → `/dashboard`
- `veterinario` → `/minha-agenda`
- `recepcionista` → `/agenda`

---

## Fluxo de Atendimento

```
1. Recepcionista agenda a consulta
2. Veterinário abre o prontuário pela Agenda
3. Preenche Registro Clínico e salva
4. Adiciona Prescrições, Exames e Vacinas
5. Finaliza → sistema gera rascunho no financeiro
   + estoque atualizado automaticamente
6. Recepcionista revisa e confirma a cobrança
7. Tutor paga → recepcionista registra
8. Recepcionista registra entrada no Caixa
```

---

## PWA

O PetFlow é instalável em qualquer dispositivo como Progressive Web App.

**Android:** Banner automático → "Instalar" → ícone na tela inicial

**iPhone:** Safari → Compartilhar → "Adicionar à Tela de Início"

**PC:** Chrome → ícone na barra de endereço → instala como janela separada

**Atualizações:** Banner automático notifica quando há nova versão disponível.

---

## Como Instalar e Rodar

### Pré-requisitos
- Node.js 18+
- NPM ou Bun
- Supabase CLI
- Conta no Supabase

### 1. Clonar o repositório
```bash
git clone https://github.com/LenildoLima/ClinicaPetFlow.git
cd ClinicaPetFlow
```

### 2. Instalar dependências
```bash
cd frontend
npm install
```

### 3. Configurar variáveis de ambiente
Criar `frontend/.env`:
```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

### 4. Rodar localmente
```bash
npm run dev
```
Acesse: `http://localhost:5173`

### 5. Deploy das Edge Functions
```bash
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

### Vercel (Frontend)
1. Importar repositório no Vercel
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

---

## 📌 Observações Importantes

1. **Admin** — nunca criar pelo formulário, sempre via banco alterando o campo `cargo`
2. **Fuso horário** — datas salvas em UTC, exibidas em `America/Sao_Paulo`
3. **Storage** — fotos no bucket `avatars` com acesso público
4. **RLS** — todas as tabelas com Row Level Security habilitado
5. **Cobrança automática** — rascunho gerado ao finalizar atendimento com todos os itens
6. **Estoque integrado** — baixa automática ao salvar vacinas e medicamentos no prontuário
7. **PWA** — instalável como app no celular e PC sem loja de aplicativos

---

*Documentação atualizada em 01 de Abril de 2026.*
*Versão: 2.0*
