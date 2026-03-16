# -*- coding: utf-8 -*-
"""
Task Router — Decide se uma tarefa deve ser processada localmente pelo Sombra ou na nuvem.
"""

from typing import Dict, Any

class RoutingDecision:
    def __init__(self, local: bool, model: str, reason: str):
        self.local = local
        self.model = model
        self.reason = reason

class TaskRouter:
    """
    Roteia tarefas com base na complexidade e requisitos de segurança/custo.
    """
    
    def __init__(self, smart_model: str = "deepseek-coder-v2-lite-instruct"):
        self.smart_model = smart_model

    def route(self, task_type: str, content: str) -> RoutingDecision:
        """
        Analisa a tarefa e decide o destino.
        """
        content_len = len(content)
        
        # 1. Tarefas pesadas (mais de 4k chars) -> SEMPRE Sombra (Economia de Tokens)
        if content_len > 4000:
            return RoutingDecision(True, self.smart_model, "Volume de dados alto (economia de tokens)")
            
        # 2. Tipos de tarefas ideais para o Sombra
        local_tasks = ['refactor', 'boilerplate', 'unit_test', 'audit', 'logs']
        if task_type.lower() in local_tasks:
            return RoutingDecision(True, self.smart_model, "Tarefa técnica ideal para processamento local")
            
        # 3. Default -> Nuvem (Antigravity) para tarefas de alto nível
        return RoutingDecision(False, "cloud-model", "Requer visão estratégica/arquitetura de alto nível")

if __name__ == "__main__":
    router = TaskRouter()
    d = router.route("refactor", "def code(): pass")
    print(f"Decisão: {'Local (Sombra)' if d.local else 'Nuvem'} | Motivo: {d.reason}")
