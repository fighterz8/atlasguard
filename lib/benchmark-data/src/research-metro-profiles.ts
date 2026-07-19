import {
  calculateMetroProfileChecksum,
  MetroProfileSchema,
  verifyMetroProfile,
} from "@workspace/contracts";
import type { MetroProfile, VerifiedMetroProfile } from "@workspace/contracts";

import {
  COMMUTE_METRIC_REGISTRATION,
  deriveCommuteMetric,
} from "./commute-derivation";
import { CLIMATE_HEAT_METRIC_REGISTRATION } from "./climate-derivation";
import {
  loadAustinResearchMetroProfile,
  loadSanDiegoResearchMetroProfile,
} from "./expanded-research-metro-profiles";
import { acs2024CommuteLaSeattleRawSnapshot } from "./raw/acs1-2024-commute-la-seattle";
import { acs2024RentLaSeattleRawSnapshot } from "./raw/acs1-2024-rent-la-seattle";
import { noaa1991To2020HotDaysLaSeattleRawSnapshot } from "./raw/noaa-1991-2020-hot-days-la-seattle";
import { verifyRawClimateSnapshot } from "./raw-climate-snapshot";
import { verifyRawHousingSnapshot } from "./raw-housing-snapshot";
import { verifyRawCommuteSnapshot } from "./raw-snapshot";

export {
  AUSTIN_RESEARCH_METRO_PROFILE_SHA256,
  loadAustinResearchMetroProfile,
  loadSanDiegoResearchMetroProfile,
  SAN_DIEGO_RESEARCH_METRO_PROFILE_SHA256,
} from "./expanded-research-metro-profiles";

const PROFILE_VERSION = "1.0.0" as const;
const CHECKSUM_PLACEHOLDER = "0".repeat(64);
const LA_SEATTLE_PROFILE_SLUGS = {
  origin: "los-angeles-ca",
  destination: "seattle-wa",
} as const;

export const LOS_ANGELES_RESEARCH_METRO_PROFILE_SHA256 =
  "a7cbf056c5f3eb929b9a9bf67faa43159281afee2d32b5877ad2c237955aac90";
export const SEATTLE_RESEARCH_METRO_PROFILE_SHA256 =
  "e79ddcc0222e06be479d8bfa858f0de590151e214bc134b5ed8e103956a2ad80";

const commuteSnapshot = verifyRawCommuteSnapshot(
  acs2024CommuteLaSeattleRawSnapshot,
);
const climateSnapshot = verifyRawClimateSnapshot(
  noaa1991To2020HotDaysLaSeattleRawSnapshot,
);
const housingSnapshot = verifyRawHousingSnapshot(
  acs2024RentLaSeattleRawSnapshot,
);

type ComparisonSide = "origin" | "destination";

const recordFor = <Record extends { side: ComparisonSide }>(
  records: readonly Record[],
  side: ComparisonSide,
): Record => {
  const record = records.find((candidate) => candidate.side === side);
  if (record === undefined) throw new Error(`Verified snapshot lacks ${side}.`);
  return record;
};

const sourceArtifact = (
  artifact: {
    id: string;
    sourceUrl: string;
    sha256: string;
  },
  rawSnapshotIds: string | readonly string[],
) => ({
  id: artifact.id,
  sourceUrl: artifact.sourceUrl,
  sha256: artifact.sha256,
  rawSnapshotIds:
    typeof rawSnapshotIds === "string" ? [rawSnapshotIds] : [...rawSnapshotIds],
});

