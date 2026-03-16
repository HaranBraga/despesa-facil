# -*- coding: utf-8 -*-
"""
Sombra Thinker — O cérebro técnico local.
Analisa arquivos e gera relatórios de melhoria técnica.
"""

import os
import sys
from local_agent import LocalAgent

SYSTEM_AUDIT_PROMPT = """
Você é o Sombra, uma IA especialista em arquitetura de software, segurança e performance.
Sua missão é auditores o arquivo abaixo e sugerir MELHORIAS TÉCNICAS REAIS.

Foque em:
1. Bugs latentes ou erros de lógica.
2. Problemas de segurança (injeção, auth, etc).
3. Performance e otimização.
4. Clean Code e padrões de projeto.

Seja direto, técnico e use markdown para formatar sua resposta.
"""

def audit_file(filepath):
    agent = LocalAgent()
    if not agent.is_available():
        print(f"ERRO: Sombra está offline ({agent.api_base})")
        return

    if not os.path.exists(filepath):
        print(f"ERRO: Arquivo não encontrado: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    print(f"\n--- Auditando: {os.path.basename(filepath)} ---")
    
    # Se o arquivo for muito grande (> 8k chars), divide em partes
    chunk_size = 8000
    if len(content) > chunk_size:
        print(f"Arquivo grande detectado ({len(content)} chars). Dividindo em partes...")
        chunks = [content[i:i + chunk_size] for i in range(0, len(content), chunk_size)]
    else:
        chunks = [content]

    log_dir = os.path.join(os.path.dirname(__file__), "audits")
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, f"audit_{os.path.basename(filepath)}.md")

    # Limpa o arquivo se já existir
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"# Auditoria Técnica: {os.path.basename(filepath)}\n")

    for i, chunk in enumerate(chunks):
        suffix = f" (Parte {i+1}/{len(chunks)})" if len(chunks) > 1 else ""
        print(f"Enviando para o Sombra...{suffix}")
        
        prompt = f"Analise a seguinte parte do código/arquivo e forneça um relatório técnico de melhorias:\n\n```javascript\n{chunk}\n```"
        try:
            response = agent.chat_smart(prompt, system_prompt=SYSTEM_AUDIT_PROMPT)
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"\n\n## {suffix}\n{response}")
            print(f"Parte {i+1} salva.")
        except Exception as e:
            print(f"ERRO na Parte {i+1}: {e}")
            continue

    print(f"\nResultados do Sombra concluídos. Verifique o log: {log_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python sombra_thinker.py <caminho_do_arquivo>")
        sys.exit(1)
    
    audit_file(sys.argv[1])
