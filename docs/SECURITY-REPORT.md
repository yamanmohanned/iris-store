# Iris store — security and quality report (pre-launch)

Branch `claude/iris-finalize-deploy-cecdee` (based on `claude/app-refinement-security-b6b04f` @ `3e18407`). First pass 2026-10-22; PHP2Shell follow-up the same day (section 4).

## 1. How it was tested

Final results were produced on **real Apache 2.4.69 + mod_php 8.3.36** (Docker `php:8.3-apache`, `.htaccess` active) and on the Node dev server / shared TypeScript core. PHP 8.3.36 contains the PHP2Shell fix; the portable PHP 8.5.11 used for the first pass does **not** (8.5.12 is the fixed release), so it is no longer used to serve anything and only runs `php -l`.

| Layer | Tooling | Result |
| --- | --- | --- |
| Types, icons, dead CSS | `npm run check` | clean |
| API contract, in-process (shared TypeScript core used by Netlify/dev) | `node scripts/qa/api-contract.mjs` | **129 passed, 0 failed** |
| API contract over HTTP, real Apache + PHP 8.3.36 | `… <base> owner <password>` | **107 passed, 0 failed** |
| Customer purchase, desktop and mobile (Chrome) | `flow-purchase.mjs` | all checks passed |
| Owner adds category/product → customer orders → owner confirms → customer tracks | `flow-owner-store.mjs` | **26 passed** |
| Branding, staff permissions, Instagram import (fake feed), reset | `flow-admin-features.mjs` (dev server) | **28 passed** |
| Every public and admin page: no console error, CSP violation or failed request; mock routes are 404 | `sweep-routes.mjs` | all routes clean |
| SEO: titles, canonical, structured data, sitemap, robots, 404s, server/browser parity, private pages `noindex` | `seo-check.mjs` | **153 passed** configured / **135 passed** unconfigured |
| Photo scanner served by the shop itself under production CSP, no external requests | `vendor-scan-check.mjs` | **6 passed** |
| Passive + active security scan (including the PHP2Shell checks of section 4) | `security-scan.mjs --owner …` | **108 passed, 0 failed** |
| Dependencies | `npm audit --omit=dev` | 0 vulnerabilities |
| Secrets | `git grep` and `git log -G` over the tree and history | none (only test fixtures in `scripts/qa`) |
| PHP code audit | grep for `eval`, `unserialize`, `exec`/`system`/`proc_open`, `extract`, dynamic `include`, `call_user_func` with user input | none; the single `call_user_func` dispatches a fixed route table |
| PHP syntax | `php -l` on every PHP file | clean; 7.3+-only syntax avoided in new code (reviewed, not executed on 7.x) |

The security scan covers: 47 sensitive paths (config, data, backups, `.git`, `.env`, uploads scripts…), CSP/XFO/nosniff/Referrer/Permissions/COOP headers on three page types, CORS and preflight from a foreign origin, CSRF header and `Origin` checks, error leakage, HTTP methods, default credentials, secrets in the shipped JavaScript, hostile paths (script injection, CRLF, foreign `Host`, very long path), TLS and HTTP→HTTPS (when the address is https), login cookie flags and logout invalidation, user enumeration, **stored XSS** through product, category and order fields (raw HTML, JSON-LD, `<noscript>`, `sitemap.xml`, and rendered in the storefront and the admin in Chrome), malicious uploads, and the request-type gate and body limits that narrow what reaches the PHP engine.

## 2. Findings and fixes

Severity: **High** blocks launch, **Medium** fix before launch, **Low** documented.

