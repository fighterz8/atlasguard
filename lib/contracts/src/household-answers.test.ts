import { describe, expect, it } from "vitest";

import {
  MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  MOVEWISE_HOUSEHOLD_QUESTION_VERSION,
  MoveWiseHouseholdAnswerChecksumMismatchError,
  calculateMoveWiseHouseholdAnswersChecksum,
  createMoveWiseHouseholdAnswers,
  verifyMoveWiseHouseholdAnswers,
  type MoveWiseHouseholdAnswerPayload,
  type MoveWiseHouseholdAnswers,
} from "./household-answers";

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const familyPayload = (): MoveWiseHouseholdAnswerPayload => ({
  schemaVersion: MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  questionVersion: MOVEWISE_HOUSEHOLD_QUESTION_VERSION,
  mode: "family",
  factors: [
    {
      factorId: "space_fit",
      importance: "important",
      impact: "positive",
      essentialStatus: null,
    },
    {
      factorId: "support_network",
      importance: "important",
      impact: "strong_positive",
      essentialStatus: null,
    },
    {
      factorId: "childcare_continuity",
      importance: "not_applicable",
      impact: "excluded",
      essentialStatus: null,
    },
    {
      factorId: "school_continuity",
      importance: "essential",
      impact: "unavailable",
      essentialStatus: "unconfirmed",
    },
    {
      factorId: "required_services_continuity",
      importance: "not_applicable",
      impact: "excluded",
      essentialStatus: null,
    },
    {
      factorId: "car_free_access",
      importance: "not_applicable",
      impact: "excluded",
      essentialStatus: null,
    },
  ],
});

const individualPayload = (): MoveWiseHouseholdAnswerPayload => ({
  schemaVersion: MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  questionVersion: MOVEWISE_HOUSEHOLD_QUESTION_VERSION,
  mode: "individual",
  factors: [
    {
      factorId: "space_fit",
      importance: "not_applicable",
      impact: "excluded",
      essentialStatus: null,
    },
    {
      factorId: "support_network",
      importance: "important",
      impact: "strong_negative",
      essentialStatus: null,
    },
    {
      factorId: "required_services_continuity",
      importance: "important",
      impact: "unavailable",
      essentialStatus: null,
    },
    {
      factorId: "car_free_access",
      importance: "essential",
      impact: "unavailable",
      essentialStatus: "unconfirmed",
    },
  ],
});

describe("MoveWise household answers", () => {
  it("creates a checksum-bound, deeply immutable family response", () => {
    const answers = createMoveWiseHouseholdAnswers(familyPayload());

    expect(answers).toMatchObject({
      schemaVersion: "1.0.0",
      questionVersion: "1.0.0",
      mode: "family",
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(answers.sha256).toBe(
      calculateMoveWiseHouseholdAnswersChecksum(answers),
    );
    expect(Object.isFrozen(answers)).toBe(true);
    expect(Object.isFrozen(answers.factors)).toBe(true);
    expect(Object.isFrozen(answers.factors[0])).toBe(true);
  });

  it("requires every mode-applicable factor exactly once in canonical order", () => {
    expect(
      createMoveWiseHouseholdAnswers(individualPayload()).factors,
    ).toHaveLength(4);

    const missing = familyPayload();
    missing.factors.splice(2, 1);
    expect(() => createMoveWiseHouseholdAnswers(missing)).toThrow();

    const reordered = familyPayload();
    [reordered.factors[0], reordered.factors[1]] = [
      reordered.factors[1],
      reordered.factors[0],
    ];
    expect(() => createMoveWiseHouseholdAnswers(reordered)).toThrow();

    const familyOnly = individualPayload();
    familyOnly.factors.splice(2, 0, familyPayload().factors[2]);
    expect(() => createMoveWiseHouseholdAnswers(familyOnly)).toThrow();
  });

  it("rejects contradictory importance, impact, and essential states", () => {
    const invalid = [
      {
        importance: "not_applicable",
        impact: "neutral",
        essentialStatus: null,
      },
      {
        importance: "important",
        impact: "excluded",
        essentialStatus: null,
      },
      {
        importance: "important",
        impact: "positive",
        essentialStatus: "confirmed_met",
      },
      {
        importance: "essential",
        impact: "positive",
        essentialStatus: null,
      },
    ] as const;

    for (const mutation of invalid) {
      const payload = familyPayload();
      Object.assign(payload.factors[0], mutation);
      expect(() => createMoveWiseHouseholdAnswers(payload)).toThrow();
    }
  });

  it("preserves unavailable separately from explicit exclusion", () => {
    const answers = createMoveWiseHouseholdAnswers(individualPayload());

    expect(answers.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factorId: "space_fit",
          impact: "excluded",
        }),
        expect.objectContaining({
          factorId: "required_services_continuity",
          impact: "unavailable",
        }),
      ]),
    );
  });

  it("detects mutations against the bound checksum", () => {
    const answers = createMoveWiseHouseholdAnswers(familyPayload());
    const changed = clone(answers) as unknown as MoveWiseHouseholdAnswers;
    changed.factors[0].impact = "negative";

    expect(() => verifyMoveWiseHouseholdAnswers(changed)).toThrow(
      MoveWiseHouseholdAnswerChecksumMismatchError,
    );
  });

  it("produces the same checksum for equivalent payloads", () => {
    const first = createMoveWiseHouseholdAnswers(familyPayload());
    const second = createMoveWiseHouseholdAnswers(clone(familyPayload()));

    expect(second).toEqual(first);
  });
});
