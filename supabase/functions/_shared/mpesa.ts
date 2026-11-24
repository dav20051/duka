// Shared helpers for Safaricom Daraja (M-Pesa) calls.
export const env = (k: string) => Deno.env.get(k) ?? "";

export function mpesaConfig() {
  const cfg = {
    key: env("MPESA_CONSUMER_KEY"),
    secret: env("MPESA_CONSUMER_SECRET"),
    shortcode: env("MPESA_SHORTCODE"),
    passkey: env("MPESA_PASSKEY"),
    callbackUrl: env("MPESA_CALLBACK_URL"), // must include ?token=<MPESA_CALLBACK_TOKEN>
    // CustomerPayBillOnline for Paybill, CustomerBuyGoodsOnline for Till numbers
    type: env("MPESA_TRANSACTION_TYPE") || "CustomerPayBillOnline",
    partyB: env("MPESA_PARTY_B") || env("MPESA_SHORTCODE"), // Till number when using Buy Goods
    base: env("MPESA_ENV") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
  };
  const ready = Boolean(cfg.key && cfg.secret && cfg.shortcode && cfg.passkey && cfg.callbackUrl);
  return { ...cfg, ready };
}

export async function accessToken(cfg: ReturnType<typeof mpesaConfig>): Promise<string> {
  const r = await fetch(`${cfg.base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: "Basic " + btoa(`${cfg.key}:${cfg.secret}`) },
  });
  if (!r.ok) throw new Error(`M-Pesa auth failed (${r.status})`);
  return (await r.json()).access_token;
}

// Daraja wants the timestamp in Kenyan time (UTC+3) as YYYYMMDDHHmmss.
export function timestamp(): string {
  return new Date(Date.now() + 3 * 3600_000).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export function password(cfg: ReturnType<typeof mpesaConfig>, ts: string): string {
  return btoa(cfg.shortcode + cfg.passkey + ts);
}
