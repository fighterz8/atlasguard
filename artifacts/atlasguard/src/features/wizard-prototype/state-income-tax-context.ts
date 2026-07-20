import type { SupportedPlaceSlug } from "./model";

const STATE_TAX_CONTEXT_VERSION =
  "state-wage-income-tax-context-2026-07-19" as const;

const stateTaxSources = {
  CA: {
    publisher: "California Franchise Tax Board",
    title: "2025 Personal Income Tax Booklet",
    url: "https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html",
  },
  WA: {
    publisher: "Washington Department of Revenue",
    title: "Income tax",
    url: "https://dor.wa.gov/taxes-rates/income-tax",
  },
  TX: {
    publisher: "Texas Legislative Council",
    title: "Texas Constitution, Article VIII",
    url: "https://tlc.texas.gov/docs/legref/TxConst.pdf",
  },
} as const;

const locationTaxTreatment = {
  "los-angeles-ca": {
    stateCode: "CA",
    stateName: "California",
    treatment: "state_income_tax_applies",
  },
  "san-diego-ca": {
    stateCode: "CA",
    stateName: "California",
    treatment: "state_income_tax_applies",
  },
  "seattle-wa": {
    stateCode: "WA",
    stateName: "Washington",
    treatment: "no_individual_state_income_tax",
  },
  "austin-tx": {
    stateCode: "TX",
    stateName: "Texas",
    treatment: "no_individual_state_income_tax",
  },
} as const satisfies Record<
  SupportedPlaceSlug,
  {
    stateCode: "CA" | "WA" | "TX";
    stateName: string;
    treatment: "state_income_tax_applies" | "no_individual_state_income_tax";
  }
>;

export type StateIncomeTaxContext = Readonly<{
  version: typeof STATE_TAX_CONTEXT_VERSION;
  direction:
    | "destination_may_increase_take_home"
    | "destination_may_reduce_take_home"
    | "same_state_treatment"
    | "no_state_income_tax_difference";
  headline: string;
  explanation: string;
  boundary: string;
  origin: (typeof locationTaxTreatment)[SupportedPlaceSlug];
  destination: (typeof locationTaxTreatment)[SupportedPlaceSlug];
  sources: readonly (typeof stateTaxSources)[keyof typeof stateTaxSources][];
}>;

export const getStateIncomeTaxContext = (
  originSlug: SupportedPlaceSlug,
  destinationSlug: SupportedPlaceSlug,
): StateIncomeTaxContext => {
  const origin = locationTaxTreatment[originSlug];
  const destination = locationTaxTreatment[destinationSlug];
  const sharedBoundary =
    "This state-tax context does not calculate your paycheck. Federal tax, payroll tax, filing status, credits, benefits, withholding, income type, and other state or local taxes can all change take-home pay.";

  if (origin.stateCode === destination.stateCode) {
    return Object.freeze({
      version: STATE_TAX_CONTEXT_VERSION,
      direction: "same_state_treatment",
      headline: "Same state income-tax treatment",
      explanation: `Both locations are in ${origin.stateName}, so the move itself does not create a state individual-income-tax change. Pay, benefits, and withholding can still change take-home.`,
      boundary: sharedBoundary,
      origin,
      destination,
      sources: [stateTaxSources[origin.stateCode]],
    });
  }

  if (
    origin.treatment === "state_income_tax_applies" &&
    destination.treatment === "no_individual_state_income_tax"
  ) {
    return Object.freeze({
      version: STATE_TAX_CONTEXT_VERSION,
      direction: "destination_may_increase_take_home",
      headline: "State wage taxes may improve destination take-home",
      explanation: `${destination.stateName} does not levy an individual state income tax, while ${origin.stateName} does. If gross pay and other deductions stayed similar, destination take-home may be higher—but it should not be copied or assumed automatically.`,
      boundary: sharedBoundary,
      origin,
      destination,
      sources: [
        stateTaxSources[origin.stateCode],
        stateTaxSources[destination.stateCode],
      ],
    });
  }

  if (
    origin.treatment === "no_individual_state_income_tax" &&
    destination.treatment === "state_income_tax_applies"
  ) {
    return Object.freeze({
      version: STATE_TAX_CONTEXT_VERSION,
      direction: "destination_may_reduce_take_home",
      headline: "California state income tax may reduce destination take-home",
      explanation: `${destination.stateName} levies individual state income tax, while ${origin.stateName} does not. If gross pay and other deductions stayed similar, destination take-home may be lower.`,
      boundary: sharedBoundary,
      origin,
      destination,
      sources: [
        stateTaxSources[origin.stateCode],
        stateTaxSources[destination.stateCode],
      ],
    });
  }

  return Object.freeze({
    version: STATE_TAX_CONTEXT_VERSION,
    direction: "no_state_income_tax_difference",
    headline: "No state individual-income-tax difference identified",
    explanation: `${origin.stateName} and ${destination.stateName} do not levy individual state income tax. Other taxes and payroll deductions still differ, so this does not prove equal take-home pay.`,
    boundary: sharedBoundary,
    origin,
    destination,
    sources: [
      stateTaxSources[origin.stateCode],
      stateTaxSources[destination.stateCode],
    ],
  });
};
