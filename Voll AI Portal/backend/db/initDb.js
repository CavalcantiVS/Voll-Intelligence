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
        sanitized_prompt TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
    console.log('Database tables verified/created');
    
    // Insert a dummy admin user if not exists
    await pool.query(`
      INSERT INTO users (id, name, email, role)
      SELECT '00000000-0000-0000-0000-000000000000', 'Admin User', 'admin@voll.com', 'Admin'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-0000-0000-000000000000');
    `);
    
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = initDb;
