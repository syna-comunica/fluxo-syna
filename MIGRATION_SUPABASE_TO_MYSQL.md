# 🔄 Migração: Supabase → MySQL

## ✅ Mudanças Realizadas

O backend foi completamente migrado de **Supabase (PostgreSQL)** para **MySQL** com autenticação JWT.

### Arquivos Modificados

1. **backend/package.json**
   - Removido: `@supabase/supabase-js`
   - Adicionado: `mysql2`, `jsonwebtoken`

2. **backend/.env.example**
   - Novo: variáveis de banco MySQL
   - Novo: `JWT_SECRET` para autenticação

3. **backend/src/index.ts**
   - Removida toda lógica Supabase
   - Implementada conexão MySQL
   - Implementada autenticação JWT

4. **backend/src/db.ts** (novo)
   - Pool de conexões MySQL
   - Funções helper para queries

5. **backend/src/auth.ts** (novo)
   - Geração e verificação de JWT
   - Validação de usuários

## 🚀 Setup Inicial

### 1. Criar banco de dados MySQL

```bash
# Executar schema do MySQL
mysql -u root -p < database/mysql_schema.sql

# Ou usar o script interativo
./database/setup.sh
```

### 2. Instalar dependências do backend

```bash
cd backend
npm install
```

### 3. Configurar variáveis de ambiente

```bash
# Copiar template
cp backend/.env.example backend/.env

# Editar com suas credenciais
nano backend/.env
```

**Exemplo de .env:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=fluxo_finance

JWT_SECRET=sua_chave_secreta_super_segura_minimo_32_caracteres

PORT=8787
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### 4. Iniciar o servidor

```bash
npm run dev
```

## 🔐 Autenticação JWT

### Fluxo de Login (a implementar no frontend)

1. **Criar usuário no banco:**
```sql
INSERT INTO users (id, email, password_hash, agency_name, is_active) 
VALUES (UUID(), 'user@example.com', '$2b$10$...', 'Minha Agência', TRUE);
```

2. **Fazer login e obter token:**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "senha123"
}

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "..." }
}
```

3. **Usar token em requisições:**
```bash
GET /api/categories
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Details

- **Tipo:** JWT (JSON Web Token)
- **Algoritmo:** HS256
- **Expiração:** 7 dias
- **Payload:** `{ userId }`

## 📝 Endpoints Disponíveis

Todos os endpoints requerem header `Authorization: Bearer <token>`

### Categories
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria
- `DELETE /api/categories/:id` - Deletar categoria

### Transactions
- `GET /api/transactions` - Listar transações
- `POST /api/transactions` - Criar transação
- `PATCH /api/transactions/:id` - Atualizar transação
- `DELETE /api/transactions/:id` - Deletar transação

### Budgets
- `GET /api/budgets?month=2026-05-01` - Listar orçamentos
- `POST /api/budgets` - Criar/atualizar orçamento

### Health
- `GET /health` - Status do servidor (sem autenticação)

## 🔄 Mudanças no Frontend

### Remover Supabase Client

**src/integrations/supabase/client.ts** - Delete ou deixe vazio

### Implementar Auth com JWT

Crie `src/lib/auth.ts`:
```typescript
export async function login(email: string, password: string) {
  const response = await fetch(
    `${import.meta.env.VITE_FINANCE_API_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }
  );
  
  if (!response.ok) throw new Error('Login failed');
  
  const { token } = await response.json();
  localStorage.setItem('auth_token', token);
  return token;
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function logout() {
  localStorage.removeItem('auth_token');
}
```

### Atualizar Hooks

Em `src/hooks/use-auth.tsx`, atualize para usar JWT:
```typescript
export function useAuth() {
  const token = localStorage.getItem('auth_token');
  return { 
    isAuthenticated: !!token,
    token 
  };
}
```

### API Client Helper

Crie `src/lib/api.ts`:
```typescript
export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `${import.meta.env.VITE_FINANCE_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  return response.json();
}
```

## 🐛 Troubleshooting

### Erro: "Cannot find module mysql2"
```bash
cd backend && npm install mysql2
```

### Erro: "JWT_SECRET not configured"
- Verifique se `JWT_SECRET` está em `backend/.env`
- JWT_SECRET deve ter mínimo 32 caracteres

### Erro: "Connection refused"
- MySQL está rodando? `brew services start mysql`
- Credenciais corretas em `.env`?
- Banco `fluxo_finance` foi criado?

### Transações retornam null
- Use `SELECT LAST_INSERT_ID()` após INSERT
- Verá o UUID gerado pelo banco

## 📦 Arquivo de Exemplo de Usuário

Para testar rapidamente, insira um usuário de teste:

```sql
-- UUID: 550e8400-e29b-41d4-a716-446655440000
-- Email: test@example.com
-- Password Hash: bcrypt("password123")

INSERT INTO users (id, email, password_hash, agency_name, is_active) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  '$2b$10$slYQmyNdGzin7olVN3lICe3PzMtVhZDJq72a5TZf/f0qvF9/Oe1Ym',
  'Test Agency',
  TRUE
);
```

**Senha de teste:** `password123`

## ✨ Próximos Passos

1. ⏳ Implementar endpoint `/api/auth/login`
2. ⏳ Implementar endpoint `/api/auth/register`
3. ⏳ Atualizar frontend para usar JWT
4. ⏳ Remover dependências Supabase do frontend
5. ⏳ Testes E2E com MySQL

---

**Migração Concluída:** 14/05/2026
