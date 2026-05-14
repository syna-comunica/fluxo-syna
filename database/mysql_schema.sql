-- ============================================
-- FLUXO FINANCE - MySQL Database Schema
-- ============================================
-- Este arquivo cria o schema do banco de dados MySQL
-- para o projeto Fluxo Finance, que é um sistema
-- de gestão de finanças e orçamentos.

-- ============================================
-- 1. CRIAÇÃO DO BANCO DE DADOS
-- ============================================
CREATE DATABASE IF NOT EXISTS fluxo_finance 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE fluxo_finance;

-- ============================================
-- 2. TABELA: users
-- ============================================
-- Tabela de usuários (substitui auth.users do Supabase)
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID do usuário',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email único do usuário',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Hash da senha',
  agency_name VARCHAR(255) COMMENT 'Nome da agência/empresa',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  last_login TIMESTAMP NULL COMMENT 'Último login',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Se o usuário está ativo',
  
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. TABELA: profiles
-- ============================================
-- Perfil estendido do usuário
CREATE TABLE profiles (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID do usuário (FK)',
  agency_name VARCHAR(255) COMMENT 'Nome da agência',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. TIPOS ENUMERADOS (usando ENUM)
-- ============================================
-- ENUM: tx_type (tipo de transação)
-- income = renda/entrada
-- expense = despesa/saída

-- ENUM: tx_status (status da transação)
-- paid = pago
-- pending = pendente

-- ============================================
-- 5. TABELA: categories
-- ============================================
-- Categorias de transações (renda e despesa)
CREATE TABLE categories (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID único da categoria',
  user_id CHAR(36) NOT NULL COMMENT 'Usuário proprietário',
  name VARCHAR(255) NOT NULL COMMENT 'Nome da categoria',
  type ENUM('income', 'expense') NOT NULL COMMENT 'Tipo: renda ou despesa',
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6' COMMENT 'Cor em formato HEX',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_category (user_id, name),
  INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. TABELA: transactions
-- ============================================
-- Transações financeiras (receitas e despesas)
CREATE TABLE transactions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID único da transação',
  user_id CHAR(36) NOT NULL COMMENT 'Usuário proprietário',
  category_id CHAR(36) COMMENT 'Categoria da transação',
  description VARCHAR(500) NOT NULL COMMENT 'Descrição da transação',
  amount DECIMAL(14, 2) NOT NULL CHECK (amount >= 0) COMMENT 'Valor da transação',
  type ENUM('income', 'expense') NOT NULL COMMENT 'Tipo: renda ou despesa',
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending' COMMENT 'Status: pendente ou pago',
  due_date DATE NOT NULL COMMENT 'Data de vencimento/previsão',
  paid_date DATE COMMENT 'Data de pagamento (NULL se pendente)',
  notes TEXT COMMENT 'Notas adicionais',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_user_due (user_id, due_date),
  INDEX idx_user_status (user_id, status),
  INDEX idx_user_type (user_id, type),
  INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. TABELA: budgets
-- ============================================
-- Orçamentos por categoria e período (mensal)
CREATE TABLE budgets (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID único do orçamento',
  user_id CHAR(36) NOT NULL COMMENT 'Usuário proprietário',
  category_id CHAR(36) NOT NULL COMMENT 'Categoria do orçamento',
  month DATE NOT NULL COMMENT 'Primeiro dia do mês de referência',
  planned_amount DECIMAL(14, 2) NOT NULL CHECK (planned_amount >= 0) COMMENT 'Valor planejado',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_category_month (user_id, category_id, month),
  INDEX idx_user_month (user_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger para atualizar updated_at em transactions
DELIMITER $$

CREATE TRIGGER trg_transactions_updated 
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

CREATE TRIGGER trg_profiles_updated 
BEFORE UPDATE ON profiles
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

DELIMITER ;

-- ============================================
-- 9. DADOS INICIAIS (OPCIONAL)
-- ============================================
-- Descomente para inserir dados de teste

/*
-- Usuário de teste
INSERT INTO users (id, email, password_hash, agency_name, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'user@example.com', '$2b$10$...', 'Minha Agência', TRUE);

-- Categorias padrão para novo usuário
INSERT INTO categories (id, user_id, name, type, color) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Serviços', 'income', '#16a34a'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Retainer', 'income', '#0ea5e9'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Tráfego Pago', 'expense', '#ef4444'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Folha', 'expense', '#f59e0b'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Software/SaaS', 'expense', '#8b5cf6'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Operacional', 'expense', '#64748b');
*/

-- ============================================
-- FIM DO SCHEMA
-- ============================================
