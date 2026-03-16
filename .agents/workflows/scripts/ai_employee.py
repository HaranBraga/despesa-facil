import requests
import json
import sys

def ask_local_ai(prompt, system_prompt="Você é um assistente técnico prestativo e conciso."):
    url = "http://192.168.100.250:1234/api/v1/chat"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": "deepseek-coder-v2-lite-instruct",
        "system_prompt": system_prompt,
        "input": prompt
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data), timeout=10)
        response.raise_for_status()
        result = response.json()
        
        # LM Studio v1 API structure
        if "output" in result and isinstance(result["output"], list) and len(result["output"]) > 0:
             return result["output"][0].get("content", "Sem conteúdo na resposta.")
        
        # Fallback for other versions
        if "choices" in result:
             return result["choices"][0].get("message", {}).get("content", "Sem conteúdo na resposta.")
             
        return "Resposta em formato inesperado."
    except requests.exceptions.Timeout:
        return "Erro: Tempo de resposta esgotado (Timeout). Verifique a rede local."
    except Exception as e:
        return f"Erro ao conectar com a IA local: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_input = " ".join(sys.argv[1:])
        print(ask_local_ai(user_input))
    else:
        print("Uso: python ai_employee.py 'Seu prompt aqui'")
