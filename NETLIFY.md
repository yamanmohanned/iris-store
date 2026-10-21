# Trial deployment on Netlify

A preview copy of the store for the client to try and give feedback on. The permanent store stays on cPanel/PHP (see `DEPLOY.md`).

**What the trial includes**

- The full storefront (desktop and mobile) and the owner admin at `/admin`.
- **Shared data across devices.** A Netlify Function (`netlify/functions/api.mts`) serves the same API as the PHP server and stores data in Netlify Blobs. Products the owner adds on a laptop show up on a phone, and orders placed on a phone show up in the admin.
- **Hidden from search engines.** Every page sends `noindex` (meta tag and `X-Robots-Tag` header).

Everything Netlify needs is already in the project: `netlify.toml`, `.env.netlify` and `npm run build:netlify`.

---

## Option A — Connect the GitHub repository (recommended)

Every push redeploys automatically, so the client always sees the latest version after each round of changes.

1. Push the project to GitHub (repository `yamanmohanned/iris-store`).
2. In Netlify, go to **Add new project → Import an existing project → GitHub** and pick the repository and branch.
3. Leave the build settings as Netlify detects them from `netlify.toml`:
   - Build command: `npm run build:netlify`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. **Set the owner password** under **Project configuration → Environment variables**:

   | Variable | Value |
   | --- | --- |
   | `IRIS_ADMIN_PASSWORD` | 8+ characters (recommended) |
   | `IRIS_ADMIN_USER` | optional, default `owner` |

   If you don't set it, the login is `owner` / `demo1234`, and the login page shows that hint to anyone who opens `/admin`.
5. Click **Deploy**. The store opens at `https://<project-name>.netlify.app` and the admin at `/admin`.

## Option B — Netlify CLI (no GitHub needed)

```bash
npx netlify-cli login
```

```bash
npx netlify-cli deploy --build --prod
```

The first run asks you to create or link a project. To set the password:

```bash
npx netlify-cli env:set IRIS_ADMIN_PASSWORD "your-strong-password"
```

Then run the deploy command again.

## Option C — Drag and drop (fastest, browser-only data)

```bash
npm run build:netlify
```

Drag `release/iris-store-netlify.zip` onto <https://app.netlify.com/drop>.

> Drag-and-drop deploys don't run Netlify Functions. The site still works, but it switches automatically to **browser-only data**: each visitor's products and orders stay in their own browser and aren't shared between devices. The admin login is `owner` / `demo1234`. This is fine for a quick look at the design. To test the owner workflow (add a product, order from a phone, confirm in the admin), use option A or B.

---

## Before sending the link to the client

1. Log in to `/admin`, then fill in **الإعدادات ← المتجر والتوصيل** (store settings): WhatsApp number, Instagram, delivery fee and free-delivery threshold. The contact buttons only appear once a WhatsApp number is set.
2. If you didn't set `IRIS_ADMIN_PASSWORD`, change the password from **الإعدادات ← حسابي**. The login hint then disappears.
3. Place one test order from a phone and confirm it in **الطلبات** (orders) to check the full flow.

## Good to know

- **Orders are real records in the trial.** Nobody is notified and nothing ships. You can mark test orders as cancelled from the admin, which returns their quantities to stock.
- **Starting over.** Use **الإعدادات ← إعادة الضبط** in the admin (owner password + typed confirmation): it clears orders, staff, uploads and the Instagram link, and returns either an empty store or the starter catalog in `src/data/seed.json`. Deleting the `iris-data` and `iris-uploads` Blobs stores in the Netlify dashboard does the same, and also resets the owner password.
- **Uploads.** Images are compressed in the browser (1600px JPEG); logos keep their transparency. Manual uploads (images, logo, video, font files) are limited to 5 MB, because Netlify Functions accept requests up to about 6 MB. Videos imported from Instagram are downloaded server-side, so that limit doesn't apply to them.
- **Staff accounts and Instagram import** work the same as on the PHP host: the logic lives in `server/core/` (shared by the Netlify function and `npm run dev`). In the drag-and-drop, browser-only mode, staff accounts work per browser and the Instagram import is unavailable.
- **Testing the Instagram import without a real account.** Run `IRIS_IG_FAKE=1 npm run dev`; the dev server then serves the posts in `scripts/qa/fixtures/instagram.json`. `node scripts/qa/flow-admin-features.mjs http://127.0.0.1:5173` exercises branding, staff permissions, the import and the reset end to end.
- **Free plan.** Netlify's free plan works on monthly credits, and each production deploy uses some of them. Group your changes into fewer deploys rather than pushing every small fix.
- **Moving to the permanent host** needs no code changes: `npm run package` builds the cPanel/PHP version as described in `DEPLOY.md`. Data entered in the Netlify trial does not carry over.
