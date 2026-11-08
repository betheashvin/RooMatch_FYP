"""RooMatch API entry point.

Run (from the backend/ directory):
    uvicorn app.main:app --reload --port 8000

Interactive API docs are then at http://localhost:8000/docs
"""

from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError

from .database import _ENV_FILE, create_schema, get_engine

from .routers import auth, catalog, health, layouts, validate

load_dotenv(_ENV_FILE, override=False)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    engine = get_engine()
    create_schema(engine)
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="RooMatch API", version="0.1.0", lifespan=lifespan)


@app.exception_handler(SQLAlchemyError)
async def database_unavailable(_request: Request, exc: SQLAlchemyError):
    logging.getLogger(__name__).warning("Database operation failed: %s", type(exc).__name__)
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable. Please try again later."})

# The React dev server (Vite) serves on port 5173. Allow it to call the API
# during development. Tighten / make configurable before any deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(validate.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(layouts.router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "RooMatch API", "docs": "/docs"}
