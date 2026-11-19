import psycopg
from fastapi import APIRouter, HTTPException

from app.core.database import open_connection

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
def health():
    return {"status": "ok"}


@router.get("/db")
def database_health():
    try:
        with open_connection() as connection:
            connection.execute("SELECT 1").fetchone()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None
    except psycopg.Error:
        raise HTTPException(
            status_code=503, detail="Could not connect to the database"
        ) from None

    return {"database": "ok"}