# MoveWise Phase 2C Lightweight Climate Comparisons

**Status:** Implemented internally; not publicly selectable

**Date:** 2026-07-18

## Product decision

Climate is presented as a small set of intuitive city traits rather than a precision-heavy station benchmark. Most users need to understand whether a destination is generally hotter, colder, wetter, more humid, or sunnier—not inspect station-completeness codes or statistical uncertainty.

The earlier NOAA records remain preserved as verified historical evidence. They are not deleted or rewritten. This layer is a separate, versioned product interpretation based on ordinary climate research and deliberately does not carry raw-artifact hashes, station flags, or margins of error.

## Rating vocabulary

Each selected city has five ordinal traits on a 1–5 scale:

| Trait       | 1 means                    | 5 means           |
| ----------- | -------------------------- | ----------------- |
| Summer heat | cool or consistently mild  | extremely hot     |
| Winter cold | very mild winters          | very cold winters |
| Humidity    | generally dry-feeling      | very humid        |
| Raininess   | generally dry              | frequently rainy  |
| Sunshine    | often cloudy / limited sun | very sunny        |

These values are coarse comparison aids, not official meteorological measurements. There is intentionally no overall climate score or “best climate.” A user who likes heat should interpret the same difference differently from a user who avoids it.

## First-cohort ratings

| Metro       | Summer heat | Winter cold | Humidity | Raininess | Sunshine | Short reading                                                                                        |
| ----------- | ----------: | ----------: | -------: | --------: | -------: | ---------------------------------------------------------------------------------------------------- |
| Los Angeles |           4 |           1 |        2 |         2 |        5 | Warm to hot, mostly dry, very sunny, mild winters, with meaningful coastal-to-inland variation.      |
| Seattle     |           2 |           3 |        4 |         4 |        2 | Mild summers and cool, wet winters, with frequent cloud cover and a relatively dry summer season.    |
| Austin      |           5 |           2 |        4 |         3 |        4 | Very hot, humid summers, short mild winters, regular sunshine, and rainfall spread across the year.  |
| San Diego   |           2 |           1 |        3 |         1 |        5 | Mild, dry, and sunny through most of the year, with cool coastal summers and seasonal marine clouds. |

Research notes use accessible overview sources rather than requiring a government data pipeline:

- Los Angeles: [Climate of Los Angeles](https://en.wikipedia.org/wiki/Climate_of_Los_Angeles) and [Intrepid’s weather overview](https://www.intrepidtravel.com/us/united-states/los-angeles/weather-in-los-angeles).
- Seattle: [Climate of Seattle](https://en.wikipedia.org/wiki/Climate_of_Seattle) and [Climates to Travel’s overview](https://www.climatestotravel.com/climate/united-states/seattle).
- Austin: [UT Austin Portugal’s city overview](https://utaustinportugal.org/austin/) and [Austin Relocation Guide’s weather overview](https://austinrelocationguide.com/austin-weather-year-round).
- San Diego: [Climate of San Diego](https://en.wikipedia.org/wiki/Climate_of_San_Diego) and [TripSavvy’s weather overview](https://www.tripsavvy.com/san-diego-weather-and-climate-1478927).

The code records the research date, source links, selected-city scope, and the limitation that these ratings are not forecasts, neighborhood ratings, comfort judgments, or official statistics.

## Internal comparison generation

Four promoted metro profiles generate 12 ordered comparisons (`4 × 3`). Each internal summary includes:

- the origin and destination metro-profile checksums;
- exact ACS mean-commute values and destination-minus-origin difference;
- exact ACS median-gross-rent context and difference, still marked `context_only`;
- the climate-rating version, both city summaries, research links, and five directional differences.

Climate differences use plain descriptions such as “slightly hotter summers,” “much sunnier,” or “similar humidity.” They never produce a winner, recommendation, or score. Reversing a route reverses every numeric and ordinal difference.

## Activation boundary

Internal comparability does not make a route selectable. The existing public catalog, Wizard, Results, and research API still support only Los Angeles→Seattle. Austin, San Diego, reverse routes, and other combinations continue to fail closed at the public resolver.

This slice does not implement the 1–100 MoveWise Score, user preference weights for the new climate traits, adaptive questions, persistence, Results redesign, or deployment. Those remain separate product and calibration gates.

## Implementation references

- `lib/benchmark-data/src/climate-ratings.ts`
- `lib/benchmark-data/src/climate-ratings.test.ts`
- `lib/benchmark-data/src/research-metro-comparisons.ts`
- `lib/benchmark-data/src/research-metro-comparisons.test.ts`
- `lib/benchmark-data/src/supported-research-locations.ts`
