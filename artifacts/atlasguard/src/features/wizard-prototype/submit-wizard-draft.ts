import {
  getResearchMetroHousingContext,
  getSupportedResearchPlace,
} from "@workspace/benchmark-data";

import { evaluateWizardDraft } from "./evaluate-wizard-draft";
import {
  getDestinationFinanceOverrideStatus,
  validateWizardDraft,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatDraftMoney = (value: string) =>
  dollars.format(Number(value.trim().replace(/,/g, "")));
const formatCents = (value: number) => dollars.format(value / 100);

type ProvenanceLabel =
  | "MoveWise calculated"
  | "You told us"
  | "Needs confirmation";

export type PreliminaryDestinationPlan = Readonly<{
  route: Readonly<{
    origin: string;
    destination: string;
    originMetro: string;
    destinationMetro: string;
  }>;
  score: Readonly<{
    available: false;
    label: "Deterministic score not ready";
    explanation: string;
  }>;
  currentBaseline: ReadonlyArray<
    Readonly<{
      id: "take_home" | "housing" | "recurring_expenses";
      label: string;
      value: string;
      provenance: Extract<ProvenanceLabel, "You told us">;
    }>
  >;
  householdPlan: Readonly<{
    version: "1.0.0";
    items: ReadonlyArray<
      Readonly<{
        id:
          | "housing"
          | "childcare"
          | "school"
          | "support_network"
          | "required_services"
          | "car_free_access";
        label: string;
        detail: string;
        stopsMove: boolean;
      }>
    >;
  }>;
  availableEvidence: ReadonlyArray<
    Readonly<{
      id: "metro_rent_context";
      label: string;
      reading: string;
      detail: string;
      provenance: Extract<ProvenanceLabel, "MoveWise calculated">;
      boundary: "Area context—not your budget";
    }>
  >;
  missingEstimates: ReadonlyArray<
    Readonly<{
      id:
        | "destination_take_home"
        | "destination_housing"
        | "destination_recurring_expenses"
        | "destination_gross_income";
      label: string;
      detail: string;
      provenance: Extract<ProvenanceLabel, "Needs confirmation">;
    }>
  >;
  researchSteps: ReadonlyArray<
    Readonly<{ id: string; label: string; detail: string }>
  >;
}>;

type PreliminarySubmission = Readonly<{
  success: true;
  kind: "preliminary";
  plan: PreliminaryDestinationPlan;
}>;

type DeterministicSubmission = Extract<
  ReturnType<typeof evaluateWizardDraft>,
  { success: true }
> &
  Readonly<{ kind: "deterministic" }>;

export type WizardSubmissionResult =
  | PreliminarySubmission
  | DeterministicSubmission
  | Readonly<{ success: false; errors: WizardErrors }>;

const createPreliminaryDestinationPlan = (
  draft: WizardPrototypeDraft,
): PreliminaryDestinationPlan => {
  const origin = getSupportedResearchPlace(draft.originSlug);
  const destination = getSupportedResearchPlace(draft.destinationSlug);
  const housingContext = getResearchMetroHousingContext(
    draft.originSlug,
    draft.destinationSlug,
  );

  if (origin === null || destination === null || housingContext === null) {
    throw new Error("A preliminary plan requires a supported comparison.");
  }

  const housing = draft.householdPlan.housing;
  const housingTenure = {
    rent: "Rent",
    buy: "Buy",
    either: "Rent or buy",
  }[housing.tenure as "rent" | "buy" | "either"];
  const housingType = {
    apartment_or_condo: "apartment or condo",
    townhome: "townhome",
    detached: "detached home",
    flexible: "flexible home type",
  }[
    housing.type as "apartment_or_condo" | "townhome" | "detached" | "flexible"
  ];
  const bedroomLabel =
    housing.bedrooms === "studio"
      ? "studio"
      : housing.bedrooms === "4_plus"
        ? "4+ bedrooms"
        : `${housing.bedrooms} bedroom${housing.bedrooms === "1" ? "" : "s"}`;
  const bathroomLabel =
    housing.bathrooms === "1_5"
      ? "1.5 bathrooms"
      : housing.bathrooms === "3_plus"
        ? "3+ bathrooms"
        : `${housing.bathrooms} bathroom${housing.bathrooms === "1" ? "" : "s"}`;
  const householdPlanItems: Array<
    PreliminaryDestinationPlan["householdPlan"]["items"][number]
  > = [
    {
      id: "housing",
      label: "Housing",
      detail: `${housingTenure} · ${housingType} · ${bedroomLabel} · ${bathroomLabel} · up to ${formatDraftMoney(housing.maxMonthlyCost)}/month`,
      stopsMove: housing.stopsMove === "yes",
    },
  ];

  if (
    draft.householdMode === "family" &&
    draft.householdPlan.childcare.needed === "yes"
  ) {
    const arrangement = {
      center: "Childcare center",
      home_based: "Home-based provider",
      in_home_caregiver: "In-home caregiver",
      family_or_friend: "Family or friend care",
      before_after_school: "Before- or after-school care",
      flexible: "Flexible arrangement",
    }[
      draft.householdPlan.childcare.arrangement as Exclude<
        typeof draft.householdPlan.childcare.arrangement,
        ""
      >
    ];
    householdPlanItems.push({
      id: "childcare",
      label: "Childcare",
      detail: arrangement,
      stopsMove: draft.householdPlan.childcare.stopsMove === "yes",
    });
  }

  if (
    draft.householdMode === "family" &&
    draft.householdPlan.school.needed === "yes"
  ) {
    const gradeBand = {
      preschool: "Preschool",
      elementary: "Elementary",
      middle: "Middle school",
      high: "High school",
      multiple: "Multiple grade bands",
    }[
      draft.householdPlan.school.gradeBand as Exclude<
        typeof draft.householdPlan.school.gradeBand,
        ""
      >
    ];
    const preference = {
      public: "public path",
      private: "private path",
      either: "public or private path",
    }[
      draft.householdPlan.school.preference as Exclude<
        typeof draft.householdPlan.school.preference,
        ""
      >
    ];
    householdPlanItems.push({
      id: "school",
      label: "School",
      detail: `${gradeBand} · ${preference}${draft.householdPlan.school.requirements.trim() ? ` · ${draft.householdPlan.school.requirements.trim()}` : ""}`,
      stopsMove: draft.householdPlan.school.stopsMove === "yes",
    });
  }

  for (const item of [
    ["support_network", "Nearby support", draft.householdPlan.supportNetwork],
    [
      "required_services",
      "Required services",
      draft.householdPlan.requiredServices,
    ],
    ["car_free_access", "Car-free routines", draft.householdPlan.carFreeAccess],
  ] as const) {
    const [id, label, need] = item;
    if (need.needed === "yes") {
      householdPlanItems.push({
        id,
        label,
        detail: "Include in destination verification",
        stopsMove: need.stopsMove === "yes",
      });
    }
  }

  return {
    route: {
      origin: `${origin.city}, ${origin.state}`,
      destination: `${destination.city}, ${destination.state}`,
      originMetro: origin.metro,
      destinationMetro: destination.metro,
    },
    score: {
      available: false,
      label: "Deterministic score not ready",
      explanation:
        "MoveWise has not filled missing destination values with copied or neutral placeholders. A score waits until the destination budget has complete estimates.",
    },
    currentBaseline: [
      {
        id: "take_home",
        label: "Take-home income",
        value: formatDraftMoney(draft.finances.currentTakeHome),
        provenance: "You told us",
      },
      {
        id: "housing",
        label: "Housing",
        value: formatDraftMoney(draft.finances.currentHousing),
        provenance: "You told us",
      },
      {
        id: "recurring_expenses",
        label: "Other recurring expenses",
        value: formatDraftMoney(draft.finances.currentExpenses),
        provenance: "You told us",
      },
    ],
    householdPlan: {
      version: draft.householdPlan.version,
      items: householdPlanItems,
    },
    availableEvidence: [
      {
        id: "metro_rent_context",
        label: "Metro rent context",
        reading: `${formatCents(housingContext.metric.originValue)} in ${origin.city} · ${formatCents(housingContext.metric.destinationValue)} in ${destination.city}`,
        detail:
          "2024 ACS median gross rent provides sourced area context while a household-specific housing estimate is still being developed.",
        provenance: "MoveWise calculated",
        boundary: "Area context—not your budget",
      },
    ],
    missingEstimates: [
      {
        id: "destination_take_home",
        label: "Destination take-home income",
        detail:
          "Confirm destination pay, taxes, benefits, and payroll deductions rather than copying current take-home.",
        provenance: "Needs confirmation",
      },
      {
        id: "destination_housing",
        label: "Destination housing",
        detail:
          "Match tenure, home type, space needs, and budget to defensible destination evidence.",
        provenance: "Needs confirmation",
      },
      {
        id: "destination_recurring_expenses",
        label: "Destination recurring expenses",
        detail:
          "Estimate the recurring costs outside housing that materially change for this household.",
        provenance: "Needs confirmation",
      },
      {
        id: "destination_gross_income",
        label: "Destination gross income",
        detail:
          "Gross income is needed before the existing housing-burden safety check can run.",
        provenance: "Needs confirmation",
      },
    ],
    researchSteps: [
      {
        id: "housing_match",
        label: "Match housing evidence to your household plan",
        detail:
          "Use rent or buy, home type, space requirements, and budget without treating a metro median as an expected bill.",
      },
      {
        id: "income_estimate",
        label: "Ground destination income",
        detail:
          "Use known employment information and explicit tax assumptions; leave the estimate unconfirmed when the evidence is incomplete.",
      },
      {
        id: "household_checks",
        label: "Check the needs that could stop the move",
        detail:
          "Verify housing, childcare, school, service, support-network, and car-free requirements only where they apply.",
      },
      {
        id: "deterministic_review",
        label: "Run the deterministic review when inputs are complete",
        detail:
          "Only a complete destination budget can activate the accepted rule 0.2.0 result.",
      },
    ],
  };
};

export function submitWizardDraft(
  draft: WizardPrototypeDraft,
): WizardSubmissionResult {
  const errors = validateWizardDraft(draft);
  if (Object.keys(errors).length > 0) return { success: false, errors };

  const overrideStatus = getDestinationFinanceOverrideStatus(draft.finances);
  if (overrideStatus === "none") {
    return {
      success: true,
      kind: "preliminary",
      plan: createPreliminaryDestinationPlan(draft),
    };
  }

  if (overrideStatus === "partial") {
    return {
      success: false,
      errors: {
        scenario:
          "Enter all three destination amounts or remove the optional overrides.",
      },
    };
  }

  const evaluated = evaluateWizardDraft(draft);
  return evaluated.success
    ? { ...evaluated, kind: "deterministic" }
    : evaluated;
}
