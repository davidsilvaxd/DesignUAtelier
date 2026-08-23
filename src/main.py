# pyrefly: ignore [missing-import]
from fastapi import FastAPI, File, UploadFile, Form
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
import groq
# pyrefly: ignore [missing-import]
import requests
# pyrefly: ignore [missing-import]
import io
# pyrefly: ignore [missing-import]
import os
# pyrefly: ignore [missing-import]
import base64
# pyrefly: ignore [missing-import]
import uuid
load_dotenv()
# Cargar variables de entorno


client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))
gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI") or ""
pollinations_api_key = os.getenv("POLLINATIONS_API_KEY") or ""
print(f"DEBUG: GROQ API KEY configured: {bool(os.getenv('GROQ_API_KEY'))}")
print(f"DEBUG: GEMINI API KEY configured: {bool(gemini_api_key)}")
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

# Prompt del sistema (se reutiliza en cada sesión nueva)
SYSTEM_PROMPT = {
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

# Prompt del sistema para modo ESTAMPADO (se instancia con el nombre de la camiseta seleccionada)
STAMP_SYSTEM_PROMPT_TEMPLATE = """Eres un diseñador experto en personalización de prendas de vestir.

CONTEXTO ACTUAL: El usuario ha seleccionado una **{shirt_name}** como prenda base. Tu función es aplicar modificaciones de diseño directamente sobre ella.

REGLAS ABSOLUTAS:
1. SOLO puedes realizar modificaciones de diseño (gráficos, estampados, texturas, patrones, colores) sobre la {shirt_name} seleccionada. NUNCA diseñes prendas diferentes (como chaquetas, hoodies, etc.), y nunca generes anatomia humana, cara brazos ni de ningun tipo.
2. Si el usuario pide cambiar la prenda (ej: "quiero un hoodie"), IGNORA esa parte y responde: "Solo puedo aplicar modificaciones sobre la {shirt_name} que seleccionaste. Descríbeme el diseño que quieres y lo aplicaré sobre ella."
3. Responde SIEMPRE en el mismo idioma del usuario.
4. Responde cordialmente a saludos.
5. Rechaza cualquier tema no relacionado con el diseño de la prenda.
6. Está prohibido modificar la cara, cuerpo, fondo, agregar personas o accesorios. Si te piden algo de esto, responde exactamente: "Solo se permiten modificaciones sobre la prenda seleccionada. No es posible realizar cambios en otros elementos de la imagen."

GENERACIÓN DE LA IMAGEN:
Debes decidir entre dos modos de generación según la solicitud del usuario:

A) MODO PATRÓN / TEXTURA / DISEÑO GENERAL (mode=garment):
Si el usuario solicita patrones generales como puntos, rayas, texturas, o un diseño que cubre toda la prenda, debes generar la prenda completa con el diseño integrado de forma natural (respetando pliegues, sombras, perspectiva y costuras).
- FORMATO EXACTO (sin bloques de código):
  ![Diseño](/generate-image?prompt={{descripcion_de_la_prenda_completa_en_ingles}}&title={{titulo}}&mode=garment)
- El PROMPT (en INGLÉS) describe la prenda completa con el patrón integrado.
  - CORRECTO: "classic_fit_mens_white_tshirt_with_black_polka_dots_pattern_all_over_minimalist_ghost_mannequin_style,_isolated_on_white_background"
  - CORRECTO: "oversized_fit_mens_white_tshirt_with_horizontal_black_stripes_pattern_all_over_minimalist_ghost_mannequin_style,_isolated_on_white_background"
  - INCORRECTO: "black_polka_dots_pattern" (debes incluir la prenda base {shirt_name} en inglés)

B) MODO ESTAMPADO LOCALIZADO / GRÁFICO INDIVIDUAL (mode=stamp):
Si el usuario solicita un gráfico o ilustración localizada en el centro (ej: "un sol geométrico", "dibuja un gato"), debes generar únicamente el gráfico sobre fondo blanco.
- FORMATO EXACTO (sin bloques de código):
  ![Estampado](/generate-image?prompt={{descripcion_del_estampado_en_ingles}}&title={{titulo}}&mode=stamp)
- El PROMPT (en INGLÉS) es EXCLUSIVAMENTE el arte/diseño del estampado, aislado en fondo blanco sólido, sin incluir la prenda ni personas.
  - CORRECTO: "geometric_sun_flat_vector_stamp,_black_and_gold,_white_background,_minimal_graphic_design"
  - INCORRECTO: "t-shirt_with_sun_stamp"

- El TÍTULO va en el mismo idioma del usuario, usando guiones bajos en lugar de espacios.

FORMATO DE RESPUESTA:
- Usa **negrita** para elementos clave (colores, telas, estilos)
- Describe la personalización de forma breve y atractiva
- Lista los elementos visuales del diseño
- Incluye SIEMPRE la imagen generada al final de la respuesta

EJEMPLO DE RESPUESTA CORRECTA PARA PATRÓN:
# Camiseta con Puntos Negros
Se ha aplicado un patrón de puntos negros sobre la camiseta clásica.

## Elementos del diseño:
- **Estilo:** Patrón de puntos (polka dots) all-over
- **Colores:** Puntos negros sobre tela blanca
- **Acabado:** Integrado de forma natural en los pliegues

![Diseño](/generate-image?prompt=classic_fit_mens_white_tshirt_with_black_polka_dots_pattern_all_over_minimalist_ghost_mannequin_style,_isolated_on_white_background&title=Camiseta_con_Puntos_Negros&mode=garment)"""

# Memoria de conversación POR SESIÓN
# Cada session_id tiene su propio historial aislado
session_histories: dict[str, list] = {}

def get_session_history(session_id: str) -> list:
    """Obtiene o crea el historial de una sesión."""
    if session_id not in session_histories:
        session_histories[session_id] = [SYSTEM_PROMPT.copy()]
        print(f"DEBUG: Nueva sesión creada: {session_id}")
    return session_histories[session_id]

def is_forbidden_request(text: str) -> bool:
    import re
    t = text.lower()
    
    # Coincidencia por límite de palabra para palabras cortas para evitar falsos positivos
    forbidden_words = [
        r"\bcara\b", r"\bcaras\b", r"\bface\b", r"\bfaces\b", 
        r"\bbody\b", r"\bbodies\b", r"\bgente\b", r"\bpeople\b",
        r"\breloj\b", r"\bgafas\b", r"\blentes\b", r"\bshorts\b", r"\bshort\b"
    ]
    
    # Coincidencia por subcadena para términos largos/específicos que no generan falsos positivos
    forbidden_substrings = [
        "fondo", "background", "rostro", "cuerpo", "persona", "modelo", 
        "accesorio", "collar", "pulsera", "bolso", "cartera", "zapato", 
        "zapatilla", "sombrero", "gorra", "cintur", "pantalon", "pantalón", 
        "jeans", "falda"
    ]
    
    for word_pat in forbidden_words:
        if re.search(word_pat, t):
            return True
            
    for sub in forbidden_substrings:
        if sub in t:
            return True
            
    return False

@app.get("/")
def landing():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/atelier")
def atelier():
    return FileResponse(os.path.join(frontend_path, "atelier.html"))

@app.get("/favicon.ico")
def favicon():
    fav = os.path.join(frontend_path, "logo.png")
    if os.path.exists(fav):
        return FileResponse(fav)
    return {"error": "favicon not found"}

@app.post("/chat")
async def chat(text: str = Form(...), session_id: str = Form(""), image: UploadFile = File(None)):
    try:
        # Si no se proporcionó session_id, generar uno temporal
        if not session_id:
            session_id = str(uuid.uuid4())
            
        # Validación de Alcance
        if is_forbidden_request(text):
            return {
                "reply": "Solo se permiten modificaciones sobre la prenda seleccionada. No es posible realizar cambios en otros elementos de la imagen.",
                "session_id": session_id
            }
        
        # Obtener historial de esta sesión específica
        history = get_session_history(session_id)
        
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

        # Añadir al historial de ESTA sesión
        history.append({"role": "user", "content": user_message_content})
        
        # Limitar historial para evitar exceder tokens (máx ~20 mensajes + system)
        MAX_HISTORY = 21  # 1 system + 20 mensajes (10 pares user/assistant)
        if len(history) > MAX_HISTORY:
            # Mantener system prompt + los últimos 20 mensajes
            history[:] = [history[0]] + history[-(MAX_HISTORY - 1):]

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=history
        )

        reply = response.choices[0].message.content

        history.append({"role": "assistant", "content": reply})

        return {"reply": reply, "session_id": session_id}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"reply": f"Error: {str(e)}"}

