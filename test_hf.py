import os
from dotenv import load_dotenv
import requests

load_dotenv()
hf_api_key = os.getenv("HF_API_KEY")
print(f"HF Key starts with: {hf_api_key[:5] if hf_api_key else 'None'}")

headers = {"Authorization": f"Bearer {hf_api_key}"}
API_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"

try:
    response = requests.post(API_URL, headers=headers, json={"inputs": "a beautiful red dress for a party"})
    print(f"Status Code: {response.status_code}")
    if response.status_code != 200:
        print(f"Error: {response.text}")
    else:
        print("Success! Image data length:", len(response.content))
except Exception as e:
    print(f"Exception: {e}")
