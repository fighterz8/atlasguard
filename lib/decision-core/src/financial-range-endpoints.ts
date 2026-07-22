import type { FinancialInputPath, ScenarioInput } from "@workspace/contracts";

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

type MutableScenarioRange = Readonly<{
  min: number;
  max: number;
}>;

type RangeDescriptor = Readonly<{
  inputPath: FinancialInputPath;
  read: (scenario: ScenarioInput) => Readonly<{
    plausibleRangeCents: MutableScenarioRange | null;
  }> | null;
  write: (scenario: ScenarioInput, value: number) => void;
}>;

const RANGE_DESCRIPTORS: readonly RangeDescriptor[] = [
  {
    inputPath: "finances.origin.takeHomeIncome.monthlyCents",
    read: (scenario) => scenario.finances.origin.takeHomeIncome,
    write: (scenario, value) => {
      scenario.finances.origin.takeHomeIncome.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.origin.housingCost.monthlyCents",
    read: (scenario) => scenario.finances.origin.housingCost,
    write: (scenario, value) => {
      scenario.finances.origin.housingCost.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
    read: (scenario) =>
      scenario.finances.origin.recurringExpensesExcludingHousing,
    write: (scenario, value) => {
      scenario.finances.origin.recurringExpensesExcludingHousing.monthlyCents =
        value;
    },
  },
  {
    inputPath: "finances.destination.takeHomeIncome.monthlyCents",
    read: (scenario) => scenario.finances.destination.takeHomeIncome,
    write: (scenario, value) => {
      scenario.finances.destination.takeHomeIncome.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.destination.grossIncome.monthlyCents",
    read: (scenario) => scenario.finances.destination.grossIncome,
    write: (scenario, value) => {
      const grossIncome = scenario.finances.destination.grossIncome;
      if (grossIncome === null) {
        throw new Error("Cannot vary an unavailable gross-income assumption.");
      }
      grossIncome.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.destination.housingCost.monthlyCents",
    read: (scenario) => scenario.finances.destination.housingCost,
    write: (scenario, value) => {
      scenario.finances.destination.housingCost.monthlyCents = value;
    },
  },
  {
    inputPath:
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    read: (scenario) =>
      scenario.finances.destination.recurringExpensesExcludingHousing,
    write: (scenario, value) => {
      scenario.finances.destination.recurringExpensesExcludingHousing.monthlyCents =
        value;
    },
  },
  {
    inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
    read: (scenario) => scenario.finances.destination.retainedPropertyNet,
    write: (scenario, value) => {
      scenario.finances.destination.retainedPropertyNet.monthlyCents = value;
    },
  },
];

const cloneScenario = (
  scenario: ScenarioInput | DeepReadonly<ScenarioInput>,
): ScenarioInput => JSON.parse(JSON.stringify(scenario)) as ScenarioInput;

export type FinancialRangeEndpoints = Readonly<{
  variedInputPaths: readonly FinancialInputPath[];
  scenarios: readonly ScenarioInput[];
}>;

export const enumeratePlausibleFinancialEndpoints = (
  scenario: ScenarioInput | DeepReadonly<ScenarioInput>,
): FinancialRangeEndpoints => {
  const mutableScenario = cloneScenario(scenario);
  const rangedInputs = RANGE_DESCRIPTORS.flatMap((descriptor) => {
    const range = descriptor.read(mutableScenario)?.plausibleRangeCents;
    return range !== null && range !== undefined && range.min < range.max
      ? [{ ...descriptor, range }]
      : [];
  });
  if (rangedInputs.length === 0) {
    return { variedInputPaths: [], scenarios: [] };
  }

  let endpointScenarios = [mutableScenario];
  rangedInputs.forEach((descriptor) => {
    endpointScenarios = endpointScenarios.flatMap((endpointScenario) =>
      [descriptor.range.min, descriptor.range.max].map((value) => {
        const endpoint = cloneScenario(endpointScenario);
        descriptor.write(endpoint, value);
        return endpoint;
      }),
    );
  });

  return {
    variedInputPaths: rangedInputs.map(({ inputPath }) => inputPath).sort(),
    scenarios: endpointScenarios,
  };
};
