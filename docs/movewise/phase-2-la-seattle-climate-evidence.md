# Phase 2 LA -> Seattle NOAA hot-day evidence

Status: research-only evidence slice

Verified: 2026-07-18

User-facing eligible: no

## Purpose

This slice adds one explicit climate preference to the fixed Los Angeles -> Seattle research path: whether the user prefers fewer or more days above 90°F. It uses frozen NOAA 1991-2020 Climate Normals and never calls NOAA at request time.

It does not claim to model climate generally, personal heat tolerance, health risk, future climate, a neighborhood, or an entire metro. The transformation and materiality threshold remain research calibration, not a consumer recommendation model.

## Metric and preference contract

- NOAA variable: `ANN-TMAX-AVGNDS-GRTH090`.
- Definition: normal annual number of days with maximum temperature greater than 90°F.
- Unit: days per year.
- Priority: `climate_heat`.
- Supported directions: `lower` (fewer hot days) and `higher` (more hot days).
- Transformation: `climate_heat.utility@1.0.0`.
- Research threshold: 500 utility basis points.
- “Does not matter” is encoded as weight zero and cannot become a driver or tradeoff.

The transform remains the Phase 0 monotonic research transform. Adding official evidence does not silently promote its calibration status.

## Station policy

NOAA publishes station normals, not a CBSA hot-day estimate. MoveWise therefore uses a two-station selected-city envelope on each side:

1. A Standard-completeness urban station named for the selected city is the reference value.
2. A Standard-completeness primary-airport station named for the selected city is the contrast value.
3. The displayed station range is the minimum and maximum of those two values.
4. Transformed uncertainty is the maximum absolute utility difference between the reference station and either range endpoint.

This is a curated selected-city proxy, not a claim that either station is representative of the metro. The climate evidence uses `matchQuality: mapped_proxy`, coverage is `null`, and the quality grade is consequently `limited`.

| Side        | Urban reference                                 | Airport contrast                                     | Normal annual days >90°F | Station range |
| ----------- | ----------------------------------------------- | ---------------------------------------------------- | -----------------------: | ------------: |
| Los Angeles | `USW00093134` — Los Angeles Downtown USC Campus | `USW00023174` — Los Angeles International Airport    |                     25.6 |      4.8-25.6 |
| Seattle     | `USW00094290` — Seattle Sand Point WSFO         | `USW00024233` — Seattle-Tacoma International Airport |                      2.1 |       2.1-3.8 |

All four metric values have a blank measurement flag and NOAA completeness flag `S` (Standard). NOAA defines Standard as meeting WMO availability standards for 24 or more years, with missing months filled from surrounding stations where available. The values use 26, 26, 28, and 30 years respectively.

## Preference-specific outputs

For fewer hot days:

| Side        | Reference utility | Selection uncertainty |
| ----------- | ----------------: | --------------------: |
| Los Angeles |         8,440 bps |             1,560 bps |
| Seattle     |        10,000 bps |                 0 bps |

For more hot days, utilities reverse to 1,560 and 0 bps while the selection uncertainties remain 1,560 and 0 bps. The destination-minus-origin utility delta is therefore +1,560 bps for fewer hot days and -1,560 bps for more hot days.

The generic benchmark verifier independently transforms both selection-range endpoints and rejects any declared uncertainty that is not the maximum endpoint departure. Re-signing a fabricated range does not cross the trust boundary.

## Frozen official artifacts

| Artifact                      | Official URL                                                                                                  | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 30-year station inventory     | `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt`                      | `c9f5f0f3c38b89410b75d03267bf05fb53f6ba4b6623d22411be2df2bfe01bdb` |
| Annual/Seasonal documentation | `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/Normals_ANN_Documentation_1991-2020.pdf` | `5fd15ef9f513969dc360150341dfc99e43d6ffcc79ea544cd929376d9e125d15` |
| Los Angeles urban station     | `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00093134.csv`                      | `decefbf60a10efa40215278aedaab955f75b43c11ef27c72bc5239de1f9717f4` |
| Los Angeles airport station   | `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00023174.csv`                      | `a40a04b38ac76e3a5db75703cc1049dd3abe57bdccb3580b360ff42ab9a239ec` |
| Seattle urban station         | `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00094290.csv`                      | `2872fdaf785a5bdae06a423b04b4cd55b9620491e41f1cc419fdbf07d1ebb08c` |
| Seattle airport station       | `https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00024233.csv`                      | `95345733f5237ceaa2c75058f82863ca6c70c960adef8b6cb34620cddb917c86` |

NOAA dataset attribution: National Centers for Environmental Information, U.S. Climate Normals 1991-2020 Annual/Seasonal. NOAA disclaimer: `https://www.weather.gov/disclaimer`.

## Verification and integrity

- Raw climate snapshot SHA-256: `81685716052413640b9808048e200de0e2ad4aa9483a41bfca4c7c3c29ff5083`.
- Composite ACS + NOAA raw reference SHA-256: `e55acaa5e0a5a0db3cb3db221a5f48bbdd04601d5c37b5c44feee85735368008`.
- Fewer-hot-days comparison SHA-256: `f78e5eb633e69d4e9471116d3b8db04f43fe5704189e54be4f9b741d6d508ddf`.
- More-hot-days comparison SHA-256: `e31415468b2de1c9acc9c5ca2a8fdbd4fc1f329d56df09eb17563ae945a305d2`.
- `pnpm --filter @workspace/scripts run verify:movewise-sources` re-downloads and hashes all eleven Census/NOAA artifacts, verifies both CBSA rows and ten ACS values, extracts the four NOAA station records by named columns, and checks station identity/coordinates against the official inventory.
- Runtime benchmark loading is offline and checksum-bound for either supported preference direction.

## Deliberately excluded

- Additional climate dimensions such as cold, rain, snow, humidity, smoke, or seasonality.
- A single “climate score.”
- Gridded interpolation, population weighting, metro expansion, or neighborhood claims.
- Health or safety advice, climate-change projections, and personalized comfort thresholds.
- Live NOAA requests, public evaluation API activation, persistence, accounts, maps, or AI/provider work.
