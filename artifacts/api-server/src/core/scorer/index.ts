import type { ScenarioInput, ScoringEvidence } from "../contracts/types";

/**
 * Deterministic scoring engine.
 * Reads metro data from the DB and the user's weighted preferences,
 * then produces a fully populated ScoringEvidence object.
 *
 * TODO: Implement via Cursor
 */
export const computeScoring = async (
  _input: ScenarioInput,
): Promise<ScoringEvidence> => {
  // TODO: Implement via Cursor
  throw new Error("computeScoring not yet implemented");
};
