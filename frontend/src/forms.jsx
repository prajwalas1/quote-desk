import { useState } from "react";
import { request } from "./api.js";

function EntryForm({ children, path, toPayload, label, onSaved, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setError("");

    try {
      await request(path, toPayload(values));
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

export function RfqForm({ onSaved, onCancel }) {
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
      path="/api/rfqs"
      label="Create RFQ"
      toPayload={toPayload}
      onSaved={onSaved}
      onCancel={onCancel}
    >
      <label className="wide">
        Part number
        <input name="part_number" maxLength={120} required />
      </label>
      <label className="wide">
        Description
        <textarea name="description" maxLength={1500} rows={3} required />
      </label>
      <label>
        Quantity
        <input name="quantity" type="number" min={1} max={1000000} required />
      </label>
      <label>
        Needed by
        <input name="needed_by" type="date" required />
      </label>
    </EntryForm>
  );
}

export function QuoteForm({ rfqId, onSaved, onCancel }) {
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
      path={`/api/rfqs/${rfqId}/quotes`}
      label="Save quote"
      toPayload={toPayload}
      onSaved={onSaved}
      onCancel={onCancel}
    >
      <label>
        Supplier name
        <input name="supplier_name" maxLength={120} required />
      </label>
      <label>
        Unit price (₹)
        <input name="unit_price" type="number" min="0.01" step="0.01" required />
      </label>
      <label>
        Lead time (days)
        <input name="lead_time_days" type="number" min={0} max={3650} required />
      </label>
      <label>
        Valid until
        <input name="valid_until" type="date" required />
      </label>
    </EntryForm>
  );
}