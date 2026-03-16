---
description: Como utilizar a IA local como assistente (Funcionário AI)
---

# Workflow: Uso do Funcionário AI

Este projeto conta com uma IA local (DeepSeek via LM Studio) configurada para atuar como um assistente/funcionário para tarefas que consomem muitos tokens ou análise de dados pesados.

## 1. Localização
O script de interface está em `.agents/workflows/scripts/ai_employee.py`.

## 2. Como usar
Sempre que precisar realizar uma tarefa que envolva análise extensa de código, logs ou geração de boilerplate, utilize o comando:

```powershell
// turbo
python .agents/workflows/scripts/ai_employee.py "Seu prompt aqui"
```

## 3. Quando usar
- Resumo de arquivos grandes.
- Explicação de fluxos complexos.
- Geração de testes unitários em massa.
- Tradução de documentação técnica.

## 4. Endereço da API
Caso precise depurar, a API roda em: `http://192.168.100.250:1234/api/v1/chat`.
