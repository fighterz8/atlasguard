import { z } from "zod/v4";

export const CLIMATE_RATING_VERSION = "1.0.0" as const;

const ClimateTraitValueSchema = z.number().int().min(1).max(5);

const ResearchMetroClimateRatingSchema = z
  .object({
    metroSlug: z.enum([
      "los-angeles-ca",
      "seattle-wa",
      "austin-tx",
      "san-diego-ca",
    ]),
    version: z.literal(CLIMATE_RATING_VERSION),
    scope: z.literal("selected_city_generalization"),
    researchedOn: z.literal("2026-07-18"),
    summary: z.string().trim().min(1).max(240),
    traits: z
      .object({
        summerHeat: ClimateTraitValueSchema,
        winterCold: ClimateTraitValueSchema,
        humidity: ClimateTraitValueSchema,
        raininess: ClimateTraitValueSchema,
        sunshine: ClimateTraitValueSchema,
      })
      .strict(),
    sources: z
      .array(
        z
          .object({
            title: z.string().trim().min(1),
            url: z.string().url(),
          })
          .strict(),
      )
      .min(1),
    limitation: z.literal(
      "Coarse selected-city climate traits for comparison; not a forecast, neighborhood rating, comfort judgment, or official statistical measure.",
    ),
  })
  .strict();

export type ResearchMetroClimateRating = z.infer<
  typeof ResearchMetroClimateRatingSchema
>;

const deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value;
};

const common = {
  version: CLIMATE_RATING_VERSION,
  scope: "selected_city_generalization",
  researchedOn: "2026-07-18",
  limitation:
    "Coarse selected-city climate traits for comparison; not a forecast, neighborhood rating, comfort judgment, or official statistical measure.",
} as const;

const ratingInputs = [
  {
    ...common,
    metroSlug: "los-angeles-ca",
    summary:
      "Warm to hot, mostly dry, and very sunny, with mild winters and meaningful coastal-to-inland variation.",
    traits: {
      summerHeat: 4,
      winterCold: 1,
      humidity: 2,
      raininess: 2,
      sunshine: 5,
    },
    sources: [
      {
        title: "Climate of Los Angeles",
        url: "https://en.wikipedia.org/wiki/Climate_of_Los_Angeles",
      },
      {
        title: "Weather in Los Angeles",
        url: "https://www.intrepidtravel.com/us/united-states/los-angeles/weather-in-los-angeles",
      },
    ],
  },
  {
    ...common,
    metroSlug: "seattle-wa",
    summary:
      "Mild summers and cool, wet winters, with frequent cloud cover and a relatively dry summer season.",
    traits: {
      summerHeat: 2,
      winterCold: 3,
      humidity: 4,
      raininess: 4,
      sunshine: 2,
    },
    sources: [
      {
        title: "Climate of Seattle",
        url: "https://en.wikipedia.org/wiki/Climate_of_Seattle",
      },
      {
        title: "Seattle climate overview",
        url: "https://www.climatestotravel.com/climate/united-states/seattle",
      },
    ],
  },
  {
    ...common,
    metroSlug: "austin-tx",
    summary:
      "Very hot, humid summers, short mild winters, regular sunshine, and rainfall spread across the year.",
    traits: {
      summerHeat: 5,
      winterCold: 2,
      humidity: 4,
      raininess: 3,
      sunshine: 4,
    },
    sources: [
      {
        title: "Austin climate overview",
        url: "https://utaustinportugal.org/austin/",
      },
      {
        title: "Austin weather year round",
        url: "https://austinrelocationguide.com/austin-weather-year-round",
      },
    ],
  },
  {
    ...common,
    metroSlug: "san-diego-ca",
    summary:
      "Mild, dry, and sunny through most of the year, with cool coastal summers, very mild winters, and seasonal marine clouds.",
    traits: {
      summerHeat: 2,
      winterCold: 1,
      humidity: 3,
      raininess: 1,
      sunshine: 5,
    },
    sources: [
      {
        title: "Climate of San Diego",
        url: "https://en.wikipedia.org/wiki/Climate_of_San_Diego",
      },
      {
        title: "San Diego weather and climate",
        url: "https://www.tripsavvy.com/san-diego-weather-and-climate-1478927",
      },
    ],
  },
] as const;

export const researchMetroClimateRatings = deepFreeze(
  ratingInputs.map((input) => ResearchMetroClimateRatingSchema.parse(input)),
);

export const getResearchMetroClimateRating = (
  metroSlug: string,
): ResearchMetroClimateRating | null =>
  researchMetroClimateRatings.find(
    (rating) => rating.metroSlug === metroSlug,
  ) ?? null;

const climateTraitDefinitions = {
  summerHeat: {
    more: "hotter summers",
    less: "milder summers",
    similar: "similar summer heat",
  },
  winterCold: {
    more: "colder winters",
    less: "milder winters",
    similar: "similar winter cold",
  },
  humidity: {
    more: "more humid",
    less: "less humid",
    similar: "similar humidity",
  },
  raininess: {
    more: "wetter",
    less: "drier",
    similar: "similar raininess",
  },
  sunshine: {
    more: "sunnier",
    less: "less sunny",
    similar: "similar sunshine",
  },
} as const;

export type ClimateTraitId = keyof typeof climateTraitDefinitions;

const climateTraitOrder = [
  "summerHeat",
  "winterCold",
  "humidity",
  "raininess",
  "sunshine",
] as const satisfies readonly ClimateTraitId[];

const comparisonDescription = (
  traitId: ClimateTraitId,
  delta: number,
): string => {
  const definition = climateTraitDefinitions[traitId];
  if (delta === 0) return definition.similar;
  const magnitude = Math.abs(delta);
  const prefix =
    magnitude === 1 ? "slightly " : magnitude === 2 ? "noticeably " : "much ";
  return `${prefix}${delta > 0 ? definition.more : definition.less}`;
};

export const compareResearchMetroClimateRatings = (
  originSlug: string,
  destinationSlug: string,
) => {
  if (originSlug === destinationSlug) return null;
  const origin = getResearchMetroClimateRating(originSlug);
  const destination = getResearchMetroClimateRating(destinationSlug);
  if (origin === null || destination === null) return null;

  return deepFreeze({
    ratingVersion: CLIMATE_RATING_VERSION,
    originSlug: origin.metroSlug,
    destinationSlug: destination.metroSlug,
    traits: climateTraitOrder.map((traitId) => {
      const originValue = origin.traits[traitId];
      const destinationValue = destination.traits[traitId];
      const delta = destinationValue - originValue;
      return {
        traitId,
        originValue,
        destinationValue,
        delta,
        direction:
          delta === 0
            ? ("similar" as const)
            : delta > 0
              ? ("more" as const)
              : ("less" as const),
        description: comparisonDescription(traitId, delta),
      };
    }),
  });
};
