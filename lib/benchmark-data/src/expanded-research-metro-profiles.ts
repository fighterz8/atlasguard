import {
  calculateMetroProfileChecksum,
  MetroProfileSchema,
  verifyMetroProfile,
} from "@workspace/contracts";
import type { MetroProfile, VerifiedMetroProfile } from "@workspace/contracts";

import { CLIMATE_HEAT_METRIC_REGISTRATION } from "./climate-derivation";
import {
  COMMUTE_METRIC_REGISTRATION,
  deriveCommuteMetric,
} from "./commute-derivation";
import {
  acs2024AustinRawSnapshot,
  acs2024SanDiegoRawSnapshot,
} from "./raw/acs1-2024-austin-san-diego";
import {
  noaaHotDaysAustinRawSnapshot,
  noaaHotDaysSanDiegoRawSnapshot,
} from "./raw/noaa-hot-days-austin-san-diego";
import { verifyRawMetroAcsSnapshot } from "./raw-metro-acs-snapshot";
import { verifyRawMetroClimateSnapshot } from "./raw-metro-climate-snapshot";

const PROFILE_VERSION = "1.0.0" as const;
const CHECKSUM_PLACEHOLDER = "0".repeat(64);

export const AUSTIN_RESEARCH_METRO_PROFILE_SHA256 =
  "ed630549170789e57f5215d06609db9e32a57b88df026933c66a91f5c64c9dc1";
export const SAN_DIEGO_RESEARCH_METRO_PROFILE_SHA256 =
  "8c5c7426d680ec3e0b13c4633719a2c2d26b369b622c70d7b9f4a16c7b8f16f1";

const sourceArtifact = (
  artifact: { id: string; sourceUrl: string; sha256: string },
  rawSnapshotId: string,
) => ({
  id: artifact.id,
  sourceUrl: artifact.sourceUrl,
  sha256: artifact.sha256,
  rawSnapshotIds: [rawSnapshotId],
});

type ExpandedResearchMetroSlug = "austin-tx" | "san-diego-ca";

