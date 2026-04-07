from fastapi import FastAPI, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import groq
import requests
import io
import os
import base64
load_dotenv()
# Cargar variables de entorno


client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))
pollinations_api_key = os.getenv("POLLINATIONS_API_KEY") or ""
print(f"DEBUG: POLLINATIONS API KEY starts with: {pollinations_api_key[:5] if pollinations_api_key else 'None'}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para evitar el caché en archivos estáticos localmente
@app.middleware("http")
async def no_cache_middleware(request, call_next):
    response = await call_next(request)
    # Forzamos la actualización en rutas de frontend para ver cambios al instante
    if request.url.path.startswith("/frontend") or request.url.path in ("/", "/atelier"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Ruta a frontend
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/frontend", StaticFiles(directory=frontend_path), name="frontend")

class Message(BaseModel):
    text: str

# Memoria de conversación
conversation_history = [
    {
        "role": "system",
        "content": """Eres un diseñador profesional de moda especializado en crear diseños de ropa creativos.

RESTRICCIONES IMPORTANTES:
- SOLO debes responder preguntas relacionadas con diseño de moda, ropa, telas, colores, estilos de vestimenta, accesorios de moda y tendencias.
- Si el usuario pregunta sobre CUALQUIER OTRO TEMA (política, deportes, ciencia, matemáticas, programación, etc.), debes RECHAZAR la pregunta educadamente.
- Responde SIEMPRE en español, si el usuario pregunta en otro idioma, responde en su leguanje correspondiente.
- si el usuario hace una peticion de manera presunciona de algo ilegal o inmoral, rechaza la pregunta y responde con un mensaje de advertencia.
-responde cordialmente a cualquier clase de saludo casual por favor.
GENERACIÓN DE IMÁGENES:
- Si tu respuesta describe un diseño de moda o prenda específica, DEBES incluir una imagen al final de tu respuesta.
- EL FORMATO DEBE SER EXACTAMENTE ASÍ (sin bloques de código):
- ![Diseño](/generate-image?prompt={descripcion_en_ingles}&title={titulo_en_idioma_del_chat})
- Reemplaza {descripcion_en_ingles} por una descripción corta del diseño EN INGLÉS. ¡MUY IMPORTANTE!: Usa guiones bajos (_) en lugar de espacios para que el link no se rompa (ej: red_elegant_dress).
- Reemplaza {titulo_en_idioma_del_chat} por el título corto del diseño SIEMPRE EN EL MISMO IDIOMA en el que el usuario está escribiendo. Si el usuario escribe en inglés, el título va en inglés. Si escribe en francés, en francés. Usa guiones bajos en lugar de espacios.
- **REGLAS CRÍTICAS PARA EL PROMPT DE IMAGEN (SIEMPRE EN INGLÉS):** 
    1. DEBE ser exclusivamente de la prenda. No se permiten humanos.
    2. ESTÁ TERMINANTEMENTE PROHIBIDO incluir personas, modelos, maniquíes con rasgos humanos, caras, manos, piel, cabello o cualquier parte del cuerpo humano.
    3. El estilo DEBE ser "Flat lay" (prenda extendida sobre superficie) o "Ghost mannequin" (prenda con volumen pero sin modelo visible).
    4. El fondo DEBE ser blanco sólido o gris neutro minimalista.
    5. Usa verbos como "product shot of", "hanging", "folded", "displayed". NUNCA uses "wearing", "modeling" o "on a person".
- NUNCA pongas la URL dentro de un bloque de código.
- Asegúrate de que el prompt sea en INGLÉS.

CUANDO RECHACES UNA PREGUNTA, USA ESTE FORMATO:
"Disculpa, solo puedo ayudarte con diseño de moda y ropa. ¿Tienes algún diseño de vestimenta que quieras crear o personalizar?"

IMPORTANTE - FORMATO DE RESPUESTAS:
Usa SIEMPRE este formato en tus respuestas para que se vean ordenadas y atractivas:
- Usa **negrita** para palabras clave importantes (colores, estilos, telas)
- Usa titles con # para secciones principales (ej: # Diseño de Vestido)
- Usa listas con - para enumerar características o sugerencias
- Estructura tu respuesta con saltos de línea entre secciones

EJEMPLO DE RESPUESTA BIEN FORMATEADA:
# Vestido Rojo Elegante

**Tipo de tela:** Terciopelo suave
**Color base:** Rojo oscuro o vino

## Características principales:
- Corte ajustado en la cintura
- Falda con vuelo midi
- Mangas largas elegantes

*Perfecto para eventos formales y cócteles*

![Diseño](/generate-image?prompt=elegant_red_velvet_evening_gown_midi_length_long_sleeves_high_quality&title=Vestido_Rojo_Elegante)

CUANDO AYUDES CON DISEÑO:
- Detalla colores, telas, materiales y texturas usando **negrita**
- Sugiere estilos (casual, formal, deportivo, bohemio, minimalista, etc.)
- Propón combinaciones de prendas en listas organizadas
- Da consejos sobre tendencias y looks con *cursiva*
- **Incluye SIEMPRE la imagen generada al final si hay un diseño.**

RECUERDA: Formatea SIEMPRE tus respuestas siguiendo el ejemplo anterior."""
    }
]

@app.get("/")
def landing():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/atelier")
def atelier():
    return FileResponse(os.path.join(frontend_path, "atelier.html"))

@app.post("/chat")
async def chat(text: str = Form(...), image: UploadFile = File(None)):
    try:
        # Mensaje base del usuario
        user_message_content = [{"type": "text", "text": text}]
        
        # Procesar imagen si existe
        if image:
            image_bytes = await image.read()
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            user_message_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{image.content_type};base64,{base64_image}"
                }
            })

        # Añadir al historial (simplificado para visión)
        conversation_history.append({"role": "user", "content": user_message_content})

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=conversation_history
        )

        reply = response.choices[0].message.content

        conversation_history.append({"role": "assistant", "content": reply})

        return {"reply": reply, "hf_using": True}

    except Exception as e:
        return {"reply": f"Error: {str(e)}"}

