const pool = require('./dbConfig');

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'Operador'
      );
      
      CREATE TABLE IF NOT EXISTS prompt_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        original_prompt TEXT NOT NULL,
        form_data JSONB,
        sanitized_prompt TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS form_data JSONB;

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title VARCHAR(255) DEFAULT 'Nova conversa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Atendimento';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativo';
    `);

    console.log('Database tables verified/created');
    
    // Insert admin user if not exists, then ensure correct role
    await pool.query(`
      INSERT INTO users (id, name, email, role, department, status)
      SELECT '00000000-0000-0000-0000-000000000000', 'João Cavalcanti', 'joao.cavalcanti@vollsolutions.com.br', 'Administrador Geral', 'Diretoria', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-0000-0000-000000000000');
    `);

    // Always update admin to ensure correct role (fixes pre-existing rows)
    await pool.query(`
      UPDATE users
      SET role = 'Administrador Geral',
          department = COALESCE(NULLIF(department, ''), 'Diretoria'),
          status = COALESCE(NULLIF(status, ''), 'Ativo')
      WHERE id = '00000000-0000-0000-0000-000000000000' AND role != 'Administrador Geral';
    `);

    // Seed collaborators for demo
    await pool.query(`
      INSERT INTO users (id, name, email, role, department, status)
      SELECT '22222222-2222-2222-2222-222222222222', 'Maria Silva', 'maria.silva@vollsolutions.com.br', 'Administrador', 'TI', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '22222222-2222-2222-2222-222222222222');

      INSERT INTO users (id, name, email, role, department, status)
      SELECT '33333333-3333-3333-3333-333333333333', 'Carlos Oliveira', 'carlos.oliveira@vollsolutions.com.br', 'Colaborador', 'Atendimento', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '33333333-3333-3333-3333-333333333333');

      INSERT INTO users (id, name, email, role, department, status)
      SELECT '44444444-4444-4444-4444-444444444444', 'Ana Costa', 'ana.costa@vollsolutions.com.br', 'Auditor de DLP', 'Financeiro', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '44444444-4444-4444-4444-444444444444');

      INSERT INTO users (id, name, email, role, department, status)
      SELECT '55555555-5555-5555-5555-555555555555', 'Pedro Santos', 'pedro.santos@vollsolutions.com.br', 'Colaborador', 'Comercial', 'Suspenso'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '55555555-5555-5555-5555-555555555555');

      INSERT INTO users (id, name, email, role, department, status)
      SELECT '66666666-6666-6666-6666-666666666666', 'Juliana Mendes', 'juliana.mendes@vollsolutions.com.br', 'Colaborador', 'RH', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '66666666-6666-6666-6666-666666666666');

      INSERT INTO users (id, name, email, role, department, status)
      SELECT '77777777-7777-7777-7777-777777777777', 'Rafael Lima', 'rafael.lima@vollsolutions.com.br', 'Administrador', 'TI', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '77777777-7777-7777-7777-777777777777');
    `);
    
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = initDb;
