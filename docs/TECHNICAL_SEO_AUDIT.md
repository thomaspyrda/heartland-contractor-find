# Heartland Contractor Find — technical SEO audit

Audit date: November 21, 2026 (America/New_York). Site: https://heartlandcontractorfind.com/

## Assessment

The site has a sound crawlable structure and strong sampled lab performance, but it is **not ready for a broad indexing launch**. All 1,078 HTML routes deliberately retain prelaunch `noindex`. The www hostname returns a Cloudflare 522 rather than a canonical redirect. The 1,068 local pages provide complete service/town navigation, but share substantial service-level content. Technical eligibility, local usefulness, and eventual rankings are separate milestones; none of these checks guarantees page-one rankings.

## Scope and evidence

- Full built-HTML crawl: 1,078 routes, including 1,068 local pages (267 communities × four service categories).
- Validated metadata, headings, canonicals, local file/asset links, cross-page fragment targets, unique element IDs, JSON-LD syntax, image attributes, homepage reachability, sitemap membership, and indexing directives.
- Live browser checks: homepage, concrete/Shenandoah local route, nonexistent URL, and www homepage.
- Google PageSpeed Insights: live homepage mobile and desktop, plus a representative local page on mobile. These are single-run lab results, not real-user Core Web Vitals or a prediction of rankings.
- Responsive preview: homepage, concrete/Shenandoah page, and full area directory in 320px and 390px frames; available inner viewport widths were 305px and 375px after scrollbars. No horizontal document overflow in these six samples.
- Build and backend regression suite: 30 passing tests after the audit fixes. No new real customer inquiry was submitted.

## Results

| Check | Finding | Status |
| --- | --- | --- |
| Indexing eligibility | All 1,078 routes contain `noindex,follow`; confirmed live on homepage and local sample | Launch blocker, intentionally retained |
| www hostname | https://www.heartlandcontractorfind.com/ renders Cloudflare “Connection timed out”, code 522 | Requires Cloudflare zone redirect |
| Canonical URLs | One self-canonical on each route, consistently HTTPS without www | Pass in built HTML and live samples |
| Canonical middleware | Static assets previously bypassed existing Worker hostname redirect | Fixed in code; www route still needs zone setup |
| Sitemap | All 1,078 canonical routes listed, including currently noindex routes | Restrict to approved indexable pages at launch |
| robots.txt | Allows HTML crawling and excludes `/api/`; does not block seeing noindex | Pass in source; no live robots response-header certification |
| Titles/descriptions | All unique and present | Pass; reduced local-title boilerplate |
| Headings | One H1 per published route | Pass |
| Internal links/fragments | No broken local links or fragment targets | Pass |
| Discovery | No orphan routes; all 1,068 local pages two clicks from homepage | Pass |
| Structured data | Organization + BreadcrumbList parse; no fabricated local office/review claims | Pass syntax; rich-result eligibility not certified |
| Images | All have descriptive alt and explicit width/height; heroes eager/high-priority, others lazy | Pass attributes; responsive delivery can improve |
| Error pages | Live nonexistent URL shows the intended not-found page; source uses Cloudflare 404-page mode; Worker preserves asset status | Live HTTP status still requires external verification |
| Preview/operational URLs | Alternate host responses, API JSON, build-info JSON, and errors explicitly noindex | Fixed in code and regression tested |
| Local relevance | Service, town, state and listed ZIPs in crawlable HTML; nearby-town and same-town related-service links | Pass structure; local content needs strengthening |

Titles can still be long for lengthy town/service names. Character counts are diagnostics, not Google ranking thresholds. Google may rewrite or truncate snippets. Keep the service and town at the front instead of adding keyword lists.

## Performance evidence

| Page / device | Performance | Accessibility | Best practices | SEO | LCP | CLS | Total blocking time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage / mobile | 95 | 100 | 92 | 69 | 2.9 s | 0 | 0 ms |
| Homepage / desktop | 100 | 100 | 92 | 69 | 0.6 s | 0 | 0 ms |
| Concrete in Shenandoah / mobile | 100 | 100 | 92 | 69 | 1.5 s | 0 | 0 ms |

The reported SEO failure is “Page is blocked from indexing.” The test reports **No Data** for real users; no field INP or sitewide Core Web Vitals pass can be claimed. Google's good-experience targets are LCP within 2.5 seconds, INP below 200 ms, and CLS below 0.1. The homepage's sampled mobile LCP misses the loading target despite its strong aggregate score.

Reports captured before the audit code deployment:
- Homepage: https://pagespeed.web.dev/analysis/https-heartlandcontractorfind-com/qqq6i53cm9?form_factor=mobile
- Local sample: https://pagespeed.web.dev/analysis/https-heartlandcontractorfind-com-concrete-shenandoah-ia/j7q4r9h5nb?form_factor=mobile

PageSpeed flags image delivery (estimated homepage savings about 1.36 MiB), about 3.46 MiB total homepage transfer including third-party resources, and a small render-blocking CSS opportunity. The largest source images are concrete.jpg (514,414 bytes), retaining-wall.jpg (458,919), and homepage paver-installation.webp (312,414). There is no responsive srcset. Responsive image variants and modern delivery are the next performance improvement; supplied photographs were not altered in this audit.

