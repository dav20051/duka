# Duka: switching on the paid features

Everything below is already built and deployed. Each feature stays off until its keys are added.

## 1. Automatic M-Pesa payments (STK Push)

1. Get a **Lipa na M-Pesa Paybill or Till** for JOEDFRAME TECHNOLOGIES.
2. Create an app at <https://developer.safaricom.co.ke> and request **Go Live** for M-Pesa Express (STK Push). Safaricom gives you a Consumer Key, Consumer Secret and Passkey.
3. In Supabase → **Edge Functions → Secrets**, add:

| Secret | Value |
|---|---|
| `MPESA_CONSUMER_KEY` | from Daraja |
| `MPESA_CONSUMER_SECRET` | from Daraja |
| `MPESA_PASSKEY` | from Daraja |
| `MPESA_SHORTCODE` | your Paybill number (or the Store/HO number for a Till) |
| `MPESA_TRANSACTION_TYPE` | `CustomerPayBillOnline` (Paybill) or `CustomerBuyGoodsOnline` (Till) |
| `MPESA_PARTY_B` | only for a Till: the Till number |
| `MPESA_ENV` | `production` (leave out to use the Daraja sandbox) |
| `MPESA_CALLBACK_TOKEN` | a long random secret you make up |
| `MPESA_CALLBACK_URL` | `https://tlcoxnnliwrvmnezsiqh.supabase.co/functions/v1/mpesa-callback?token=<the same secret>` |

4. Ask Claude to switch it on, or run in the SQL editor:
   `update private.settings set value = 'true' where key = 'mpesa_stk_enabled';`

The app then shows **Pay now with M-Pesa** on the plans screen. Prices are worked out on the server, each payment is re-checked with Safaricom before it counts, and the same M-Pesa receipt can never be used twice.

## 2. SMS debt reminders (Premium)

1. Create an account at <https://africastalking.com>, top up SMS credit, and (optional) register a sender ID such as `DUKA`.
2. In Supabase → **Edge Functions → Secrets**, add `AT_USERNAME`, `AT_API_KEY` and, if approved, `AT_SENDER_ID`.
3. Switch it on: `update private.settings set value = 'true' where key = 'sms_enabled';`

Limits: Premium only, 300 SMS per month per shop, one reminder per customer per 24 hours. The message is written by the server from the real balance.

## 3. Sales agents

In the app's **Admin** tab → **Sales agents** → **+ Add agent**. Give each agent a code (e.g. `KIP01`) and a commission %. Shops enter the code when they sign up; the Admin tab shows each agent's sign-ups, paying shops and commission owed.

## 4. Before launch (from the go-live checklist)

- Supabase → Authentication: turn on **Confirm email**, set up **custom SMTP**, set the **Site URL** to the live domain, turn on **leaked password protection**.
- Upgrade to **Supabase Pro** (daily backups, no pausing) and **Vercel Pro** (Hobby is non-commercial).
