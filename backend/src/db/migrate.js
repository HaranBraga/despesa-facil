const pool = require('./pool');

const schema = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS accounting_offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    office_id UUID REFERENCES accounting_offices(id) ON DELETE SET NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS cnpjs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cnpj VARCHAR(18) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, cnpj)
  );

  CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    is_filial BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_category_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj_id UUID NOT NULL REFERENCES cnpjs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 999,
    is_visible BOOLEAN DEFAULT true,
    UNIQUE(cnpj_id, category_id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj_id UUID NOT NULL REFERENCES cnpjs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_cnpj_id ON expenses(cnpj_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_period ON expenses(period_year, period_month);
  CREATE INDEX IF NOT EXISTS idx_cnpjs_user_id ON cnpjs(user_id);
`;

// Alterações seguras para DBs já existentes (idempotente)
const alterStatements = [
  `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'diario' CHECK (tipo IN ('diario', 'mensal'))`,
  `ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('diario', 'mensal', 'ambos'))`,
  `ALTER TABLE user_category_preferences ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) CHECK (tipo IN ('diario', 'mensal', 'ambos'))`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES accounting_offices(id) ON DELETE SET NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    for (const stmt of alterStatements) {
      await client.query(stmt);
    }
    console.log('✅ Migrations executadas com sucesso');
  } finally {
    client.release();
  }
}

module.exports = { migrate };
