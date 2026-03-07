const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function createAdmin() {
    const email = 'admin@despesafacil.com';
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            // User doesn't exist, create them
            await client.query(
                'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, true)',
                ['Admin HQ', email, hash]
            );
            console.log('✅ Usuário admin criado: admin@despesafacil.com / admin123');
        } else {
            // Ensure existing is admin
            await client.query('UPDATE users SET is_admin = true, password_hash = $2 WHERE email = $1', [email, hash]);
            console.log('✅ Usuário admin atualizado: admin@despesafacil.com / admin123');
        }
    } catch (err) {
        console.error('❌ Erro ao criar admin:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

createAdmin();
