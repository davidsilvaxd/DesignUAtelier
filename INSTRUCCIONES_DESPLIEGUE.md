# 🚀 Guía de Despliegue: DesignU Digital Atelier

Sigue estos pasos para subir tu proyecto a GitHub y desplegarlo en Vercel.

---

## 1. Subir a GitHub (El Repositorio)

1. **Inicia Git**: Abre una terminal en la carpeta `DesignU` y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Primer despliegue: DesignU Atelier"
   ```
2. **Crea el Repo en la Web**:
   - Ve a [github.com/new](https://github.com/new).
   - Nombre: `DesignU-Atelier`.
   - Haz clic en **"Create repository"**.
3. **Conecta y Sube**:
   - Copia la URL de tu nuevo repo (ej: `https://github.com/tu-usuario/DesignU-Atelier.git`).
   - En tu terminal, ejecuta:
     ```bash
     git remote add origin TU_URL_COPIADA
     git push -u origin main
     ```

---

## 2. Desplegar en Vercel (La Nube)

1. **Inicia Sesión**: Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. **Importar Proyecto**:
   - Haz clic en **"Add New"** > **"Project"**.
   - Busca tu repositorio `DesignU-Atelier` y dale a **"Import"**.
3. **Configurar Variables de Entorno** (CRÍTICO):
   - En la sección **"Environment Variables"**, añade estas dos:
     - **Key**: `GROQ_API_KEY` | **Value**: `gsk_gQV...` (Pégala aquí)
     - **Key**: `HF_API_KEY` | **Value**: `hf_kq...` (Pégala aquí)
4. **Desplegar**: Haz clic en **"Deploy"**.

---

## 3. Notas Importantes

- **Seguridad**: He creado un archivo `.gitignore` para que tus API Keys **NUNCA** se suban a GitHub. Solo estarán seguras en el panel de Vercel.
- **Estructura**: He preparado la carpeta `api/` para que Vercel reconozca automáticamente que es una aplicación FastAPI.
- **Frontend**: Tu página principal y el Atelier se servirán desde las rutas raíz (`/`) y (`/atelier`) respectivamente.

---

¡Tu Atelier estará en vivo en cuestión de minutos! Si tienes algún error en el despliegue, envíame el log de Vercel y lo arreglamos de inmediato. 👗✨
