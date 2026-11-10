# Enable real photo analysis and property lookup

The full hosted application supports server-side API calls. The separate GitHub Pages site is still a static demonstration: it cannot securely hold keys, authenticate API users, or run these server integrations. Do not put keys into the Pages workflow or browser settings.

## The two services

| Feature                                 | Provider                               | Server setting                                    |
| --------------------------------------- | -------------------------------------- | ------------------------------------------------- |
| Photo analysis and marketing generation | OpenAI-compatible text/vision endpoint | `AI_API_KEY`, `MOCK_AI=false`                     |
| US property public-record lookup        | ATTOM Property API                     | `ATTOM_API_KEY`, `PROPERTY_LOOKUP_PROVIDER=attom` |

These are separate accounts/keys and may have separate usage charges. A ChatGPT subscription does not include OpenAI API billing. The application does not create subscriptions or approve paid resources for you.

Create/manage an OpenAI project key at https://platform.openai.com/api-keys. Obtain ATTOM API access through https://www.attomdata.com/ and confirm that your plan permits the Property Detail endpoint. Never paste credentials in chat, issues, screenshots, or source control.

## Configure the full app on Render

Follow RENDER_SETUP.md to connect the same GitHub repository to Render. The blueprint now requests both API keys as private environment inputs. For an existing service, set these in **Render → web service → Environment**:

```text
MOCK_AI=false
AI_API_KEY=<secure OpenAI-compatible API credential>
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
PROPERTY_LOOKUP_PROVIDER=attom
ATTOM_API_KEY=<secure ATTOM API credential>
```

Choose a model your provider currently supports for text, images and JSON responses. The placeholders above are descriptions, not usable credentials. Save and redeploy. The startup command refuses to launch a configured live integration with its key missing. Readiness checks configuration, database and storage; it does not make billable provider calls or establish account permissions/credits.

To run locally, use the same variables in ignored `.env`, restart the development process, and keep its database/private storage prepared. When developing inside a proxy-managed cloud environment, authorize the actual HTTPS provider destinations (`api.openai.com` and `api.gateway.attomdata.com`) and use supported proxy/CA configuration. On Node 24, `NODE_USE_ENV_PROXY=1` at process startup enables inherited proxy routing. Do not disable TLS verification. Cloud proxy-backed secret bindings cannot simply be copied to a separate hosting service; configure that host's own secure values.

For offline development, use `MOCK_AI=true` and `PROPERTY_LOOKUP_PROVIDER=disabled`. Lookup reports that it is unavailable rather than returning fake real-property facts; address-only and manual entry still work. Static demo sample suggestions remain clearly labeled.

## Simple agent workflow

1. Create an account in the full app and choose **Add property**.
2. Enter one address in `Street address, City, ST ZIP` form, such as `123 Oak Street, Austin, TX 78701`. Put an apartment/unit in the street-address part. Choose **Look up property**, or **Use address only — skip lookup**.
3. Review the returned address and facts. ATTOM may normalize a street name or return an outdated/different unit. The form shows the source and retrieval time and requires an acknowledgement before saving imported suggestions. Optional facts can remain empty; only address fields are required. No property is created merely by looking it up.
4. Upload photos. **Analyze all photos** calls the configured vision provider for each unprocessed photo. Suggestions always begin PENDING. Verify/reject them explicitly.
5. Continue to content, select presentation options, generate, review claims, and save/mark READY after human review. Navigate back to photos without losing unsaved text. Changed evidence requires revalidation and fresh review.

The compact workflow navigation shows one task at a time. The portfolio demo has corresponding Address, Photos & features, Create draft, and Review & save steps, but its generation remains local and simulated.

## Property-data boundaries

The ATTOM adapter calls the fixed HTTPS `/propertyapi/v1.0.0/property/detail` endpoint with encoded `address1`/`address2` query parameters and an `apikey` header. The browser never sees the key. Requests require an authenticated server session, exact mutation origin, bounded input, and a per-user database rate limit (20 lookups/hour).

The adapter maps returned address, bedroom count, total bathrooms, living area, construction year, property type and lot square feet. It accepts explicit numeric strings and preserves unknown/null fields; it does not coerce null or blank values into zero. Current listing price is always left unknown: assessed market value, an AVM estimate, and a historical sale amount are not a current listing price. Unsupported types or out-of-range values remain unknown. No listing photos are downloaded from this endpoint.

No result yields 404; multiple records yield 409 and require a more specific address/manual entry. Unexpected, oversized, timed-out or failed responses produce safe errors, without raw credentials or provider messages. The endpoint does not silently pick the first of multiple matches.

Public records are suggestions, not independent confirmation of current physical facts. Human adoption of values is treated as the authenticated agent entering property facts; the confirmation checkbox is a UI review safeguard, not an independently proven certification. Metadata is displayed in the lookup result; the original raw provider response is not retained as a permanent audit record. A durable provenance/reviewer trail remains future work.

Unknown price, bedrooms, bathrooms, area, type and year are stored as database nulls and omitted from generation. The additive migration `202611100001_optional_facts` makes that possible while preserving numeric validation, SQL constraints and ownership rules. Apply migrations normally; do not reset retained data.

## Validate live access after configuration

Run a lookup for a property you are authorized to query. Check the matched address and returned facts against your own records. Upload a photo you may share with the provider, analyze it, and confirm that suggestions are PENDING and only explicit verification admits them to generation. Create a draft and inspect claim results. Check provider usage/billing and set appropriate account limits.

Automated tests use synthetic fixtures and mocked provider responses to exercise request shape, review, empty/multiple records, missing credentials, errors and secret isolation. They do not establish live ATTOM/OpenAI availability, detection accuracy, contract stability, latency or legal compliance. No live call was performed without credentials. Email verification/recovery/MFA, stronger abuse controls, detailed provenance retention and production observability remain deployment concerns documented elsewhere.
