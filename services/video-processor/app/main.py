from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import process, health

app = FastAPI(title="Pickleball Video Processor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(process.router)
