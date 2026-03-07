const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function fix() {
    const hash = await bcrypt.hash('password123', 10);
    await pool.query("DELETE FROM users WHERE email = 'admin@despesafacil.com'");
    await pool.query(
        "INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4)",
        ['Admin Supremo', 'admin@despesafacil.com', hash, true]
    );
    console.log('Admin user fixed in DB');
    process.exit(0);
}
fix();
