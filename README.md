# Quote Desk

Quote Desk is a procurement app for creating requests for quotation (RFQs), managing supplier offers, and comparing prices and delivery times. The dashboard lets you search by part number, description, or supplier and filter RFQs by status.

- [Live demo](https://quote-desk-alpha.vercel.app/)
- [GitHub repository](https://github.com/prajwalas1/quote-desk)

## Stack

- **Frontend** — React and Vite, hosted on Vercel
- **Backend** — FastAPI, hosted on Render
- **Database** — Neon PostgreSQL

PostgreSQL preserves RFQs and quotes across app restarts. A foreign key ties each quote to its RFQ, and a `NUMERIC` column stores INR prices exactly.

## Run locally

You’ll need Python 3.12, uv, Node.js 22.12 or a newer supported LTS release, npm, and a Neon PostgreSQL database.

### 1. Create the database tables

Run this SQL in the Neon SQL Editor once on a fresh database. If the Quote Desk tables already exist, skip this step.

```sql
BEGIN;

CREATE TABLE public.rfqs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    part_number VARCHAR(120) NOT NULL CHECK (part_number ~ '[^[:space:]]'),
    description VARCHAR(1500) NOT NULL CHECK (description ~ '[^[:space:]]'),
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
    needed_by DATE NOT NULL CHECK (isfinite(needed_by)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quotes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rfq_id BIGINT NOT NULL REFERENCES public.rfqs(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(120) NOT NULL CHECK (supplier_name ~ '[^[:space:]]'),
    unit_price NUMERIC(12, 2) NOT NULL
        CHECK (unit_price > 0 AND unit_price <> 'NaN'::numeric),
    lead_time_days INTEGER NOT NULL CHECK (lead_time_days BETWEEN 0 AND 3650),
    valid_until DATE NOT NULL CHECK (isfinite(valid_until)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_rfq_id ON public.quotes (rfq_id);

COMMIT;
```

### 2. Set the database connection

Create `.env` in the repository root, beside `backend/` and `frontend/`. Paste your Neon connection string, including its connection options. Keep `.env` out of Git.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

### 3. Start the backend

From the repository root, open a terminal and run:

```powershell
cd backend
uv sync
uv run fastapi dev app/main.py
```

- [API documentation](http://127.0.0.1:8000/docs)
- [Database health check](http://127.0.0.1:8000/api/health/db)

### 4. Start the frontend

From the repository root, open a second terminal and run:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, usually [http://127.0.0.1:5173](http://127.0.0.1:5173). In development, Vite forwards `/api` requests to FastAPI on port `8000`.

## RFQ status and best quote

| Status | Meaning |
| --- | --- |
| **Open** | The needed-by date has not passed and the RFQ has no quotes. |
| **Quoted** | The needed-by date has not passed and at least one quote is still valid. |
| **Expired** | The needed-by date has passed, or all existing quotes have expired. |

The API calculates the status and best quote when it reads an RFQ. A quote is eligible if it is still valid today and its lead time allows delivery by the needed-by date. Lead time is counted in calendar days from today in India. Both the quote’s validity date and the delivery deadline are inclusive.

The app finds the lowest eligible unit price, then considers eligible offers priced up to 5% above it, inclusive. The shortest lead time wins within that group. Equal lead times are resolved by lower unit price, then lower quote ID. A **Quoted** RFQ can have no best quote when all valid offers would arrive late.

New and edited RFQs and quotes accept today or a future date. Existing expired records remain visible in the dashboard.

## Run the tests

From the repository root, run:

```powershell
cd backend
uv sync
uv run python -m pytest -v
```

To run only the quote selection test and display the expected and actual winner for each example, run this from `backend/`:

```powershell
uv run python -m pytest -v -s tests/test_quote_selection.py
```

The quote selection test checks both examples in one test function:

| Eligible quotes | Expected winner |
| --- | --- |
| ₹100 in 10 days vs. ₹104 in 6 days | ₹104 in 6 days. It costs 4% more and arrives sooner. |
| ₹100 in 10 days vs. ₹150 in 9 days | ₹100 in 10 days. The faster offer exceeds the 5% price range. |

The API tests cover RFQ editing and deletion, quote editing, and the response when a quote is missing. These tests mock database operations, so the suite runs without a Neon connection or a running server. The successful edit requests currently use fixed dates. If those tests later return `422`, update their request dates to a future date relative to today in India.

## Deployment configuration

| Service | Setting | Value |
| --- | --- | --- |
| Render | `DATABASE_URL` | Connection string for the Neon demo database |
| Render | `FRONTEND_ORIGIN` | `https://quote-desk-alpha.vercel.app` |
| Vercel | Root Directory | `frontend` |
| Vercel | `VITE_API_URL` | `https://quote-desk-0sjg.onrender.com` |

## With one more day

I’d add sign-in and permissions for editing and deleting procurement records. I’d also add a PostgreSQL integration test that creates an RFQ, adds competing quotes, edits or deletes an offer, and verifies that the API returns the new winner.

I left authentication and multi-user permissions out to keep the interview demo focused on the RFQ workflow and quote selection. The hosted demo is intended for sample data.
