export type EvaluationMode = "disabled" | "research";

export const resolveEvaluationMode = (
  rawMode: string | undefined,
  nodeEnvironment: string | undefined,
): EvaluationMode => {
  if (rawMode === undefined || rawMode === "" || rawMode === "disabled") {
    return "disabled";
  }

  if (rawMode !== "research") {
    throw new Error(
      "MOVEWISE_EVALUATION_MODE must be either disabled or research.",
    );
  }

  if (nodeEnvironment === "production") {
    throw new Error(
      "Research evaluation cannot be enabled in a production process.",
    );
  }

  return "research";
};
