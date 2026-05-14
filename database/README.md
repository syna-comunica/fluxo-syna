# 🗄️ MySQL Database Setup - Fluxo Finance

## 📋 Visão Geral

Este documento descreve como configurar o banco de dados MySQL para o projeto **Fluxo Finance**, um sistema de gestão de finanças pessoais/agências com orçamentos, categorias e transações.

## 🏗️ Arquitetura do Banco de Dados

O banco de dados é estruturado em torno de 7 tabelas principais:

### Tabelas

1. **users** - Autenticação e dados básicos do usuário
2. **profiles** - Perfil estendido do usuário
3. **categories** - Categorias de transações (renda/despesa)
4. **transactions** - Transações financeiras (receitas e despesas)
5. **budgets** - Orçamentos por categoria e período mensal

### Tipos de Dados

- **tx_type**: `income` (renda) ou `expense` (despesa)
- **tx_status**: `pending` (pendente) ou `paid` (pago)

## 🚀 Instalação

### Pré-requisitos

- MySQL 8.0+ instalado
- Cliente MySQL (`mysql` CLI) ou GUI (MySQL Workbench, DBeaver, etc.)
- O arquivo `mysql_schema.sql` do projeto

### Passo 1: Conectar ao MySQL

```bash
mysql -u root -p
```

Insira sua senha de root quando solicitado.

### Passo 2: Executar o Schema

```bash
# Opção 1: Via CLI
mysql -u root -p < database/mysql_schema.sql

# Opção 2: Dentro do MySQL CLI
mysql> source database/mysql_schema.sql;

# Opção 3: Via GUI (DBeaver, MySQL Workbench)
# Abra o arquivo mysql_schema.sql e execute
```

### Passo 3: Verificar Criação

```bash
mysql -u root -p fluxo_finance

# Verificar tabelas criadas
SHOW TABLES;

# Verificar estrutura de uma tabela
DESCRIBE users;
```

## 📊 Estrutura Detalhada das Tabelas

### users
Tabela principal de usuários (substitui `auth.users` do Supabase)

```sql
id                CHAR(36)        -- UUID único
email             VARCHAR(255)    -- Email único
password_hash     VARCHAR(255)    -- Hash bcrypt
agency_name       VARCHAR(255)    -- Nome da agência
created_at        TIMESTAMP       -- Data de criação
updated_at        TIMESTAMP       -- Data de atualização
last_login        TIMESTAMP       -- Último acesso
is_active         BOOLEAN         -- Status ativo/inativo
```

### categories
Categorias de transações (customizáveis por usuário)

```sql
id                CHAR(36)        -- UUID único
user_id           CHAR(36)        -- FK → users
name              VARCHAR(255)    -- Nome da categoria
type              ENUM            -- 'income' ou 'expense'
color             VARCHAR(7)      -- Cor em HEX (#3b82f6)
created_at        TIMESTAMP       -- Data de criação
```

**Categorias Padrão Criadas:**
- Serviços (renda, verde)
- Retainer (renda, azul)
- Tráfego Pago (despesa, vermelho)
- Folha (despesa, laranja)
- Software/SaaS (despesa, roxo)
- Operacional (despesa, cinza)

### transactions
Registro de todas as transações financeiras

```sql
id                CHAR(36)        -- UUID único
user_id           CHAR(36)        -- FK → users
category_id       CHAR(36)        -- FK → categories (nullable)
description       VARCHAR(500)    -- Descrição/motivo
amount            DECIMAL(14,2)   -- Valor (não negativo)
type              ENUM            -- 'income' ou 'expense'
status            ENUM            -- 'pending' ou 'paid'
due_date          DATE            -- Data de vencimento
paid_date         DATE            -- Data de pagamento (nullable)
notes             TEXT            -- Notas adicionais
created_at        TIMESTAMP       -- Data de criação
updated_at        TIMESTAMP       -- Data de atualização
```

**Índices Otimizados:**
- `idx_user_due` (user_id, due_date) - Busca rápida por período
- `idx_user_status` (user_id, status) - Filtro por status
- `idx_user_type` (user_id, type) - Separação receita/despesa

