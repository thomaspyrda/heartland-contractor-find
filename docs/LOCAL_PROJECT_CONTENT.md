# Local project examples and planning resources

Updated November 21, 2026. This release expands all 1,068 service/town pages without creating new URL variants or changing indexing eligibility.

## Coverage

All 267 listed communities were individually searched for an appropriate official city or permit-office resource. Verified readable sources support links for 136 communities; the other 131 receive no office link and the explicit message that more details about local requirements may need to be found before starting the project. A missing link means a suitable destination was not verified during this research pass, not that the town has no office or requirements.

| State | Communities searched | Verified source linked | No-link fallback |
| --- | --- | --- | --- |
| IA | 99 | 53 | 46 |
| NE | 104 | 64 | 40 |
| MO | 46 | 12 | 34 |
| KS | 18 | 7 | 11 |

## Project writing

`content/project-examples.json` records the 40 reviewed project candidates for each of masonry, hardscaping and concrete, with a short explanation of relevant expertise. Related topics form editorial themes, each with three or four examples and a homeowner discussion prompt. Every candidate appears on at least one local page. Themes are assigned deterministically for stable pages; selected researched locations have deliberate assignments that match their planning guidance.

All local pages have a town-named invitation, related project examples, expertise descriptions, details to share in an inquiry, and permit guidance. Existing retaining-wall pages use three directly related hardscaping examples: new walls, replacement walls and terraced spaces. Candidate projects are starting points for inquiries, not guarantees that a particular contractor can perform every type of work.

The inquiry requirements remain budget range, timing, at least one photo, five-digit ZIP, contact details and a phone-call preference. Existing broad ZIP acceptance and salesperson review remain in effect.

## Source selection and provenance

The four `content/local-research-*.json` files preserve a record for every town: research date, exact readable URL where verified, office identity, guidance, evidence, source URLs, jurisdiction caveat and search query where available. These files are source material for the build, not copied into the public asset directory or loaded by the lead Worker.

Municipal permit and City Hall pages are preferred. Official county pages listing a city's clerk are labeled as city-office contacts. County permit pages are used where jurisdiction is relevant and explained; an official address-based jurisdiction finder is presented as a way to determine the office, not proof that the county handles every property. Contact-only sources are not used to invent permit mandates. No personal staff email addresses are displayed.

Obsolete, failed, raw API and unofficial commercial-directory sources were excluded. Notable checks rejected Bennington's old permit URL in favor of the current .gov page, a stale Humboldt website, and Rock Port's PDF when it could not be reopened reliably. City/village and rural jurisdiction must still be confirmed for the actual work-site address. Links and rules can change after review.

Primary technical background for the general expertise descriptions includes Brick Industry Association masonry-maintenance guidance and American Concrete Institute slab-construction topics. The copy describes skills to discuss with a contractor; it does not supply engineered dimensions, structural designs or installation instructions.

- https://www.gobrick.com/media/file/46-maintenance-of-brick-masonry.pdf
- https://www.concrete.org/store/productdetail.aspx?Format=DOWNLOAD&ItemID=CCS194&Language=English&Units=US_Units

## Verification

`npm run check` builds every route, runs 33 tests and checks SEO structure. The content tests require a research record for every town, three or four valid project examples per local page, expertise for each example, coverage of all 120 reviewed ideas, and no office link on fallback pages. They also verify that expanded research is not imported into the lead Worker.

This is a content improvement, not a certification that each local page has wholly unique expert-authored research. Service explanations and themes remain shared where applicable. Prelaunch noindex is retained; the separate indexing rollout and Cloudflare www redirect identified in the technical audit remain pending.
