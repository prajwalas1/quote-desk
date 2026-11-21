from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.main import app
from app.routes import rfqs

client = TestClient(app)


def test_quote_mutations_use_both_ids_and_return_404_when_missing(monkeypatch):
    update = Mock(return_value=True)
    delete = Mock(return_value=False)
    monkeypatch.setattr(rfqs, "update_quote", update)
    monkeypatch.setattr(rfqs, "delete_quote", delete)

    path = "/api/rfqs/12/quotes/34"
    response = client.put(path, json={
        "supplier_name": "Example",
        "unit_price": "104.00",
        "lead_time_days": 6,
        "valid_until": "2026-12-03",
    })
    assert response.status_code == 204
    assert response.content == b""
    assert update.call_args.args[:2] == (12, 34)

    assert client.delete(path).status_code == 404
    delete.assert_called_once_with(12, 34)


def test_rfq_edit_and_delete_return_no_content(monkeypatch):
    update = Mock(return_value=True)
    delete = Mock(return_value=True)
    monkeypatch.setattr(rfqs, "update_rfq", update)
    monkeypatch.setattr(rfqs, "delete_rfq", delete)

    path = "/api/rfqs/12"
    assert client.put(path, json={
        "part_number": "BRG-01",
        "description": "Bearing",
        "quantity": 4,
        "needed_by": "2026-11-29",
    }).status_code == 204
    assert update.call_args.args[0] == 12

    assert client.delete(path).status_code == 204
    delete.assert_called_once_with(12)
