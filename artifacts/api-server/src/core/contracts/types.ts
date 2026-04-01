// AtlasGuard Core TypeScript Interfaces
// These define the strict contract boundaries for the evaluation pipeline.
// Business logic will be implemented in Cursor.

// ─────────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioInput {
  currentCity: string;
  targetCity: string;
  priorityMode: "finance" | "balanced" | "lifestyle";
  climatePreference: "warm" | "cold";
  weights: {
    affordability: number;
    climate: number;
    safety: number;
    amenities: number;
    familyFit: number;
    mobility: number;
    opportunity: number;
  };
  income: {
    current: number;
    target: number;
  };
  housing: {
    current: number;
    target: number;
  };
  expenses: {
    current: number;
    target: number;
  };
  retainedIncomeAdjustment: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringEvidence {
  scenarioContext: {
    currentCity: string;
    targetCity: string;
    priorityMode: string;
    climatePreference: string;
    benchmarkVersion: string;
  };
  userInputs: ScenarioInput;
  lifestyleEvidence: {
    climateScore: number;
    safetyScore: number;
    amenitiesScore: number;
    familyFitScore: number;
    mobilityScore: number;
    weightedLifestyleTotal: number;
  };
  financialEvidence: {
    affordabilityScore: number;
    opportunityScore: number;
    incomeTaxRegime: string;
    housingDelta: number;
    expensesDelta: number;
    retainedIncomeDelta: number;
    weightedFinancialTotal: number;
  };
  moveEvidence: {
    lifestyleFit: number;
    financialFit: number;
    moveScore: number;
    verdictBand: string;
  };
  derivedSignals: {
    positiveDrivers: string[];
    tradeoffs: string[];
    sensitivityFlags: string[];
    caveatFlags: string[];
    verdictBand: string;
    verdictDowngraded: boolean;
    downgradeReason: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Explanation
// ─────────────────────────────────────────────────────────────────────────────

export type VerdictLabel = "strong_fit" | "qualified_yes" | "caution" | "weak_fit";

export interface StructuredExplanation {
  verdict: VerdictLabel;
  score_summary: {
    lifestyle_fit: number;
    financial_fit: number;
    move_score: number;
  };
  top_positive_drivers: Array<{
    factor: string;
    evidenceRef: string;
    reason: string;
  }>;
  top_tradeoffs: Array<{
    factor: string;
    evidenceRef: string;
    reason: string;
  }>;
  assumptions_used: Array<{
    assumption: string;
    sourceField: string;
    material: boolean;
  }>;
  sensitivity_notes: Array<{
    variable: string;
    evidenceRef: string;
    note: string;
  }>;
  uncertainty_or_caveats: Array<{
    type: string;
    evidenceRef: string;
    description: string;
  }>;
  recommended_next_step: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

export type VerifierStatus = "PASS" | "PARTIAL" | "FAIL";

export interface VerifierCheckResult {
  checkId: string; // e.g. "V-001" through "V-010"
  status: VerifierStatus;
  message: string;
}

export interface VerifierResult {
  status: VerifierStatus;
  checkResults: VerifierCheckResult[];
  failingCheckIds: string[];
  partialCheckIds: string[];
  messages: string[];
  repairRecommended: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline result mode
// ─────────────────────────────────────────────────────────────────────────────

export type ResultMode =
  | "explainer"
  | "repaired_explainer"
  | "deterministic_fallback";

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline output
// ─────────────────────────────────────────────────────────────────────────────

export interface PipelineOutput {
  scenarioId: number;
  scoringEvidence: ScoringEvidence;
  structuredExplanation: StructuredExplanation;
  verifierResult: VerifierResult;
  resultMode: ResultMode;
  renderedOutput: Record<string, unknown>;
}
