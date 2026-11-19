from fastapi import FastAPI

from app.routes.health import router as health_router
from app.routes.rfqs import router as rfq_router

app = FastAPI(title="Quote Desk API")
app.include_router(health_router)
app.include_router(rfq_router)