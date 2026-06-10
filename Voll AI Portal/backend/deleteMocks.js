const pool = require('./db/dbConfig');

async function deleteMocks() {
  try {
    await pool.query("DELETE FROM users WHERE id IN ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777')");
    console.log('Mock users deleted');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

deleteMocks();
