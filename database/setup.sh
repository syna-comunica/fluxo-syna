#!/bin/bash

# ============================================
# Fluxo Finance - Database Setup Script
# ============================================
# Script para facilitar a criação e gerenciamento
# do banco de dados MySQL

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções utilitárias
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

# Verificar se MySQL está instalado
check_mysql() {
  if ! command -v mysql &> /dev/null; then
    print_error "MySQL CLI não encontrado. Instale MySQL ou adicione à PATH."
    exit 1
  fi
  print_success "MySQL encontrado"
}

# Criar banco de dados
create_database() {
  print_header "Criando Banco de Dados"
  
  read -p "Usuário MySQL (padrão: root): " DB_USER
  DB_USER=${DB_USER:-root}
  
  read -sp "Senha MySQL: " DB_PASSWORD
  echo
  
  if [ -f "database/mysql_schema.sql" ]; then
    print_info "Executando schema..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" < database/mysql_schema.sql
    print_success "Banco de dados criado com sucesso!"
  else
    print_error "Arquivo database/mysql_schema.sql não encontrado"
    exit 1
  fi
}

# Verificar estrutura do banco
verify_database() {
  print_header "Verificando Estrutura do Banco"
  
  read -p "Usuário MySQL (padrão: root): " DB_USER
  DB_USER=${DB_USER:-root}
  
  read -sp "Senha MySQL: " DB_PASSWORD
  echo
  
  mysql -u "$DB_USER" -p"$DB_PASSWORD" fluxo_finance << EOF
SHOW TABLES;
SELECT 
  TABLE_NAME,
  (DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024 AS 'Tamanho (MB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'fluxo_finance'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
EOF
}

# Fazer backup do banco
backup_database() {
  print_header "Fazendo Backup do Banco"
  
  read -p "Usuário MySQL (padrão: root): " DB_USER
  DB_USER=${DB_USER:-root}
  
  read -sp "Senha MySQL: " DB_PASSWORD
  echo
  
  BACKUP_FILE="database/backups/fluxo_finance_$(date +%Y%m%d_%H%M%S).sql"
  mkdir -p database/backups
  
  print_info "Criando backup em $BACKUP_FILE..."
  mysqldump -u "$DB_USER" -p"$DB_PASSWORD" fluxo_finance > "$BACKUP_FILE"
  
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  print_success "Backup criado! Tamanho: $SIZE"
}

# Restaurar banco de um backup
restore_database() {
  print_header "Restaurar Banco de Backup"
  
  if [ ! -d "database/backups" ] || [ -z "$(ls -A database/backups 2>/dev/null)" ]; then
    print_error "Nenhum backup encontrado em database/backups"
    exit 1
  fi
  
  echo "Backups disponíveis:"
  ls -lh database/backups/
  echo
  
  read -p "Nome do arquivo de backup: " BACKUP_FILE
  
  if [ ! -f "database/backups/$BACKUP_FILE" ]; then
    print_error "Arquivo não encontrado"
    exit 1
  fi
  
  read -p "Usuário MySQL (padrão: root): " DB_USER
  DB_USER=${DB_USER:-root}
  
  read -sp "Senha MySQL: " DB_PASSWORD
  echo
  
  print_info "Restaurando... (este processo pode levar alguns minutos)"
  mysql -u "$DB_USER" -p"$DB_PASSWORD" fluxo_finance < "database/backups/$BACKUP_FILE"
  
  print_success "Banco restaurado com sucesso!"
}

# Apagar banco de dados
drop_database() {
  print_header "Apagar Banco de Dados"
  print_error "ATENÇÃO: Esta ação é irreversível!"
  
  read -p "Digite 'SIM' para confirmar a exclusão do banco: " CONFIRM
  
  if [ "$CONFIRM" != "SIM" ]; then
    print_info "Operação cancelada"
    return
  fi
  
  read -p "Usuário MySQL (padrão: root): " DB_USER
  DB_USER=${DB_USER:-root}
  
  read -sp "Senha MySQL: " DB_PASSWORD
  echo
  
  mysql -u "$DB_USER" -p"$DB_PASSWORD" << EOF
DROP DATABASE IF EXISTS fluxo_finance;
EOF
  
  print_success "Banco de dados deletado"
}

# Menu principal
show_menu() {
  echo -e "\n${BLUE}Fluxo Finance - Database Manager${NC}\n"
  echo "1) Criar banco de dados"
  echo "2) Verificar estrutura"
  echo "3) Fazer backup"
  echo "4) Restaurar backup"
  echo "5) Apagar banco de dados"
  echo "6) Sair"
  echo
}

# Loop principal
main() {
  check_mysql
  
  while true; do
    show_menu
    read -p "Escolha uma opção (1-6): " OPTION
    
    case $OPTION in
      1) create_database ;;
      2) verify_database ;;
      3) backup_database ;;
      4) restore_database ;;
      5) drop_database ;;
      6) 
        print_info "Saindo..."
        exit 0
        ;;
      *) 
        print_error "Opção inválida"
        ;;
    esac
  done
}

# Executar script
main "$@"
