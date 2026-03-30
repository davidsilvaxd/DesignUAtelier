import requests

url = "http://localhost:8001/chat"
resp = requests.post(url, data={"text": "Diseña un vestido azul usando solo los requisitos que te di, sin texto extra"})
print(resp.json())
