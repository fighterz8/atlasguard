import {
  COMMUTE_METRIC_REGISTRATION,
  deriveCommuteMetric,
} from "./commute-derivation";
import {
  acs2024AustinRawSnapshot,
  acs2024SanDiegoRawSnapshot,
} from "./raw/acs1-2024-austin-san-diego";
import { acs2024CommuteLaSeattleRawSnapshot } from "./raw/acs1-2024-commute-la-seattle";
import { verifyRawMetroAcsSnapshot } from "./raw-metro-acs-snapshot";
import { verifyRawCommuteSnapshot } from "./raw-snapshot";

type MobilitySourceRecord = Readonly<{
  slug: string;
  cbsaCode: string;
  cbsaLabel: string;
  workers16AndOver: Readonly<{
    estimate: number;
    marginOfError90: number;
  }>;
  workedFromHome: Readonly<{
    estimate: number;
    marginOfError90: number;
  }>;
  aggregateTravelTimeMinutes: Readonly<{
    estimate: number;
    marginOfError90: number;
  }>;
}>;

export type ResearchMetroMobilityGuidance = Readonly<{
  version: "acs1-2024-mobility-v1";
  origin: Readonly<{
    meanCommuteMinutes: number;
    displayMeanCommuteMinutes: number;
    marginOfError90Minutes: number;
    workFromHomeShareBps: number;
    commuteAwayShareBps: number;
  }>;
  destination: Readonly<{
    meanCommuteMinutes: number;
    displayMeanCommuteMinutes: number;
    marginOfError90Minutes: number;
    workFromHomeShareBps: number;
    commuteAwayShareBps: number;
  }>;
  commuteDifferenceMinutes: number;
  displayCommuteDifferenceMinutes: number;
  workFromHomeShareDifferenceBps: number;
  commuteAwayShareDifferenceBps: number;
  method: string;
  boundary: string;
  source: Readonly<{
    publisher: string;
    commuteTableId: "B08013";
    workerModeTableId: "B08006";
    observationPeriod: "2024 ACS 1-year estimates";
  }>;
}>;

const laSeattle = verifyRawCommuteSnapshot(acs2024CommuteLaSeattleRawSnapshot);
const austin = verifyRawMetroAcsSnapshot(acs2024AustinRawSnapshot);
const sanDiego = verifyRawMetroAcsSnapshot(acs2024SanDiegoRawSnapshot);

const roundOneDecimal = (value: number) =>
  Math.round((value + Number.EPSILON) * 10) / 10;

const basisPointShare = (numerator: number, denominator: number) =>
  Math.round((numerator / denominator) * 10_000);

const recordFor = (
  record: MobilitySourceRecord,
): ResearchMetroMobilityGuidance["origin"] => {
  const commute = deriveCommuteMetric(record);
  const workFromHomeShareBps = basisPointShare(
    record.workedFromHome.estimate,
    record.workers16AndOver.estimate,
  );
  return Object.freeze({
    meanCommuteMinutes: commute.meanMinutes,
    displayMeanCommuteMinutes: commute.displayMeanMinutes,
    marginOfError90Minutes: commute.marginOfError90Minutes,
    workFromHomeShareBps,
    commuteAwayShareBps: 10_000 - workFromHomeShareBps,
  });
};

const mobilityRecords = Object.freeze([
  {
    slug: "los-angeles-ca",
    ...laSeattle.metros.find(({ side }) => side === "origin")!,
  },
  {
    slug: "seattle-wa",
    ...laSeattle.metros.find(({ side }) => side === "destination")!,
  },
  {
    slug: "austin-tx",
    ...austin.metro,
  },
  {
    slug: "san-diego-ca",
    ...sanDiego.metro,
  },
] satisfies MobilitySourceRecord[]);

export const getResearchMetroMobilityGuidance = (
  originSlug: string,
  destinationSlug: string,
): ResearchMetroMobilityGuidance | null => {
  if (originSlug === destinationSlug) return null;
  const originRecord = mobilityRecords.find(
    (record) => record.slug === originSlug,
  );
  const destinationRecord = mobilityRecords.find(
    (record) => record.slug === destinationSlug,
  );
  if (originRecord === undefined || destinationRecord === undefined) {
    return null;
  }

  const origin = recordFor(originRecord);
  const destination = recordFor(destinationRecord);
  const commuteDifferenceMinutes =
    destination.meanCommuteMinutes - origin.meanCommuteMinutes;

  return Object.freeze({
    version: "acs1-2024-mobility-v1",
    origin,
    destination,
    commuteDifferenceMinutes,
    displayCommuteDifferenceMinutes: roundOneDecimal(commuteDifferenceMinutes),
    workFromHomeShareDifferenceBps:
      destination.workFromHomeShareBps - origin.workFromHomeShareBps,
    commuteAwayShareDifferenceBps:
      destination.commuteAwayShareBps - origin.commuteAwayShareBps,
    method:
      "Compares ACS mean commute time for non-home workers and the share of workers who commute away from home.",
    boundary:
      "This is metro-level daily-life context. Check the actual route, transit options, and car needs for the household.",
    source: Object.freeze({
      publisher: "U.S. Census Bureau",
      commuteTableId: "B08013",
      workerModeTableId: "B08006",
      observationPeriod: "2024 ACS 1-year estimates",
    }),
  });
};