### budgets
Orçamentos planejados por categoria e mês

```sql
id                CHAR(36)        -- UUID único
user_id           CHAR(36)        -- FK → users
category_id       CHAR(36)        -- FK → categories
month             DATE            -- Primeiro dia do mês
planned_amount    DECIMAL(14,2)   -- Valor orçado
created_at        TIMESTAMP       -- Data de criação
```

**Restrição:**
- Um orçamento único por usuário + categoria + mês
- Deletar categoria deleta orçamentos associados

## 🔌 Conectando a Aplicação

### Backend (Node.js + Hono)

Para migrar de Supabase para MySQL, atualize o `backend/src/index.ts`:

```typescript
// Remova @supabase/supabase-js
// import { createClient } from "@supabase/supabase-js";

// Adicione mysql2
import mysql from 'mysql2/promise';

// Crie o pool de conexão
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: 'fluxo_finance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

Atualize `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=fluxo_finance
```

### Frontend

Remova ou desabilite imports do Supabase em `src/integrations/supabase/`:
- `client.ts`
- `client.server.ts`
- `auth-middleware.ts`

Crie novos módulos para autenticação via JWT com MySQL.

## 📈 Queries Úteis

### Resumo de Transações por Mês

```sql
SELECT 
  DATE_TRUNC(due_date, MONTH) as mes,
  type,
  SUM(amount) as total
FROM transactions
WHERE user_id = 'seu-user-id'
GROUP BY DATE_TRUNC(due_date, MONTH), type
ORDER BY mes DESC;
```

### Gasto vs Orçamento por Categoria

```sql
SELECT 
  c.name,
  b.planned_amount,
  SUM(t.amount) as spent,
  (b.planned_amount - SUM(t.amount)) as remaining
FROM budgets b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON t.category_id = c.id 
  AND MONTH(t.due_date) = MONTH(b.month)
WHERE b.user_id = 'seu-user-id'
GROUP BY b.id, c.name;
```

### Transações Pendentes

```sql
SELECT 
  description,
  amount,
  due_date,
  DATEDIFF(CURDATE(), due_date) as dias_vencimento
FROM transactions
WHERE user_id = 'seu-user-id'
  AND status = 'pending'
ORDER BY due_date ASC;
```

## 🔐 Segurança

### Recomendações

1. **Usuário dedicado para aplicação**
   ```sql
   CREATE USER 'fluxo_app'@'localhost' IDENTIFIED BY 'senha_forte';
   GRANT ALL PRIVILEGES ON fluxo_finance.* TO 'fluxo_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Backup regular**
   ```bash
   mysqldump -u root -p fluxo_finance > backup_$(date +%Y%m%d).sql
   ```

3. **Row-Level Security** (simulado via aplicação)
   - Sempre filtrar por `user_id` nas queries
   - Validar JWT token antes de qualquer operação
   - Nunca confiar em `user_id` do cliente

## 🐛 Troubleshooting

### Erro: "Unknown database 'fluxo_finance'"
```sql
-- Verifique se foi criado
SHOW DATABASES;

-- Se não estiver, execute o schema novamente
source database/mysql_schema.sql;
```

### Erro: "Duplicate entry for unique key"
```sql
-- Limpe e recrie
DROP DATABASE IF EXISTS fluxo_finance;
-- Execute o schema novamente
```

### Performance lenta
```sql
-- Analise índices
ANALYZE TABLE transactions;

-- Verifique query plan
EXPLAIN SELECT * FROM transactions WHERE user_id = '...';
```

## 📚 Próximos Passos

1. ✅ Criar o banco de dados com `mysql_schema.sql`
2. ⏳ Atualizar `backend/package.json` para adicionar `mysql2`
3. ⏳ Migrar código de autenticação de Supabase para JWT + MySQL
4. ⏳ Criar queries/procedures para operações comuns
5. ⏳ Implementar cache (Redis) para otimização

## 📞 Referências

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/)
- [mysql2 NPM Package](https://www.npmjs.com/package/mysql2)
- [JWT Authentication](https://jwt.io/)

---

**Versão:** 1.0  
**Atualizado:** 2026-05-14
