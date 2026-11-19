from datetime import date
from typing import Annotated
from decimal import Decimal

from pydantic import BaseModel, Field, StringConstraints


class CreateRFQ(BaseModel):
    part_number: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ]
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1500)
    ]
    quantity: int = Field(ge=1, le=1_000_000)
    needed_by: date


class CreateQuote(BaseModel):
    supplier_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ]
    unit_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    lead_time_days: int = Field(ge=0, le=3650)
    valid_until: date