@app.post("/clear-session")
async def clear_session(session_id: str = Form("")):
    """Limpia el historial de una sesión para empezar una conversación nueva."""
    if session_id and session_id in session_histories:
        session_histories[session_id] = [SYSTEM_PROMPT.copy()]
        print(f"DEBUG: Sesión limpiada: {session_id}")
        return {"status": "ok", "message": "Historial de conversación limpiado"}
    return {"status": "ok", "message": "No había historial que limpiar"}

@app.post("/select-shirt")
async def select_shirt(session_id: str = Form(""), shirt_id: str = Form(...), shirt_name: str = Form(...)):
    """Inicializa la sesión en modo de diseño de estampados para la camiseta seleccionada."""
    if not session_id:
        session_id = str(uuid.uuid4())

    # Construir el prompt de estampado con la camiseta seleccionada
    stamp_system_prompt = {
        "role": "system",
        "content": STAMP_SYSTEM_PROMPT_TEMPLATE.format(shirt_name=shirt_name)
    }

    # Inicializar (o reiniciar) la sesión con el prompt de estampado
    session_histories[session_id] = [stamp_system_prompt]
    print(f"DEBUG: Sesión {session_id} configurada para estampado en '{shirt_name}' ({shirt_id})")

    return {"status": "ok", "session_id": session_id, "shirt_id": shirt_id, "shirt_name": shirt_name}


