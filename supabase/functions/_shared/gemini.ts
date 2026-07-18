const retryableStatuses = new Set([429, 500, 502, 503, 504]);

function availableKeys() {
  return [
    Deno.env.get("GEMINI_API_KEY_1"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY"), // safe migration fallback
  ].filter((key): key is string => Boolean(key));
}

/** Sends a Gemini request with round-robin key selection and transient-failure failover. */
export async function geminiFetch(url: string, init: RequestInit): Promise<Response> {
  const keys = availableKeys();
  if (!keys.length) throw new Error("No Gemini API key is configured.");
  const start = Math.floor(Date.now() / 1000) % keys.length;
  let response: Response | undefined;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const index = (start + attempt) % keys.length;
    const headers = new Headers(init.headers);
    headers.set("x-goog-api-key", keys[index]);
    response = await fetch(url, { ...init, headers });
    if (response.ok || !retryableStatuses.has(response.status)) return response;
    console.warn(`Gemini transient response ${response.status}; retrying with configured key slot ${index + 1}.`);
  }
  return response!;
}
