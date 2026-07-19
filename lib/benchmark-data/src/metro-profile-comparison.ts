import {
  applyRegisteredUtilityTransform,
  compareCodePoints,
  deriveMetricQualityGrade,
  sha256Hex,
  sortJsonKeys,
} from "@workspace/contracts";
import type {
  MetricEvidence,
  PreferredDirection,
  VerifiedMetroProfile,
} from "@workspace/contracts";

type ProfileObservation = VerifiedMetroProfile["observations"][number];
type DecisionObservation = Extract<
  ProfileObservation,
  { role: "decision_input" }
>;
type ContextObservation = Extract<ProfileObservation, { role: "context_only" }>;

export const cloneJson = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

export const getDecisionProfileObservation = (
  profile: VerifiedMetroProfile,
  metricId: string,
): DecisionObservation => {
  const observation = profile.observations.find(
    (candidate) => candidate.metricId === metricId,
  );
  if (observation === undefined || observation.role !== "decision_input") {
    throw new Error(
      `Metro profile ${profile.metro.slug} lacks decision metric ${metricId}.`,
    );
  }
  return observation;
};

export const getContextProfileObservation = (
  profile: VerifiedMetroProfile,
  metricId: string,
): ContextObservation => {
  const observation = profile.observations.find(
    (candidate) => candidate.metricId === metricId,
  );
  if (observation === undefined || observation.role !== "context_only") {
    throw new Error(
      `Metro profile ${profile.metro.slug} lacks context metric ${metricId}.`,
    );
  }
  return observation;
};

export const getProfileRawSnapshot = (
  profile: VerifiedMetroProfile,
  rawSnapshotId: string,
) => {
  const snapshot = profile.snapshot.rawSnapshots.find(
    (candidate) => candidate.id === rawSnapshotId,
  );
  if (snapshot === undefined) {
    throw new Error(
      `Metro profile ${profile.metro.slug} lacks raw snapshot ${rawSnapshotId}.`,
    );
  }
  return snapshot;
};

export const composeProfileSourceArtifacts = (
  profiles: readonly VerifiedMetroProfile[],
  rawSnapshotId: string,
) => {
  const artifacts = new Map<
    string,
    { id: string; sourceUrl: string; sha256: string }
  >();

  profiles.forEach((profile) => {
    getProfileRawSnapshot(profile, rawSnapshotId);
    profile.snapshot.sourceArtifacts
      .filter((artifact) => artifact.rawSnapshotIds.includes(rawSnapshotId))
      .forEach((artifact) => {
        const normalized = {
          id: artifact.id,
          sourceUrl: artifact.sourceUrl,
          sha256: artifact.sha256,
        };
        const existing = artifacts.get(artifact.id);
        if (
          existing !== undefined &&
          JSON.stringify(existing) !== JSON.stringify(normalized)
        ) {
          throw new Error(
            `Metro profiles disagree on artifact ${artifact.id}.`,
          );
        }
        artifacts.set(artifact.id, normalized);
      });
  });

  return [...artifacts.values()];
};

export const composeProfileArtifactUnion = (
  profiles: readonly VerifiedMetroProfile[],
) => {
  const artifacts = new Map<
    string,
    { id: string; sourceUrl: string; sha256: string }
  >();

  profiles.forEach((profile) => {
    profile.snapshot.sourceArtifacts.forEach((artifact) => {
      const normalized = {
        id: artifact.id,
        sourceUrl: artifact.sourceUrl,
        sha256: artifact.sha256,
      };
      const existing = artifacts.get(artifact.id);
      if (
        existing !== undefined &&
        JSON.stringify(existing) !== JSON.stringify(normalized)
      ) {
        throw new Error(`Metro profiles disagree on artifact ${artifact.id}.`);
      }
      artifacts.set(artifact.id, normalized);
    });
  });

  return [...artifacts.values()].sort((left, right) =>
    compareCodePoints(left.id, right.id),
  );
};