@app.get("/generate-image")
def generate_image(prompt: str, mode: str = "garment"):
    import urllib.parse
    headers = {}
    if pollinations_api_key:
        headers["Authorization"] = f"Bearer {pollinations_api_key}"

    # Capa de seguridad: sufijo diferente según el modo
    if mode == "stamp":
        # Modo estampado: solo el arte gráfico, sin prenda
        safety_suffix = ", flat vector graphic design, isolated on pure white background, no clothing, no shirt, no garment, no human, stamp artwork only, high contrast, graphic design"
    else:
        # Modo prenda completa (comportamiento original)
        safety_suffix = ", isolated on white background, no human, no people, no face, no skin, professional product photography, high quality clothing only, ghost mannequin style"

    full_prompt = prompt + safety_suffix

    # Intento 1: Generación con Google Gemini si está configurada la clave
    if gemini_api_key:
        for gemini_model in ["gemini-2.5-flash-image", "gemini-3.1-flash-image", "gemini-3-pro-image"]:
            try:
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_api_key}"
                payload = {
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {"responseModalities": ["IMAGE"]}
                }
                gemini_resp = requests.post(gemini_url, json=payload, timeout=20)
                if gemini_resp.status_code == 200:
                    data = gemini_resp.json()
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    for part in parts:
                        if "inlineData" in part:
                            raw_b64 = part["inlineData"]["data"]
                            mime_type = part["inlineData"].get("mimeType", "image/png")
                            return StreamingResponse(io.BytesIO(base64.b64decode(raw_b64)), media_type=mime_type)
            except Exception as e:
                print(f"DEBUG: Gemini ({gemini_model}) error: {e}")

    # Fallback: Pollinations.ai con Flux
    encoded_prompt = urllib.parse.quote(full_prompt)
    
    # Aplicar optimizaciones de velocidad:
    # nologo=true quita marcas de agua.
    # enhance=false evita reescritura de prompt para mantener el control estricto.
    API_URL = f"https://image.pollinations.ai/prompt/{encoded_prompt}?nologo=true&enhance=false&width=800&height=800&model=flux"
    
    try:
        response = requests.get(API_URL, headers=headers, timeout=25)
        
        # Pollinations devuelve 200 con la imagen directamente
        if response.status_code != 200:
            return {"error": "Image generation API error", "details": response.text}, response.status_code
            
        return StreamingResponse(io.BytesIO(response.content), media_type="image/jpeg")
    except Exception as e:
        return {"error": str(e)}, 500

@app.get("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools():
    return {"error": "Not implemented"}, 404

if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
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
