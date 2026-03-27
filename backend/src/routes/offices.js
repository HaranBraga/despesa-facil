const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /offices — listar todos os escritórios disponíveis
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name FROM accounting_offices ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar escritórios' });
    }
});

// POST /offices — Criar um novo escritório (Apenas Admins)
router.post('/', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome do escritório é obrigatório' });

        const newId = uuidv4();
        await pool.query(
            'INSERT INTO accounting_offices (id, name) VALUES ($1, $2)',
            [newId, name]
        );

        res.status(201).json({ message: 'Escritório criado com sucesso', id: newId, name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar escritório' });
    }
});

// DELETE /offices/:id — Deletar um escritório (Apenas Admins)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        const { id } = req.params;
        await pool.query('DELETE FROM accounting_offices WHERE id = $1', [id]);
        res.json({ message: 'Escritório excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir escritório' });
    }
});

// --- USER MANAGEMENT (Admin) ---

// GET /offices/users/all — List ALL client users across all offices
router.get('/users/all', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.is_active, u.is_admin, u.office_id, u.created_at,
                    ao.name AS office_name,
                    (SELECT COUNT(*) FROM cnpjs c WHERE c.user_id = u.id AND c.is_active = true) AS cnpj_count
             FROM users u
             LEFT JOIN accounting_offices ao ON ao.id = u.office_id
             WHERE u.is_admin = false
             ORDER BY u.name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// PUT /offices/users/:id/toggle — Enable/Disable a user account
router.put('/users/:id/toggle', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id } = req.params;
        const check = await pool.query('SELECT is_active, is_admin FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        if (check.rows[0].is_admin) return res.status(403).json({ error: 'Não é possível desativar um admin' });

        const newStatus = !check.rows[0].is_active;
        await pool.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);
        res.json({ message: newStatus ? 'Usuário ativado' : 'Usuário desativado', is_active: newStatus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao alterar status' });
    }
});

// GET /offices/admin/stats — Dashboard stats for admin panel
router.get('/admin/stats', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const offices = await pool.query('SELECT COUNT(*) as count FROM accounting_offices');
        const users = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
        const cnpjs = await pool.query('SELECT COUNT(*) as count FROM cnpjs WHERE is_active = true');
        const counters = await pool.query('SELECT COUNT(*) as count FROM users WHERE office_id IS NOT NULL AND is_admin = false');

        res.json({
            total_offices: parseInt(offices.rows[0].count),
            total_users: parseInt(users.rows[0].count),
            total_cnpjs: parseInt(cnpjs.rows[0].count),
            total_counters: parseInt(counters.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// --- MANAGEMENT OF COUNTERS (ACCOUNTANTS) ---

// GET /offices/:id/counters — Listar contadores de um escritório
router.get('/:id/counters', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, name, email, created_at FROM users WHERE office_id = $1 AND is_admin = false ORDER BY name ASC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar contadores' });
    }
});

// POST /offices/:id/counters — Criar um novo contador para o escritório
router.post('/:id/counters', auth, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id: officeId } = req.params;
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'E-mail já cadastrado' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (id, name, email, password_hash, office_id, is_admin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email',
            [uuidv4(), name, email.toLowerCase(), hash, officeId, false]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar contador' });
    }
});

// PUT /offices/counters/:id — Editar email/senha de um contador (Admin)
router.put('/counters/:id', auth, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        if (!req.user.is_admin) return res.status(403).json({ error: 'Acesso negado' });
        const { id } = req.params;
        const { email, password } = req.body;
        if (!email && !password) return res.status(400).json({ error: 'Informe email ou senha para alterar' });

        const check = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Contador não encontrado' });
        if (check.rows[0].is_admin) return res.status(403).json({ error: 'Operação não permitida' });

        const updates = [];
        const params = [];
        let idx = 1;
        if (email) {
            const dup = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), id]);
            if (dup.rows.length > 0) return res.status(409).json({ error: 'E-mail já em uso' });
            updates.push(`email = $${idx++}`); params.push(email.toLowerCase());
        }
        if (password) {
            if (password.length < 6) return res.status(400).json({ error: 'Senha mínima de 6 caracteres' });
            const hash = await bcrypt.hash(password, 10);
            updates.push(`password_hash = $${idx++}`); params.push(hash);
        }
        updates.push(`updated_at = NOW()`);
        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
        res.json({ message: 'Contador atualizado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar contador' });
    }
});

// DELETE /offices/counters/:id — Deletar um contador
router.delete('/counters/:id', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id } = req.params;
        const check = await pool.query('SELECT is_admin FROM users WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].is_admin) {
            return res.status(403).json({ error: 'Não é possível deletar um administrador por esta rota' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Contador excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir contador' });
    }
});

// GET /offices/:id/clients — Clientes (usuários com CNPJs) vinculados ao escritório
router.get('/:id/clients', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const result = await pool.query(
            `SELECT DISTINCT u.id, u.name, u.email, u.is_active, u.created_at,
                    COUNT(c.id) AS cnpj_count
             FROM users u
             JOIN cnpjs c ON c.user_id = u.id AND c.is_active = true
             WHERE u.office_id = $1 AND u.is_admin = false
             GROUP BY u.id, u.name, u.email, u.is_active, u.created_at
             ORDER BY u.name ASC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// GET /offices/:id/settings — Get office settings including webhook (Admin)
router.get('/:id/settings', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const result = await pool.query(
            'SELECT * FROM accounting_office_settings WHERE office_id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.json({
                office_id: req.params.id,
                reminder_whatsapp_hour: 9,
                reminder_whatsapp_minute: 0,
                reminder_enabled: true,
                reminder_max_business_day: 3,
                webhook_url: null
            });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// PUT /offices/:id/settings — Update office settings (Admin)
router.put('/:id/settings', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { webhook_url, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day } = req.body;

        const result = await pool.query(
            `INSERT INTO accounting_office_settings (office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day, webhook_url, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (office_id) DO UPDATE SET
                reminder_whatsapp_hour = COALESCE(EXCLUDED.reminder_whatsapp_hour, accounting_office_settings.reminder_whatsapp_hour),
                reminder_whatsapp_minute = COALESCE(EXCLUDED.reminder_whatsapp_minute, accounting_office_settings.reminder_whatsapp_minute),
                reminder_enabled = COALESCE(EXCLUDED.reminder_enabled, accounting_office_settings.reminder_enabled),
                reminder_max_business_day = COALESCE(EXCLUDED.reminder_max_business_day, accounting_office_settings.reminder_max_business_day),
                webhook_url = EXCLUDED.webhook_url,
                updated_at = NOW()
             RETURNING *`,
            [req.params.id, reminder_whatsapp_hour || 9, reminder_whatsapp_minute || 0, reminder_enabled !== false, reminder_max_business_day || 3, webhook_url || null]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

module.exports = router;
