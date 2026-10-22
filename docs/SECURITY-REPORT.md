# Iris store — security and quality report (pre-launch)

Branch `claude/iris-finalize-deploy-cecdee` (based on `claude/app-refinement-security-b6b04f` @ `3e18407`), tested 2026-10-22.

## 1. How it was tested

| Layer | Tooling | Result |
| --- | --- | --- |
| Types, icons, dead CSS | `npm run check` | clean |
| API contract, in-process (shared TypeScript core used by Netlify/dev) | `node scripts/qa/api-contract.mjs` | **126 passed, 0 failed** |
| API contract over HTTP, PHP 8.5.11 built-in server | `… <base> owner <password>` | **104 passed, 0 failed** |
| API contract over HTTP, **real Apache 2.4.69 + PHP 8.3.36** (Docker, `.htaccess` active) | same | **104 passed, 0 failed** |
| Customer purchase, desktop and mobile (Chrome) | `flow-purchase.mjs` | all checks passed (both servers) |
| Owner adds category/product → customer orders → owner confirms → customer tracks | `flow-owner-store.mjs` | **26 passed** (both servers) |
| Branding, staff permissions, Instagram import (fake feed), reset | `flow-admin-features.mjs` (dev server) | **28 passed** |
| Every public and admin page: no console error, CSP violation or failed request; mock routes are 404 | `sweep-routes.mjs` | all routes clean (both servers) |
| SEO: titles, canonical, structured data per product, sitemap, robots, 404s, server/browser parity, private pages `noindex` | `seo-check.mjs` | **153 passed** configured / **135 passed** unconfigured (both servers) |
| Photo scanner served by the shop itself under production CSP, no external requests | `vendor-scan-check.mjs` | **6 passed** (three consecutive runs) |
| Passive + active security scan | `security-scan.mjs --owner …` | **97 passed, 0 failed** (both servers) |
| Dependencies | `npm audit --omit=dev` | 0 vulnerabilities |
| Secrets | `git grep` and `git log -G` over the tree and history | none (only test fixtures in `scripts/qa`) |
| PHP syntax | `php -l` on every PHP file | clean (PHP 8.5); 7.3+-only syntax avoided in new code (reviewed, not executed on 7.x) |

The security scan covers: 47 sensitive paths (config, data, backups, `.git`, `.env`, uploads scripts…), CSP/XFO/nosniff/Referrer/Permissions/COOP headers on three page types, CORS and preflight from a foreign origin, CSRF header and `Origin` checks, error leakage, HTTP methods, default credentials (`owner/demo1234`, `owner/CHANGE-ME`, `admin/admin`), secrets in the shipped JavaScript, hostile paths (script injection, CRLF, foreign `Host`, very long path), TLS and HTTP→HTTPS (when the address is https), login cookie flags and logout invalidation, user enumeration, **stored XSS** through product name/summary/specs, category title/description and order name/address/notes (checked in raw HTML, JSON-LD, `<noscript>`, `sitemap.xml`, and rendered in the storefront and the admin in Chrome), and uploads (PHP, GIF/PHP polyglot, SVG, HTML renamed to `.png`, no login).

## 2. Findings and fixes

Severity: **High** blocks launch, **Medium** fix before launch, **Low** documented.

