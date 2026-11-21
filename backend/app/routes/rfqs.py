from datetime import datetime
from zoneinfo import ZoneInfo

import psycopg
from fastapi import APIRouter, HTTPException

from app.repositories.rfqs import (
    delete_quote,
    delete_rfq,
    find_rfq,
    insert_quote,
    insert_rfq,
    list_rfqs,
    update_quote,
    update_rfq,
)
from app.schemas.rfqs import CreateQuote, CreateRFQ
from app.services.quote_selection import evaluate_rfq

router = APIRouter(prefix="/api/rfqs", tags=["RFQs"])


@router.get("")
def get_rfqs():
    try:
        rfqs = list_rfqs()
    except (RuntimeError, psycopg.Error):
        raise HTTPException(
            status_code=503,
            detail="Could not list RFQs from the database",
        ) from None

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    return [evaluate_rfq(rfq, today) for rfq in rfqs]


@router.get("/{rfq_id}")
def get_rfq(rfq_id: int):
    try:
        rfq = find_rfq(rfq_id)
    except (RuntimeError, psycopg.Error):
        raise HTTPException(
            status_code=503,
            detail="Could not read the RFQ from the database",
        ) from None

    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")

    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    return evaluate_rfq(rfq, today)


@router.post("", status_code=201)
def create_rfq(payload: CreateRFQ):
    try:
        rfq = insert_rfq(
            payload.part_number,
            payload.description,
            payload.quantity,
            payload.needed_by,
        )
    except (RuntimeError, psycopg.Error):
        raise HTTPException(
            status_code=503,
            detail="Could not create the RFQ",
        ) from None

    rfq["quotes"] = []
    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    return evaluate_rfq(rfq, today)

@router.post("/{rfq_id}/quotes", status_code=201)
def create_quote(rfq_id: int, payload: CreateQuote):
    try:
        return insert_quote(
            rfq_id,
            payload.supplier_name,
            payload.unit_price,
            payload.lead_time_days,
            payload.valid_until,
        )
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="RFQ not found") from None
    except (RuntimeError, psycopg.Error):
        raise HTTPException(
            status_code=503, detail="Could not create the supplier quote"
        ) from None


@router.put("/{rfq_id}", status_code=204)
def edit_rfq(rfq_id: int, payload: CreateRFQ):
    try:
        updated = update_rfq(
            rfq_id, payload.part_number, payload.description, payload.quantity,
            payload.needed_by,
        )
    except (RuntimeError, psycopg.Error):
        raise HTTPException(503, "Could not update the RFQ") from None

    if not updated:
        raise HTTPException(404, "RFQ not found")


@router.delete("/{rfq_id}", status_code=204)
def remove_rfq(rfq_id: int):
    try:
        deleted = delete_rfq(rfq_id)
    except (RuntimeError, psycopg.Error):
        raise HTTPException(503, "Could not delete the RFQ") from None

    if not deleted:
        raise HTTPException(404, "RFQ not found")


@router.put("/{rfq_id}/quotes/{quote_id}", status_code=204)
def edit_quote(rfq_id: int, quote_id: int, payload: CreateQuote):
    try:
        updated = update_quote(
            rfq_id, quote_id, payload.supplier_name, payload.unit_price,
            payload.lead_time_days, payload.valid_until,
        )
    except (RuntimeError, psycopg.Error):
        raise HTTPException(503, "Could not update the supplier quote") from None

    if not updated:
        raise HTTPException(404, "Quote not found for this RFQ")


@router.delete("/{rfq_id}/quotes/{quote_id}", status_code=204)
def remove_quote(rfq_id: int, quote_id: int):
    try:
        deleted = delete_quote(rfq_id, quote_id)
    except (RuntimeError, psycopg.Error):
        raise HTTPException(503, "Could not delete the supplier quote") from None

    if not deleted:
        raise HTTPException(404, "Quote not found for this RFQ")
