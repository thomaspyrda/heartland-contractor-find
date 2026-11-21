# Search launch — November 21, 2026

## Indexing release

The first release permits indexing for 56 canonical pages: eight core pages and four service pages in each of twelve communities. These towns have reviewed local passages and verified official planning/contact resources across all four coverage states. Eligibility is not evidence of Google indexing, local ranking, or third-party endorsement.

Core pages: homepage, project types, concrete, masonry, hardscaping, retaining walls, service area and how it works.

Communities: Shenandoah, Clarinda, Treynor and Glenwood (IA); Nebraska City, Pawnee City, Bellevue and Papillion (NE); Maryville and Savannah (MO); Sabetha and Troy (KS).

`content/indexing.json` is the explicit release list. Adding a community releases its four service pages; changes should follow a content and technical review. The other 1,022 published routes retain noindex and remain fully available for visitors and lead submissions. Privacy, photography credits, 404s, API responses, operational JSON and alternate preview hosts remain excluded from indexing.

The sitemap is generated from exactly the same release policy as the HTML robots metadata. No noindex route is listed. CI rejects unknown policy routes, sitemap/noindex conflicts, duplicate sitemap URLs and omitted indexable routes. The retained environment override `INDEXING_ENABLED=false` can disable all indexing at build time for an emergency rollback. A production runtime setting alone does not rewrite static HTML.

## Cloudflare www redirect

The apex Worker custom domain does not automatically receive www requests. The existing proxied www record needs a zone redirect rule, configured in the domain's Rules / Redirect Rules area:

- Match expression: `(http.host eq "www.heartlandcontractorfind.com")`
- Dynamic target: `concat("https://heartlandcontractorfind.com", http.request.uri.path)`
- Status: 301
- Preserve query string: on

Verify both homepage and deep paths, HTTP and HTTPS, and query preservation. The application's separate permanent canonical redirect remains a second layer for requests that do reach its Worker. No other DNS records, nameservers or mail records need changing for this rule.

## Search Console

Use the Domain property `heartlandcontractorfind.com` under the owner's selected Google account. Verify the exact ownership TXT record returned by Search Console through Cloudflare DNS. Do not generate or guess a verification token. Submit `https://heartlandcontractorfind.com/sitemap.xml` after the new metadata and sitemap are live. Inspect the homepage and representative local pages to confirm live crawl eligibility; submitted/requested does not mean indexed. Track verification/submission outcomes separately from deployed source.

## Remaining checks

Cloudflare account access and Search Console ownership verification require live account state. Deployment checks certify the code release; they do not certify DNS changes or a successful sitemap submission. Record actual account outcomes in the conversation after completing those checks.
