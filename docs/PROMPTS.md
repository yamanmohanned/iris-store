# Prompts for Claude — launching and running the Iris store

How to use: pick the stage, replace the `<PLACEHOLDERS>`, paste the prompt into Claude Code (repository open) or into the browser assistant, as noted. Every prompt already tells Claude the safety rules; do not remove them.

Golden rules that every prompt repeats:

1. **Claude never receives or types the owner's passwords, 2FA codes, card numbers or recovery codes.** The owner types them at their own screen.
2. **Nothing is bought, accepted (terms), published or deleted by Claude.** It tells you where to click; the owner clicks.
3. **Scripts that change data (`api-contract`, `flow-*`, `--owner` scans) run on a local or staging copy only, never on the live shop.**
4. The shop must not depend on any account of the developer.

Related: [`DEPLOYMENT-RUNBOOK.md`](DEPLOYMENT-RUNBOOK.md) · [`SECURITY-REPORT.md`](SECURITY-REPORT.md) · [`HANDOVER-AR.md`](HANDOVER-AR.md)

---

## P0 — Session primer (paste first in any new Claude Code session on this repo)

```text
You are working on "آيريس ستور" (Iris store): an Arabic RTL accessories shop for Baghdad, Iraq (Instagram @iris_st0re1), cash on delivery only. Read docs/DEPLOYMENT-RUNBOOK.md and docs/SECURITY-REPORT.md first.

Facts and rules you must respect:
- Stack: Vite + React 19 + TypeScript + react-router + Tailwind. Production target is shared PHP hosting (Apache/LiteSpeed): `npm run package` builds release/iris-store-hosting.zip. Netlify is a noindex preview only.
- The server has THREE implementations of one API contract: PHP (server/api), the shared TypeScript core (server/core, used by Netlify and the dev server) and the browser demo (src/lib/demoApi.ts). Any API change must be made in all three and covered by scripts/qa/api-contract.mjs.
- Copy must stay honest to the accessories positioning (plated/stainless pieces, 6,000–12,000 IQD): no gold/hallmark/certificate/velvet-box/handmade claims, no fake "online advisor", no invented policies.
- New mobile screens go through the MobilePage shell. Mock design screens live only in src/routes.mockups.tsx (development).
- Inline scripts or external origins must be added to scripts/deploy/csp.mjs; there are currently no external script origins.
- The SEO metadata exists twice and must stay equal: src/lib/seo.ts (browser) and server/api/inc/seo.php (server); scripts/qa/seo-check.mjs proves parity.
- Edit files with the Edit tool (working files may be CRLF on Windows); do not commit unless I ask.
- Never ask me for, store or print passwords, tokens or card data.

Reply with a 5-line summary of what you understood and what you will check first.
```

---

## P1 — Pre-launch verification on a staging copy (Claude Code)

When: before every launch or major update. Needs: a built package running on PHP locally or on a staging address, and the owner password **of that staging copy only**.

```text
Run the full pre-launch verification on the STAGING copy at <STAGING_URL> (never on the live shop <LIVE_URL>). The staging owner password is in my environment variable IRIS_STAGING_PW; do not print it.

1. `npm ci`, `npm run check`, `npm audit --omit=dev`, `node scripts/qa/api-contract.mjs` (in-process).
2. Build with `npm run package` (no IRIS_SITE_URL), serve release/hosting with PHP, then run against the staging URL, clearing api/data between suites if rate limits trip: api-contract over HTTP, flow-purchase, flow-owner-store, sweep-routes (with password), seo-check, vendor-scan-check, security-scan --owner.
3. If anything fails: find the root cause, fix it in the code (all three server implementations where relevant), add a regression check, and re-run everything. Report each fix.
4. Finish with a table: suite → passed/failed counts → what changed. Say explicitly what you could NOT test (for example PHP 7.x, LiteSpeed, TLS).
Do not commit.
```

---

## P2 — Build the final package for the real domain (Claude Code)

