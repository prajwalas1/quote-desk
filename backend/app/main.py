import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.rfqs import router as rfq_router

app = FastAPI(title="Quote Desk API")
frontend_origin = os.getenv("FRONTEND_ORIGIN")
if frontend_origin:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[frontend_origin.rstrip("/")],
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
    )

app.include_router(health_router)
app.include_router(rfq_router)
