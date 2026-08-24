# DesignU — AGENTS.md

## Stack
- **Backend:** Python FastAPI (two entrypoints)
  - `src/main.py` — local dev server (uvicorn --reload)
  - `api/index.py` — Vercel serverless (simplified, no session management)
- **Frontend:** Static HTML/CSS/JS in `src/frontend/`, served via Vercel rewrites
- **LLM:** Groq (`openai/gpt-oss-120b`)
- **Image gen:** Google Gemini Imagen (`gemini-2.5-flash-image` / `gemini-3.1-flash-image`; sin fallback externo — si falla, `/generate-image` responde HTTP 502)
- **Auth:** Firebase Auth (Google + email/password), guest mode available

## Commands
```
npm start           # dev: activates venv, runs uvicorn on localhost:8000
npm run dev         # same as start
npm test            # placeholder (no test framework configured)
```

## Project structure
- `src/main.py` — main FastAPI app with: `/chat`, `/generate-image`, `/select-shirt`, `/clear-session`, `/atelier`
- `api/index.py` — Vercel entrypoint (subset: `/chat`, `/generate-image`; no stamp mode, no session memory)
- `venv/` — Python virtualenv (requirements.txt: fastapi, uvicorn, groq, python-multipart, python-dotenv, gunicorn)
- `src/frontend/` — static assets (HTML, CSS, JS, PNGs); Vercel maps `/(.*)` -> `/src/frontend/$1`

## API quirks
- `/chat` accepts `text` (form field), `session_id` (form field), `image` (file upload, optional)
- `/select-shirt` resets session to stamp-design mode (STAMP_SYSTEM_PROMPT_TEMPLATE)
- `/generate-image?prompt=...&mode=garment|stamp` — `mode=stamp` generates isolated graphic, `mode=garment` full garment shot
- Session memory: 20 message limit per `session_id` (in-memory dict, lost on restart)
- `test_chat.py` and `test_hf.py` are manual test scripts, not part of a test suite

## Image generation safety
- `mode=garment` appends `safety_suffix` (no human, no face, ghost mannequin style)
- `mode=stamp` appends different suffix (flat vector, no clothing, white background)

## Important gotchas
- `.env` file has live API keys and is NOT in `.gitignore` — do NOT commit
- TypeScript (`^5.9.3`) is in devDependencies but no `.ts` files exist; unused
- No lint, typecheck, or test scripts configured; `src/package.json` test is a placeholder
- Frontend renders AI responses with `marked.parse()` so raw markdown syntax may not appear in DOM
- VS Code Python interpreter is pinned to `venv/Scripts/python.exe` via `.vscode/settings.json`
- `pyrefly: ignore [missing-import]` comments suppress Pyright type checker warnings
