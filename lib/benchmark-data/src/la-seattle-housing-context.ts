import {
  calculateContextMetricComparisonChecksum,
  verifyContextMetricComparison,
} from "@workspace/contracts";
import type {
  ContextMetricComparison,
  VerifiedContextMetricComparison,
} from "@workspace/contracts";

import { acs2024RentLaSeattleRawSnapshot } from "./raw/acs1-2024-rent-la-seattle";
import {
  verifyRawHousingSnapshot,
  type VerifiedRawHousingSnapshot,
} from "./raw-housing-snapshot";

const COMPARISON_VERSION = "1.0.0" as const;
const ZERO_SHA = "0".repeat(64);
export const LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256 =
  "8becaa3c5daf2f8e40c37e220279ed09ee3b7f6ba4abb9088b6e11412dfe52eb";

const recordFor = (
  snapshot: VerifiedRawHousingSnapshot,
  side: "origin" | "destination",
) => {
  const record = snapshot.metros.find((candidate) => candidate.side === side);
  if (record === undefined) throw new Error(`Housing snapshot lacks ${side}.`);
  return record;
};

const metroRef = (
  snapshot: VerifiedRawHousingSnapshot,
  side: "origin" | "destination",
) => {
  const record = recordFor(snapshot, side);
  return {
    slug: side === "origin" ? "los-angeles-ca" : "seattle-wa",
    cbsaCode: record.cbsaCode,
    label: record.cbsaLabel,
    selectedPlace: record.selectedPlace,
    selectedPlaceMapping: {
      method: "official_cbsa_title_match" as const,
      sourceArtifactId: snapshot.artifacts.acsGeographies.id,
      sourceUrl: snapshot.artifacts.acsGeographies.sourceUrl,
      sourceArtifactSha256: snapshot.artifacts.acsGeographies.sha256,
      verifiedOn: snapshot.verifiedOn,
    },
  };
};

export const promoteLosAngelesToSeattleHousingContext = (
  snapshot: VerifiedRawHousingSnapshot,
): VerifiedContextMetricComparison => {
  const origin = recordFor(snapshot, "origin");
  const destination = recordFor(snapshot, "destination");
  const draft: ContextMetricComparison = {
    schemaVersion: "1.0.0",
    decisionUse: "context_only",
    interpretationBoundary: "descriptive_not_user_budget",
    snapshot: {
      id: "acs1.2024.median-gross-rent.la-seattle",
      version: COMPARISON_VERSION,
      sha256: ZERO_SHA,
      admissionStatus: "research_only",
      rawSnapshot: { id: snapshot.id, sha256: snapshot.sha256 },
      sourceArtifacts: Object.values(snapshot.artifacts).map((artifact) => ({
        id: artifact.id,
        sourceUrl: artifact.sourceUrl,
        sha256: artifact.sha256,
      })),
      derivation: { id: "acs.usd-to-cents", version: "1.0.0" },
      delineationVersion: snapshot.delineationVersion,
      verifiedOn: snapshot.verifiedOn,
    },
    origin: metroRef(snapshot, "origin"),
    destination: metroRef(snapshot, "destination"),
    metric: {
      id: "housing.median-gross-rent.acs1.2024",
      definition:
        "Median gross rent for renter-occupied housing units, including contract rent and ACS-defined tenant-paid utilities.",
      unit: "usd_cents",
      originValue: origin.medianGrossRentDollars * 100,
      destinationValue: destination.medianGrossRentDollars * 100,
      deltaValue:
        (destination.medianGrossRentDollars - origin.medianGrossRentDollars) *
        100,
      marginOfError90: {
        origin: origin.marginOfError90Dollars * 100,
        destination: destination.marginOfError90Dollars * 100,
      },
      source: {
        artifactId: snapshot.artifacts.b25064.id,
        artifactSha256: snapshot.artifacts.b25064.sha256,
        dataset: snapshot.dataset,
        publisher: snapshot.publisher,
        tableId: "b25064",
        sourceUrl: snapshot.artifacts.b25064.sourceUrl,
        termsUrl: snapshot.termsUrl,
      },
      sourceRows: {
        origin: `GEO_ID=${origin.acsGeoId}`,
        destination: `GEO_ID=${destination.acsGeoId}`,
      },
      observationPeriod: snapshot.observationPeriod,
      releasedOn: snapshot.releasedOn,
      verifiedOn: snapshot.verifiedOn,
      geographies: {
        origin: {
          kind: "cbsa",
          code: origin.cbsaCode,
          label: origin.cbsaLabel,
          matchQuality: "exact",
        },
        destination: {
          kind: "cbsa",
          code: destination.cbsaCode,
          label: destination.cbsaLabel,
          matchQuality: "exact",
        },
      },
      snapshotVersion: COMPARISON_VERSION,
      snapshotSha256: ZERO_SHA,
    },
    caveats: [
      "This is a 2024 area median, not current asking rent, a listing, or a forecast.",
      "It is not substituted into the illustrative financial scenario or the decision condition.",
      "A metro median cannot describe a specific neighborhood, unit type, or household's expected housing cost.",
    ],
  };

  const checksum = calculateContextMetricComparisonChecksum(draft);
  if (checksum !== LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256) {
    throw new Error(
      `Promoted LA-to-Seattle housing context changed without a versioned checksum update: received ${checksum}.`,
    );
  }
  return verifyContextMetricComparison({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    metric: { ...draft.metric, snapshotSha256: checksum },
  });
};

export const loadLosAngelesToSeattleHousingContext = () =>
  promoteLosAngelesToSeattleHousingContext(
    verifyRawHousingSnapshot(acs2024RentLaSeattleRawSnapshot),
  );
