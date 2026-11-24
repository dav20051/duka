// Starts an M-Pesa STK Push so a shop owner can pay for a Duka plan from their phone.
// The price is worked out in the database (svc_mpesa_prepare), never trusted from the browser.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { accessToken, env, mpesaConfig, password, timestamp } from "../_shared/mpesa.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const cfg = mpesaConfig();
  if (!cfg.ready) return json({ error: "Automatic M-Pesa payment is not set up yet", code: "not_configured" }, 503);

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !user) return json({ error: "Not signed in" }, 401);

  let body: { shop_id?: string; plan?: string; months?: number; phone?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  let phone = String(body.phone ?? "").replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(phone)) phone = "254" + phone.slice(1);
  else if (/^[17]\d{8}$/.test(phone)) phone = "254" + phone;
  if (!/^254[17]\d{8}$/.test(phone)) return json({ error: "Enter a valid M-Pesa number, e.g. 0712345678" }, 400);

  const { data: prep, error: prepErr } = await db.rpc("svc_mpesa_prepare", {
    p_user: user.id, p_shop: body.shop_id, p_plan: body.plan, p_months: Number(body.months),
  });
  if (prepErr || !prep?.length) return json({ error: prepErr?.message ?? "Not allowed" }, 400);
  const { billing_shop, amount, shop_name } = prep[0];

  try {
    const token = await accessToken(cfg);
    const ts = timestamp();
    const r = await fetch(`${cfg.base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: cfg.shortcode,
        Password: password(cfg, ts),
        Timestamp: ts,
        TransactionType: cfg.type,
        Amount: Math.round(Number(amount)),
        PartyA: phone,
        PartyB: cfg.partyB,
        PhoneNumber: phone,
        CallBackURL: cfg.callbackUrl,
        AccountReference: (String(shop_name).replace(/[^A-Za-z0-9]/g, "") || "DUKA").slice(0, 12),
        TransactionDesc: `Duka ${body.plan}`.slice(0, 13),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ResponseCode !== "0") {
      return json({ error: d.errorMessage ?? d.ResponseDescription ?? "M-Pesa request failed" }, 502);
    }
    const { error: recErr } = await db.rpc("svc_mpesa_record", {
      p_checkout: d.CheckoutRequestID, p_merchant: d.MerchantRequestID, p_shop: billing_shop,
      p_plan: body.plan, p_months: Number(body.months), p_amount: amount, p_phone: phone, p_user: user.id,
    });
    if (recErr) return json({ error: "Could not save the payment request" }, 500);
    return json({ checkout_request_id: d.CheckoutRequestID, amount });
  } catch (e) {
    console.error("mpesa-stk", e);
    return json({ error: "M-Pesa is not reachable right now. Try again shortly." }, 502);
  }
});
