# Put Listly AI online with live AI

This uses the existing `anishmanthena123/Real-Estate-Listing-Maker` repository. No new repository is needed. The checked-in `render.yaml` defines the web application, managed PostgreSQL database, private photo disk, and non-secret settings.

## What you need

- A Render account connected to your GitHub account, with access to this repository.
- An API key for an OpenAI API project with billing/credits available. A ChatGPT subscription does not supply API credits. Create/manage the key at https://platform.openai.com/api-keys and review billing there.
- A hosting budget. This blueprint selects a paid Starter web service, a paid database, and a persistent disk. Render displays current pricing before you create resources. Review that total yourself; no paid resources have been created by this task. AI usage is billed separately by the provider.

## Deploy from GitHub

1. Create an account at https://render.com using GitHub. Authorize access to `Real-Estate-Listing-Maker` when asked.
2. Open https://render.com/deploy?repo=https://github.com/anishmanthena123/Real-Estate-Listing-Maker or choose **New → Blueprint** in Render and select this repository's `main` branch. Render should detect `render.yaml` at the repository root.
3. Review the proposed `listly-ai` web service, `listly-db` database, and persistent photo disk. Review the region and pricing. If a service name is already used, choose an available name in the blueprint review; the application uses the assigned Render URL automatically.
4. When prompted for `AI_API_KEY`, enter your provider key securely in Render. Never put it in GitHub, a screenshot, an issue, or chat. The app is configured with `MOCK_AI=false`, `AI_BASE_URL=https://api.openai.com/v1`, and `AI_MODEL=gpt-4o-mini`. If your account requires a different vision-capable chat-completions model, change `AI_MODEL` in Render before deployment.
5. Approve creation only after you accept Render's displayed costs. Wait for the database and web service to finish deploying. The web startup validates configuration, checks private storage, applies committed migrations, and starts the application on Render's assigned port.
6. Open the HTTPS `.onrender.com` URL shown on the web service page when its status is **Live**. That URL is your website. Create your agent account, add a property, upload a photo, and analyze it. Confirm that new suggestions are PENDING, explicitly verify one, then generate and review a draft.

The configured health endpoint is `/api/health`. It returns only `{"status":"ok"}` when database access, writable photo storage, and required AI configuration are available. It does not call the AI provider or prove that a key has credit or permission to use a model. Complete a real photo analysis and generation before claiming live AI works.

## Settings that are automatic

- `DATABASE_URL` comes from the managed database's private connection string. Do not copy the local `.env` into Render.
- `RENDER_EXTERNAL_URL` is provided by Render; production startup uses it as `APP_ORIGIN` so cookies and same-origin protection use the correct site.
- `STORAGE_DIR=/var/data/listly/photos` is inside the persistent disk. Photo reads still require login and ownership.
- `NODE_VERSION=24`, `NODE_ENV=production`; dependencies include release-time Prisma/tsx tools.
- `PORT` is provided by Render. The startup script respects it and binds to all interfaces.
- Public production never enables the localhost HTTP override.

## Future code updates

Automatic deployment is intentionally disabled in the initial blueprint. After reviewing a pushed commit and its GitHub Actions results, use **Manual Deploy → Deploy latest commit** in Render. You may enable automatic deployment in Render after establishing your review process. Do not modify an already-applied migration; add a new one instead. Back up PostgreSQL and private photos and test restore before relying on this for important data.

If you add a custom domain, configure that domain in Render, wait for HTTPS to be ready, and set `APP_ORIGIN` to its exact origin (for example `https://listly.example.com`, without a path). Redeploy. Use the configured domain for login and mutations; alternate origins will be rejected.

## Troubleshooting

- **Startup says set AI_API_KEY:** add the key to the web service's Environment settings. Save and redeploy. For a temporary explicitly labeled demo only, set `MOCK_AI=true`; this does not enable real AI.
- **401/429 from the AI provider:** inspect provider project permissions, account billing/limits, endpoint/model compatibility, and usage. The app returns safe errors rather than exposing keys. Never disable TLS verification.
- **Database migration fails:** confirm the database service is available and the managed internal `DATABASE_URL` binding is intact. Do not reset or delete retained databases to force a deployment through.
- **Health check fails:** inspect web service logs for configuration, database or storage errors. Confirm that the persistent disk is mounted at `/var/data/listly` and that `STORAGE_DIR` is correct. Health errors deliberately omit secrets and connection details.
- **Sign-in or saves rejected after changing domains:** ensure `APP_ORIGIN` exactly matches the HTTPS site you are visiting, then redeploy and sign in again.
- **Missing photos after deployment:** check the disk mount and storage path. An ephemeral filesystem cannot preserve uploads. Do not replace this deployment with a static site or GitHub Pages; those cannot run this backend.

## Scope of verification

Repository tests and local production-startup checks are performed before pushing this setup. Render account creation, paid provisioning, Render-side blueprint validation, public URL reachability, and live AI calls require your hosting account and provider key and are not established merely by adding these files. The security and AI-validation limitations in README.md and docs/AI_SAFETY.md still apply. Public registration lacks email verification, password recovery and MFA; address those before broad public onboarding.
