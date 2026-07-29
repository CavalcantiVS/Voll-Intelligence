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

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

      CREATE TABLE IF NOT EXISTS chat_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title VARCHAR(255) DEFAULT 'Nova conversa',
        folder_id UUID REFERENCES chat_folders(id) ON DELETE SET NULL,
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
      ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES chat_folders(id) ON DELETE SET NULL;
    `);

    // Tabelas de Shared Workspaces (Espaços de Equipe)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        criador_id UUID REFERENCES users(id) ON DELETE SET NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        avatar TEXT
      );

      CREATE TABLE IF NOT EXISTS membros_equipe (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        equipe_id UUID REFERENCES equipes(id) ON DELETE CASCADE,
        usuario_id UUID REFERENCES users(id) ON DELETE CASCADE,
        papel VARCHAR(20) NOT NULL CHECK (papel IN ('admin', 'membro')),
        status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(equipe_id, usuario_id)
      );

      ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES equipes(id) ON DELETE CASCADE;
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE membros_equipe ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito'));
      ALTER TABLE equipes ADD COLUMN IF NOT EXISTS avatar TEXT;
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

    // Tabelas do Kanban Multi-board
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kanban_boards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        criador_id UUID REFERENCES users(id) ON DELETE SET NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        avatar TEXT,
        background TEXT,
        tags JSONB DEFAULT '[]'::jsonb,
        custom_fields JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS kanban_board_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
        usuario_id UUID REFERENCES users(id) ON DELETE CASCADE,
        papel VARCHAR(20) NOT NULL CHECK (papel IN ('admin', 'editor', 'leitor')),
        status VARCHAR(20) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_id, usuario_id)
      );

      ALTER TABLE kanban_board_members DROP CONSTRAINT IF EXISTS kanban_board_members_status_check;
      ALTER TABLE kanban_board_members ADD CONSTRAINT kanban_board_members_status_check CHECK (status IN ('pendente', 'aceito', 'solicitado'));

      ALTER TABLE kanban_board_members DROP CONSTRAINT IF EXISTS kanban_board_members_papel_check;
      ALTER TABLE kanban_board_members ADD CONSTRAINT kanban_board_members_papel_check CHECK (papel IN ('admin', 'editor', 'leitor'));
      UPDATE kanban_board_members SET papel = 'editor' WHERE papel = 'membro';
      ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS background TEXT;
      ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

      CREATE TABLE IF NOT EXISTS kanban_columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        dot_class VARCHAR(50) DEFAULT 'todo',
        order_index INTEGER DEFAULT 0,
        wip_limit INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        type VARCHAR(100),
        assignee VARCHAR(255),
        due_date DATE,
        notes TEXT,
        checklist JSONB DEFAULT '[]'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        custom_field_values JSONB DEFAULT '{}'::jsonb,
        order_index INTEGER DEFAULT 0,
        is_archived BOOLEAN DEFAULT FALSE,
        archived_at TIMESTAMP,
        column_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kanban_automations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_conditions JSONB NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        action_data JSONB NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS background TEXT;
      ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS wip_limit INTEGER DEFAULT NULL;
      ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
      ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
      ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS column_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS custom_field_values JSONB DEFAULT '{}'::jsonb;
    `);

    console.log('Database tables verified/created');
    
    // Insere usuário admin se não existir, depois garante o papel correto
    await pool.query(`
      INSERT INTO users (id, name, email, role, department, status)
      SELECT '00000000-0000-0000-0000-000000000000', 'João Cavalcanti', 'joao.cavalcanti@vollsolutions.com.br', 'Administrador Geral', 'Diretoria', 'Ativo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-0000-0000-000000000000');
    `);

    // Sempre atualiza o admin para garantir o papel correto (corrige linhas pré-existentes)
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
