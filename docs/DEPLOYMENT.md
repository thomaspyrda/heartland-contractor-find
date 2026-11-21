# Deploy to the owner's Cloudflare account

The domain remains registered with Hostinger. No live hosting, DNS, database, email account, runtime secret or paid subscription has been created by this source commit.

## 1. Create the infrastructure

In the owner's Cloudflare account:

1. Add `heartlandcontractorfind.com` as a zone. Review imported DNS records before changing nameservers at Hostinger. Preserve existing email MX/TXT records if any.
2. Create D1 database `heartland-inquiries`; record its real database ID.
3. Create R2 bucket `heartland-inquiry-photos`. Keep public access disabled; do not attach a public domain to it. R2 activation may require billing enrollment even if usage is within an allowance.
4. Create a Turnstile widget allowing the final hostname and any intentionally used preview hostname. Record its public site key and private secret key.
5. Set up Resend and verify a sending domain/subdomain owned by the operator. Do not use an arbitrary Gmail address as the sender. Choose a verified `MAIL_FROM`, for example a forms mailbox at the owned domain. The notification recipient can be the owner's private mailbox.

The production domain, D1 database and R2 bucket must belong to the owner's account so the project can change contractor partners without losing its lead-generation infrastructure.

## 2. Generate the deployment configuration

Use Node.js 24. In a local checkout:

```sh
npm run check
npm run configure -- <real-d1-database-id>
npx --yes wrangler@4 login
npx --yes wrangler@4 d1 migrations apply heartland-inquiries --remote
```

`npm run configure` writes an ignored `wrangler.json`. It contains infrastructure bindings but never runtime secrets or the notification recipient. Use `PHOTO_BUCKET_NAME` only if a different bucket name was actually created.

Cloudflare can serve prebuilt files without invoking the Worker. `assets.run_worker_first` only targets `/api/*`; ordinary pages and images use static asset delivery. `_headers` applies security headers to static responses. A real `404.html` handles unknown pages rather than returning the homepage with status 200.

For GitHub-connected Cloudflare Builds, set:

- Build command: `npm run build && npm run configure`
- Deploy command: `npm run deploy`
- Build variable: `CLOUDFLARE_D1_DATABASE_ID` with the real database ID.
- Optional build variable: `PHOTO_BUCKET_NAME` if a non-default real bucket name was chosen.
- Keep `INDEXING_ENABLED` unset during review.

Use the repository's `main` branch. If the dashboard initially detects another framework or generates configuration, select this Worker entrypoint and static asset directory; do not introduce a single-page-app fallback or overwrite the binding configuration.

## 3. Configure private runtime settings

Use Cloudflare's Worker Settings / Variables and Secrets, or `wrangler secret put` interactively. Do not paste secrets into GitHub source, issue comments or PR descriptions.

| Runtime setting | Value/purpose |
|---|---|
| `PUBLIC_ORIGIN` | `https://heartlandcontractorfind.com` |
| `TURNSTILE_SITE_KEY` | Widget's public site key; this is intentionally returned to the form |
| `TURNSTILE_SECRET_KEY` | Widget's private secret |
| `RESEND_API_KEY` | Private email API credential |
| `LEAD_NOTIFICATION_TO` | Owner's privately supplied notification address; store as a secret |
| `MAIL_FROM` | Verified Resend sender; configure at runtime, not in public page content |
| `REFERRAL_OWNER` | Stable internal referral owner code |
| `PARTNER_ID` | Current internal contractor assignment; do not expose in the browser |
| `INQUIRIES_ENABLED` | Keep `false` until resources and delivery are ready; set `true` for acceptance testing and opening |

All required settings and bindings must be present before `/api/form-config` reports readiness. That public endpoint returns only readiness and the public Turnstile key. A configured API key alone does not prove deliverability; a live acceptance test is still required.

The configured `PUBLIC_ORIGIN` must match the hostname on which the customer submits the form. Use the apex domain as canonical. If using a preview hostname for acceptance testing, configure a separate environment with its own origin, Turnstile allowance and isolated test storage.

## 4. Connect the domain

Add the apex domain to the Worker using Cloudflare's Custom Domains flow after the zone is active. Configure `www` to redirect to the apex with a Cloudflare Redirect Rule that preserves paths and query strings. Do not rely on `_redirects` for cross-domain redirects; Workers static assets do not support domain-level rules in that file.

Keep the Hostinger domain renewed. Domain registration does not need to move. Review DNS changes deliberately and avoid touching unrelated domains or existing email records.

## 5. Verify the complete inquiry flow

Submit an operator-authorized test project with no photo, then one with a permitted photo. Confirm:

- The customer sees success only after a real durable database write.
- The reference matches the D1 record and the notification.
- The private owner mailbox receives the correct details and photo attachment.
- The originating service and town are preserved separately from the customer-entered project location.
- Budget and timing remain optional; descriptions accept mixed or unlisted work.
- Repeating the same request ID creates no duplicate lead or notification.
- Invalid Turnstile, incorrect origin, missing consent and unsupported uploads are rejected without saving a lead.
- A deliberately failed email attempt leaves a saved inquiry eligible for retry.
- No lead retrieval or photo-download route is publicly available.
- Mobile layout, keyboard use, security-widget behavior, local resource links and privacy wording work on the deployed hostname.

Use approved test details, not a real homeowner's information. Do not claim successful Gmail delivery until it has actually been received.

## 6. Open and index

After the acceptance tests and operator review, enable `INQUIRIES_ENABLED=true`. Set build variable `INDEXING_ENABLED=true` and rebuild to remove the prelaunch `noindex` meta tags. Ensure preview deployments remain non-indexable.

Verify HTTPS and the canonical domain. Add the domain to Google Search Console and submit `/sitemap.xml`. Indexing and ranking are separate processes and are not guaranteed by sitemap submission.

## Notification operations

Lead records are saved before notification. A 15-minute cron retries up to ten pending records per run, with eight total attempts per lead. Resend's idempotency key and an atomic database claim reduce duplicate email delivery. A crashed sending attempt becomes retryable after its ten-minute lock expires.

Inspect records with `notification_state='failed'` and investigate delivery configuration before retrying them. A successful email API response marks the notification sent; it does not prove inbox placement. Monitor bounce/delivery events in the email provider.

The source does not yet include an operator dashboard or automatic contractor forwarding. The owner follows up and books manually. Partner assignment is recorded for attribution; changing the runtime partner affects new inquiries and does not rewrite old records. Privacy inquiries are always unassigned.

Define retention and deletion practices before production use. Removing an inquiry should include its private R2 images, database record and any operational copies handled by the owner. Protect account access and exports. Do not enable public R2 access to make image review easier.

## Costs and limits

Cloudflare compute, database, object storage, build usage, domain renewal and email delivery have independent limits and pricing. Review the owner's current plans and spending controls before enabling billing. A site with thousands of pages must budget for all assets, not just its HTML file count.
