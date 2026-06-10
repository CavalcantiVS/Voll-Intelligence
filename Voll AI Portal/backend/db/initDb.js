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

      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        order_index INTEGER DEFAULT 0
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
        file_name VARCHAR(255),
        file_content TEXT,
        file_mimetype VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_content TEXT;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_mimetype VARCHAR(100);
    `);

    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Atendimento';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativo';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_screens JSONB DEFAULT '["/chat", "/chatbots", "/responses", "/automations", "/docs", "/refine", "/prompts", "/history", "/settings"]'::jsonb;
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    `);

    await pool.query(`
      UPDATE users 
      SET allowed_screens = '["/chat", "/chatbots", "/responses", "/automations", "/docs", "/refine", "/prompts", "/history", "/settings"]'::jsonb
      WHERE allowed_screens IS NULL;
    `);

    await pool.query(`
      INSERT INTO departments (name)
      SELECT name FROM (VALUES ('Atendimento'), ('TI'), ('Financeiro'), ('RH'), ('Comercial'), ('Diretoria')) AS v(name)
      WHERE NOT EXISTS (SELECT 1 FROM departments);
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

    
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = initDb;
