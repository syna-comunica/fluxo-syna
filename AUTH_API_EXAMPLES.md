# 🔐 Autenticação API - Exemplos de Uso

## Endpoints Implementados

### 1. **POST /api/auth/register** - Criar nova conta

Cria um novo usuário com email/senha e categorias padrão.

**Request:**
```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123456",
    "agency_name": "Minha Agência"
  }'
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros possíveis:**
- `400` - Validação falhou (email inválido, senha muito curta)
- `409` - Email já registrado

---

### 2. **POST /api/auth/login** - Fazer login

Autentica um usuário com email/senha e retorna JWT token.

**Request:**
```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123456"
  }'
```

**Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "usuario@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros possíveis:**
- `400` - Validação falhou
- `401` - Email ou senha inválidos

---

### 3. **GET /api/auth/me** - Perfil do usuário

Retorna dados do usuário autenticado.

**Request:**
```bash
curl -X GET http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "usuario@example.com",
  "agency_name": "Minha Agência",
  "created_at": "2026-05-14T11:30:00.000Z",
  "last_login": "2026-05-14T12:00:00.000Z"
}
```

**Erros possíveis:**
- `401` - Token inválido ou ausente
- `404` - Usuário não encontrado

---

## 📱 Fluxo Completo de Autenticação

### 1️⃣ Registrar novo usuário
```bash
TOKEN=$(curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@example.com",
    "password": "senha123456",
    "agency_name": "Nova Agência"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

### 2️⃣ Usar token em requisições protegidas
```bash
# Listar categorias (requer autenticação)
curl -X GET http://localhost:8787/api/categories \
  -H "Authorization: Bearer $TOKEN"

# Criar transação
curl -X POST http://localhost:8787/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Serviço prestado",
    "amount": 1000,
    "type": "income",
    "status": "pending",
    "due_date": "2026-05-20"
  }'

# Ver perfil
curl -X GET http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3️⃣ Login após logout
```bash
# Fazer login novamente
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@example.com",
    "password": "senha123456"
  }'
```

---

## 🔑 JWT Token Details

**Estrutura:**
```
Header.Payload.Signature
```

**Payload (decodificado):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1715761800,
  "exp": 1716366600
}
```

**Propriedades:**
- **userId** - ID do usuário
- **iat** - Issued at (Unix timestamp)
- **exp** - Expiration (7 dias)

---

## 📋 Validações

### Password
- Mínimo 8 caracteres
- Sem limites de caracteres especiais
- Case-sensitive

### Email
- Deve ser válido (RFC 5322)
- Único por usuário
- Case-insensitive

### Agency Name
- Opcional
- Default: "Minha Agência"

---

## 🧪 Teste com Insomnia/Postman

### 1. Register
```
POST http://localhost:8787/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPassword123",
  "agency_name": "Test Agency"
}
```

### 2. Login
```
POST http://localhost:8787/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPassword123"
}
```

### 3. Get Profile
```
GET http://localhost:8787/api/auth/me
Authorization: Bearer {{token}}
```

---

## 🚨 Tratamento de Erros

### 400 - Bad Request
```json
{
  "error": {
    "fieldErrors": {
      "email": ["Invalid email"],
      "password": ["String must contain at least 8 character(s)"]
    }
  }
}
```

### 401 - Unauthorized
```json
{
  "error": "Invalid email or password"
}
```

```json
{
  "error": "Invalid or expired token"
}
```

### 409 - Conflict
```json
{
  "error": "Email already registered or registration failed"
}
```

---

## 💾 Armazenar Token (Frontend)

### localStorage
```javascript
// Após login/register
const response = await fetch('http://localhost:8787/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token } = await response.json();
localStorage.setItem('auth_token', token);
```

### Usar em requisições
```javascript
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:8787/api${endpoint}`,
    {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (response.status === 401) {
    // Token expirou - redirecionar para login
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  return response.json();
}
```

---

## 📊 Categorias Padrão Criadas

Ao registrar, essas categorias são criadas automaticamente:

| Nome | Tipo | Cor |
|------|------|-----|
| Serviços | income | #16a34a |
| Retainer | income | #0ea5e9 |
| Tráfego Pago | expense | #ef4444 |
| Folha | expense | #f59e0b |
| Software/SaaS | expense | #8b5cf6 |
| Operacional | expense | #64748b |

---

## 🔒 Segurança

✅ **Implementado:**
- Password hashing com bcryptjs (salt rounds: 10)
- JWT tokens com expiração (7 dias)
- CORS configurado
- Validação de email/senha
- User activation status

⏳ **A fazer em produção:**
- HTTPS obrigatório
- Rate limiting
- Refresh tokens
- 2FA (autenticação de dois fatores)
- Login audit trail

---

**Última atualização:** 14/05/2026
