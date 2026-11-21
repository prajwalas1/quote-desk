export async function request(path, payload, method = payload === undefined ? "GET" : "POST") {
  const options = { method };
  if (payload !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(payload);
  }

  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  const response = await fetch(`${apiBase}${path}`, options);
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (Array.isArray(data?.detail)) {
      const messages = data.detail.map(
        ({ loc, msg }) => `${loc.at(-1)}: ${msg}`,
      );
      throw new Error(messages.join(". "));
    }

    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Could not complete the request. Please try again.",
    );
  }

  return data;
}

