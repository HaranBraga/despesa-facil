const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const https = require('https');

const router = express.Router();

// Helper: faz requisição para API do Asaas
function asaasRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.ASAAS_API_KEY;
        const sandbox = process.env.ASAAS_SANDBOX === 'true';
        const host = sandbox ? 'sandbox.asaas.com' : 'www.asaas.com';

        const options = {
            hostname: host,
            port: 443,
            path: `/api/v3${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * POST /api/subscriptions/register
 * Fluxo completo de cadastro + assinatura Asaas:
 *   1. Cria usuário no sistema (is_active = false)
 *   2. Cria cliente no Asaas
 *   3. Cria assinatura no Asaas
 *   4. Retorna link de checkout
 *
 * Body: { name, email, password, cpfCnpj, phone, office_id, plan }
 * plan: 'mensal' | 'anual'
 */
router.post('/register', async (req, res) => {
    const { name, email, password, cpfCnpj, phone, office_id, plan = 'mensal' } = req.body;

    if (!name || !email || !password || !cpfCnpj || !phone) {
        return res.status(400).json({ error: 'Nome, email, senha, CPF/CNPJ e telefone são obrigatórios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
    }

    // Valida escritório (se fornecido)
    if (office_id) {
        const officeCheck = await pool.query('SELECT id FROM accounting_offices WHERE id = $1', [office_id]);
        if (officeCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Escritório não encontrado' });
        }
    }

    // Verifica e-mail duplicado
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Cria usuário inativo
        const hash = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        await client.query(
            `INSERT INTO users (id, name, email, password_hash, office_id, is_admin, is_active)
             VALUES ($1,$2,$3,$4,$5,false,false)`,
            [userId, name.trim(), email.toLowerCase(), hash, office_id || null]
        );

        await client.query('COMMIT');

        // 2. Cria cliente no Asaas (fora da transação — operação externa)
        const asaasCustomer = await asaasRequest('POST', '/customers', {
            name: name.trim(),
            email: email.toLowerCase(),
            cpfCnpj: cpfCnpj.replace(/\D/g, ''),
            mobilePhone: phone.replace(/\D/g, ''),
            externalReference: userId
        });

        if (asaasCustomer.status !== 200 && asaasCustomer.status !== 201) {
            console.error('Asaas customer error:', asaasCustomer.body);
            return res.status(502).json({ error: 'Erro ao criar cliente no Asaas', details: asaasCustomer.body });
        }

        const asaasCustomerId = asaasCustomer.body.id;

        // 3. Define valores dos planos
        const plans = {
            mensal:  { value: 97.00,  cycle: 'MONTHLY',  description: 'Despesa Fácil — Plano Mensal' },
            anual:   { value: 970.00, cycle: 'YEARLY',   description: 'Despesa Fácil — Plano Anual (2 meses grátis)' }
        };
        const selectedPlan = plans[plan] || plans['mensal'];

        // 4. Cria assinatura no Asaas
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 1); // começa amanhã
        const nextDue = nextMonth.toISOString().split('T')[0];

        const asaasSubscription = await asaasRequest('POST', '/subscriptions', {
            customer: asaasCustomerId,
            billingType: 'CREDIT_CARD',
            value: selectedPlan.value,
            nextDueDate: nextDue,
            cycle: selectedPlan.cycle,
            description: selectedPlan.description,
            externalReference: userId,
            redirectLink: `${process.env.APP_URL || 'https://app.despesafacil.com.br'}/login?ativado=true`
        });

        if (asaasSubscription.status !== 200 && asaasSubscription.status !== 201) {
            console.error('Asaas subscription error:', asaasSubscription.body);
            return res.status(502).json({ error: 'Erro ao criar assinatura no Asaas', details: asaasSubscription.body });
        }

        // Guarda referência do cliente Asaas no usuário
        await pool.query(
            'UPDATE users SET whatsapp_number = $1 WHERE id = $2',
            // Reaproveitamos o campo — no futuro pode ter coluna asaas_customer_id
            [null, userId]
        );

        res.status(201).json({
            message: 'Cadastro realizado! Complete o pagamento para ativar sua conta.',
            checkout_url: asaasSubscription.body.invoiceUrl || asaasSubscription.body.bankSlipUrl || null,
            user_id: userId
        });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar cadastro' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/subscriptions/webhook
 * Recebe confirmação de pagamento do Asaas e ativa o usuário.
 * Asaas envia: { event, payment: { externalReference, status } }
 */
router.post('/webhook', async (req, res) => {
    try {
        const { event, payment } = req.body;
        console.log('Asaas webhook:', event, payment?.externalReference, payment?.status);

        // Eventos que confirmam pagamento
        const paymentConfirmed = [
            'PAYMENT_RECEIVED',
            'PAYMENT_CONFIRMED',
            'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
        ];

        if (paymentConfirmed.includes(event) && payment?.externalReference) {
            await pool.query(
                'UPDATE users SET is_active = true WHERE id = $1',
                [payment.externalReference]
            );
            console.log(`✅ Usuário ${payment.externalReference} ativado via webhook Asaas`);
        }

        // Cancela acesso se assinatura cancelada
        if (event === 'SUBSCRIPTION_DELETED' && payment?.externalReference) {
            await pool.query(
                'UPDATE users SET is_active = false WHERE id = $1',
                [payment.externalReference]
            );
            console.log(`❌ Usuário ${payment.externalReference} desativado via webhook Asaas`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});

/**
 * GET /api/subscriptions/offices
 * Lista escritórios disponíveis para a página de cadastro (select público).
 */
router.get('/offices', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name FROM accounting_offices ORDER BY name'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar escritórios' });
    }
});

module.exports = router;
