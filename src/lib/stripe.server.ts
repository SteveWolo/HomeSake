/**
 * Server-only Stripe REST helper.
 *
 * Kept in a `.server.ts` file so the secret key and request logic never enter a
 * client bundle. Import it with `await import(...)` inside server-fn handlers.
 */

export type StripeObject = Record<string, unknown> & {
  id?: string;
  status?: string;
  client_secret?: string;
  error?: { message?: string };
};

/** Flattens nested objects/arrays into Stripe's bracket form-encoding. */
function encode(params: Record<string, unknown>, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object") out.push(...encode(item as Record<string, unknown>, `${name}[${i}]`));
        else out.push([`${name}[${i}]`, String(item)]);
      });
    } else if (typeof value === "object") {
      out.push(...encode(value as Record<string, unknown>, name));
    } else {
      out.push([name, String(value)]);
    }
  }
  return out;
}

export function stripeSecret() {
  const secret = process.env["STRIPE_SECRET_KEY"];
  if (!secret) throw new Error("Stripe is not configured yet (missing STRIPE_SECRET_KEY).");
  return secret;
}

export async function stripeApi(
  path: string,
  params?: Record<string, unknown>,
  options?: { method?: "GET" | "POST"; idempotencyKey?: string },
): Promise<StripeObject> {
  const method = options?.method ?? (params ? "POST" : "GET");
  const encoded = params ? new URLSearchParams(encode(params)) : null;

  const url =
    method === "GET" && encoded
      ? `https://api.stripe.com/v1/${path}?${encoded.toString()}`
      : `https://api.stripe.com/v1/${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeSecret()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (options?.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const res = await fetch(url, {
    method,
    headers,
    ...(method === "POST" && encoded ? { body: encoded } : {}),
  });
  const json = (await res.json()) as StripeObject;
  if (!res.ok) throw new Error(json.error?.message ?? "Stripe request failed.");
  return json;
}
