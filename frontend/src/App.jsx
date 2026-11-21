import { useEffect, useState } from "react";
import { request } from "./api.js";
import { QuoteForm, RfqForm } from "./forms.jsx";
import "./styles.css";

const statusFilters = ["All", "Open", "Quoted", "Expired"];

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

function DeleteButton({ path, label, confirmation, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(confirmation)) return;

    setDeleting(true);
    setError("");
    try {
      await request(path, undefined, "DELETE");
      onDeleted();
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button type="button" className="danger" disabled={deleting} onClick={remove}>
        {deleting ? "Deleting…" : label}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

function QuoteTable({ rfq, onEdit, onDeleted }) {
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
            <th scope="col">Actions</th>
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
                <td>
                  <div className="actions">
                    <button type="button" onClick={() => onEdit(quote.id)}>Edit</button>
                    <DeleteButton
                      path={`/api/rfqs/${rfq.id}/quotes/${quote.id}`}
                      label="Delete"
                      confirmation={`Delete the quote from ${quote.supplier_name}?`}
                      onDeleted={() => onDeleted(quote.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RfqCard({ rfq, reload }) {
  const [editingRfq, setEditingRfq] = useState(false);
  const [quoteForm, setQuoteForm] = useState(null);
  const selectedQuote = rfq.quotes.find((quote) => quote.id === quoteForm);

  function saveQuote() {
    setQuoteForm(null);
    reload();
  }

  return (
    <article className="card">
      <div className="row rfq-heading">
        <div>
          <p className="rfq-id">RFQ #{rfq.id}</p>
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

      {editingRfq ? (
        <RfqForm
          rfq={rfq}
          onCancel={() => setEditingRfq(false)}
          onSaved={() => {
            setEditingRfq(false);
            reload();
          }}
        />
      ) : (
        <div className="actions rfq-actions">
          <button type="button" onClick={() => setEditingRfq(true)}>Edit RFQ</button>
          <DeleteButton
            path={`/api/rfqs/${rfq.id}`}
            label="Delete RFQ"
            confirmation={`Delete RFQ #${rfq.id} and all of its supplier quotes?`}
            onDeleted={reload}
          />
        </div>
      )}

      <div className="row quotes-heading">
        <h3>Supplier quotes <span className="count">{rfq.quotes.length}</span></h3>
        <button type="button" onClick={() => setQuoteForm("new")}>
          + Add quote
        </button>
      </div>

      <QuoteTable
        rfq={rfq}
        onEdit={setQuoteForm}
        onDeleted={(id) => {
          if (quoteForm === id) setQuoteForm(null);
          reload();
        }}
      />

      {rfq.status === "Quoted" && rfq.best_quote_id == null && (
        <p className="quote-note">No valid quote can arrive by the needed-by date.</p>
      )}

      {(quoteForm === "new" || selectedQuote) && (
        <QuoteForm
          key={quoteForm}
          rfqId={rfq.id}
          quote={selectedQuote}
          onCancel={() => setQuoteForm(null)}
          onSaved={saveQuote}
        />
      )}
    </article>
  );
}

function App() {
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const query = search.trim().toLowerCase();
  const visibleRfqs = rfqs.filter((rfq) =>
    (statusFilter === "All" || rfq.status === statusFilter) &&
    [rfq.part_number, rfq.description, ...rfq.quotes.map((quote) => quote.supplier_name)]
      .some((value) => value.toLowerCase().includes(query)),
  );
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
        <div className="shell brand">
          <span className="brand-mark" aria-hidden="true">Q</span>
          Quote Desk
        </div>
      </header>

      <main className="shell">
        <div className="row page-heading">
          <div>
            <h1>Requests for quotation</h1>
            <p className="muted">Track part requests and compare supplier quotes.</p>
          </div>
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
          <section className="card new-request">
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

        <div className="status-grid" role="group" aria-label="Filter by RFQ status">
          {statusFilters.map((status) => {
            const total = status === "All"
              ? rfqs.length
              : rfqs.filter((rfq) => rfq.status === status).length;

            return (
              <button
                className={`status-filter ${status.toLowerCase()}`}
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                <span>{status === "All" ? "All requests" : status}</span>
                <strong>{total}</strong>
              </button>
            );
          })}
        </div>

        <div className="list-toolbar">
          <label className="rfq-search">
            Search RFQs
            <input
              type="search"
              placeholder="Part number, description, or supplier"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {!loading && !error && (
            <p className="muted result-count" role="status">
              {visibleRfqs.length} of {rfqs.length} requests
            </p>
          )}
        </div>

        {loading && <p role="status">Loading requests…</p>}

        {error && (
          <div role="alert" className="error">
            {error}{" "}
            <button type="button" onClick={reload}>Retry</button>
          </div>
        )}

        {!loading && !error && rfqs.length === 0 && (
          <p className="empty-state">No requests yet. Create an RFQ to get started.</p>
        )}

        {!loading && !error && rfqs.length > 0 && visibleRfqs.length === 0 && (
          <p className="empty-state">No requests match the current filters.</p>
        )}

        {visibleRfqs.map((rfq) => (
          <RfqCard key={rfq.id} rfq={rfq} reload={reload} />
        ))}
      </main>
    </>
  );
}

export default App;