export const composeProfilePairRawSnapshot = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
  id: string,
) => {
  const rawSnapshots = new Map<string, { id: string; sha256: string }>();
  [originProfile, destinationProfile].forEach((profile) => {
    profile.snapshot.rawSnapshots.forEach((snapshot) => {
      const existing = rawSnapshots.get(snapshot.id);
      if (existing !== undefined && existing.sha256 !== snapshot.sha256) {
        throw new Error(
          `Metro profiles disagree on raw snapshot ${snapshot.id}.`,
        );
      }
      rawSnapshots.set(snapshot.id, cloneJson(snapshot));
    });
  });
  const profileRefs = [originProfile, destinationProfile]
    .map((profile) => ({
      slug: profile.metro.slug,
      sha256: profile.snapshot.sha256,
    }))
    .sort((left, right) => compareCodePoints(left.slug, right.slug));
  const rawSnapshotRefs = [...rawSnapshots.values()].sort((left, right) =>
    compareCodePoints(left.id, right.id),
  );

  return {
    id,
    sha256: sha256Hex(
      JSON.stringify(
        sortJsonKeys({ profiles: profileRefs, rawSnapshots: rawSnapshotRefs }),
      ),
    ),
  };
};

const applyTransform = (
  observation: DecisionObservation,
  preferredDirection: PreferredDirection,
  rawValue: number | null,
): number | null => {
  if (
    !observation.transformation.supportedPreferredDirections.includes(
      preferredDirection,
    )
  ) {
    throw new Error(
      `Metric ${observation.metricId} does not support ${preferredDirection}.`,
    );
  }
  const result = applyRegisteredUtilityTransform({
    priorityId: observation.priorityId,
    metricId: observation.metricId,
    transformationId: observation.transformation.id,
    transformationVersion: observation.transformation.version,
    materialityThresholdBps: observation.materialityPolicy.utilityDeltaBps,
    unit: observation.unit,
    preferredDirection,
    rawValue,
  });
  if (result.status !== "ok") {
    throw new Error(
      `Registered transform rejected metro-profile metric ${observation.metricId}.`,
    );
  }
  return result.utilityBps;
};

const utilityUncertainty = (
  observation: DecisionObservation,
  preferredDirection: PreferredDirection,
): number | null => {
  if (observation.value === null) return null;
  const referenceUtility = applyTransform(
    observation,
    preferredDirection,
    observation.value,
  );
  if (referenceUtility === null) return null;

  const selection = observation.quality.selectionUncertainty;
  const endpoints =
    selection !== undefined
      ? [selection.min, selection.max]
      : observation.quality.marginOfError !== null
        ? [
            Math.max(0, observation.value - observation.quality.marginOfError),
            observation.value + observation.quality.marginOfError,
          ]
        : [observation.value];
  return Math.max(
    ...endpoints.map((endpoint) => {
      const utility = applyTransform(observation, preferredDirection, endpoint);
      if (utility === null) {
        throw new Error(
          `Uncertainty endpoint unavailable for ${observation.metricId}.`,
        );
      }
      return Math.abs(utility - referenceUtility);
    }),
  );
};

const assertCompatibleDecisionObservations = (
  origin: DecisionObservation,
  destination: DecisionObservation,
): void => {
  const sharedFields = [
    "metricId",
    "definition",
    "priorityId",
    "unit",
    "transformation",
    "materialityPolicy",
  ] as const;
  sharedFields.forEach((field) => {
    if (JSON.stringify(origin[field]) !== JSON.stringify(destination[field])) {
      throw new Error(
        `Metro profiles disagree on ${origin.metricId} ${field}.`,
      );
    }
  });
  const sourceFields = [
    "dataset",
    "publisher",
    "sourceUrl",
    "termsUrl",
  ] as const;
  sourceFields.forEach((field) => {
    if (origin.source[field] !== destination.source[field]) {
      throw new Error(
        `Metro profiles disagree on ${origin.metricId} source ${field}.`,
      );
    }
  });
  const dateFields = ["observationPeriod", "releasedOn"] as const;
  dateFields.forEach((field) => {
    if (origin[field] !== destination[field]) {
      throw new Error(
        `Metro profiles disagree on ${origin.metricId} ${field}.`,
      );
    }
  });
};

