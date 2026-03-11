const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/account
 * Retorna dados da conta do usuário logado.
 */
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, whatsapp_number, is_admin, office_id, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar conta' });
    }
});

/**
 * PUT /api/account
 * Atualiza nome, whatsapp_number e/ou senha do usuário logado.
 * Body: { name?, whatsapp_number?, current_password?, new_password? }
 */
router.put('/', auth, async (req, res) => {
    try {
        const { name, whatsapp_number, current_password, new_password } = req.body;

        // Busca usuário atual
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const user = userResult.rows[0];

        // Se quer trocar senha, valida senha atual
        let newHash = user.password_hash;
        if (new_password) {
            if (!current_password) {
                return res.status(400).json({ error: 'Senha atual é obrigatória para trocar a senha' });
            }
            const valid = await bcrypt.compare(current_password, user.password_hash);
            if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });
            if (new_password.length < 6) {
                return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' });
            }
            newHash = await bcrypt.hash(new_password, 10);
        }

        const updatedName = name?.trim() || user.name;
        const updatedWhatsapp = whatsapp_number !== undefined ? (whatsapp_number || null) : user.whatsapp_number;

        const result = await pool.query(
            `UPDATE users
             SET name = $1, whatsapp_number = $2, password_hash = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING id, name, email, whatsapp_number, is_admin, office_id, created_at`,
            [updatedName, updatedWhatsapp, newHash, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
});

/**
 * PUT /api/account/cnpjs/:id/whatsapp
 * Define ou limpa o número de WhatsApp específico de um CNPJ do usuário logado.
 * Body: { whatsapp_number } — enviar null ou vazio para usar o padrão da conta
 */
router.put('/cnpjs/:id/whatsapp', auth, async (req, res) => {
    try {
        const { whatsapp_number } = req.body;

        const result = await pool.query(
            `UPDATE cnpjs
             SET whatsapp_number = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, cnpj, razao_social, whatsapp_number, whatsapp_token`,
            [whatsapp_number || null, req.params.id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'CNPJ não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar WhatsApp do CNPJ' });
    }
});

/**
 * GET /api/account/cnpjs
 * Retorna CNPJs do usuário com whatsapp_number e whatsapp_token (para montar link guest).
 */
router.get('/cnpjs', auth, async (req, res) => {
    try {
        let base = process.env.APP_URL || process.env.FRONTEND_URL || 'https://app.despesafacil.com.br';
        if (base.endsWith('/')) base = base.slice(0, -1);
        const result = await pool.query(
            `SELECT id, cnpj, razao_social, whatsapp_number, whatsapp_token, is_active, created_at
             FROM cnpjs
             WHERE user_id = $1 AND is_active = true
             ORDER BY razao_social`,
            [req.user.id]
        );

        const rows = result.rows.map(r => ({
            ...r,
            guest_link: `${base}/lancamento?token=${r.whatsapp_token}`
        }));

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar CNPJs' });
    }
});

module.exports = router;