const assembleExpandedResearchMetroProfile = (
  slug: ExpandedResearchMetroSlug,
): VerifiedMetroProfile => {
  const acs = verifyRawMetroAcsSnapshot(
    slug === "austin-tx"
      ? acs2024AustinRawSnapshot
      : acs2024SanDiegoRawSnapshot,
  );
  const climate = verifyRawMetroClimateSnapshot(
    slug === "austin-tx"
      ? noaaHotDaysAustinRawSnapshot
      : noaaHotDaysSanDiegoRawSnapshot,
  );
  if (acs.metroSlug !== slug || climate.metroSlug !== slug) {
    throw new Error(`Verified raw snapshots do not agree on metro ${slug}.`);
  }

  const reference = climate.stations.find(
    ({ stationId }) => stationId === climate.place.referenceStationId,
  );
  if (reference === undefined) {
    throw new Error(`Verified climate snapshot lacks ${slug} reference.`);
  }
  const climateValues = climate.stations.map(
    ({ annualDaysAbove90F }) => annualDaysAbove90F,
  );
  const commute = deriveCommuteMetric(acs.metro);
  const sourceArtifacts = [
    ...Object.values(acs.artifacts).map((artifact) =>
      sourceArtifact(artifact, acs.id),
    ),
    ...Object.values(climate.artifacts).map((artifact) =>
      sourceArtifact(artifact, climate.id),
    ),
  ];
  const completeness =
    reference.completenessFlag === "S"
      ? {
          classification: "standard" as const,
          rationale:
            "NOAA Standard completeness: at least 24 observed years in the 30-year normal period; missing periods use surrounding-station estimates per NOAA documentation.",
        }
      : {
          classification: "representative" as const,
          rationale:
            "NOAA Representative completeness: 10 to 23 observed years in the 30-year normal period; missing periods use surrounding-station estimates per NOAA documentation.",
        };

  const draft = MetroProfileSchema.parse({
    snapshot: {
      id: `metro-profile.${slug}.2026-07-18`,
      version: PROFILE_VERSION,
      sha256: CHECKSUM_PLACEHOLDER,
      admissionStatus: "research_only",
      rawSnapshots: [
        { id: acs.id, sha256: acs.sha256 },
        { id: climate.id, sha256: climate.sha256 },
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
      cbsaCode: acs.metro.cbsaCode,
      label: acs.metro.cbsaLabel,
      selectedPlace: acs.metro.selectedPlace,
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: acs.artifacts.acsGeographies.id,
        sourceUrl: acs.artifacts.acsGeographies.sourceUrl,
        sourceArtifactSha256: acs.artifacts.acsGeographies.sha256,
        verifiedOn: acs.verifiedOn,
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
          artifactIds: [acs.artifacts.b08013.id, acs.artifacts.b08006.id],
          dataset: acs.dataset,
          publisher: acs.publisher,
          sourceUrl: acs.artifacts.b08013.sourceUrl,
          termsUrl: acs.termsUrl,
        },
        rawSnapshotId: acs.id,
        observationPeriod: acs.observationPeriod,
        releasedOn: acs.releasedOn,
        verifiedOn: acs.verifiedOn,
        geography: {
          kind: "cbsa",
          code: acs.metro.cbsaCode,
          label: acs.metro.cbsaLabel,
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
        value: reference.annualDaysAbove90F,
        source: {
          artifactIds: Object.values(climate.artifacts).map(({ id }) => id),
          dataset: climate.dataset,
          publisher: climate.publisher,
          sourceUrl: climate.artifacts.documentation.sourceUrl,
          termsUrl: climate.termsUrl,
        },
        rawSnapshotId: climate.id,
        observationPeriod: climate.observationPeriod,
        releasedOn: climate.releasedOn,
        verifiedOn: climate.verifiedOn,
        geography: {
          kind: "station",
          code: reference.stationId,
          label: reference.name,
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
            min: Math.min(...climateValues),
            max: Math.max(...climateValues),
            rationale: climate.selectionPolicy.uncertainty,
          },
          sourceCompleteness: {
            classification: completeness.classification,
            observedYears: reference.years,
            normalPeriodYears: 30,
            missingPeriodTreatment: "surrounding_station_estimates",
            rationale: completeness.rationale,
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
        value: acs.metro.medianGrossRentDollars * 100,
        source: {
          artifactIds: [acs.artifacts.b25064.id],
          dataset: acs.dataset,
          publisher: acs.publisher,
          sourceUrl: acs.artifacts.b25064.sourceUrl,
          termsUrl: acs.termsUrl,
        },
        rawSnapshotId: acs.id,
        observationPeriod: acs.observationPeriod,
        releasedOn: acs.releasedOn,
        verifiedOn: acs.verifiedOn,
        geography: {
          kind: "cbsa",
          code: acs.metro.cbsaCode,
          label: acs.metro.cbsaLabel,
          matchQuality: "exact",
        },
        transformation: null,
        materialityPolicy: null,
        quality: {
          freshness: "current",
          missingness: "complete",
          marginOfError: acs.metro.medianGrossRentMarginOfError90Dollars * 100,
          coverageBps: null,
        },
      },
    ],
  } satisfies MetroProfile);

  const checksum = calculateMetroProfileChecksum(draft);
  const expected =
    slug === "austin-tx"
      ? AUSTIN_RESEARCH_METRO_PROFILE_SHA256
      : SAN_DIEGO_RESEARCH_METRO_PROFILE_SHA256;
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

export const loadAustinResearchMetroProfile = () =>
  assembleExpandedResearchMetroProfile("austin-tx");

export const loadSanDiegoResearchMetroProfile = () =>
  assembleExpandedResearchMetroProfile("san-diego-ca");
