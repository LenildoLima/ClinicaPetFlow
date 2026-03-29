# 🚀 PetFlow - Edge Functions

## Estrutura
```
supabase/
└── functions/
    ├── enviar-lembrete-consulta/
    │   └── index.ts
    ├── calcular-financeiro/
    │   └── index.ts
    ├── buscar-historico-pet/
    │   └── index.ts
    ├── relatorio-dashboard/
    │   └── index.ts
    └── cancelar-consulta/
        └── index.ts
```

---

## 📦 O que cada função faz

| Function | Método | Descrição |
|---|---|---|
| `enviar-lembrete-consulta` | GET | Busca consultas de amanhã e retorna os lembretes |
| `calcular-financeiro` | POST | Gera cobrança ao concluir consulta |
| `buscar-historico-pet` | GET | Retorna histórico completo do pet |
| `relatorio-dashboard` | GET | Estatísticas completas para o dashboard |
| `cancelar-consulta` | POST | Cancela consulta e financeiro pendente |

---

## ⚙️ Como instalar

### 1. Instalar o Supabase CLI
```bash
npm install -g supabase
```

### 2. Fazer login no Supabase
```bash
supabase login
```

### 3. Linkar com o projeto
```bash
supabase link --project-ref xvtupvwzzvludrhfqdai
```

### 4. Copiar as funções para a pasta correta
Copie a pasta `functions/` para dentro da pasta `supabase/` do seu projeto:
```
C:\Projetos_programacao\PetFlow\supabase\functions\
```

### 5. Fazer deploy de todas as funções
```bash
supabase functions deploy enviar-lembrete-consulta
supabase functions deploy calcular-financeiro
supabase functions deploy buscar-historico-pet
supabase functions deploy relatorio-dashboard
supabase functions deploy cancelar-consulta
```

---

## 📡 Como chamar as funções no frontend

```typescript
import { supabase } from "@/lib/supabase";

// Relatório do dashboard
const { data } = await supabase.functions.invoke("relatorio-dashboard");

// Histórico do pet
const { data } = await supabase.functions.invoke("buscar-historico-pet", {
  body: null,
  headers: { "Content-Type": "application/json" },
  method: "GET",
  // Passe o pet_id via query param: ?pet_id=xxx
});

// Calcular financeiro
const { data } = await supabase.functions.invoke("calcular-financeiro", {
  body: {
    consulta_id: "uuid-da-consulta",
    forma_pagamento: "pix",
    desconto: 0,
    itens: [
      { descricao: "Consulta clínica", quantidade: 1, valor_unitario: 120.00 }
    ]
  }
});

// Cancelar consulta
const { data } = await supabase.functions.invoke("cancelar-consulta", {
  body: {
    consulta_id: "uuid-da-consulta",
    motivo_cancelamento: "Tutor solicitou cancelamento"
  }
});

// Enviar lembretes
const { data } = await supabase.functions.invoke("enviar-lembrete-consulta");
```
