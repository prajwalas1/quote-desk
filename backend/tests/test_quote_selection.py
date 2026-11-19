from datetime import date
from decimal import Decimal

from app.services.quote_selection import evaluate_rfq


def test_cheaper_late_quote_loses_to_on_time_quote():
    rfq = {
        "needed_by": date(2026, 11, 25),
        "quotes": [
            {
                "id": 1,
                "supplier_name": "Supplier A",
                "unit_price": Decimal("440.00"),
                "lead_time_days": 12,
                "valid_until": date(2026, 12, 3),
            },
            {
                "id": 2,
                "supplier_name": "Supplier B",
                "unit_price": Decimal("515.00"),
                "lead_time_days": 4,
                "valid_until": date(2026, 12, 3),
            },
        ],
    }

    result = evaluate_rfq(rfq, today=date(2026, 11, 19))

    assert result["status"] == "Quoted"
    assert result["best_quote_id"] == 2
    assert result["best_quote"]["supplier_name"] == "Supplier B"
