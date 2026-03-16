# -*- coding: utf-8 -*-
"""
Configurações centralizadas do Agente Local.
Sem dependências externas — apenas stdlib.
"""

import os

# =============================================================================
# API LM Studio
# =============================================================================
API_BASE_URL = os.getenv("LM_STUDIO_URL", "http://192.168.100.250:1234/v1")

# =============================================================================
# Modelos disponíveis
# =============================================================================
MODEL_SMART = "deepseek-coder-v2-lite-instruct" # Modelo mais rápido e eficiente
MODEL_EMBED = "text-embedding-nomic-embed-text-v1.5"  # Embeddings

# Modelo padrão (32B)
DEFAULT_MODEL = MODEL_SMART

# =============================================================================
# Timeouts e Retry
# =============================================================================
REQUEST_TIMEOUT = 300      # 5 minutos — API é lenta na primeira chamada
RETRY_MAX_ATTEMPTS = 3
RETRY_BACKOFF_BASE = 5     # segundos — espera 5s, 10s, 20s

# =============================================================================
# Parâmetros de geração padrão
# =============================================================================
DEFAULT_TEMPERATURE = 0.3  # Baixo = mais determinístico e previsível
DEFAULT_MAX_TOKENS = 2048

# =============================================================================
# Cache
# =============================================================================
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")
CACHE_ENABLED = True
CACHE_MAX_AGE_HOURS = 24   # Expira cache após 24h
