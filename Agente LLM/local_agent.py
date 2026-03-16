# -*- coding: utf-8 -*-
"""
Local Agent — Wrapper eficiente para a API do LM Studio.
Zero dependências externas. Usa apenas stdlib do Python.

Uso:
    from local_agent import LocalAgent
    agent = LocalAgent()
    resposta = agent.chat("Explique o que é uma API REST")
    embeddings = agent.embed("texto para busca semântica")
"""

import json
import hashlib
import os
import time
import logging
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any, Union

import config

# =============================================================================
# Logging
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("local_agent")


class LocalAgentError(Exception):
    """Erro base do agente local."""
    pass


class APITimeoutError(LocalAgentError):
    """A API não respondeu no tempo limite."""
    pass


class APIConnectionError(LocalAgentError):
    """Não foi possível conectar à API."""
    pass


class LocalAgent:
    """
    Wrapper para a API do LM Studio com cache, retry e seleção de modelo.

    Atributos:
        api_base: URL base da API
        default_model: Modelo padrão para chat
        timeout: Timeout em segundos
    """

    def __init__(
        self,
        api_base: str = config.API_BASE_URL,
        default_model: str = config.DEFAULT_MODEL,
        timeout: int = config.REQUEST_TIMEOUT,
        cache_enabled: bool = config.CACHE_ENABLED,
    ):
        self.api_base = api_base.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout
        self.cache_enabled = cache_enabled
        self._cache_dir = config.CACHE_DIR

        if self.cache_enabled:
            os.makedirs(self._cache_dir, exist_ok=True)

    # =========================================================================
    # API Pública
    # =========================================================================

    def is_available(self) -> bool:
        """Verifica se a API do LM Studio está acessível."""
        try:
            req = urllib.request.Request(f"{self.api_base}/models")
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            return "data" in data and len(data["data"]) > 0
        except Exception:
            return False

    def list_models(self) -> List[str]:
        """Retorna lista de modelos disponíveis."""
        try:
            req = urllib.request.Request(f"{self.api_base}/models")
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            return [m["id"] for m in data.get("data", [])]
        except Exception as e:
            log.error(f"Erro ao listar modelos: {e}")
            return []

    def chat(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = config.DEFAULT_TEMPERATURE,
        max_tokens: int = config.DEFAULT_MAX_TOKENS,
        use_cache: bool = True,
    ) -> str:
        """
        Envia um prompt para o modelo e retorna a resposta em texto.

        Args:
            prompt: Pergunta/instrução para o modelo
            model: Modelo a usar (default: config.DEFAULT_MODEL)
            system_prompt: Instrução de sistema opcional
            temperature: Criatividade (0.0 = determinístico, 1.0 = criativo)
            max_tokens: Máximo de tokens na resposta
            use_cache: Se True, usa/salva cache para este prompt

        Returns:
            Texto da resposta do modelo
        """
        model = model or self.default_model
        messages = self._build_messages(prompt, system_prompt)

        # Tenta cache primeiro
        if self.cache_enabled and use_cache:
            cache_key = self._cache_key(model, messages, temperature)
            cached = self._cache_get(cache_key)
            if cached is not None:
                log.info(f"Cache hit para prompt ({len(prompt)} chars)")
                return cached

        # Faz a chamada
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        log.info(f"Chamando {model} ({len(prompt)} chars, temp={temperature})...")
        start = time.time()
        result = self._api_call("/chat/completions", payload)
        elapsed = time.time() - start

        response_text = result["choices"][0]["message"]["content"]
        usage = result.get("usage", {})

        log.info(
            f"Resposta em {elapsed:.1f}s | "
            f"in={usage.get('prompt_tokens', '?')} "
            f"out={usage.get('completion_tokens', '?')} tokens"
        )

        # Salva no cache
        if self.cache_enabled and use_cache:
            self._cache_set(cache_key, response_text)

        return response_text

    def chat_smart(self, prompt: str, **kwargs) -> str:
        """Chat usando o modelo 32B (mais capaz, mais lento)."""
        return self.chat(prompt, model=config.MODEL_SMART, **kwargs)

    def chat_fast(self, prompt: str, **kwargs) -> str:
        """Chat usando o modelo 14B (mais rápido)."""
        return self.chat(prompt, model=config.MODEL_FAST, **kwargs)

    def embed(self, text: Union[str, List[str]]) -> List[List[float]]:
        """
        Gera embeddings para texto(s).

        Args:
            text: Texto único ou lista de textos

        Returns:
            Lista de vetores de embeddings
        """
        if isinstance(text, str):
            text = [text]

        payload = {
            "model": config.MODEL_EMBED,
            "input": text,
        }

        log.info(f"Gerando embeddings para {len(text)} texto(s)...")
        start = time.time()
        result = self._api_call("/embeddings", payload)
        elapsed = time.time() - start

        embeddings = [item["embedding"] for item in result["data"]]
        log.info(f"Embeddings gerados em {elapsed:.1f}s (dim={len(embeddings[0])})")

        return embeddings

    def embed_single(self, text: str) -> List[float]:
        """Gera embedding para um único texto. Retorna vetor direto."""
        return self.embed(text)[0]

    # =========================================================================
    # Chamada HTTP com Retry
    # =========================================================================

    def _api_call(self, endpoint: str, payload: dict) -> dict:
        """
        Faz chamada HTTP POST com retry e backoff exponencial.
        """
        url = f"{self.api_base}{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}

        last_error = None

        for attempt in range(1, config.RETRY_MAX_ATTEMPTS + 1):
            try:
                req = urllib.request.Request(url, data=data, headers=headers)
                resp = urllib.request.urlopen(req, timeout=self.timeout)
                return json.loads(resp.read())

            except urllib.error.URLError as e:
                last_error = e
                if hasattr(e, "reason") and "timed out" in str(e.reason):
                    log.warning(
                        f"Timeout na tentativa {attempt}/{config.RETRY_MAX_ATTEMPTS}"
                    )
                    if attempt < config.RETRY_MAX_ATTEMPTS:
                        wait = config.RETRY_BACKOFF_BASE * (2 ** (attempt - 1))
                        log.info(f"Aguardando {wait}s antes de retentar...")
                        time.sleep(wait)
                else:
                    raise APIConnectionError(f"Erro de conexão: {e}") from e

            except Exception as e:
                raise LocalAgentError(f"Erro inesperado: {e}") from e

        raise APITimeoutError(
            f"API não respondeu após {config.RETRY_MAX_ATTEMPTS} tentativas "
            f"(timeout={self.timeout}s)"
        )

    # =========================================================================
    # Construção de mensagens
    # =========================================================================

    @staticmethod
    def _build_messages(
        prompt: str, system_prompt: Optional[str] = None
    ) -> List[Dict[str, str]]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages

    # =========================================================================
    # Cache em disco (JSON simples)
    # =========================================================================

    def _cache_key(self, model: str, messages: list, temperature: float) -> str:
        raw = json.dumps({"m": model, "msg": messages, "t": temperature}, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _cache_get(self, key: str) -> Optional[str]:
        path = os.path.join(self._cache_dir, f"{key}.json")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                entry = json.load(f)
            # Verifica expiração
            age_hours = (time.time() - entry["ts"]) / 3600
            if age_hours > config.CACHE_MAX_AGE_HOURS:
                os.remove(path)
                return None
            return entry["data"]
        except Exception:
            return None

    def _cache_set(self, key: str, data: str) -> None:
        path = os.path.join(self._cache_dir, f"{key}.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"ts": time.time(), "data": data}, f, ensure_ascii=False)
        except Exception as e:
            log.warning(f"Erro ao salvar cache: {e}")

    def cache_clear(self) -> int:
        """Limpa todo o cache. Retorna número de entradas removidas."""
        if not os.path.exists(self._cache_dir):
            return 0
        count = 0
        for fname in os.listdir(self._cache_dir):
            if fname.endswith(".json"):
                os.remove(os.path.join(self._cache_dir, fname))
                count += 1
        log.info(f"Cache limpo: {count} entradas removidas")
        return count


# =============================================================================
# Uso direto via linha de comando
# =============================================================================
if __name__ == "__main__":
    import sys

    agent = LocalAgent()

    if not agent.is_available():
        print("ERRO: API do LM Studio não está acessível.")
        print(f"URL: {agent.api_base}")
        sys.exit(1)

    print(f"API online. Modelos: {agent.list_models()}")

    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = "Diga apenas: OK, estou funcionando!"

    print(f"\nEnviando: {prompt}")
    print(f"Modelo: {agent.default_model}")
    print("-" * 40)
    resposta = agent.chat(prompt)
    print(resposta)
