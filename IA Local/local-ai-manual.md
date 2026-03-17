---
description: Como usar a IA Local como agente secundário
---

Este workflow descreve como delegar tarefas para a IA local que roda na rede (192.168.100.250).

### Quando usar
- Para processamento de grandes volumes de texto (summarização, extração de dados).
- Para tarefas que não exigem o raciocínio complexo do GPT-4/Claude, economizando tokens.
- Classificação de dados em massa.

### Como executar
Para enviar um prompt para o agente secundário, use o script `IA Local/agent_local.py`:

// turbo
```powershell
python "IA Local/agent_local.py" "Seu prompt aqui"
```

O script retornará a resposta JSON da IA local.

### Configurações
- **IP:** 192.168.100.250:1234
- **Modelo Padrão:** openai/gpt-oss-20b
