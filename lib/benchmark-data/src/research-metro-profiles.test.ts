import { calculateMetroProfileChecksum } from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import {
  AUSTIN_RESEARCH_METRO_PROFILE_SHA256,
  getSupportedResearchMetroProfile,
  isSupportedResearchMetroProfileSlug,
  loadAustinResearchMetroProfile,
  loadLosAngelesResearchMetroProfile,
  LOS_ANGELES_RESEARCH_METRO_PROFILE_SHA256,
  loadSanDiegoResearchMetroProfile,
  loadSeattleResearchMetroProfile,
  SAN_DIEGO_RESEARCH_METRO_PROFILE_SHA256,
  SEATTLE_RESEARCH_METRO_PROFILE_SHA256,
  supportedResearchMetroProfiles,
} from "./research-metro-profiles";
import {
  resolveSupportedResearchComparison,
  supportedResearchPlaces,
} from "./supported-research-locations";

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
  it("promotes exactly four independent profiles and the controlled cohort", () => {
    expect(
      supportedResearchMetroProfiles.map(({ metro }) => metro.slug),
    ).toEqual(["los-angeles-ca", "seattle-wa", "austin-tx", "san-diego-ca"]);
    expect(supportedResearchPlaces.map(({ slug }) => slug)).toEqual([
      "los-angeles-ca",
      "seattle-wa",
      "austin-tx",
      "san-diego-ca",
    ]);
    expect(
      resolveSupportedResearchComparison("austin-tx", "san-diego-ca"),
    ).toMatchObject({
      origin: { slug: "austin-tx" },
      destination: { slug: "san-diego-ca" },
    });
  });

  it("locks each profile to its declared checksum", () => {
    const losAngeles = loadLosAngelesResearchMetroProfile();
    const seattle = loadSeattleResearchMetroProfile();
    const austin = loadAustinResearchMetroProfile();
    const sanDiego = loadSanDiegoResearchMetroProfile();

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
    expect(austin.snapshot.sha256).toBe(AUSTIN_RESEARCH_METRO_PROFILE_SHA256);
    expect(sanDiego.snapshot.sha256).toBe(
      SAN_DIEGO_RESEARCH_METRO_PROFILE_SHA256,
    );
    expect(calculateMetroProfileChecksum(austin)).toBe(
      AUSTIN_RESEARCH_METRO_PROFILE_SHA256,
    );
    expect(calculateMetroProfileChecksum(sanDiego)).toBe(
      SAN_DIEGO_RESEARCH_METRO_PROFILE_SHA256,
    );
  });

  it("promotes exact Austin and San Diego observations with NOAA completeness visible", () => {
    const austin = loadAustinResearchMetroProfile();
    const sanDiego = loadSanDiegoResearchMetroProfile();

    expect(observation(austin, "commute.mean_minutes").value).toBeCloseTo(
      28.2097375862,
      10,
    );
    expect(observation(sanDiego, "commute.mean_minutes").value).toBeCloseTo(
      26.0618486909,
      10,
    );
    expect(observation(austin, "climate.annual_hot_days")).toMatchObject({
      value: 122.8,
      quality: {
        selectionUncertainty: { min: 122.8, max: 123.5 },
        sourceCompleteness: {
          classification: "standard",
          observedYears: 30,
        },
      },
    });
    expect(observation(sanDiego, "climate.annual_hot_days")).toMatchObject({
      value: 16,
      quality: {
        selectionUncertainty: { min: 3, max: 16 },
        sourceCompleteness: {
          classification: "representative",
          observedYears: 22,
        },
      },
    });
    expect(observation(austin, "housing.median_gross_rent")).toMatchObject({
      role: "context_only",
      value: 178_400,
      quality: { marginOfError: 2_000 },
    });
    expect(observation(sanDiego, "housing.median_gross_rent")).toMatchObject({
      role: "context_only",
      value: 233_600,
      quality: { marginOfError: 2_000 },
    });
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
    expect(getSupportedResearchMetroProfile("austin-tx")).toEqual(
      loadAustinResearchMetroProfile(),
    );
    expect(isSupportedResearchMetroProfileSlug("seattle-wa")).toBe(true);
    expect(isSupportedResearchMetroProfileSlug("san-diego-ca")).toBe(true);
    expect(isSupportedResearchMetroProfileSlug("phoenix-az")).toBe(false);
    expect(Object.isFrozen(losAngeles)).toBe(true);
    expect(() => {
      const mutable = losAngeles as unknown as { metro: { label: string } };
      mutable.metro.label = "Changed";
    }).toThrow(TypeError);
  });
});
