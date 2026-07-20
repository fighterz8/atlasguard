export type MoneySliderKind = "take_home" | "housing" | "expenses";

const sliderConfig: Record<
  MoneySliderKind,
  { baseMaximum: number; step: number }
> = {
  take_home: { baseMaximum: 12_000, step: 100 },
  housing: { baseMaximum: 6_000, step: 50 },
  expenses: { baseMaximum: 8_000, step: 50 },
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const wholeDollars = (value: string) => {
  const amount = Number(value.trim().replace(/,/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
};

const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

export const createMoneySliderModel = (options: {
  kind: MoneySliderKind;
  currentValue: string;
  destinationValue: string;
}) => {
  const config = sliderConfig[options.kind];
  const current = wholeDollars(options.currentValue);
  const destination = wholeDollars(options.destinationValue);
  const largestEnteredValue = Math.max(current ?? 0, destination ?? 0);
  const maximum = roundUp(
    Math.max(config.baseMaximum, largestEnteredValue * 1.25),
    config.step,
  );
  const delta =
    current === null || destination === null ? null : destination - current;
  const positiveHelps = options.kind === "take_home";
  const deltaImpact =
    delta === null
      ? ("unknown" as const)
      : delta === 0
        ? ("similar" as const)
        : delta > 0 === positiveHelps
          ? ("favorable" as const)
          : ("risk" as const);

  return {
    minimum: 0,
    maximum,
    step: config.step,
    sliderValue: destination ?? 0,
    valueText:
      destination === null
        ? "No destination amount entered"
        : `${currency.format(destination)} per month`,
    delta,
    deltaText:
      delta === null
        ? "Enter both amounts to compare"
        : delta === 0
          ? "No monthly change"
          : `${delta > 0 ? "+" : "−"}${currency.format(Math.abs(delta))} per month`,
    deltaDirection:
      delta === null
        ? "unknown"
        : delta === 0
          ? "same"
          : delta > 0
            ? "up"
            : "down",
    deltaImpact,
    deltaImpactLabel:
      deltaImpact === "favorable"
        ? "Helps cushion"
        : deltaImpact === "risk"
          ? "Reduces cushion"
          : null,
    minimumLabel: currency.format(0),
    maximumLabel: currency.format(maximum),
  } as const;
};
