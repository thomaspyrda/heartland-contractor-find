# Geographic coverage directory

The user selected a 60-mile geographic radius centered on Farragut, Iowa, and authorized all ZIP areas with any overlap, including their associated communities. Northeast Kansas is explicitly included alongside Iowa, Nebraska, and Missouri. Sales decides actual job acceptance; there is no form distance or ZIP allowlist rejection.

## Reproducible selection

Run `python scripts/research-coverage.py [optional-cache-directory]` with `shapely` and `pyproj` installed. This is an offline research refresh, not a build or deployment dependency. The ordinary build uses the committed JSON.

- Origin: 2025 Census incorporated-place center for Farragut (GEOID 1926985), latitude 40.7200993, longitude -95.480798.
- Project Census polygon candidates to a WGS84 azimuthal equidistant projection centered on that point.
- Select any 2020 ZIP Code Tabulation Area geometry intersecting a 96,560.64-meter circle. The circle is approximated with 2,880 edges. Do not use ZIP center-point distance to exclude edge areas.
- Include 2025 Census incorporated places and CDPs touching selected ZIP polygons, plus GeoNames postal community names associated with selected ZIP codes. A town center can lie outside the circle while its ZIP areas overlap it.
- Include additional postal codes with no national Census ZCTA when associated with an already included town. These are separately labeled as additional postal/contact codes, not represented as polygon overlaps.
- Merge punctuation/spacing variants within a state (for example Mc Clelland and McClelland). Keep same-name towns in different states distinct.

Snapshot: 257 intersecting ZCTAs, 26 additional postal codes, 267 unique community names, 1,068 service/community routes. Four service categories are retained: concrete, masonry, hardscaping, retaining walls.

ZIP maps are approximate representations, not official USPS delivery boundaries. Postal references can be incomplete or lag changes. Do not advertise guaranteed exhaustive live USPS coverage. No directory omission prevents submitting a lead.

## Sources and attribution

- U.S. Census Bureau ACS 2025 TIGERweb service: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2025/MapServer
- Layers 2 (2020 ZCTA polygons), 28 (incorporated places), 30 (CDPs).
- National ZCTA reference: https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip
- GeoNames postal reference: https://download.geonames.org/export/zip/US.zip ; https://www.geonames.org/
- GeoNames license: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/ . Public attribution appears on the service area directory. The source data have been filtered, joined, and reformatted.

## Publishing and content

The searchable directory links to existing static service/location routes. Local pages contain recorded ZIP references, the community reference distance, nearby communities, service-specific project questions, and the same open-ended inquiry flow. Preserve the six previously researched municipal-resource sections. No generated town page invents local soil, permits, completed work, reviews, or contractor offices.

Indexing remains disabled by default. The directory and routes are available for review; these new pages have not had individual municipal research. Refine local content before enabling broad search indexing. Location pages are not a guarantee of availability or ranking.
