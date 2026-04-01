import type { ScoringEvidence, StructuredExplanation } from "../contracts/types";

/**
 * AI-powered explanation generator.
 * Takes scoring evidence and returns a StructuredExplanation JSON object
 * matching the contract exactly.
 *
 * TODO: Implement via Cursor — wire in LLM prompt, parse + validate output.
 */
export const generateExplanation = async (
  _evidence: ScoringEvidence,
): Promise<StructuredExplanation> => {
  // TODO: Implement via Cursor
  throw new Error("generateExplanation not yet implemented");
};
