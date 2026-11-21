from datetime import date
from decimal import Decimal

from app.services.quote_selection import evaluate_rfq


def test_quote_selection_matches_both_five_percent_examples():
    today = date(2026, 11, 19)
    needed_by = date(2026, 11, 29)  # All offers in this test arrive in time.
    valid_until = date(2026, 12, 3)

    supplier_a = {
        "id": 1,
        "supplier_name": "Supplier A",
        "unit_price": Decimal("100.00"),
        "lead_time_days": 10,
        "valid_until": valid_until,
    }

    cases = [
        (Decimal("104.00"), 6, "Supplier B"),
        (Decimal("150.00"), 9, "Supplier A"),
    ]

    for price, lead_time, expected_supplier in cases:
        supplier_b = {
            "id": 2,
            "supplier_name": "Supplier B",
            "unit_price": price,
            "lead_time_days": lead_time,
            "valid_until": valid_until,
        }
        rfq = {
            "needed_by": needed_by,
            "quotes": [supplier_a, supplier_b],
        }

        result = evaluate_rfq(rfq, today=today)
        selected = result["best_quote"]
        expected = supplier_b if expected_supplier == "Supplier B" else supplier_a

        case = f"₹100 in 10 days vs ₹{price:.0f} in {lead_time} days"
        print(f"\n{case}")
        print(f"Expected winner: {expected_supplier}")
        print(f"Actual winner: {selected['supplier_name'] if selected else 'None'}")

        assert result["status"] == "Quoted", case
        assert result["best_quote_id"] == expected["id"], case
        assert selected == expected, case