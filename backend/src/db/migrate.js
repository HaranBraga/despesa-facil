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
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`,
  // Novas colunas para WhatsApp e token de acesso guest
  `ALTER TABLE cnpjs ADD COLUMN IF NOT EXISTS whatsapp_token UUID DEFAULT uuid_generate_v4()`,
  `ALTER TABLE cnpjs ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
  `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE`,
  `CREATE TABLE IF NOT EXISTS accounting_office_settings (
    office_id UUID PRIMARY KEY REFERENCES accounting_offices(id) ON DELETE CASCADE,
    reminder_whatsapp_hour INTEGER DEFAULT 9,
    reminder_whatsapp_minute INTEGER DEFAULT 0,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_max_business_day INTEGER DEFAULT 3,
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE accounting_office_settings ADD COLUMN IF NOT EXISTS reminder_max_business_day INTEGER DEFAULT 3`,
  `ALTER TABLE accounting_office_settings ADD COLUMN IF NOT EXISTS webhook_url TEXT`,
  // Nova tabela dedicada para contadores de escritórios (separada de users)
  `CREATE TABLE IF NOT EXISTS counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    office_id UUID NOT NULL REFERENCES accounting_offices(id) ON DELETE CASCADE,
    whatsapp_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_counters_office_id ON counters(office_id)`,
  // Garante que is_counter existe temporariamente para migração legada
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_counter BOOLEAN DEFAULT false`,
  // Migra contadores legados da tabela users para counters (idempotente)
  `INSERT INTO counters (id, name, email, password_hash, office_id, whatsapp_number, is_active, created_at, updated_at)
   SELECT id, name, email, password_hash, office_id, whatsapp_number, is_active, created_at, updated_at
   FROM users
   WHERE is_counter = true AND office_id IS NOT NULL AND is_admin = false
   ON CONFLICT (email) DO NOTHING`,
  // Remove contadores migrados da tabela users e remove a coluna is_counter
  `DELETE FROM users WHERE is_counter = true AND office_id IS NOT NULL AND is_admin = false
   AND email IN (SELECT email FROM counters)`,
  `ALTER TABLE users DROP COLUMN IF EXISTS is_counter`,
  `CREATE TABLE IF NOT EXISTS report_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj_id UUID NOT NULL REFERENCES cnpjs(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cnpj_id, period_month, period_year)
  )`,
  `CREATE TABLE IF NOT EXISTS counter_collected_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj_id UUID NOT NULL REFERENCES cnpjs(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    counter_id UUID NOT NULL,
    collected_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cnpj_id, period_month, period_year, counter_id)
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
  `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`,
  `ALTER TABLE counters ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE`,
  `ALTER TABLE counters ALTER COLUMN email DROP NOT NULL`,
  `WITH ranked AS (
    SELECT id,
           LOWER(SPLIT_PART(email, '@', 1)) AS base,
           ROW_NUMBER() OVER (PARTITION BY LOWER(SPLIT_PART(email, '@', 1)) ORDER BY created_at) - 1 AS rn
    FROM users WHERE username IS NULL AND email IS NOT NULL
  )
  UPDATE users u
  SET username = CASE WHEN r.rn = 0 THEN r.base ELSE r.base || r.rn::text END
  FROM ranked r WHERE u.id = r.id`,
  `WITH ranked AS (
    SELECT id,
           LOWER(SPLIT_PART(email, '@', 1)) AS base,
           ROW_NUMBER() OVER (PARTITION BY LOWER(SPLIT_PART(email, '@', 1)) ORDER BY created_at) - 1 AS rn
    FROM counters WHERE username IS NULL AND email IS NOT NULL
  )
  UPDATE counters c
  SET username = CASE WHEN r.rn = 0 THEN r.base ELSE r.base || r.rn::text END
  FROM ranked r WHERE c.id = r.id`
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
