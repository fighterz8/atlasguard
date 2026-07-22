import {
  getResearchMetroRentGuidance,
  getSupportedResearchPlace,
} from "@workspace/benchmark-data";

import type { RentCeilingType, WizardPrototypeDraft } from "./model";

export type FirstHomeModel = Readonly<{
  originCity: string | null;
  destinationCity: string | null;
  estimate: Readonly<{
    monthlyDollars: number;
    rangeLowDollars: number | null;
    rangeHighDollars: number | null;
    origin: "movewise";
    evidenceStatus: "estimated";
    stockCategoryLabel: string;
    originRenterStockShareBps: number;
    destinationRenterStockShareBps: number;
    monthlyDifferenceDollars: number;
  }> | null;
  ceiling: Readonly<{
    monthlyDollars: number;
    type: RentCeilingType | "";
    gapDollars: number | null;
    direction: "under" | "at" | "over" | null;
    conflict: boolean;
    blocker: boolean;
    meaningOpen: boolean;
  }> | null;
}>;

const wholeDollars = (value: string) => {
  const normalized = value.trim().replace(/,/g, "");
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
};

export function createFirstHomeModel(
  draft: Pick<
    WizardPrototypeDraft,
    "originSlug" | "destinationSlug" | "householdPlan"
  >,
): FirstHomeModel {
  const origin =
    draft.originSlug === ""
      ? null
      : getSupportedResearchPlace(draft.originSlug);
  const destination =
    draft.destinationSlug === ""
      ? null
      : getSupportedResearchPlace(draft.destinationSlug);
  const guidance =
    draft.originSlug === "" || draft.destinationSlug === ""
      ? null
      : getResearchMetroRentGuidance(
          draft.originSlug,
          draft.destinationSlug,
          draft.householdPlan.housing.bedrooms,
        );
  const ceilingDollars = wholeDollars(
    draft.householdPlan.housing.maxMonthlyCost,
  );
  const estimateDollars = guidance?.destination.monthlyGrossRentDollars ?? null;
  const gapDollars =
    ceilingDollars === null || estimateDollars === null
      ? null
      : ceilingDollars - estimateDollars;
  const ceilingType = draft.householdPlan.housing.ceilingType;

  return {
    originCity: origin?.city ?? null,
    destinationCity: destination?.city ?? null,
    estimate: guidance
      ? {
          monthlyDollars: guidance.destination.monthlyGrossRentDollars,
          rangeLowDollars:
            guidance.destination.marginOfError90Dollars === null
              ? null
              : guidance.destination.monthlyGrossRentDollars -
                guidance.destination.marginOfError90Dollars,
          rangeHighDollars:
            guidance.destination.marginOfError90Dollars === null
              ? null
              : guidance.destination.monthlyGrossRentDollars +
                guidance.destination.marginOfError90Dollars,
          origin: "movewise",
          evidenceStatus: "estimated",
          stockCategoryLabel: guidance.stockCategoryLabel,
          originRenterStockShareBps: guidance.origin.renterStockShareBps,
          destinationRenterStockShareBps:
            guidance.destination.renterStockShareBps,
          monthlyDifferenceDollars: guidance.monthlyDifferenceDollars,
        }
      : null,
    ceiling:
      ceilingDollars === null
        ? null
        : {
            monthlyDollars: ceilingDollars,
            type: ceilingType,
            gapDollars,
            direction:
              gapDollars === null
                ? null
                : gapDollars > 0
                  ? "under"
                  : gapDollars < 0
                    ? "over"
                    : "at",
            conflict: gapDollars !== null && gapDollars < 0,
            blocker:
              gapDollars !== null && gapDollars < 0 && ceilingType === "hard",
            meaningOpen: ceilingType === "" || ceilingType === "not_sure",
          },
  };
}