| ID | Sev. | Finding | Status |
| --- | --- | --- | --- |
| F-01 | High | The CSP hash of the boot script was computed on text with Windows line endings (CRLF) while browsers hash it with LF. On a Windows-built package the boot script was **blocked on every page** (CSP violation in the console; saved logo and fonts flashed the defaults). | Fixed: `csp.mjs` normalises line endings before hashing; `package.mjs` writes LF in every text file; `.gitattributes` forces LF. Regression: `sweep-routes.mjs`. |
| F-02 | Medium | About 30 unlinked **design mock-ups** were publicly reachable in production, including a fake «advisor online now» chat with a placeholder Saudi phone number, a returns form that sends nothing, and fake-data admin pages (one, `/admin/stock-count`, outside the login guard). They contradict the honest-copy rule. | Fixed: they exist only in development (`src/routes.mockups.tsx`) and answer with the 404 page in production. |
| F-03 | Medium | The server accepted `payment: card` or `zaincash` in an order although only cash on delivery exists, so a crafted request could create an order that looks pre-paid. | Fixed in PHP and the TypeScript core; contract test added. |
| F-04 | Medium | `robots.txt` blocked `/api/`, which Googlebot needs to load the catalog and render pages; there was no sitemap, no per-page title/description/canonical, relative `og:image`, no structured data. | Fixed: server-generated robots/sitemap, per-page metadata written both by the server and by the app, absolute Open Graph images, Product/Breadcrumb/Organization JSON-LD, real 404 for hidden/unknown items. |
| F-05 | Medium | On Apache the `X-Robots-Tag: noindex` header for private pages (`/cart`, `/admin`…) was never sent: the internal rewrite renames the environment variable with a `REDIRECT_` prefix. Found only by testing on real Apache. | Fixed in `.htaccess`; asserted by `seo-check.mjs`. |
| F-06 | Low | Runtime dependency on third-party origins (jsDelivr and Google Storage) for the photo scanner, reflected in the CSP. | Fixed: MediaPipe 0.10.35 and both models are served from `/vendor/mediapipe` (hashes in `SHA256SUMS`); CSP has no external script origin. |
| F-07 | Low | Rate limits key on `REMOTE_ADDR`; behind Cloudflare or a CDN every visitor shares one address (global lock-outs, «too many orders»). | Mitigated: optional `trusted_ip_header`; `?r=health` reports `clientIp`; documented. |
| F-08 | Low | Order e-mails were sent from the request's `Host`. | Fixed: from `no-reply@<site_url host>` when configured. |
| F-09 | Low | HTTPS redirect would loop behind a proxy that terminates TLS. | Fixed: extra `X-Forwarded-Proto` condition (tested on Apache). |
| F-10 | Info | Under Apache, API responses carry both PHP's and `.htaccess`'s security headers (identical values; `DENY, DENY`). Under mod_php a login sends two `Set-Cookie` (old then regenerated session id); browsers keep the last. | Accepted; QA clients follow browser semantics. |
| F-11 | Low | Coupon codes are part of the public catalog (the cart validates them in the browser). | Accepted; the admin screen now says so. |
| F-12 | Info | `package.json` still described a jewelry house; the repo mixed CRLF and LF. | Fixed. |

## 3. Residual risks (accepted, with mitigation)

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-01 | Hidden (draft) products and categories are visible through `GET catalog`. Filtering them server-side would delete drafts if an owner saved a catalog loaded before login. | Documented; do not store secrets in drafts. Candidate follow-up: reload the catalog after login, then filter. |
| R-02 | Admin login is password-only. | 8 failed attempts per address and 20 per account lock for 15 minutes; common passwords rejected; the owner's e-mail and host account need 2FA. A TOTP step would be a feature, not a fix. |
| R-03 | Shared mobile networks can put many customers behind one address; the limit is 12 orders per hour per address and 3 open orders per phone. | Adequate for this shop; adjust in `index.php` if it ever bites. |
| R-04 | Orders and customer phone numbers are plain files (`api/data/orders.php`), protected by `.htaccess`, a PHP guard line and `Require all denied`. | Strong host-account password + 2FA; private backups. |
| R-05 | `mail()` deliverability depends on the host. | Orders are always in the admin list; consider SMTP later. |
| R-06 | `style-src 'unsafe-inline'` (React inline styles). | Scripts are locked (no `unsafe-inline`/`unsafe-eval`; boot script by hash). |
| R-07 | Tested at runtime on PHP 8.5 and 8.3, Apache 2.4. Not executed on PHP 7.x or LiteSpeed. | Choose PHP ≥ 7.4 (8.1+ preferred); after deployment run the live-safe scripts on the real host. |
| R-08 | TLS checks run only against an https address. | Run `security-scan.mjs https://<domain>` after SSL is on (runbook §6). |
| R-09 | Development-only npm advisories exist (not shipped). | Not in the deployed package. |

## 4. Re-running

On the developer machine (Chrome installed; set `CHROME_PATH` otherwise): see the table in [`DEPLOYMENT-RUNBOOK.md`](DEPLOYMENT-RUNBOOK.md) §2 for which scripts are safe on the live shop. The staging-only active scan:

```bash
node scripts/qa/security-scan.mjs https://staging.example --owner owner:PASSWORD
```
