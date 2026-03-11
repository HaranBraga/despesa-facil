// ===== CONFIGURAÇÃO =====
const API_URL = 'https://api.despesafacil.com.br/api'; // Ajuste para seu domínio

let selectedPlanValue = 'mensal';

// ===== PLANO SELECIONADO =====
function selectPlan(plan) {
  selectedPlanValue = plan;
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.btn-plan').forEach(b => b.classList.remove('active'));
  document.getElementById(`plan-${plan}`)?.classList.add('selected');
  document.querySelector(`#plan-${plan} .btn-plan`)?.classList.add('active');

  const labels = {
    mensal: 'Mensal — R$ 97/mês',
    anual: 'Anual — R$ 970/ano (2 meses grátis)'
  };
  document.getElementById('plan-info-text').textContent = labels[plan] || '';
}

// Seleciona mensal por padrão
selectPlan('mensal');

// ===== CARREGAR ESCRITÓRIOS =====
(async function loadOffices() {
  try {
    const res = await fetch(`${API_URL}/subscriptions/offices`);
    const offices = await res.json();
    const sel = document.getElementById('s-office');
    if (Array.isArray(offices) && offices.length > 0) {
      offices.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.name;
        sel.appendChild(opt);
      });
    }
  } catch {}
})();

// ===== MÁSCARA DE TELEFONE =====
document.getElementById('s-phone').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d*)$/, '($1) $2');
  e.target.value = v;
});

// ===== MÁSCARA CPF/CNPJ =====
document.getElementById('s-cpfcnpj').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
  }
  e.target.value = v;
});

// ===== HELPER — MOSTRAR ALERTA =====
function showAlert(msg, type = 'error') {
  const el = document.getElementById('alert-msg');
  el.textContent = msg;
  el.className = `alert-msg ${type}`;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== REGISTRO =====
document.getElementById('btn-register').addEventListener('click', async () => {
  const name = document.getElementById('s-name').value.trim();
  const email = document.getElementById('s-email').value.trim();
  const phone = document.getElementById('s-phone').value.trim();
  const cpfCnpj = document.getElementById('s-cpfcnpj').value.trim();
  const password = document.getElementById('s-pass').value;
  const office_id = document.getElementById('s-office').value || undefined;

  if (!name || !email || !phone || !cpfCnpj || !password) {
    return showAlert('Preencha todos os campos obrigatórios (*).', 'error');
  }
  if (password.length < 6) {
    return showAlert('A senha deve ter ao menos 6 caracteres.', 'error');
  }

  const btn = document.getElementById('btn-register');
  const btnText = document.getElementById('btn-text');
  btn.disabled = true;
  btnText.textContent = 'Processando...';
  document.getElementById('alert-msg').style.display = 'none';

  try {
    const res = await fetch(`${API_URL}/subscriptions/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, cpfCnpj, phone, office_id, plan: selectedPlanValue })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao criar conta.');
    }

    showAlert('✅ Conta criada! Redirecionando para o pagamento...', 'success');

    // Redireciona para checkout do Asaas
    if (data.checkout_url) {
      setTimeout(() => { window.location.href = data.checkout_url; }, 1500);
    } else {
      btnText.textContent = 'Conta criada! Aguarde ativação.';
      btn.disabled = false;
    }
  } catch (e) {
    showAlert(e.message, 'error');
    btn.disabled = false;
    btnText.textContent = 'Continuar para pagamento →';
  }
});
