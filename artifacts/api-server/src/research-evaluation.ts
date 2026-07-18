import {
  loadLosAngelesToSeattleResearchBenchmark,
  resolveSupportedResearchComparison,
} from "@workspace/benchmark-data";
import type {
  ScenarioInput,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";
import {
  evaluateResearchMoveDecision,
  MoveDecisionPreflightError,
} from "@workspace/decision-core";

export type EvaluationIssue = Readonly<{
  code: string;
  message: string;
  path: readonly (string | number)[];
}>;

export type ResearchEvaluationAttempt =
  | Readonly<{ success: true; result: VerifiedResearchEvaluationResult }>
  | Readonly<{ success: false; issues: readonly EvaluationIssue[] }>;

export type EvaluationCapability =
  | Readonly<{ mode: "disabled" }>
  | Readonly<{
      mode: "research";
      evaluate: (scenario: ScenarioInput) => ResearchEvaluationAttempt;
    }>;

export const disabledEvaluationCapability: EvaluationCapability = Object.freeze(
  { mode: "disabled" },
);

const unsupported = (
  code: string,
  message: string,
  path: readonly (string | number)[],
): ResearchEvaluationAttempt => ({
  success: false,
  issues: [{ code, message, path }],
});

export const evaluateLosAngelesToSeattleResearchScenario = (
  scenario: ScenarioInput,
): ResearchEvaluationAttempt => {
  const comparison = resolveSupportedResearchComparison(
    scenario.originMetroSlug,
    scenario.destinationMetroSlug,
  );
  if (comparison === null) {
    return unsupported(
      "unsupported_location_pair",
      "Research evaluation currently supports only the Los Angeles to Seattle comparison.",
      [],
    );
  }

  const climateIndex = scenario.priorities.findIndex(
    ({ priorityId }) => priorityId === "climate_heat",
  );
  const climatePriority = scenario.priorities[climateIndex];
  if (climatePriority === undefined) {
    return unsupported(
      "missing_climate_preference",
      "Research evaluation requires an explicit hot-day preference.",
      ["priorities"],
    );
  }

  try {
    return {
      success: true,
      result: evaluateResearchMoveDecision(
        scenario,
        loadLosAngelesToSeattleResearchBenchmark(
          climatePriority.preferredDirection,
        ),
      ),
    };
  } catch (error) {
    if (error instanceof MoveDecisionPreflightError) {
      return unsupported(
        error.code,
        "The scenario does not match the supported research benchmark.",
        [],
      );
    }
    throw error;
  }
};

export const researchEvaluationCapability: EvaluationCapability = Object.freeze(
  {
    mode: "research",
    evaluate: evaluateLosAngelesToSeattleResearchScenario,
  },
);
