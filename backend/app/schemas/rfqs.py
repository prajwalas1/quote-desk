from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from zoneinfo import ZoneInfo

from pydantic import AfterValidator, BaseModel, Field, StringConstraints


def require_today_or_future(value: date) -> date:
    today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    if value < today:
        raise ValueError("Date must be today or later")
    return value


TodayOrFuture = Annotated[date, AfterValidator(require_today_or_future)]


class CreateRFQ(BaseModel):
    part_number: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ]
    description: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1500)
    ]
    quantity: int = Field(ge=1, le=1_000_000)
    needed_by: TodayOrFuture


class CreateQuote(BaseModel):
    supplier_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
    ]
    unit_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    lead_time_days: int = Field(ge=0, le=3650)
    valid_until: TodayOrFuture