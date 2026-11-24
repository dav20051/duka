// Receives Safaricom's STK Push result. Safaricom does not sign callbacks, so:
//  1. the URL must carry our secret token, and
//  2. a "success" is only trusted after we re-check it with Daraja's STK Query API.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { accessToken, env, mpesaConfig, password, timestamp } from "../_shared/mpesa.ts";

const ack = () => Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function confirmedByDaraja(checkoutId: string): Promise<boolean> {
  const cfg = mpesaConfig();
  if (!cfg.ready) return false;
  const ts = timestamp();
  const r = await fetch(`${cfg.base}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(cfg)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: cfg.shortcode, Password: password(cfg, ts), Timestamp: ts, CheckoutRequestID: checkoutId }),
  });
  const d = await r.json().catch(() => ({}));
  return r.ok && String(d.ResultCode) === "0";
}

Deno.serve(async (req) => {
  const expected = env("MPESA_CALLBACK_TOKEN");
  const given = new URL(req.url).searchParams.get("token") ?? "";
  if (!expected || !safeEqual(given, expected)) return new Response("Forbidden", { status: 403 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => null);
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return ack();

  const items: Record<string, unknown> = Object.fromEntries(
    (cb.CallbackMetadata?.Item ?? []).map((i: { Name: string; Value: unknown }) => [i.Name, i.Value]),
  );
  let resultCode = Number(cb.ResultCode);
  try {
    if (resultCode === 0 && !(await confirmedByDaraja(cb.CheckoutRequestID))) resultCode = -1;
  } catch (e) {
    // Daraja unreachable: leave the request pending rather than guessing.
    console.error("mpesa-callback query", e);
    return new Response("Retry later", { status: 503 });
  }

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { error } = await db.rpc("svc_mpesa_complete", {
    p_checkout: cb.CheckoutRequestID,
    p_result_code: resultCode,
    p_desc: resultCode === -1 ? "Not confirmed by Daraja" : String(cb.ResultDesc ?? ""),
    p_receipt: items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber) : null,
    p_amount: items.Amount != null ? Number(items.Amount) : null,
  });
  if (error) {
    console.error("mpesa-callback complete", error);
    return new Response("Error", { status: 500 });
  }
  return ack();
});
