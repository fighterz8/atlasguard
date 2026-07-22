import {
  DETERMINISTIC_MODEL_CALIBRATION_FIXTURE_IDS,
  DETERMINISTIC_MODEL_CALIBRATION_SCHEMA_VERSION,
  DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION,
  verifyDeterministicModelCalibrationCorpus,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { deterministicModelCalibrationCorpus } from "./fixtures/deterministic-model-calibration-v1";

describe("MoveWise deterministic model calibration corpus", () => {
  it("binds every accepted human fixture exactly once", () => {
    const corpus = verifyDeterministicModelCalibrationCorpus(
      deterministicModelCalibrationCorpus,
    );

    expect(corpus.schemaVersion).toBe(
      DETERMINISTIC_MODEL_CALIBRATION_SCHEMA_VERSION,
    );
    expect(corpus.ruleCandidateVersion).toBe(
      DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION,
    );
    expect(corpus.fixtures.map(({ id }) => id)).toEqual(
      DETERMINISTIC_MODEL_CALIBRATION_FIXTURE_IDS,
    );
    expect(
      corpus.fixtures.filter(({ kind }) => kind === "scenario"),
    ).toHaveLength(18);
    expect(
      corpus.fixtures.filter(({ kind }) => kind === "invariant"),
    ).toHaveLength(6);
    expect(
      corpus.fixtures.filter(
        (fixture) =>
          fixture.kind === "scenario" && fixture.audience === "family",
      ),
    ).toHaveLength(12);
    expect(
      corpus.fixtures.filter(
        (fixture) =>
          fixture.kind === "scenario" && fixture.audience === "individual",
      ),
    ).toHaveLength(6);
    expect(Object.isFrozen(corpus)).toBe(true);
    expect(Object.isFrozen(corpus.fixtures)).toBe(true);
  });

  it("fails closed when accepted coverage is incomplete or duplicated", () => {
    const missing = structuredClone(deterministicModelCalibrationCorpus);
    missing.fixtures.pop();
    expect(() => verifyDeterministicModelCalibrationCorpus(missing)).toThrow();

    const duplicated = structuredClone(deterministicModelCalibrationCorpus);
    duplicated.fixtures[1] = structuredClone(duplicated.fixtures[0]);
    expect(() =>
      verifyDeterministicModelCalibrationCorpus(duplicated),
    ).toThrow();
  });
});
