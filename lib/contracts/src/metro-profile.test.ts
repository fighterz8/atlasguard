import { describe, expect, it } from "vitest";

import {
  calculateMetroProfileChecksum,
  MetroProfileChecksumMismatchError,
  MetroProfileSchema,
  serializeMetroProfileForChecksum,
  verifyMetroProfile,
} from "./metro-profile";

const EMPTY_SHA256 = "0".repeat(64);
const SOURCE_SHA256 = "1".repeat(64);
const RAW_SHA256 = "2".repeat(64);

const cloneJson = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const createProfile = () => {
  const input = {
    snapshot: {
      id: "metro-profile.los-angeles-ca.2026-07-18",
      version: "1.0.0",
      sha256: EMPTY_SHA256,
      admissionStatus: "research_only",
      rawSnapshots: [
        { id: "raw.z-context", sha256: RAW_SHA256 },
        { id: "raw.a-decision", sha256: RAW_SHA256 },
      ],
      sourceArtifacts: [
        {
          id: "source.z-context",
          sourceUrl: "https://example.com/context",
          sha256: SOURCE_SHA256,
          rawSnapshotIds: ["raw.z-context"],
        },
        {
          id: "source.a-decision",
          sourceUrl: "https://example.com/decision",
          sha256: SOURCE_SHA256,
          rawSnapshotIds: ["raw.a-decision"],
        },
      ],
      derivation: { id: "metro-profile.assembler", version: "1.0.0" },
      delineationVersion: "OMB Bulletin 23-01",
      verifiedOn: "2026-07-18",
    },
    metro: {
      slug: "los-angeles-ca",
      cbsaCode: "31080",
      label: "Los Angeles-Long Beach-Anaheim, CA",
      selectedPlace: { city: "Los Angeles", stateCode: "CA" },
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "source.a-decision",
        sourceUrl: "https://example.com/decision",
        sourceArtifactSha256: SOURCE_SHA256,
        verifiedOn: "2026-07-18",
      },
    },
    observations: [
      {
        metricId: "housing.median_gross_rent",
        definition: "Median monthly gross rent in integer US-dollar cents.",
        role: "context_only",
        priorityId: null,
        unit: "usd_cents",
        value: 211_400,
        source: {
          artifactIds: ["source.z-context"],
          dataset: "Example context data",
          publisher: "Example publisher",
          sourceUrl: "https://example.com/context",
          termsUrl: null,
        },
        rawSnapshotId: "raw.z-context",
        observationPeriod: "2024",
        releasedOn: "2025-12-01",
        verifiedOn: "2026-07-18",
        geography: {
          kind: "cbsa",
          code: "31080",
          label: "Los Angeles-Long Beach-Anaheim, CA",
          matchQuality: "exact",
        },
        transformation: null,
        materialityPolicy: null,
        quality: {
          freshness: "current",
          missingness: "complete",
          marginOfError: 1_300,
          coverageBps: 10_000,
        },
      },
      {
        metricId: "commute.mean_travel_time",
        definition: "Mean one-way travel time to work in minutes.",
        role: "decision_input",
        priorityId: "commute_time",
        unit: "minutes",
        value: 30.8,
        source: {
          artifactIds: ["source.a-decision"],
          dataset: "Example decision data",
          publisher: "Example publisher",
          sourceUrl: "https://example.com/decision",
          termsUrl: null,
        },
        rawSnapshotId: "raw.a-decision",
        observationPeriod: "2024",
        releasedOn: "2025-12-01",
        verifiedOn: "2026-07-18",
        geography: {
          kind: "cbsa",
          code: "31080",
          label: "Los Angeles-Long Beach-Anaheim, CA",
          matchQuality: "exact",
        },
        transformation: {
          id: "commute.mean_travel_time.utility",
          version: "1.0.0",
          supportedPreferredDirections: ["lower"],
        },
        materialityPolicy: {
          utilityDeltaBps: 250,
          rationale: "A five-minute difference is decision-relevant.",
        },
        quality: {
          freshness: "current",
          missingness: "complete",
          marginOfError: null,
          coverageBps: 10_000,
        },
      },
    ],
  } as const;

  const parsed = MetroProfileSchema.parse(input);
  parsed.snapshot.sha256 = calculateMetroProfileChecksum(parsed);
  return parsed;
};

const issuePaths = (input: unknown): string[] => {
  const result = MetroProfileSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
};

