// Sends a debt-reminder SMS through Africa's Talking (Premium plan).
// The message text and phone number come from the database, not the browser,
// so the endpoint cannot be used to send arbitrary SMS.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string) => Deno.env.get(k) ?? "";
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

  const username = env("AT_USERNAME"), apiKey = env("AT_API_KEY"), sender = env("AT_SENDER_ID");
  if (!username || !apiKey) return json({ error: "SMS is not set up yet", code: "not_configured" }, 503);

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !user) return json({ error: "Not signed in" }, 401);

  let body: { shop_id?: string; customer_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

  const { data: prep, error: prepErr } = await db.rpc("svc_sms_prepare", {
    p_user: user.id, p_shop: body.shop_id, p_customer: body.customer_id,
  });
  if (prepErr || !prep?.length) return json({ error: prepErr?.message ?? "Not allowed" }, 400);
  const { log_id, phone, message } = prep[0];

  const base = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const form = new URLSearchParams({ username, to: phone, message });
  if (sender) form.set("from", sender);
  try {
    const r = await fetch(`${base}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const text = await r.text();
    let ok = false;
    try { ok = JSON.parse(text)?.SMSMessageData?.Recipients?.[0]?.status === "Success"; } catch { /* keep false */ }
    await db.rpc("svc_sms_result", { p_id: log_id, p_status: ok ? "sent" : "failed", p_response: text });
    return ok ? json({ sent: true }) : json({ error: "SMS could not be delivered" }, 502);
  } catch (e) {
    await db.rpc("svc_sms_result", { p_id: log_id, p_status: "failed", p_response: String(e) });
    return json({ error: "SMS service not reachable. Try again shortly." }, 502);
  }
});