| ID | Sev. | Finding | Status |
| --- | --- | --- | --- |
| F-01 | High | The CSP hash of the boot script was computed on text with Windows line endings (CRLF) while browsers hash it with LF. On a Windows-built package the boot script was **blocked on every page**. | Fixed: `csp.mjs` normalises line endings before hashing; `package.mjs` writes LF in every text file; `.gitattributes` forces LF. Regression: `sweep-routes.mjs`. |
| F-02 | Medium | About 30 unlinked **design mock-ups** were publicly reachable in production, including a fake «advisor online now» chat with a placeholder Saudi phone number, a returns form that sends nothing, and fake-data admin pages (one outside the login guard). | Fixed: development-only (`src/routes.mockups.tsx`); 404 in production. |
| F-03 | Medium | The server accepted `payment: card` or `zaincash` although only cash on delivery exists, so a crafted request could create an order that looks pre-paid. | Fixed in PHP and the TypeScript core; contract test added. |
| F-04 | Medium | `robots.txt` blocked `/api/`, which Googlebot needs to render pages; no sitemap, no per-page metadata, relative `og:image`, no structured data. | Fixed: server-generated robots/sitemap, per-page metadata (server and app), absolute Open Graph images, JSON-LD, real 404s. |
| F-05 | Medium | On Apache the `X-Robots-Tag: noindex` header for private pages was never sent (the internal rewrite renames the variable with a `REDIRECT_` prefix). Found only on real Apache. | Fixed in `.htaccess`; asserted by `seo-check.mjs`. |
| F-06 | Low | Runtime dependency on jsDelivr and Google Storage for the photo scanner. | Fixed: MediaPipe 0.10.35 and both models are self-hosted (`SHA256SUMS`); CSP has no external script origin. |
| F-07 | Low | Rate limits key on `REMOTE_ADDR`; behind Cloudflare or a CDN every visitor shares one address. | Mitigated: optional `trusted_ip_header`; `?r=health` reports `clientIp`. |
| F-08 | Low | Order e-mails were sent from the request's `Host`. | Fixed: from `no-reply@<site_url host>` when configured. |
| F-09 | Low | HTTPS redirect would loop behind a proxy that terminates TLS. | Fixed: `X-Forwarded-Proto` condition (tested on Apache). |
| F-10 | Info | Under Apache, API responses carry both PHP's and `.htaccess`'s security headers (identical values); mod_php sends two `Set-Cookie` on login (browsers keep the last). | Accepted; QA clients follow browser semantics. |
| F-11 | Low | Coupon codes are part of the public catalog (the cart validates them in the browser). | Accepted; the admin screen now says so. |
| F-12 | Info | `package.json` still described a jewelry house; the repo mixed CRLF and LF. | Fixed. |
| F-13 | **High** | **PHP2Shell** (CVE-2026-109618, CVE-2026-109619): two critical flaws in the PHP engine itself. Not in this code; the fix is the host's PHP update. | **Open until the host runs a fixed PHP.** App now detects an unfixed runtime and warns the owner; see section 4. |
| F-14 | Medium | Every URL accepted any POST body type, so PHP's multipart and urlencoded parsers were reachable by anyone on any path. | Mitigated: Apache rejects urlencoded POSTs everywhere and multipart POSTs everywhere except `/api/index.php?r=upload` carrying a session cookie, before PHP starts. |
| F-15 | Medium | Public routes (login, order, tracking) accepted 4 MB JSON bodies of any nesting. | Fixed: 64 KB cap on those three routes, JSON depth 32 (PHP and TS core; contract tests). |
| F-16 | Low | `?r=health` disclosed the exact PHP version to everyone. | Fixed: version and patch status are visible only to the signed-in owner. |
| F-17 | Low | `session.upload_progress` (on by default) is one of the two PHP2Shell paths and the shop never uses it. | Mitigated: disabled in `.htaccess` for mod_php (verified), and best-effort in `.user.ini`; hosts on PHP-FPM/LiteSpeed set it in `php.ini`. |
| F-18 | Low | `post_max_size` 70M / `upload_max_filesize` 64M were far above the 40 MB video limit. | Lowered to 48M / 42M. |

