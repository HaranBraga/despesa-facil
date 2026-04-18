const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./pool');

async function createAdmin() {
    const username = 'admin';
    const password = '415263';
    const hash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id FROM users WHERE username = $1', [username]);
        if (res.rows.length === 0) {
            await client.query(
                'INSERT INTO users (id, name, username, password_hash, is_admin) VALUES ($1, $2, $3, $4, true)',
                [uuidv4(), 'Admin', username, hash]
            );
            console.log('✅ Admin criado — usuário: admin / senha: 415263');
        } else {
            await client.query(
                'UPDATE users SET is_admin = true, password_hash = $2 WHERE username = $1',
                [username, hash]
            );
            console.log('✅ Admin atualizado — usuário: admin / senha: 415263');
        }
    } catch (err) {
        console.error('❌ Erro ao criar admin:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

createAdmin();
