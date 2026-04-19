const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

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
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
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
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM accounting_offices WHERE id = $1', [id]);
        res.json({ message: 'Escritório excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir escritório' });
    }
});

// --- USER MANAGEMENT (Admin) ---

// POST /offices/users/register — Cadastrar novo usuário via admin (sem email)
router.post('/users/register', auth, requireAdmin, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { name, username, phone, password, office_id } = req.body;
        if (!name || !username || !password || !office_id) {
            return res.status(400).json({ error: 'Nome, usuário, senha e escritório são obrigatórios' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
        }
        const existing = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Usuário já cadastrado' });
        }
        const existingOffice = await pool.query('SELECT id FROM accounting_offices WHERE id = $1', [office_id]);
        if (existingOffice.rows.length === 0) {
            return res.status(400).json({ error: 'Escritório selecionado não existe' });
        }
        const hash = await bcrypt.hash(password, 10);
        const phoneVal = phone || null;
        const result = await pool.query(
            'INSERT INTO users (id, name, username, phone, whatsapp_number, password_hash, office_id, is_admin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, username, phone, office_id',
            [uuidv4(), name, username.toLowerCase(), phoneVal, phoneVal, hash, office_id, false]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /offices/users/all — Lista todos os clientes (não-admin, não-counter)
router.get('/users/all', auth, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.username, u.phone, u.is_active, u.office_id, u.created_at,
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

// PUT /offices/users/:id/toggle — Ativar/Desativar conta de cliente
router.put('/users/:id/toggle', auth, requireAdmin, async (req, res) => {
    try {
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

// PUT /offices/users/:id — Editar email/senha de um usuário (Admin)
router.put('/users/:id', auth, requireAdmin, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { id } = req.params;
        const { name, email, password } = req.body;

        const check = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        if (check.rows[0].is_admin) return res.status(403).json({ error: 'Não é possível editar um admin por aqui' });

        const updates = [];
        const params = [];
        let idx = 1;

        if (name) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
        if (email) {
            const dup = await pool.query(
                `SELECT id FROM users WHERE email = $1 AND id != $2
                 UNION SELECT id FROM counters WHERE email = $1`,
                [email.toLowerCase(), id]
            );
            if (dup.rows.length > 0) return res.status(409).json({ error: 'E-mail já em uso' });
            updates.push(`email = $${idx++}`); params.push(email.toLowerCase());
        }
        if (req.body.username !== undefined) {
            const un = req.body.username ? req.body.username.toLowerCase().trim() : null;
            if (un) {
                const dup = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [un, id]);
                if (dup.rows.length > 0) return res.status(409).json({ error: 'Usuário já em uso' });
            }
            updates.push(`username = $${idx++}`); params.push(un);
        }
        if (req.body.phone !== undefined) {
            updates.push(`phone = $${idx++}`); params.push(req.body.phone ? req.body.phone.trim() : null);
        }
        if (password) {
            if (password.length < 6) return res.status(400).json({ error: 'Senha mínima de 6 caracteres' });
            const hash = await bcrypt.hash(password, 10);
            updates.push(`password_hash = $${idx++}`); params.push(hash);
        }
        if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        updates.push(`updated_at = NOW()`);
        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// DELETE /offices/users/:id — Deletar um usuário (Admin)
router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const check = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        if (check.rows[0].is_admin) return res.status(403).json({ error: 'Não é possível excluir um admin' });

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

// GET /offices/admin/stats — Dashboard stats for admin panel
router.get('/admin/stats', auth, requireAdmin, async (req, res) => {
    try {
        const offices = await pool.query('SELECT COUNT(*) as count FROM accounting_offices');
        const users = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
        const cnpjs = await pool.query('SELECT COUNT(*) as count FROM cnpjs WHERE is_active = true');
        const counters = await pool.query('SELECT COUNT(*) as count FROM counters');

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
router.get('/:id/counters', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, name, username, is_active, created_at FROM counters WHERE office_id = $1 ORDER BY name ASC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar contadores' });
    }
});

// POST /offices/:id/counters — Criar um novo contador para o escritório
router.post('/:id/counters', auth, requireAdmin, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { id: officeId } = req.params;
        const { name, username, password } = req.body;

        if (!name || !username || !password) {
            return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' });
        }

        const existing = await pool.query(
            'SELECT id FROM counters WHERE username = $1 UNION SELECT id FROM users WHERE username = $1',
            [username.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Usuário já cadastrado' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO counters (id, name, username, password_hash, office_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, username',
            [uuidv4(), name, username.toLowerCase(), hash, officeId]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar contador' });
    }
});

// PUT /offices/counters/:id — Editar email/senha de um contador (Admin)
router.put('/counters/:id', auth, requireAdmin, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { id } = req.params;
        const { username, password } = req.body;
        if (!username && !password) return res.status(400).json({ error: 'Informe usuário ou senha para alterar' });

        const check = await pool.query('SELECT id FROM counters WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Contador não encontrado' });

        const updates = [];
        const params = [];
        let idx = 1;
        if (username) {
            const dup = await pool.query(
                'SELECT id FROM counters WHERE username = $1 AND id != $2 UNION SELECT id FROM users WHERE username = $1',
                [username.toLowerCase(), id]
            );
            if (dup.rows.length > 0) return res.status(409).json({ error: 'Usuário já em uso' });
            updates.push(`username = $${idx++}`); params.push(username.toLowerCase());
        }
        if (password) {
            if (password.length < 6) return res.status(400).json({ error: 'Senha mínima de 6 caracteres' });
            const hash = await bcrypt.hash(password, 10);
            updates.push(`password_hash = $${idx++}`); params.push(hash);
        }
        updates.push(`updated_at = NOW()`);
        params.push(id);
        await pool.query(`UPDATE counters SET ${updates.join(', ')} WHERE id = $${idx}`, params);
        res.json({ message: 'Contador atualizado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar contador' });
    }
});

// DELETE /offices/counters/:id — Deletar um contador
router.delete('/counters/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const check = await pool.query('SELECT id FROM counters WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Contador não encontrado' });

        await pool.query('DELETE FROM counters WHERE id = $1', [id]);
        res.json({ message: 'Contador removido com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir contador' });
    }
});

// GET /offices/:id/clients — Clientes (usuários com CNPJs) vinculados ao escritório
router.get('/:id/clients', auth, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT u.id, u.name, u.username, u.is_active, u.created_at,
                    COUNT(c.id) AS cnpj_count
             FROM users u
             JOIN cnpjs c ON c.user_id = u.id AND c.is_active = true
             WHERE u.office_id = $1 AND u.is_admin = false
             GROUP BY u.id, u.name, u.username, u.is_active, u.created_at
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
router.get('/:id/settings', auth, requireAdmin, async (req, res) => {
    try {
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
router.put('/:id/settings', auth, requireAdmin, async (req, res) => {
    try {
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

// POST /offices/:id/webhook/test — Testa webhook com CNPJs sem declaração mensal do mês atual
router.post('/:id/webhook/test', auth, requireAdmin, async (req, res) => {
    try {
        const { id: officeId } = req.params;
        const settings = await pool.query('SELECT webhook_url FROM accounting_office_settings WHERE office_id = $1', [officeId]);
        const webhookUrl = settings.rows[0]?.webhook_url;
        if (!webhookUrl) return res.status(400).json({ error: 'Webhook URL não configurada para este escritório' });

        // Lembrete é sempre do MÊS ANTERIOR (prazo de envio do relatório do mês que passou)
        const now = new Date();
        let month = now.getMonth(); // getMonth() = 0..11; mês atual - 1
        let year = now.getFullYear();
        if (month === 0) { month = 12; year--; } // janeiro → dezembro do ano anterior

        const sysUrl = (process.env.DF_BASE_URL || 'https://despesafacil.azecode.cloud').replace(/\/$/, '');
        const result = await pool.query(
            `SELECT c.id AS cnpj_id, c.cnpj, c.razao_social,
                    COALESCE(c.whatsapp_number, u.whatsapp_number, u.phone) AS whatsapp,
                    u.name AS user_name
             FROM cnpjs c
             JOIN users u ON u.id = c.user_id
             WHERE c.is_active = true AND u.is_active = true AND u.office_id = $1
               AND c.id NOT IN (
                 SELECT DISTINCT cnpj_id FROM expenses
                 WHERE period_month = $2 AND period_year = $3 AND tipo = 'mensal'
               )
             ORDER BY u.name, c.razao_social`,
            [officeId, month, year]
        );

        const cnpjs = result.rows.map(r => ({
            cnpj_id: r.cnpj_id,
            cnpj: r.cnpj,
            razao_social: r.razao_social,
            user_name: r.user_name,
            whatsapp: r.whatsapp,
            link: sysUrl
        }));

        const payload = { test: true, month, year, total_pendentes: cnpjs.length, cnpjs };

        const fetchRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000)
        });

        res.json({ status: fetchRes.status, ok: fetchRes.ok, total_pendentes: cnpjs.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Erro ao testar webhook' });
    }
});

module.exports = router;
