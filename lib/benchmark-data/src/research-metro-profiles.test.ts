import { calculateMetroProfileChecksum } from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import {
  getSupportedResearchMetroProfile,
  isSupportedResearchMetroProfileSlug,
  loadLosAngelesResearchMetroProfile,
  LOS_ANGELES_RESEARCH_METRO_PROFILE_SHA256,
  loadSeattleResearchMetroProfile,
  SEATTLE_RESEARCH_METRO_PROFILE_SHA256,
  supportedResearchMetroProfiles,
} from "./research-metro-profiles";

const observation = (
  profile: ReturnType<typeof loadLosAngelesResearchMetroProfile>,
  metricId: string,
) => {
  const result = profile.observations.find(
    (candidate) => candidate.metricId === metricId,
  );
  expect(result).toBeDefined();
  if (result === undefined) throw new Error(`Missing ${metricId}.`);
  return result;
};

describe("research metro profiles", () => {
  it("promotes exactly the two independently verified metros", () => {
    expect(
      supportedResearchMetroProfiles.map(({ metro }) => metro.slug),
    ).toEqual(["los-angeles-ca", "seattle-wa"]);
    expect(
      supportedResearchMetroProfiles.some(({ metro }) =>
        ["austin-tx", "san-diego-ca"].includes(metro.slug),
      ),
    ).toBe(false);
  });

  it("locks each profile to its declared checksum", () => {
    const losAngeles = loadLosAngelesResearchMetroProfile();
    const seattle = loadSeattleResearchMetroProfile();

    expect(losAngeles.snapshot.sha256).toBe(
      LOS_ANGELES_RESEARCH_METRO_PROFILE_SHA256,
    );
    expect(seattle.snapshot.sha256).toBe(SEATTLE_RESEARCH_METRO_PROFILE_SHA256);
    expect(calculateMetroProfileChecksum(losAngeles)).toBe(
      LOS_ANGELES_RESEARCH_METRO_PROFILE_SHA256,
    );
    expect(calculateMetroProfileChecksum(seattle)).toBe(
      SEATTLE_RESEARCH_METRO_PROFILE_SHA256,
    );
  });

  it("stores raw metro observations without route deltas or chosen climate direction", () => {
    const losAngeles = loadLosAngelesResearchMetroProfile();
    const seattle = loadSeattleResearchMetroProfile();

    expect(observation(losAngeles, "commute.mean_minutes").value).toBeCloseTo(
      30.6554,
      3,
    );
    expect(observation(seattle, "commute.mean_minutes").value).toBeCloseTo(
      29.9946,
      3,
    );
    expect(observation(losAngeles, "climate.annual_hot_days")).toMatchObject({
      value: 25.6,
      transformation: { supportedPreferredDirections: ["lower", "higher"] },
      quality: {
        selectionUncertainty: { min: 4.8, max: 25.6 },
      },
    });
    expect(observation(seattle, "climate.annual_hot_days")).toMatchObject({
      value: 2.1,
      transformation: { supportedPreferredDirections: ["lower", "higher"] },
      quality: {
        selectionUncertainty: { min: 2.1, max: 3.8 },
      },
    });
    expect(observation(losAngeles, "housing.median_gross_rent")).toMatchObject({
      role: "context_only",
      value: 211_400,
      quality: { marginOfError: 1_300 },
    });
    expect(observation(seattle, "housing.median_gross_rent")).toMatchObject({
      role: "context_only",
      value: 205_000,
      quality: { marginOfError: 2_500 },
    });
    expect(JSON.stringify(losAngeles)).not.toMatch(
      /originValue|destinationValue|deltaValue|preferredDirection":/,
    );
  });

  it("preserves raw-snapshot and artifact lineage for every observation", () => {
    const profile = loadLosAngelesResearchMetroProfile();
    const rawIds = new Set(profile.snapshot.rawSnapshots.map(({ id }) => id));
    const artifactIds = new Set(
      profile.snapshot.sourceArtifacts.map(({ id }) => id),
    );

    profile.observations.forEach((metric) => {
      expect(rawIds.has(metric.rawSnapshotId)).toBe(true);
      metric.source.artifactIds.forEach((artifactId) =>
        expect(artifactIds.has(artifactId)).toBe(true),
      );
    });
    expect(
      profile.snapshot.sourceArtifacts.find(
        ({ id }) => id === "acs1.2024.geographies",
      )?.rawSnapshotIds,
    ).toEqual([
      "acs1.2024.commute.la-seattle",
      "acs1.2024.median-gross-rent.la-seattle.raw",
    ]);
  });

  it("exposes immutable lookup results and rejects unsupported slugs", () => {
    const losAngeles = getSupportedResearchMetroProfile("los-angeles-ca");
    expect(losAngeles).toEqual(loadLosAngelesResearchMetroProfile());
    expect(getSupportedResearchMetroProfile("austin-tx")).toBeNull();
    expect(isSupportedResearchMetroProfileSlug("seattle-wa")).toBe(true);
    expect(isSupportedResearchMetroProfileSlug("san-diego-ca")).toBe(false);
    expect(Object.isFrozen(losAngeles)).toBe(true);
    expect(() => {
      const mutable = losAngeles as unknown as { metro: { label: string } };
      mutable.metro.label = "Changed";
    }).toThrow(TypeError);
  });
});
