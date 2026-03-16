# -*- coding: utf-8 -*-
"""
Test Agent — Testa todos os componentes do Agente Local.

Uso:
    python test_agent.py                  # Roda todos os testes
    python test_agent.py --test connectivity  # Testa só conectividade
    python test_agent.py --test chat         # Testa chat
    python test_agent.py --test embed        # Testa embeddings
    python test_agent.py --test cache        # Testa cache
    python test_agent.py --test router       # Testa roteamento
"""

import sys
import time
import os

# Adiciona o diretório atual ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from local_agent import LocalAgent, LocalAgentError
from task_router import TaskRouter
import config


class Colors:
    """Códigos ANSI para terminal colorido."""
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def ok(msg):
    print(f"  {Colors.GREEN}✓{Colors.RESET} {msg}")


def fail(msg):
    print(f"  {Colors.RED}✗{Colors.RESET} {msg}")


def info(msg):
    print(f"  {Colors.CYAN}ℹ{Colors.RESET} {msg}")


def header(name):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}{'='*50}")
    print(f"  TESTE: {name}")
    print(f"{'='*50}{Colors.RESET}")


def test_connectivity():
    """Testa se a API está acessível e lista modelos."""
    header("Conectividade")
    agent = LocalAgent()

    available = agent.is_available()
    if available:
        ok(f"API acessível em {agent.api_base}")
    else:
        fail(f"API NÃO acessível em {agent.api_base}")
        return False

    models = agent.list_models()
    if models:
        ok(f"Modelos encontrados: {len(models)}")
        for m in models:
            info(f"  → {m}")
    else:
        fail("Nenhum modelo encontrado")
        return False

    return True


def test_chat():
    """Testa chat completion com modelo rápido."""
    header("Chat (modelo rápido: 14B)")
    agent = LocalAgent()

    prompt = "Responda APENAS com a palavra: FUNCIONANDO"
    info(f"Prompt: {prompt}")
    info(f"Modelo: {config.MODEL_SMART}")

    start = time.time()
    try:
        response = agent.chat_smart(prompt, max_tokens=50)
        elapsed = time.time() - start
        ok(f"Resposta recebida em {elapsed:.1f}s")
        info(f"Resposta: {response.strip()[:100]}")
        return True
    except LocalAgentError as e:
        elapsed = time.time() - start
        fail(f"Erro após {elapsed:.1f}s: {e}")
        return False


def test_chat_smart():
    """Testa chat completion com modelo inteligente."""
    header("Chat (modelo smart: 32B)")
    agent = LocalAgent()

    prompt = "Responda APENAS com a palavra: FUNCIONANDO"
    info(f"Prompt: {prompt}")
    info(f"Modelo: {config.MODEL_SMART}")

    start = time.time()
    try:
        response = agent.chat_smart(prompt, max_tokens=50)
        elapsed = time.time() - start
        ok(f"Resposta recebida em {elapsed:.1f}s")
        info(f"Resposta: {response.strip()[:100]}")
        return True
    except LocalAgentError as e:
        elapsed = time.time() - start
        fail(f"Erro após {elapsed:.1f}s: {e}")
        return False


def test_embed():
    """Testa geração de embeddings."""
    header("Embeddings")
    agent = LocalAgent()

    text = "Teste de embedding para busca semântica"
    info(f"Texto: {text}")

    start = time.time()
    try:
        embedding = agent.embed_single(text)
        elapsed = time.time() - start
        ok(f"Embedding gerado em {elapsed:.1f}s")
        info(f"Dimensões: {len(embedding)}")
        info(f"Primeiros 5 valores: {embedding[:5]}")
        return True
    except LocalAgentError as e:
        elapsed = time.time() - start
        fail(f"Erro após {elapsed:.1f}s: {e}")
        return False


