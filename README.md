# Heartland Contractor Find

An independently branded residential project-referral website for Southwest Iowa, Southeast Nebraska, Northwest Missouri, and Northeast Kansas. Listed ZIP areas overlap a 60-mile geographic radius from Farragut, Iowa; sales reviews final job acceptance.

## Current state

- 1,078 generated pages plus a real 404 page: 1,068 service/location pages across 267 communities, four service guides, and the core site pages. The original six researched local pages are preserved.
- Responsive design, locally hosted owner-supplied photography, crawlable HTML, unique titles/descriptions, canonical URLs, structured data and a sitemap.
- Open-ended project inquiry form: project description, location, contact information, required budget range, timing and one to three photos, plus optional notes. No service dropdown, budget threshold or automated service-fit rejection.
- Cloudflare Worker backend with D1 lead records, private R2 photos, Turnstile verification, referral attribution and private email notifications through Resend.
- Durable notification retry queue. A delivery failure does not discard a saved inquiry. Customer photo attachments are included in the owner's notification.
- No public access to lead records, notification destination, email credentials, partner assignment or original uploaded filenames.

**This is a prelaunch implementation. Cloudflare resources, runtime secrets, a verified email sender and an end-to-end delivery test must be configured before inquiries open. No production deployment is implied by a GitHub commit.**

## Local checks

Node.js 24 is recommended. The generator and tests use Node built-ins; no package installation is needed to build or run tests.

```sh
npm run check
npm run preview
```

Open http://localhost:4173. This is a static preview: forms display an honest not-yet-open message and cannot submit or simulate successful delivery.

## Content

Edit `content/site.json` for service guides, researched town context and explicitly approved service/location combinations. The generator does not automatically publish the Cartesian product of every service and town. Add a page only when there is enough useful service/location material.

`scripts/build.mjs` generates `dist/`. Initial local pages:

- `/concrete/shenandoah-ia/`
- `/masonry/shenandoah-ia/`
- `/concrete/clarinda-ia/`
- `/masonry/clarinda-ia/`
- `/concrete/red-oak-ia/`
- `/retaining-walls/nebraska-city-ne/`

Owner-supplied photographs illustrate services, not completed jobs in those towns. Image-use information is recorded on the photo-credits page. Do not replace them with a partner's portfolio without permission and accurate attribution.

## Hosting and launch

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Keep the domain registered at Hostinger; Cloudflare will host the website. GitHub is the source of truth for code and reviewed page content.

Store the owner's notification address only as the Cloudflare runtime secret `LEAD_NOTIFICATION_TO`. Never put it in page content, client JavaScript, `content/site.json`, a committed environment file, a workflow, or a deployment screenshot. All submitted customer information belongs in the private database/storage, never this repository.

The supplied GitHub workflow runs checks on source changes. It does not publish a site, send emails, or schedule daily page builds. Cloudflare's 15-minute scheduled notification retry is a separate backend task, not a content-generation workflow.

## Search indexing

Builds default to `noindex` during prelaunch review. Only set `INDEXING_ENABLED=true` after domain connection, editorial review, privacy review, working form submission and verified owner email delivery. Successful publication alone does not guarantee indexing or rankings.

Coverage source and overlap rules are documented in `docs/COVERAGE.md`. The site build uses the committed `content/coverage.json`; Python GIS dependencies are only needed to refresh the research dataset.