export const composeMetricEvidenceFromProfiles = (input: {
  originProfile: VerifiedMetroProfile;
  destinationProfile: VerifiedMetroProfile;
  metricId: string;
  evidenceId: string;
  preferredDirection: PreferredDirection;
  snapshotVersion: string;
  snapshotSha256: string;
  comparisonVerifiedOn?: string;
}): MetricEvidence => {
  const origin = getDecisionProfileObservation(
    input.originProfile,
    input.metricId,
  );
  const destination = getDecisionProfileObservation(
    input.destinationProfile,
    input.metricId,
  );
  assertCompatibleDecisionObservations(origin, destination);

  const originUtilityBps = applyTransform(
    origin,
    input.preferredDirection,
    origin.value,
  );
  const destinationUtilityBps = applyTransform(
    destination,
    input.preferredDirection,
    destination.value,
  );
  const originUncertaintyBps = utilityUncertainty(
    origin,
    input.preferredDirection,
  );
  const destinationUncertaintyBps = utilityUncertainty(
    destination,
    input.preferredDirection,
  );
  const missingness =
    origin.value !== null && destination.value !== null
      ? "complete"
      : origin.value !== null || destination.value !== null
        ? "partial"
        : "unavailable";
  const coverageBps =
    origin.quality.coverageBps === null ||
    destination.quality.coverageBps === null
      ? null
      : Math.min(origin.quality.coverageBps, destination.quality.coverageBps);
  const freshnessOrder = ["current", "stale", "unknown"] as const;
  const freshness =
    freshnessOrder[
      Math.max(
        freshnessOrder.indexOf(origin.quality.freshness),
        freshnessOrder.indexOf(destination.quality.freshness),
      )
    ];
  const grade = deriveMetricQualityGrade({
    freshness,
    missingness,
    coverageBps,
    originGeographyMatch: origin.geography.matchQuality,
    destinationGeographyMatch: destination.geography.matchQuality,
    originUncertaintyBps,
    destinationUncertaintyBps,
  });
  const originSelection = origin.quality.selectionUncertainty;
  const destinationSelection = destination.quality.selectionUncertainty;
  if (
    (originSelection === undefined) !==
    (destinationSelection === undefined)
  ) {
    throw new Error(
      `Metro profiles disagree on ${origin.metricId} selection uncertainty.`,
    );
  }
  if (
    originSelection !== undefined &&
    destinationSelection !== undefined &&
    originSelection.rationale !== destinationSelection.rationale
  ) {
    throw new Error(
      `Metro profiles disagree on ${origin.metricId} selection-uncertainty rationale.`,
    );
  }

  return {
    kind: "benchmark_metric",
    id: input.evidenceId,
    metricId: origin.metricId,
    definition: origin.definition,
    priorityId: origin.priorityId,
    unit: origin.unit,
    originValue: origin.value,
    destinationValue: destination.value,
    deltaValue:
      origin.value === null || destination.value === null
        ? null
        : destination.value - origin.value,
    source: {
      dataset: origin.source.dataset,
      publisher: origin.source.publisher,
      sourceUrl: origin.source.sourceUrl,
      termsUrl: origin.source.termsUrl,
    },
    observationPeriod: origin.observationPeriod,
    releasedOn: origin.releasedOn,
    verifiedOn: input.comparisonVerifiedOn ?? origin.verifiedOn,
    geographies: {
      origin: cloneJson(origin.geography),
      destination: cloneJson(destination.geography),
    },
    snapshotVersion: input.snapshotVersion,
    snapshotSha256: input.snapshotSha256,
    transformation: {
      id: origin.transformation.id,
      version: origin.transformation.version,
      preferredDirection: input.preferredDirection,
      outputs: {
        originUtilityBps,
        destinationUtilityBps,
        originUncertaintyBps,
        destinationUncertaintyBps,
      },
    },
    materialityPolicy: cloneJson(origin.materialityPolicy),
    quality: {
      freshness,
      missingness,
      marginOfError:
        origin.quality.marginOfError === null &&
        destination.quality.marginOfError === null
          ? null
          : {
              origin: origin.quality.marginOfError,
              destination: destination.quality.marginOfError,
            },
      ...(originSelection !== undefined && destinationSelection !== undefined
        ? {
            selectionUncertainty: {
              kind: "reference_site_range" as const,
              origin: { min: originSelection.min, max: originSelection.max },
              destination: {
                min: destinationSelection.min,
                max: destinationSelection.max,
              },
              rationale: originSelection.rationale,
            },
          }
        : {}),
      coverageBps,
      grade: { value: grade, policyVersion: "1.0.0" },
    },
  };
};