def test_cache():
    """Testa se o cache funciona corretamente."""
    header("Cache")
    agent = LocalAgent(cache_enabled=True)

    # Limpa cache anterior
    agent.cache_clear()
    info("Cache limpo")

    prompt = "Diga exatamente: CACHE_TEST_123"
    info(f"Prompt: {prompt}")

    # Primeira chamada (sem cache)
    info("Primeira chamada (sem cache)...")
    start = time.time()
    try:
        resp1 = agent.chat_fast(prompt, max_tokens=50)
        t1 = time.time() - start
        ok(f"Primeira resposta em {t1:.1f}s")
    except LocalAgentError as e:
        fail(f"Erro na primeira chamada: {e}")
        return False

    # Segunda chamada (com cache)
    info("Segunda chamada (deve usar cache)...")
    start = time.time()
    resp2 = agent.chat_fast(prompt, max_tokens=50)
    t2 = time.time() - start

    if t2 < 1.0:
        ok(f"Cache HIT! Segunda resposta em {t2:.3f}s (vs {t1:.1f}s)")
    else:
        fail(f"Cache pode não ter funcionado: {t2:.1f}s")

    if resp1 == resp2:
        ok("Respostas idênticas (cache consistente)")
    else:
        fail("Respostas diferentes — cache pode estar com problema")
        info(f"  R1: {resp1[:50]}")
        info(f"  R2: {resp2[:50]}")

    return t2 < 1.0 and resp1 == resp2


def test_router():
    """Testa roteamento de tarefas."""
    header("Task Router")
    router = TaskRouter()

    tests = [
        ("Formate este JSON", config.MODEL_FAST, True),
        ("Converta CSV para JSON", config.MODEL_FAST, True),
        ("Analise este código complexo", config.MODEL_SMART, True),
        ("Refatore a arquitetura do módulo", config.MODEL_SMART, True),
        ("Pesquise na internet sobre FastAPI", "antigravity", False),
        ("Crie um arquivo de configuração", "antigravity", False),
    ]

    all_pass = True
    for task, expected_model, expected_local in tests:
        result = router.route(task)
        model_ok = result.model == expected_model
        local_ok = result.local == expected_local
        passed = model_ok and local_ok

        if passed:
            ok(f"{task}")
            info(f"  → {result}")
        else:
            fail(f"{task}")
            info(f"  Esperado: model={expected_model} local={expected_local}")
            info(f"  Obtido:   {result}")
            all_pass = False

    return all_pass


# =============================================================================
# Main
# =============================================================================
def main():
    print(f"\n{Colors.BOLD}{Colors.CYAN}")
    print("╔══════════════════════════════════════════════════╗")
    print("║          AGENTE LOCAL — SUITE DE TESTES          ║")
    print("╠══════════════════════════════════════════════════╣")
    print(f"║  API: {config.API_BASE_URL:<42} ║")
    print(f"║  Modelo principal: {config.MODEL_SMART:<31} ║")
    print(f"╚══════════════════════════════════════════════════╝{Colors.RESET}")

    # Parse arguments
    test_filter = None
    if "--test" in sys.argv:
        idx = sys.argv.index("--test")
        if idx + 1 < len(sys.argv):
            test_filter = sys.argv[idx + 1].lower()

    tests = {
        "connectivity": ("Conectividade", test_connectivity),
        "chat": ("Chat 32B", test_chat_smart),
        "embed": ("Embeddings", test_embed),
        "cache": ("Cache", test_cache),
        "router": ("Task Router", test_router),
    }

    results = {}

    if test_filter:
        if test_filter in tests:
            name, fn = tests[test_filter]
            results[name] = fn()
        else:
            print(f"\nTeste '{test_filter}' não encontrado.")
            print(f"Disponíveis: {', '.join(tests.keys())}")
            sys.exit(1)
    else:
        for key, (name, fn) in tests.items():
            results[name] = fn()

    # Resumo
    print(f"\n{Colors.BOLD}{'='*50}")
    print("  RESUMO")
    print(f"{'='*50}{Colors.RESET}")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"  {status}  {name}")

    color = Colors.GREEN if passed == total else Colors.RED
    print(f"\n  {color}{Colors.BOLD}{passed}/{total} testes passaram{Colors.RESET}\n")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
