# Duka

Shop management for Kenyan dukas, hardware shops, chemists and agrovets: selling, stock, customer debts,
suppliers, expenses and real profit. Works offline, in Kiswahili or English, from any phone browser.

- **Live app:** https://duka-lyart.vercel.app (demo shop: `/?demo=1`)
- **Website:** https://duka-lyart.vercel.app/home.html
- **Owner:** JOEDFRAME TECHNOLOGIES · 0701 252 785

## How it is built
| Part | What it is |
|---|---|
| Front end | Plain HTML, CSS and JavaScript, no build step. `index.html` loads the files in `js/` in order. |
| Database and login | Supabase (Postgres) project `tlcoxnnliwrvmnezsiqh`. Security is enforced in the database with row level security, column permissions and checked functions, not only in the app. |
| Hosting | Vercel project `duka` (team **itax**). Every push to `main` goes live; other branches get a preview link. |
| Offline | `sw.js` keeps the app on the phone; sales made offline wait in the phone's storage and sync later. |
| Server functions | `supabase/functions/`: M-Pesa STK Push, M-Pesa callback and SMS reminders. Off until keys are added (see `SETUP.md`). |

### Files
```
index.html           app page (styles + script list)
home.html            marketing website
i18n.js              Kiswahili translations
sw.js                offline support (bump VERSION on every release)
js/core.js           config, plans, start-up, offline queue, branches, tabs
js/errors.js         error reports to Admin → Errors (APP_VERSION)
js/screens.js        tab screens, selling, receipts, stock list, deliveries
js/shop.js           customers and debts, product editing, staff, daily summary
js/stock-tools.js    Excel/CSV import, quick add, stock-take, barcode camera
js/reports.js        Today reports, expenses, cash check, order list
js/suppliers.js      suppliers, purchases, supplier payments
js/admin.js          platform admin (only accounts in private.admins)
js/onboarding.js     getting-started checklist, install prompt
js/demo.js           in-browser demo shop (no data sent anywhere)
js/simple.js         Simple / Full mode and the "How do I…?" help
js/settings.js       More tab, permissions, account; offline guards; start-up
tests/               browser tests (fake in-memory backend)
supabase/functions/  Edge Functions
```

## Working on it
```bash
npm install && npx playwright install chromium
npm test          # serves the app locally and runs all browser tests
```
GitHub Actions runs the same tests on every push (`.github/workflows/test.yml`).

**Releasing:** bump `VERSION` in `sw.js` and `APP_VERSION` in `js/errors.js`, run `npm test`, push to `main`.
Open tabs and installed apps pick up the new version on their own.

**Database changes** are applied as Supabase migrations (history: Supabase → Database → Migrations).
Every change must keep these rules: staff never see profit or costs; owners only edit their own shop;
expired shops are read-only; money tables can't be deleted from the app.

## Plans
Basic KES 500 · Standard KES 1,000 · Premium KES 2,000 per month (10% off for 6 months, 2 months free yearly).
Limits are enforced in the database (`private.plan_limit`). New shops get 30 days of Standard free.

## Database backups
The free Supabase plan has **no automatic data backups**. Upgrade to Supabase Pro for daily backups.

The database *structure* (no shop data) is saved to `supabase/schema.sql` by the
**Database schema backup** workflow, weekly and on demand. To turn it on once:
1. Supabase → **Connect** → copy the **Session pooler** connection string and put your database password in it.
2. GitHub → repository **Settings → Secrets and variables → Actions → New repository secret**:
   name `SUPABASE_DB_URL`, value the connection string.
3. GitHub → **Actions → Database schema backup → Run workflow**.

## More documents
- `SETUP.md`: switching on M-Pesa STK Push and SMS
- `PLAYSTORE.md`: publishing on Google Play
- `privacy.html`, `terms.html`: legal pages shown to customers
