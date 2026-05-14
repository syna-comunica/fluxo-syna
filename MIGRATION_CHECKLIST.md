# 🎯 Checklist de Migração: Supabase → MySQL

## ✅ Concluído

### Backend
- [x] Instalar `mysql2` e `jsonwebtoken`
- [x] Criar `backend/src/db.ts` - Pool de conexões MySQL
- [x] Criar `backend/src/auth.ts` - Autenticação JWT
- [x] Reescrever `backend/src/index.ts` com endpoints MySQL
- [x] Atualizar `backend/.env.example` com variáveis MySQL
- [x] Atualizar `backend/package.json` com dependências corretas

### Database
- [x] Criar `database/mysql_schema.sql` - Schema completo
- [x] Criar `database/.env.example` - Variáveis de banco
- [x] Criar `database/setup.sh` - Script interativo

### Documentação
- [x] Criar `MIGRATION_SUPABASE_TO_MYSQL.md` - Guia completo
- [x] Criar `database/README.md` - Documentação do banco

## ⏳ A Fazer

### Backend Endpoints (Ainda não implementado)
- [ ] `POST /api/auth/login` - Login com email/password
- [ ] `POST /api/auth/register` - Registro de novo usuário
- [ ] `POST /api/auth/refresh` - Renovar token JWT
- [ ] `GET /api/auth/me` - Perfil do usuário autenticado

### Frontend
- [ ] Remover imports de Supabase em `src/integrations/supabase/`
- [ ] Implementar `src/lib/auth.ts` com funções JWT
- [ ] Atualizar `src/hooks/use-auth.tsx` para usar JWT
- [ ] Criar `src/lib/api.ts` helper para requisições autenticadas
- [ ] Atualizar `src/routes/login.tsx` para novo fluxo
- [ ] Testar todos os endpoints

### DevOps/Produção
- [ ] Configurar variáveis de ambiente em servidor
- [ ] Backup strategy para MySQL
- [ ] Monitoramento e logs
- [ ] Rate limiting em API
- [ ] CORS policies finais

## 📋 Pré-requisitos para Testar

1. **MySQL rodando localmente:**
   ```bash
   brew services start mysql
   # ou
   mysql.server start
   ```

2. **Banco de dados criado:**
   ```bash
   mysql -u root -p < database/mysql_schema.sql
   ```

3. **Backend rodando:**
   ```bash
   cd backend
   npm run dev
   # deve mostrar: "Finance API http://localhost:8787"
   ```

4. **Testar health check:**
   ```bash
   curl http://localhost:8787/health
   # Response: {"ok":true}
   ```

## 🔄 Alteração Mais Importante: Autenticação

### Antes (Supabase)
```typescript
// Supabase gerencia login/logout
const { data: { user } } = await sb.auth.getUser(jwt);
```

### Depois (JWT Manual)
```typescript
// Você gerencia tokens no localStorage
const token = localStorage.getItem('auth_token');
// Bearer token em cada requisição
Authorization: Bearer ${token}
```

## 📊 Estrutura de Pastas

```
fluxo-syna-main/
├── backend/
│   ├── src/
│   │   ├── index.ts        # ✅ Migrado para MySQL
│   │   ├── db.ts          # ✅ Novo - Pool MySQL
│   │   └── auth.ts        # ✅ Novo - JWT
│   ├── package.json        # ✅ mysql2 + jwt
│   └── .env.example        # ✅ Variáveis MySQL
├── database/
│   ├── mysql_schema.sql    # ✅ Schema completo
│   ├── setup.sh            # ✅ Script interativo
│   ├── .env.example        # ✅ Vars de DB
│   └── README.md           # ✅ Documentação
└── MIGRATION_SUPABASE_TO_MYSQL.md  # ✅ Guia completo
```

## 🔐 Segurança - Checklist

- [ ] `JWT_SECRET` tem mínimo 32 caracteres
- [ ] Password hashing implementado (bcrypt)
- [ ] Rate limiting na API
- [ ] HTTPS em produção
- [ ] SQL Injection prevention (usando prepared statements)
- [ ] CORS corretamente configurado
- [ ] Tokens expirando (7 dias)
- [ ] Refresh token strategy

## 🧪 Testes Manuais (Após Implementação)

```bash
# 1. Health check (sem auth)
curl http://localhost:8787/health

# 2. Tentar acessar sem token (deve falhar)
curl http://localhost:8787/api/categories

# 3. Login (quando endpoint existir)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 4. Usar token retornado
curl http://localhost:8787/api/categories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 5. Criar categoria
curl -X POST http://localhost:8787/api/categories \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Serviços",
    "type": "income",
    "color": "#16a34a"
  }'
```

## 📞 Suporte

Para problemas:
1. Verificar [MIGRATION_SUPABASE_TO_MYSQL.md](MIGRATION_SUPABASE_TO_MYSQL.md)
2. Verificar [database/README.md](database/README.md)
3. Testar conectividade: `mysql -u root -p fluxo_finance`

---

**Status Geral:** 🟡 60% Completo
- ✅ Backend migrado
- ⏳ Endpoints de auth faltando
- ⏳ Frontend não atualizado ainda

**Próxima Prioridade:** Implementar endpoints de autenticação (`/auth/login`, `/auth/register`)
