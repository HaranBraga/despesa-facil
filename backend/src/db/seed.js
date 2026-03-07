const pool = require('./pool');

// Categorias padrão sem filiais — com tipo definido
const DEFAULT_CATEGORIES = [
    { name: 'Energia Elétrica', tipo: 'mensal' },
    { name: 'Água e Esgoto', tipo: 'mensal' },
    { name: 'Telefone e Internet', tipo: 'mensal' },
    { name: 'Seguros', tipo: 'mensal' },
    { name: 'Honorários Contábeis', tipo: 'mensal' },
    { name: 'Vigilância Patrimonial', tipo: 'mensal' },
    { name: 'Aluguel', tipo: 'mensal' },
    { name: 'Depreciações e Amortizações', tipo: 'mensal' },
    { name: 'Prestação de Serviços', tipo: 'mensal' },
    { name: 'Despesas com Sistemas', tipo: 'mensal' },
    { name: 'Computadores e Periféricos', tipo: 'mensal' },
    { name: 'Propaganda', tipo: 'mensal' },
    { name: 'Serviços Prestados por Terceiros', tipo: 'mensal' },
    { name: 'Manutenção de Veículos', tipo: 'diario' },
    { name: 'Combustível', tipo: 'diario' },
    { name: 'Despesas com Alimentação', tipo: 'diario' },
    { name: 'Refeições', tipo: 'diario' },
    { name: 'Frete e Carretos', tipo: 'diario' },
    { name: 'Hospedagem', tipo: 'diario' },
    { name: 'Despesas com Viagens', tipo: 'diario' },
    { name: 'Despesas de Uso e Consumo', tipo: 'ambos' },
    { name: 'Despesas Diversas', tipo: 'ambos' },
];

async function seed() {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            'SELECT COUNT(*) FROM expense_categories WHERE is_default = true AND (created_by IS NULL)'
        );
        if (parseInt(existing.rows[0].count) > 0) {
            console.log('✅ Seed: categorias já existem, pulando.');
            return;
        }

        for (const cat of DEFAULT_CATEGORIES) {
            await client.query(
                `INSERT INTO expense_categories (name, is_filial, is_default, tipo, created_by)
                 VALUES ($1, false, true, $2, NULL)`,
                [cat.name, cat.tipo]
            );
        }
        console.log(`✅ Seed: ${DEFAULT_CATEGORIES.length} categorias inseridas`);
    } finally {
        client.release();
    }
}

module.exports = { seed };
