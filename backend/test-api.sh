#!/bin/bash

# ============================================
# Fluxo Finance - API Test Script
# ============================================
# Script para testar endpoints de autenticação

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:8787"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123"
TEST_AGENCY="Test Agency $(date +%s)"

print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if API is running
check_api() {
  print_header "Verificando Conexão com API"
  
  if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    print_error "API não está respondendo em $API_URL"
    echo "Inicie o servidor com: cd backend && npm run dev"
    exit 1
  fi
  
  print_success "API está respondendo"
}

# Test registration
test_register() {
  print_header "Teste 1: Registro de Novo Usuário"
  
  print_info "Email: $TEST_EMAIL"
  print_info "Senha: $TEST_PASSWORD"
  print_info "Agência: $TEST_AGENCY"
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\",
      \"agency_name\": \"$TEST_AGENCY\"
    }")
  
  # Verificar se tem token na resposta
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    print_error "Falha no registro"
    echo "Resposta: $RESPONSE"
    return 1
  fi
  
  print_success "Usuário registrado com sucesso"
  print_info "User ID: $USER_ID"
  print_info "Token obtido (primeiros 30 chars): ${TOKEN:0:30}..."
  
  # Salvar token para próximos testes
  echo "$TOKEN" > /tmp/auth_token.txt
  echo "$TEST_EMAIL" > /tmp/test_email.txt
  echo "$TEST_PASSWORD" > /tmp/test_password.txt
}

# Test login
test_login() {
  print_header "Teste 2: Login"
  
  print_info "Email: $TEST_EMAIL"
  print_info "Senha: $TEST_PASSWORD"
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")
  
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    print_error "Falha no login"
    echo "Resposta: $RESPONSE"
    return 1
  fi
  
  print_success "Login realizado com sucesso"
  print_info "Token obtido (primeiros 30 chars): ${TOKEN:0:30}..."
  
  # Atualizar token
  echo "$TOKEN" > /tmp/auth_token.txt
}

# Test invalid password
test_invalid_password() {
  print_header "Teste 3: Login com Senha Inválida"
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"WrongPassword123\"
    }")
  
  if echo "$RESPONSE" | grep -q "Invalid email or password"; then
    print_success "Erro esperado recebido"
    return 0
  else
    print_error "Erro não recebido"
    echo "Resposta: $RESPONSE"
    return 1
  fi
}

# Test get profile
test_profile() {
  print_header "Teste 4: Obter Perfil do Usuário"
  
  if [ ! -f /tmp/auth_token.txt ]; then
    print_error "Token não encontrado"
    return 1
  fi
  
  TOKEN=$(cat /tmp/auth_token.txt)
  
  RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN")
  
  EMAIL=$(echo "$RESPONSE" | grep -o '"email":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$EMAIL" ]; then
    print_error "Falha ao obter perfil"
    echo "Resposta: $RESPONSE"
    return 1
  fi
  
  print_success "Perfil obtido com sucesso"
  print_info "Email: $EMAIL"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
}

# Test without token
test_no_token() {
  print_header "Teste 5: Requisição sem Token (deve falhar)"
  
  RESPONSE=$(curl -s -X GET "$API_URL/api/categories")
  
  if echo "$RESPONSE" | grep -q "Missing Authorization"; then
    print_success "Erro esperado recebido"
    return 0
  else
    print_error "Erro não recebido"
    echo "Resposta: $RESPONSE"
    return 1
  fi
}

# Test create category
test_create_category() {
  print_header "Teste 6: Criar Categoria (com token)"
  
  if [ ! -f /tmp/auth_token.txt ]; then
    print_error "Token não encontrado"
    return 1
  fi
  
  TOKEN=$(cat /tmp/auth_token.txt)
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/categories" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Categoria Teste\",
      \"type\": \"income\",
      \"color\": \"#FF5733\"
    }")
  
  ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$ID" ]; then
    print_error "Falha ao criar categoria"
    echo "Resposta: $RESPONSE"
    return 1
  fi
  
  print_success "Categoria criada com sucesso"
  print_info "Category ID: $ID"
}

# Test list categories
test_list_categories() {
  print_header "Teste 7: Listar Categorias"
  
  if [ ! -f /tmp/auth_token.txt ]; then
    print_error "Token não encontrado"
    return 1
  fi
  
  TOKEN=$(cat /tmp/auth_token.txt)
  
  RESPONSE=$(curl -s -X GET "$API_URL/api/categories" \
    -H "Authorization: Bearer $TOKEN")
  
  COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
  
  if [ "$COUNT" -gt 0 ]; then
    print_success "Categorias listadas com sucesso"
    print_info "Total de categorias: $COUNT"
  else
    print_error "Nenhuma categoria encontrada"
    echo "Resposta: $RESPONSE"
    return 1
  fi
}

# Main test suite
main() {
  print_info "Iniciando testes da API Fluxo Finance"
  print_info "Endpoint: $API_URL\n"
  
  check_api
  
  test_register || exit 1
  test_login || exit 1
  test_invalid_password || exit 1
  test_profile || exit 1
  test_no_token || exit 1
  test_create_category || exit 1
  test_list_categories || exit 1
  
  print_header "✓ Todos os Testes Passaram!"
  print_info "Email de teste: $TEST_EMAIL"
  print_info "Senha de teste: $TEST_PASSWORD"
  print_info "Token salvo em: /tmp/auth_token.txt"
  
  # Limpeza
  rm -f /tmp/test_email.txt /tmp/test_password.txt
}

# Executar
main "$@"
