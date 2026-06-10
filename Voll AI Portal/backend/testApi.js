require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('./db/dbConfig');

async function test() {
  const { rows } = await pool.query("SELECT id, role FROM users WHERE role = 'Administrador Geral' LIMIT 1");
  const admin = rows[0];
  if (!admin) {
    console.log("No Administrador Geral found!");
    process.exit(1);
  }
  
  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET || 'chave-secreta-voll-ai-desenvolvimento-2024',
    { expiresIn: '1h' }
  );

  const putRes = await fetch('http://localhost:3001/api/users/' + admin.id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ allowed_screens: ['/chat', '/history'] })
  });
  
  const putData = await putRes.json();
  console.log('PUT Response allowed_screens:', putData.allowed_screens);
  
  const getRes = await fetch('http://localhost:3001/api/users?userId=' + admin.id, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  const getData = await getRes.json();
  if (Array.isArray(getData)) {
    const u = getData.find(x => x.id === admin.id);
    console.log('GET Response allowed_screens:', u.allowed_screens);
  } else {
    console.log('GET Response:', getData);
  }
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