## 3. Residual risks (accepted, with mitigation)

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-01 | Hidden (draft) products and categories are visible through `GET catalog`. Filtering them server-side would delete drafts if an owner saved a catalog loaded before login. | Documented; do not store secrets in drafts. Follow-up: reload the catalog after login, then filter. |
| R-02 | Admin login is password-only. | 8 failed attempts per address and 20 per account lock for 15 minutes; common passwords rejected; owner e-mail and host account need 2FA. |
| R-03 | Shared mobile networks can put many customers behind one address; the limit is 12 orders per hour per address and 3 open orders per phone. | Adequate for this shop. |
| R-04 | Orders and phone numbers are plain files (`api/data/orders.php`), protected by `.htaccess`, a PHP guard line and `Require all denied`. | Strong host-account password + 2FA; private backups. |
| R-05 | `mail()` deliverability depends on the host. | Orders are always in the admin list. |
| R-06 | `style-src 'unsafe-inline'` (React inline styles). | Scripts are locked (no `unsafe-inline`/`unsafe-eval`; boot script by hash). |
| R-07 | Runtime-tested on Apache 2.4 with PHP 8.3.36 (and, before the follow-up, PHP 8.5.11). Not executed on PHP 7.x or LiteSpeed. | PHP ≥ 8.2.35 / 8.3.36 / 8.4.27 / 8.5.12; run the live-safe scripts on the real host. |
| R-08 | TLS checks run only against an https address. | Run `security-scan.mjs https://<domain>` once SSL is on. |
| R-09 | Development-only npm advisories exist (not shipped). | Not in the deployed package. |
| R-10 | The request-type gate is defence in depth, not authentication: a client can fake a session cookie string to pass it. | The vulnerable code is the engine; only an updated PHP removes the risk. |

## 4. PHP2Shell — CVE-2026-109618 and CVE-2026-109619

### What was reported
You asked about two PHP vulnerabilities found with "GPT Sol". Checked against the sources below: the report is real.

- PHP's own advisory (php.net, 21 Oct 2026): two **critical (CVSS v4.0 9.2)** flaws that "can allow unauthenticated remote code execution" in **PHP itself**, affecting PHP-FPM, Apache mod_php, php-cgi, FrankenPHP and LiteSpeed; **mod_php is the worst case** (an exploit can run before any application code). Fixed in **8.5.12, 8.4.27, 8.3.36, 8.2.35** (and 8.6.0 RC4). PHP 8.1 and older no longer get upstream updates (minimal source backports exist for 7.4, 8.0 and 8.1; distributions backport on their own).
  - CVE-2026-109618 ([GHSA-w8hw-w9fx-j79w](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w)): out-of-memory handling can interrupt PHP while request data is only partly initialised, and request cleanup then trusts it.
  - CVE-2026-109619 ([GHSA-6wmf-4rv5-p3rp](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)): request-owned state survives after its memory is freed and a later request on the same worker uses it. Confirmed paths: the session upload-progress feature (mod_php and PHP-FPM) and, on PHP 8.5, fatal-error backtraces.
- Qualys, Patchstack and press coverage (Tom's Hardware, Fortune) attribute the discovery to teams using AI (Calif with OpenAI's GPT-5.6 Sol; Wiz with several tools).
- **Exploitation:** Cloudflare says it saw early attack traffic and shipped default WAF rules (stopgap, free plans included). Reports of *successful* compromises of Cloudflare-proxied sites are **not confirmed** in the sources I could read, and sources disagree on whether exploitation in the wild has been shown. Treat it as urgent either way.

