import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { request } from "./api.js";
import { QuoteForm, RfqForm } from "./forms.jsx";
import "./styles.css";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatDate(value) {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}

function QuoteTable({ rfq }) {
  if (rfq.quotes.length === 0) {
    return <p className="muted">No supplier quotes yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Supplier</th>
            <th scope="col">Unit price</th>
            <th scope="col">Lead time</th>
            <th scope="col">Valid until</th>
          </tr>
        </thead>
        <tbody>
          {rfq.quotes.map((quote) => {
            const isBest = quote.id === rfq.best_quote_id;

            return (
              <tr key={quote.id} className={isBest ? "winner" : undefined}>
                <td>
                  {quote.supplier_name}
                  {isBest && <span className="badge best">Best quote</span>}
                </td>
                <td>{money.format(quote.unit_price)}</td>
                <td>{quote.lead_time_days} days</td>
                <td>{formatDate(quote.valid_until)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RfqCard({ rfq, reload }) {
  const [addingQuote, setAddingQuote] = useState(false);

  return (
    <article className="card">
      <div className="row">
        <div>
          <p className="muted">RFQ #{rfq.id}</p>
          <h2>{rfq.part_number}</h2>
          <p>{rfq.description}</p>
        </div>
        <span className={`badge ${rfq.status.toLowerCase()}`}>
          {rfq.status}
        </span>
      </div>

      <dl className="summary">
        <div>
          <dt>Quantity</dt>
          <dd>{rfq.quantity}</dd>
        </div>
        <div>
          <dt>Needed by</dt>
          <dd>{formatDate(rfq.needed_by)}</dd>
        </div>
      </dl>

      <div className="row quotes-heading">
        <h3>Supplier quotes</h3>
        {!addingQuote && (
          <button type="button" onClick={() => setAddingQuote(true)}>
            + Add quote
          </button>
        )}
      </div>

      <QuoteTable rfq={rfq} />

      {addingQuote && (
        <QuoteForm
          rfqId={rfq.id}
          onCancel={() => setAddingQuote(false)}
          onSaved={() => {
            setAddingQuote(false);
            reload();
          }}
        />
      )}
    </article>
  );
}

function App() {
  const [rfqs, setRfqs] = useState([]);
  const [addingRfq, setAddingRfq] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  function reload() {
    setLoading(true);
    setError("");
    setRefresh((value) => value + 1);
  }

  useEffect(() => {
    let active = true;

    async function loadRfqs() {
      try {
        const data = await request("/api/rfqs");

        if (!Array.isArray(data)) {
          throw new Error("Expected an RFQ list from the API.");
        }

        if (active) setRfqs(data);
      } catch (error) {
        if (active) setError(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRfqs();

    return () => {
      active = false;
    };
  }, [refresh]);

  return (
    <>
      <header>
        <div className="shell">Quote Desk</div>
      </header>

      <main className="shell">
        <div className="row page-heading">
          <h1>Requests for quotation</h1>
          {!addingRfq && (
            <button
              className="primary"
              type="button"
              onClick={() => setAddingRfq(true)}
            >
              + New RFQ
            </button>
          )}
        </div>

        {addingRfq && (
          <section className="card">
            <h2>New request</h2>
            <RfqForm
              onCancel={() => setAddingRfq(false)}
              onSaved={() => {
                setAddingRfq(false);
                reload();
              }}
            />
          </section>
        )}

        {loading && <p role="status">Loading requests…</p>}

        {error && (
          <div role="alert" className="error">
            {error}{" "}
            <button type="button" onClick={reload}>Retry</button>
          </div>
        )}

        {!loading && !error && rfqs.length === 0 && (
          <p className="muted">No requests yet. Create an RFQ to get started.</p>
        )}

        {rfqs.map((rfq) => (
          <RfqCard key={rfq.id} rfq={rfq} reload={reload} />
        ))}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);