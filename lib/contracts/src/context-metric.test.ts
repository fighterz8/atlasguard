import { describe, expect, it } from "vitest";

import {
  calculateContextMetricComparisonChecksum,
  ContextMetricChecksumMismatchError,
  ContextMetricComparisonSchema,
  type ContextMetricComparison,
  verifyContextMetricComparison,
} from "./context-metric";

const ZERO_SHA = "0".repeat(64);
const SOURCE_SHA = "1".repeat(64);
const GEO_SHA = "2".repeat(64);

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const createComparison = (): ContextMetricComparison => {
  const draft: ContextMetricComparison = {
    schemaVersion: "1.0.0",
    decisionUse: "context_only",
    interpretationBoundary: "descriptive_not_user_budget",
    snapshot: {
      id: "acs1.2024.median-gross-rent.la-seattle",
      version: "1.0.0",
      sha256: ZERO_SHA,
      admissionStatus: "research_only",
      rawSnapshot: {
        id: "acs1.2024.b25064.la-seattle.raw",
        sha256: "3".repeat(64),
      },
      sourceArtifacts: [
        {
          id: "acs1.2024.geographies",
          sourceUrl: "https://example.test/geographies.txt",
          sha256: GEO_SHA,
        },
        {
          id: "acs1.2024.b25064",
          sourceUrl: "https://example.test/b25064.dat",
          sha256: SOURCE_SHA,
        },
      ],
      derivation: { id: "acs.usd-to-cents", version: "1.0.0" },
      delineationVersion: "OMB Bulletin 23-01 / Census July 2023",
      verifiedOn: "2026-07-17",
    },
    origin: {
      slug: "los-angeles-ca",
      cbsaCode: "31080",
      label: "Los Angeles-Long Beach-Anaheim, CA Metro Area",
      selectedPlace: { city: "Los Angeles", stateCode: "CA" },
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "acs1.2024.geographies",
        sourceUrl: "https://example.test/geographies.txt",
        sourceArtifactSha256: GEO_SHA,
        verifiedOn: "2026-07-17",
      },
    },
    destination: {
      slug: "seattle-wa",
      cbsaCode: "42660",
      label: "Seattle-Tacoma-Bellevue, WA Metro Area",
      selectedPlace: { city: "Seattle", stateCode: "WA" },
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "acs1.2024.geographies",
        sourceUrl: "https://example.test/geographies.txt",
        sourceArtifactSha256: GEO_SHA,
        verifiedOn: "2026-07-17",
      },
    },
    metric: {
      id: "housing.median-gross-rent.acs1.2024",
      definition: "Median gross rent for renter-occupied housing units.",
      unit: "usd_cents",
      originValue: 211_400,
      destinationValue: 205_000,
      deltaValue: -6_400,
      marginOfError90: { origin: 1_300, destination: 2_500 },
      source: {
        artifactId: "acs1.2024.b25064",
        artifactSha256: SOURCE_SHA,
        dataset: "2024 ACS 1-year table-based summary files",
        publisher: "U.S. Census Bureau",
        tableId: "b25064",
        sourceUrl: "https://example.test/b25064.dat",
        termsUrl: "https://example.test/terms",
      },
      sourceRows: {
        origin: "GEO_ID=310M700US31080",
        destination: "GEO_ID=310M700US42660",
      },
      observationPeriod: "2024 ACS 1-year estimates",
      releasedOn: "2025-09-11",
      verifiedOn: "2026-07-17",
      geographies: {
        origin: {
          kind: "cbsa",
          code: "31080",
          label: "Los Angeles-Long Beach-Anaheim, CA Metro Area",
          matchQuality: "exact",
        },
        destination: {
          kind: "cbsa",
          code: "42660",
          label: "Seattle-Tacoma-Bellevue, WA Metro Area",
          matchQuality: "exact",
        },
      },
      snapshotVersion: "1.0.0",
      snapshotSha256: ZERO_SHA,
    },
    caveats: [
      "This area median is not current asking rent or the user's expected housing cost.",
    ],
  };
  const checksum = calculateContextMetricComparisonChecksum(draft);
  return {
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    metric: { ...draft.metric, snapshotSha256: checksum },
  };
};

describe("ContextMetricComparison", () => {
  it("verifies and deeply freezes a context-only comparison", () => {
    const verified = verifyContextMetricComparison(createComparison());

    expect(verified.decisionUse).toBe("context_only");
    expect(verified.interpretationBoundary).toBe("descriptive_not_user_budget");
    expect(Object.isFrozen(verified.metric.source)).toBe(true);
  });

  it("rejects a stale checksum after a value mutation", () => {
    const changed = clone(createComparison());
    changed.metric.originValue += 100;
    changed.metric.deltaValue -= 100;

    expect(() => verifyContextMetricComparison(changed)).toThrow(
      ContextMetricChecksumMismatchError,
    );
  });

  it("rejects contradictory deltas at the schema boundary", () => {
    const changed = clone(createComparison());
    changed.metric.deltaValue = 0;

    const result = ContextMetricComparisonSchema.safeParse(changed);
    expect(result.success).toBe(false);
    expect(
      result.success
        ? []
        : result.error.issues.map((issue) => issue.path.join(".")),
    ).toContain("metric.deltaValue");
  });

  it("binds the metric to its exact source artifact", () => {
    const changed = clone(createComparison());
    changed.metric.source.artifactSha256 = "4".repeat(64);

    const result = ContextMetricComparisonSchema.safeParse(changed);
    expect(result.success).toBe(false);
    expect(
      result.success
        ? []
        : result.error.issues.map((issue) => issue.path.join(".")),
    ).toContain("metric.source");
  });

  it("keeps the checksum stable when source artifacts are reordered", () => {
    const first = createComparison();
    const reordered = clone(first);
    reordered.snapshot.sourceArtifacts.reverse();

    expect(calculateContextMetricComparisonChecksum(reordered)).toBe(
      first.snapshot.sha256,
    );
  });
});
