import requests
import json
import sys
import os
import argparse

# --- Local Tools Implementation ---

def list_files(directory="."):
    """Lists files in the specified directory."""
    try:
        base_path = os.path.abspath(".")
        target_path = os.path.normpath(os.path.join(base_path, directory))
        if not target_path.startswith(base_path):
            return {"error": "Acesso restrito fora do projeto."}
            
        if not os.path.exists(target_path):
            return {"error": f"Diretório não encontrado: {directory} (Root: {base_path})"}
            
        files = os.listdir(target_path)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

def read_file(filepath):
    """Reads the content of a file."""
    try:
        base_path = os.path.abspath(".")
        target_path = os.path.normpath(os.path.join(base_path, filepath))
        if not target_path.startswith(base_path):
            return {"error": "Acesso restrito fora do projeto."}
            
        if not os.path.exists(target_path):
            return {"error": f"Arquivo não encontrado: {filepath}"}
            
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if len(content) > 8000:
                content = content[:8000] + "... (arquivo truncado)"
            return {"content": content}
    except Exception as e:
        return {"error": str(e)}

TOOLS_MAP = {
    "list_files": list_files,
    "read_file": read_file
}

TOOLS_DEFINITIONS = [
    {
        "type": "function",
        "name": "list_files",
        "description": "Lista os arquivos em um diretório do projeto.",
        "parameters": {
            "type": "object",
            "properties": {
                "directory": {"type": "string", "description": "Diretório (ex: '.')."}
            }
        }
    },
    {
        "type": "function",
        "name": "read_file",
        "description": "Lê o conteúdo de um arquivo do projeto.",
        "parameters": {
            "type": "object",
            "properties": {
                "filepath": {"type": "string", "description": "Caminho do arquivo."}
            }
        }
    }
]

def extract_text(outputs):
    """Recursively extracts text from the complex output structure."""
    text = ""
    for o in outputs:
        # Check top level text
        if o.get("type") in ["text", "chunk", "output_text"]:
            text += o.get("text", "")
        # Check nested message content
        elif o.get("type") == "message":
            content_list = o.get("content", [])
            for c in content_list:
                if c.get("type") == "output_text":
                    text += c.get("text", "")
    return text

def call_local_ai(prompt, model="openai/gpt-oss-20b", url="http://192.168.100.250:1234/v1/responses"):
    headers = {"Content-Type": "application/json"}
    
    # Pre-inject root file listing to help context
    root_files = list_files(".")
    current_prompt = f"O projeto tem os seguintes arquivos na raiz: {json.dumps(root_files)}\n\nUsuário: {prompt}"
    
    iteration = 0
    max_iterations = 5

    while iteration < max_iterations:
        iteration += 1
        data = {
            "model": model,
            "input": current_prompt,
            "tools": TOOLS_DEFINITIONS,
            "tool_choice": "auto"
        }
        
        print(f"\n[Iteração {iteration}] Enviando solicitação...")
        try:
            response = requests.post(url, headers=headers, data=json.dumps(data))
            response.raise_for_status()
            res_json = response.json()
            
            with open("IA Local/debug_last_response.json", "w", encoding="utf-8") as f:
                json.dump(res_json, f, indent=2)

            outputs = res_json.get("output", [])
            tool_calls = [o for o in outputs if o.get("type") == "function_call"]
            
            # Extract reasoning/thoughts for logging
            for o in outputs:
                if o.get("type") == "reasoning":
                    r_text = "".join([c.get("text", "") for c in o.get("content", []) if c.get("type") == "reasoning_text"])
                    if r_text: print(f"  > Pensamento: {r_text[:100]}...")

            if not tool_calls:
                # Done! Extract final text
                final_text = extract_text(outputs)
                return {"text": final_text or "(Sem resposta textual)"}

            print(f"  > IA Local solicitou {len(tool_calls)} ferramenta(s).")
            results_context = "\n[Resultados das Ferramentas]:\n"
            
            for tc in tool_calls:
                fn_name = tc.get("name")
                args = tc.get("arguments", {})
                if isinstance(args, str): args = json.loads(args)
                
                print(f"    - Executando {fn_name}({args})...")
                
                if fn_name in TOOLS_MAP:
                    if not isinstance(args, dict): args = {}
                    result = TOOLS_MAP[fn_name](**args)
                    results_context += f"Ferramenta {fn_name} retornou: {json.dumps(result)}\n"
                else:
                    results_context += f"Erro: Ferramenta {fn_name} desconhecida.\n"

            # Re-prompt
            current_prompt = f"{current_prompt}\n\nAqui estão os resultados:\n{results_context}\nContinue até concluir."
            
        except Exception as e:
            return {"error": str(e)}

    return {"error": "Excedeu iterações."}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", type=str)
    args = parser.parse_args()
    
    result = call_local_ai(args.prompt)
    
    if "error" in result:
        print(f"\n[ERRO]: {result['error']}")
    else:
        print("\n" + "="*40 + "\nRESPOSTA FINAL:\n" + "="*40)
        print(result.get("text", "(Sem resposta)"))
        print("="*40 + "\n")
