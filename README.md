# Quote Desk

Quote Desk is a small procurement app for creating requests for quotation (RFQs), collecting supplier offers, and finding the lowest-priced quote that can meet the requested delivery date.

**Stack:** React and Vite, FastAPI, and Neon PostgreSQL. PostgreSQL keeps RFQs and quotes after the app restarts. A foreign key ties each quote to its RFQ, and a decimal column stores INR prices exactly.

## Run locally

You’ll need Python 3.12, uv, Node.js 22.12+ (or a newer supported LTS release), npm, and a Neon PostgreSQL database.

1. In the Neon SQL Editor, run the schema below once on a fresh database. If you already set up the Quote Desk tables, skip this step.

   <details>
   <summary>Database schema</summary>

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

   </details>

2. Create a file named `.env` in the repository root, beside `backend/` and `frontend/`. Paste your Neon PostgreSQL connection string, including its connection options. Keep this file out of Git.

   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
   ```

3. From the repository root, start FastAPI in one terminal.

   ```powershell
   cd backend
   uv sync
   uv run fastapi dev app/main.py
   ```

4. From the repository root, start React in a second terminal.

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

Open the local URL printed by Vite (usually `http://127.0.0.1:5173`). Vite forwards `/api` requests to FastAPI on port 8000. The [API docs](http://127.0.0.1:8000/docs) are available while FastAPI is running.

## Status and best quote

- **Open** — the deadline has not passed and there are no quotes.
- **Quoted** — the deadline has not passed and at least one quote is still valid.
- **Expired** — the needed-by date has passed, or quotes exist and every quote has expired.

The API calculates status and the best quote when it reads an RFQ. A quote is eligible if it is valid today and can arrive by the needed-by date. Lead time is counted in calendar days from today in India. Both the validity date and delivery deadline are inclusive. The lowest unit price wins, with ties broken by shorter lead time and then lower quote ID. A **Quoted** RFQ can have no best quote if every valid offer would arrive late.

## Test

From `backend/`, run:

```powershell
uv run python -m pytest -q
```

The automated test uses fixed dates and verifies that a cheaper offer loses when it would arrive late. It runs without a database connection.

## With one more day

I’d add edit and delete actions for RFQs and quotes, plus an integration test that covers creating an RFQ, adding offers, and reading back the calculated winner. The initial version focuses on creating RFQs, collecting quotes, and selecting a winner. I left out authentication and multi-user permissions because this is a single-user interview demo. The app runs locally, so a hosted frontend or backend is unnecessary for the walkthrough.
