# Free portfolio website

The free site is a browser-only React demo published through GitHub Pages from this same repository. It is intentionally distinct from the complete authenticated Next.js/PostgreSQL application. The full application's source, database migrations, tests, and optional Render deployment remain available.

## Publish it once

1. Open https://github.com/anishmanthena123/Real-Estate-Listing-Maker/settings/pages while signed into the repository owner's GitHub account.
2. Under **Build and deployment**, select **GitHub Actions** as the Source.
3. Open **Actions → Deploy portfolio demo → Run workflow**, choose `main`, and run it. If a deployment is already running after the push, wait for it first. If a prior run failed because Pages wasn't enabled, rerun it after changing the setting.
4. When the workflow's deploy job succeeds, open the website URL shown by the deployment: https://anishmanthena123.github.io/Real-Estate-Listing-Maker/.

The GitHub connection used for development permits Git pushes but did not provide Pages administration/API access. That is why the one-time owner setting may still be needed. A pushed workflow is not proof that the public website is already live. Later pushes to `main` rebuild, test, and deploy the demo automatically.

This requires no Render account, database, paid hosting plan, or AI key. If GitHub displays a policy or billing restriction for Pages, review that account-specific requirement instead of assuming it has been bypassed.

## What visitors can do

- Enter one property address. Exact sample-address matches load fictional records; any other address creates an address-only workspace with unknown price, beds, baths, area, type and year. No live property lookup is connected.
- Optionally import up to 10 JPEG, PNG or WebP pictures per property (8 MB each), preview/remove them and switch between properties. Pictures stay in browser memory and are never uploaded by this demo.
- Add a visible catalog feature as PENDING after importing a photo, then explicitly verify or reject it. Importing a picture never creates verified evidence automatically. Removing a picture resets verified features to PENDING and invalidates draft readiness.
- Explore three fictional properties, clearly labeled as samples.
- Verify/reject preloaded photo-feature suggestions; pending and rejected suggestions never enter generation context.
- Inspect the exact context sent to the local deterministic generator.
- Choose content format, style preference, and length. Style is recorded but does not pretend to reproduce a live model's expressive variations.
- Generate a fact-template draft, edit it, deliberately insert unsupported/misleading claims, and inspect explanations.
- Remove flagged sentences, acknowledge review, and mark supported content READY.
- Reverse feature verification and see old content require review again.
- Inspect drafts and record demo feedback in the current tab. Reload or reset discards it.

Imported property photos are displayed locally but are not analyzed by AI, no provider calls occur, no authentication is simulated as secure, and no data is written to the backend. Only static HTML/JS/CSS/SVG assets are published. Original illustrations are included in the repository. This demo makes no claim of users, customer feedback, model accuracy, legal compliance, or production usage.

## Implementation

`src/demo` contains the standalone landing page and interactive workspace. Business simulation is in `model.ts`; it imports the same pure context projection and claim validation modules as the server application. The context builder accepts a minimal structural property shape rather than requiring runtime Prisma objects. Server services continue enforcing authentication, ownership and persistence for the full app.

`npm run demo:build` uses esbuild to emit `dist-demo`. A build guard rejects accidental imports of authentication, database/configuration, storage, business services or live provider modules into the public bundle. Assets use relative URLs to work under the repository's GitHub Pages subpath. The preview server exposes only built public assets under that same subpath.

`.github/workflows/pages.yml` runs lint, typecheck, unit tests, the static build and desktop/mobile browser tests before uploading only `dist-demo` as the Pages artifact. It uses GitHub's standard Pages deployment actions and an environment-scoped deployment. Secrets and `.env` files are not uploaded. The placeholder database URL in the build job supports Prisma client generation only; it is not connected to a real database.

## Local validation

```bash
npm run demo:build
npm run demo:test
```

Use Playwright's installed Chromium, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` when using the managed environment's system browser. `npm run demo:preview` starts the local static preview. Browser tests verify the repository subpath, feature filtering, unsupported claims, review gates, evidence invalidation, history, session reset, zero API requests, and mobile overflow.

The UI supports keyboard focus and reduced-motion preferences. Browser checks do not establish full accessibility compliance; assistive-technology testing remains future work.

## Presenting this project

Link the deployed demo in applications after confirming it loads publicly. Describe it as an **interactive demonstration of an evidence-grounded marketing workflow**, with the full-stack implementation available in the repository. Explain the simulated generation and limited validator candidly. Do not present the demo as an already deployed production AI service.

## Address-only and photo-import boundaries

The address entry is the only required intake field. It does not geocode, fetch an MLS/public-record listing, guess a price, borrow facts from a nearby sample, or download pictures. Unknown attributes are represented as null and excluded from factual generation/claim support, not replaced with zero. The shared context/validator accepts those unknowns; the full app's existing server-side CRUD schema still requires validated structured property data and its database schema has not been weakened. Real automatic enrichment would require a configured property-data provider with appropriate access and independent provenance/verification.

Photo import checks file size, MIME and JPEG/PNG/WebP signatures, then actually decodes images in the browser and enforces a 40-megapixel limit. Unsupported/spoofed/broken pictures produce visible errors. A failed batch leaves existing pictures intact. Decoded validation bitmaps are closed, and preview object URLs are revoked when removed/reset or when the workspace unmounts. Pending imports are cancelled on reset. No local images are added to GitHub, browser storage, or provider requests. Imported photos reset on reload. The authenticated full app retains its separate private server upload/analysis implementation.