describe("MetroProfileSchema", () => {
  it("canonicalizes independent observations and lineage by stable ID", () => {
    const profile = createProfile();

    expect(profile.observations.map(({ metricId }) => metricId)).toEqual([
      "commute.mean_travel_time",
      "housing.median_gross_rent",
    ]);
    expect(profile.snapshot.rawSnapshots.map(({ id }) => id)).toEqual([
      "raw.a-decision",
      "raw.z-context",
    ]);
    expect(profile.snapshot.sourceArtifacts.map(({ id }) => id)).toEqual([
      "source.a-decision",
      "source.z-context",
    ]);
  });

  it("rejects duplicate metrics", () => {
    const profile = createProfile();
    profile.observations.push(cloneJson(profile.observations[0]));

    expect(issuePaths(profile)).toContain("observations.2.metricId");
  });

  it("requires every observation to resolve raw and source lineage", () => {
    const profile = createProfile();
    profile.observations[0].rawSnapshotId = "raw.unknown";
    profile.observations[0].source.artifactIds = ["source.unknown"];

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([
        "observations.0.rawSnapshotId",
        "observations.0.source.artifactIds",
      ]),
    );
  });

  it("binds selected-place mapping to the exact declared artifact", () => {
    const profile = createProfile();
    profile.metro.selectedPlaceMapping.sourceArtifactSha256 = RAW_SHA256;

    expect(issuePaths(profile)).toContain(
      "metro.selectedPlaceMapping.sourceArtifactId",
    );
  });

  it("rejects exact CBSA evidence for a different metro", () => {
    const profile = createProfile();
    profile.observations[0].geography.code = "42660";

    expect(issuePaths(profile)).toContain("observations.0.geography");
  });

  it("binds missingness and selection ranges to raw values", () => {
    const profile = createProfile();
    profile.observations[0].quality.missingness = "unavailable";
    profile.observations[0].quality.selectionUncertainty = {
      kind: "reference_site_range",
      min: 10,
      max: 20,
      rationale: "Fixture range.",
    };

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([
        "observations.0.quality.missingness",
        "observations.0.quality.selectionUncertainty",
      ]),
    );
  });

  it("rejects climate source-completeness labels that contradict observed years", () => {
    const profile = createProfile() as unknown as {
      observations: Array<{
        quality: Record<string, unknown>;
      }>;
    };
    profile.observations[0]!.quality.sourceCompleteness = {
      classification: "standard",
      observedYears: 22,
      normalPeriodYears: 30,
      missingPeriodTreatment: "surrounding_station_estimates",
      rationale: "Fixture NOAA completeness disclosure.",
    };

    expect(issuePaths(profile)).toContain(
      "observations.0.quality.sourceCompleteness.observedYears",
    );
  });

  it("keeps context metrics free of scoring transformations", () => {
    const profile = createProfile() as unknown as {
      observations: Array<Record<string, unknown>>;
    };
    profile.observations[1].transformation = {
      id: "housing.utility",
      version: "1.0.0",
      supportedPreferredDirections: ["lower"],
    };

    expect(issuePaths(profile)).toContain("observations.1.transformation");
  });
});

describe("verifyMetroProfile", () => {
  it("returns a checksum-verified, deeply frozen profile", () => {
    const verified = verifyMetroProfile(createProfile());

    expect(calculateMetroProfileChecksum(verified)).toBe(
      verified.snapshot.sha256,
    );
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.observations[0].source)).toBe(true);
    expect(() => {
      const mutableView = verified as unknown as {
        metro: { label: string };
      };
      mutableView.metro.label = "Changed";
    }).toThrow(TypeError);
  });

  it("rejects a schema-valid mutation whose declared checksum is stale", () => {
    const profile = createProfile();
    profile.observations[0].definition += " Mutated.";

    expect(() => verifyMetroProfile(profile)).toThrow(
      MetroProfileChecksumMismatchError,
    );
  });

  it("treats observation and lineage reordering as checksum-equivalent", () => {
    const profile = createProfile();
    const reordered = cloneJson(profile);
    reordered.observations.reverse();
    reordered.snapshot.rawSnapshots.reverse();
    reordered.snapshot.sourceArtifacts.reverse();

    expect(serializeMetroProfileForChecksum(reordered)).toBe(
      serializeMetroProfileForChecksum(profile),
    );
    expect(() => verifyMetroProfile(reordered)).not.toThrow();
  });
});