const assertSharedGeography = (side: ComparisonSide): void => {
  const commute = recordFor(commuteSnapshot.metros, side);
  const housing = recordFor(housingSnapshot.metros, side);
  const climate = recordFor(climateSnapshot.places, side);
  if (
    housing.cbsaCode !== commute.cbsaCode ||
    housing.cbsaLabel !== commute.cbsaLabel ||
    housing.selectedPlace.city !== commute.selectedPlace.city ||
    housing.selectedPlace.stateCode !== commute.selectedPlace.stateCode
  ) {
    throw new Error(`Verified ${side} ACS geographies disagree.`);
  }
  if (
    climate.selectedPlace.city !== commute.selectedPlace.city ||
    climate.selectedPlace.stateCode !== commute.selectedPlace.stateCode
  ) {
    throw new Error(`Verified ${side} climate place differs from ACS.`);
  }
};

const climateObservationFor = (side: ComparisonSide) => {
  const place = recordFor(climateSnapshot.places, side);
  const stations = place.envelopeStationIds.map((stationId) => {
    const station = climateSnapshot.stations.find(
      (candidate) => candidate.stationId === stationId,
    );
    if (station === undefined) {
      throw new Error(`Verified climate snapshot lacks station ${stationId}.`);
    }
    return station;
  });
  const reference = stations.find(
    (station) => station.stationId === place.referenceStationId,
  );
  if (reference === undefined) {
    throw new Error(`Verified climate snapshot lacks ${side} reference.`);
  }
  const values = stations.map(({ annualDaysAbove90F }) => annualDaysAbove90F);
  const cityArtifacts =
    side === "origin"
      ? [
          climateSnapshot.artifacts.losAngelesUrban,
          climateSnapshot.artifacts.losAngelesAirport,
        ]
      : [
          climateSnapshot.artifacts.seattleUrban,
          climateSnapshot.artifacts.seattleAirport,
        ];

  return {
    reference,
    range: { min: Math.min(...values), max: Math.max(...values) },
    cityArtifacts,
  };
};

