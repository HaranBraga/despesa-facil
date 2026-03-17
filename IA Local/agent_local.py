import requests
import json
import sys
import argparse

def call_local_ai(prompt, model="openai/gpt-oss-20b", url="http://192.168.100.250:1234/v1/responses"):
    """
    Calls the local AI agent with a given prompt.
    """
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "input": prompt,
        "tool_choice": "auto"
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Call local AI agent.")
    parser.add_argument("prompt", type=str, help="The prompt to send to the AI.")
    parser.add_argument("--model", type=str, default="openai/gpt-oss-20b", help="Model name.")
    parser.add_argument("--url", type=str, default="http://192.168.100.250:1234/v1/responses", help="API URL.")
    
    args = parser.parse_args()
    
    result = call_local_ai(args.prompt, model=args.model, url=args.url)
    print(json.dumps(result, indent=2))
