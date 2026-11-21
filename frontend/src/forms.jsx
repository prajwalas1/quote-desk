import { useState } from "react";
import { request } from "./api.js";

const indiaDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayInIndia() {
  const parts = indiaDateFormatter.formatToParts(new Date());
  const { year, month, day } = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${year}-${month}-${day}`;
}

function EntryForm({
  children,
  path,
  method,
  toPayload,
  label,
  onSaved,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setError("");

    try {
      await request(path, toPayload(values), method);
    } catch (error) {
      setError(error.message);
      return;
    } finally {
      setSaving(false);
    }

    onSaved();
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="fields" disabled={saving}>
        {children}
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Saving…" : label}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function RfqForm({ rfq, onSaved, onCancel }) {
  function toPayload(values) {
    return {
      part_number: values.get("part_number").trim(),
      description: values.get("description").trim(),
      quantity: Number(values.get("quantity")),
      needed_by: values.get("needed_by"),
    };
  }

  return (
    <EntryForm
      path={rfq ? `/api/rfqs/${rfq.id}` : "/api/rfqs"}
      method={rfq ? "PUT" : "POST"}
      label={rfq ? "Save RFQ" : "Create RFQ"}
      toPayload={toPayload}
      onSaved={onSaved}
      onCancel={onCancel}
    >
      <label className="wide">
        Part number
        <input
          name="part_number"
          defaultValue={rfq?.part_number}
          maxLength={120}
          required
        />
      </label>
      <label className="wide">
        Description
        <textarea
          name="description"
          defaultValue={rfq?.description}
          maxLength={1500}
          rows={3}
          required
        />
      </label>
      <label>
        Quantity
        <input
          name="quantity"
          defaultValue={rfq?.quantity}
          type="number"
          min={1}
          max={1000000}
          required
        />
      </label>
      <label>
        Needed by
        <input
          name="needed_by"
          defaultValue={rfq?.needed_by}
          type="date"
          min={todayInIndia()}
          required
        />
      </label>
    </EntryForm>
  );
}

export function QuoteForm({ rfqId, quote, onSaved, onCancel }) {
  function toPayload(values) {
    return {
      supplier_name: values.get("supplier_name").trim(),
      unit_price: values.get("unit_price"),
      lead_time_days: Number(values.get("lead_time_days")),
      valid_until: values.get("valid_until"),
    };
  }

  return (
    <EntryForm
      path={`/api/rfqs/${rfqId}/quotes${quote ? `/${quote.id}` : ""}`}
      method={quote ? "PUT" : "POST"}
      label="Save quote"
      toPayload={toPayload}
      onSaved={onSaved}
      onCancel={onCancel}
    >
      <label>
        Supplier name
        <input
          name="supplier_name"
          defaultValue={quote?.supplier_name}
          maxLength={120}
          required
        />
      </label>
      <label>
        Unit price (₹)
        <input
          name="unit_price"
          defaultValue={quote?.unit_price}
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>
      <label>
        Lead time (days)
        <input
          name="lead_time_days"
          defaultValue={quote?.lead_time_days}
          type="number"
          min={0}
          max={3650}
          required
        />
      </label>
      <label>
        Valid until
        <input
          name="valid_until"
          defaultValue={quote?.valid_until}
          type="date"
          min={todayInIndia()}
          required
        />
      </label>
    </EntryForm>
  );
}