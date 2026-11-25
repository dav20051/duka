# Putting Duka on the Google Play Store

Duka is already an installable web app (PWA). Google Play accepts it as an Android app through a
**Trusted Web Activity (TWA)**: a small Android shell that opens your site full-screen, with no browser bar.
No rewrite is needed, and every update to the website reaches the Play Store app automatically.

## What you need
1. **The domain** `kabarnetduka.co.ke` connected to Vercel. Use the final domain, not `duka-lyart.vercel.app`, because the app is tied to it.
2. **A Google Play developer account**: <https://play.google.com/console>, one-time fee of US$25, paid with a card.
   Register as an organisation (JOEDFRAME TECHNOLOGIES) if you can. Google asks for a D-U-N-S number for organisations; an individual account is quicker.
3. A privacy policy URL: `https://kabarnetduka.co.ke/privacy.html` (already written).

## Build the Android package (about 20 minutes)
The easiest way is **PWABuilder** (free, by Microsoft):
1. Open <https://www.pwabuilder.com> and enter `https://kabarnetduka.co.ke`.
2. Choose **Package for stores → Android → Google Play**.
3. Settings:
   - Package ID: `ke.co.kabarnetduka.app`
   - App name: `Duka`, launcher name: `Duka`
   - Signing key: **Create new** and **download and keep the key file and passwords safe**. Losing them means you can never update the app.
4. Download the zip. It contains `app-release-bundle.aab` (upload this to Play) and `assetlinks.json`.

## Prove you own the site (removes the browser bar)
1. Send me the `assetlinks.json` file from the zip (it contains only a public fingerprint, not a secret).
2. I will publish it at `https://kabarnetduka.co.ke/.well-known/assetlinks.json`.
3. After you upload to Play, also copy the **App signing key SHA-256** from
   Play Console → your app → Setup → App integrity, and send it to me. I will add it to the same file.

## Store listing (Play Console)
- **Short description** (80 characters max):
  `Shop sales, stock, debts and real profit. Works offline. Kiswahili & English.`
- **Full description**: use the text from `home.html` (Features, "Stop losing money" and FAQ).
- **Screenshots**: `img/screen-today.jpg`, `img/screen-sell.jpg`, `img/screen-debts.jpg`, `img/screen-stocktake.jpg`.
- **Icon**: `icons/icon-512.png`. **Feature graphic** (1024×500): ask me and I will make one.
- **Category**: Business. **Contact**: edchesang28@gmail.com, 0701 252 785.
- **Data safety form**: the app collects account email, shop records entered by the user, and customers' names and phone numbers entered by the shop.
  Data is encrypted in transit, is not sold, and users can request deletion (More → Delete my shop).

## Release
Upload the `.aab` to **Internal testing** first, install it on your own phone, and check log in, selling and offline mode.
Then promote it to **Production**. Google's review usually takes from a few days to a week for a new account.
