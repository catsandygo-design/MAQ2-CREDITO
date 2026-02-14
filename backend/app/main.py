from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from .routes import router

app = FastAPI(title="Crédito/Repasse API")
app.include_router(router)

# Servir frontend (modo 1 serviço só no Render)
FRONT_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/static", StaticFiles(directory=FRONT_DIR), name="static")

@app.get("/")
def home():
    return FileResponse(FRONT_DIR / "index.html")