```text
Build the production package for the real domain.
- Domain (exact address customers type, https, no trailing slash): <https://DOMAIN>
- Do NOT put the owner password in the package; the owner will type it in api/config.php on the host.
Run `IRIS_SITE_URL=<https://DOMAIN> npm run package` (PowerShell: set $env:IRIS_SITE_URL first). Then verify the output: api/config.php has site_url set and still admin_password = CHANGE-ME; .htaccess has the HTTPS redirect lines active; index.html has no noindex; the zip contains .htaccess, api/.htaccess, api/data/.htaccess, uploads/.htaccess, api/.user.ini, vendor/mediapipe; the zip contains no api/data runtime files, no .env, no source maps with secrets.
Report the zip path, size, and the exact steps the owner follows to upload it (File Manager, hidden files visible, Extract, delete zip), in Arabic and English. Remind that HTTPS redirect must only go live after SSL works.
```

---

## P3 — Click-by-click helper while the owner buys the domain and hosting (browser assistant or screen-sharing chat)

Use the built-in browser pane or Claude in Chrome **on the owner's machine/session only if the owner is present and signed in themselves**; otherwise paste screenshots into a chat.

```text
I am helping the shop owner create their own accounts for "Iris store". You are a guide. Hard rules:
- Never type, read aloud, store or ask for passwords, 2FA codes, card numbers, recovery codes or ID numbers. When a page needs them, say "Owner: please type this yourself", wait, and continue after they confirm.
- Never click Buy/Pay/Confirm/Accept terms/Create account/Submit. Tell the owner exactly which button to press and what it will do.
- Everything must be registered to the OWNER's email and phone. If a screen asks for the developer's details, stop and say so.
Current step: <e.g. "register the domain irisstore.com at Namecheap" / "buy the hosting plan" / "turn on AutoSSL" / "add the Google TXT record">.
Look at the current page (text only if possible), tell me in short numbered steps what to click, and what the page should look like when done. Flag: auto-renew on, WHOIS privacy on, registrar lock on, 2-step verification on, renewal price/date (write them down for the handover sheet), PHP version (8.1+), SSL status. If the screen differs from your expectation, say so instead of guessing.
```

---

## P4 — Live verification after deployment (Claude Code, read-only)

```text
The shop is live at <https://DOMAIN>. Verify it WITHOUT changing anything (no orders, no logins, no uploads, no `--owner`, no api-contract, no flow-* scripts).
Run: `node scripts/qa/security-scan.mjs <https://DOMAIN>`, `node scripts/qa/seo-check.mjs <https://DOMAIN> <https://DOMAIN>`, `node scripts/qa/sweep-routes.mjs <https://DOMAIN>`, `node scripts/qa/vendor-scan-check.mjs <https://DOMAIN>`.
Also check with curl: `https://DOMAIN/api/index.php?r=health` (ok, writable, uploads, passwordSet, siteUrl equals the domain; it must NOT show the PHP version) and that POSTs with Content-Type application/x-www-form-urlencoded or multipart to `/` and to `/api/index.php?r=orders` are refused with 403, http→https redirect, www→domain redirect, robots.txt (Sitemap line, no `Disallow: /`), sitemap.xml (products only visible ones), response headers on `/` (CSP, HSTS, nosniff, XFO, no X-Powered-By), certificate validity days, `/cart` has X-Robots-Tag noindex.
Report PASS/FAIL per item with the evidence, rank any failure High/Medium/Low, and give the exact fix (file and line on the host, or setting in the host panel). Do not fix by editing the live site.
```

---

## P5 — Google Search Console helper (browser assistant, owner signed in)

```text
Guide the shop owner through Google Search Console for <https://DOMAIN>. The owner is signed in with the shop's own Google account; never ask for their password or 2FA code and never click Verify/Submit/Request for them.
Steps to guide: add a Domain property → show the TXT record text to copy → where to paste it in the DNS panel (registrar or host: ask which one manages DNS) → press Verify (owner) → Sitemaps: submit "sitemap.xml" → URL Inspection for the home page and one product page → "Test live URL" → "Request indexing" (owner presses).
After each step tell the owner what the page should show. If Search Console reports "Blocked by robots.txt", "noindex" or "Page with redirect", explain the cause (site_url empty/wrong in api/config.php, wrong www/non-www, http vs https) and the exact fix. Finally list what to check again in 3 days and in 2 weeks, and remind that ranking is not guaranteed.
```

---

## P6 — Independence audit and handover (Claude Code + owner)

```text
Run an independence audit for "Iris store" and produce the signed handover checklist.
1. In the repo: list every external dependency at run time (scripts, fonts, CDNs, APIs, accounts) by grepping src/, server/, scripts/deploy, public/ and the built dist/. Expected result: none except the owner's optional Instagram token. Report anything else.
2. Confirm that no file contains the developer's accounts, e-mail, tokens, repository URLs or Netlify site names that the shop would depend on (NETLIFY.md mentions are documentation).
3. Produce docs/HANDOVER-AR.md filled with the facts I give you: domain <…>, registrar <…>, host <…>, renewal dates <…>, owner e-mail <…> (no passwords!), backup routine <…>.
4. List the manual checks I must do WITH the owner: each account's owner/2FA/recovery/billing, developer removed everywhere, repository handed over or zip delivered, Netlify trial deleted, one backup downloaded and opened.
Output a checklist with ☐/☑ and who verifies each item.
```

---

## P7 — Making changes later (Claude Code)

```text
<DESCRIBE THE CHANGE, e.g. "add a new category Bracelets with 3 products" / "change the delivery fee text" / "new page: Wholesale">.
First read docs/DEPLOYMENT-RUNBOOK.md §10 and docs/PROMPTS.md P0 rules. Rules: honest copy only; if you change the API change PHP, the TS core and demoApi together and extend scripts/qa/api-contract.mjs; run `npm run check` and the staging suites of P1; keep src/lib/seo.ts and server/api/inc/seo.php equal (seo-check proves it); do not touch api/data, uploads or api/config.php in packaging.
Tell me before you run anything that writes to the live site. End with the exact upload steps for the owner (which files to replace, which never to overwrite).
```

(Content edits — products, prices, photos, branding — are done by the owner in `/admin`; no developer is needed.)

---

## P8 — Incident: the live site shows an error (Claude Code, read-only first)

```text
The live shop <https://DOMAIN> shows: <SYMPTOM / error text / what the owner sees>. Diagnose without changing the live site.
Check in order: `curl -sI` the home page and a product page; `?r=health` JSON; whether `.htaccess`, `api/`, `index.html` exist (ask the owner to list public_html in File Manager); PHP version changed by the host recently; disk quota full (`writable:false`); SSL expired; `site_url`/robots/noindex; recent edits to `.htaccess` or `config.php`; Cloudflare "Flexible" SSL redirect loop; rate-limit lock-outs.
Give me: most likely cause, evidence, the smallest safe fix the owner can do in File Manager, how to roll back, and how to confirm it worked. Ask the owner to download a backup of api/data and uploads before any change.
```

---

## P9 — Move to another host (Claude Code + owner)

```text
Plan and verify a move of the Iris store from <OLD HOST> to <NEW HOST> with no data loss and under 30 minutes of downtime.
Steps to produce for the owner: download public_html completely (including hidden files) as a backup and keep it; create the new hosting account in the owner's name; choose PHP 8.1+; upload the same files (or the latest package, preserving api/data, uploads and api/config.php from the backup); set permissions; test via the temporary URL (`?r=health`, an admin login, one product page); switch DNS; wait for SSL; verify with scripts/qa/security-scan.mjs and seo-check.mjs; keep the old host for 7 days; then cancel it. Include how to avoid losing Google ranking (same URLs, same domain, keep `site_url`).
```

---

## P10 — Is the host's PHP fixed against PHP2Shell? (Claude Code + owner at the panel)

```text
Check whether the hosting account for <https://DOMAIN> is protected against PHP2Shell (CVE-2026-109618 and CVE-2026-109619, critical flaws in PHP itself; fixed in 8.2.35, 8.3.36, 8.4.27, 8.5.12 and newer). Read docs/SECURITY-REPORT.md §4 first and re-check the facts at php.net before answering, since this advisory is recent.
1. Tell the owner where to read the PHP version and handler in the host panel (MultiPHP Manager / PHP Selector / hPanel), and whether the red PHP2Shell notice shows on the admin home page after the owner signs in (the owner types the password).
2. If the version is older than the fixed release for its branch, or is 8.1 or older: draft the support ticket (English plus Arabic) asking for the fix or a written backport confirmation, and say what to do if the answer is no (move host, runbook §10).
3. List the host-level settings from the advisory the owner can ask support to apply meanwhile (session.upload_progress.enabled=0, fatal_error_backtraces=0 on 8.5, smaller post_max_size), and state clearly that they do not make the installation safe.
4. After the host answers, verify: owner signs in, no red notice; run node scripts/qa/security-scan.mjs <https://DOMAIN> (passive). Never run --owner scans on the live shop.
Never ask for passwords or codes.
```

---

## P11 — Explain a step to the owner in Arabic

```text
اشرح للمالكة/للمالك بالعربية البسيطة (بلا مصطلحات تقنية) الخطوة التالية: <الخطوة>. استخدم جملاً قصيرة وأرقاماً للخطوات، وأخبرني ماذا يجب أن تراه على الشاشة بعد كل خطوة. لا تطلب مني ولا من المالك كلمات مرور أو رموز تحقق في هذه المحادثة؛ المالك يكتبها بنفسه في موقع الخدمة. إن كانت الخطوة تتضمن دفعاً أو قبول شروط فاذكر ذلك وحدّد أن المالك هو من يضغط الزر.
```
