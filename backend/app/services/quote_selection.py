from datetime import date


def evaluate_rfq(rfq: dict, today: date) -> dict:
    quotes = rfq["quotes"]
    needed_by = rfq["needed_by"]

    valid_quotes = [quote for quote in quotes if quote["valid_until"] >= today]

    if needed_by < today:
        status = "Expired"
    elif not quotes:
        status = "Open"
    elif valid_quotes:
        status = "Quoted"
    else:
        status = "Expired"

    days_remaining = (needed_by - today).days
    eligible_quotes = [
        quote
        for quote in valid_quotes
        if quote["lead_time_days"] <= days_remaining
    ]

    best_quote = min(
        eligible_quotes,
        key=lambda quote: (quote["unit_price"], quote["lead_time_days"], quote["id"]),
        default=None,
    )

    return {
        **rfq,
        "status": status,
        "best_quote_id": best_quote["id"] if best_quote else None,
        "best_quote": best_quote,
    }