@app.get("/generate-image")
def generate_image(prompt: str):
    import urllib.parse
    headers = {}
    if pollinations_api_key:
        headers["Authorization"] = f"Bearer {pollinations_api_key}"
        
    # Capa de seguridad: Forzar exclusión de humanos y estilo product shot
    safety_suffix = ", isolated on white background, no human, no people, no face, no skin, professional product photography, high quality clothing only, ghost mannequin style"
    encoded_prompt = urllib.parse.quote(prompt + safety_suffix)
    
    # Aplicar optimizaciones de velocidad:
    # nologo=true quita marcas de agua.
    # enhance=false evita reescritura de prompt para mantener el control estricto.
    API_URL = f"https://image.pollinations.ai/prompt/{encoded_prompt}?nologo=true&enhance=false&width=800&height=800&model=flux"
    
    try:
        response = requests.get(API_URL, headers=headers)
        
        # Pollinations devuelve 200 con la imagen directamente
        if response.status_code != 200:
            return {"error": "Pollinations API error", "details": response.text}, response.status_code
            
        return StreamingResponse(io.BytesIO(response.content), media_type="image/jpeg")
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools():
    return {"error": "Not implemented"}, 404

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Obtener host y puerto de variables de entorno para mayor versatilidad
    # "localhost" (por defecto) es ideal para desarrollo local.
    # Usa "0.0.0.0" (vía variable HOST) para escuchar en todas las interfaces.
    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", 8000))
    
    print(f"Iniciando servidor DesignU en {host}:{port} con auto-reload...")
    # Usamos el string "main:app" para permitir 'reload=True'
    uvicorn.run("main:app", host=host, port=port, reload=True)