Best-practices warnings include browser-console/Issues-panel diagnostics. The live sample also logs messages from Cloudflare Turnstile and the browser extension, so a first-party JavaScript failure is not established from that score. Keep spam protection; assess reproducible errors separately. The earlier successful real email/photo test remains the delivery evidence.

## Fixes included with this audit

1. Configure `assets.run_worker_first: true`, so canonical-host middleware executes before static HTML. This adds Worker invocation to static requests; monitor Worker request/CPU usage as traffic grows. No heavy catalog generation is added to the Worker.
2. Canonicalize routed www and HTTP apex requests to HTTPS apex with a permanent 308, preserving path and query parameters. Unit-tested before asset lookup. This cannot repair a hostname that Cloudflare has not routed to the Worker.
3. Add HTTP `X-Robots-Tag: noindex` to preview-host responses, API responses, operational build JSON and errors; preserve the actual asset status.
4. Remove “Request a Contractor Call” from all local document titles, leaving service + town/state + brand. Visible headings and sales copy are unchanged.
5. Add `npm run audit:seo` and run it in the existing CI check. Broken links/fragments, orphan pages, missing/duplicate metadata, wrong canonicals and invalid JSON-LD fail the audit. Intentional prelaunch noindex produces explicit warnings.

Indexing is **not enabled** by these fixes. No Search Console ownership, index coverage, Google-selected canonical, backlinks, impressions or ranking positions were available for inspection.

## Required Cloudflare change: www redirect

A proxied CNAME pointing www at the apex does not currently reach the site's Worker; the live result is 522. Use a zone-level Single Redirect, which can operate before origin lookup:

- Zone: heartlandcontractorfind.com
- Rules → Redirect Rules → Single Redirect → Create rule
- Match expression: `(http.host eq "www.heartlandcontractorfind.com")`
- Dynamic target expression: `concat("https://heartlandcontractorfind.com", http.request.uri.path)`
- Status: 301 (permanent)
- Preserve query string: enabled
- Keep the existing www DNS record proxied.

Verify the homepage AND a deep link such as `/concrete/shenandoah-ia/?utm_source=redirect-test`. Both should end at the HTTPS apex, retaining path/query without looping. Also verify HTTP apex permanently redirects to HTTPS. Cloudflare dashboard access was not available for making this zone change during the audit. Do not mark www fixed until its live result changes.

## Indexing rollout

The current build uses `process.env.INDEXING_ENABLED`. It is a **build-time** switch; changing a production runtime variable alone does not change already generated static HTML. There is presently no page-level indexing allowlist, so switching it on would make every route eligible at once. Add an explicit reviewed-page list first and make sitemap inclusion use that same policy. Preserve noindex on unreviewed local pages, utility pages and 404s; retain them for visitors and lead submissions.

Then verify a Search Console Domain property by DNS, deploy the selected indexable pages, check live robots/meta/headers/canonical/200 status, and submit only the indexable canonical URLs in the sitemap. Use URL Inspection and the Page Indexing report to distinguish discovered, crawled, excluded and indexed pages. Sitemap submission is discovery assistance, not a ranking or indexing guarantee.

## Local search plan

The existing town/service pages establish navigation and ZIP coverage. They do not yet contain independently researched local guidance for all 267 communities. Repeating a town name, ZIP list, and generic permit disclaimer does not establish strong unique local value. Google's doorway/scaled-content policies make mass production for similar searches a material content-review concern; this audit is not a finding that Google has penalized the site.

Prioritize useful pages around actual work homeowners ask about: concrete patios/slabs and, if confirmed within contractor scope, driveways/sidewalks; brick repair/repointing; exterior chimney masonry; paver patios/walkways; retaining-wall replacement. Add distinct scope explanations, preparation/removal/access questions, material choices, practical cost drivers (no invented prices), and reviewed permit-office links relevant to the actual jurisdiction. Where there is insufficient distinct local information, a useful service or area hub may serve users better than another thin page.

Use city/state/ZIP naturally in readable content. Keep the broad ZIP acceptance policy and salesperson review. Do not generate a second copy of every page for each ZIP or spelling variation. ZIP searches may be served by these same canonical pages. Do not invent local offices, local completed projects, testimonials, municipal requirements or contractor guarantees. Review organic search coverage separately from map-pack eligibility.

## Priority order

1. Fix www in Cloudflare and verify redirects/statuses externally.
2. Add selective indexing/sitemap policy and improve the first group of useful service/local pages.
3. Confirm the specific services offered; strengthen supported subservice coverage rather than multiplying templates.
4. Verify Search Console, launch selected indexing, and monitor actual queries by service/town/ZIP.
5. Improve responsive image delivery and remeasure homepage mobile LCP.
6. Use new search/lead data to guide the next page group and sales tracking.

## Sources

- Google noindex: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Canonicalization: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Doorway/scaled-content policies: https://developers.google.com/search/docs/essentials/spam-policies
- Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Cloudflare static-asset Worker routing: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- Cloudflare Single Redirects: https://developers.cloudflare.com/rules/url-forwarding/single-redirects/

The full local audit is reproducible with `npm run check`; source audit alone cannot certify public HTTP routing, Googlebot access, external links, Search Console indexing, every mobile device, or future rankings. Direct shell HTTP requests in this workspace timed out or received 403, while the independent browser and Google's PageSpeed service could load the apex. This is a verification limitation, not evidence that Googlebot is blocked.
