export async function request(path, payload) {
  const options = payload === undefined
    ? {}
    : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      };

  const response = await fetch(path, options);
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
        : "Could not reach the API. Check that FastAPI is running on port 8000.",
    );
  }

  return data;
}

