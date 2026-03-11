const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Formata CNPJ: 12345678000195 -> 12.345.678/0001-95
function formatCNPJ(cnpj) {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// GET /cnpjs — listar CNPJs do usuário
router.get('/', auth, async (req, res) => {
    try {
        let base = process.env.DF_BASE_URL || 'https://app.despesafacil.com.br';
        if (base.endsWith('/')) base = base.slice(0, -1);
        const result = await pool.query(
            'SELECT id, cnpj, razao_social, whatsapp_number, whatsapp_token, is_active, created_at, updated_at FROM cnpjs WHERE user_id = $1 AND is_active = true ORDER BY razao_social',
            [req.user.id]
        );
        const rows = result.rows.map(r => ({
            ...r,
            guest_link: `${base}/lancamento?token=${r.whatsapp_token}`
        }));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar CNPJs' });
    }
});


// POST /cnpjs — cadastrar novo CNPJ
router.post('/', auth, async (req, res) => {
    try {
        const { cnpj, razao_social } = req.body;
        if (!cnpj || !razao_social) {
            return res.status(400).json({ error: 'CNPJ e razão social são obrigatórios' });
        }

        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
            return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos' });
        }

        const formatted = formatCNPJ(cleanCnpj);

        const existing = await pool.query(
            'SELECT id FROM cnpjs WHERE user_id = $1 AND cnpj = $2',
            [req.user.id, formatted]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'CNPJ já cadastrado para este usuário' });
        }

        const result = await pool.query(
            'INSERT INTO cnpjs (id, user_id, cnpj, razao_social) VALUES ($1,$2,$3,$4) RETURNING *',
            [uuidv4(), req.user.id, formatted, razao_social.trim()]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao cadastrar CNPJ' });
    }
});

// PUT /cnpjs/:id — editar CNPJ
router.put('/:id', auth, async (req, res) => {
    try {
        const { razao_social } = req.body;
        const result = await pool.query(
            `UPDATE cnpjs SET razao_social = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
            [razao_social, req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'CNPJ não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar CNPJ' });
    }
});

// DELETE /cnpjs/:id — desativar CNPJ
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE cnpjs SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'CNPJ não encontrado' });
        res.json({ message: 'CNPJ removido' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover CNPJ' });
    }
});

module.exports = router;