const assembleResearchMetroProfile = (
  side: ComparisonSide,
): VerifiedMetroProfile => {
  assertSharedGeography(side);
  const slug = LA_SEATTLE_PROFILE_SLUGS[side];
  const commuteRecord = recordFor(commuteSnapshot.metros, side);
  const housingRecord = recordFor(housingSnapshot.metros, side);
  const commute = deriveCommuteMetric(commuteRecord);
  const climate = climateObservationFor(side);

  if (
    commuteSnapshot.artifacts.acsGeographies.sourceUrl !==
      housingSnapshot.artifacts.acsGeographies.sourceUrl ||
    commuteSnapshot.artifacts.acsGeographies.sha256 !==
      housingSnapshot.artifacts.acsGeographies.sha256
  ) {
    throw new Error("Verified ACS snapshots disagree on geography lineage.");
  }

  const sourceArtifacts = [
    ...Object.values(commuteSnapshot.artifacts).map((artifact) =>
      sourceArtifact(
        artifact,
        artifact.id === commuteSnapshot.artifacts.acsGeographies.id
          ? [commuteSnapshot.id, housingSnapshot.id]
          : commuteSnapshot.id,
      ),
    ),
    sourceArtifact(housingSnapshot.artifacts.b25064, housingSnapshot.id),
    sourceArtifact(climateSnapshot.artifacts.inventory, climateSnapshot.id),
    sourceArtifact(climateSnapshot.artifacts.documentation, climateSnapshot.id),
    ...climate.cityArtifacts.map((artifact) =>
      sourceArtifact(artifact, climateSnapshot.id),
    ),
  ];

  const draft = MetroProfileSchema.parse({
    snapshot: {
      id: `metro-profile.${slug}.2026-07-18`,
      version: PROFILE_VERSION,
      sha256: CHECKSUM_PLACEHOLDER,
      admissionStatus: "research_only",
      rawSnapshots: [
        { id: commuteSnapshot.id, sha256: commuteSnapshot.sha256 },
        { id: climateSnapshot.id, sha256: climateSnapshot.sha256 },
        { id: housingSnapshot.id, sha256: housingSnapshot.sha256 },
      ],
      sourceArtifacts,
      derivation: {
        id: "movewise.metro-profile.compose.verified-observations",
        version: PROFILE_VERSION,
      },
      delineationVersion:
        "OMB Bulletin 23-01 / Census July 2023; NOAA station policy 2026-07-18",
      verifiedOn: "2026-07-18",
    },
    metro: {
      slug,
      cbsaCode: commuteRecord.cbsaCode,
      label: commuteRecord.cbsaLabel,
      selectedPlace: commuteRecord.selectedPlace,
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: commuteSnapshot.artifacts.acsGeographies.id,
        sourceUrl: commuteSnapshot.artifacts.acsGeographies.sourceUrl,
        sourceArtifactSha256: commuteSnapshot.artifacts.acsGeographies.sha256,
        verifiedOn: commuteSnapshot.verifiedOn,
      },
    },
    observations: [
      {
        metricId: COMMUTE_METRIC_REGISTRATION.metricId,
        definition: COMMUTE_METRIC_REGISTRATION.definition,
        role: "decision_input",
        priorityId: COMMUTE_METRIC_REGISTRATION.priorityId,
        unit: COMMUTE_METRIC_REGISTRATION.unit,
        value: commute.meanMinutes,
        source: {
          artifactIds: [
            commuteSnapshot.artifacts.b08013.id,
            commuteSnapshot.artifacts.b08006.id,
          ],
          dataset: commuteSnapshot.dataset,
          publisher: commuteSnapshot.publisher,
          sourceUrl: commuteSnapshot.artifacts.b08013.sourceUrl,
          termsUrl: commuteSnapshot.termsUrl,
        },
        rawSnapshotId: commuteSnapshot.id,
        observationPeriod: commuteSnapshot.observationPeriod,
        releasedOn: commuteSnapshot.releasedOn,
        verifiedOn: commuteSnapshot.verifiedOn,
        geography: {
          kind: "cbsa",
          code: commuteRecord.cbsaCode,
          label: commuteRecord.cbsaLabel,
          matchQuality: "exact",
        },
        transformation: {
          id: COMMUTE_METRIC_REGISTRATION.transformationId,
          version: COMMUTE_METRIC_REGISTRATION.transformationVersion,
          supportedPreferredDirections: [
            COMMUTE_METRIC_REGISTRATION.preferredDirection,
          ],
        },
        materialityPolicy: {
          utilityDeltaBps: COMMUTE_METRIC_REGISTRATION.materialityThresholdBps,
          rationale: COMMUTE_METRIC_REGISTRATION.materialityRationale,
        },
        quality: {
          freshness: "current",
          missingness: "complete",
          marginOfError: commute.marginOfError90Minutes,
          coverageBps: null,
        },
      },
      {
        metricId: CLIMATE_HEAT_METRIC_REGISTRATION.metricId,
        definition: CLIMATE_HEAT_METRIC_REGISTRATION.definition,
        role: "decision_input",
        priorityId: CLIMATE_HEAT_METRIC_REGISTRATION.priorityId,
        unit: CLIMATE_HEAT_METRIC_REGISTRATION.unit,
        value: climate.reference.annualDaysAbove90F,
        source: {
          artifactIds: [
            climateSnapshot.artifacts.documentation.id,
            climateSnapshot.artifacts.inventory.id,
            ...climate.cityArtifacts.map(({ id }) => id),
          ],
          dataset: climateSnapshot.dataset,
          publisher: climateSnapshot.publisher,
          sourceUrl: climateSnapshot.artifacts.documentation.sourceUrl,
          termsUrl: climateSnapshot.termsUrl,
        },
        rawSnapshotId: climateSnapshot.id,
        observationPeriod: climateSnapshot.observationPeriod,
        releasedOn: climateSnapshot.releasedOn,
        verifiedOn: climateSnapshot.verifiedOn,
        geography: {
          kind: "station",
          code: climate.reference.stationId,
          label: climate.reference.name,
          matchQuality: "mapped_proxy",
        },
        transformation: {
          id: CLIMATE_HEAT_METRIC_REGISTRATION.transformationId,
          version: CLIMATE_HEAT_METRIC_REGISTRATION.transformationVersion,
          supportedPreferredDirections: [
            ...CLIMATE_HEAT_METRIC_REGISTRATION.supportedDirections,
          ],
        },
        materialityPolicy: {
          utilityDeltaBps:
            CLIMATE_HEAT_METRIC_REGISTRATION.materialityThresholdBps,
          rationale: CLIMATE_HEAT_METRIC_REGISTRATION.materialityRationale,
        },
        quality: {
          freshness: "current",
          missingness: "complete",
          marginOfError: null,
          selectionUncertainty: {
            kind: "reference_site_range",
            min: climate.range.min,
            max: climate.range.max,
            rationale: climateSnapshot.selectionPolicy.uncertainty,
          },
          coverageBps: null,
        },
      },
      {
        metricId: "housing.median_gross_rent",
        definition:
          "Median gross rent for renter-occupied housing units, including contract rent and ACS-defined tenant-paid utilities.",
        role: "context_only",
        priorityId: null,
        unit: "usd_cents",
        value: housingRecord.medianGrossRentDollars * 100,
        source: {
          artifactIds: [housingSnapshot.artifacts.b25064.id],
          dataset: housingSnapshot.dataset,
          publisher: housingSnapshot.publisher,
          sourceUrl: housingSnapshot.artifacts.b25064.sourceUrl,
          termsUrl: housingSnapshot.termsUrl,
        },
        rawSnapshotId: housingSnapshot.id,
        observationPeriod: housingSnapshot.observationPeriod,
        releasedOn: housingSnapshot.releasedOn,
        verifiedOn: housingSnapshot.verifiedOn,
        geography: {
          kind: "cbsa",
          code: housingRecord.cbsaCode,
          label: housingRecord.cbsaLabel,
          matchQuality: "exact",
        },
        transformation: null,
        materialityPolicy: null,
        quality: {
          freshness: "current",
          missingness: "complete",
          marginOfError: housingRecord.marginOfError90Dollars * 100,
          coverageBps: null,
        },
      },
    ],
  } satisfies MetroProfile);

  const checksum = calculateMetroProfileChecksum(draft);
  const expected =
    side === "origin"
      ? LOS_ANGELES_RESEARCH_METRO_PROFILE_SHA256
      : SEATTLE_RESEARCH_METRO_PROFILE_SHA256;
  if (!/^0+$/.test(expected) && checksum !== expected) {
    throw new Error(
      `Promoted ${slug} metro profile changed without a versioned checksum update: received ${checksum}.`,
    );
  }

  return verifyMetroProfile({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
  });
};

export const loadLosAngelesResearchMetroProfile = () =>
  assembleResearchMetroProfile("origin");

export const loadSeattleResearchMetroProfile = () =>
  assembleResearchMetroProfile("destination");

export const supportedResearchMetroProfiles = Object.freeze([
  loadLosAngelesResearchMetroProfile(),
  loadSeattleResearchMetroProfile(),
  loadAustinResearchMetroProfile(),
  loadSanDiegoResearchMetroProfile(),
] as const);

export type ResearchMetroProfileSlug =
  | "los-angeles-ca"
  | "seattle-wa"
  | "austin-tx"
  | "san-diego-ca";

export const getSupportedResearchMetroProfile = (
  slug: string,
): VerifiedMetroProfile | null =>
  supportedResearchMetroProfiles.find(
    (profile) => profile.metro.slug === slug,
  ) ?? null;

export const getResearchMetroProfileForComparisonSide = (
  side: ComparisonSide,
): VerifiedMetroProfile =>
  supportedResearchMetroProfiles[side === "origin" ? 0 : 1];

export const isSupportedResearchMetroProfileSlug = (
  slug: string,
): slug is ResearchMetroProfileSlug =>
  getSupportedResearchMetroProfile(slug) !== null;
