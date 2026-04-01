import type {
  ScoringEvidence,
  StructuredExplanation,
  VerifierResult,
} from "../contracts/types";

/**
 * Verifier engine.
 * Runs checks V-001 through V-010 against the explanation relative to the
 * scoring evidence. Returns PASS / PARTIAL / FAIL with per-check details.
 *
 * TODO: Implement via Cursor — define each check, run them, aggregate status.
 */
export const verifyExplanation = async (
  _evidence: ScoringEvidence,
  _explanation: StructuredExplanation,
): Promise<VerifierResult> => {
  // TODO: Implement via Cursor
  throw new Error("verifyExplanation not yet implemented");
};