Sources: [php.net advisory](https://www.php.net/), [php.net ChangeLog 8.x](https://www.php.net/ChangeLog-8.php), [Qualys](https://blog.qualys.com/vulnerabilities-threat-research/2026/10/20/php-announces-critical-security-release-for-two-vulnerabilities), [Patchstack](https://patchstack.com/articles/php-major-vulnerability-alert-10-2026/), [Cybersecurity News on Cloudflare](https://cybersecuritynews.com/php-early-exploitation-attempts/), [Tom's Hardware](https://www.tomshardware.com/tech-industry/cyber-security/openai-says-gpt-5-6-sol-helped-uncover-critical-php-flaws-that-could-affect-70-percent-of-websites-ai-assisted-researchers-turned-two-year-old-bug-that-stumped-human-developers-into-working-exploits-in-two-weeks).

### Is it in this codebase?
**No: the flaws are in the PHP engine, so no line of the shop's PHP or JavaScript contains them, and no edit to the shop can remove them.** Any PHP site is exposed while its host runs an unfixed PHP, this one included. PHP's advisory says updating is the only complete solution. The Netlify preview and the dev server run Node, not PHP, and are not affected.

The code audit found nothing that makes it worse: no `eval`, `unserialize`, shell execution, dynamic `include` or user-controlled file paths; the one `call_user_func` dispatches a fixed route table.

### What the code does about it
1. **Detects an unfixed runtime.** `iris_php_fix_status()` (`server/api/lib.php`) compares the running PHP with the fixed releases. The signed-in **owner** sees a red notice on the admin home page (with a ready-to-paste message for hosting support); `security-scan.mjs --owner` fails the same way. It is an estimate: some hosts patch without changing the version number, so the notice asks for a written confirmation.
2. **Narrows what reaches the PHP parser** (`server/hosting/.htaccess`): Apache refuses urlencoded POSTs everywhere, and multipart POSTs everywhere except `/api/index.php?r=upload` with a session cookie, before PHP starts (the shop only sends JSON and uploads files through that route). Verified on real Apache by the security scan. This shrinks exposure to one route; it does not fix the engine.
3. **Public routes accept only small bodies**: 64 KB for login, orders and tracking, JSON depth 32, in PHP and the TypeScript core.
4. **Disables session upload progress** for mod_php through `.htaccess` (verified: PHP's default is on; the shipped file turns it off) and best-effort through `.user.ini`.
5. **Stops advertising the PHP version**: `?r=health` no longer returns it.
6. Lowered `post_max_size` / `upload_max_filesize` to 48M / 42M (the real 40 MB video limit plus overhead).
7. Docs and host checklist now require a fixed PHP before launch.

### What must still happen (the real fix)
**The host must run a fixed PHP.** Check in the host panel and ask in writing. Ready message for the support ticket:

> Hello, please confirm that the PHP version serving my hosting account is 8.2.35, 8.3.36, 8.4.27, 8.5.12 or newer, or a vendor build that includes the fix for CVE-2026-109618 and CVE-2026-109619 ("PHP2Shell"), and restart the PHP workers. Please also tell me which PHP handler my account uses (mod_php, PHP-FPM, LiteSpeed). Please reply in writing. Thank you.

If the host cannot update: choose another host (do not launch on PHP 8.1 or older unless the provider confirms a backport). Host-level settings that PHP lists as partial mitigations (the host or server admin applies them; the shop does not set them because they trade availability for safety and `.user.ini` is not a reliable place): `session.upload_progress.enabled=0` in `php.ini` or the pool; on PHP 8.5 `fatal_error_backtraces=0`; lower `post_max_size` (8M without uploads, 32M with) and web-server limits on multipart parts and field counts; per-worker memory limits through cgroups, never `RLIMIT_AS`/`RLIMIT_DATA`. These "do not make an installation safe".

If the site is behind Cloudflare: its WAF rules are a stopgap that only helps when the origin accepts traffic from Cloudflare alone, and a block does not prove nothing reached the origin. Keep the origin patched; set the WAF to *block*, not *log*; set `trusted_ip_header` (runbook §8).

Signs of attack to look for (Patchstack): unusual multipart requests followed by memory-limit errors or repeated HTTP 500, oversized or malformed session cookies, unexplained PHP worker restarts. After a suspected compromise: update, rotate the owner and staff passwords and the Instagram token, and restore from a clean backup.

### Verification
- Owner signs in: no red notice on the admin home page.
- `node scripts/qa/security-scan.mjs https://<domain> --owner owner:<password>` on **staging** passes the section titled "PHP2Shell" (request-type gate, body limits, no version disclosure) and the "PHP … fix" check after login.
- The hosting panel shows a fixed PHP version.

### Local tooling note
The portable PHP 8.5.11 used earlier on the developer machine is a vulnerable build. It served only `127.0.0.1` for tests and is now stopped; replace it with 8.5.12 or delete it. The Docker image used for the final tests (`php:8.3-apache`) is 8.3.36.

## 5. Re-running

See [`DEPLOYMENT-RUNBOOK.md`](DEPLOYMENT-RUNBOOK.md) §2 for which scripts are safe on the live shop. The staging-only active scan:

```bash
node scripts/qa/security-scan.mjs https://staging.example --owner owner:PASSWORD
```
