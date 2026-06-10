const pool = require('./db/dbConfig.js');
const bcrypt = require('bcryptjs');

async function setupAccounts() {
  try {
    // 1. Revert João back to Colaborador
    await pool.query(`UPDATE users SET role = $1 WHERE email = $2`, ['Colaborador', 'joao.cavalcanti@vollsolutions.com.br']);
    console.log('João revertido para Colaborador.');

    // 2. Ensure admin account exists and set a known password
    const adminEmail = 'admin@voll.com';
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    
    // Create or update admin account
    const { rowCount } = await pool.query(
      `UPDATE users SET password_hash = $1, role = $2 WHERE email = $3`,
      [passwordHash, 'Administrador Geral', adminEmail]
    );

    if (rowCount === 0) {
      // Create it if it doesn't exist
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status) VALUES (gen_random_uuid(), 'Admin Voll', $1, $2, 'Administrador Geral', 'Ativo')`,
        [adminEmail, passwordHash]
      );
      console.log('Conta admin criada.');
    } else {
      console.log('Senha da conta admin atualizada.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
setupAccounts();
