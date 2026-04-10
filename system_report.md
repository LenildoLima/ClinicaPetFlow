# Relatório Técnico do Sistema PetFlow

Este relatório fornece uma visão detalhada da arquitetura, estrutura de arquivos e módulos do sistema PetFlow.

## 1. Visão Geral da Arquitetura
O PetFlow é uma aplicação web moderna construída com uma arquitetura de Camada Única (SPA) integrada a um Backend-as-a-Service (BaaS).

- **Frontend**: React + Vite + TypeScript.
- **Estilização**: Tailwind CSS com componentes Shadcn UI para uma interface premium e responsiva.
- **Backend**: Supabase (PostgreSQL, Auth, Storage e Realtime).
- **Gerenciamento de Estado**: React Context API e TanStack Query (React Query).

---

## 2. Estrutura de Diretórios

### `/frontend` (Núcleo da Aplicação)
Contém toda a lógica de interface e regras de negócio do cliente.
- **`/src/pages`**: Contém os 20 módulos principais do sistema.
- **`/src/components`**: Componentes reutilizáveis e o `AppLayout` (estrutura global).
- **`/src/contexts`**: Gerenciamento global de Autenticação e Notificações.
- **`/src/lib`**: Configurações de bibliotecas externas (Supabase client).

### `/supabase` (Backend e Infraestrutura)
- **`/functions`**: Edge Functions para processamentos complexos fora do navegador.
- **Scripts SQL**: Localizados na raiz para atualizações de banco de dados (ex: `UPDATE_CAIXA.sql`).

---

## 3. Módulos e Funcionalidades

### 🩺 Módulo de Atendimento Clínico
Focado na rotina do veterinário e cuidado com o animal.
- `Pets.tsx`: Gestão de pacientes.
- `PetHistorico.tsx`: Histórico clínico completo.
- `Prontuario.tsx`: Interface de preenchimento de consultas.
- `Agenda.tsx` / `MinhaAgenda.tsx`: Gestão de horários global e individual por profissional.

### 💰 Módulo Financeiro e Administrativo
Controle completo de fluxo de caixa e faturamento.
- `Financeiro.tsx`: Dashboard financeiro e lançamentos.
- `Caixa.tsx`: Interface de frente de caixa (PDV) para cobranças rápidas.
- `NovaCobranca.tsx`: Checkout otimizado com múltiplos métodos de pagamento.
- `Estoque.tsx`: Controle de produtos, validade e níveis críticos.

### 👥 Módulo de CRM e Social
- `Tutores.tsx`: Cadastro detalhado de clientes e filtragem inteligente.
- `Notificacoes.tsx`: Alertas em tempo real baseados em eventos do sistema.

### 📊 Inteligência e Configuração
- `Dashboard.tsx`: Visão analítica com gráficos de desempenho.
- `Relatorios.tsx`: Geração de dados para tomada de decisão.
- `Configuracoes.tsx`: Personalização do sistema e dados da clínica.

---

## 4. Diferenciais Tecnológicos
1. **Realtime**: O sistema usa WebSockets via Supabase para atualizar notificações e status instantaneamente em todos os terminais conectados.
2. **Glassmorphism UI**: Aplicação de efeitos de vidro fosco e cores vibrantes para uma experiência de usuário visualmente atraente e profissional.
3. **Segurança por Funções (RBAC)**: Uso de `RoleRoute` para garantir que apenas usuários autorizados (Admin, Veterinário, Recepcionista) acessem módulos específicos.
4. **Resiliência de Rede**: Implementação de proteções contra condições de corrida (Race Conditions) em buscas e filtros, garantindo integridade dos dados exibidos.

---
**Status do Sistema**: Operacional e Otimizado.
**Data do Relatório**: 10 de Abril de 2026.
