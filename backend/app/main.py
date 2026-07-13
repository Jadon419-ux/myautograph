from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables
from app.routers import auth, autographs, celebrities, concerts, managers, streams

app = FastAPI(title="My Autograph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth.router)
app.include_router(celebrities.router)
app.include_router(autographs.router)
app.include_router(concerts.router)
app.include_router(streams.router)
app.include_router(managers.router)


@app.get("/health")
def health():
    return {"status": "ok"}
