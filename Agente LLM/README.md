# 🤖 Agente Local Portátil

Este é um toolkit leve para delegar tarefas de codificação para uma IA local (LM Studio), economizando tokens da conta principal.

## 📁 Estrutura de Arquivos

Para usar em qualquer projeto, basta copiar estes 4 arquivos para a pasta do projeto:

- `config.py`: Configurações de API, modelos e timeouts.
- `local_agent.py`: Wrapper principal com cache em disco e retry automático.
- `task_router.py`: Lógica que decide o que vai para a IA Local vs Nuvem.
- `test_agent.py`: Script para validar a conexão.

## 🚀 Como instalar em um novo projeto

1. **Copie os arquivos** acima para a raiz do seu novo projeto.
2. **Verifique o IP** no seu `config.py`. Se a IA estiver em outra máquina, ajuste a variável `API_BASE_URL`.
3. **Teste a conexão**:
   ```bash
   python test_agent.py
   ```

## 🛠️ Como usar no código

```python
from local_agent import LocalAgent
from task_router import TaskRouter

# 1. Inicializa o agente
agent = LocalAgent()

# 2. Faz uma pergunta (usará o modelo 32B definido no config.py)
resposta = agent.chat("Como centralizar uma div com CSS?")
print(resposta)

# 3. Usa o roteador para decidir se deve processar localmente
router = TaskRouter()
decisao = router.route("Refatore este código", "def soma(a,b): return a+b")
if decisao.local:
    print(f"Delegando para local: {decisao.model}")
```

## ⚡ Recursos Inclusos

- **Cache Inteligente**: Respostas repetidas são instantâneas e não gastam processamento.
- **Retry com Backoff**: Se o LM Studio estiver carregando o modelo, o script espera e tenta de novo automaticamente.
- **Zero Dependências**: Não precisa de `pip install`. Usa apenas bibliotecas nativas do Python.
- **Otimizado para 16GB VRAM**: Configurado para extrair o máximo do Qwen 2.5 Coder 32B.

---
*Criado por Antigravity para economizar tokens e acelerar o desenvolvimento local.*
