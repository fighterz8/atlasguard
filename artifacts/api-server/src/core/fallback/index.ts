import type {
  ScoringEvidence,
  StructuredExplanation,
} from "../contracts/types";

/**
 * Deterministic fallback renderer.
 * Used when the verifier returns FAIL and the repair loop also fails.
 * Produces a StructuredExplanation purely from scoring evidence — no LLM call.
 *
 * TODO: Implement via Cursor — template-based approach using ScoringEvidence fields.
 */
export const generateFallbackExplanation = (
  _evidence: ScoringEvidence,
): StructuredExplanation => {
  // TODO: Implement via Cursor
  throw new Error("generateFallbackExplanation not yet implemented");
};
