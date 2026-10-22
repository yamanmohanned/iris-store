# Iris store — deployment runbook (owner-owned hosting)

Goal: put **آيريس ستور** on the internet at its own domain, findable on Google, running on accounts that belong to the **shop owner**, so nothing depends on the developer afterwards.

This runbook is for the developer who guides the owner. The owner-facing summary is [`HANDOVER-AR.md`](HANDOVER-AR.md); copy-paste prompts for Claude are in [`PROMPTS.md`](PROMPTS.md); test results are in [`SECURITY-REPORT.md`](SECURITY-REPORT.md). The Arabic day-to-day manual is [`../DEPLOY.md`](../DEPLOY.md).

---

## 0. The decision in one page

| Question | Recommendation | Why |
| --- | --- | --- |
| Where does it run? | **Shared hosting with PHP and Apache or LiteSpeed (cPanel or equivalent such as Hostinger's hPanel), bought by the owner** | It is the build this project was designed for. No database, no Node server, no monthly build. Data is plain files the owner can download. Any other PHP host can replace it in minutes. |
| Netlify? | **Trial/preview only** | The free plan is a pool of monthly credits (about 300; bandwidth costs roughly 20 credits/GB, so a few thousand visits can use it up), uploads are limited to ~5 MB through functions, and data lives in Netlify Blobs rather than in files the owner can see. Fine for showing a client; wrong for a shop that must "just run". |
| VPS / own server? | **No** | Someone must patch, secure and monitor it. That contradicts "independent of the developer". |
| Domain | **A `.com` registered in the owner's own registrar account** | `.iq` costs roughly USD 150–650 a year and needs company paperwork. A `.com` is cheap and works everywhere. |
| Who owns what | **Everything under the owner's email, phone (2FA) and payment method** | See §9. |

What the developer (and Claude) can and cannot do:

- **Cannot / should not:** create the owner's accounts, enter the owner's passwords, or pay. Do these with the owner at their own screen.
- **Can:** build the upload package, tell the owner exactly where to click, and verify the live site read-only.

---

## 1. Choosing the host (checklist for any provider)

Ask the provider (or read the plan page) and tick all of these **before paying**:

- [ ] **A PHP release that contains the PHP2Shell fix (CVE-2026-109618 / CVE-2026-109619, two critical remote-code-execution flaws in PHP itself, October 2026): 8.2.35, 8.3.36, 8.4.27, 8.5.12 or newer**, selectable in the panel, **or a written statement from the provider that their PHP 8.1-or-older build carries the backport**. Do not launch on an unfixed PHP; the fix cannot be made from inside the shop's code. Ask which PHP handler the account uses (mod_php is the most exposed). Details and a ready support message: [`SECURITY-REPORT.md`](SECURITY-REPORT.md) §4.
- [ ] Apache or LiteSpeed with `.htaccess` enabled (`AllowOverride All`) and the modules `mod_rewrite`, `mod_headers`, `mod_mime`; `mod_setenvif` recommended.
- [ ] Free SSL certificate (AutoSSL / Let's Encrypt) that renews itself.
- [ ] A file manager or FTP, and the ability to set folder permissions (755).
- [ ] At least 1 GB of disk (the package is about 30 MB; photos and videos grow).
- [ ] PHP `mail()` works (order notifications), PHP `curl` or `allow_url_fopen` (Instagram import), `upload_max_filesize` can be raised through `.user.ini` (videos).
- [ ] Automatic backups, or at least a backup button.
- [ ] Data-centre location. For customers in Iraq, a European or Gulf data centre is fine; ask whether the provider has one in Iraq and what the connectivity is like.

Payment is the practical constraint in Iraq:

| Owner can pay with | Pick | Notes |
| --- | --- | --- |
| International Visa/Mastercard or PayPal | A mainstream shared-hosting provider (for example Namecheap with cPanel, or Hostinger with hPanel). Compare current prices and renewal prices. | Cheapest and simplest. Renewal price is often higher than the first-year price; write it in the handover sheet. |
| Only local methods (ZainCash, Qi, bank, cash) | A local provider that accepts them. One lead from research: IQ-Hosting (Baghdad, cPanel); verify its payment options, PHP version and backups before buying. | Check the checklist above; some local plans are limited. |
| Not sure | Ask the owner to try paying the first small invoice themselves before anything is built around that provider. | Never pay with the developer's card. |

Optional later: Cloudflare (free) in front of the site. If used, set SSL mode to **Full (strict)**, and set `trusted_ip_header` in `api/config.php` (see §8) so the rate limits see real visitor addresses. Cloudflare's WAF rules for PHP2Shell are a stopgap: they only protect an origin that accepts traffic from Cloudflare alone, so the host's PHP must be fixed regardless.

---

## 2. Developer machine: verify before touching the host

From the project folder on the developer machine:

```bash
npm ci
```

```bash
npm run check
```

```bash
node scripts/qa/api-contract.mjs
```

The full pre-launch suite runs against a packaged copy served by PHP (local) or on a **staging** copy on the real host. These scripts create data and reset the store, so **never point them at the live shop**:

| Script | What it proves | Safe on the live shop? |
| --- | --- | --- |
| `node scripts/qa/api-contract.mjs <base> owner <password>` | Whole API contract: auth, permissions, orders, uploads, reset | **No** (resets the store) |
| `node scripts/qa/flow-purchase.mjs <base>` | Customer buys on desktop and mobile | **No** (places orders) |
| `node scripts/qa/flow-owner-store.mjs <base> <password>` | Owner adds category/product, customer orders, owner confirms | **No** |
| `node scripts/qa/sweep-routes.mjs <base> [password]` | Every page opens without console, CSP or network errors | Yes (reads pages; with a password it also opens admin pages) |
| `node scripts/qa/seo-check.mjs <base> [siteUrl]` | Titles, canonical, structured data, sitemap, robots, 404s, server/browser parity | Yes (reads only) |
| `node scripts/qa/vendor-scan-check.mjs <base>` | Photo-scanner files load from the shop itself under the real CSP | Yes |
| `node scripts/qa/security-scan.mjs <base>` | Exposed files, headers, CORS/CSRF, TLS, secrets in JavaScript | Yes (passive) |
| `node scripts/qa/security-scan.mjs <base> --owner owner:<password>` | + login cookies, stored-XSS, malicious uploads | **Staging only** (creates and removes a test product and order) |

Everything above passed on the build in this branch on real Apache 2.4 with PHP 8.3.36 (and the TypeScript core for the in-process contract); see [`SECURITY-REPORT.md`](SECURITY-REPORT.md) for numbers. Run the HTTP suites against a patched PHP only (8.2.35, 8.3.36, 8.4.27, 8.5.12 or newer).

Local Apache test (optional, needs Docker): mount `release/hosting` into `php:8.3-apache`, run `a2enmod rewrite headers setenvif`, set `AllowOverride All`, then run the scripts above against it. This is how the `.htaccess` rules were verified.

---

## 3. Stage 1 — owner prepares accounts (with the owner at their own screen)

1. **A dedicated email** for the shop (for example a new Gmail address owned by the owner). Everything below is registered to it.
2. **A password manager** (Google Password Manager, Bitwarden, or paper in a safe place) and **2-step verification on the owner's phone** for: the email, the registrar, the host, Google Search Console. The developer is never a second factor.
3. **Payment method** the owner controls.
4. Decide the **domain name** (short, Latin letters, easy to say on Instagram, for example `irisstore.com`; check availability at the registrar).

Write nothing secret in chat, email or this repository.

## 4. Stage 2 — buy the domain and hosting in the owner's name

1. **Domain**: register it at a registrar in the owner's account. Owner = registrant = billing contact = admin contact. Turn on **auto-renew**, **WHOIS privacy**, **registrar lock**, and 2FA. Keep the domain registrar account separate from the host if the owner can manage two logins; it makes changing host trivial. One account at one vendor is also acceptable if it is the owner's.
2. **Hosting plan**: buy it under the same email, with the owner's payment method. Turn on 2FA. Note the **renewal date and price** in the handover sheet.
3. In the host panel choose PHP 8.1 or newer for the domain (MultiPHP Manager / PHP Selector).
4. If the host gives a temporary URL (for example `https://server-12345.provider.com/~account/`), keep it for testing. The shop must be at the **root** of a domain or subdomain, not in a sub-folder.

## 5. Stage 3 — staging upload and first checks (before the real domain is live)

1. Build the package with **no domain** (so Google cannot index the temporary address):

   ```bash
   npm run package
   ```

   Output: `release/iris-store-hosting.zip`. If the owner wants the owner password already inside the package, run the command with `IRIS_ADMIN_USER` and `IRIS_ADMIN_PASSWORD` set in the shell; otherwise the owner types it in `config.php` (preferred: the developer never sees it).

2. In the host's **File Manager** (hidden files visible): open `public_html`, upload the zip, **Extract**, delete the zip. Check that `index.html`, `.htaccess`, `api/`, `assets/`, `uploads/`, `vendor/` sit directly in `public_html`.
3. Open `api/config.php` with the editor. **The owner** sets `admin_password` to a strong password (8+ characters, not common) and, optionally, `notify_email`. Leave `site_url` empty for now.
4. Folder permissions: `api/data` and `uploads` must be writable (755 on most hosts).
5. Open `https://<temporary-url>/api/index.php?r=health`. Expect `"ok":true`, `"writable":true`, `"uploads":true`, `"passwordSet":true`, and `"siteUrl":""`. (The PHP version is no longer shown here; the owner sees it after login, see the next steps.)
6. Open `https://<temporary-url>/robots.txt`. Expect `Disallow: /`: indexing is deliberately off until `site_url` is set.
7. Log in at `/admin`. **If a red notice about PHP2Shell appears on the home page, stop: ask the host to update PHP (the notice contains a ready message) before going further.** Then in **Settings** set WhatsApp, Instagram, delivery fee, branding. Decide the starting catalog: keep the starter products (5 visible, 2 drafts) or run **Settings → Reset → blank**.
8. Run the live-safe checks from the developer machine:

   ```bash
   node scripts/qa/security-scan.mjs https://<temporary-url>
   ```

   ```bash
   node scripts/qa/seo-check.mjs https://<temporary-url>
   ```

   ```bash
   node scripts/qa/sweep-routes.mjs https://<temporary-url>
   ```

9. Place one test order from a phone, confirm it in the admin, cancel it (the stock returns).

If anything fails, see §11.

## 6. Stage 4 — attach the real domain and turn indexing on

1. At the registrar/host, point the domain at the host (host nameservers, or an `A` record to the host's IP plus `www` as `CNAME` to the domain). Wait until `https://domain` opens the shop.
2. In the host panel issue/refresh the **SSL certificate** (AutoSSL) for the domain **and** `www`. Wait until the padlock shows without warnings.
3. Edit **two things** on the host (no rebuild needed):
   - `api/config.php`: set `'site_url' => 'https://irisstore.com'` (the exact address customers type, no trailing slash, no `www` unless that is your choice).
   - `.htaccess`: remove the leading `#` from the three lines under «تحويل كل الزيارات إلى HTTPS».

   Alternative: rebuild with `IRIS_SITE_URL=https://irisstore.com npm run package` (it also turns the HTTPS redirect on) and upload over the staging copy **without deleting** `api/data/`, `uploads/` or the owner's `api/config.php`.
4. Verify:

   ```bash
   node scripts/qa/security-scan.mjs https://irisstore.com
   ```

   ```bash
   node scripts/qa/seo-check.mjs https://irisstore.com https://irisstore.com
   ```

   ```bash
   node scripts/qa/sweep-routes.mjs https://irisstore.com
   ```

   Also check by hand:
   - `https://irisstore.com/api/index.php?r=health` shows `"siteUrl":"https://irisstore.com"`.
   - `http://irisstore.com` redirects to `https://`. `https://www.irisstore.com` redirects to the address in `site_url`.
   - `https://irisstore.com/robots.txt` lists the `Sitemap:` line; `https://irisstore.com/sitemap.xml` lists products.
   - Paste a product link in WhatsApp: it shows the product name, price text and photo.
   - [PageSpeed Insights](https://pagespeed.web.dev/) for the home page on mobile.

## 7. Stage 5 — Google

All with the **owner's** Google account.

1. [Google Search Console](https://search.google.com/search-console) → **Add property → Domain** → enter `irisstore.com`. Google gives a `TXT` record; add it in the DNS panel (registrar or host, wherever DNS is managed) and press **Verify**. (If DNS is awkward, use *URL prefix* and upload the small HTML file Google gives to `public_html`.)
2. **Sitemaps** → submit `sitemap.xml`. Expect status *Success* and the number of discovered pages (home, categories, visible products, static pages).
3. **URL Inspection** → paste the home page and one product page → *Test live URL* → *Request indexing*.
4. [Rich Results Test](https://search.google.com/test/rich-results) on one product page: expect *Product* and *Breadcrumb* detected, price in IQD.
5. Optional: [Bing Webmaster Tools](https://www.bing.com/webmasters) (import from Search Console); Google Business Profile if the shop has a service area or storefront; put the link in the Instagram bio and in post captions.
6. Expect discovery within days and branded searches («آيريس ستور») soon after; ranking for generic searches takes weeks to months and is not guaranteed. The `site:irisstore.com` search shows what Google already has.

If Search Console reports *Blocked by robots.txt* or *Excluded by noindex*, `site_url` is empty or wrong: fix `api/config.php`.

## 8. `api/config.php` reference (the only file the owner edits on the host)

| Key | Meaning |
| --- | --- |
| `admin_username`, `admin_password` | Owner login. After the first login the password is stored hashed and changed from **Settings → My account**. |
| `site_url` | The public address. **Empty = indexing off** (every page `noindex`, `robots.txt` blocks all). Set it when the domain and SSL work. |
| `notify_email` | Receives an email for each new order (PHP `mail()`; check the spam folder; mail sent from `no-reply@<your domain>`). |
| `trusted_ip_header` | Leave empty. Behind Cloudflare use `HTTP_CF_CONNECTING_IP`; check that `?r=health` shows a different `clientIp` from different phones. |

## 9. Stage 6 — independence checklist (sign it with the owner)

| Item | Owner holds it |
| --- | --- |
| Email address used for every account | ☐ password, ☐ recovery phone |
| Domain registrar account | ☐ login, ☐ 2FA, ☐ auto-renew on, ☐ renewal date |
| Hosting account (panel + billing) | ☐ login, ☐ 2FA, ☐ renewal date and price |
| Shop admin login (`/admin`) | ☐ owner password changed by the owner, ☐ staff accounts only for people the owner chose |
| Google Search Console | ☐ owner is *Owner*; the developer is not listed (or is removed) |
| Instagram connection (optional) | ☐ owner's own Meta developer app and token |
| Source code | ☐ zip of the repository handed over; ☐ GitHub repository transferred to, or copied into, an account the owner controls (or the zip is the only copy) |
| Deployable package | ☐ `release/iris-store-hosting.zip` and the build command stored with the owner |
| Backups | ☐ host backups on; ☐ owner downloaded `api/data` and `uploads` once |
| Third-party services at run time | ☐ none (fonts, photo scanner, scripts are all served from the shop itself) |
| Developer access | ☐ no panel logins, no SSH, no file-manager sessions, no GitHub/Netlify membership left behind |
| Netlify trial site | ☐ deleted (it is `noindex`, but it is a copy under the developer's account) |

The shop runs without any account of the developer's and without Claude: Claude is a development tool, not part of the running site.

## 10. Day-2 operations

- **Backups**: enable the host's automatic backups. In addition, once a month download `api/data/` and `uploads/` (zip in File Manager → Download). Orders and customer phone numbers are in `api/data/orders.php`: treat those downloads as private.
- **Updating the site**: build a new package, upload it over the old one. **Do not overwrite or delete** `api/data/`, `uploads/` and `api/config.php`.
- **Forgot the owner password**: delete `api/data/auth.php`; the password in `api/config.php` works again. Staff passwords are reset by the owner in the Staff page.
- **Moving to another host**: download `public_html` completely, upload it to the new host, set the PHP version, point the domain, issue SSL. No code or database to migrate.
- **Monitoring**: the owner can add a free uptime monitor (for example UptimeRobot) on the home page and on `/api/index.php?r=health`.
- **Renewals**: domain and hosting auto-renew on; calendar reminder one month before each.

## 11. When something is wrong

| Symptom | Cause and fix |
| --- | --- |
| Red PHP2Shell notice on the admin home page | The host's PHP lacks the fix for CVE-2026-109618/109619 (or is a backport the version number hides). Send the message in the notice or in [`SECURITY-REPORT.md`](SECURITY-REPORT.md) §4 and get a written answer; if the host cannot update, move. |
| 403 when uploading a photo or video | Something in front of the shop (proxy, WAF) strips the session cookie or changes the request type. The shop accepts multipart only on `/api/index.php?r=upload` with the session cookie; check Cloudflare/WAF rules. |
| 500 error on every page after editing `.htaccess` | Restore the uploaded `.htaccess`; a character was changed. Re-extract it from the zip. |
| Inner pages show the host's 404 | `.htaccess` missing (hidden files off in File Manager when uploading) or `mod_rewrite` disabled. |
| `?r=health` says `"writable":false` | Set `api/data` and `uploads` to 755 (or 775/777 if the host runs PHP as another user). |
| Google shows nothing after two weeks | `site_url` empty or wrong, `robots.txt` says `Disallow: /`, Search Console never verified, or the sitemap was not submitted. Use URL Inspection on the home page. |
| WhatsApp link preview has no photo | The preview is cached; add `?v=2` to the link, or use Facebook's Sharing Debugger to refresh. |
| Order emails never arrive | Check spam; confirm `notify_email`; the host may block `mail()`; use the order list in the admin as the source of truth. |
| «محاولات كثيرة خاطئة» | Login is locked for 15 minutes after repeated mistakes. |
| Everyone sees "too many orders" | The host/CDN shows one address for all visitors: set `trusted_ip_header` (§8). |
| Photo scanner in Instagram import fails | The browser is very old (no WebAssembly SIMD). Use a current Chrome, Edge, Safari or Firefox. |
| Infinite HTTPS redirect | A proxy terminates HTTPS (Cloudflare "Flexible"). Use SSL mode Full (strict). |

## 12. Known limits (details in the security report)

- Draft (hidden) products and coupon codes are readable through the public catalog API; do not treat hidden as secret.
- The admin login has rate limits but no second factor; choose a strong password and protect the owner's email.
- Data is stored in files under the owner's hosting account; the host's account security (2FA, backups) is the real safety net.
- Online payment is not implemented: the server accepts cash on delivery only.
